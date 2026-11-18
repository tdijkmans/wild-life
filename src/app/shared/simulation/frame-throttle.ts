/**
 * Visual-frame limiter. Does not influence the model's integration timestep.
 * Timestamp-driven rather than counter-driven so 60/120/144 Hz screens behave alike.
 */
export class FrameThrottle {
  private previousDrawMs: number | null = null;
  private readonly intervalMs: number;

  constructor(maxFramesPerSecond: number) {
    if (!Number.isFinite(maxFramesPerSecond) || maxFramesPerSecond <= 0) {
      throw new RangeError('maxFramesPerSecond must be finite and positive');
    }
    this.intervalMs = 1000 / maxFramesPerSecond;
  }

  shouldRender(nowMs: number): boolean {
    if (!Number.isFinite(nowMs)) return false;
    if (
      this.previousDrawMs !== null &&
      nowMs >= this.previousDrawMs &&
      nowMs - this.previousDrawMs + 1e-6 < this.intervalMs
    ) {
      return false;
    }
    this.previousDrawMs = nowMs;
    return true;
  }

  reset(): void {
    this.previousDrawMs = null;
  }
}
