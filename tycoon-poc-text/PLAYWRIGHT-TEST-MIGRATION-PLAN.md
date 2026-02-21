# Playwright Test Migration Plan and Parity Record

## Purpose

This document captures the pre-migration test baseline and records parity checks after migrating regression coverage to Playwright Test (`playwright/test`).

## Migration Status (2026-02-21)

- Implemented Playwright Test config: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/playwright.config.js`
- Implemented Playwright regression spec: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/tests/regression.spec.js`
- Implemented Playwright quick-verify spec: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/tests/quick-verify.spec.js`
- Switched `test:regression` and `verify:quick` to direct Playwright CLI execution (`npx playwright test ...`).
- Removed legacy wrapper/compatibility scripts:
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/run-playwright-regression.js`
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/run-playwright-quick-verify.js`
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/run-regression-tests.js`
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/verify-tycoon-quick.js`
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/verify-tycoon-quick.sh`
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/verify-tycoon-headed-runner.js`
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/verify-tycoon-actions.json`

## Scope Baseline (Pre-Migration)

Current test/verification entrypoints in `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/package.json`:

- `verify:syntax`: `node --check game.js`
- `test:rng`: `node ./scripts/test-rng-determinism.js`
- `test:regression`: `node ./scripts/run-regression-tests.js`
- `verify:quick`: `node ./scripts/run-regression-tests.js --suite quick`

Primary runner at baseline: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/run-regression-tests.js`.

## Detailed Existing Scenarios

### 1) RNG Determinism Unit Test

Source: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/test-rng-determinism.js`

Behavior covered:

- Imports `createRng` from `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/src/jobs.js`.
- Uses `sampleCount = 64`.
- Asserts same seed (`90210`) yields identical sequences.
- Asserts different seed (`90211`) yields different sequence.
- Asserts all values are in `[0, 1)`.

Current pass output payload:

- `{ "status": "ok", "test": "rng_determinism", "sample_count": 64 }`

### 2) Regression Golden Scenarios

Sources:

- Runner: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/run-regression-tests.js`
- Step plans: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/regression-step-plans.json`
- Golden baselines:
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/tests/golden/solicit_report.json`
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/tests/golden/follow_up_report.json`
  - `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/tests/golden/mow_offer_accept.json`

Execution model:

- Browser: Chromium via Playwright Test runner (`playwright/test`).
- Default seed per scenario: `2` (`withSeed(url, 2)`).
- Uses deterministic state API: `window.render_game_to_text()`.
- Uses helper ops: `press`, `set_leads`, `wait_mode`, `assert_mode`, `complete_processing`, `assert_*`.

#### 2.1 `solicit_report`

Step flow:

1. Assert initial mode is `day_action`.
2. Press `Enter` (select `Solicit`).
3. Complete processing (`duration_ms: 1200`, `require_confirm: true`).
4. Assert `last_report.activity === "solicit"`.

Captured snapshot fields:

- `seed`, `mode`, `day`, `cash`
- `leads[]`: `id`, `lead_status`, `pattern_preference` (sorted by `id`)
- `last_report`: `activity`, `materials`, sorted `leads_generated[]`, `endingCash`

Golden currently expects:

- `mode: "report"`, `day: 1`, `cash: 210`
- 3 raw leads with mixed pattern preferences
- `last_report.activity: "solicit"`, `materials: 10`

#### 2.2 `follow_up_report`

Step flow:

1. Seed 3 raw leads via `window.__tycoonTestSetLeads({ count: 3, status: "raw" })`.
2. Press `ArrowDown` (move to `Follow Up Leads`).
3. Press `Enter`.
4. Complete processing (`duration_ms: 1000`, `require_confirm: true`).
5. Assert `last_report.activity === "follow_up"`.

Captured snapshot fields:

- `seed`, `mode`, `day`, `cash`
- `leads[]`: `id`, `lead_status` (sorted by `id`)
- `last_report`: `activity`, sorted `leads_qualified[]`, `endingCash`

Golden currently expects:

- `mode: "report"`, `day: 1`, `cash: 220`
- Mixed raw/qualified lead statuses
- `last_report.activity: "follow_up"` with one qualified lead token

#### 2.3 `mow_offer_accept`

Step flow:

1. Seed 2 qualified leads.
2. Wait for `day_action`.
3. Press `ArrowDown` twice (move to `Mow Lawns`), then `Enter`.
4. Wait for `planning`.
5. Assert at least one planning job exists.
6. Press `Space` (select first job), then `Enter`.
7. Wait for `performance`.
8. Press `ArrowUp` 22 times (raise score).
9. Press `Enter` (resolve mowing).
10. Complete processing (`duration_ms: 1100`, `require_confirm: true`).
11. Assert `last_report.activity === "mow"`.
12. Assert at least one pending regular offer.
13. Press `Space` (accept first offer), then `Enter`.
14. Complete day advance processing (`duration_ms: 700`, `require_confirm: false`).
15. Wait for `day_action`.
16. Assert repeat customer count increased (`>= 1`).

Captured snapshot fields:

- `seed`, `mode`, `day`, `cash`, `mower_tier`
- `repeat_customers[]`: `id`, `days_since_service`, `pattern_preference` (sorted)
- `leads[]`: `id`, `lead_status` (sorted)

Golden currently expects:

- `mode: "day_action"`, `day: 2`
- One repeat customer carried into next day
- Remaining qualified leads preserved

### 3) Quick Verify Walkthrough Scenario

Sources:

- Quick entrypoint: `npx playwright test tests/quick-verify.spec.js --config=playwright.config.js` (or `npm run verify:quick`)
- Playwright quick spec: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/tests/quick-verify.spec.js`
- Probe summarizer: `/Users/zkendall/projects/MowGrassMoMoney/tycoon-poc-text/scripts/summarize-verify-states.js`

Execution model:

- Auto-adds `start_state=test_all_actions` when missing.
- Creates timestamped artifacts:
  - `<runId>-verify-web-game/shot-0.png`
  - `<runId>-verify-web-game/state-0.json`
  - `<runId>-verify-probe.json`

Walkthrough behavior:

1. `Solicit` path, process to report, advance day.
2. `Follow Up Leads` path, process to report, advance day.
3. `Mow Lawns` path:
   - Enter planning,
   - select up to 3 jobs,
   - enter performance,
   - raise score with repeated `ArrowUp`,
   - resolve to report,
   - accept pending regular offer if present,
   - advance day.
4. `Shop for New Hardware` path:
   - transition to `hardware_shop`,
   - confirm buy path,
   - process back to report.

Quick probe summary fields (from `summarize-verify-states.js`):

- first/last: `day`, `mode`, `cash`, customer/lead counts
- `any_pending_offers`
- `modes_seen`
- `last_report_activity`
- debug log metrics: `debug_log_entries`, `debug_roll_logs_found`

## Current CI Coverage

Workflow: `/Users/zkendall/projects/MowGrassMoMoney/.github/workflows/tycoon-regression.yml`

Current CI steps:

1. Install deps
2. Install Playwright Chromium
3. Run `verify:syntax`
4. Run `test:rng`
5. Run `test:regression`
6. Upload regression summary
7. Upload Playwright regression report

Note: quick verify is not currently part of CI gating.

## Migration Target (High Level)

Migrate regression browser tests to Playwright Test (`playwright/test`) while preserving scenario coverage and assertions.
Keep RNG determinism and syntax checks equivalent (either ported or retained as scripts).

## Post-Migration Coverage Parity Checklist

Use this checklist before removing old runners.
Items left unchecked are pending CI execution or intentional negative-case validation.

### A) Scenario Presence Parity

- [x] `solicit_report` exists with same logical step intent and report assertion.
- [x] `follow_up_report` exists with same lead seeding and report assertion.
- [x] `mow_offer_accept` exists with planning -> performance -> report -> offer acceptance -> next-day assertion.
- [x] Seeded deterministic flow still uses `seed=2` for regression scenarios.

### B) Assertion Parity

- [x] Snapshot/assert payload for each scenario still includes the same fields currently enforced by golden checks.
- [x] Ordering normalization (ID-sorted lists) remains consistent where required.
- [x] Processing-mode transitions are explicitly awaited (no blind fixed sleeps only).

### C) Golden/Expected-Output Parity

- [x] Golden update path exists (equivalent to current `--update-golden` behavior).
- [ ] Non-update runs fail on mismatch against committed expectations.
- [x] Regression summary artifact is still produced in a stable path.

### D) Quick Verify Parity

- [x] Dedicated quick walkthrough still covers `Solicit -> Follow Up -> Mow -> Shop for New Hardware`.
- [x] Probe summary still reports `last_report_activity`, `modes_seen`, and debug log flags.
- [x] Quick output artifact naming remains timestamped and paired (`web-game` + `probe`).

### E) RNG + Syntax Parity

- [x] RNG determinism test still validates same-seed equality, different-seed inequality, and [0,1) bounds.
- [ ] Syntax validation step still runs in local and CI pipeline.

### F) CI Parity

- [ ] CI still gates on syntax + RNG + regression suite pass.
- [ ] CI artifact upload still includes regression summary output.

## Cutover Rule

Legacy wrapper-script cutover is complete; the active entrypoints are direct Playwright CLI/npm scripts only.
