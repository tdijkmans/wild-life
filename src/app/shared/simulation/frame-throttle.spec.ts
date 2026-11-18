import { FrameThrottle } from './frame-throttle';

describe('FrameThrottle', () => {
  it('limits 60 Hz animation callbacks to 30 visual updates per second', () => {
    const limiter = new FrameThrottle(30);
    let rendered = 0;
    for (let frame = 0; frame < 60; frame++) {
      if (limiter.shouldRender((frame * 1000) / 60)) rendered++;
    }
    expect(rendered).toBe(30);
  });

  it('limits 120 Hz callbacks without changing the desired display cadence', () => {
    const limiter = new FrameThrottle(30);
    let rendered = 0;
    for (let frame = 0; frame < 120; frame++) {
      if (limiter.shouldRender((frame * 1000) / 120)) rendered++;
    }
    expect(rendered).toBe(30);
  });

  it('allows the first frame immediately after a visibility reset', () => {
    const limiter = new FrameThrottle(30);
    expect(limiter.shouldRender(100)).toBe(true);
    expect(limiter.shouldRender(102)).toBe(false);
    limiter.reset();
    expect(limiter.shouldRender(104)).toBe(true);
  });

  it('resynchronizes when the clock moves backwards and rejects invalid timestamps', () => {
    const limiter = new FrameThrottle(30);
    expect(limiter.shouldRender(5000)).toBe(true);
    expect(limiter.shouldRender(1000)).toBe(true);
    expect(limiter.shouldRender(Number.NaN)).toBe(false);
    expect(limiter.shouldRender(Infinity)).toBe(false);
  });

  it('does not change simulation steps when only rendering is throttled', () => {
    const limiter = new FrameThrottle(30);
    let simulationSteps = 0;
    let renders = 0;
    for (let frame = 0; frame < 60; frame++) {
      simulationSteps++;
      if (limiter.shouldRender((frame * 1000) / 60)) renders++;
    }
    expect(simulationSteps).toBe(60);
    expect(renders).toBe(30);
  });

  it('validates frequency', () => {
    expect(() => new FrameThrottle(0)).toThrow(RangeError);
    expect(() => new FrameThrottle(Number.NaN)).toThrow(RangeError);
    expect(() => new FrameThrottle(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
