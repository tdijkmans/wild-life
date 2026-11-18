import { ReefWorld } from './reef-world';

function advance(world: ReefWorld, ticks: number): void {
  for (let i = 0; i < ticks; i++) world.step(1 / 60);
}

describe('Reef — coral symbiosis, competition and grazing', () => {
  it('replays colony growth, fish, algae, interventions and sound events exactly', () => {
    const run = () => {
      const world = new ReefWorld(32, 13, 28, 8);
      advance(world, 140);
      world.influence('cool', 510, 460);
      world.influence('nutrients', 690, 570);
      world.influence('current', 460, 330, 65, 20);
      advance(world, 340);
      return world;
    };
    const first = run();
    const second = run();
    expect(second.corals).toEqual(first.corals);
    expect(second.algae).toEqual(first.algae);
    expect(second.fish).toEqual(first.fish);
    expect(second.history).toEqual(first.history);
    expect(second.audioCues).toEqual(first.audioCues);
  });

  it('grows living branch geometry over simulated time', () => {
    const world = new ReefWorld(7, 12, 15, 0);
    const before = world.corals.map((colony) => colony.branches.map((branch) => branch.progress));
    advance(world, 600);
    expect(
      world.corals.some(
        (colony, i) =>
          colony.branches.length > before[i].length ||
          colony.branches.some((branch, j) => branch.progress > (before[i][j] ?? 0)),
      ),
    ).toBe(true);
    const geometry = world.branchGeometry(world.corals[0], 0);
    expect(Object.values(geometry).every(Number.isFinite)).toBe(true);
  });

  it('cool water reduces thermal stress and retains more symbionts', () => {
    const baseline = new ReefWorld(14, 7, 4, 0);
    const cooled = new ReefWorld(14, 7, 4, 0);
    const target = cooled.corals[0];
    baseline.corals[0].tolerance = 27.5;
    target.tolerance = 27.5;
    const initialTemp = cooled.temperatureAt(target.x, target.y - 130);
    cooled.influence('cool', target.x, target.y - 130);
    expect(cooled.temperatureAt(target.x, target.y - 130)).toBeLessThan(initialTemp - 1);
    advance(baseline, 360);
    advance(cooled, 360);
    expect(cooled.corals[0].symbionts).toBeGreaterThan(baseline.corals[0].symbionts);
  });

  it('grazers actually eat algae, removing competing biomass', () => {
    const fed = new ReefWorld(18, 3, 4, 1);
    const control = new ReefWorld(18, 3, 4, 0);
    const patch = fed.algae[0];
    fed.fish[0].x = patch.x;
    fed.fish[0].y = patch.y;
    fed.fish[0].vx = 0;
    fed.fish[0].vy = 0;
    advance(fed, 80);
    advance(control, 80);
    expect(fed.grazingEvents).toBeGreaterThan(0);
    expect(fed.algae[0].mass).toBeLessThan(control.algae[0].mass);
  });

  it('keeps resources, positions, fields and ecological measures bounded', () => {
    const world = new ReefWorld(19, 28, 72, 18);
    for (let i = 0; i < 36; i++) world.influence('nutrients', 590, 510);
    expect(world.fields.length).toBeLessThanOrEqual(24);
    advance(world, 600);
    expect(world.corals.length).toBeLessThanOrEqual(36);
    expect(world.fish.length).toBeLessThanOrEqual(35);
    expect(world.algae.length).toBeLessThanOrEqual(115);
    for (const coral of world.corals) {
      expect([coral.energy, coral.symbionts, coral.x, coral.y].every(Number.isFinite)).toBe(true);
      expect(coral.branches.length).toBeLessThanOrEqual(62);
      expect(coral.symbionts).toBeGreaterThanOrEqual(0);
      expect(coral.symbionts).toBeLessThanOrEqual(1);
    }
    expect(world.history.length).toBeGreaterThan(2);
    expect(world.history.length).toBeLessThanOrEqual(160);
  });

  it('validates initial populations and rejects invalid timing or intervention coordinates', () => {
    expect(() => new ReefWorld(1, 37, 0, 0)).toThrow(RangeError);
    expect(() => new ReefWorld(1, 0, 116, 0)).toThrow(RangeError);
    expect(() => new ReefWorld(1, 0, 0, 36)).toThrow(RangeError);
    const world = new ReefWorld(1, 0, 0, 0);
    const before = structuredClone(world.corals);
    for (const dt of [-1, 0, NaN, Infinity, 0.4]) world.step(dt);
    expect(world.time).toBe(0);
    expect(world.corals).toEqual(before);
    world.influence('nutrients', NaN, 250);
    world.influence('cool', 2000, 50);
    world.influence('unknown', 500, 500);
    expect(world.fields).toHaveLength(0);
    advance(world, 120);
    expect(world.metrics().find((m) => m.label === 'SYMBIOSIS')?.value).toBe('0%');
  });
});
