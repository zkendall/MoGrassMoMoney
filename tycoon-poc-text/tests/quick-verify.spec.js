const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('playwright/test');
const { writeSummary } = require('./helpers/summarize-verify-states.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'output');
const VERIFY_LABEL = 'verify';
const HEADED_ACTION_DELAY_MS = 450;
const DEFAULT_START_STATE = 'default';
const QUICK_STEP_PLANS_PATH = path.join(__dirname, 'fixtures', 'quick-verify-step-plans.json');
const QUICK_STEP_PLANS = JSON.parse(fs.readFileSync(QUICK_STEP_PLANS_PATH, 'utf8'));

function timestampRunId() {
  const d = new Date();
  const two = (value) => String(value).padStart(2, '0');
  const three = (value) => String(value).padStart(3, '0');
  return [
    d.getUTCFullYear(),
    two(d.getUTCMonth() + 1),
    two(d.getUTCDate()),
    'T',
    two(d.getUTCHours()),
    two(d.getUTCMinutes()),
    two(d.getUTCSeconds()),
    three(d.getUTCMilliseconds()),
    'Z',
  ].join('');
}

function readScenarioConfig(name) {
  const scenario = QUICK_STEP_PLANS[name];
  if (!scenario || typeof scenario !== 'object') {
    throw new Error(`Missing quick-verify scenario config: ${name}`);
  }
  if (!Array.isArray(scenario.steps)) {
    throw new Error(`Quick-verify scenario "${name}" is missing steps[]`);
  }
  return {
    seed: Number.isFinite(scenario.seed) ? scenario.seed : null,
    start_state: typeof scenario.start_state === 'string'
      ? scenario.start_state
      : DEFAULT_START_STATE,
    steps: scenario.steps,
  };
}

function buildScenarioUrl(baseURL, scenario) {
  const url = new URL(baseURL);
  if (Number.isFinite(scenario.seed)) {
    url.searchParams.set('seed', String(scenario.seed));
  }
  if (scenario.start_state && scenario.start_state !== DEFAULT_START_STATE) {
    url.searchParams.set('start_state', scenario.start_state);
  }
  return url.toString();
}

test('quick_verify_walkthrough', async ({ page }, testInfo) => {
  const scenario = readScenarioConfig('quick_verify_walkthrough');
  const baseURL = testInfo.project.use.baseURL || 'http://127.0.0.1:4174';
  const verifyUrl = buildScenarioUrl(baseURL, scenario);
  const runId = timestampRunId();
  const webGameDir = path.join(OUTPUT_ROOT, `${runId}-${VERIFY_LABEL}-web-game`);
  const probePath = path.join(OUTPUT_ROOT, `${runId}-${VERIFY_LABEL}-probe.json`);
  const errors = [];

  fs.mkdirSync(webGameDir, { recursive: true });

  const isHeadless = testInfo.project.use.headless !== false;
  const actionDelayMs = isHeadless ? 0 : HEADED_ACTION_DELAY_MS;
  const pollDelayMs = isHeadless ? 10 : 60;

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });
  page.on('pageerror', (error) => {
    errors.push({ type: 'pageerror', text: String(error) });
  });

  async function readState() {
    const raw = await page.evaluate(() => {
      if (typeof window.render_game_to_text !== 'function') return null;
      return window.render_game_to_text();
    });
    if (!raw) throw new Error('render_game_to_text unavailable');
    return JSON.parse(raw);
  }

  async function waitForRenderApi(timeoutMs = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const ready = await page.evaluate(() => typeof window.render_game_to_text === 'function');
      if (ready) return;
      await page.waitForTimeout(pollDelayMs);
    }
    throw new Error('render_game_to_text unavailable');
  }

  async function waitForMode(mode, timeoutMs = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const state = await readState();
      if (state.mode === mode) return state;
      await page.waitForTimeout(pollDelayMs);
    }
    throw new Error(`Timed out waiting for mode=${mode}`);
  }

  async function waitForModeNot(mode, timeoutMs = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const state = await readState();
      if (state.mode !== mode) return state;
      await page.waitForTimeout(pollDelayMs);
    }
    throw new Error(`Timed out waiting for mode!=${mode}`);
  }

  async function press(key, waitMs = actionDelayMs) {
    await page.keyboard.press(key);
    if (waitMs > 0) {
      await page.waitForTimeout(waitMs);
    }
  }

  async function moveDayActionCursorTo(targetCursor) {
    let state = await waitForMode('day_action');
    while (state.day_action.cursor < targetCursor) {
      await press('ArrowDown');
      state = await readState();
    }
    while (state.day_action.cursor > targetCursor) {
      await press('ArrowUp');
      state = await readState();
    }
  }

  async function completeProcessing(durationMs = 1200, requireConfirm = true) {
    await waitForMode('processing');
    if (!isHeadless && durationMs > 0) {
      await page.waitForTimeout(durationMs);
    }
    if (requireConfirm) {
      await press('Enter', 350);
    }
    await waitForModeNot('processing');
  }

  async function executeStep(step) {
    const times = Number.isFinite(step.times) ? step.times : 1;

    if (step.op === 'press') {
      const waitMs = Number.isFinite(step.wait_ms) ? step.wait_ms : actionDelayMs;
      for (let i = 0; i < times; i += 1) {
        await press(step.key, waitMs);
      }
      return;
    }

    if (step.op === 'wait_mode') {
      await waitForMode(step.mode, step.timeout_ms || 6000);
      return;
    }

    if (step.op === 'assert_mode') {
      const state = await readState();
      expect(state.mode).toBe(step.mode);
      return;
    }

    if (step.op === 'move_day_action_cursor') {
      await moveDayActionCursorTo(step.cursor);
      return;
    }

    if (step.op === 'complete_processing') {
      await completeProcessing(step.duration_ms || 1200, step.require_confirm !== false);
      return;
    }

    if (step.op === 'select_planning_jobs_up_to') {
      const planning = await waitForMode('planning');
      const maxSelections = Math.min(step.max || 1, (planning.planning_jobs || []).length);
      const toggleWaitMs = Number.isFinite(step.toggle_wait_ms) ? step.toggle_wait_ms : actionDelayMs;
      const moveWaitMs = Number.isFinite(step.move_wait_ms) ? step.move_wait_ms : actionDelayMs;
      for (let i = 0; i < maxSelections; i += 1) {
        await press('Space', toggleWaitMs);
        if (i < maxSelections - 1) {
          await press('ArrowDown', moveWaitMs);
        }
      }
      return;
    }

    if (step.op === 'accept_first_pending_offer_if_any') {
      const state = await readState();
      if ((state.pending_regular_offers || []).length > 0) {
        const waitMs = Number.isFinite(step.wait_ms) ? step.wait_ms : actionDelayMs;
        await press('Space', waitMs);
      }
      return;
    }

    if (step.op === 'assert_last_report_activity') {
      const state = await readState();
      expect(state.last_report?.activity).toBe(step.activity);
      return;
    }

    throw new Error(`Unknown quick-verify step op: ${step.op}`);
  }

  async function executePlan(steps) {
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      try {
        await executeStep(step);
      } catch (error) {
        const prefix = `Step ${i + 1}/${steps.length}${step.desc ? ` (${step.desc})` : ''}`;
        throw new Error(`${prefix} failed: ${error.message || error}`);
      }
    }
  }

  await page.goto(verifyUrl, { waitUntil: 'domcontentloaded' });
  await waitForRenderApi();
  if (!isHeadless) {
    await page.waitForTimeout(700);
  }

  await executePlan(scenario.steps);

  await page.screenshot({ path: path.join(webGameDir, 'shot-0.png'), fullPage: true });
  const stateText = await page.evaluate(() => {
    if (typeof window.render_game_to_text !== 'function') return null;
    return window.render_game_to_text();
  });

  if (!stateText) {
    throw new Error('render_game_to_text unavailable');
  }

  fs.writeFileSync(path.join(webGameDir, 'state-0.json'), stateText);
  if (errors.length) {
    fs.writeFileSync(path.join(webGameDir, 'errors-0.json'), JSON.stringify(errors, null, 2));
  }

  const finalState = JSON.parse(stateText);
  expect(finalState.mode).toBe('report');
  expect(finalState.last_report?.activity).toBe('shop_hardware');
  expect(errors).toEqual([]);

  const summary = writeSummary(webGameDir, probePath, runId, VERIFY_LABEL);
  expect(summary.last_report_activity).toBe('shop_hardware');

  console.log(`[verify-tycoon-quick] URL: ${verifyUrl}`);
  console.log(`[verify-tycoon-quick] Run: ${runId}`);
  console.log(`[verify-tycoon-quick] Label: ${VERIFY_LABEL}`);
  console.log(`[verify-tycoon-quick] Browser: ${isHeadless ? 'headless' : 'headed'}`);
  console.log(`[verify-tycoon-quick] Output root: ${OUTPUT_ROOT}`);
  console.log('[verify-tycoon-quick] Done.');
  console.log('[verify-tycoon-quick] Artifacts:');
  console.log(`  - ${webGameDir}`);
  console.log(`  - ${probePath}`);
});
