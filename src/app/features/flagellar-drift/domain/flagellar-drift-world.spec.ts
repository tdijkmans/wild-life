import { FlagellarDriftWorld } from './flagellar-drift-world';

describe('Flagellar Drift', () => {
  it('mates locally and produces generations with inherited and mutated propulsion', () => {
    const world = new FlagellarDriftWorld(63584);
    for (let i = 0; i < 60 * 90; i++) world.step(1 / 60);
    expect(world.pairings).toBeGreaterThan(20);
    expect(world.mixedPairings).toBeGreaterThan(0);
    expect(world.mutations).toBeGreaterThan(0);
    expect(world.generation).toBeGreaterThan(3);
    expect(world.swimmers).toHaveLength(54 + world.pairings - world.deaths);
    expect(world.swimmers.length).toBeLessThanOrEqual(120);
    expect(new Set(world.swimmers.map((swimmer) => swimmer.propulsion)).size).toBe(3);
    expect(world.swimmers.every((swimmer) => swimmer.drive >= 0.6 && swimmer.drive <= 1.5)).toBe(
      true,
    );
  });

  it('replays the same eddies and food blooms with the same seed', () => {
    const run = () => {
      const world = new FlagellarDriftWorld(48);
      world.influence('food', 465, 360, 0, 0);
      world.influence('eddy', 250, 140, 0, 0);
      for (let i = 0; i < 60 * 15; i++) world.step(1 / 60);
      return world;
    };
    const a = run();
    const b = run();
    expect(a.swimmers).toEqual(b.swimmers);
    expect(a.history).toEqual(b.history);
    expect(a.audioCues).toEqual(b.audioCues);
  });
});
