# Tycoon POC System Design

## Runtime Architecture

```mermaid
flowchart LR
  U["Player Input\n(Keyboard: Up/Down/Left/Right, Enter, Space, R, F)"] --> K["src/keyboard.js\nMode-aware input routing"]
  K --> A["src/dayActions.js\nDay loop, economy, retention, offers"]
  K --> P["src/processing.js\nTimed transitions + spinner"]

  I["src/index.js\nApp orchestrator + deterministic hooks"] --> S["src/state.js\nGame state + test start presets"]
  I --> M["src/stateMachine.js\nAllowed mode transitions"]
  I --> R["Render Layer\nconsoleView + statusPanel + activeCustomersView"]
  I --> L["src/logging.js\nConsole + __tycoonLogs ring buffer"]

  A <--> J["src/jobs.js\nRNG, lead/job generation, scoring, payouts"]
  A --> M
  P --> M
  A --> S
  P --> S
  K --> S
  S --> R

  R --> DOM["Browser UI\n`#console`, `#game` canvas, `#active-customers`"]
  I --> H["Public Hooks\n`render_game_to_text()`\n`advanceTime(ms)`\n`setTycoonSeed(seed)`\n`__tycoonTestSetStartStateOverride(...)`"]
```

## Verification Pipeline

```mermaid
flowchart LR
  VQ["scripts/verify-tycoon-quick.sh"] --> VL["compute-verify-label.js"]
  VQ --> VR["verify-tycoon-headed-runner.js\n(Playwright walkthrough)"]
  VR --> APP["Tycoon app in browser\nindex.html to game.js to src/index.js"]
  APP --> TXT["render_game_to_text snapshots"]
  VR --> SS["Screenshots + state JSON\noutput/NN-{label}-web-game/"]
  VQ --> VS["summarize-verify-states.js"]
  VS --> PR["Probe summary\noutput/NN-{label}-probe.json"]
  VQ --> HIST[".verify-history.json\nverify baseline for next label"]
```

## Notes

- `src/index.js` is the composition root: initializes seeded state, attaches keyboard handlers, and drives rendering.
- Mode safety is centralized in `src/stateMachine.js`, while transition timing is mediated by `src/processing.js`.
- Economic outcomes and customer lifecycle behavior are concentrated in `src/dayActions.js` + `src/jobs.js`.
- Verification is deterministic by default because verify scripts append `?start_state=test_all_actions` unless overridden.
