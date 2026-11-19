import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { VascularGardenWorld } from '../domain/vascular-garden-world';
export class VascularGardenRenderer extends LivingCanvas<VascularGardenWorld> {
  render(): void {
    this.begin(285);
    const c = this.ctx,
      w = this.world;
    for (const t of w.tissue) {
      this.glow(t.x, t.y, 44, 190 + t.oxygen * 40, 0.04 + t.oxygen * 0.1);
      c.strokeStyle = `rgba(143,182,211,${0.06 + t.oxygen * 0.1})`;
      c.lineWidth = 0.6;
      c.beginPath();
      c.arc(t.x, t.y, 13 + 5 * t.demand, 0, Math.PI * 2);
      c.stroke();
      this.dot(t.x, t.y, 1.8, t.oxygen > 0.5 ? 185 : 285, 0.4);
    }
    for (const v of w.vessels) {
      const a = w.nodes[v.a],
        b = w.nodes[v.b],
        hue = 345 + (a.pressure + b.pressure) * 15;
      c.lineCap = 'round';
      c.strokeStyle = `hsla(${hue},75%,55%,0.1)`;
      c.lineWidth = v.radius * 5;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      c.strokeStyle = `hsla(${hue},80%,72%,${0.28 + Math.min(0.6, Math.abs(v.flow) * 10)})`;
      c.lineWidth = v.radius * 1.5;
      c.stroke();
      if (Math.abs(v.flow) > 0.0001)
        for (let k = 0; k < 2; k++) {
          const p =
            (((w.time * (0.12 + Math.min(1, Math.abs(v.flow) * 5)) * Math.sign(v.flow) +
              k / 2 +
              v.a * 0.17) %
              1) +
              1) %
            1;
          this.dot(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, 1.7, 25, 0.85);
        }
    }
    this.fields(w.fields, 195);
  }
}
