#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL="${1:-http://127.0.0.1:4174}"
OUT_DIR="$ROOT_DIR/output/verify-tycoon"

WEB_GAME_CLIENT="${WEB_GAME_CLIENT:-$HOME/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js}"

mkdir -p "$OUT_DIR"

echo "[verify-tycoon] URL: $URL"
echo "[verify-tycoon] Output: $OUT_DIR"

# 1) Syntax check
node --check "$ROOT_DIR/game.js"

# 2) Run the standard action-loop client and capture screenshots/state
node "$WEB_GAME_CLIENT" \
  --url "$URL" \
  --iterations 2 \
  --screenshot-dir "$OUT_DIR/web-game" \
  --actions-json '{"steps":[{"buttons":["enter"],"frames":4},{"buttons":["enter"],"frames":4},{"buttons":["down","enter"],"frames":4},{"buttons":["enter"],"frames":4}]}'

# 3) Summarize captured state snapshots
node -e "const fs = require('fs'); const path = require('path'); const dir = process.argv[1]; const files = fs.readdirSync(dir).filter(f => /^state-\\d+\\.json$/.test(f)).sort(); if (!files.length) { console.error('No state files found'); process.exit(1); } const states = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); const first = states[0]; const last = states[states.length - 1]; const summary = { iterations: states.length, first: { day: first.day, mode: first.mode, cash: first.cash, repeat_customers: (first.repeat_customers || []).length, leads: (first.leads || []).length }, last: { day: last.day, mode: last.mode, cash: last.cash, repeat_customers: (last.repeat_customers || []).length, leads: (last.leads || []).length }, any_pending_offers: states.some(s => (s.pending_regular_offers || []).length > 0), modes_seen: [...new Set(states.map(s => s.mode))] }; fs.writeFileSync(process.argv[2], JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary, null, 2));" "$OUT_DIR/web-game" "$OUT_DIR/probe.json"

echo "[verify-tycoon] Done."
echo "[verify-tycoon] Artifacts:"
echo "  - $OUT_DIR/web-game"
echo "  - $OUT_DIR/probe.json"
