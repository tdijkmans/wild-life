import { IslandEvolutionWorld } from './island-evolution-world';
describe('Island Evolution', () => {
  it('isolation prevents migration and selection separates adaptive traits', () => {
    const w = new IslandEvolutionWorld(42);
    const start = w.divergence();
    for (let i = 0; i < 3200; i++) w.step(0.05);
    expect(w.migrations).toBe(0);
    expect(w.births).toBeGreaterThan(0);
    expect(w.divergence()).toBeGreaterThan(start + 0.1);
    expect(w.meanTrait(0)).toBeLessThan(w.meanTrait(1));
    expect(w.organisms.length).toBeLessThanOrEqual(405);
  });
  it('passages create gene flow and isolation closes them', () => {
    const w = new IslandEvolutionWorld(8);
    w.influence('bridge', 600, 260);
    for (let i = 0; i < 600; i++) w.step(1 / 60);
    expect(w.migrations).toBeGreaterThan(0);
    w.influence('isolate', 605, 500);
    w.influence('isolate', 280, 235);
    w.influence('isolate', 860, 200);
    const migrations = w.migrations;
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    expect(w.migrations).toBe(migrations);
  });
  it('repeats inheritance, migration and events exactly', () => {
    const run = () => {
      const w = new IslandEvolutionWorld(11);
      w.influence('bridge', 600, 260);
      for (let i = 0; i < 600; i++) w.step(1 / 60);
      return w;
    };
    const a = run(),
      b = run();
    expect(a.organisms).toEqual(b.organisms);
    expect(a.audioCues).toEqual(b.audioCues);
  });
});
