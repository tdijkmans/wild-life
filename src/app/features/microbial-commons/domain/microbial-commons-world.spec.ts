import { MicrobialCommonsWorld, MICRO_COLS, MICRO_SITES } from './microbial-commons-world';

function advance(world: MicrobialCommonsWorld, ticks: number): void {
  for (let i = 0; i < ticks; i++) world.step(1 / 60);
}

describe('Microbial Commons — resource-driven colony growth', () => {
  it('reproduces every colony site and chemical field exactly from a fixed seed', () => {
    const run = () => {
      const world = new MicrobialCommonsWorld(20261124, 16);
      advance(world, 150);
      world.influence('nutrients', 580, 340);
      world.influence('oxygen', 690, 390);
      world.influence('buffer', 450, 280);
      advance(world, 340);
      return world;
    };
    const a = run();
    const b = run();
    expect([...b.species]).toEqual([...a.species]);
    expect([...b.biomass]).toEqual([...a.biomass]);
    expect([...b.nutrients]).toEqual([...a.nutrients]);
    expect([...b.oxygen]).toEqual([...a.oxygen]);
    expect([...b.metabolite]).toEqual([...a.metabolite]);
    expect([...b.inhibitor]).toEqual([...a.inhibitor]);
    expect([...b.tolerance]).toEqual([...a.tolerance]);
    expect(b.audioCues).toEqual(a.audioCues);
    expect(b.history).toEqual(a.history);
  });

  it('reproduces into neighboring habitat instead of animating fixed colonies', () => {
    const world = new MicrobialCommonsWorld(42, 12);
    const original = world.occupied;
    advance(world, 540);
    expect(world.divisions).toBeGreaterThan(0);
    expect(world.occupied).toBeGreaterThan(original);
    expect(world.species.some((cell) => cell === 1)).toBe(true);
    expect(world.species.some((cell) => cell === 2)).toBe(true);
    expect(world.species.some((cell) => cell === 3)).toBe(true);
  });

  it('producer metabolism generates diffusible metabolite for other strains', () => {
    const world = new MicrobialCommonsWorld(11, 1);
    const before = world.metabolite.reduce((sum, value) => sum + value, 0);
    advance(world, 360);
    const after = world.metabolite.reduce((sum, value) => sum + value, 0);
    expect(after).toBeGreaterThan(before);
    expect(world.producerCount).toBeGreaterThan(0);
  });

  it('cross-feeders actually consume metabolites, not just proximity graphics', () => {
    const world = new MicrobialCommonsWorld(13, 3);
    const index = world.species.findIndex((species) => species === 2);
    expect(index).toBeGreaterThan(0);
    world.metabolite[index] = 0.8;
    const initial = world.metabolite[index];
    advance(world, 18);
    expect(world.exchanges).toBeGreaterThan(0);
    expect(world.metabolite[index]).toBeLessThan(initial);
  });

  it('nutrients, oxygen and buffer change the chemical state, not the microbes directly', () => {
    const control = new MicrobialCommonsWorld(16, 5);
    const altered = new MicrobialCommonsWorld(16, 5);
    const centerIndex = Math.floor(23 * MICRO_COLS + MICRO_COLS / 2);
    const point = altered.coordinates(centerIndex);
    control.inhibitor[centerIndex] = 0.75;
    altered.inhibitor[centerIndex] = 0.75;
    altered.influence('nutrients', point.x, point.y);
    altered.influence('oxygen', point.x, point.y);
    altered.influence('buffer', point.x, point.y);
    expect(altered.species).toEqual(control.species);
    advance(altered, 12);
    advance(control, 12);
    expect(altered.nutrients[centerIndex]).toBeGreaterThan(control.nutrients[centerIndex]);
    expect(altered.oxygen[centerIndex]).toBeGreaterThan(control.oxygen[centerIndex]);
    expect(altered.inhibitor[centerIndex]).toBeLessThan(control.inhibitor[centerIndex]);
  });

  it('keeps chemical concentrations finite and bounded during competition', () => {
    const world = new MicrobialCommonsWorld(5, 27);
    advance(world, 650);
    expect(world.occupied).toBeGreaterThan(0);
    expect(world.occupied).toBeLessThanOrEqual(MICRO_SITES);
    for (const field of [world.nutrients, world.oxygen, world.metabolite, world.inhibitor]) {
      expect(field.every((value) => Number.isFinite(value) && value >= 0 && value <= 1.5)).toBe(
        true,
      );
    }
    expect(world.tolerance.every((value) => Number.isFinite(value))).toBe(true);
    expect(world.history.length).toBeLessThanOrEqual(160);
  });

  it('caps environmental fields and semantic cues and rejects malformed input', () => {
    expect(() => new MicrobialCommonsWorld(1, 61)).toThrow(RangeError);
    expect(() => new MicrobialCommonsWorld(1, -1)).toThrow(RangeError);
    const world = new MicrobialCommonsWorld(1, 3);
    const before = [...world.nutrients];
    for (const dt of [0, -1, NaN, Infinity, 0.5]) world.step(dt);
    expect([...world.nutrients]).toEqual(before);
    world.influence('oxygen', NaN, 300);
    world.influence('nutrients', 15, 15);
    world.influence('unknown', 600, 360);
    expect(world.fields).toHaveLength(0);
    for (let i = 0; i < 40; i++) world.influence('nutrients', 600, 360);
    expect(world.fields).toHaveLength(22);
    expect(world.audioCues.length).toBeLessThanOrEqual(16);
  });

  it('supports an empty dish without spontaneous organism creation', () => {
    const world = new MicrobialCommonsWorld(8, 0);
    advance(world, 120);
    expect(world.occupied).toBe(0);
    expect(world.exchanges).toBe(0);
    expect(world.metrics().find((m) => m.label === 'PRODUCERS')?.value).toBe('0');
  });
});
