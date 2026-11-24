import { Injectable, signal } from '@angular/core';

export const DEFAULT_SOUND_LEVELS = { master: 75, ambience: 38, events: 82 } as const;
export type SoundChannel = keyof typeof DEFAULT_SOUND_LEVELS;
export type SoundLevels = Readonly<Record<SoundChannel, number>>;

const STORAGE_KEYS: Record<SoundChannel, string> = {
  master: 'wild-life:volume',
  ambience: 'wild-life:ambience-volume',
  events: 'wild-life:events-volume',
};

function loadLevel(channel: SoundChannel): number {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEYS[channel]);
    const level = value?.trim() ? Number(value) : NaN;
    if (Number.isFinite(level) && level >= 0 && level <= 100) return level;
  } catch {
    // Storage may be unavailable in a private or embedded session.
  }
  return DEFAULT_SOUND_LEVELS[channel];
}

@Injectable({ providedIn: 'root' })
export class WorldAudioVolume {
  private readonly current = signal<SoundLevels>({
    master: loadLevel('master'),
    ambience: loadLevel('ambience'),
    events: loadLevel('events'),
  });
  readonly levels = this.current.asReadonly();

  set(channel: SoundChannel, level: number): void {
    if (!Number.isFinite(level)) return;
    const bounded = Math.max(0, Math.min(100, Math.round(level)));
    this.current.update((levels) => ({ ...levels, [channel]: bounded }));
    try {
      globalThis.localStorage?.setItem(STORAGE_KEYS[channel], String(bounded));
    } catch {
      // This session can still use the selected mix.
    }
  }
}
