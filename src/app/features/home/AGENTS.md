# Home feature — local agent guidance

In addition to the repository-root `AGENTS.md`:

- The home route is **presentation-only**. Do not import
  `features/ecosystem/domain/`, `rendering/` or `preview/`, or any
  other world's engine/renderer, into Home.
- Read `src/app/simulations/simulation-catalog.ts` for world metadata,
  numbers, links and featured selection. Do not hard-code `/ecosystem`,
  the number of worlds or a specific world's copy in this feature.
- World previews are separate, **lazy-loaded feature components**.
  Home owns the generic preview surface; `PreviewMetricsStore` is scoped
  to the home component and cleared by the preview when destroyed.
- Preserve working navigation when a world has no preview or preview loading
  fails. Keep the existing dark responsive gallery and accessible links.
- For catalogue/preview changes, test the `/` and world routes plus the
  transition to the simulation in Playwright.
