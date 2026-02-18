import { STARTING_CASH } from './constants.js';

export function createInitialState() {
  return {
    mode: 'day_action',
    day: 1,
    cash: STARTING_CASH,
    seed: 90210,
    rng: null,
    mowerTierIndex: 0,
    repeatCustomers: [],
    leads: [],
    dayJobs: [],
    selectedJobIds: new Set(),
    planningCursor: 0,
    acceptedJobs: [],
    dayCap: 5,
    scoreInput: 78,
    patternResult: 'none',
    report: null,
    pendingOffers: [],
    selectedOfferIds: new Set(),
    offerCursor: 0,
    actionCursor: 0,
    shopCursor: 0,
    processing: null,
    processingFrame: 0,
    processingToken: 0,
    ticks: 0,
    note: '',
  };
}

export function resetCoreState(state) {
  state.repeatCustomers = [];
  state.leads = [];
  state.day = 1;
  state.cash = STARTING_CASH;
  state.mowerTierIndex = 0;
  state.scoreInput = 78;
  state.patternResult = 'none';
  state.report = null;
  state.pendingOffers = [];
  state.selectedOfferIds.clear();
  state.offerCursor = 0;
  state.actionCursor = 0;
  state.shopCursor = 0;
  state.dayJobs = [];
  state.selectedJobIds.clear();
  state.planningCursor = 0;
  state.acceptedJobs = [];
  state.processing = null;
  state.processingFrame = 0;
  state.processingToken += 1;
}
