import { FUEL_PRICE_PER_GALLON, REVIEW_LAYOUT } from './constants.js';

export function createPlaybackApi(game, deps) {
  const {
    clampPointToLawn,
    circleRectIntersects,
    dist,
    dedupeClosePoints,
    resamplePolyline,
    smoothPolyline,
    buildCumulativeLengths,
    samplePointOnPath,
    pointInRect,
    mowerUsesFuel,
    markTransientMessage,
    triggerCrashPenalty,
    mowUnderDeck,
  } = deps;

  function createPlaybackPath(rawPoints) {
    if (rawPoints.length < 2) return [];

    const coarse = dedupeClosePoints(rawPoints, 2);
    const resampled = resamplePolyline(coarse, 6);
    const smoothed = smoothPolyline(resampled, 4);
    const finalResample = resamplePolyline(smoothed, 6);
    const clamped = finalResample.map((point) => (
      clampPointToLawn(game, point, game.mower.radius)
    ));

    return dedupeClosePoints(clamped, 1);
  }

  function addDraftPoint(point) {
    const next = { x: point.x, y: point.y };
    const points = game.route.draftPoints;
    if (points.length === 0) {
      points.push(next);
      game.route.draftLength = 0;
      return;
    }

    const prev = points[points.length - 1];
    if (dist(prev, next) < game.route.minPointSpacing) {
      return;
    }

    points.push(next);
    game.route.draftLength += dist(prev, next);
  }

  function clearDraftPath() {
    game.route.draftPoints = [];
    game.route.draftLength = 0;
  }

  function clearPlaybackPath() {
    game.route.playbackPoints = [];
    game.route.playbackLengths = [];
    game.route.totalLength = 0;
    game.route.progress = 0;
    game.route.pausedForFuel = false;
    game.effects.overlappingObstacleIds = [];
    game.animation.flipActive = false;
    game.animation.flipTimer = 0;
  }

  function getReviewButtons() {
    const totalWidth = REVIEW_LAYOUT.width * 2 + REVIEW_LAYOUT.gap;
    const startX = (game.world.width - totalWidth) * 0.5;
    const enabled = game.ui.mode === 'review' && game.route.draftPoints.length >= 2;

    return [
      {
        id: 'accept',
        label: 'Accept',
        x: startX,
        y: REVIEW_LAYOUT.y,
        w: REVIEW_LAYOUT.width,
        h: REVIEW_LAYOUT.height,
        enabled,
      },
      {
        id: 'retry',
        label: 'Retry',
        x: startX + REVIEW_LAYOUT.width + REVIEW_LAYOUT.gap,
        y: REVIEW_LAYOUT.y,
        w: REVIEW_LAYOUT.width,
        h: REVIEW_LAYOUT.height,
        enabled,
      },
    ];
  }

  function getObstacleOverlapIds(x, y, r) {
    const ids = [];
    for (const obstacle of game.scene.activeObstacles) {
      if (obstacle.kind === 'circle') {
        const dx = x - obstacle.x;
        const dy = y - obstacle.y;
        const overlap = r + obstacle.r;
        if (dx * dx + dy * dy <= overlap * overlap) {
          ids.push(obstacle.id);
        }
      } else if (circleRectIntersects(x, y, r, obstacle)) {
        ids.push(obstacle.id);
      }
    }
    return ids;
  }

  function beginDrawing(point) {
    clearPlaybackPath();
    clearDraftPath();
    addDraftPoint(point);
    game.input.pointerDown = true;
    game.input.pointer = { ...point };
    game.ui.mode = 'drawing';
  }

  function finalizeDrawing() {
    game.input.pointerDown = false;

    if (game.ui.mode !== 'drawing') {
      return;
    }

    if (
      game.route.draftPoints.length < 2
      || game.route.draftLength < game.route.minPathLength
    ) {
      clearDraftPath();
      markTransientMessage('Path too short. Draw a longer route.');
      return;
    }

    game.ui.mode = 'review';
  }

  function retryPath() {
    clearPlaybackPath();
    clearDraftPath();
    game.ui.mode = 'drawing';
  }

  function acceptPath() {
    if (mowerUsesFuel() && game.mower.fuel <= 0.0001) {
      markTransientMessage(
        `Tank empty. Press E to refill ($${FUEL_PRICE_PER_GALLON.toFixed(2)}/gal).`
      );
      game.ui.mode = 'review';
      return;
    }

    const playbackPoints = createPlaybackPath(game.route.draftPoints);
    if (playbackPoints.length < 2) {
      clearPlaybackPath();
      markTransientMessage('Path invalid. Please retry.');
      game.ui.mode = 'drawing';
      return;
    }

    game.route.playbackPoints = playbackPoints;
    game.route.playbackLengths = buildCumulativeLengths(playbackPoints);
    game.route.totalLength = game.route.playbackLengths[game.route.playbackLengths.length - 1] || 0;
    game.route.progress = 0;
    game.route.pausedForFuel = false;

    const startSample = samplePointOnPath(game, game.route.playbackPoints, game.route.playbackLengths, 0);
    if (startSample) {
      game.mower.x = startSample.x;
      game.mower.y = startSample.y;
      game.mower.heading = startSample.heading;
    }

    game.effects.overlappingObstacleIds = getObstacleOverlapIds(game.mower.x, game.mower.y, 0);
    game.animation.flipActive = false;
    game.animation.flipTimer = 0;

    game.ui.mode = 'animating';
  }

  function handleReviewClick(point) {
    if (game.ui.mode !== 'review') return;
    const buttons = getReviewButtons();
    for (const button of buttons) {
      if (!button.enabled) continue;
      if (!pointInRect(point, button)) continue;

      if (button.id === 'accept') {
        acceptPath();
      } else if (button.id === 'retry') {
        retryPath();
      }
      return;
    }
  }

  function updateAnimation(dt) {
    if (game.ui.mode !== 'animating') {
      return;
    }

    if (!game.route.playbackPoints.length || game.route.totalLength <= 0) {
      game.ui.mode = 'drawing';
      clearPlaybackPath();
      return;
    }

    if (mowerUsesFuel() && game.mower.fuel <= 0.0001) {
      if (!game.route.pausedForFuel) {
        game.route.pausedForFuel = true;
        markTransientMessage(`Out of fuel. Press E to refill ($${FUEL_PRICE_PER_GALLON.toFixed(2)}/gal).`);
      }
      return;
    }
    game.route.pausedForFuel = false;

    if (game.animation.flipActive) {
      game.animation.flipTimer += dt;
      if (game.animation.flipTimer >= game.animation.flipDuration) {
        game.animation.flipTimer = 0;
        game.animation.flipActive = false;
      }
      return;
    }

    const speed = game.input.fastForward
      ? game.mower.playbackSpeed * game.route.fastForwardMultiplier
      : game.mower.playbackSpeed;

    const requestedTravel = speed * dt;
    const maxTravelFromFuel = mowerUsesFuel()
      ? (game.mower.fuel / game.mower.fuelBurnPerPixel)
      : requestedTravel;
    const actualTravel = Math.max(0, Math.min(requestedTravel, maxTravelFromFuel));

    const priorProgress = game.route.progress;
    game.route.progress = Math.min(
      game.route.totalLength,
      game.route.progress + actualTravel
    );
    const traveledThisStep = Math.max(0, game.route.progress - priorProgress);
    if (mowerUsesFuel()) {
      game.mower.fuel = Math.max(0, game.mower.fuel - traveledThisStep * game.mower.fuelBurnPerPixel);
    }

    const sample = samplePointOnPath(
      game,
      game.route.playbackPoints,
      game.route.playbackLengths,
      game.route.progress
    );

    if (sample) {
      game.mower.x = sample.x;
      game.mower.y = sample.y;
      game.mower.heading = sample.heading;
    }

    const nextOverlaps = getObstacleOverlapIds(game.mower.x, game.mower.y, 0);
    const overlapSet = new Set(game.effects.overlappingObstacleIds);
    const newEntries = nextOverlaps.filter((id) => !overlapSet.has(id));

    if (newEntries.length) {
      triggerCrashPenalty(newEntries);
    }

    game.effects.overlappingObstacleIds = nextOverlaps;

    mowUnderDeck();

    if (game.route.progress >= game.route.totalLength) {
      clearPlaybackPath();
      clearDraftPath();
      if (game.ui.coverage >= game.scene.activeScene.targetCoverage) {
        game.ui.mode = 'won';
        game.ui.lastWinAt = game.ui.elapsed;
      } else {
        game.ui.mode = 'drawing';
      }
      return;
    }

    if (mowerUsesFuel() && actualTravel < requestedTravel && game.mower.fuel <= 0.0001) {
      game.route.pausedForFuel = true;
      markTransientMessage(`Out of fuel. Press E to refill ($${FUEL_PRICE_PER_GALLON.toFixed(2)}/gal).`);
    }
  }

  return {
    addDraftPoint,
    clearDraftPath,
    clearPlaybackPath,
    getReviewButtons,
    beginDrawing,
    finalizeDrawing,
    retryPath,
    acceptPath,
    handleReviewClick,
    updateAnimation,
  };
}
