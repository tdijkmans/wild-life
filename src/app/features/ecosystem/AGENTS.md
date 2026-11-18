# Predator–Prey feature — local agent guidance

In addition to the repository-root `AGENTS.md`:

- `ecosystem.ts` is the **route orchestrator**: it connects
  `ExperimentSession`, `SimulationRunner`, renderer, controllers,
  signals and chart/insights components. Do not grow a second engine or
  animation loop inside the component.
- `controllers/aquarium.controller.ts` owns native fullscreen/CSS fallback,
  Zen/Glance/Discover presets, HUD timers, scroll locking and teardown.
  `controllers/world-pointer.controller.ts` owns touch, wheel, pinch,
  selection and user interventions. Keep their callback interfaces small.
- `rendering/renderer.ts` and `rendering/charts.ts` draw model state;
  their output must **not** feed back into simulation equations.
- `preview/ecosystem-preview.ts` owns its own world, renderer, observer
  cleanup and 30 fps visual throttle. Home only lazy-loads it and receives
  generic metrics.
- Preserve Aquarium keyboard shortcuts, focusable controls, mobile touch
  behavior, idle handling and fullscreen exit. Run Chromium tests for UI
  changes; add or refine a test when an interaction is fixed.
- Changes under `domain/` have additional nested guidance in
  `domain/AGENTS.md` and require deterministic replay tests.
- Refer to `docs/ecosystem-ui-architecture.md` and
  `docs/design-system.md` for current component ownership and styles.
