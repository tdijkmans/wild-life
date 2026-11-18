# Defensive Herd — feature guidance

Apply the root `AGENTS.md` and `docs/new-worlds.md` to this feature.

- The domain must remain pure deterministic TypeScript: no DOM, Canvas,
  Angular, frame-time dependence or ambient randomness.
- The model reads only its state, fixed simulation time and explicit
  environmental interventions. Seeded random streams must be distinct
  from renderer-only decorative randomness.
- Keep agent positions/velocities finite and bounded. Preserve population
  caps, intervention limits, and life-cycle checks.
- Implement gentle environmental tools, not direct commands or scripted
  movement. The important visual patterns must emerge from agent rules.
- The renderer is one-way: it reads model state and draws; it never changes
  the model or computes behavior.
- Use the shared WorldExperience UI for fullscreen Aquarium, keyboard/touch
  controls, seed reset, pause, speed and laboratory observations.
- Update deterministic tests, the catalogue and Chromium E2E when changing
  observable behavior. These models are biology-inspired, not empirically
  validated.
