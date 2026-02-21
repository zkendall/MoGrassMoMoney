const { test, expect } = require('playwright/test');
const { createGameDriver } = require('./helpers/game-driver.js');

test('initial mode is menu and start is disabled until setup complete', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  let state = await driver.readState();
  expect(state.mode).toBe('menu');
  expect(state.setup.menu_active).toBe(true);
  expect(state.setup.start_enabled).toBe(false);

  await driver.selectMower('manual');
  await driver.selectLawn('small');
  state = await driver.readState();
  expect(state.setup.selected_mower_id).toBe('manual');
  expect(state.setup.selected_lawn_id).toBe('small');
  expect(state.setup.start_enabled).toBe(true);
});

test('menu selection applies mower/map config and start enters start mode', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  await driver.setupFromMenu({ mowerId: 'large_rider', lawnId: 'large' });

  const state = await driver.readState();
  expect(state.mode).toBe('start');
  expect(state.map.id).toBe('large');
  expect(state.mower.type_id).toBe('large_rider');
  expect(state.mower.fuel_capacity).toBeCloseTo(1.5, 3);
  expect(state.mower.deck_radius).toBeGreaterThan(26);
});

test('R returns to menu and preserves prior session setup selection', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  await driver.setupFromMenu({ mowerId: 'manual', lawnId: 'small' });

  await page.keyboard.press('r');
  let state = await driver.readState();
  expect(state.mode).toBe('menu');
  expect(state.setup.selected_mower_id).toBe('manual');
  expect(state.setup.selected_lawn_id).toBe('small');

  await driver.clickStartJob();
  state = await driver.readState();
  expect(state.mode).toBe('start');
  expect(state.mower.type_id).toBe('manual');
  expect(state.map.id).toBe('small');
});
