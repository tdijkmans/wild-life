# Performance optimization — step 5

The biological model still runs at 60 fixed simulation steps per second.
Drawing fewer frames must not alter the engine's ecological behavior or results.

## Draw and update counts

The following counts are derived from the scheduling rules and checked by
unit tests; they are not measurements of total browser CPU time.

- **Homepage preview at 60 Hz:** up to 60 draws/s before, 30 draws/s after.
- **Homepage preview at 120 Hz:** up to 120 draws/s before, 30 draws/s after.
- **Preview outside the viewport:** formerly continued; now stops entirely.
- **Full simulation graphs:** formerly redrawn about 4.5 times per second.
  Now redrawn when a new history sample arrives, about 0.9 times per second.
- **WorldEngine integration:** 60 fixed simulation steps/s before and after.

Graph redraws still happen on chart-mode changes, viewport resize, and when
the Aquarium timeline becomes visible. Pausing a world does not repaint
identical graph data repeatedly.

## Implementation

- `shared/simulation/frame-throttle.ts` limits visual frames independently
  of simulation integration. Unit tests count draws under 60 Hz and 120 Hz
  callback schedules.
- The homepage uses `IntersectionObserver` to start/stop its preview runner
  when the canvas enters or leaves the viewport. Hidden tabs also pause it.
  Older browsers without IntersectionObserver retain an active preview.
- The ecosystem updates graphs and history/event signals only when source
  samples or events change, while allowing explicit redraw on resize.
- Canvas backing stores resize only when pixel dimensions actually change.
- `npm run perf:benchmark` benchmarks the seeded engine on CI, writes
  `reports/performance.json`, and prints an informational job summary.

## Interpretation

The draw-call reduction is deterministic and testable. It does **not** mean
that browser CPU usage has been reduced by a corresponding percentage.
Painting, compositing, GPU cost, frame rate, and thermal effects depend
on actual hardware.

The CI benchmark measures engine throughput, not canvas rendering. Hosted
runner timings vary; compare medians across repeated runs and use Chrome
Performance profiling for end-to-end browser metrics.

## First CI benchmark baseline

GitHub Actions [run 44314635770](https://github.com/tdijkmans/wild-life/actions/runs/44314635770)
measured a median **114.65 ms for 600 engine steps**, equivalent to approximately
**5,233 simulation steps/s**, over five seeded runs. The scenario begins with
120 prey and 12 predators. This is a reference measurement on shared CI
hardware, not proof of a CPU improvement. The biological engine is unchanged.
