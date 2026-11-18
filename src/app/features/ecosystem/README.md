# Predator–Prey Evolution

The first experiment in WILD LIFE. Route: `/ecosystem`.

The simulation contains individual prey and predators with inherited genes, predation, energy costs, food, mutation, reproduction, and death. Time-series charts are derived from actual simulated populations.

Aquarium mode offers fullscreen Zen, Glance, and Discover views with individually toggleable information cards. Pointer and touch tools allow environmental interventions.

## Architecture

- `domain/engine.ts`: deterministic, Angular-independent agent-based ecological model
- `rendering/renderer.ts`: Canvas 2D world visualization (reads from the engine)
- `rendering/charts.ts`: time-series and trait chart rendering
- `components/`: feature-owned timeline and insights UI
- `ecosystem.ts/html/css`: route-level Angular page composing the feature

The ecosystem's component styles remain in `ecosystem.css`; Angular's existing component-style budgets still apply.
