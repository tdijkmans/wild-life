import { ChromaticCommonsWorld } from './chromatic-commons-world';
describe('Chromatic Commons', () => {
  it('repeats movement, inheritance and event history', () => {
    const run = () => {
      const w = new ChromaticCommonsWorld(9);
      w.influence('mix', 600, 360);
      for (let i = 0; i < 300; i++) w.step(1 / 60);
      return w;
    };
    const a = run(),
      b = run();
    expect(a.cells).toEqual(b.cells);
    expect(a.history).toEqual(b.history);
    expect(a.audioCues).toEqual(b.audioCues);
  });
  it('similar cells attract while short-range repulsion prevents collapse', () => {
    const w = new ChromaticCommonsWorld(2);
    w.cells.length = 2;
    Object.assign(w.cells[0], { x: 570, y: 360, kind: 0, vx: 0, vy: 0 });
    Object.assign(w.cells[1], { x: 630, y: 360, kind: 0, vx: 0, vy: 0 });
    for (let i = 0; i < 60; i++) w.step(1 / 60);
    expect(w.cells[1].x - w.cells[0].x).toBeLessThan(60);
    w.cells[1].x = w.cells[0].x + 5;
    w.cells[1].y = w.cells[0].y;
    w.cells.forEach((c) => {
      c.vx = 0;
      c.vy = 0;
    });
    w.step(0.05);
    expect(w.cells[1].vx).toBeGreaterThan(w.cells[0].vx);
  });
  it('reproduces with inherited colors and bounded energy under nutrients', () => {
    const w = new ChromaticCommonsWorld(17);
    w.cells.length = 30;
    w.cells.forEach((c) => {
      c.energy = 1.4;
      c.age = 20;
    });
    for (let i = 0; i < 400; i++) w.step(0.05);
    expect(w.births).toBeGreaterThan(0);
    expect(w.cells.length).toBeLessThanOrEqual(400);
    expect(
      w.cells.every(
        (c) =>
          Number.isFinite(c.x) &&
          c.kind >= 0 &&
          c.kind <= 3 &&
          c.affinity >= 0.6 &&
          c.affinity <= 1.4,
      ),
    ).toBe(true);
  });
});
