import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { NeuroplasticityWorld } from '../domain/neuroplasticity-world';
export class NeuroplasticityRenderer extends LivingCanvas<NeuroplasticityWorld> {
  render(): void {
    this.begin(245);
    const c = this.ctx,
      w = this.world;
    this.fields(w.fields, 265);
    for (const s of w.synapses) {
      const a = w.neurons[s.from],
        b = w.neurons[s.to];
      c.strokeStyle = `hsla(${a.inhibitory ? 325 : 185},75%,70%,${0.08 + s.weight * 0.3 + s.activity * 0.25})`;
      c.lineWidth = 0.4 + s.weight * 2;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.quadraticCurveTo((a.x + b.x) / 2 + 12, (a.y + b.y) / 2 - 14, b.x, b.y);
      c.stroke();
      if (s.activity > 0.15) {
        const p = (w.time * 0.8 + s.from * 0.13) % 1;
        this.dot(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, 1.5, 185, s.activity);
      }
    }
    for (const n of w.neurons) {
      const hue = n.inhibitory ? 315 : 182;
      this.glow(n.x, n.y, 20 + n.trace * 17, hue, 0.12 + n.trace * 0.4);
      this.dot(n.x, n.y, 3 + n.trace * 2.5, hue);
      c.strokeStyle = `hsla(${hue},80%,80%,0.2)`;
      c.lineWidth = 0.7;
      c.beginPath();
      c.arc(n.x, n.y, 7, 0, Math.PI * 2);
      c.stroke();
    }
  }
}
