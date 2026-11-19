import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import type { SilverShoalsWorld } from '../domain/silver-shoals-world';

export class SilverShoalsRenderer extends LivingCanvas<SilverShoalsWorld> {
  render(): void {
    this.begin(191);
    const c = this.ctx;
    const t = this.world.time;
    for (let i = 0; i < 27; i++) {
      const y = 60 + i * 25;
      const change = Math.sin(t * 0.7 + i * 0.55) * 24;
      c.strokeStyle = 'hsla(' + (170 + i * 2) + ',69%,61%,0.13)';
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(330, y + change - 160, 760, y - change + 155, 1200, y - 32);
      c.stroke();
    }
    this.glow(582, 350, 305, 174, 0.17);
    for (const f of this.world.fields)
      this.glow(f.x, f.y, f.radius, f.kind === 'current' ? 187 : 91, 0.19);
    for (const hatch of this.world.hatches) {
      const age = t - hatch.time;
      const fish = hatch.offspring;
      const hybrid = fish.lineage === 'hybrid';
      c.strokeStyle = 'rgba(226,255,241,' + 0.64 * (1 - age / 6) + ')';
      if (hybrid) {
        c.beginPath();
        c.moveTo(hatch.first.x, hatch.first.y);
        c.lineTo(fish.x, fish.y);
        c.lineTo(hatch.second.x, hatch.second.y);
        c.stroke();
      }
      c.beginPath();
      c.arc(fish.x, fish.y, 4 + age * 10, 0, Math.PI * 2);
      c.stroke();
    }
    for (const fish of this.world.fish) {
      const hue = fish.lineage === 'amber' ? 41 : fish.lineage === 'blue' ? 191 : 249;
      const size = Math.min(1, 0.36 + fish.age / 21);
      const angle = Math.atan2(fish.vy, fish.vx);
      this.glow(fish.x, fish.y, 16 * size + 4, hue, fish.lineage === 'hybrid' ? 0.37 : 0.23);
      c.save();
      c.translate(fish.x, fish.y);
      c.rotate(angle);
      c.scale(size, size);
      c.fillStyle = fish.lineage === 'hybrid' ? '#ebefff' : 'hsl(' + hue + ',75%,71%)';
      c.beginPath();
      c.moveTo(9, 0);
      c.quadraticCurveTo(0, -5, -6, -1);
      c.lineTo(-12, -4 + Math.sin(t * 10 + fish.id) * 2);
      c.lineTo(-9, 0);
      c.lineTo(-12, 4 + Math.sin(t * 10 + fish.id) * 2);
      c.lineTo(-6, 1);
      c.quadraticCurveTo(0, 5, 9, 0);
      c.fill();
      c.restore();
    }
  }
}
