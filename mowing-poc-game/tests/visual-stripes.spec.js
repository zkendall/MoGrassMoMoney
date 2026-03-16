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

test('mowing visibly changes autotiled grass lanes', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();
  await driver.setupFromMenu({ mowerId: 'small_gas', lawnId: 'medium' });

  let state = await driver.readState();
  expect(state.mode).toBe('start');
  expect(state.mowing_visuals.assets).toEqual({
    unmowed: 'assets/grass-unmowed.png',
    mowed: 'assets/grass-mowed.png',
  });
  expect(state.mowing_visuals.tile_size_px).toBe(16);
  expect(state.mowing_visuals.frame_width_px).toBe(16);
  expect(state.mowing_visuals.frame_height_px).toBe(16);
  expect(state.mowing_visuals.autotile_columns).toBe(8);

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

  expect(colorDelta(afterDownward, baselineLane)).toBeGreaterThan(8);

  driver.expectNoConsoleErrors();
});
