import { SPINNER_FRAMES } from './constants.js';

export function startProcessing({ state, render, transitionTo, label, durationMs, onComplete }) {
  state.processingToken += 1;
  const token = state.processingToken;
  state.processing = { label, awaitingConfirm: false, onComplete };
  state.processingFrame = 0;
  transitionTo(state, 'processing');
  render();

  const intervalId = window.setInterval(() => {
    if (state.processingToken !== token) {
      window.clearInterval(intervalId);
      return;
    }
    state.processingFrame = (state.processingFrame + 1) % SPINNER_FRAMES.length;
    render();
  }, 120);

  window.setTimeout(() => {
    if (state.processingToken !== token) return;
    window.clearInterval(intervalId);
    if (!state.processing) return;
    state.processing.awaitingConfirm = true;
    state.note = 'Press Enter to continue.';
    render();
  }, durationMs);
}
