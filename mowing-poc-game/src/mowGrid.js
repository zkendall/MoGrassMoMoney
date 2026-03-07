export function createMowGridApi(game, { isPointMowable, clamp }) {
  function updateCoverage() {
    game.ui.coverage = game.mowGrid.mowableCount === 0
      ? 0
      : (game.mowGrid.mowedCount / game.mowGrid.mowableCount) * 100;
  }

  function initMowGrid() {
    game.mowGrid.states = new Array(game.mowGrid.cols * game.mowGrid.rows).fill(0);
    game.mowGrid.layValues = new Array(game.mowGrid.cols * game.mowGrid.rows).fill(0);
    game.mowGrid.mowableCount = 0;
    game.mowGrid.mowedCount = 0;

    for (let row = 0; row < game.mowGrid.rows; row += 1) {
      for (let col = 0; col < game.mowGrid.cols; col += 1) {
        const x = col * game.mowGrid.cell + game.mowGrid.cell * 0.5;
        const y = row * game.mowGrid.cell + game.mowGrid.cell * 0.5;
        if (isPointMowable(game, x, y)) {
          const idx = row * game.mowGrid.cols + col;
          game.mowGrid.states[idx] = 1;
          game.mowGrid.mowableCount += 1;
        }
      }
    }
    updateCoverage();
  }

  function getLayTargetForHeading(heading) {
    return clamp(-Math.sin(heading), -1, 1);
  }

  function blendLayValue(current, target) {
    return clamp(
      current + (target - current) * game.mowGrid.layBlendStrength,
      -1,
      1
    );
  }

  function mowUnderDeck() {
    const deckX = game.mower.x;
    const deckY = game.mower.y;

    const minCol = Math.max(0, Math.floor((deckX - game.mower.deckRadius) / game.mowGrid.cell));
    const maxCol = Math.min(
      game.mowGrid.cols - 1,
      Math.ceil((deckX + game.mower.deckRadius) / game.mowGrid.cell)
    );
    const minRow = Math.max(0, Math.floor((deckY - game.mower.deckRadius) / game.mowGrid.cell));
    const maxRow = Math.min(
      game.mowGrid.rows - 1,
      Math.ceil((deckY + game.mower.deckRadius) / game.mowGrid.cell)
    );

    let changed = 0;

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const cx = col * game.mowGrid.cell + game.mowGrid.cell * 0.5;
        const cy = row * game.mowGrid.cell + game.mowGrid.cell * 0.5;
        const offX = cx - deckX;
        const offY = cy - deckY;
        if (offX * offX + offY * offY > game.mower.deckRadius * game.mower.deckRadius) {
          continue;
        }

        const idx = row * game.mowGrid.cols + col;
        if (game.mowGrid.states[idx] === 0) {
          continue;
        }

        game.mowGrid.layValues[idx] = blendLayValue(
          game.mowGrid.layValues[idx],
          getLayTargetForHeading(game.mower.heading)
        );

        if (game.mowGrid.states[idx] === 1) {
          game.mowGrid.states[idx] = 2;
          game.mowGrid.mowedCount += 1;
          changed += 1;
        }
      }
    }

    if (changed > 0) {
      updateCoverage();
    }
  }

  return {
    initMowGrid,
    updateCoverage,
    getLayTargetForHeading,
    blendLayValue,
    mowUnderDeck,
  };
}
