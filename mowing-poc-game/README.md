# Mowing POC Game

Simple single-scene top-down mowing prototype based on `POC-Mowing.md`.

## Run locally

From repo root:

```bash
cd mowing-poc-game
python3 -m http.server 4173
```

Open: `http://localhost:4173`

## Controls

- Left-click + drag: draw a mow route with the brush overlay
- In review mode: click `Accept` to run the route or `Retry` to redraw
- While route animation is running: hold `Space` to fast-forward mower playback
- Press `E` to refill fuel (charged at `$3.00/gal`) when using a fuel-powered mower
- `F`: fullscreen toggle
- `R`: reset
- `M`: music mute toggle

## Win condition

Reach 95% mow coverage at the end of an accepted route animation.

## Current Behavior Notes

- Progress persists across multiple accepted routes until reset.
- During animation, the route is shown as a smoothed black dashed centerline (brush overlay hidden).
- Crash penalties trigger when the route centerline overlaps an obstacle; each entry overlap applies `-$1` and a flip animation.
- Fuel is contingent on mower type:
  - Push mower: no fuel required.
  - Small mower: `0.5 gal` tank.
- Small mower fuel drains during route playback; when empty, route playback pauses until refilled, then continues from the same path position.
- Refilling costs `$3.00` per gallon needed and deducts from cash.
- Optional URL override: `?mower_type=push` or `?mower_type=small`.
