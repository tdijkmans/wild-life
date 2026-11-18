# Reef — feature-local coding rules

Read the root `AGENTS.md`, `docs/new-worlds.md` and
`src/app/shared/world-experience/AGENTS.md`.

- Simulate actual ecological or phase-coupled mechanisms in deterministic
  TypeScript only. The domain must not use Angular, Canvas, browser audio
  APIs, wall-clock time or ambient randomness.
- Keep evolving agents, resource fields, population changes and event
  emissions bounded and finite. Never trade a real interaction for a
  pre-scripted Canvas animation.
- Render the current domain state in a one-way Canvas renderer. Decorative
  seeded randomness must remain independent of the biological PRNG.
- Environmental tools change physical or ecological conditions, not
  individual life forms directly. Every world must have autonomy without
  user input and meaningfully different behavior from existing worlds.
- Emit bounded, monotonic semantic audio cues from actual model events.
  Let the shared opt-in soundscape synthesize audio; no autoplay or
  domain-to-audio coupling.
- Test seeded replay, emerging mechanisms, external-input validation,
  invariants and reproduction/competition under representative conditions.
  Extend Chromium route, Aquarium, mobile and sound tests.
- Identify scientific simplifications and avoid claiming empirical
  validation without evidence.
