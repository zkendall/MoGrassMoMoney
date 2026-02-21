const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('playwright/test');
const { writeSummary } = require('../scripts/summarize-verify-states.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'output');
const VERIFY_LABEL = 'verify';

function withStartState(urlString) {
  const url = new URL(urlString);
  if (!url.searchParams.has('start_state')) {
    url.searchParams.set('start_state', 'test_all_actions');
  }
  return url.toString();
}

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

test('quick_verify_walkthrough', async ({ page }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL || 'http://127.0.0.1:4174';
  const verifyUrl = withStartState(baseURL);
  const runId = timestampRunId();
  const webGameDir = path.join(OUTPUT_ROOT, `${runId}-${VERIFY_LABEL}-web-game`);
  const probePath = path.join(OUTPUT_ROOT, `${runId}-${VERIFY_LABEL}-probe.json`);
  const errors = [];

  fs.mkdirSync(webGameDir, { recursive: true });

  const isHeadless = testInfo.project.use.headless !== false;
  const actionDelayMs = isHeadless ? 0 : 250;
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

  async function finishProcessing(delayMs = 1200) {
    await waitForMode('processing');
    if (!isHeadless && delayMs > 0) {
      await page.waitForTimeout(delayMs);
    }
    await press('Enter', 200);
    await waitForModeNot('processing');
  }

  await page.goto(verifyUrl, { waitUntil: 'domcontentloaded' });
  await waitForRenderApi();
  if (!isHeadless) {
    await page.waitForTimeout(500);
  }

  await moveDayActionCursorTo(0);
  await press('Enter');
  await finishProcessing(1300);
  await waitForMode('report');
  await press('Enter', 250);
  await waitForMode('day_action');

  await moveDayActionCursorTo(1);
  await press('Enter');
  await finishProcessing(1100);
  await waitForMode('report');
  await press('Enter', 250);
  await waitForMode('day_action');

  await moveDayActionCursorTo(2);
  await press('Enter');
  const planning = await waitForMode('planning');
  const maxSelections = Math.min(3, (planning.planning_jobs || []).length);
  for (let i = 0; i < maxSelections; i += 1) {
    await press('Space', 200);
    if (i < maxSelections - 1) await press('ArrowDown', 180);
  }
  await press('Enter', 250);
  await waitForMode('performance');
  for (let i = 0; i < 12; i += 1) await press('ArrowUp', 30);
  await press('Enter', 250);
  await finishProcessing(1200);
  const mowReport = await waitForMode('report');
  if ((mowReport.pending_regular_offers || []).length) {
    await press('Space', 200);
  }
  await press('Enter', 250);
  await waitForMode('day_action');

  await moveDayActionCursorTo(3);
  await press('Enter');
  await finishProcessing(1000);
  await waitForMode('hardware_shop');
  await press('Enter', 250);
  await finishProcessing(900);
  await waitForMode('report');

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
