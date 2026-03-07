import { DEFAULT_LAWN_MAP_ID, DEFAULT_MOWER_TYPE_ID } from './constants.js';
import { clamp } from './pathing.js';

function cloneObstacle(obstacle) {
  return { ...obstacle };
}

function cloneFeature(feature) {
  return { ...feature };
}

function cloneScene(scene) {
  return {
    ...scene,
    lawn: scene?.lawn ? { ...scene.lawn } : null,
    house: scene?.house ? { ...scene.house } : null,
    driveway: scene?.driveway ? { ...scene.driveway } : null,
    spawn: scene?.spawn ? { ...scene.spawn } : null,
    yardFeatures: Array.isArray(scene?.yardFeatures)
      ? scene.yardFeatures.map(cloneFeature)
      : [],
  };
}

export function hasActiveBaseArt(game) {
  return Boolean(game.scene.activeMapArt?.base?.loaded && !game.scene.activeMapArt.base.error);
}

export function hasActiveForegroundArt(game) {
  return Boolean(
    game.scene.activeMapArt?.foreground?.loaded && !game.scene.activeMapArt.foreground.error
  );
}

export function hasActiveMowMask(game) {
  return Boolean(
    game.scene.activeMapArt?.mowMask?.loaded
      && !game.scene.activeMapArt.mowMask.error
      && game.scene.activeMapArt.mowMask.imageData
  );
}

export function sampleMaskAsset(game, asset, x, y) {
  if (!asset?.imageData || !asset.width || !asset.height) {
    return false;
  }

  const sampleX = clamp(Math.floor((x / game.world.width) * asset.width), 0, asset.width - 1);
  const sampleY = clamp(Math.floor((y / game.world.height) * asset.height), 0, asset.height - 1);
  const idx = (sampleY * asset.width + sampleX) * 4;
  const colorMax = Math.max(
    asset.imageData[idx],
    asset.imageData[idx + 1],
    asset.imageData[idx + 2]
  );
  const alpha = asset.imageData[idx + 3];

  return colorMax >= 127 && alpha > 0;
}

export function getActiveMowSource(game) {
  return hasActiveMowMask(game) ? 'mask' : 'geometry';
}

export function getActiveCollisionSource() {
  return 'obstacles';
}

export function circleRectIntersects(cx, cy, cr, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= cr * cr;
}

export function pointInShape(x, y, shape) {
  if (!shape) return false;
  if (shape.kind === 'circle') {
    const dx = x - shape.x;
    const dy = y - shape.y;
    return dx * dx + dy * dy <= shape.r * shape.r;
  }
  if (shape.kind === 'ellipse') {
    const dx = (x - shape.cx) / shape.rx;
    const dy = (y - shape.cy) / shape.ry;
    return dx * dx + dy * dy <= 1;
  }
  return (
    x >= shape.x &&
    x <= shape.x + shape.w &&
    y >= shape.y &&
    y <= shape.y + shape.h
  );
}

export function isPointInsideLawn(game, point, margin = 0) {
  const lawn = game.scene.activeScene.lawn;
  if (lawn.kind === 'circle') {
    const radius = Math.max(0, lawn.r - margin);
    const dx = point.x - lawn.cx;
    const dy = point.y - lawn.cy;
    return dx * dx + dy * dy <= radius * radius;
  }
  return (
    point.x >= lawn.x + margin &&
    point.x <= lawn.x + lawn.w - margin &&
    point.y >= lawn.y + margin &&
    point.y <= lawn.y + lawn.h - margin
  );
}

export function clampPointToLawn(game, point, margin = 0) {
  const lawn = game.scene.activeScene.lawn;
  if (lawn.kind === 'circle') {
    const radius = Math.max(0, lawn.r - margin);
    const dx = point.x - lawn.cx;
    const dy = point.y - lawn.cy;
    const distance = Math.hypot(dx, dy);
    if (distance <= radius || distance < 0.0001) {
      return { x: point.x, y: point.y };
    }
    const scale = radius / distance;
    return {
      x: lawn.cx + dx * scale,
      y: lawn.cy + dy * scale,
    };
  }

  return {
    x: clamp(point.x, lawn.x + margin, lawn.x + lawn.w - margin),
    y: clamp(point.y, lawn.y + margin, lawn.y + lawn.h - margin),
  };
}

export function isPointInNonMowZone(game, x, y) {
  for (const feature of game.scene.activeYardFeatures) {
    if (feature.nonMowable !== true) {
      continue;
    }
    if (pointInShape(x, y, feature)) {
      return true;
    }
  }
  return false;
}

export function isPointMowableFromGeometry(game, x, y) {
  if (!isPointInsideLawn(game, { x, y })) {
    return false;
  }

  if (isPointInNonMowZone(game, x, y)) {
    return false;
  }

  for (const obstacle of game.scene.activeObstacles) {
    if (obstacle.kind === 'circle') {
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      if (dx * dx + dy * dy <= obstacle.r * obstacle.r) {
        return false;
      }
    } else if (
      x >= obstacle.x &&
      x <= obstacle.x + obstacle.w &&
      y >= obstacle.y &&
      y <= obstacle.y + obstacle.h
    ) {
      return false;
    }
  }

  return true;
}

export function isPointMowable(game, x, y) {
  if (hasActiveMowMask(game)) {
    return sampleMaskAsset(game, game.scene.activeMapArt.mowMask, x, y);
  }

  return isPointMowableFromGeometry(game, x, y);
}

export function getSceneSpawnPoint(game) {
  if (
    game.scene.activeScene.spawn
    && Number.isFinite(game.scene.activeScene.spawn.x)
    && Number.isFinite(game.scene.activeScene.spawn.y)
  ) {
    return clampPointToLawn(
      game,
      { x: game.scene.activeScene.spawn.x, y: game.scene.activeScene.spawn.y },
      game.mower.radius
    );
  }

  const fallback = {
    x: game.scene.activeScene.lawn.x + 72,
    y: game.scene.activeScene.lawn.y + 58,
  };
  return clampPointToLawn(game, fallback, game.mower.radius);
}

export function applySelectedSetup(game) {
  const mowerType = game.catalogs.mowerTypes[game.ui.selectedMowerId]
    || game.catalogs.mowerTypes[DEFAULT_MOWER_TYPE_ID];
  const lawnMap = game.catalogs.lawnMaps[game.ui.selectedLawnId]
    || game.catalogs.lawnMaps[DEFAULT_LAWN_MAP_ID];

  game.scene.activeMapId = lawnMap.id;
  game.scene.activeMapArt = game.assets.mapArtAssets[lawnMap.id] || null;
  game.scene.activeScene = cloneScene(lawnMap.scene);
  game.scene.activeObstacles = lawnMap.obstacles.map(cloneObstacle);
  game.scene.activeYardFeatures = Array.isArray(lawnMap.scene.yardFeatures)
    ? lawnMap.scene.yardFeatures.map(cloneFeature)
    : [];

  game.mower.typeId = mowerType.id;
  game.mower.typeLabel = mowerType.label;
  game.mower.playbackSpeed = mowerType.playbackSpeed;
  game.mower.deckRadius = mowerType.deckRadius;
  game.mower.fuelCapacity = mowerType.fuelCapacity;
  game.mower.fuelBurnPerPixel = mowerType.fuelBurnPerPixel;
  game.mower.fuel = mowerType.fuelCapacity;
  game.mowerSprite.assetId = mowerType.spriteAssetId || 'mowerSheet';
  game.mowerSprite.directionalFrames = mowerType.spriteDirectionalFrames
    ? { ...mowerType.spriteDirectionalFrames }
    : null;
  if (mowerType.spriteFrame) {
    game.mowerSprite.frame = { ...mowerType.spriteFrame };
  }
  if (mowerType.spriteDraw) {
    game.mowerSprite.drawW = mowerType.spriteDraw.w;
    game.mowerSprite.drawH = mowerType.spriteDraw.h;
  }
  game.route.brushRadius = game.mower.deckRadius;

  const spawn = getSceneSpawnPoint(game);
  game.mower.x = spawn.x;
  game.mower.y = spawn.y;
  game.mower.heading = 0;

  game.ui.elapsed = 0;
  game.ui.lastWinAt = null;
  game.ui.coverage = 0;
  game.ui.cash = 0;
  game.ui.totalCrashes = 0;
  game.ui.lastPenalty = 0;
  game.ui.transientMessage = '';
  game.ui.transientTimer = 0;

  game.input.pointerDown = false;
  game.input.pointer = { x: game.mower.x, y: game.mower.y };
  game.input.fastForward = false;

  game.route.draftPoints = [];
  game.route.draftLength = 0;
  game.route.playbackPoints = [];
  game.route.playbackLengths = [];
  game.route.totalLength = 0;
  game.route.progress = 0;
  game.route.pausedForFuel = false;

  game.effects.penaltyPopups.length = 0;
  game.effects.overlappingObstacleIds = [];
  game.animation.flipActive = false;
  game.animation.flipTimer = 0;
}

export function getMapArtDiagnostics(game, mapId = game.scene.activeMapId) {
  const lawnMap = game.catalogs.lawnMaps[mapId];
  const artConfig = lawnMap?.art || null;
  const artState = game.assets.mapArtAssets[mapId] || null;
  const isActiveMap = mapId === game.scene.activeMapId;

  return {
    enabled: Boolean(artConfig?.enabled),
    active: Boolean(isActiveMap && artConfig?.enabled),
    background_source: isActiveMap && hasActiveBaseArt(game) ? 'art' : 'procedural',
    mow_source: isActiveMap ? getActiveMowSource(game) : 'geometry',
    collision_source: isActiveMap ? getActiveCollisionSource() : 'obstacles',
    prompt_spec_src: artConfig?.promptSpecSrc || null,
    base: {
      src: artConfig?.baseSrc || null,
      loaded: Boolean(artState?.base?.loaded),
      error: Boolean(artState?.base?.error),
    },
    mow_mask: {
      src: artConfig?.mowMaskSrc || null,
      loaded: Boolean(artState?.mowMask?.loaded),
      error: Boolean(artState?.mowMask?.error),
    },
    collision_mask: {
      src: artConfig?.collisionMaskSrc || null,
      loaded: Boolean(artState?.collisionMask?.loaded),
      error: Boolean(artState?.collisionMask?.error),
    },
    foreground: {
      src: artConfig?.foregroundSrc || null,
      loaded: Boolean(artState?.foreground?.loaded),
      error: Boolean(artState?.foreground?.error),
    },
  };
}
