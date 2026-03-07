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
- `assets/maps/<map-id>/base-imagegen-prompt.md`: prompt spec for generating or revising the base art with the `imagegen` skill.

Current behavior:

- `small`, `medium`, and `large` render baked base art when their assets load.
- All three maps use `mow-mask.png` for mowable vs non-mowable cells.
- All three maps still use obstacle geometry for crash penalties in v1.
- If a map art asset fails to load, that map falls back to the existing geometric mowability/rendering path.

Authoring note:

- Use the `imagegen` skill to generate or revise `assets/maps/<map-id>/base.png`.
- Keep `mow-mask.png` and `collision-mask.png` aligned with gameplay truth; they are authoritative runtime assets, not inferred from `base.png`.
- When map art changes materially, update the prompt spec in `assets/maps/<map-id>/base-imagegen-prompt.md` to match.

## Grass Asset Pipeline

Mowed-striping now uses three authored grass tiles:

- `assets/grass-unmowed.png`: taller random-blade grass texture before a pass, with no baked stripe pattern.
- `assets/grass-mowed-light.png`: lighter post-cut random-blade tile used for one lay-direction extreme.
- `assets/grass-mowed-dark.png`: darker post-cut random-blade tile used for the opposite lay-direction extreme.

The mower now stores a per-cell lay value and blends it toward the current mower heading each time the deck passes over that cell. Upward travel pushes the grass lighter, downward travel pushes it darker, and repeated curved or overlapping passes move the tone gradually instead of flipping between two binary states.

Grass authoring note:

- Use the `imagegen` skill to generate `assets/grass-unmowed.png`, `assets/grass-mowed-light.png`, and `assets/grass-mowed-dark.png`.
- Source generations can be kept in `output/imagegen/`, but the runtime only depends on the final files under `assets/`.

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
- Mowed cells now store a continuous lay value and crossfade between `grass-mowed-light.png` and `grass-mowed-dark.png`, so overlapping or curved passes shift tone gradually.
- Fuel depletion pauses animation in place; refilling resumes the same route progress.
- Session-only setup memory: pressing `R` returns to menu with previous selection preselected in the current tab.
