# Performance optimization — step 5

The engine remains fixed at 60 simulation steps/second; biological behavior
and statistical results should not change because a canvas is drawn less often.

## Before → after (theoretical draw/update counts, verified by unit tests)

| Operation | Before | After |
|:--|:--|:--|
| Homepage Canvas draw at 60 Hz | Up to 60 draws/s | Up to 30 draws/s |
| Homepage Canvas draw at 120 Hz | Up to 120 draws/s | Up to 30 draws/s |
| Homepage simulation and draw when off-screen | Continues | Stops entirely |
| Full simulation graphs while history is unchanged | ~4.5 rebuilds/s | ~0.9 rebuilds/s |
| WorldEngine simulation step frequency | 60 Hz | 60 Hz |

The graph interval is approximate: it is based on the engine's 1.1-second
history samples. Graphs still redraw on chart-mode changes, canvas resize and
when the Aquarium card is enabled. Pausing a world no longer repaints graph
data repeatedly.

## Implementation

- `shared/simulation/frame-throttle.ts` limits *visual* frames independently
  of the Simulation Runner's fixed-timestep integration; tests confirm 30
  render callbacks per second on both 60 Hz and 120 Hz schedules.
- Home uses `IntersectionObserver` to start/stop the preview runner as its
  canvas enters/leaves the viewport, and pauses for hidden tabs. A fallback
  keeps the preview available where IntersectionObserver is unsupported.
- Ecosystem graphs and history/event signals refresh only when their source
  samples/events change; rendering still responds to forced resize and mode
  changes.
- Canvas resizing checks actual backing-store dimensions to avoid resetting
  the backing store when unchanged.
- `npm run perf:benchmark` produces an observational engine CPU report using
  deterministic seeds. CI uploads `reports/performance.json`.

## What we have and have not measured

The draw-call reduction is a deterministic, testable consequence of the
throttling policy. It is **not** a measured 50–75% CPU reduction. Browser
painting, compositor work, GPU overhead, thermal throttling and actual FPS
remain dependent on the user's device.

The CI benchmark is a reproducible CPU *procedure* with real measurements,
but hosted runner timings are noisy. Compare medians over multiple runs,
ideally on the same hardware, and use browser Performance profiling for
end-to-end main-thread/paint measurements before promising FPS improvements.
