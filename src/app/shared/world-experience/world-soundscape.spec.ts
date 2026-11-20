import { WorldSoundscape, worldOutputGain } from './world-soundscape';

describe('User-controlled procedural soundscape', () => {
  it('has a quiet end, an audible default and a bounded maximum', () => {
    expect(worldOutputGain(0)).toBe(0);
    expect(worldOutputGain(100)).toBe(1.2);
    expect(worldOutputGain(300)).toBe(1.2);
    expect(worldOutputGain(75)).toBeGreaterThan(worldOutputGain(50));
    expect(worldOutputGain(75) * 0.034).toBeGreaterThan(4 * 0.26 * 0.021);
  });

  it('does not initialize or play sound merely because a world is created', async () => {
    const sound = new WorldSoundscape();
    expect(sound.enabled).toBe(false);
    sound.cue({ kind: 'bloom', strength: 1 });
    sound.modulate(1200);
    await sound.setActive(false);
    expect(sound.enabled).toBe(false);
    await sound.stop();
    expect(sound.enabled).toBe(false);
  });

  it('handles audio unavailable in a non-browser unit environment', async () => {
    const sound = new WorldSoundscape();
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
      expect(await sound.start('forest')).toBe(false);
    }
    await sound.stop();
  });
});
