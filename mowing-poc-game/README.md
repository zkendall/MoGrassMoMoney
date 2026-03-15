# Mowing POC Game

Top-down mowing prototype based on `POC-Mowing.md`, now with a required setup menu.

## Run locally

From repo root:

```bash
cd mowing-poc-game
npm run dev
```

Open: `http://localhost:4173`

The dev server sends `Cache-Control: no-store` and related no-cache headers so normal reloads fetch fresh JS, CSS, and asset files without relying on the DevTools "Disable cache" toggle.

## Code Structure

- `game.js`: thin browser loader that imports `src/index.js`.
- `src/index.js`: composition root for canvas boot, frame stepping, input wiring, render loop, and browser debug hooks.
- Domain modules:
  - `src/constants.js`, `src/state.js`, `src/assets.js`
  - `src/lawn.js`, `src/mowGrid.js`, `src/pathing.js`
  - `src/playback.js`, `src/economy.js`, `src/menu.js`, `src/audio.js`
- Render modules:
  - `src/render/scene.js`
  - `src/render/mower.js`
  - `src/render/overlays.js`
  - `src/render/ui.js`
- Input/debug modules:
  - `src/input/pointer.js`
  - `src/input/keyboard.js`
  - `src/debug.js`

The refactor keeps one shared runtime state object in `src/state.js`. Domain modules mutate only their relevant slices, while render modules stay read-only and `window.render_game_to_text()` / `window.advanceTime(ms)` remain available from `src/index.js`.

## Flow

- Open setup menu (`mode=menu`)
- Choose a mower and lawn map
- Start job (`mode=start`)
- Draw route -> review (`Accept`/`Retry`) -> animate route
- Continue route attempts until reset (`R` returns to setup menu)

## Setup Menu Options

- Mowers:
  - `manual`: slowest, zero fuel use
  - `small_gas`: medium speed, `0.5 gal` tank
  - `large_rider`: fastest, widest deck, `1.5 gal` tank
- Lawn maps:
  - `empty_field`
  - `small`
  - `medium`
  - `large`

Each lawn is a distinct map with different lawn/house/driveway geometry and obstacle layout.
`empty_field` is a flat sandbox map with no props or non-mowable scene features, intended for grass-design and mechanics experiments.
`small` is a circular island lawn inside a larger yard, with a pool and cement walk paths as non-mowable surfaces.

## Map Art Pipeline

All four lawn maps now support the same art-backed asset layout:

- `assets/maps/<map-id>/base.png`: current baked background art for the map.
- `assets/maps/<map-id>/mow-mask.png`: binary mowability mask used to seed the mow grid.
- `assets/maps/<map-id>/collision-mask.png`: generated collision mask reserved for a later phase.
- `assets/maps/<map-id>/base-imagegen-prompt.md`: prompt spec for generating or revising the base art with the `imagegen` skill.

Current behavior:

- `empty_field`, `small`, `medium`, and `large` render baked base art when their assets load.
- All four maps use `mow-mask.png` for mowable vs non-mowable cells.
- Maps still use obstacle geometry for crash penalties in v1; `empty_field` simply has no obstacles.
- If a map art asset fails to load, that map falls back to the existing geometric mowability/rendering path.

Authoring note:

- Use the `imagegen` skill to generate or revise `assets/maps/<map-id>/base.png`.
- Keep `mow-mask.png` and `collision-mask.png` aligned with gameplay truth; they are authoritative runtime assets, not inferred from `base.png`.
- When map art changes materially, update the prompt spec in `assets/maps/<map-id>/base-imagegen-prompt.md` to match.

## Grass Asset Pipeline

Grass now uses one authored autotile sheet:

- `assets/grass-autotile-sheet.png`: a single pixel-art sheet with `2` rows x `8` columns.
- Row `0` is `unmowed`; row `1` is `mowed`.
- Columns are selected by a 3-bit mask:
  - bit `1`: south neighbor is lower
  - bit `2`: east neighbor is lower
  - bit `4`: southeast neighbor is lower

Runtime notes:

- Lawn cells now use a `16px` gameplay/render grid.
- Each frame is `16x20`; the extra height is the visible skirt/side wall.
- Grass is rendered in reverse row/column order so northern tiles can overlap southern/eastern neighbors cleanly.

Grass authoring note:

- Use the `imagegen` skill to generate `assets/grass-autotile-sheet.png`.
- Source generations can be kept in `output/imagegen/`, but the runtime only depends on the final file under `assets/`.

## Controls

- Setup menu:
  - Mouse: click mower/lawn options and `Start Job`
  - Keyboard: `Up/Down` section, `Left/Right` cycle option, `Enter`/`Space` activate
- Gameplay:
  - Left-click + drag: draw route with brush overlay
  - Review mode: click `Accept` or `Retry`
  - Animation: hold `Space` to fast-forward
  - `E`: refill fuel (`$3.00/gal`) for fuel-powered mowers
  - `F`: fullscreen toggle
  - `R`: return to setup menu (session selections preserved)
  - `M`: music mute toggle

## Win Condition

Reach 95% mow coverage at the end of an accepted route animation.

## Current Behavior Notes

- During animation, the route is shown as a smoothed black dashed centerline (brush hidden).
- Crash penalties trigger only when the route centerline overlaps static obstacles; each entry applies `-$1` and a flip animation.
- Small-map pool and walk-path yard zones are non-mowable but do not apply crash penalties.
- All lawn mowing cells are sourced from `assets/maps/<map-id>/mow-mask.png`; collisions still come from obstacle geometry.
- Mowed vs unmowed grass now resolves through a sprite-sheet autotile lookup based on south/east/southeast neighbor height.
- Fuel depletion pauses animation in place; refilling resumes the same route progress.
- Session-only setup memory: pressing `R` returns to menu with previous selection preselected in the current tab.
