import { LivingWorld, clamp } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

export interface Neuron {
  x: number;
  y: number;
  potential: number;
  trace: number;
  refractory: number;
  inhibitory: boolean;
}
export interface Synapse {
  from: number;
  to: number;
  weight: number;
  activity: number;
}

/** Leaky integrate-and-fire network with local coactivity-dependent plasticity. */
export class NeuroplasticityWorld extends LivingWorld {
  readonly neurons: Neuron[] = [];
  readonly synapses: Synapse[] = [];
  spikes = 0;
  formed = 0;
  pruned = 0;
  private remodel = 0;
  constructor(seed = 20261125) {
    super(seed);
    for (let i = 0; i < 110; i++) {
      const angle = this.random.range(0, Math.PI * 2),
        r = Math.sqrt(this.random.next());
      this.neurons.push({
        x: 600 + Math.cos(angle) * r * 480,
        y: 360 + Math.sin(angle) * r * 265,
        potential: this.random.range(0, 0.9),
        trace: 0,
        refractory: 0,
        inhibitory: i % 6 === 0,
      });
    }
    for (let i = 0; i < this.neurons.length; i++)
      for (let j = i + 1; j < this.neurons.length; j++) {
        const a = this.neurons[i],
          b = this.neurons[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 155 && this.random.next() < 0.52)
          this.synapses.push({
            from: i,
            to: j,
            weight: this.random.range(0.16, 0.65),
            activity: 0,
          });
      }
    this.sample(this.synapses.length, 0);
  }
  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (this.field(kind, x, y, ['stimulus', 'nourish', 'quiet'], dx, dy))
      this.cue(kind === 'stimulus' ? 'pulse' : kind === 'nourish' ? 'growth' : 'hush');
  }
  step(dt: number): void {
    if (!this.advance(dt)) return;
    const input = new Float64Array(this.neurons.length);
    for (const s of this.synapses) {
      const a = this.neurons[s.from],
        b = this.neurons[s.to];
      input[s.to] += a.trace * s.weight * (a.inhibitory ? -0.8 : 0.38);
      input[s.from] += b.trace * s.weight * (b.inhibitory ? -0.8 : 0.38);
      const support =
        (this.fieldAt('nourish', a.x, a.y) + this.fieldAt('nourish', b.x, b.y)) * 0.02;
      s.weight = clamp(s.weight + dt * (a.trace * b.trace * 0.13 - 0.0006 + support), 0.015, 1);
      s.activity = Math.max(a.trace, b.trace);
    }
    let fired = 0;
    for (let i = 0; i < this.neurons.length; i++) {
      const n = this.neurons[i];
      n.trace *= Math.exp(-dt * 3);
      n.refractory -= dt;
      const stimulation = this.fieldAt('stimulus', n.x, n.y),
        quiet = this.fieldAt('quiet', n.x, n.y);
      if (n.refractory <= 0)
        n.potential = clamp(
          n.potential +
            dt * (0.38 + input[i] + stimulation * 2.5 - quiet * 1.8 - n.potential * 0.15),
          0,
          1.5,
        );
      if (n.potential >= 1) {
        n.potential = 0;
        n.trace = 1;
        n.refractory = 0.35;
        fired++;
        this.spikes++;
      }
    }
    if (fired > 0) this.cue('nerve-spike', Math.min(0.64, 0.19 + fired / 24));
    this.remodel += dt;
    if (this.remodel >= 2) {
      this.remodel -= 2;
      for (let i = this.synapses.length - 1; i >= 0; i--)
        if (this.synapses[i].weight < 0.04) {
          this.synapses.splice(i, 1);
          this.pruned++;
          this.cue('circuit-release', 0.31);
        }
      for (let attempt = 0; attempt < 14 && this.synapses.length < 650; attempt++) {
        const from = this.random.integer(0, this.neurons.length),
          to = this.random.integer(0, this.neurons.length);
        const a = this.neurons[from],
          b = this.neurons[to];
        if (from === to || Math.hypot(a.x - b.x, a.y - b.y) > 170 || a.trace * b.trace < 0.02)
          continue;
        if (
          this.synapses.some(
            (s) => (s.from === from && s.to === to) || (s.from === to && s.to === from),
          )
        )
          continue;
        this.synapses.push({ from, to, weight: 0.2, activity: 0 });
        this.formed++;
        this.cue('circuit-join', 0.44, a.x, { toX: b.x });
      }
    }
    this.sample(this.synapses.length, this.neurons.filter((n) => n.trace > 0.3).length);
  }
  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'SYNAPSES',
        value: String(this.synapses.length),
        note: 'adaptive connections',
        tone: 'mint',
      },
      {
        label: 'ACTIVITY',
        value: String(this.neurons.filter((n) => n.trace > 0.3).length),
        note: 'recently firing neurons',
        tone: 'gold',
      },
      {
        label: 'NEW PATHWAYS',
        value: String(this.formed),
        note: 'coactive neighbors connect',
        tone: 'blue',
      },
      {
        label: 'PRUNED',
        value: String(this.pruned),
        note: 'weak connections recede',
        tone: 'coral',
      },
    ];
  }
}
