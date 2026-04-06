# Neighborhood Flyer POC Spec

## Goal

Create the first "in person" tycoon sibling mode as a small browser prototype.

The player walks a quiet suburban block, inspects houses, and drops flyers at eligible mailboxes. This is a free-roam canvassing slice, not yet a mow-selection or mow-handoff system.

## Current Scope

- One authored neighborhood block
- Top-down movement with `WASD` / arrow keys
- Nearby-house affordance
- House inspect panel
- One flyer delivery per house
- Deterministic debug hooks and Playwright coverage

## House Data

Each house exposes an explicit local data shape for later tycoon integration:

- `id`
- `name`
- `kindTags`
- `valueBand`
- `churnRisk`
- `mailbox` world position
- `footprint` geometry
- `flyerDelivered`

## Notes For Later

- The current tags already echo tycoon concepts: repeat customer, qualified lead, churn risk, and value band.
- A later version can reuse this map-selection feel for choosing service stops or canvassing routes before mowing.
- Shapes/polygons are intentional for v1; sprite work is deferred.
