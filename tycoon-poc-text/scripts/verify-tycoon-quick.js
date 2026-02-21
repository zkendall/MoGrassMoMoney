#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { computeVerifyLabel } = require('./compute-verify-label.js');
const { writeSummary } = require('./summarize-verify-states.js');

// NOTE: Keep this verification flow legible.
// Prefer clean, explicit steps with documented intent over dense one-liners.

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_ROOT = path.join(ROOT_DIR, 'output');
const HISTORY_PATH = path.join(OUT_ROOT, '.verify-history.json');
const VERIFY_HEADED_RUNNER = path.join(ROOT_DIR, 'scripts', 'verify-tycoon-headed-runner.js');

function parseArgs(argv) {
  const args = {
    url: 'http://127.0.0.1:4174',
    headless: true,
  };

  let urlAssigned = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--headed') {
      args.headless = false;
      continue;
    }
    if (arg === '--headless') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--headless requires true/false');
      }
      const normalized = String(next).trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        args.headless = true;
      } else if (normalized === 'false' || normalized === '0') {
        args.headless = false;
      } else {
        throw new Error('--headless must be true/false (or 1/0)');
      }
      i += 1;
      continue;
    }
    if (arg === '--url') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--url requires a value');
      }
      args.url = next;
      i += 1;
      urlAssigned = true;
      continue;
    }
    if (!arg.startsWith('--') && !urlAssigned) {
      args.url = arg;
      urlAssigned = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function withStartState(urlString) {
  const url = new URL(urlString);
  if (!url.searchParams.has('start_state')) {
    url.searchParams.set('start_state', 'test_all_actions');
  }
  return url.toString();
}

function timestampRunId() {
  const d = new Date();
  const two = (value) => String(value).padStart(2, '0');
  const three = (value) => String(value).padStart(3, '0');
  return [
    d.getUTCFullYear(),
    two(d.getUTCMonth() + 1),
    two(d.getUTCDate()),
    'T',
    two(d.getUTCHours()),
    two(d.getUTCMinutes()),
    two(d.getUTCSeconds()),
    three(d.getUTCMilliseconds()),
    'Z',
  ].join('');
}

function runNodeOrThrow(args, options = {}) {
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: node ${args.join(' ')}`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const verifyUrl = withStartState(args.url);
  const runId = timestampRunId();
  const stateTmp = path.join(os.tmpdir(), `tycoon-verify-state-${process.pid}-${Date.now()}.json`);

  fs.mkdirSync(OUT_ROOT, { recursive: true });

  try {
    const label = computeVerifyLabel(ROOT_DIR, stateTmp, HISTORY_PATH);
    const webGameDir = path.join(OUT_ROOT, `${runId}-${label}-web-game`);
    const probePath = path.join(OUT_ROOT, `${runId}-${label}-probe.json`);

    console.log(`[verify-tycoon-quick] URL: ${verifyUrl}`);
    console.log(`[verify-tycoon-quick] Run: ${runId}`);
    console.log(`[verify-tycoon-quick] Label: ${label}`);
    console.log(`[verify-tycoon-quick] Browser: ${args.headless ? 'headless' : 'headed'}`);
    console.log(`[verify-tycoon-quick] Output root: ${OUT_ROOT}`);

    runNodeOrThrow(['--check', path.join(ROOT_DIR, 'game.js')]);
    runNodeOrThrow([VERIFY_HEADED_RUNNER, verifyUrl, webGameDir, String(args.headless)], {
      cwd: ROOT_DIR,
    });

    writeSummary(webGameDir, probePath, runId, label);
    fs.copyFileSync(stateTmp, HISTORY_PATH);

    console.log('[verify-tycoon-quick] Done.');
    console.log('[verify-tycoon-quick] Artifacts:');
    console.log(`  - ${webGameDir}`);
    console.log(`  - ${probePath}`);
  } finally {
    if (fs.existsSync(stateTmp)) {
      fs.unlinkSync(stateTmp);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
