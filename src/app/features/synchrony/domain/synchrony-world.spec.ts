import { SynchronyWorld } from './synchrony-world';

function advance(world: SynchronyWorld, ticks: number): void {
  for (let i = 0; i < ticks; i++) world.step(1 / 60);
}

function phaseDistance(a: number, b: number): number {
  const difference = Math.abs(a - b) % (Math.PI * 2);
  return Math.min(difference, Math.PI * 2 - difference);
}

describe('Synchrony — locally coupled fireflies', () => {
  it('reproduces the complete population, fields and event history from a seed', () => {
    const run = () => {
      const world = new SynchronyWorld(20261122, 130);
      advance(world, 140);
      world.influence('warmth', 410, 290);
      world.influence('breeze', 650, 390, 50, 20);
      world.influence('shade', 790, 450);
      advance(world, 300);
      return world;
    };
    const first = run();
    const second = run();
    expect(second.fireflies).toEqual(first.fireflies);
    expect(second.fields).toEqual(first.fields);
    expect(second.history).toEqual(first.history);
    expect(second.audioCues).toEqual(first.audioCues);
    expect(second.coherence).toBe(first.coherence);
  });

  it('reduces a phase difference through local coupling, not a global clock', () => {
    const close = new SynchronyWorld(9, 2);
    const far = new SynchronyWorld(9, 2);
    for (const world of [close, far]) {
      const a = world.fireflies[0];
      const b = world.fireflies[1];
      a.x = 420; a.y = 340; a.vx = 0; a.vy = 0;
      b.x = 430; b.y = 340; b.vx = 0; b.vy = 0;
      a.phase = 0.2; b.phase = 1.7;
      a.frequency = 1.7; b.frequency = 1.7;
      a.coupling = 1; b.coupling = 1;
    }
    far.fireflies[1].x = 950;
    const start = phaseDistance(close.fireflies[0].phase, close.fireflies[1].phase);
    advance(close, 30);
    advance(far, 30);
    const closeDifference = phaseDistance(close.fireflies[0].phase, close.fireflies[1].phase);
    const farDifference = phaseDistance(far.fireflies[0].phase, far.fireflies[1].phase);
    expect(closeDifference).toBeLessThan(start * 0.45);
    expect(farDifference).toBeGreaterThan(start * 0.85);
  });

  it('environmental warmth and shade change real oscillator phases', () => {
    const baseline = new SynchronyWorld(77, 35);
    const changed = new SynchronyWorld(77, 35);
    const target = changed.fireflies[0];
    changed.influence('warmth', target.x, target.y);
    changed.influence('shade', target.x, target.y);
    advance(baseline, 160);
    advance(changed, 160);
    expect(changed.fireflies[0].phase).not.toEqual(baseline.fireflies[0].phase);
    expect(changed.audioCues.some((cue) => cue.kind === 'pulse')).toBe(true);
  });

  it('keeps fireflies and oscillator values finite and inside the world', () => {
    const world = new SynchronyWorld(19, 200);
    advance(world, 650);
    expect(world.fireflies.length).toBeGreaterThan(0);
    expect(world.fireflies.length).toBeLessThanOrEqual(720);
    expect(world.coherence).toBeGreaterThanOrEqual(0);
    expect(world.coherence).toBeLessThanOrEqual(1);
    expect(world.localCoherence).toBeGreaterThan(0);
    expect(world.localCoherence).toBeLessThanOrEqual(1);
    for (const firefly of world.fireflies) {
      expect(firefly.x).toBeGreaterThanOrEqual(0);
      expect(firefly.x).toBeLessThanOrEqual(world.width);
      expect(firefly.y).toBeGreaterThanOrEqual(0);
      expect(firefly.y).toBeLessThanOrEqual(world.height);
      expect([firefly.phase, firefly.frequency, firefly.energy, firefly.flash].every(Number.isFinite)).toBe(true);
    }
  });

  it('bounds fields, events and histories, and rejects malformed input', () => {
    const world = new SynchronyWorld(24, 8);
    const before = structuredClone(world.fireflies);
    for (const dt of [0, -1, NaN, Infinity, 0.5]) world.step(dt);
    expect(world.fireflies).toEqual(before);
    world.influence('warmth', NaN, 200);
    world.influence('warmth', -5, 200);
    world.influence('unknown', 300, 200);
    expect(world.fields).toHaveLength(0);
    for (let i = 0; i < 40; i++) world.influence('shade', 310, 220);
    expect(world.fields).toHaveLength(24);
    expect(world.audioCues.length).toBeLessThanOrEqual(16);
    advance(world, 720);
    expect(world.history.length).toBeLessThanOrEqual(160);
    expect(() => new SynchronyWorld(1, 721)).toThrow(RangeError);
    expect(() => new SynchronyWorld(1, -1)).toThrow(RangeError);
  });

  it('remains stable without any insects', () => {
    const world = new SynchronyWorld(1, 0);
    advance(world, 122);
    expect(world.fireflies).toHaveLength(0);
    expect(world.metrics().find((metric) => metric.label === 'GLOBAL ORDER')?.value).toBe('0%');
  });
});
