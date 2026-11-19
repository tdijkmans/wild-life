import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { ChromaticCommonsWorld } from '../domain/chromatic-commons-world';
export class ChromaticCommonsRenderer extends LivingCanvas<ChromaticCommonsWorld> {
  render(): void {
    this.begin(255);
    const c = this.ctx,
      w = this.world,
      hues = [170, 285, 25, 210];
    for (let i = 0; i < w.cells.length; i++)
      for (let j = i + 1; j < w.cells.length; j++) {
        const a = w.cells[i],
          b = w.cells[j],
          d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 34 || a.kind !== b.kind) continue;
        c.strokeStyle = `hsla(${hues[a.kind]},80%,65%,${(1 - d / 34) * 0.22})`;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
    for (const a of w.cells) {
      const hue = hues[a.kind],
        r = 4 + Math.min(1, a.energy) * 3;
      this.glow(a.x, a.y, r * 4, hue, 0.22);
      c.strokeStyle = `hsla(${hue},90%,78%,0.6)`;
      c.lineWidth = 0.8;
      c.beginPath();
      c.arc(a.x, a.y, r + 2, 0, Math.PI * 2);
      c.stroke();
      this.dot(a.x, a.y, r, hue, 0.45);
      this.dot(a.x + 1, a.y - 1, 1.5, hue, 0.95);
    }
    this.fields(w.fields, 210);
  }
}
