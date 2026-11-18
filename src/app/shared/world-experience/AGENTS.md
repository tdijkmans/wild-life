# Shared immersive experience — agent guidance

In addition to the repository root `AGENTS.md`:

- `world-protocol.ts` declares model-neutral interfaces. Do not import a
  particular world, Angular, or DOM into these pure type definitions.
- `WorldExperienceComponent` owns the shared user experience: Canvas
  lifecycle, fixed-step runner, view-only Aquarium, fullscreen/escape,
  gentle pointer tools, seed reset, pause/speed, metrics and history.
- The component consumes a feature-provided `WorldExperienceDefinition`.
  It must never import a specific world engine or renderer.
- Each feature remains responsible for its own model, renderer, mechanisms,
  species and intervention semantics. Rendering never modifies model state.
- Preserve accessibility, keyboard shortcuts, touch input, responsive
  layout, reduced-motion styling, cleanup of global listeners/observers,
  and safe native-fullscreen fallback.
- Keep history updates based on the latest sample identity, not only array
  length: histories truncate to a fixed maximum and must continue updating.
- Run targeted seeded model tests and Chromium navigation/Aquarium tests
  after changing this shared experience.
