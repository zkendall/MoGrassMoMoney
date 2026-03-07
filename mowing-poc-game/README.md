# Mowing POC Game

Top-down mowing prototype based on `POC-Mowing.md`, now with a required setup menu.

## Run locally

From repo root:

```bash
cd mowing-poc-game
python3 -m http.server 4173
```

Open: `http://localhost:4173`

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
  - `small`
  - `medium`
  - `large`

Each lawn is a distinct map with different lawn/house/driveway geometry and obstacle layout.
`small` is a circular island lawn inside a larger yard, with a pool and cement walk paths as non-mowable surfaces.

## Map Art Pipeline

All three lawn maps now support the same art-backed asset layout:

- `assets/maps/<map-id>/base.png`: current baked background art for the map.
- `assets/maps/<map-id>/mow-mask.png`: binary mowability mask used to seed the mow grid.
- `assets/maps/<map-id>/collision-mask.png`: generated collision mask reserved for a later phase.
- `assets/maps/<map-id>/guide.png`: geometry guide used to align art to gameplay truth.
- `assets/maps/<map-id>/base-imagegen-prompt.md`: prompt spec for replacing the temporary local base art with an `imagegen` run.

Current behavior:

- `small`, `medium`, and `large` render baked base art when their assets load.
- All three maps use `mow-mask.png` for mowable vs non-mowable cells.
- All three maps still use obstacle geometry for crash penalties in v1.
- If a map art asset fails to load, that map falls back to the existing geometric mowability/rendering path.

Regenerate the deterministic placeholder assets for all maps from the current gameplay geometry:

```bash
cd mowing-poc-game
python3 scripts/generate_map_assets.py
```

`scripts/generate_small_map_assets.py` remains as a compatibility wrapper if you only want to rebuild `small`.

The generated `base.png` files are currently local placeholders so the art-backed path is playable without API access. Once `OPENAI_API_KEY` is available, use each map's prompt spec with the `imagegen` skill to replace the placeholders with authored AI-generated backgrounds.

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
- Fuel depletion pauses animation in place; refilling resumes the same route progress.
- Session-only setup memory: pressing `R` returns to menu with previous selection preselected in the current tab.
