# Chromium end-to-end tests — local agent guidance

In addition to the repository-root `AGENTS.md`:

- These are real `@playwright/test` Chromium tests, run via
  `npm run test:e2e` with the dev server in `playwright.config.ts`.
- Prefer `getByRole()`, `getByLabel()` and meaningful accessible names.
  Use class/CSS selectors mainly for Canvas or when no accessible target
  exists. Never make tests pass by inserting arbitrary sleeps.
- Exercise behavior rather than checking implementation details: navigation,
  Aquarium fullscreen and exit, pause/speed, pointer interactions,
  download/import/replay, invalid inputs and the mobile viewport.
- Keep seeded scenarios small and deterministic where possible. Use
  Playwright downloads/uploads instead of browser mocks for data flows.
- Rely on Playwright auto-wait and assertions. On failure, inspect the
  trace/screenshots and fix the actual UI or an incorrect test assumption.
  Keep retries as configured; do not use force-click to hide blocking UI.
- When a new world or shared control is added, extend the smallest relevant
  browser scenario; add unit tests for domain logic separately.
