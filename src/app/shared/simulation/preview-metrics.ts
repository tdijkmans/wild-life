import { Injectable, signal } from '@angular/core';

export type PreviewMetricTone = 'mint' | 'coral' | 'blue' | 'gold';

export interface PreviewMetric {
  readonly label: string;
  readonly value: string | number;
  readonly tone: PreviewMetricTone;
}

/**
 * Preview UI contract shared by Home and any lazy-loaded world preview.
 * Scoped to the Home component, never a global or cross-world singleton.
 */
@Injectable()
export class PreviewMetricsStore {
  readonly metrics = signal<readonly PreviewMetric[]>([]);

  update(metrics: readonly PreviewMetric[]): void {
    this.metrics.set([...metrics]);
  }

  reset(): void {
    this.metrics.set([]);
  }
}
