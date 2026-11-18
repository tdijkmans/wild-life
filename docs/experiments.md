# Reproducible WILD LIFE experiments (v1)

The Predator–Prey Evolution world supports deterministic experiment exports.
The format is `wild-life-experiment` version **1**, model
`predator-prey-v1`. It stores:

- Integer seed (0–4,294,967,295) and initial populations (0–720 prey; 0–120 predators).
- A fixed **1/60-second simulation tick** and total tick count.
- A chronological list of Bloom, Current, Heat and Cold interventions, including
  their original parameters and the next simulation tick at which they occurred.
- Final ecological statistics and an FNV-1a checksum over the biological state.

The checksum includes organism genetics, food, environmental patches, flashes,
history, event records and mortality counts. Inspection, zoom and display
settings deliberately do not affect the ecological checksum.

## User workflow

1. Open `/ecosystem` and enter a seed and initial prey/predator counts, then
   choose **Start seed**. Use the existing tool controls to modify the world.
2. Choose **Save run** to download a JSON experiment file with all inputs and
   verification data.
3. Choose **Load run** to import an experiment file. WILD LIFE reconstructs
   it from tick zero, applies interventions at the exact saved ticks and
   compares the final checksum and statistics. A successful import pauses the
   simulation for inspection. If verification fails, the current world is kept.
4. Choose **Replay** to reconstruct the current run, including all recorded
   interventions. The Before/Imported counters offer a simple comparison.

Replaying a long experiment yields to the browser every 240 ticks so the UI
remains responsive. Limits are 1,000,000 ticks, 20,000 interventions and a
3 MB JSON file. Experiments can be compared via their JSON summaries and
full verification checksums.

**Versioning matters:** modifying biological rules may make old replays
incompatible. Increment the model identifier when results change; do not
silently accept a mismatch as reproducible.

## Automatic validation

`npm run test:ci` includes invariant/replay tests; `npm run test:e2e`
runs Chromium browser tests covering the catalogue, simulation controls,
Aquarium, seed configuration, JSON export/import, replay verification,
invalid imports and mobile viewport access.

Browser suite setup:

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

This confirms software determinism, **not** biological realism or scientific
model calibration. Human visual inspection and device-specific performance
profiling remain additional checks.
