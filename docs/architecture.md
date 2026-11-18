# WILD LIFE feature architecture

The application is organized **by feature first**. Pages belong to their feature,
rather than keeping an independent `pages/` tree that other features import from.

```text
src/app/
  app.routes.ts
  features/
    home/
      home.ts / home.html / home.css
      simulation-catalog.ts
    ecosystem/
      ecosystem.ts / ecosystem.html / ecosystem.css
      README.md
      domain/
        engine.ts
        engine.spec.ts
        engine.regression.spec.ts
      rendering/
        renderer.ts
        charts.ts
      components/
        ecosystem-insights-panel/
        ecosystem-timeline-card/
  shared/
    design-system/
    simulation/
      simulation-runner.ts
      simulation-runner.spec.ts
```

## Dependency boundaries

1. **Domain** is TypeScript-only. It must never import Angular, the DOM, route components,
   rendering or any other feature. This makes its behavior directly testable.
2. **Rendering** may read the domain's state and use Canvas APIs, but never imports
   Angular route components or the feature's UI components.
3. **Feature UI** can import domain models and shared design components. It must not
   import from the `pages/` layer (which no longer exists).
4. **Feature page** composes its own UI and orchestrates its domain/rendering.
   It is loaded lazily from `app.routes.ts`.
5. **Shared** contains genuinely reusable primitives; it never depends on a feature.
6. **Home** currently consumes the ecosystem engine/renderer to show its live preview.
   That is a **known coupling** until the future simulation catalogue abstraction
   (roadmap step 8). Do not introduce a generic plugin interface prematurely.

The shared `shared/simulation/simulation-runner.ts` now owns frame scheduling,
fixed-step integration, pause, playback speed, visibility suspension, world swapping and
lifecycle cleanup. It uses only a `step(dt)` interface and has no Angular or DOM
dependency in its logic (the browser clock is injectable). The ecosystem engine remains
deterministic and unaware of the runner.

No `core/` or `application/` folder is introduced without an actual responsibility.
UI-level orchestration, chart refresh and pointer controls stay in feature components
pending later refactoring steps.

## Adding a world

- Create `features/<world>/` with its own domain, rendering and page.
- Put any reusable UI primitives under `shared/design-system/` only if multiple
  features need them.
- Register the lazy-loaded route in `app.routes.ts`.
- Add catalogue metadata under `features/home/simulation-catalog.ts`.
- Keep deterministic engine tests next to the engine.
- Run `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run test:ci` and `npm run build`.

This PR is a file-organization change; it is not a redesign of the domain model or
animation loop. All existing routes, component selectors and CSS are preserved.
