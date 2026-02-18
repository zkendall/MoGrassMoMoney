const MODE_TRANSITIONS = {
  day_action: new Set(['processing', 'planning']),
  planning: new Set(['performance']),
  performance: new Set(['processing']),
  hardware_shop: new Set(['processing']),
  report: new Set(['processing']),
  processing: new Set(['day_action', 'hardware_shop', 'report']),
};

export function forceMode(state, nextMode) {
  state.mode = nextMode;
}

export function transitionTo(state, nextMode) {
  if (state.mode === nextMode) return;
  const allowed = MODE_TRANSITIONS[state.mode];
  if (!allowed || !allowed.has(nextMode)) {
    throw new Error(`Invalid mode transition: ${state.mode} -> ${nextMode}`);
  }
  state.mode = nextMode;
}
