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
  expect(Object.keys(state)).toEqual(expect.arrayContaining([
    'setup',
    'planning',
    'review',
    'playback',
    'economy',
    'mower',
    'map',
    'input',
  ]));

  await driver.selectMower('manual');
  await driver.selectLawn('small');
  state = await driver.readState();
  expect(state.setup.selected_mower_id).toBe('manual');
  expect(state.setup.selected_lawn_id).toBe('small');
  expect(state.setup.start_enabled).toBe(true);

  await driver.clickStartJob();
  state = await driver.readState();
  expect(state.mower.type_id).toBe('manual');
  expect(state.mower.deck_radius).toBe(16);
});

test('empty field map loads as an obstacle-free sandbox', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  await driver.setupFromMenu({ mowerId: 'manual', lawnId: 'empty_field' });
  await page.waitForFunction(() => {
    const snapshot = JSON.parse(window.render_game_to_text());
    return snapshot.map?.art?.base?.loaded && snapshot.map?.art?.mow_mask?.loaded;
  });

  const state = await driver.readState();
  expect(state.map.id).toBe('empty_field');
  expect(state.map.obstacles).toEqual([]);
  expect(state.map.yard_features).toEqual([]);
  expect(state.map.house_block.w).toBe(0);
  expect(state.map.driveway_block.w).toBe(0);
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
  expect(state.mower.deck_radius).toBeGreaterThan(20);
});

test('small gas mower uses the tightened cut width', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  await driver.setupFromMenu({ mowerId: 'small_gas', lawnId: 'medium' });

  const state = await driver.readState();
  expect(state.mower.type_id).toBe('small_gas');
  expect(state.mower.deck_radius).toBe(16);
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

test('all lawn maps report art-backed backgrounds and mask-based mowing', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();

  const initialState = await driver.readState();
  const lawnIds = (initialState.setup?.lawn_options || []).map((option) => option.id);

  for (const lawnId of lawnIds) {
    await driver.setupFromMenu({ mowerId: 'manual', lawnId });
    await page.waitForFunction(() => {
      const snapshot = JSON.parse(window.render_game_to_text());
      return snapshot.map?.art?.base?.loaded && snapshot.map?.art?.mow_mask?.loaded;
    });

    const state = await driver.readState();
    expect(state.map.id).toBe(lawnId);
    expect(state.map.art.enabled).toBe(true);
    expect(state.map.art.background_source).toBe('art');
    expect(state.map.art.mow_source).toBe('mask');
    expect(state.map.art.collision_source).toBe('obstacles');

    if (lawnId !== lawnIds[lawnIds.length - 1]) {
      await page.keyboard.press('r');
    }
  }
});
