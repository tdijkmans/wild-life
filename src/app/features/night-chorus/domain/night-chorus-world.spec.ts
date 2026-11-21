import { NightChorusWorld } from './night-chorus-world';

describe('NightChorusWorld', () => {
  it('attaches a caller and a separate spatial reply to a successful pair', () => {
    const world = new NightChorusWorld(45841);
    for (let tick = 0; tick < 1800 && !world.pairs; tick++) world.step(1 / 60);
    const response = world.audioCues.find((event) => event.kind === 'paired-call');
    expect(['low-call', 'high-call']).toContain(response?.call);
    expect(response?.panTo).toBeDefined();
    expect(response?.panTo).not.toBe(response?.pan);
    expect(
      world.audioCues.some((event) => event.kind === 'low-call' || event.kind === 'high-call'),
    ).toBe(true);
  });

  it('replays local interactions and preserves reproductive invariants', () => {
    const world = new NightChorusWorld(45841);
    const replay = new NightChorusWorld(45841);
    for (const item of [world, replay]) {
      item.step(NaN);
      item.influence('warmth', Infinity, 350, 0, 0);
      expect(item.time).toBe(0);
      expect(item.fields).toHaveLength(0);
    }
    for (let tick = 0; tick < 60 * 175; tick++) {
      if (tick % 1800 === 360) {
        world.influence('warmth', 580, 350, 140, 14);
        replay.influence('warmth', 580, 350, 140, 14);
      }
      world.step(1 / 60);
      replay.step(1 / 60);
    }
    expect(world.metrics()).toEqual(replay.metrics());
    expect(world.history).toEqual(replay.history);
    expect(world.audioCues).toEqual(replay.audioCues);
    expect(world.audioCues.length).toBeLessThanOrEqual(16);
    expect(world.pairs).toBeGreaterThan(20);
    expect(world.mixedEncounters).toBeGreaterThan(0);
    expect(world.mixedPairs).toBeLessThan(world.mixedEncounters);
    expect(world.missedSignals).toBeGreaterThan(0);
    expect(world.voices.length).toBeLessThanOrEqual(144);
  });
});
