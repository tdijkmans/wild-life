# Biological simulation regression contract

The deterministic WILD `WorldEngine` is tested using seeded, intentionally
small scenarios and longer randomized-but-reproducible runs.

## What is protected

- **Determinism:** identical seeds, time steps and intervention schedules yield
  identical organisms, food, history, events and aggregate statistics.
- **Predation / foraging:** hunters consume grazers exactly once; grazers gain
  energy from nearby food and consumed food is removed.
- **Life cycle:** age-based mortality, birth counters, minimum reproductive
  age, cooldown, offspring generation and independent inherited genes.
- **Genetics:** every inherited trait remains within its documented range.
- **Conservation:** `initial population + births - deaths = survivors`,
  including deaths from predation.
- **Capacity:** ceilings of 720 prey, 120 predators and 780 food units.
- **Input safety:** invalid time steps or intervention coordinates cannot
  corrupt world state; extreme constructor counts are bounded.
- **Observability:** history, events, effect records and statistics remain
  finite and bounded throughout long runs.

Tests use multiple fixed seeds for coverage while avoiding snapshots that lock
in incidental implementation details. The suite checks domain invariants, not
that particular seeds produce a predetermined population curve.

## Run locally

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test:ci
```

These tests verify software behavior, **not** biological realism. Biological
calibration, sensitivity analysis, ecological plausibility, and comparison
against reference systems will require separate experiments.
