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
  const lawn = state.map.lawn;
  const circles = (state.map.obstacles || []).filter((item) => item.kind === 'circle');
  if (!circles.length) {
    throw new Error('Expected at least one circle obstacle for crash path.');
  }
  if (lawn.kind !== 'circle') {
    return circles[0];
  }

  let obstacle = circles[0];
  let bestScore = -Infinity;
  for (const item of circles) {
    const centerDist = Math.hypot(item.x - lawn.cx, item.y - lawn.cy);
    const edgeMargin = lawn.r - centerDist - item.r;
    if (edgeMargin > bestScore) {
      bestScore = edgeMargin;
      obstacle = item;
    }
  }
  if (!obstacle) {
    throw new Error('Expected at least one circle obstacle for crash path.');
  }
  return obstacle;
}

function clampYToLawn(lawn, y, inset = 26) {
  if (lawn.kind === 'circle') {
    const radius = Math.max(8, lawn.r - inset);
    return Math.max(lawn.cy - radius, Math.min(lawn.cy + radius, y));
  }
  return Math.max(lawn.y + inset, Math.min(lawn.y + lawn.h - inset, y));
}

function getLaneEndpointsAtY(lawn, y, inset = 28) {
  if (lawn.kind === 'circle') {
    const radius = Math.max(8, lawn.r - inset);
    const dy = y - lawn.cy;
    const span = Math.sqrt(Math.max(0, radius * radius - dy * dy));
    return {
      left: lawn.cx - span,
      right: lawn.cx + span,
    };
  }
  return {
    left: lawn.x + inset,
    right: lawn.x + lawn.w - inset,
  };
}

function buildCrashPass(state) {
  const lawn = state.map.lawn;
  const obstacle = getCircleObstacle(state);
  const y = clampYToLawn(lawn, obstacle.y, 26);
  const lane = getLaneEndpointsAtY(lawn, y, 28);
  return [
    { x: lane.left, y },
    { x: lane.right, y },
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

test('crossing non-mow pool/path zones does not apply crash penalties on small lawn', async ({ page }) => {
  const driver = createGameDriver(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await driver.waitForRenderApi();
  await driver.setupFromMenu({ mowerId: 'manual', lawnId: 'small' });

  const stateAtStart = await driver.readState();
  const nonMowRect = (stateAtStart.map.yard_features || []).find((feature) => (
    feature.non_mowable === true && feature.kind === 'rect'
  ));
  expect(nonMowRect).toBeTruthy();

  const path = [
    { x: nonMowRect.x + 8, y: nonMowRect.y + 10 },
    { x: nonMowRect.x + nonMowRect.w - 8, y: nonMowRect.y + 10 },
  ];

  await runAcceptedPath(driver, path);
  const state = await advanceUntil(driver, (snapshot) => snapshot.mode !== 'animating', {
    maxSteps: 420,
    stepMs: 60,
  });

  expect(['drawing', 'won']).toContain(state.mode);
  expect(state.economy.total_crashes).toBe(0);
  expect(state.economy.cash).toBe(0);

  driver.expectNoConsoleErrors();
});
