# MoGrassMoMoney — Proof of Concept (Mowing Minigame Only)

## Goal
Build a playable proof of concept focused on one top-down mowing minigame.

This POC should prove:
- Mowing feels satisfying moment-to-moment.
- Mowed vs unmowed state is immediately readable.
- Distinct lawn layouts and mower loadouts change route-planning decisions.

## Scope (In)
- Required setup menu before gameplay.
- Three mower types: `manual`, `small_gas`, `large_rider`.
- Three distinct lawn maps: `small`, `medium`, `large`.
- Route drawing + review (`Accept` / `Retry`) + playback loop.
- Basic collision with static obstacles.
- Lawn state change from unmowed to mowed.
- Simple win condition based on mowing coverage.

## Scope (Out)
- Business management systems.
- Meta progression, upgrades, customers.
- NPC pedestrians/crew.
- Complex weather/day-night systems.

## Core Gameplay
Player selects mower + lawn in a setup menu, then plans a mowing route by drawing it, reviews that route, then watches the mower execute it.

### Controls (POC)
- Menu:
  - Mouse: click mower/lawn options and `Start Job`.
  - Keyboard: `Up/Down` section, `Left/Right` cycle options, `Enter`/`Space` activate.
- Gameplay:
  - Left-click + drag: draw a route with circular brush overlay.
  - Release: enter review mode.
  - Review: click `Accept` to execute or `Retry` to redraw.
  - During animation: hold `Space` to fast-forward.
  - `E`: refill fuel for fuel-powered mowers.
  - `F`: fullscreen, `R`: return to setup menu, `M`: music toggle.

### Mowing Rules
- Grass starts in `unmowed` state.
- Grass under mower deck changes to `mowed`.
- Mowed grass stays mowed (no regrowth in-session).
- Coverage persists across route attempts until reset/menu return.
- Level completes when a route animation finishes and coverage is at least target threshold (95%).
- During playback, only centerline is shown (black dashed); brush swath is hidden.

### Mower Rules
- `manual`: no fuel usage.
- `small_gas`: `0.5 gal` tank.
- `large_rider`: `1.5 gal` tank, faster, wider deck.
- Fuel drains during route animation for gas mowers.
- When fuel reaches zero, route execution pauses in place.
- Refilling (`E`) costs `$3.00` per gallon and resumes the same path position.

### Failure/Constraint Rules
- Crash checks use route centerline overlap, not mower body width.
- On each new obstacle entry overlap during playback: mower flips, `-$1` popup appears, and animation continues.
- Route playback is clamped to lawn bounds; leaving bounds does not apply boundary crash penalty.

## Lawn Maps
Provide three distinct maps with unique geometry and obstacle arrangements:
- `small`: circular lawn island inside a larger yard, with pool + cement walk paths marked as non-mowable zones.
- `medium`: baseline suburban lot.
- `large`: wider estate-style layout with more obstacle routing variance.

Each map contains:
- Lawn bounds (mowable region)
- House block (non-mowable)
- Driveway block (non-mowable)
- Optional non-mowable yard features (for example pool/walk paths)
- 4-6 static obstacles

Non-mowable yard features are not crash obstacles; only static obstacles apply crash penalties.

## Technical Prototype Notes
- Coverage tracked by mow grid cells.
- Deterministic hooks exposed:
  - `window.render_game_to_text()`
  - `window.advanceTime(ms)`
- `render_game_to_text` includes setup/menu metadata, map geometry, mower stats, economy, playback, and collision debug fields.

## Success Criteria
POC is successful when:
- Menu gating works (`menu -> start -> drawing/review/animating`).
- All mower + lawn combinations are playable.
- Lawn visuals clearly transition unmowed -> mowed.
- Coverage and crash penalties behave consistently across maps.
- Fuel pause/refill/resume behavior works for gas mowers.
