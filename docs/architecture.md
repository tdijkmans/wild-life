# WILD LIFE feature architecture

The application is organized **by feature first**. Pages belong to their feature,
rather than keeping an independent `pages/` tree that other features import from.

```text
src/app/
  app.routes.ts
  features/
    home/
      home.ts / home.html / home.css
      home preview surface / featured hero
  simulations/
    simulation-catalog.ts
    simulation-catalog.spec.ts
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
      controllers/
        aquarium.controller.ts
        world-pointer.controller.ts
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
4. **Feature-local controllers** handle fullscreen/HUD lifecycle and pointer gestures. They
   depend on callback interfaces, never on the route component or shared singletons.
5. **Feature page** composes its own UI and orchestrates its domain/rendering.
   It is loaded lazily from `app.routes.ts`.
6. **Shared** contains genuinely reusable primitives; it never depends on a feature.
7. **The simulation catalog** owns routes, cards, metadata, featured selection and
   lazy-loaded preview references. App routing and Home derive from this one registry.
8. **Home** is presentation-only: it never imports a particular simulation domain or
   Canvas renderer. A featured preview is loaded lazily into a generic preview surface.
9. **World previews** belong to their feature and communicate small display metrics
   through a scoped shared store (no global singleton).

The shared `shared/simulation/simulation-runner.ts` now owns frame scheduling,
fixed-step integration, pause, playback speed, visibility suspension, world swapping and
lifecycle cleanup. It uses only a `step(dt)` interface and has no Angular or DOM
dependency in its logic (the browser clock is injectable). The ecosystem engine remains
deterministic and unaware of the runner.

No `core/` or `application/` folder is introduced without an actual responsibility.
Chart refresh and page-level orchestration remain in the feature page. Aquarium/fullscreen
and pointer/touch behavior live in independently testable feature-local controllers.

## Adding a world

- Create `features/<world>/` with its own domain, rendering and page.
- Put any reusable UI primitives under `shared/design-system/` only if multiple
  features need them.
- Add **one** catalog registration in `simulations/simulation-catalog.ts` with
  metadata, path and a lazy-loaded component; no manual route editing is needed.
- Optionally supply a lazy preview component and mark the world `featured: true`.
  Home handles navigation, labels, counts and metric display generically.
- Keep deterministic engine tests next to the engine.
- Run `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run test:ci` and `npm run build`.

The catalog is an application composition boundary, not a plugin runtime or extension
marketplace. The existing ecosystem still owns its engine, renderer and preview code.
Domain behavior and fixed-step simulation timing are unchanged.
