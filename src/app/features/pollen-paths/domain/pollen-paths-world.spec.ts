import { PollenPathsWorld } from './pollen-paths-world';

describe('PollenPathsWorld', () => {
  it('replays local interactions and preserves reproductive invariants', () => {
    const world = new PollenPathsWorld(15725);
    const replay = new PollenPathsWorld(15725);
    for (const item of [world, replay]) {
      item.step(NaN);
      item.influence('sunlight', Infinity, 350, 0, 0);
      expect(item.time).toBe(0);
      expect(item.fields).toHaveLength(0);
    }
    for (let tick = 0; tick < 60 * 175; tick++) {
      if (tick % 1800 === 360) {
        world.influence('sunlight', 580, 350, 140, 14);
        replay.influence('sunlight', 580, 350, 140, 14);
      }
      world.step(1 / 60);
      replay.step(1 / 60);
    }
    expect(world.metrics()).toEqual(replay.metrics());
    expect(world.history).toEqual(replay.history);
    expect(world.audioCues).toEqual(replay.audioCues);
    expect(world.audioCues.length).toBeLessThanOrEqual(16);
    expect(world.visits).toBeGreaterThan(world.transfers);
    expect(world.transfers).toBeGreaterThan(40);
    expect(world.crossTransfers).toBeLessThan(world.transfers / 3);
    expect(world.generations).toBeGreaterThan(1);
    expect(world.deliveries.length).toBeLessThanOrEqual(36);
    expect(world.flowers.length).toBeLessThanOrEqual(180);
  });
});
