const { test, expect } = require('playwright/test');
const { createGameDriver } = require('./helpers/game-driver.js');

function colorDelta(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

async function sampleAverageColor(driver, points) {
  const samples = await Promise.all(points.map((point) => driver.sampleCanvasPixel(point)));
  const totals = samples.reduce((acc, sample) => {
    acc[0] += sample[0];
    acc[1] += sample[1];
    acc[2] += sample[2];
    return acc;
  }, [0, 0, 0]);
  return totals.map((value) => value / samples.length);
}

async function advanceUntil(driver, predicate, { maxSteps = 260, stepMs = 60 } = {}) {
  for (let i = 0; i < maxSteps; i += 1) {
    const state = await driver.readState();
    if (predicate(state)) {
      return state;
    }
    await driver.advance(stepMs);
  }
  return driver.readState();
}

test('mowed lanes blend toward pass direction over repeated playback', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();
  await driver.setupFromMenu({ mowerId: 'small_gas', lawnId: 'medium' });

  let state = await driver.readState();
  expect(state.mode).toBe('start');
  expect(state.mowing_visuals.stripe_selection).toBe('heading_blend');
  expect(state.mowing_visuals.mowed_assets).toEqual([
    'assets/grass-mowed-light.png',
    'assets/grass-mowed-dark.png',
  ]);
  expect(state.mowing_visuals.lay_blend_strength).toBeGreaterThan(0);

  const top = state.map.lawn.y + 54;
  const bottom = state.map.lawn.y + state.map.lawn.h - 54;
  const laneX = 420;
  const laneUpperY = 220;
  const laneMidY = 320;
  const laneLowerY = 420;
  const lanePoints = [
    { x: laneX, y: laneUpperY },
    { x: laneX, y: laneMidY },
    { x: laneX, y: laneLowerY },
  ];
  const baselineLane = await sampleAverageColor(driver, lanePoints);

  await driver.drawPath([
    { x: laneX, y: top },
    { x: laneX, y: bottom },
  ]);
  await driver.clickReviewButton('Accept');
  state = await advanceUntil(driver, (snapshot) => snapshot.mode !== 'animating', {
    maxSteps: 260,
    stepMs: 60,
  });
  expect(['drawing', 'won']).toContain(state.mode);
  const afterDownward = await sampleAverageColor(driver, lanePoints);

  await driver.drawPath([
    { x: laneX, y: top },
    { x: laneX, y: bottom },
  ]);
  await driver.clickReviewButton('Accept');
  state = await advanceUntil(driver, (snapshot) => snapshot.mode !== 'animating', {
    maxSteps: 260,
    stepMs: 60,
  });
  const afterSecondDownward = await sampleAverageColor(driver, lanePoints);

  await driver.drawPath([
    { x: laneX, y: bottom },
    { x: laneX, y: top },
  ]);
  await driver.clickReviewButton('Accept');
  state = await advanceUntil(driver, (snapshot) => snapshot.mode !== 'animating', {
    maxSteps: 260,
    stepMs: 60,
  });
  const afterUpward = await sampleAverageColor(driver, lanePoints);

  expect(colorDelta(afterDownward, baselineLane)).toBeGreaterThan(18);
  expect(colorDelta(afterSecondDownward, afterDownward)).toBeGreaterThan(2);
  expect(colorDelta(afterUpward, afterSecondDownward)).toBeGreaterThan(2);
  expect(colorDelta(afterUpward, baselineLane)).toBeGreaterThan(12);

  driver.expectNoConsoleErrors();
});
