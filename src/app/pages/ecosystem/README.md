# Predator–Prey Evolution

The first experiment in WILD LIFE. Route: `/ecosystem`.

The simulation contains individual prey and predators with inherited genes, predation, energy costs, food, mutation, reproduction, and death. Time-series charts are derived from actual simulated populations.

Aquarium mode offers fullscreen Zen, Glance, and Discover views with individually toggleable information cards. Pointer and touch tools allow environmental interventions.

## Architecture

- `sim/engine.ts`: deterministic agent-based ecological world
- `sim/renderer.ts`: Canvas 2D visualization
- `sim/charts.ts`: live population history and trait charts
- `ecosystem.ts/html/css`: standalone Angular page

Larger simulation styles live in `src/styles.css` to avoid the Angular per-component stylesheet budget.
