const { test, expect } = require('playwright/test');
const { createGameDriver } = require('./helpers/game-driver.js');

const SAFE_PATH_A = [
  { x: 190, y: 180 },
  { x: 760, y: 180 },
];

const SAFE_PATH_B = [
  { x: 190, y: 200 },
  { x: 760, y: 200 },
];

async function advanceUntil(driver, predicate, { maxSteps = 200, stepMs = 60 } = {}) {
  for (let i = 0; i < maxSteps; i += 1) {
    const state = await driver.readState();
    if (predicate(state)) {
      return state;
    }
    await driver.advance(stepMs);
  }
  return driver.readState();
}

test('drawing -> review -> retry -> drawing -> accept -> animating -> complete', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  let state = await driver.readState();
  expect(state.mode).toBe('start');

  await driver.drawPath(SAFE_PATH_A);
  state = await driver.readState();
  expect(state.mode).toBe('review');
  expect(state.planning.point_count).toBeGreaterThan(1);
  expect(state.review.mode_active).toBe(true);

  await driver.clickReviewButton('Retry');
  state = await driver.readState();
  expect(state.mode).toBe('drawing');
  expect(state.planning.point_count).toBe(0);

  await driver.drawPath(SAFE_PATH_B);
  state = await driver.readState();
  expect(state.mode).toBe('review');

  await driver.clickReviewButton('Accept');
  state = await driver.readState();
  expect(state.mode).toBe('animating');

  const startProgress = state.playback.progress_0_to_1;
  const startCoverage = state.coverage_percent;
  const startFuel = state.mower.fuel;

  await driver.advance(1000);
  state = await driver.readState();
  expect(state.mode).toBe('animating');
  expect(state.playback.progress_0_to_1).toBeGreaterThan(startProgress);
  expect(state.coverage_percent).toBeGreaterThan(startCoverage);
  expect(state.mower.fuel).toBeLessThan(startFuel);

  state = await advanceUntil(driver, (snapshot) => snapshot.mode !== 'animating', {
    maxSteps: 300,
    stepMs: 60,
  });

  expect(['drawing', 'won']).toContain(state.mode);
  driver.expectNoConsoleErrors();
});

test('holding Space fast-forwards mower playback speed', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  const longPath = [
    { x: 190, y: 180 },
    { x: 760, y: 180 },
    { x: 760, y: 560 },
  ];

  await driver.drawPath(longPath);
  await driver.clickReviewButton('Accept');

  let state = await driver.readState();
  expect(state.mode).toBe('animating');

  const startProgress = state.playback.progress_0_to_1;
  await driver.advance(400);
  state = await driver.readState();
  const normalDelta = state.playback.progress_0_to_1 - startProgress;

  await page.keyboard.down('Space');
  const fastStart = state.playback.progress_0_to_1;
  await driver.advance(400);
  await page.keyboard.up('Space');
  await driver.advance(16);
  state = await driver.readState();

  const fastDelta = state.playback.progress_0_to_1 - fastStart;
  expect(state.input.fast_forward).toBe(false);
  expect(state.playback.effective_speed_px_per_sec).toBe(state.playback.speed_px_per_sec);
  expect(fastDelta).toBeGreaterThan(normalDelta * 1.8);

  driver.expectNoConsoleErrors();
});

test('small mower empties tank and requires paid refill to continue', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/?mower_type=small', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  const depletionPath = [
    { x: 180, y: 180 },
    { x: 760, y: 180 },
    { x: 760, y: 200 },
    { x: 180, y: 200 },
    { x: 180, y: 220 },
    { x: 760, y: 220 },
    { x: 760, y: 200 },
    { x: 180, y: 200 },
    { x: 180, y: 180 },
    { x: 760, y: 180 },
    { x: 760, y: 200 },
    { x: 180, y: 200 },
    { x: 180, y: 220 },
    { x: 760, y: 220 },
  ];

  await driver.drawPath(depletionPath);
  await driver.clickReviewButton('Accept');

  let state = await advanceUntil(driver, (snapshot) => (
    snapshot.mode === 'animating'
      && snapshot.playback.waiting_for_fuel
      && snapshot.mower.fuel <= 0.01
  ), { maxSteps: 420, stepMs: 60 });

  expect(state.mode).toBe('animating');
  expect(state.playback.waiting_for_fuel).toBe(true);
  expect(state.mower.uses_fuel).toBe(true);
  expect(state.mower.fuel_capacity).toBeCloseTo(0.5, 3);
  expect(state.mower.fuel).toBeLessThanOrEqual(0.01);
  const pausedProgress = state.playback.progress_0_to_1;

  const cashBeforeRefill = state.economy.cash;
  const refillCost = state.economy.refill_cost;
  expect(refillCost).toBeGreaterThan(0);

  await page.keyboard.press('e');
  state = await driver.readState();

  expect(state.mode).toBe('animating');
  expect(state.playback.waiting_for_fuel).toBe(false);
  expect(state.mower.fuel).toBeCloseTo(state.mower.fuel_capacity, 2);
  expect(state.economy.cash).toBeCloseTo(cashBeforeRefill - refillCost, 2);
  expect(state.economy.refill_cost).toBeCloseTo(0, 2);

  await driver.advance(120);
  state = await driver.readState();
  expect(state.playback.progress_0_to_1).toBeGreaterThan(pausedProgress);

  driver.expectNoConsoleErrors();
});

test('push mower uses no fuel', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/?mower_type=push', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  let state = await driver.readState();
  expect(state.mower.type_id).toBe('push');
  expect(state.mower.uses_fuel).toBe(false);
  expect(state.mower.fuel_capacity).toBe(0);

  await driver.drawPath([
    { x: 190, y: 200 },
    { x: 760, y: 200 },
  ]);
  await driver.clickReviewButton('Accept');
  await driver.advance(1000);

  state = await driver.readState();
  expect(state.mode).toBe('animating');
  expect(state.mower.fuel).toBe(0);
  expect(state.economy.refill_cost).toBe(0);

  await page.keyboard.press('e');
  state = await driver.readState();
  expect(state.mower.fuel).toBe(0);

  driver.expectNoConsoleErrors();
});
