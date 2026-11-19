import { VascularGardenWorld } from './vascular-garden-world';
describe('Vascular Garden', () => {
  it('grows toward demand and creates actual connected vessel segments', () => {
    const w = new VascularGardenWorld(5);
    for (let i = 0; i < 450; i++) w.step(0.05);
    expect(w.sprouts).toBeGreaterThan(0);
    expect(w.connections).toBeGreaterThan(0);
    expect(w.vessels.some((v) => Math.abs(v.flow) > 0.001)).toBe(true);
    expect(w.nodes.length).toBeLessThanOrEqual(230);
    expect(w.vessels.length).toBeLessThanOrEqual(300);
    expect(
      w.nodes.every((n) => Number.isFinite(n.pressure) && n.pressure >= 0 && n.pressure <= 1),
    ).toBe(true);
  });
  it('oxygen supplementation reduces the growth signal compared with unmet demand', () => {
    const oxygen = new VascularGardenWorld(1),
      demand = new VascularGardenWorld(1);
    const target = oxygen.tissue[0];
    oxygen.influence('oxygen', target.x, target.y);
    demand.influence('demand', target.x, target.y);
    for (let i = 0; i < 200; i++) {
      oxygen.step(1 / 60);
      demand.step(1 / 60);
    }
    expect(oxygen.tissue[0].oxygen).toBeGreaterThan(demand.tissue[0].oxygen);
    expect(oxygen.tissue[0].vegf).toBeLessThan(demand.tissue[0].vegf);
  });
  it('replays geometry, flow and semantic cues from its seed', () => {
    const run = () => {
      const w = new VascularGardenWorld(8);
      for (let i = 0; i < 120; i++) w.step(1 / 60);
      return w;
    };
    const a = run(),
      b = run();
    expect(a.nodes).toEqual(b.nodes);
    expect(a.vessels).toEqual(b.vessels);
    expect(a.audioCues).toEqual(b.audioCues);
  });
});
