import { WorldSoundscape } from './world-soundscape';

describe('User-controlled procedural soundscape', () => {
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
