import { SimulationRunner, type AnimationClock, type SimulationFrame } from './simulation-runner';

class FakeClock implements AnimationClock {
  private nextHandle = 1;
  readonly pending = new Map<number, (nowMs: number) => void>();

  requestFrame(callback: (nowMs: number) => void): number {
    const handle = this.nextHandle++;
    this.pending.set(handle, callback);
    return handle;
  }

  cancelFrame(handle: number): void {
    this.pending.delete(handle);
  }

  advance(nowMs: number): void {
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    for (const callback of callbacks) callback(nowMs);
  }
}

class TestWorld {
  readonly steps: number[] = [];

  step(dtSeconds: number): void {
    this.steps.push(dtSeconds);
  }
}

function createRunner(clock: FakeClock, world: TestWorld, onFrame?: (frame: SimulationFrame) => void) {
  return new SimulationRunner(world, {
    clock,
    stepSeconds: 0.1,
    maxFrameSeconds: 0.5,
    maxAccumulatedSeconds: 1,
    maxStepsPerFrame: 10,
    onFrame,
  });
}

describe('SimulationRunner', () => {
  it('schedules only once when started repeatedly and cancels on stop', () => {
    const clock = new FakeClock();
    const runner = createRunner(clock, new TestWorld());
    runner.start();
    runner.start();
    expect(runner.isRunning).toBe(true);
    expect(clock.pending.size).toBe(1);

    runner.stop();
    expect(runner.isRunning).toBe(false);
    expect(clock.pending.size).toBe(0);
    clock.advance(10_000);
    expect(clock.pending.size).toBe(0);
  });

  it('advances in fixed steps and reports wall-clock time separately', () => {
    const clock = new FakeClock();
    const world = new TestWorld();
    const frames: SimulationFrame[] = [];
    const runner = createRunner(clock, world, (frame) => frames.push(frame));
    runner.start();
    clock.advance(0);
    clock.advance(250);
    expect(world.steps).toEqual([0.1, 0.1]);
    expect(frames[1]).toEqual({
      nowMs: 250,
      deltaSeconds: 0.25,
      steps: 2,
      simulatedSeconds: 0.2,
    });
    clock.advance(300);
    expect(world.steps).toHaveLength(3);
    runner.stop();
  });

  it('pauses world updates but continues rendering, then resumes without a time jump', () => {
    const clock = new FakeClock();
    const world = new TestWorld();
    const frames: SimulationFrame[] = [];
    const runner = createRunner(clock, world, (frame) => frames.push(frame));
    runner.start();
    clock.advance(0);
    clock.advance(100);
    expect(world.steps).toHaveLength(1);

    runner.setPaused(true);
    expect(runner.isPaused).toBe(true);
    clock.advance(500);
    clock.advance(600);
    expect(world.steps).toHaveLength(1);
    expect(frames.at(-1)?.steps).toBe(0);

    runner.setPaused(false);
    clock.advance(5_000); // First frame after resuming resets the wall clock.
    expect(world.steps).toHaveLength(1);
    clock.advance(5_100);
    expect(world.steps).toHaveLength(2);
    runner.stop();
  });

  it('changes playback speed without changing the fixed integration step', () => {
    const clock = new FakeClock();
    const world = new TestWorld();
    const runner = createRunner(clock, world);
    runner.start();
    clock.advance(0);
    clock.advance(100);
    expect(world.steps).toHaveLength(1);
    runner.setSpeed(2);
    expect(runner.playbackSpeed).toBe(2);
    clock.advance(200);
    expect(world.steps).toHaveLength(3);
    runner.setSpeed(4);
    clock.advance(300);
    expect(world.steps).toHaveLength(7);
    expect(world.steps.every((dt) => dt === 0.1)).toBe(true);
    runner.stop();
  });

  it('limits large frame deltas and prevents unbounded simulation work', () => {
    const clock = new FakeClock();
    const world = new TestWorld();
    const runner = new SimulationRunner(world, {
      clock,
      stepSeconds: 0.01,
      maxFrameSeconds: 0.05,
      maxAccumulatedSeconds: 0.05,
      maxStepsPerFrame: 2,
    });
    runner.start();
    clock.advance(0);
    clock.advance(10_000);
    expect(world.steps).toHaveLength(2);
    clock.advance(10_000);
    expect(world.steps).toHaveLength(4);
    runner.stop();
  });

  it('suspends inactive worlds and discards hidden-tab catch-up', () => {
    const clock = new FakeClock();
    const world = new TestWorld();
    const frames: SimulationFrame[] = [];
    let active = true;
    const runner = new SimulationRunner(world, {
      clock,
      stepSeconds: 0.1,
      maxFrameSeconds: 0.5,
      isActive: () => active,
      onFrame: (frame) => frames.push(frame),
    });
    runner.start();
    clock.advance(0);
    clock.advance(100);
    expect(world.steps).toHaveLength(1);

    active = false;
    const frameCount = frames.length;
    clock.advance(50_000);
    expect(frames).toHaveLength(frameCount);
    active = true;
    clock.advance(50_100);
    expect(world.steps).toHaveLength(1);
    clock.advance(50_200);
    expect(world.steps).toHaveLength(2);
    runner.stop();
  });

  it('replaces the world without transferring accumulated time', () => {
    const clock = new FakeClock();
    const original = new TestWorld();
    const replacement = new TestWorld();
    const runner = createRunner(clock, original);
    runner.start();
    clock.advance(0);
    clock.advance(150);
    expect(original.steps).toHaveLength(1);
    runner.setWorld(replacement);
    clock.advance(10_000);
    expect(replacement.steps).toHaveLength(0);
    clock.advance(10_100);
    expect(replacement.steps).toHaveLength(1);
    expect(original.steps).toHaveLength(1);
    runner.stop();
  });

  it('does not accumulate elapsed time when stopped and restarted', () => {
    const clock = new FakeClock();
    const world = new TestWorld();
    const runner = createRunner(clock, world);
    runner.start();
    clock.advance(0);
    clock.advance(100);
    runner.stop();

    runner.start();
    clock.advance(10_000);
    expect(world.steps).toHaveLength(1);
    clock.advance(10_100);
    expect(world.steps).toHaveLength(2);
    runner.stop();
  });

  it('validates time configuration and playback speed', () => {
    const clock = new FakeClock();
    const world = new TestWorld();
    expect(() => new SimulationRunner(world, { stepSeconds: 0 })).toThrow(RangeError);
    expect(() => new SimulationRunner(world, { maxStepsPerFrame: 0.5 })).toThrow(RangeError);
    expect(
      () => new SimulationRunner(world, { stepSeconds: 0.1, maxAccumulatedSeconds: 0.01 }),
    ).toThrow(RangeError);

    const runner = createRunner(clock, world);
    expect(() => runner.setSpeed(NaN)).toThrow(RangeError);
    expect(() => runner.setSpeed(Infinity)).toThrow(RangeError);
    expect(() => runner.setSpeed(-1)).toThrow(RangeError);
    expect(() => runner.setSpeed(17)).toThrow(RangeError);
    expect(runner.playbackSpeed).toBe(1);
  });

  it('does not reschedule after its frame callback stops the runner', () => {
    const clock = new FakeClock();
    const world = new TestWorld();
    let runner: SimulationRunner<TestWorld>;
    runner = createRunner(clock, world, () => runner.stop());
    runner.start();
    clock.advance(0);
    expect(clock.pending.size).toBe(0);
    expect(runner.isRunning).toBe(false);
  });
});
