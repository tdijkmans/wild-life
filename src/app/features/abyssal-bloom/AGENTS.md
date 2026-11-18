# Abyssal Bloom — local coding guidance

Follow the root `AGENTS.md`, `docs/new-worlds.md` and the shared
`src/app/shared/world-experience/AGENTS.md` guidance.

- The domain is deterministic, fixed-step TypeScript. It must not import
  Angular, Canvas, DOM, audio APIs or other feature UIs.
- Growing organisms and local interactions belong to the model, never
  to a preanimated Canvas sequence. Bound populations, state variables,
  environmental fields and event queues.
- The renderer only observes real world geometry and state; use a
  separate seeded random instance for decorative details.
- Environmental tools are gentle and indirect, with measurable physical
  effects. Maintain meaningful autonomous behavior without any input.
- Model-origin audio cues are semantic, bounded and ID-ordered. Only the
  shared soundscape synthesizes sound after explicit user opt-in.
- Add deterministic tests for seeds, organism bounds, resource effects,
  interactions and invalid input; extend Chromium tests for page controls.
- Distinguish visual analogies from empirically validated biology.
