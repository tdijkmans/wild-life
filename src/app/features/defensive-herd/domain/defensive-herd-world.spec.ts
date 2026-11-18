import { DefensiveHerdWorld } from './defensive-herd-world';

function advance(world: DefensiveHerdWorld, ticks: number): void {
  for (let i = 0; i < ticks; i++) world.step(1 / 60);
}

describe('Defensive Herd collective behavior', () => {
  it('produces identical herd positions, predator behavior and forage from the same seed', () => {
    const run = () => {
      const world = new DefensiveHerdWorld(20261119, 26, 6, 2);
      advance(world, 120);
      world.influence('pasture', 340, 250);
      world.influence('scent', 650, 340);
      world.influence('breeze', 720, 400, -60, 28);
      advance(world, 260);
      return world;
    };
    const first = run();
    const second = run();
    expect(second.herd).toEqual(first.herd);
    expect(second.wolves).toEqual(first.wolves);
    expect(second.pastures).toEqual(first.pastures);
    expect(second.history).toEqual(first.history);
    expect(second.losses).toBe(first.losses);
  });

  it('forms outward-facing defensive coverage when a predator approaches', () => {
    const world = new DefensiveHerdWorld(44, 38, 9, 1);
    const center = world.calfCenter();
    world.wolves[0].x = center.x + 145;
    world.wolves[0].y = center.y;
    let peakDefense = 0;
    let peakCoverage = 0;
    for (let i = 0; i < 420; i++) {
      world.step(1 / 60);
      peakDefense = Math.max(peakDefense, world.defenseLevel);
      peakCoverage = Math.max(peakCoverage, world.ringCoverage);
    }
    expect(peakDefense).toBeGreaterThan(0.4);
    expect(peakCoverage).toBeGreaterThanOrEqual(25);
    expect(world.herd.some((animal) => animal.kind === 'adult')).toBe(true);
  });

  it('physically interposing adults prevent a predator from taking a calf', () => {
    const protectedWorld = new DefensiveHerdWorld(12, 1, 1, 1);
    const calf = protectedWorld.herd.find((animal) => animal.kind === 'calf')!;
    const guardian = protectedWorld.herd.find((animal) => animal.kind === 'adult')!;
    guardian.x = calf.x + 11;
    guardian.y = calf.y;
    const predator = protectedWorld.wolves[0];
    predator.x = calf.x + 22;
    predator.y = calf.y;
    predator.cooldown = 0;
    protectedWorld.step(1 / 60);
    expect(protectedWorld.losses).toBe(0);

    const unprotected = new DefensiveHerdWorld(12, 0, 1, 1);
    const vulnerable = unprotected.herd[0];
    const wolf = unprotected.wolves[0];
    wolf.x = vulnerable.x + 22;
    wolf.y = vulnerable.y;
    wolf.cooldown = 0;
    unprotected.step(1 / 60);
    expect(unprotected.losses).toBe(1);
  });

  it('keeps animals and wolves in the meadow with finite energies and velocities', () => {
    const world = new DefensiveHerdWorld(7, 32, 8, 3);
    advance(world, 500);
    for (const animal of world.herd) {
      expect(animal.x).toBeGreaterThanOrEqual(0);
      expect(animal.y).toBeGreaterThanOrEqual(0);
      expect(animal.x).toBeLessThanOrEqual(world.width);
      expect(animal.y).toBeLessThanOrEqual(world.height);
      expect([animal.vx, animal.vy, animal.energy, animal.facingX].every(Number.isFinite)).toBe(
        true,
      );
    }
    for (const wolf of world.wolves) {
      expect([wolf.x, wolf.y, wolf.vx, wolf.vy].every(Number.isFinite)).toBe(true);
    }
    expect(world.ringCoverage).toBeGreaterThanOrEqual(0);
    expect(world.ringCoverage).toBeLessThanOrEqual(100);
  });

  it('applies pasture and scent as environmental inputs rather than direct commands', () => {
    const world = new DefensiveHerdWorld(33, 16, 4, 2);
    const originalHerd = structuredClone(world.herd);
    const originalWolves = structuredClone(world.wolves);
    world.influence('pasture', 340, 240);
    world.influence('scent', 680, 320);
    expect(world.influences.some((field) => field.kind === 'scent')).toBe(true);
    expect(world.herd).toEqual(originalHerd);
    expect(world.wolves).toEqual(originalWolves);
    advance(world, 90);
    expect(world.herd).not.toEqual(originalHerd);
  });

  it('caps patches, ignores invalid coordinates and validates starting populations', () => {
    const world = new DefensiveHerdWorld(42, 5, 2, 1);
    const initial = world.influences.length;
    world.influence('scent', NaN, 300);
    world.influence('breeze', -5, 30, 20, 10);
    expect(world.influences).toHaveLength(initial);
    for (let i = 0; i < 100; i++) world.influence('scent', 550, 330);
    expect(world.influences.length).toBeLessThanOrEqual(30);
    expect(() => new DefensiveHerdWorld(1, 86, 0, 1)).toThrow(RangeError);
    expect(() => new DefensiveHerdWorld(1, 10, 10, 7)).toThrow(RangeError);
    expect(() => new DefensiveHerdWorld(1, -1, 0, 0)).toThrow(RangeError);
  });

  it('supports empty habitats and ignores invalid time increments', () => {
    const world = new DefensiveHerdWorld(12, 0, 0, 0);
    const before = structuredClone(world.pastures);
    for (const dt of [0, NaN, Infinity, -1, 0.5]) world.step(dt);
    expect(world.time).toBe(0);
    expect(world.pastures).toEqual(before);
    advance(world, 65);
    expect(world.herd).toHaveLength(0);
    expect(world.history.length).toBeGreaterThan(1);
  });

  it('updates living histories without allowing runaway population growth', () => {
    const world = new DefensiveHerdWorld(51, 32, 8, 3);
    advance(world, 550);
    expect(world.herd.length).toBeLessThanOrEqual(85);
    expect(world.history.length).toBeGreaterThanOrEqual(9);
    expect(world.metrics().find((metric) => metric.label === 'RING')).toBeDefined();
  });
});
