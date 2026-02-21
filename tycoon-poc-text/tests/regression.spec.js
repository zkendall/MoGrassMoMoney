const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('playwright/test');

const ROOT_DIR = path.resolve(__dirname, '..');
const STEP_PLANS_PATH = path.join(__dirname, 'fixtures', 'regression-step-plans.json');
const STEP_PLANS = JSON.parse(fs.readFileSync(STEP_PLANS_PATH, 'utf8'));
const GOLDEN_DIR = path.join(__dirname, 'golden');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output', 'regression-tests');
const SUMMARY_PATH = path.join(OUTPUT_DIR, 'latest-summary.json');
const HEADED_ACTION_DELAY_MS = 180;
const UPDATE_GOLDEN = ['1', 'true', 'yes'].includes(
  String(process.env.UPDATE_GOLDEN || '').toLowerCase(),
);
const DEFAULT_START_STATE = 'default';

const scenarioResults = {};

function stableSortById(list) {
  return [...list].sort((a, b) => a.id - b.id);
}

function summaryPayload() {
  return {
    url: process.env.TYCOON_BASE_URL || 'http://127.0.0.1:4174',
    update_golden: UPDATE_GOLDEN,
    scenarios: scenarioResults,
  };
}

function writeSummary() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summaryPayload(), null, 2));
}

function readScenarioConfig(name) {
  const scenario = STEP_PLANS[name];
  if (!scenario || typeof scenario !== 'object') {
    throw new Error(`Missing scenario config: ${name}`);
  }
  if (!Array.isArray(scenario.steps)) {
    throw new Error(`Scenario "${name}" is missing steps[]`);
  }
  return {
    seed: Number.isFinite(scenario.seed) ? scenario.seed : 2,
    start_state: typeof scenario.start_state === 'string' ? scenario.start_state : DEFAULT_START_STATE,
    steps: scenario.steps,
  };
}

function readExpected(name) {
  const expectedPath = path.join(GOLDEN_DIR, `${name}.json`);
  if (!fs.existsSync(expectedPath)) return null;
  return JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
}

function writeExpected(name, payload) {
  const expectedPath = path.join(GOLDEN_DIR, `${name}.json`);
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  fs.writeFileSync(expectedPath, JSON.stringify(payload, null, 2));
}

async function readState(page) {
  const raw = await page.evaluate(() => {
    if (typeof window.render_game_to_text !== 'function') return null;
    return window.render_game_to_text();
  });
  if (!raw) {
    throw new Error('render_game_to_text returned empty payload');
  }
  return JSON.parse(raw);
}

async function waitForMode(page, mode, timeoutMs = 6_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await readState(page);
    if (state.mode === mode) return state;
    await page.waitForTimeout(50);
  }
  throw new Error(`Timed out waiting for mode=${mode}`);
}

async function waitForModeNot(page, mode, timeoutMs = 6_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await readState(page);
    if (state.mode !== mode) return state;
    await page.waitForTimeout(50);
  }
  throw new Error(`Timed out waiting for mode!=${mode}`);
}

async function completeProcessing(page, durationMs, requireConfirm) {
  await waitForMode(page, 'processing');
  await page.waitForTimeout(durationMs + 200);
  if (requireConfirm) {
    await page.keyboard.press('Enter');
  }
  return waitForModeNot(page, 'processing', 6_000);
}

async function openScenarioPage(page, scenario) {
  const params = new URLSearchParams();
  if (Number.isFinite(scenario.seed)) {
    params.set('seed', String(scenario.seed));
  }
  if (scenario.start_state && scenario.start_state !== DEFAULT_START_STATE) {
    params.set('start_state', scenario.start_state);
  }
  const query = params.toString();
  const pathWithQuery = query ? `/?${query}` : '/';
  await page.goto(pathWithQuery, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
}

async function executeStep(page, step, actionDelayMs) {
  const times = Number.isFinite(step.times) ? step.times : 1;

  if (step.op === 'press') {
    for (let i = 0; i < times; i += 1) {
      await page.keyboard.press(step.key);
      if (actionDelayMs > 0) {
        await page.waitForTimeout(actionDelayMs);
      }
    }
    return;
  }

  if (step.op === 'set_leads') {
    await page.evaluate(({ count, status }) => {
      if (typeof window.__tycoonTestSetLeads !== 'function') {
        throw new Error('__tycoonTestSetLeads unavailable');
      }
      window.__tycoonTestSetLeads({ count, status });
    }, {
      count: step.count,
      status: step.status,
    });
    return;
  }

  if (step.op === 'wait_mode') {
    await waitForMode(page, step.mode, step.timeout_ms || 6_000);
    return;
  }

  if (step.op === 'assert_mode') {
    const state = await readState(page);
    expect(state.mode).toBe(step.mode);
    return;
  }

  if (step.op === 'complete_processing') {
    await completeProcessing(page, step.duration_ms, step.require_confirm);
    return;
  }

  if (step.op === 'assert_min_planning_jobs') {
    const state = await readState(page);
    expect((state.planning_jobs || []).length).toBeGreaterThanOrEqual(step.min);
    return;
  }

  if (step.op === 'assert_last_report_activity') {
    const state = await readState(page);
    expect(state.last_report?.activity).toBe(step.activity);
    return;
  }

  if (step.op === 'assert_pending_offers') {
    const state = await readState(page);
    expect((state.pending_regular_offers || []).length).toBeGreaterThanOrEqual(step.min);
    return;
  }

  if (step.op === 'assert_repeat_customers') {
    const state = await readState(page);
    expect((state.repeat_customers || []).length).toBeGreaterThanOrEqual(step.min);
    return;
  }

  throw new Error(`Unknown regression step op: ${step.op}`);
}

async function executePlan(page, planName, steps) {
  const actionDelayMs = test.info().project.use.headless === false ? HEADED_ACTION_DELAY_MS : 0;
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    try {
      await executeStep(page, step, actionDelayMs);
    } catch (error) {
      const prefix = `Step ${i + 1}/${steps.length}${step.desc ? ` (${step.desc})` : ''}`;
      throw new Error(`${prefix} failed: ${error.message || error}`);
    }
  }
}

function pickScenarioSnapshot(name, state) {
  if (name === 'solicit_report') {
    return {
      seed: state.seed,
      mode: state.mode,
      day: state.day,
      cash: state.cash,
      leads: stableSortById(state.leads).map((lead) => ({
        id: lead.id,
        lead_status: lead.lead_status,
        pattern_preference: lead.pattern_preference,
      })),
      last_report: {
        activity: state.last_report?.activity,
        materials: state.last_report?.materials,
        leads_generated: [...(state.last_report?.leads_generated || [])].sort(),
        endingCash: state.last_report?.endingCash,
      },
    };
  }

  if (name === 'follow_up_report') {
    return {
      seed: state.seed,
      mode: state.mode,
      day: state.day,
      cash: state.cash,
      leads: stableSortById(state.leads).map((lead) => ({
        id: lead.id,
        lead_status: lead.lead_status,
      })),
      last_report: {
        activity: state.last_report?.activity,
        leads_qualified: [...(state.last_report?.leads_qualified || [])].sort(),
        endingCash: state.last_report?.endingCash,
      },
    };
  }

  if (name === 'mow_offer_accept') {
    return {
      seed: state.seed,
      mode: state.mode,
      day: state.day,
      cash: state.cash,
      mower_tier: state.mower_tier,
      repeat_customers: stableSortById(state.repeat_customers).map((customer) => ({
        id: customer.id,
        days_since_service: customer.days_since_service,
        pattern_preference: customer.pattern_preference,
      })),
      leads: stableSortById(state.leads).map((lead) => ({
        id: lead.id,
        lead_status: lead.lead_status,
      })),
    };
  }

  throw new Error(`Unknown scenario: ${name}`);
}

function assertOrUpdateGolden(name, actual) {
  if (UPDATE_GOLDEN) {
    writeExpected(name, actual);
    return;
  }
  const expected = readExpected(name);
  if (!expected) {
    throw new Error(`Missing golden file: tests/golden/${name}.json`);
  }
  expect(actual).toEqual(expected);
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  writeSummary();
});

test.afterEach(() => {
  writeSummary();
});

test.afterAll(() => {
  writeSummary();
});

test('solicit_report', async ({ page }) => {
  const scenario = readScenarioConfig('solicit_report');
  await openScenarioPage(page, scenario);
  await executePlan(page, 'solicit_report', scenario.steps);
  const result = await readState(page);
  const snapshot = pickScenarioSnapshot('solicit_report', result);
  assertOrUpdateGolden('solicit_report', snapshot);
  scenarioResults.solicit_report = snapshot;
});

test('follow_up_report', async ({ page }) => {
  const scenario = readScenarioConfig('follow_up_report');
  await openScenarioPage(page, scenario);
  await executePlan(page, 'follow_up_report', scenario.steps);
  const result = await readState(page);
  const snapshot = pickScenarioSnapshot('follow_up_report', result);
  assertOrUpdateGolden('follow_up_report', snapshot);
  scenarioResults.follow_up_report = snapshot;
});

test('mow_offer_accept', async ({ page }) => {
  const scenario = readScenarioConfig('mow_offer_accept');
  await openScenarioPage(page, scenario);
  await executePlan(page, 'mow_offer_accept', scenario.steps);
  const result = await readState(page);
  const snapshot = pickScenarioSnapshot('mow_offer_accept', result);
  assertOrUpdateGolden('mow_offer_accept', snapshot);
  scenarioResults.mow_offer_accept = snapshot;
});
