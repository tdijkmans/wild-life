import { SilverShoalsWorld } from './silver-shoals-world';

describe('SilverShoalsWorld', () => {
  it('replays local interactions and preserves reproductive invariants', () => {
    const world = new SilverShoalsWorld(90198);
    const replay = new SilverShoalsWorld(90198);
    for (const item of [world, replay]) {
      item.step(NaN);
      item.influence('current', Infinity, 350, 0, 0);
      expect(item.time).toBe(0);
      expect(item.fields).toHaveLength(0);
    }
    let matureHybridObserved = false;
    for (let tick = 0; tick < 60 * 175; tick++) {
      if (tick % 1800 === 360) {
        world.influence('current', 580, 350, 140, 14);
        replay.influence('current', 580, 350, 140, 14);
      }
      world.step(1 / 60);
      replay.step(1 / 60);
      for (const hatch of world.hatches) {
        expect(hatch.first.lineage).not.toBe('hybrid');
        expect(hatch.second.lineage).not.toBe('hybrid');
      }
      matureHybridObserved ||= world.fish.some(
        (fish) => fish.lineage === 'hybrid' && fish.age > 16,
      );
    }
    expect(world.metrics()).toEqual(replay.metrics());
    expect(world.history).toEqual(replay.history);
    expect(world.audioCues).toEqual(replay.audioCues);
    expect(world.audioCues.length).toBeLessThanOrEqual(16);
    expect(world.hybridBirths).toBeGreaterThan(0);
    expect(world.parentBirths).toBeGreaterThan(0);
    expect(matureHybridObserved).toBe(true);
    expect(world.latestHybrid?.first.lineage).not.toBe(world.latestHybrid?.second.lineage);
    expect(world.fish.length).toBeLessThanOrEqual(170);
  });
});
