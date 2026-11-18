import { MurmurationWorld } from './murmuration-world';

function advance(world: MurmurationWorld, ticks: number): void {
  for (let i = 0; i < ticks; i++) world.step(1 / 60);
}

describe('Murmuration emergent flock', () => {
  it('replays the entire flock exactly with the same seed and influences', () => {
    const run = () => {
      const world = new MurmurationWorld(20261118, 120);
      advance(world, 150);
      world.influence('wind', 550, 300, 80, -20);
      world.influence('thermal', 440, 340);
      advance(world, 240);
      return world;
    };
    const first = run();
    const second = run();
    expect(second.birds).toEqual(first.birds);
    expect(second.fields).toEqual(first.fields);
    expect(second.raptor).toEqual(first.raptor);
    expect(second.history).toEqual(first.history);
    expect(second.caught).toBe(first.caught);
  });

  it('keeps all birds inside the visible sky with bounded finite velocities', () => {
    const world = new MurmurationWorld(8, 180);
    for (let i = 0; i < 520; i++) {
      if (i === 120) world.influence('thermal', 420, 170);
      world.step(1 / 60);
    }
    expect(world.birds.length).toBeGreaterThan(0);
    for (const bird of world.birds) {
      expect(bird.x).toBeGreaterThanOrEqual(0);
      expect(bird.x).toBeLessThanOrEqual(world.width);
      expect(bird.y).toBeGreaterThanOrEqual(0);
      expect(bird.y).toBeLessThanOrEqual(world.height);
      expect([bird.vx, bird.vy, bird.energy, bird.alignment].every(Number.isFinite)).toBe(true);
      expect(Math.hypot(bird.vx, bird.vy)).toBeLessThanOrEqual(143);
    }
    expect(world.formation).toBeGreaterThanOrEqual(0);
    expect(world.formation).toBeLessThanOrEqual(100);
  });

  it('reacts to wind and thermals through the physics rather than renderer state', () => {
    const baseline = new MurmurationWorld(24, 90);
    const changed = new MurmurationWorld(24, 90);
    changed.influence('wind', 600, 380, -65, 45);
    changed.influence('thermal', 570, 350);
    advance(baseline, 140);
    advance(changed, 140);
    expect(changed.birds).not.toEqual(baseline.birds);
    expect(changed.fields).toHaveLength(2);
  });

  it('supports small or empty skies and rejects excessive populations', () => {
    const empty = new MurmurationWorld(12, 0);
    advance(empty, 120);
    expect(empty.birds).toHaveLength(0);
    expect(empty.metrics()).toHaveLength(4);
    expect(() => new MurmurationWorld(1, 421)).toThrow(RangeError);
    expect(() => new MurmurationWorld(1, -1)).toThrow(RangeError);
  });

  it('limits active environmental fields and ignores malformed input', () => {
    const world = new MurmurationWorld(7, 25);
    world.influence('wind', Infinity, 30, 20, 10);
    world.influence('wind', -20, 20, 20, 10);
    world.influence('unknown', 400, 200, 20, 10);
    expect(world.fields).toHaveLength(0);
    for (let i = 0; i < 40; i++) world.influence('calm', 200 + i, 200);
    expect(world.fields).toHaveLength(24);
    advance(world, 800);
    expect(world.fields).toHaveLength(0);
  });

  it('ignores invalid integration steps without modifying state', () => {
    const world = new MurmurationWorld(33, 40);
    const before = structuredClone(world.birds);
    for (const dt of [0, -1, NaN, Infinity, 2]) world.step(dt);
    expect(world.birds).toEqual(before);
    expect(world.time).toBe(0);
  });

  it('supports measurable life history and population turnover', () => {
    const world = new MurmurationWorld(19, 45);
    advance(world, 650);
    expect(world.history.length).toBeGreaterThanOrEqual(10);
    expect(world.history.length).toBeLessThanOrEqual(160);
    expect(world.metrics().map((metric) => metric.label)).toContain('COHESION');
  });
});
