import { Injectable, signal } from '@angular/core';

export const DEFAULT_WORLD_VOLUME = 75;
const KEY = 'wild-life:volume';

function loadVolume(): number {
  try {
    const stored = globalThis.localStorage?.getItem(KEY);
    if (stored != null && stored.trim() !== '') {
      const volume = Number(stored);
      if (Number.isFinite(volume) && volume >= 0 && volume <= 100) return volume;
    }
  } catch {
    // Sound remains usable when storage is blocked.
  }
  return DEFAULT_WORLD_VOLUME;
}

@Injectable({ providedIn: 'root' })
export class WorldAudioVolume {
  private readonly current = signal(loadVolume());
  readonly level = this.current.asReadonly();

  set(level: number): void {
    if (!Number.isFinite(level)) return;
    const bounded = Math.max(0, Math.min(100, Math.round(level)));
    this.current.set(bounded);
    try {
      globalThis.localStorage?.setItem(KEY, String(bounded));
    } catch {
      // This session can still use the selected volume.
    }
  }
}
