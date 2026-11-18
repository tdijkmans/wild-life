# Deterministic biological domain — local agent guidance

In addition to the root and parent `AGENTS.md`:

- Keep `engine.ts`, `experiment.ts` and their tests framework-free.
  No Angular, browser APIs, Canvas, asynchronous rendering or cross-feature
  imports in these domain modules.
- `WorldEngine`'s seeded random-number sequence, update order, life-cycle
  equations and intervention handling influence every future result. Avoid
  extra PRNG calls, ambient randomness or ordering changes without an
  explicit model change and regression evidence.
- Preserve caps (720 prey, 120 predators, 780 food), finite coordinates,
  positive time steps, documented gene bounds, and births/deaths/kill
  accounting. Test invariants across multiple fixed seeds.
- `ExperimentSession` is the reproducibility boundary: exactly 60 fixed
  ticks/second, seed + initial populations, chronological same-tick
  intervention order, and verified full-state replay.
- File imports are **untrusted**. Keep format/model/version checks, numeric
  and size limits, input validation, checksum and statistics verification.
  A failed import must not replace the active world.
- If a biological change invalidates stored experiments, version the model
  and document migration/incompatibility; never suppress a checksum mismatch.
- Extend `engine.regression.spec.ts` and `experiment.spec.ts` for
  behavioral changes. Do not fake a scientific validation claim: determinism
  and ecological plausibility are different things.
- See `docs/biological-regression-tests.md` and `docs/experiments.md`.
