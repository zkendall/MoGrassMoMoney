#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const runRegressionPath = path.join(__dirname, 'run-regression-tests.js');
const passthroughArgs = process.argv.slice(2);

const result = spawnSync(
  process.execPath,
  [runRegressionPath, '--suite', 'quick', ...passthroughArgs],
  { stdio: 'inherit' },
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}
