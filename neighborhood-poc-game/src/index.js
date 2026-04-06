import { attachKeyboard } from './keyboard.js';
import { getHouseById, updatePlayer } from './movement.js';
import { renderGame } from './render.js';
import { createInitialState, resetState } from './state.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createInitialState({ canvas });

function render() {
  renderGame(state, ctx);
}

function update(dt) {
  updatePlayer(state, dt);
}

function frame(now) {
  const dt = Math.min(0.05, (now - state.timing.lastTime) / 1000);
  state.timing.lastTime = now;
  state.timing.accumulator += dt;

  while (state.timing.accumulator >= state.timing.fixedStep) {
    update(state.timing.fixedStep);
    state.timing.accumulator -= state.timing.fixedStep;
  }

  render();
  window.requestAnimationFrame(frame);
}

function renderGameToText() {
  const inspected = state.inspectedHouseId ? getHouseById(state, state.inspectedHouseId) : null;
  const payload = {
    coordinate_system: 'origin top-left; +x right; +y down; units in canvas pixels',
    mode: state.mode,
    player: {
      x: Number(state.player.x.toFixed(2)),
      y: Number(state.player.y.toFixed(2)),
      radius: state.player.radius,
      facing: state.player.facing,
      heading: {
        x: Number(state.player.heading.x.toFixed(3)),
        y: Number(state.player.heading.y.toFixed(3)),
      },
    },
    nearby_house_id: state.nearbyHouseId,
    inspected_house_id: state.inspectedHouseId,
    inspected_house: inspected
      ? {
        id: inspected.id,
        name: inspected.name,
        flyer_delivered: inspected.flyerDelivered,
        value_band: inspected.valueBand,
        churn_risk: inspected.churnRisk,
        kind_tags: [...inspected.kindTags],
      }
      : null,
    delivered_count: state.deliveredCount,
    houses: state.neighborhood.houses.map((house) => ({
      id: house.id,
      name: house.name,
      kind_tags: [...house.kindTags],
      value_band: house.valueBand,
      churn_risk: house.churnRisk,
      flyer_delivered: house.flyerDelivered,
      interactable: state.nearbyHouseId === house.id,
      inspected: state.inspectedHouseId === house.id,
      mailbox: {
        x: house.mailbox.x,
        y: house.mailbox.y,
      },
      footprint: {
        x: house.x,
        y: house.y,
        w: house.w,
        h: house.h,
      },
    })),
    objective: 'Walk the neighborhood, inspect nearby houses, and deliver flyers once per mailbox.',
    controls: {
      move: 'WASD / Arrow keys',
      inspect_or_deliver: 'Space / Enter',
      close_panel: 'Escape',
      reset: 'R',
      fullscreen: 'F',
    },
    note: state.note,
  };

  return JSON.stringify(payload, null, 2);
}

attachKeyboard({ state, render });

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    update(1 / 60);
  }
  render();
};
window.render_game_to_text = renderGameToText;
window.resetNeighborhoodPoc = () => {
  resetState(state);
  render();
};

window.addEventListener('resize', () => render());

render();
window.requestAnimationFrame(frame);
