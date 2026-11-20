import { MembraneTideWorld } from './membrane-tide-world';

function advance(world: MembraneTideWorld, seconds: number): void {
  for (let i = 0; i < 60 * seconds; i++) world.step(1 / 60);
}

describe('Membrane Tide', () => {
  it('starts unsealed and produces closed compartments from local contacts', () => {
    for (const seed of [12, 93, 20764]) {
      const world = new MembraneTideWorld(seed);
      expect(world.ribbons.every((ribbon) => !ribbon.closed)).toBe(true);
      advance(world, 35);
      expect(world.seals).toBeGreaterThan(0);
      expect(world.joins).toBeGreaterThan(0);
      expect(world.ribbons.some((ribbon) => ribbon.closed)).toBe(true);
      expect(world.audioCues.some((cue) => cue.kind === 'membrane-seal')).toBe(true);
    }
  });

  it('opens a nearby vesicle after a delayed pebble impact and conserves every lipid patch', () => {
    const world = new MembraneTideWorld(12);
    advance(world, 20);
    const vesicle = world.ribbons.find((ribbon) => ribbon.closed)!;
    expect(vesicle).toBeDefined();
    const patch = vesicle.patches[0];
    const ruptureCount = world.ruptures;
    world.influence('pebble', patch.x, patch.y, 0, 0);
    expect(world.impacts).toBe(0);
    advance(world, 1);
    expect(world.impacts).toBe(1);
    expect(world.ruptures).toBeGreaterThan(ruptureCount);
    expect(world.audioCues.some((cue) => cue.kind === 'pebble-impact')).toBe(true);
    expect(world.audioCues.some((cue) => cue.kind === 'membrane-rupture')).toBe(true);
    advance(world, 15);
    const patches = world.ribbons.flatMap((ribbon) => ribbon.patches);
    expect(patches).toHaveLength(world.lipids);
    expect(new Set(patches.map(({ id }) => id)).size).toBe(world.lipids);
    expect(patches.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
  });

  it('deflects patches with local swirls and replays the same intervention sequence', () => {
    const original = new MembraneTideWorld(981);
    const replay = new MembraneTideWorld(981);
    const still = new MembraneTideWorld(981);
    for (const world of [original, replay]) {
      const patch = world.ribbons[3].patches[0];
      world.influence('pebble', Infinity, patch.y, 0, 0);
      world.influence('swirl', patch.x - 30, patch.y, 140, -50);
      world.step(NaN);
      expect(world.pebbles).toHaveLength(0);
      expect(world.time).toBe(0);
      advance(world, 8);
    }
    advance(still, 8);
    expect(original.ribbons).toEqual(replay.ribbons);
    expect(original.history).toEqual(replay.history);
    expect(original.audioCues).toEqual(replay.audioCues);
    expect(original.ribbons).not.toEqual(still.ribbons);
  });
});
