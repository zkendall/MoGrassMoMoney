#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function readStates(dirPath) {
  const files = fs
    .readdirSync(dirPath)
    .filter((name) => /^state-\d+\.json$/.test(name))
    .sort();
  if (!files.length) {
    throw new Error('No state files found');
  }
  return files.map((name) => JSON.parse(fs.readFileSync(path.join(dirPath, name), 'utf8')));
}

function summarizeStates(states, runId, label) {
  const first = states[0];
  const last = states[states.length - 1];
  const debugLogs = states.flatMap((state) => state.debug_log_tail || []);
  const hasRollLogs = debugLogs.some((entry) => /roll=/.test(entry.message || ''));

  return {
    run_id: runId,
    label,
    iterations: states.length,
    first: {
      day: first.day,
      mode: first.mode,
      cash: first.cash,
      repeat_customers: (first.repeat_customers || []).length,
      leads: (first.leads || []).length,
    },
    last: {
      day: last.day,
      mode: last.mode,
      cash: last.cash,
      repeat_customers: (last.repeat_customers || []).length,
      leads: (last.leads || []).length,
    },
    any_pending_offers: states.some((state) => (state.pending_regular_offers || []).length > 0),
    modes_seen: [...new Set(states.map((state) => state.mode))],
    last_report_activity: last.last_report?.activity || null,
    debug_log_entries: debugLogs.length,
    debug_roll_logs_found: hasRollLogs,
  };
}

function main() {
  const statesDir = process.argv[2];
  const outputPath = process.argv[3];
  const runId = process.argv[4];
  const label = process.argv[5];

  if (!statesDir || !outputPath || !runId || !label) {
    console.error(
      'Usage: node summarize-verify-states.js <statesDir> <outputPath> <runId> <label>',
    );
    process.exit(1);
  }

  const states = readStates(statesDir);
  const summary = summarizeStates(states, runId, label);

  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main();
