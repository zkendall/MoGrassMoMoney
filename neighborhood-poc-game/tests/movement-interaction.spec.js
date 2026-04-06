const { test, expect } = require('playwright/test');
const { createGameDriver } = require('./helpers/game-driver.js');

test('player moves with arrows and WASD, then inspects and delivers at a nearby house', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  const start = await driver.readState();
  expect(start.mode).toBe('roam');
  expect(start.delivered_count).toBe(0);

  await driver.holdKey('ArrowLeft', 240);
  let state = await driver.readState();
  expect(state.player.x).toBeLessThan(start.player.x - 10);

  await driver.holdKey('d', 260);
  state = await driver.readState();
  expect(state.player.x).toBeGreaterThan(start.player.x - 8);

  await driver.moveToMailbox('elm-5');
  state = await driver.readState();
  expect(state.nearby_house_id).toBe('elm-5');

  await driver.inspectNearby();
  state = await driver.readState();
  expect(state.mode).toBe('inspect');
  expect(state.inspected_house_id).toBe('elm-5');

  await driver.deliverFlyer();
  state = await driver.readState();
  expect(state.mode).toBe('inspect');
  expect(state.delivered_count).toBe(1);
  expect(state.inspected_house.flyer_delivered).toBe(true);

  driver.expectNoConsoleErrors();
});
