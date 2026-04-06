const { expect } = require('playwright/test');

function createGameDriver(page) {
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });

  page.on('pageerror', (error) => {
    errors.push({ type: 'pageerror', text: String(error) });
  });

  async function waitForRenderApi(timeoutMs = 6000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const ready = await page.evaluate(() => (
        typeof window.render_game_to_text === 'function'
        && typeof window.advanceTime === 'function'
      ));
      if (ready) {
        return;
      }
      await page.waitForTimeout(20);
    }
    throw new Error('render_game_to_text/advanceTime unavailable');
  }

  async function readState() {
    const raw = await page.evaluate(() => {
      if (typeof window.render_game_to_text !== 'function') return null;
      return window.render_game_to_text();
    });
    if (!raw) {
      throw new Error('render_game_to_text unavailable');
    }
    return JSON.parse(raw);
  }

  async function advance(ms) {
    await page.evaluate((advanceMs) => {
      if (typeof window.advanceTime !== 'function') {
        throw new Error('advanceTime unavailable');
      }
      window.advanceTime(advanceMs);
    }, ms);
  }

  async function holdKey(key, ms) {
    await page.keyboard.down(key);
    await advance(ms);
    await page.keyboard.up(key);
    await advance(16);
  }

  async function moveToMailbox(houseId, options = {}) {
    const state = await readState();
    const house = (state.houses || []).find((candidate) => candidate.id === houseId);
    if (!house) {
      throw new Error(`Unknown house: ${houseId}`);
    }

    const margin = Number.isFinite(options.margin) ? options.margin : 12;
    const targetX = house.mailbox.x;
    const targetY = house.mailbox.y + margin;
    let guard = 0;

    while (guard < 120) {
      const snapshot = await readState();
      const dx = targetX - snapshot.player.x;
      const dy = targetY - snapshot.player.y;
      if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) {
        return readState();
      }

      if (Math.abs(dx) > 10) {
        await holdKey(dx > 0 ? 'ArrowRight' : 'ArrowLeft', Math.min(220, Math.abs(dx) * 5));
      }
      if (Math.abs(dy) > 10) {
        await holdKey(dy > 0 ? 'ArrowDown' : 'ArrowUp', Math.min(220, Math.abs(dy) * 5));
      }
      guard += 1;
    }

    throw new Error(`Timed out moving to mailbox: ${houseId}`);
  }

  async function inspectNearby() {
    await page.keyboard.press('Space');
    await advance(16);
  }

  async function deliverFlyer() {
    await page.keyboard.press('Enter');
    await advance(16);
  }

  async function sampleCanvasPixel(point) {
    return page.evaluate(({ x, y }) => {
      const canvas = document.getElementById('game');
      if (!canvas) {
        throw new Error('Canvas #game not found');
      }
      const context = canvas.getContext('2d');
      const data = context.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    }, point);
  }

  function expectNoConsoleErrors() {
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
  }

  return {
    waitForRenderApi,
    readState,
    advance,
    holdKey,
    moveToMailbox,
    inspectNearby,
    deliverFlyer,
    sampleCanvasPixel,
    expectNoConsoleErrors,
  };
}

module.exports = {
  createGameDriver,
};
