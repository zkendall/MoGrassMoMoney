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
- Fuel depletion pauses animation in place; refilling resumes the same route progress.
- Session-only setup memory: pressing `R` returns to menu with previous selection preselected in the current tab.
