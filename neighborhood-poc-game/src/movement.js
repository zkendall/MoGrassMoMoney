function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getFacingLabel(dx, dy, fallback) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  if (Math.abs(dy) > 0) {
    return dy >= 0 ? 'down' : 'up';
  }
  return fallback;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function updatePlayer(state, dt) {
  if (state.mode === 'inspect') {
    updateNearbyHouse(state);
    return;
  }

  const moveX = Number(state.input.right) - Number(state.input.left);
  const moveY = Number(state.input.down) - Number(state.input.up);
  const magnitude = Math.hypot(moveX, moveY);

  if (magnitude > 0) {
    const nx = moveX / magnitude;
    const ny = moveY / magnitude;
    state.player.x = clamp(
      state.player.x + nx * state.player.speed * dt,
      state.player.radius + 8,
      state.world.width - state.player.radius - 8
    );
    state.player.y = clamp(
      state.player.y + ny * state.player.speed * dt,
      state.player.radius + 8,
      state.world.height - state.player.radius - 8
    );
    state.player.heading = { x: nx, y: ny };
    state.player.facing = getFacingLabel(nx, ny, state.player.facing);
  }

  updateNearbyHouse(state);
}

export function updateNearbyHouse(state) {
  let closest = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const house of state.neighborhood.houses) {
    const delta = distance(state.player, house.mailbox);
    if (delta <= state.interactionRadius && delta < bestDistance) {
      closest = house;
      bestDistance = delta;
    }
  }

  state.nearbyHouseId = closest ? closest.id : null;
  if (state.mode === 'inspect' && state.inspectedHouseId) {
    const inspected = getHouseById(state, state.inspectedHouseId);
    if (!inspected) {
      state.mode = 'roam';
      state.inspectedHouseId = null;
      return;
    }
    if (distance(state.player, inspected.mailbox) > state.interactionRadius + 18) {
      state.mode = 'roam';
      state.note = 'You stepped away from the house.';
      state.inspectedHouseId = null;
    }
  }
}

export function getHouseById(state, houseId) {
  return state.neighborhood.houses.find((house) => house.id === houseId) || null;
}
