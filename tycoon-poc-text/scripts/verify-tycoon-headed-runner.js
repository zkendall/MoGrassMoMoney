#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = process.argv[2];
const outDir = process.argv[3];

if (!url || !outDir) {
  console.error('Usage: node verify-tycoon-headed-runner.js <url> <outDir>');
  process.exit(1);
}

const steps = [
  ['Enter', 500],
  ['Space', 350],
  ['Enter', 500],
  ['Enter', 500],
  ['WAIT', 1500],
  ['Enter', 500],
  ['Enter', 500],
  ['WAIT', 900],

  ['ArrowDown', 350],
  ['Enter', 500],
  ['WAIT', 1300],
  ['Enter', 500],
  ['WAIT', 1200],
  ['Enter', 500],
  ['Enter', 500],
  ['WAIT', 900],

  ['ArrowUp', 350],
  ['ArrowUp', 350],
  ['Enter', 500],
  ['WAIT', 1500],
  ['Enter', 500],
  ['Enter', 500],
  ['WAIT', 900],

  ['ArrowDown', 350],
  ['Enter', 500],
  ['WAIT', 1500],
  ['Enter', 500],
];

async function run() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage();
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', text: String(err) });
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  for (const [input, waitMs] of steps) {
    if (input === 'WAIT') {
      await page.waitForTimeout(waitMs);
      continue;
    }
    await page.keyboard.press(input);
    await page.waitForTimeout(waitMs);
  }

  await page.screenshot({ path: path.join(outDir, 'shot-0.png'), fullPage: true });

  const text = await page.evaluate(() =>
    typeof window.render_game_to_text === 'function' ? window.render_game_to_text() : null,
  );
  if (text) {
    fs.writeFileSync(path.join(outDir, 'state-0.json'), text);
  }
  if (errors.length) {
    fs.writeFileSync(path.join(outDir, 'errors-0.json'), JSON.stringify(errors, null, 2));
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
