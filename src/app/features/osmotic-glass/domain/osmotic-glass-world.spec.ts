import { OsmoticGlassWorld } from './osmotic-glass-world';

describe('Osmotic Glass', () => {
  it('conserves particles, retains large solutes, and permits net osmosis and bidirectional exchange', () => {
    const world = new OsmoticGlassWorld(73442);
    const initial = world.molecules.length;
    const retained = new Map(
      world.molecules
        .filter((molecule) => molecule.kind === 'solute')
        .map((molecule) => [molecule, molecule.x > world.membrane]),
    );
    for (let i = 0; i < 60 * 30; i++) world.step(1 / 60);
    expect(world.molecules).toHaveLength(initial);
    expect(world.waterLeft + world.waterRight).toBe(380);
    expect(world.waterToRight).toBeGreaterThan(world.waterToLeft);
    expect(world.waterToLeft).toBeGreaterThan(0);
    expect(world.tracerCrossings).toBeGreaterThan(0);
    expect(world.membrane).toBeLessThan(600);
    for (const [solute, initialSide] of retained) {
      expect(solute.x > world.membrane).toBe(initialSide);
    }
    expect(
      world.molecules.filter(
        (molecule) => molecule.kind === 'water' && molecule.x > world.membrane,
      ),
    ).toHaveLength(world.waterRight);
  });

  it('sounds directional water transport separately from a tracer crossing', () => {
    const world = new OsmoticGlassWorld(73442);
    let water: (typeof world.audioCues)[number] | undefined;
    let tracer: (typeof world.audioCues)[number] | undefined;
    for (let tick = 0; tick < 1200 && (!water || !tracer); tick++) {
      world.step(1 / 60);
      water ??= world.audioCues.find((cue) => cue.kind === 'water-transit');
      tracer ??= world.audioCues.find((cue) => cue.kind === 'tracer-transit');
    }
    expect(water?.panTo).toBeDefined();
    expect(water?.panTo).not.toBe(water?.pan);
    expect(tracer?.pan).toBeDefined();
    expect(tracer?.panTo).toBeUndefined();
  });

  it('adds retained solute locally and repeats a seeded stirring run', () => {
    const run = () => {
      const world = new OsmoticGlassWorld(3);
      world.influence('solute', 300, 300, 0, 0);
      world.influence('stir', 260, 290, 2, 3);
      world.influence('solute', NaN, 5, 0, 0);
      world.step(NaN);
      expect(world.time).toBe(0);
      expect(
        world.molecules.filter(
          (molecule) => molecule.kind === 'solute' && molecule.x < world.membrane,
        ),
      ).toHaveLength(32);
      for (let i = 0; i < 60 * 7; i++) world.step(1 / 60);
      return world;
    };
    const a = run();
    const b = run();
    expect(a.molecules).toEqual(b.molecules);
    expect(a.history).toEqual(b.history);
    expect(a.audioCues).toEqual(b.audioCues);
  });
});
