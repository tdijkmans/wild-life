# Shared simulation scheduling — local agent guidance

In addition to the repository-root `AGENTS.md`:

- Keep `SimulationRunner`, `FrameThrottle` and their testable scheduling
  logic **independent of Angular and any particular world**.
- The runner advances objects implementing `step(dtSeconds)` in fixed
  integration steps. Wall-clock frame deltas, playback speed and rendering
  callbacks are separate concerns.
- Preserve max-frame clamping, bounded accumulator, max steps/frame,
  pause/resume, inactive-tab suspension, world replacement and complete
  cancellation on stop. Never accumulate hidden-tab time as a catch-up burst.
- Continue using injectable `AnimationClock` and deterministic fake-clock
  tests, not real timers for runner unit tests.
- `FrameThrottle` controls only **visual frames**. Never change model tick
  frequency to gain rendering performance. Preview metrics are a neutral
  interface; avoid imports from `features/`.
- Re-run `simulation-runner.spec.ts`, `frame-throttle.spec.ts` and
  relevant browser tests whenever scheduling or visibility changes.
