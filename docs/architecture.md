# WILD LIFE feature architecture

WILD LIFE is an Angular 22 client-side SPA. Organize code **by feature**;
keep simulation domains framework-independent. This document is the expanded
architecture reference for the succinct [agent instructions](../AGENTS.md).

```text
src/app/
  app.routes.ts
  simulations/
    simulation-catalog.ts
    simulation-catalog.spec.ts
  features/
    home/
      home.ts / home.html / home.css
    murmuration/
      murmuration.ts
      domain/murmuration-world.ts
      rendering/murmuration-renderer.ts
    defensive-herd/
      defensive-herd.ts
      domain/defensive-herd-world.ts
      rendering/defensive-herd-renderer.ts
    canopy/
      canopy.ts
      domain/canopy-world.ts
      rendering/canopy-renderer.ts
    abyssal-bloom/
      abyssal-bloom.ts
      domain/abyssal-bloom-world.ts
      rendering/abyssal-bloom-renderer.ts
    ecosystem/
      ecosystem.ts / ecosystem.html / ecosystem.css
      README.md
      domain/
        engine.ts
        experiment.ts
        engine.regression.spec.ts
        experiment.spec.ts
      rendering/
        renderer.ts
        charts.ts
      controllers/
        aquarium.controller.ts
        world-pointer.controller.ts
      components/
        ecosystem-insights-panel/
        ecosystem-timeline-card/
      preview/
        ecosystem-preview.ts / ecosystem-preview.css
  shared/
    design-system/
      button/
      eyebrow/
      live-indicator/
    simulation/
      simulation-runner.ts
      frame-throttle.ts
      preview-metrics.ts
      seeded-random.ts
      spatial-grid.ts
    world-experience/
      world-protocol.ts
      world-experience.ts / world-experience.html / world-experience.css
      world-soundscape.ts
e2e/
  ecosystem.spec.ts
```

Scoped `AGENTS.md` files live alongside the components they govern.

## Dependency boundaries

1. **Domain** (`features/<world>/domain/`) is TypeScript-only. It must not
   import Angular, DOM, Canvas, rendering, routing or UI components.
2. **Rendering** reads domain state and uses Canvas APIs; it does not own
   biological updates, simulation steps or route-level UI state.
3. **Feature-local controllers** handle input and lifecycle operations;
   they depend on small callback interfaces, not on a route component.
4. **Feature page** composes `ExperimentSession`, `SimulationRunner`,
   renderer, charts, controllers and display signals. Angular routes are
   lazy-loaded.
5. **Shared** contains reusable scheduling, world-experience presentation
   and UI primitives, never imports feature engines or components.
   The shared world experience accepts a typed world/renderer adapter;
   each world's domain owns its own behavior.
6. **Simulation catalogue** owns world metadata, lazy route loaders and
   featured preview definitions. Both `app.routes.ts` and Home derive from
   `SIMULATIONS`.
7. **Home** is presentation-only: it does not import a world domain/renderer.
   It loads the featured preview by dynamic import, and a home-provided
   `PreviewMetricsStore` receives generic metrics.
8. **World preview** belongs to its feature and manages its own Canvas,
   runner, observers and lifecycle.

No generic `core/`, `application/`, global store, dependency-injection
container or plugin runtime is introduced without an actual need.

## Time and replay architecture

`SimulationRunner` owns `requestAnimationFrame`, fixed-step
integration, pause, speed, inactive-tab handling, backlog bounds and
teardown. The full ecosystem route passes `ExperimentSession` to this
runner; `ExperimentSession` wraps `WorldEngine` and records user
interventions at fixed 1/60-second ticks. Replay verifies stored state
before it replaces the active experiment.

The feature-owned homepage preview uses the same runner with its own
world. `FrameThrottle` limits **drawing** to 30 fps; the domain's fixed
timestep remains independent of display refresh.

Murmuration, Defensive Herd, Canopy and Abyssal Bloom each use their own
deterministic engine and Canvas renderer. They use `shared/world-experience/`
to provide consistent Aquarium, gentle pointer tools, keyboard shortcuts,
pause, speed, seed reset, statistics and history. A separate, opt-in
`WorldSoundscape` produces low-volume ambient and event sounds without
changing simulation state. These worlds do **not** yet implement
the versioned JSON experiment replay protocol of Predator–Prey Evolution;
their seeds and unit tests make their model runs reproducible.

See `docs/new-worlds.md` for model assumptions and validation boundaries.

See `docs/experiments.md`, `docs/performance.md` and
`docs/biological-regression-tests.md` for invariants and limits.

## Adding a world

- Create `features/<world>/` with standalone page and feature-owned
  domain/rendering code as necessary.
- Register **one** definition in `simulations/simulation-catalog.ts`
  with unique ID/path and lazy `loadComponent`.
- Optionally add a feature-owned lazy preview and mark a single world
  `featured: true`; Home handles navigation and card metadata.
- Add deterministic tests, browser coverage and documentation where
  applicable. Follow the nearest `AGENTS.md`.
- Run the quality gates in `docs/quality-gates.md`.

The catalogue is an application composition boundary, not a runtime
marketplace. The main branch uses a static Netlify-hosted SPA; keep
`dist/wild-life/browser` and the deep-link rewrite in `netlify.toml`
unless deployment architecture explicitly changes.
