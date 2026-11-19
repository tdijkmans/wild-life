import { NeuroplasticityWorld } from './neuroplasticity-world';
describe('Neuroplasticity', () => {
  it('repeats activity, plasticity and events for the same seed and input', () => {
    const run = () => {
      const w = new NeuroplasticityWorld(42);
      w.influence('stimulus', 600, 360);
      for (let i = 0; i < 600; i++) w.step(1 / 60);
      return w;
    };
    const a = run(),
      b = run();
    expect(a.neurons).toEqual(b.neurons);
    expect(a.synapses).toEqual(b.synapses);
    expect(a.audioCues).toEqual(b.audioCues);
  });
  it('stimulation changes firing and local learning; quiet suppresses it', () => {
    const active = new NeuroplasticityWorld(7),
      quiet = new NeuroplasticityWorld(7);
    active.influence('stimulus', 600, 360);
    quiet.influence('quiet', 600, 360);
    for (let i = 0; i < 600; i++) {
      active.step(1 / 60);
      quiet.step(1 / 60);
    }
    expect(active.spikes).toBeGreaterThan(quiet.spikes);
    expect(active.synapses).not.toEqual(quiet.synapses);
  });
  it('prunes unused weak connections and rejects malformed interventions', () => {
    const w = new NeuroplasticityWorld(3);
    w.synapses[0].weight = 0.015;
    w.neurons.forEach((n) => {
      n.potential = 0;
      n.refractory = 20;
    });
    for (let i = 0; i < 130; i++) w.step(1 / 60);
    expect(w.pruned).toBeGreaterThan(0);
    const time = w.time;
    w.step(NaN);
    w.step(-1);
    w.influence('stimulus', NaN, 10);
    expect(w.time).toBe(time);
    expect(w.fields).toHaveLength(0);
    expect(w.synapses.every((s) => s.weight >= 0.015 && s.weight <= 1)).toBe(true);
  });
});
