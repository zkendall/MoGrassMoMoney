#!/usr/bin/env node
const { pathToFileURL } = require('node:url');
const path = require('node:path');

function readSequence(createRng, seed, count) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng());
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const jobsPath = path.join(__dirname, '..', 'src', 'jobs.js');
  const { createRng } = await import(pathToFileURL(jobsPath).href);

  const sampleCount = 64;
  const seqA1 = readSequence(createRng, 90210, sampleCount);
  const seqA2 = readSequence(createRng, 90210, sampleCount);
  const seqB = readSequence(createRng, 90211, sampleCount);

  assert(
    JSON.stringify(seqA1) === JSON.stringify(seqA2),
    'RNG is not deterministic for identical seed.',
  );
  assert(
    JSON.stringify(seqA1) !== JSON.stringify(seqB),
    'RNG sequences should differ for different seeds.',
  );
  assert(
    seqA1.every((value) => value >= 0 && value < 1),
    'RNG produced value outside expected range [0, 1).',
  );

  console.log(
    JSON.stringify(
      { status: 'ok', test: 'rng_determinism', sample_count: sampleCount },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
