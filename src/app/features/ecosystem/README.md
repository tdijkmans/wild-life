# Predator–Prey Evolution

The first experiment in WILD LIFE. Route: `/ecosystem`.

The simulation contains individual prey and predators with inherited genes, predation, energy costs, food, mutation, reproduction, and death. Time-series charts are derived from actual simulated populations.

Aquarium mode offers fullscreen Zen, Glance, and Discover views with individually toggleable information cards. Pointer and touch tools allow environmental interventions.

## Architecture

- `domain/engine.ts`: deterministic, Angular-independent agent-based ecological model
- `rendering/renderer.ts`: Canvas 2D world visualization (reads from the engine)
- `rendering/charts.ts`: time-series and trait chart rendering
- `components/`: feature-owned timeline and insights UI
- `controllers/aquarium.controller.ts`: fullscreen, HUD presets, idle display controls and cleanup
- `controllers/world-pointer.controller.ts`: pointer/touch input, zoom and ecology tools
- `ecosystem.ts/html/css`: route-level Angular page composing the feature

The ecosystem's component styles remain in `ecosystem.css`; Angular's existing component-style budgets still apply.

## Simulation lifecycle

The shared `SimulationRunner` under `src/app/shared/simulation/` owns requestAnimationFrame,
fixed-time integration, pause, speed, visibility handling and cleanup. The route page retains
chart refresh and page orchestration. Pointer controls and fullscreen behavior live in feature-local controllers; the page does not advance the engine itself.
Both the landing-page preview and the full world now use the same runner.
