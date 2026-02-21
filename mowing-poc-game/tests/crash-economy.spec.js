const { test, expect } = require('playwright/test');
const { createGameDriver } = require('./helpers/game-driver.js');

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

function getCircleObstacle(state) {
  const obstacle = (state.map.obstacles || []).find((item) => item.kind === 'circle');
  if (!obstacle) {
    throw new Error('Expected at least one circle obstacle for crash path.');
  }
  return obstacle;
}

function buildCrashPass(state) {
  const lawn = state.map.lawn;
  const obstacle = getCircleObstacle(state);
  const y = Math.max(lawn.y + 26, Math.min(lawn.y + lawn.h - 26, obstacle.y));
  return [
    { x: lawn.x + 28, y },
    { x: lawn.x + lawn.w - 28, y },
  ];
}

function buildCrashPassTwice(state) {
  const pass = buildCrashPass(state);
  return [pass[0], pass[1], pass[0]];
}

function buildOutOfBoundsPath(state) {
  const lawn = state.map.lawn;
  return [
    { x: lawn.x + 42, y: lawn.y + 50 },
    { x: lawn.x + 42, y: lawn.y - 70 },
    { x: lawn.x + 142, y: lawn.y - 70 },
    { x: lawn.x + 142, y: lawn.y + 50 },
  ];
}

async function runAcceptedPath(driver, points) {
  await driver.drawPath(points);
  let state = await driver.readState();
  expect(state.mode).toBe('review');
  await driver.clickReviewButton('Accept');
  state = await driver.readState();
  expect(state.mode).toBe('animating');
  return state;
}

for (const lawnId of ['small', 'medium', 'large']) {
  test(`crash applies penalty on ${lawnId} lawn`, async ({ page }) => {
    const driver = createGameDriver(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await driver.waitForRenderApi();
    await driver.setupFromMenu({ mowerId: 'manual', lawnId });

    const stateBefore = await driver.readState();
    expect(stateBefore.map.id).toBe(lawnId);

    await runAcceptedPath(driver, buildCrashPass(stateBefore));

    const state = await advanceUntil(
      driver,
      (snapshot) => snapshot.playback.flip_active === true,
      { maxSteps: 260, stepMs: 40 }
    );

    expect(state.playback.flip_active).toBe(true);
    expect(state.economy.total_crashes).toBeGreaterThanOrEqual(1);
    expect(state.economy.cash).toBeLessThanOrEqual(-1);
    expect(state.effects.active_penalty_popups).toBeGreaterThan(0);

    driver.expectNoConsoleErrors();
  });
}

test('re-entering an obstacle in one route charges again', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();
  await driver.setupFromMenu({ mowerId: 'manual', lawnId: 'medium' });

  const stateAtStart = await driver.readState();
  await runAcceptedPath(driver, buildCrashPassTwice(stateAtStart));

  const state = await advanceUntil(driver, (snapshot) => snapshot.mode !== 'animating', {
    maxSteps: 520,
    stepMs: 60,
  });

  expect(['drawing', 'won']).toContain(state.mode);
  expect(state.economy.total_crashes).toBeGreaterThanOrEqual(2);
  expect(state.economy.cash).toBeLessThanOrEqual(-2);

  driver.expectNoConsoleErrors();
});

test('out-of-bounds path is clamped and does not trigger boundary penalty', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();
  await driver.setupFromMenu({ mowerId: 'manual', lawnId: 'medium' });

  const stateAtStart = await driver.readState();
  await runAcceptedPath(driver, buildOutOfBoundsPath(stateAtStart));

  const state = await advanceUntil(driver, (snapshot) => snapshot.mode !== 'animating', {
    maxSteps: 520,
    stepMs: 60,
  });

  expect(['drawing', 'won']).toContain(state.mode);
  expect(state.collision_debug.overlapping_obstacle_ids).toEqual([]);

  const minY = state.map.lawn.y + state.mower.body_radius;
  expect(state.mower.y).toBeGreaterThanOrEqual(minY - 0.01);

  driver.expectNoConsoleErrors();
});
