import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { IslandEvolutionWorld } from '../domain/island-evolution-world';
export class IslandEvolutionRenderer extends LivingCanvas<IslandEvolutionWorld> {
  render(): void {
    this.begin(220);
    const c = this.ctx,
      w = this.world;
    for (let i = 0; i < 12; i++) {
      c.strokeStyle = 'rgba(130,185,220,0.035)';
      c.lineWidth = 1;
      c.beginPath();
      for (let x = 0; x <= 1200; x += 20) {
        const y = 45 + i * 60 + Math.sin(x * 0.012 + i + w.time * 0.15) * 12;
        if (!x) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    for (const p of w.passages) {
      const a = w.islands[p.from],
        b = w.islands[p.to];
      c.strokeStyle = 'rgba(173,235,224,0.28)';
      c.lineWidth = 12;
      c.setLineDash([4, 12]);
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      c.setLineDash([]);
    }
    w.islands.forEach((land, i) => {
      const hue = 170 + land.optimum * 140;
      this.glow(land.x, land.y, land.radius + 45, hue, 0.22);
      c.fillStyle = `hsla(${hue},35%,20%,0.65)`;
      c.strokeStyle = `hsla(${hue},55%,70%,0.3)`;
      c.lineWidth = 1.5;
      c.beginPath();
      for (let k = 0; k <= 80; k++) {
        const a = (k / 80) * Math.PI * 2,
          r = land.radius * (1 + 0.045 * Math.sin(a * 7 + i));
        const x = land.x + Math.cos(a) * r,
          y = land.y + Math.sin(a) * r;
        if (!k) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(222,240,232,0.65)';
      c.font = '12px monospace';
      c.textAlign = 'center';
      c.fillText(
        ['MOSS / COOL', 'ORCHID / WARM', 'ESTUARY / MILD'][i],
        land.x,
        land.y + land.radius + 30,
      );
    });
    for (const a of w.organisms) {
      const hue = 170 + a.trait * 140;
      this.dot(a.x, a.y, 3.2, hue, 0.8);
      if (a.generation > 1) this.dot(a.x, a.y, 1, 50, 0.8);
    }
    this.fields(w.fields, 185);
  }
}
