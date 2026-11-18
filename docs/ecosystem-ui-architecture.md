# Ecosystem UI boundaries (roadmap step 6)

The ecosystem feature separates three concerns without introducing a global store:

- `ecosystem.ts`: route-level composition, Simulation Runner, statistics,
  history, chart coordination, keyboard shortcuts and navigation.
- `controllers/aquarium.controller.ts`: Aquarium/Zen state, card presets,
  temporary HUD controls, native fullscreen with CSS fallback, body overflow,
  fullscreen event lifecycle and disposal.
- `controllers/world-pointer.controller.ts`: pointer/touch gestures, pinch
  zoom, continuous food/climate painting, inspection and tool selection
  dispatch into the WorldEngine.
- `components/`: visual timeline and insights cards (unchanged).
- `domain/`: deterministic biological rules (unchanged).
- `rendering/`: Canvas draw code (unchanged).

Controllers are **feature-scoped class instances**, not application singletons:
each page owns and disposes its controllers. The page provides a small set of
callbacks so controllers can update UI signals without importing the page.
The existing HTML/CSS and public event handlers remain stable.

## Boundary and regression tests

The Aquarium controller tests cover presets, settings idle timeouts,
interaction gating, fullscreen fallback, exiting/restoring scroll state and
cleanup. The pointer controller tests cover food, climate, current,
inspection, pause, zoom and reset behavior with seeded worlds.

Run `npm run typecheck`, `npm run lint`, `npm run format:check`,
`npm run test:ci` and `npm run build`.

The focus is maintainability. This change does not modify the biological
model or promise a performance improvement.
