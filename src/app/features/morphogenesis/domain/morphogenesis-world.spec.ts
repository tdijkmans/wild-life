import { MorphogenesisWorld } from './morphogenesis-world';
describe('Morphogenesis', () => {
  it('reproduces tissue and chemical gradients deterministically', () => {
    const run = () => {
      const w = new MorphogenesisWorld(4);
      w.influence('growth', 600, 360);
      for (let i = 0; i < 120; i++) w.step(1 / 60);
      return w;
    };
    const a = run(),
      b = run();
    expect(a.cells).toEqual(b.cells);
    expect(a.activator).toEqual(b.activator);
    expect(a.audioCues).toEqual(b.audioCues);
  });
  it('growth factors diffuse and sustain distinct differentiated fates', () => {
    const w = new MorphogenesisWorld(6);
    const before = w.activator.slice();
    for (let i = 0; i < 1000; i++) w.step(0.05);
    expect(w.activator).not.toEqual(before);
    expect(w.cells.some((c) => c.fate === 1)).toBe(true);
    expect(w.cells.some((c) => c.fate === 2)).toBe(true);
    expect(w.cells.length).toBeLessThanOrEqual(430);
    expect(w.activator.every((n) => Number.isFinite(n) && n >= 0 && n <= 2)).toBe(true);
  });
  it('renewal supplies real energy and unknown inputs do nothing', () => {
    const a = new MorphogenesisWorld(12),
      b = new MorphogenesisWorld(12);
    const cell = a.cells[0];
    a.influence('renew', cell.x, cell.y);
    a.step(0.05);
    b.step(0.05);
    expect(a.cells[0].energy).toBeGreaterThan(b.cells[0].energy);
    b.influence('bad', 0, 0);
    b.influence('growth', Infinity, 1);
    b.step(NaN);
    expect(b.fields).toHaveLength(0);
    expect(b.time).toBe(0.05);
  });
});
