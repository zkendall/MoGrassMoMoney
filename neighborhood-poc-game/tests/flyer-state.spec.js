const { test, expect } = require('playwright/test');
const { createGameDriver } = require('./helpers/game-driver.js');

test('flyer delivery only counts once per house and reset restores initial state', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();
  await driver.moveToMailbox('oak-1');

  let state = await driver.readState();
  expect(state.nearby_house_id).toBe('oak-1');

  await driver.inspectNearby();
  await driver.deliverFlyer();
  state = await driver.readState();

  expect(state.delivered_count).toBe(1);
  expect(state.houses.find((house) => house.id === 'oak-1').flyer_delivered).toBe(true);

  await driver.deliverFlyer();
  state = await driver.readState();
  expect(state.delivered_count).toBe(1);

  await page.keyboard.press('Escape');
  await page.keyboard.press('r');
  await driver.advance(16);
  state = await driver.readState();

  expect(state.mode).toBe('roam');
  expect(state.delivered_count).toBe(0);
  expect(state.houses.every((house) => house.flyer_delivered === false)).toBe(true);
  expect(state.player.x).toBeCloseTo(480, 1);
  expect(state.player.y).toBeCloseTo(320, 1);

  driver.expectNoConsoleErrors();
});
