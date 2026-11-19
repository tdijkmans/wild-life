import { SeededRandom } from './seeded-random';
import type {
  InteractiveWorld,
  WorldAudioCue,
  WorldHistoryPoint,
  WorldMetric,
} from '../world-experience/world-protocol';

export const clamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, n));
export interface InfluenceField {
  kind: string;
  x: number;
  y: number;
  life: number;
  radius: number;
}

/** Bounded bookkeeping only. Each feature owns its ecological rules. */
export abstract class LivingWorld implements InteractiveWorld {
  readonly width = 1200;
  readonly height = 720;
  readonly history: WorldHistoryPoint[] = [];
  readonly audioCues: WorldAudioCue[] = [];
  readonly fields: InfluenceField[] = [];
  protected readonly random: SeededRandom;
  private cueId = 0;
  private sampleAt = 0;
  time = 0;
  constructor(readonly seed: number) {
    this.random = new SeededRandom(seed);
  }
  protected advance(dt: number): boolean {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return false;
    this.time += dt;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      this.fields[i].life -= dt;
      if (this.fields[i].life <= 0) this.fields.splice(i, 1);
    }
    return true;
  }
  protected field(
    kind: string,
    x: number,
    y: number,
    allowed: readonly string[],
    dx: number,
    dy: number,
  ): boolean {
    if (
      !allowed.includes(kind) ||
      ![x, y, dx, dy].every(Number.isFinite) ||
      x < 0 ||
      y < 0 ||
      x > this.width ||
      y > this.height
    )
      return false;
    this.fields.push({ kind, x, y, life: 14, radius: 170 });
    if (this.fields.length > 20) this.fields.shift();
    return true;
  }
  fieldAt(kind: string, x: number, y: number): number {
    return this.fields.reduce(
      (sum, f) =>
        sum +
        (f.kind === kind
          ? Math.max(0, 1 - Math.hypot(x - f.x, y - f.y) / f.radius) * Math.min(1, f.life / 3)
          : 0),
      0,
    );
  }
  protected cue(kind: WorldAudioCue['kind'], strength = 0.4): void {
    this.audioCues.push({ id: ++this.cueId, kind, strength });
    if (this.audioCues.length > 16) this.audioCues.shift();
  }
  protected sample(primary: number, secondary: number): void {
    if (this.time < this.sampleAt) return;
    this.sampleAt = this.time + 1;
    this.history.push({ time: this.time, primary, secondary });
    if (this.history.length > 160) this.history.shift();
  }
  abstract step(dt: number): void;
  abstract influence(kind: string, x: number, y: number, dx: number, dy: number): void;
  abstract metrics(): readonly WorldMetric[];
}
