import { CanopyWorld } from './canopy-world';

function advance(world: CanopyWorld, steps: number): void {
  for (let i = 0; i < steps; i++) world.step(1 / 60);
}

describe('Canopy emergent growth and herbivory', () => {
  it('reproduces branches, leaves, insects and the ecological history exactly', () => {
    const run = () => {
      const world = new CanopyWorld(2048, 5, 13);
      advance(world, 135);
      world.influence('rain', world.trees[0].x, 350);
      world.influence('sunlight', world.trees[1].x, 300);
      world.influence('wildflowers', 560, 400);
      advance(world, 470);
      return world;
    };
    const a = run();
    const b = run();
    expect(b.trees).toEqual(a.trees);
    expect(b.insects).toEqual(a.insects);
    expect(b.fields).toEqual(a.fields);
    expect(b.history).toEqual(a.history);
    expect(b.audioCues).toEqual(a.audioCues);
  });

  it('grows living branches and leaf area over simulated time', () => {
    const world = new CanopyWorld(12, 5, 0);
    const before = world.trees.map((tree) => tree.branches.map((branch) => branch.progress));
    const leafCount = world.trees.reduce((total, tree) => total + tree.leaves.length, 0);
    advance(world, 540);
    expect(
      world.trees.some(
        (tree, i) =>
          tree.branches[0].progress > before[i][0] || tree.branches.length > before[i].length,
      ),
    ).toBe(true);
    expect(world.trees.reduce((total, tree) => total + tree.leaves.length, 0)).toBeGreaterThan(
      leafCount,
    );
    expect(world.history.length).toBeGreaterThan(2);
  });

  it('insects consume actual leaf health instead of triggering a visual-only effect', () => {
    const world = new CanopyWorld(84, 1, 1);
    const leaf = world.trees[0].leaves[0];
    const insect = world.insects[0];
    insect.x = leaf.x;
    insect.y = leaf.y;
    insect.vx = 0;
    insect.vy = 0;
    const original = leaf.health;
    advance(world, 110);
    expect(leaf.health).toBeLessThan(original);
    expect(world.trees[0].energy).toBeGreaterThan(0);
  });

  it('light competition and rain are part of the actual tree resource model', () => {
    const control = new CanopyWorld(42, 8, 0);
    const rainfall = new CanopyWorld(42, 8, 0);
    const x = rainfall.trees[3].x;
    rainfall.influence('rain', x, rainfall.trees[3].y - 320);
    rainfall.influence('sunlight', x, rainfall.trees[3].y - 320);
    advance(control, 180);
    advance(rainfall, 180);
    expect(rainfall.trees[3].water).toBeGreaterThan(control.trees[3].water);
    expect(rainfall.trees[3].energy).not.toEqual(control.trees[3].energy);
    expect(rainfall.meanShade).toBeGreaterThan(0);
  });

  it('rejects invalid fields or time steps, limits agents and keeps state finite', () => {
    const world = new CanopyWorld(5, 12, 48);
    const snapshot = structuredClone(world.trees);
    for (const dt of [NaN, -1, 0, Infinity, 0.2]) world.step(dt);
    expect(world.trees).toEqual(snapshot);
    world.influence('rain', Infinity, 20);
    world.influence('sunlight', -1, 10);
    world.influence('unknown', 600, 300);
    expect(world.fields).toHaveLength(0);
    for (let i = 0; i < 40; i++) world.influence('sunlight', 500, 310);
    expect(world.fields.length).toBeLessThanOrEqual(24);
    advance(world, 360);
    expect(world.trees.length).toBeLessThanOrEqual(16);
    expect(world.insects.length).toBeLessThanOrEqual(100);
    for (const tree of world.trees) {
      expect([tree.x, tree.energy, tree.water, tree.shade].every(Number.isFinite)).toBe(true);
      for (const leaf of tree.leaves) {
        expect([leaf.x, leaf.y, leaf.health, leaf.growth].every(Number.isFinite)).toBe(true);
      }
    }
    expect(() => new CanopyWorld(1, 17, 0)).toThrow(RangeError);
    expect(() => new CanopyWorld(1, 2, 101)).toThrow(RangeError);
  });

  it('emits bounded semantic events for rain, growth and insect disturbance', () => {
    const world = new CanopyWorld(17, 3, 4);
    world.influence('rain', 480, 300);
    world.influence('sunlight', 490, 330);
    world.influence('wildflowers', 530, 330);
    expect(world.audioCues.map((cue) => cue.kind)).toEqual(['rain', 'growth', 'rustle']);
    for (let i = 0; i < 30; i++) world.influence('rain', 500, 320);
    expect(world.audioCues.length).toBeLessThanOrEqual(16);
    expect(world.audioCues.at(-1)?.id).toBeGreaterThan(16);
  });
});
