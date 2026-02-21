#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PLAYWRIGHT_CLI_PATH = path.join(ROOT_DIR, 'node_modules', 'playwright', 'cli.js');

function parseArgs(argv) {
  const args = {
    suite: 'regression',
    updateGolden: false,
    url: null,
    passthrough: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--suite') {
      if (!next) {
        throw new Error('--suite requires one of: regression, quick, all');
      }
      const suite = String(next).trim().toLowerCase();
      if (!['regression', 'quick', 'all'].includes(suite)) {
        throw new Error('--suite must be one of: regression, quick, all');
      }
      args.suite = suite;
      i += 1;
      continue;
    }

    if (arg === '--update-golden') {
      args.updateGolden = true;
      continue;
    }

    if (arg === '--url') {
      if (!next) {
        throw new Error('--url requires a value');
      }
      args.url = next;
      i += 1;
      continue;
    }

    args.passthrough.push(arg);
  }

  return args;
}

function runPlaywrightTest(specPath, passthroughArgs, envOverrides = {}) {
  const result = spawnSync(process.execPath, [
    PLAYWRIGHT_CLI_PATH,
    'test',
    specPath,
    '--config=playwright.config.js',
    ...passthroughArgs,
  ], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ...envOverrides,
    },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const envOverrides = {};

  if (args.url) {
    envOverrides.TYCOON_BASE_URL = args.url;
  }

  if (args.updateGolden && args.suite === 'quick') {
    throw new Error('--update-golden is not valid with --suite quick');
  }

  if (args.suite === 'regression' || args.suite === 'all') {
    const regressionEnv = { ...envOverrides };
    if (args.updateGolden === true) {
      regressionEnv.UPDATE_GOLDEN = '1';
    }
    runPlaywrightTest('tests/regression.spec.js', args.passthrough, regressionEnv);
  }

  if (args.suite === 'quick' || args.suite === 'all') {
    runPlaywrightTest('tests/quick-verify.spec.js', args.passthrough, envOverrides);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
