import { WorldEngine } from './engine';

describe('WILD ecosystem engine', () => {
  it('initializes both prey and predator populations', () => {
    const world = new WorldEngine(123, 120, 12);
    const stats = world.stats();
    expect(stats.prey).toBe(120);
    expect(stats.predators).toBe(12);
  });

  it('is deterministic for the same seed and interventions', () => {
    const a = new WorldEngine(189, 80, 8);
    const b = new WorldEngine(189, 80, 8);
    for (let i = 0; i < 120; i++) {
      a.step(1 / 60);
      b.step(1 / 60);
    }
    expect(a.stats()).toEqual(b.stats());
    expect(a.history).toEqual(b.history);
  });
});
