# Simulation catalogue — adding new worlds

`src/app/simulations/simulation-catalog.ts` is the single source of truth for
world metadata, routing, the featured world and optional home previews.

To add a world:

1. Implement `src/app/features/<world>/<world>.ts` as a standalone Angular
   page; keep any domain, rendering and controllers inside that feature.
2. Add **one definition** to `SIMULATIONS`:
   - `id`, `number`, `name`, `description`, `path`, `tags`
   - `loadComponent: () => import('../features/<world>/<world>').then(...)`
   - optionally `featured: true` and a lazy `preview` component + title.
3. No modification to `app.routes.ts` or `features/home/home.ts/html` is
   necessary: the router and cards both read the registry, and the homepage
   displays the active count and featured link automatically.
4. Add feature tests and run `npm run typecheck`, `npm run lint`,
   `npm run format:check`, `npm run test:ci` and `npm run build`.

## Featured preview contract

Home loads only the featured world's preview **after** the home feature is
initialized. The preview must be a standalone Angular component, rendered
inside the homepage's generic preview link.

- The component handles its own visualization, simulation, visibility and
  lifecycle; the current ecosystem preview uses `WorldEngine`,
  `SimulationRunner` and `WorldRenderer`.
- Home owns the link, world numbering, metrics UI, and overlay typography.
  It does not import the engine or the Canvas renderer.
- A preview may optionally inject `PreviewMetricsStore` from
  `shared/simulation/preview-metrics.ts` to publish generic
  `{ label, value, tone }` rows; the store is **provided by Home**, not
  globally. Clear it when the preview is destroyed.
- If no preview is registered, Home still displays the title and a styled
  visual card with working navigation.
- The ecosystem preview preserves the original 30 fps draw throttle,
  fixed-step timing, viewport intersection observer and hidden-tab behavior.

The catalog rejects invalid/duplicate routes and IDs, and more than one
featured entry. Its loader functions are dynamic imports, so merely rendering
the home route does not statically import world engines.

Experiment replay and browser end-to-end tests are implemented in
`features/ecosystem/domain/experiment.ts` and `e2e/ecosystem.spec.ts`,
respectively. New worlds can adopt these patterns without coupling their
domain code to Home or the catalogue.

**Not in scope:** a runtime plugin marketplace, backend persistence or
reworking biological simulation rules.
