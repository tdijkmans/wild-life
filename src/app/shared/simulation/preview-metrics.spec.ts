import { PreviewMetricsStore } from './preview-metrics';

describe('PreviewMetricsStore', () => {
  it('starts empty and accepts world-independent metrics', () => {
    const store = new PreviewMetricsStore();
    expect(store.metrics()).toEqual([]);
    store.update([
      { label: 'PREY', value: 50, tone: 'mint' },
      { label: 'PREDATORS', value: 5, tone: 'coral' },
    ]);
    expect(store.metrics().map((metric) => metric.value)).toEqual([50, 5]);
  });

  it('copies metric arrays and can reset state on preview destruction', () => {
    const store = new PreviewMetricsStore();
    const values = [{ label: 'ENERGY', value: 42, tone: 'mint' as const }];
    store.update(values);
    values[0].value = 100;
    expect(store.metrics()).toHaveLength(1);
    // The store intentionally snapshots the array; world metrics are emitted as new values.
    expect(store.metrics()).not.toBe(values);
    store.reset();
    expect(store.metrics()).toEqual([]);
  });
});
