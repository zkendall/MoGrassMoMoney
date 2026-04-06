const { test, expect } = require('playwright/test');
const { createGameDriver } = require('./helpers/game-driver.js');

function colorDelta(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

test('inspect mode renders a visible overlay panel without crashing', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  const overlayPoint = { x: 760, y: 180 };
  const baseline = await driver.sampleCanvasPixel(overlayPoint);

  await driver.moveToMailbox('birch-4');
  await driver.inspectNearby();

  const state = await driver.readState();
  expect(state.mode).toBe('inspect');
  expect(state.inspected_house_id).toBe('birch-4');

  const inspectPixel = await driver.sampleCanvasPixel(overlayPoint);
  expect(colorDelta(inspectPixel, baseline)).toBeGreaterThan(30);

  driver.expectNoConsoleErrors();
});
