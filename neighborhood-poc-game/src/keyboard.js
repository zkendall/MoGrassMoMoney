import { getHouseById } from './movement.js';
import { resetState } from './state.js';

function isMoveKey(key) {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(key);
}

function setMovementFlag(state, key, pressed) {
  if (key === 'ArrowUp' || key === 'w' || key === 'W') state.input.up = pressed;
  if (key === 'ArrowDown' || key === 's' || key === 'S') state.input.down = pressed;
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') state.input.left = pressed;
  if (key === 'ArrowRight' || key === 'd' || key === 'D') state.input.right = pressed;
}

async function toggleFullscreen(canvas) {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (canvas.requestFullscreen) {
    await canvas.requestFullscreen();
  }
}

export function attachKeyboard({ state, render }) {
  window.addEventListener('keydown', async (event) => {
    if (isMoveKey(event.key)) {
      event.preventDefault();
      setMovementFlag(state, event.key, true);
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      await toggleFullscreen(state.canvas);
      render();
      return;
    }

    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      resetState(state);
      render();
      return;
    }

    if (event.key === 'Escape' && state.mode === 'inspect') {
      event.preventDefault();
      state.mode = 'roam';
      state.inspectedHouseId = null;
      state.note = 'Back on the sidewalk.';
      render();
      return;
    }

    const isConfirm = event.key === 'Enter' || event.key === ' ' || event.code === 'Space';
    if (!isConfirm) return;

    event.preventDefault();

    if (state.mode === 'roam') {
      if (!state.nearbyHouseId) {
        state.note = 'Move closer to a mailbox to inspect.';
        render();
        return;
      }
      state.mode = 'inspect';
      state.inspectedHouseId = state.nearbyHouseId;
      state.note = 'Inspecting house details.';
      render();
      return;
    }

    if (state.mode === 'inspect') {
      const house = getHouseById(state, state.inspectedHouseId);
      if (!house) {
        state.mode = 'roam';
        state.inspectedHouseId = null;
        render();
        return;
      }
      if (house.flyerDelivered) {
        state.note = `Flyer already delivered at ${house.name}.`;
        render();
        return;
      }
      house.flyerDelivered = true;
      state.deliveredCount += 1;
      state.note = `Flyer delivered at ${house.name}.`;
      render();
    }
  });

  window.addEventListener('keyup', (event) => {
    if (!isMoveKey(event.key)) return;
    event.preventDefault();
    setMovementFlag(state, event.key, false);
  });
}
