#!/usr/bin/env bash
set -euo pipefail

# Compatibility wrapper while callers migrate to the JS entrypoint.
# Primary runner: scripts/verify-tycoon-quick.js

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT_DIR/scripts/verify-tycoon-quick.js" "$@"
