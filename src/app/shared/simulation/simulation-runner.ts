/**
 * Shared fixed-timestep simulation runner.
 *
 * Independent of Angular and any particular model: the world only needs step(dt).
 * The runner owns RAF scheduling, time accumulation, pause, speed, and disposal.
 * Rendering and UI refresh are delegated through onFrame().
 */
export interface Simulatable {
  step(dtSeconds: number): void;
}

export interface AnimationClock {
  requestFrame(callback: (nowMs: number) => void): number;
  cancelFrame(handle: number): void;
}

export interface SimulationFrame {
  nowMs: number;
  deltaSeconds: number;
  steps: number;
  simulatedSeconds: number;
}

export interface SimulationRunnerOptions {
  /** Fixed integration step, in simulation seconds (default: 1/60). */
  stepSeconds?: number;
  /** Maximum wall-clock time incorporated from a single frame. */
  maxFrameSeconds?: number;
  /** Limits work during a single browser animation frame. */
  maxStepsPerFrame?: number;
  /** Prevents an indefinitely growing backlog when rendering is slow. */
  maxAccumulatedSeconds?: number;
  /** Return false when rendering should be suspended (e.g. document.hidden). */
  isActive?: () => boolean;
  onFrame?: (frame: SimulationFrame) => void;
  /** Injectable for deterministic tests; defaults to browser animation frames. */
  clock?: AnimationClock;
}

const browserClock: AnimationClock = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

function requirePositive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
  return value;
}

export class SimulationRunner<T extends Simulatable> {
  private readonly clock: AnimationClock;
  private readonly stepSeconds: number;
  private readonly maxFrameSeconds: number;
  private readonly maxStepsPerFrame: number;
  private readonly maxAccumulatedSeconds: number;
  private readonly onFrame?: (frame: SimulationFrame) => void;
  private readonly isActive: () => boolean;

  private frameHandle: number | null = null;
  private lastFrameMs: number | null = null;
  private accumulator = 0;
  private running = false;
  private paused = false;
  private speed = 1;

  constructor(
    private world: T,
    options: SimulationRunnerOptions = {},
  ) {
    this.clock = options.clock ?? browserClock;
    this.stepSeconds = requirePositive(options.stepSeconds ?? 1 / 60, 'stepSeconds');
    this.maxFrameSeconds = requirePositive(options.maxFrameSeconds ?? 0.065, 'maxFrameSeconds');
    this.maxStepsPerFrame = requirePositive(options.maxStepsPerFrame ?? 18, 'maxStepsPerFrame');
    if (!Number.isInteger(this.maxStepsPerFrame)) {
      throw new RangeError('maxStepsPerFrame must be an integer');
    }
    this.maxAccumulatedSeconds = requirePositive(
      options.maxAccumulatedSeconds ?? 0.28,
      'maxAccumulatedSeconds',
    );
    if (this.maxAccumulatedSeconds < this.stepSeconds) {
      throw new RangeError('maxAccumulatedSeconds must be at least one step');
    }
    this.onFrame = options.onFrame;
    this.isActive = options.isActive ?? (() => true);
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get playbackSpeed(): number {
    return this.speed;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameMs = null;
    this.frameHandle = this.clock.requestFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.frameHandle !== null) this.clock.cancelFrame(this.frameHandle);
    this.frameHandle = null;
    this.resetClock();
  }

  /** Pausing freezes model time, but does not stop the rendering callback. */
  setPaused(value: boolean): void {
    if (this.paused === value) return;
    this.paused = value;
    this.lastFrameMs = null;
  }

  setSpeed(value: number): void {
    if (!Number.isFinite(value) || value <= 0 || value > 16) {
      throw new RangeError('Playback speed must be finite, positive and at most 16');
    }
    this.speed = value;
  }

  /** Switches worlds without carrying simulation debt into the new world. */
  setWorld(world: T): void {
    this.world = world;
    this.resetClock();
  }

  private resetClock(): void {
    this.lastFrameMs = null;
    this.accumulator = 0;
  }

  private readonly tick = (nowMs: number): void => {
    this.frameHandle = null;
    if (!this.running) return;

    if (!this.isActive()) {
      // Dropping background time prevents a large catch-up after switching tabs.
      this.resetClock();
    } else {
      const deltaSeconds =
        this.lastFrameMs === null
          ? 0
          : Math.min(this.maxFrameSeconds, Math.max(0, (nowMs - this.lastFrameMs) / 1000));
      this.lastFrameMs = nowMs;
      let steps = 0;

      if (!this.paused) {
        this.accumulator = Math.min(
          this.maxAccumulatedSeconds,
          this.accumulator + deltaSeconds * this.speed,
        );
        // Tiny epsilon avoids missing a step due to floating point rounding.
        while (this.accumulator + 1e-12 >= this.stepSeconds && steps < this.maxStepsPerFrame) {
          this.world.step(this.stepSeconds);
          this.accumulator -= this.stepSeconds;
          steps++;
        }
        this.accumulator = Math.max(0, this.accumulator);
      }

      this.onFrame?.({
        nowMs,
        deltaSeconds,
        steps,
        simulatedSeconds: steps * this.stepSeconds,
      });
    }

    if (this.running) this.frameHandle = this.clock.requestFrame(this.tick);
  };
}
