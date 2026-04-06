# Neighborhood Flyer POC

First in-person tycoon prototype for `MoGrassMoMoney`.

This sibling app focuses on on-foot canvassing only: walk a small authored neighborhood, inspect nearby houses, and deliver flyers to their mailboxes once.

## Run locally

From repo root:

```bash
cd neighborhood-poc-game
npm run dev
```

Open: `http://127.0.0.1:4175`

## Controls

- `WASD` / arrow keys: move
- `Space` / `Enter`: inspect nearby house, then deliver flyer
- `Escape`: close house panel
- `R`: reset run
- `F`: fullscreen toggle

## Code Structure

- `game.js`: thin browser loader that imports `src/index.js`
- `src/index.js`: composition root for state, update loop, rendering, and browser hooks
- `src/state.js`: shared mutable runtime state
- `src/neighborhood.js`: authored roads, lots, and house metadata
- `src/movement.js`: player movement, bounds, facing, and nearby-house detection
- `src/keyboard.js`: key state and mode-aware interactions
- `src/render.js`: canvas scene, affordances, HUD, and inspect panel

## Deterministic Hooks

- `window.render_game_to_text()` returns concise JSON state for tests/debugging
- `window.advanceTime(ms)` advances deterministic fixed-step frames

## Testing

Install dependencies once:

- `npm --prefix neighborhood-poc-game install`
- `npx --prefix neighborhood-poc-game playwright install chromium`

Run the main suites:

- `npm --prefix neighborhood-poc-game run test:quick`
- `npm --prefix neighborhood-poc-game run test:visual`
- `npm --prefix neighborhood-poc-game run test:all`

The Playwright tests rely on the fixed authored neighborhood and the deterministic browser hooks rather than randomized setup.
