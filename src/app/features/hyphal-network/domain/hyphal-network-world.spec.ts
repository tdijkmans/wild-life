import { HyphalNetworkWorld } from './hyphal-network-world';

describe('Hyphal Network', () => {
  it('grows a connected network whose transport moves down the pressure gradient', () => {
    const world = new HyphalNetworkWorld(84296);
    for (let i = 0; i < 60 * 42; i++) world.step(1 / 60);
    expect(world.nodes.length).toBeGreaterThan(36);
    expect(world.uptake).toBeGreaterThan(0);
    expect(world.fusions).toBeGreaterThan(0);
    expect(world.hyphae.length).toBe(world.nodes.length - 1 + world.fusions);
    let flowing = 0;
    for (const edge of world.hyphae) {
      if (edge.flux === 0) continue;
      flowing++;
      const difference = world.nodes[edge.start].pressure - world.nodes[edge.end].pressure;
      expect(edge.flux * difference).toBeGreaterThan(0);
      expect(edge.transport).toBeGreaterThanOrEqual(0);
      expect(edge.transport).toBeLessThan(1);
    }
    expect(flowing).toBeGreaterThan(10);
  });

  it('emits different positional cues for lateral branches and leading growth', () => {
    const world = new HyphalNetworkWorld(84296);
    let branch = false;
    let growth = false;
    for (let i = 0; i < 60 * 24 && !(branch && growth); i++) {
      world.step(1 / 60);
      for (const cue of world.audioCues) {
        if (cue.kind !== 'hyphal-branch' && cue.kind !== 'hyphal-growth') continue;
        expect(cue.pan).toBeDefined();
        expect(cue.panTo).toBeDefined();
        branch ||= cue.kind === 'hyphal-branch';
        growth ||= cue.kind === 'hyphal-growth';
      }
    }
    expect(branch).toBe(true);
    expect(growth).toBe(true);
  });

  it('extends new links across multiple ticks and smooths changes in streaming flux', () => {
    const world = new HyphalNetworkWorld(84296);
    for (let i = 0; i < 60 * 13; i++) world.step(1 / 60);
    const edge = world.hyphae.find((candidate) => candidate.growth > 0 && candidate.growth < 0.8)!;
    expect(edge).toBeDefined();
    const start = edge.growth;
    const flux = edge.streamingFlux;
    world.step(1 / 60);
    expect(edge.growth - start).toBeGreaterThan(0);
    expect(edge.growth - start).toBeLessThan(0.005);
    expect(Math.abs(edge.streamingFlux - flux)).toBeLessThanOrEqual(Math.abs(edge.flux - flux));
    for (let i = 0; i < 60 * 8; i++) world.step(1 / 60);
    expect(edge.growth).toBe(1);
  });

  it('changes transport when mist changes the conductance near the colony', () => {
    const control = new HyphalNetworkWorld(25);
    const wet = new HyphalNetworkWorld(25);
    wet.influence('mist', 582, 345, 0, 0);
    wet.influence('food', Infinity, 345, 0, 0);
    for (let i = 0; i < 36; i++) {
      control.step(1 / 60);
      wet.step(1 / 60);
    }
    expect(wet.hyphae.map((edge) => edge.flux)).not.toEqual(
      control.hyphae.map((edge) => edge.flux),
    );
    expect(wet.food).toEqual(control.food);
  });
});
