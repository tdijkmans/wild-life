import { AbyssalBloomWorld } from './abyssal-bloom-world';

function advance(world: AbyssalBloomWorld, ticks: number): void {
  for (let i = 0; i < ticks; i++) world.step(1 / 60);
}

describe('Abyssal Bloom nutrient and grazing ecology', () => {
  it('repeats complete populations, fields, nutrient grids and sound events for a fixed seed', () => {
    const run = () => {
      const world = new AbyssalBloomWorld(99, 170, 16);
      advance(world, 145);
      world.influence('upwelling', 550, 320);
      world.influence('current', 610, 390, 65, -28);
      world.influence('light', 490, 250);
      advance(world, 320);
      return world;
    };
    const first = run();
    const second = run();
    expect(second.phytoplankton).toEqual(first.phytoplankton);
    expect(second.grazers).toEqual(first.grazers);
    expect([...second.nutrients]).toEqual([...first.nutrients]);
    expect(second.audioCues).toEqual(first.audioCues);
    expect(second.history).toEqual(first.history);
  });

  it('upwelling releases actual nutrients instead of only creating a glow', () => {
    const world = new AbyssalBloomWorld(5, 30, 3);
    const before = world.nutrientAt(500, 360);
    world.influence('upwelling', 500, 360);
    expect(world.nutrientAt(500, 360)).toBeGreaterThan(before);
    advance(world, 30);
    expect(world.nutrients.every((value) => Number.isFinite(value) && value >= 0 && value <= 1.5)).toBe(true);
  });

  it('local light changes photosynthesis and eventually diverges from the control', () => {
    const control = new AbyssalBloomWorld(18, 115, 0);
    const illuminated = new AbyssalBloomWorld(18, 115, 0);
    const target = illuminated.phytoplankton[0];
    illuminated.influence('light', target.x, target.y);
    advance(control, 200);
    advance(illuminated, 200);
    expect(illuminated.phytoplankton).not.toEqual(control.phytoplankton);
  });

  it('zooplankton actively feed and reduce living producer biomass', () => {
    const world = new AbyssalBloomWorld(15, 1, 1);
    const producer = world.phytoplankton[0];
    const grazer = world.grazers[0];
    grazer.x = producer.x;
    grazer.y = producer.y;
    grazer.vx = 0;
    grazer.vy = 0;
    const before = producer.energy;
    advance(world, 40);
    expect(producer.energy).toBeLessThan(before);
    expect(world.grazingEvents).toBeGreaterThan(0);
    expect(grazer.feedingGlow).toBeGreaterThanOrEqual(0);
  });

  it('limits plankton populations and dynamic fields, and bounds positions', () => {
    const world = new AbyssalBloomWorld(26, 450, 32);
    for (let i = 0; i < 40; i++) world.influence('current', 450, 320, 20, -15);
    expect(world.fields.length).toBeLessThanOrEqual(22);
    advance(world, 580);
    expect(world.phytoplankton.length).toBeLessThanOrEqual(1250);
    expect(world.grazers.length).toBeLessThanOrEqual(80);
    for (const plankton of world.phytoplankton) {
      expect(plankton.x).toBeGreaterThanOrEqual(0);
      expect(plankton.x).toBeLessThanOrEqual(world.width);
      expect(plankton.y).toBeGreaterThanOrEqual(0);
      expect(plankton.y).toBeLessThanOrEqual(world.height);
      expect([plankton.energy, plankton.vx, plankton.vy].every(Number.isFinite)).toBe(true);
    }
    expect(world.luminousFraction).toBeGreaterThanOrEqual(0);
    expect(world.luminousFraction).toBeLessThanOrEqual(100);
  });

  it('handles an empty sea and malformed inputs without changing biological time', () => {
    const world = new AbyssalBloomWorld(1, 0, 0);
    const before = [...world.nutrients];
    for (const dt of [0, -1, Infinity, NaN, 0.3]) world.step(dt);
    world.influence('light', NaN, 230);
    world.influence('current', 20, -10);
    world.influence('unknown', 300, 290);
    expect(world.time).toBe(0);
    expect([...world.nutrients]).toEqual(before);
    expect(world.fields).toHaveLength(0);
    advance(world, 120);
    expect(world.phytoplankton).toHaveLength(0);
    expect(world.history.length).toBeGreaterThan(1);
    expect(() => new AbyssalBloomWorld(1, 1251, 0)).toThrow(RangeError);
    expect(() => new AbyssalBloomWorld(1, 1, 81)).toThrow(RangeError);
  });
});
