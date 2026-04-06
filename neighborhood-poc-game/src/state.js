import { createNeighborhood, HOUSE_INTERACT_RADIUS, WORLD_HEIGHT, WORLD_WIDTH } from './neighborhood.js';

const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 168;

function createHouseRuntime(house) {
  return {
    ...house,
    flyerDelivered: false,
  };
}

export function createInitialState({ canvas }) {
  const neighborhood = createNeighborhood();
  return {
    canvas,
    world: {
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    },
    neighborhood: {
      ...neighborhood,
      houses: neighborhood.houses.map(createHouseRuntime),
    },
    player: {
      x: 480,
      y: 320,
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      facing: 'down',
      heading: { x: 0, y: 1 },
    },
    mode: 'roam',
    deliveredCount: 0,
    nearbyHouseId: null,
    inspectedHouseId: null,
    interactionRadius: HOUSE_INTERACT_RADIUS,
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
    },
    timing: {
      lastTime: 0,
      accumulator: 0,
      fixedStep: 1 / 60,
    },
    note: 'Walk up to a mailbox and press Space to inspect.',
  };
}

export function resetState(state) {
  const fresh = createInitialState({ canvas: state.canvas });
  state.world = fresh.world;
  state.neighborhood = fresh.neighborhood;
  state.player = fresh.player;
  state.mode = fresh.mode;
  state.deliveredCount = fresh.deliveredCount;
  state.nearbyHouseId = fresh.nearbyHouseId;
  state.inspectedHouseId = fresh.inspectedHouseId;
  state.interactionRadius = fresh.interactionRadius;
  state.input = fresh.input;
  state.timing = fresh.timing;
  state.note = 'Run reset.';
}
