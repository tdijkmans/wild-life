# Predator–Prey Evolution

The first experiment in WILD LIFE. Route: `/ecosystem`.

The simulation contains individual prey and predators with inherited genes, predation, energy costs, food, mutation, reproduction, and death. Time-series charts are derived from actual simulated populations.

Aquarium mode offers fullscreen Zen, Glance, and Discover views with individually toggleable information cards. Pointer and touch tools allow environmental interventions.

## Architecture

- `domain/engine.ts`: deterministic, Angular-independent ecological model
- `domain/experiment.ts`: recorded interventions, 60 Hz tick replay, JSON verification
- `rendering/renderer.ts`: Canvas 2D world visualization (reads from the engine)
- `rendering/charts.ts`: time-series and trait chart rendering
- `components/`: feature-owned timeline and insights UI
- `controllers/aquarium.controller.ts`: fullscreen, HUD presets, idle display controls and cleanup
- `controllers/world-pointer.controller.ts`: pointer/touch input, zoom and ecology tools
- `ecosystem.ts/html/css`: route-level Angular page composing the feature

The ecosystem's component styles remain in `ecosystem.css`; Angular's existing component-style budgets still apply.

## Simulation lifecycle

The shared `SimulationRunner` under `src/app/shared/simulation/` owns requestAnimationFrame,
fixed-time integration, pause, speed, visibility handling and cleanup.
The full route passes `ExperimentSession` to the runner to record user
interventions; the independent featured preview passes its own `WorldEngine`.
The route page retains chart refresh and orchestration, while pointer tools
and fullscreen behavior live in feature-local controllers.

See `docs/experiments.md` for replay compatibility and `AGENTS.md` plus
`domain/AGENTS.md` for change-specific coding guidance.
