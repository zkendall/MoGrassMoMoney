import { FUEL_PRICE_PER_GALLON, REFILL_GALLON_EPSILON } from './constants.js';

export function createEconomyApi(game) {
  function markTransientMessage(text, duration = 1.2) {
    game.ui.transientMessage = text;
    game.ui.transientTimer = duration;
  }

  function mowerUsesFuel() {
    return game.mower.fuelCapacity > 0 && game.mower.fuelBurnPerPixel > 0;
  }

  function getRefillGallonsNeeded() {
    if (!mowerUsesFuel()) return 0;
    const gallonsNeeded = Math.max(0, game.mower.fuelCapacity - game.mower.fuel);
    return gallonsNeeded <= REFILL_GALLON_EPSILON ? 0 : gallonsNeeded;
  }

  function getRefillCost() {
    return getRefillGallonsNeeded() * FUEL_PRICE_PER_GALLON;
  }

  function tryRefillMower() {
    if (!mowerUsesFuel()) {
      markTransientMessage(`${game.mower.typeLabel} uses no fuel.`);
      return false;
    }

    const gallonsNeeded = getRefillGallonsNeeded();
    if (gallonsNeeded <= 0.0001) {
      markTransientMessage('Tank already full.');
      return false;
    }

    const refillCost = getRefillCost();
    game.mower.fuel = game.mower.fuelCapacity;
    game.ui.cash -= refillCost;
    game.route.pausedForFuel = false;
    if (
      game.ui.mode === 'animating'
      && game.route.totalLength > 0
      && game.route.progress < game.route.totalLength
    ) {
      markTransientMessage(
        `Refilled ${gallonsNeeded.toFixed(2)} gal for $${refillCost.toFixed(2)}. Continuing route.`
      );
    } else {
      markTransientMessage(`Refilled ${gallonsNeeded.toFixed(2)} gal for $${refillCost.toFixed(2)}.`);
    }
    return true;
  }

  function triggerCrashPenalty(obstacleIds) {
    for (const obstacleId of obstacleIds) {
      game.ui.cash -= 1;
      game.ui.totalCrashes += 1;
      game.ui.lastPenalty = -1;
      game.effects.penaltyPopups.push({
        text: '-$1',
        x: game.mower.x + (Math.random() * 14 - 7),
        y: game.mower.y - 10,
        vy: -28,
        ttl: 0.9,
        maxTtl: 0.9,
        obstacleId,
      });
    }

    game.animation.flipActive = true;
    game.animation.flipTimer = 0;
    game.animation.flipBaseHeading = game.mower.heading;
  }

  function updateTransients(dt) {
    if (game.ui.transientTimer > 0) {
      game.ui.transientTimer = Math.max(0, game.ui.transientTimer - dt);
      if (game.ui.transientTimer === 0) {
        game.ui.transientMessage = '';
      }
    }

    for (let i = game.effects.penaltyPopups.length - 1; i >= 0; i -= 1) {
      const popup = game.effects.penaltyPopups[i];
      popup.ttl -= dt;
      popup.y += popup.vy * dt;
      if (popup.ttl <= 0) {
        game.effects.penaltyPopups.splice(i, 1);
      }
    }
  }

  return {
    markTransientMessage,
    mowerUsesFuel,
    getRefillGallonsNeeded,
    getRefillCost,
    tryRefillMower,
    triggerCrashPenalty,
    updateTransients,
  };
}

