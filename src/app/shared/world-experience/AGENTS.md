# Shared immersive experience — agent guidance

In addition to the repository root `AGENTS.md`:

- `world-protocol.ts` declares model-neutral interfaces. Do not import a
  particular world, Angular, or DOM into these pure type definitions.
- `WorldExperienceComponent` owns the shared user experience: Canvas
  lifecycle, fixed-step runner, view-only Aquarium, fullscreen/escape,
  gentle pointer tools, seed reset, pause/speed, metrics and history.
- The shared Aquarium controller and Display panel are also used by Predator-Prey
  Evolution. Worlds own their information cards and tool choices.
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

## Procedural sound

- `world-soundscape.ts` synthesizes original non-musical ambience and brief
  semantic event cues. It is **presentation-only** and must not alter models
  or consume their seeded random stream.
- No `AudioContext` creation, audio playback or audio download before
  deliberate user activation. Sound defaults off and is never persisted
  or enabled through autoplay.
- Honor explicit mute, simulation pause, tab visibility and component teardown.
  Close contexts and disconnect nodes when leaving a world.
- Keep playback levels low, cap event queues, de-duplicate events by ID and
  rate-limit audible accents. Test muted startup and opt-in in Chromium.
