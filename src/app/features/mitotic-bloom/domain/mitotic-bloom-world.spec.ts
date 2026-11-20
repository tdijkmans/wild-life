import { GENOME_SIZE, MitoticBloomWorld, phaseAt } from './mitotic-bloom-world';

describe('Mitotic Bloom', () => {
  it('progresses through the visible phases and gives both daughters the full chromosome set', () => {
    const world = new MitoticBloomWorld(86281);
    const start = world.selected!;
    expect(start.genome).toHaveLength(GENOME_SIZE);
    const seen = new Set<number>();
    while (world.selectedId === start.id && world.time < 40) {
      const cell = world.selected!;
      seen.add(phaseAt(cell.cycle).index);
      world.step(1 / 60);
    }
    expect([...seen]).toEqual([1, 2, 3, 4, 5]);
    const daughter = world.selected!;
    const sister = world.cells.find((cell) => cell.id === daughter.id + 1);
    expect(daughter.generation).toBe(1);
    expect(daughter.genome).toEqual(start.genome);
    expect(sister?.genome).toEqual(start.genome);
    expect(daughter.genome).not.toBe(sister?.genome);
    expect(world.divisions).toBeGreaterThan(0);
  });

  it('keeps a bounded population with turnover and responds to local nutrients', () => {
    const control = new MitoticBloomWorld(44);
    const fed = new MitoticBloomWorld(44);
    const focus = fed.selected!;
    fed.influence('nutrients', focus.x, focus.y, 0, 0);
    for (let i = 0; i < 120; i++) {
      control.step(1 / 60);
      fed.step(1 / 60);
    }
    expect(fed.selected?.cycle).toBeGreaterThan(control.selected!.cycle);
    for (let i = 0; i < 60 * 150; i++) control.step(1 / 60);
    expect(control.cells.length).toBe(12 + control.divisions - control.retirements);
    expect(control.cells.length).toBeLessThanOrEqual(31);
    expect(control.retirements).toBeGreaterThan(0);
  });
});
