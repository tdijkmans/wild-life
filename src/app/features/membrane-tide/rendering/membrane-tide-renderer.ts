import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import type { MembraneTideWorld } from '../domain/membrane-tide-world';

export class MembraneTideRenderer extends LivingCanvas<MembraneTideWorld> {
  render(): void {
    this.begin(192);
    const c = this.ctx;
    const { time, ribbons, vortices, pebbles } = this.world;
    this.glow(300, 110, 480, 174, 0.11);
    this.glow(1030, 590, 415, 264, 0.16);
    for (let i = 0; i < 135; i++) {
      const x = (i * 143.63 + Math.sin(time * 0.28 + i) * 26 + 1200) % 1200;
      const y = (i * 77.11 + Math.cos(time * 0.17 + i * 1.17) * 20 + 720) % 720;
      this.dot(x, y, 0.65 + (i % 4) * 0.24, 185 + (i % 35), 0.14 + (i % 5) * 0.034);
    }
    for (const vortex of vortices) {
      const fade = Math.min(1, vortex.life / 2);
      this.glow(vortex.x, vortex.y, 185, 178, 0.13 * fade);
      for (let arm = 0; arm < 3; arm++) {
        c.beginPath();
        c.strokeStyle = 'rgba(151, 237, 221, ' + 0.19 * fade + ')';
        for (let i = 0; i <= 46; i++) {
          const angle = time * vortex.spin * 1.7 + arm * 2.094 + i * 0.075;
          const radius = 6 + i * 3.5;
          const x = vortex.x + Math.cos(angle) * radius;
          const y = vortex.y + Math.sin(angle) * radius;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
    }
    for (const ribbon of ribbons) {
      const points = ribbon.patches;
      const hue = ribbon.closed ? 164 : 204;
      if (ribbon.closed) {
        const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
        const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
        const radius = Math.max(...points.map((point) => Math.hypot(point.x - x, point.y - y)));
        const fresh = Math.max(0, 1 - (time - ribbon.sealedAt) / 1.6);
        const fill = c.createRadialGradient(x, y, 2, x, y, Math.max(3, radius));
        fill.addColorStop(0, 'rgba(52, 137, 183, 0.27)');
        fill.addColorStop(0.8, 'rgba(46, 199, 153, 0.09)');
        fill.addColorStop(1, 'rgba(112, 243, 197, 0.30)');
        c.beginPath();
        points.forEach((point, index) => {
          if (index === 0) c.moveTo(point.x, point.y);
          else c.lineTo(point.x, point.y);
        });
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        if (fresh > 0) this.glow(x, y, radius + 24, 156, fresh * 0.29);
      }

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const previous = points[i - 1] ?? (ribbon.closed ? points.at(-1)! : point);
        const next = points[i + 1] ?? (ribbon.closed ? points[0] : point);
        const dx = next.x - previous.x;
        const dy = next.y - previous.y;
        const length = Math.hypot(dx, dy);
        const nx = length > 0 ? -dy / length : 0;
        const ny = length > 0 ? dx / length : 1;
        if (i < points.length - 1 || ribbon.closed) {
          c.beginPath();
          c.moveTo(point.x, point.y);
          c.lineTo(next.x, next.y);
          c.lineWidth = 8;
          c.strokeStyle = 'hsla(' + (hue + 24) + ', 73%, 58%, 0.22)';
          c.stroke();
        }
        // Opposing heads bracket the lipid-tail interior. Paired marks move with each patch.
        for (const offset of [-3.1, 3.1]) {
          const x = point.x + ny * offset;
          const y = point.y - nx * offset;
          c.beginPath();
          c.moveTo(x - nx * 4.3, y - ny * 4.3);
          c.lineTo(x + nx * 4.3, y + ny * 4.3);
          c.lineWidth = 1;
          c.strokeStyle = 'rgba(159, 185, 218, 0.43)';
          c.stroke();
          this.dot(x - nx * 4.3, y - ny * 4.3, 1.65, hue + 19, 0.88);
          this.dot(x + nx * 4.3, y + ny * 4.3, 1.75, hue - 10, 0.92);
        }
        if (!ribbon.closed && (i === 0 || i === points.length - 1)) {
          this.glow(point.x, point.y, 13, 34, 0.4);
          this.dot(point.x, point.y, 1.65, 41, 0.9);
        }
      }
    }

    for (const pebble of pebbles) {
      const radius = this.world.waveRadius(pebble);
      const fall = Math.max(0, 1 - pebble.age / 0.36);
      const fade = Math.max(0, 1 - radius / 292);
      if (radius > 0) {
        c.lineWidth = 2;
        c.strokeStyle = 'rgba(174, 233, 251, ' + 0.75 * fade + ')';
        c.beginPath();
        c.arc(pebble.x, pebble.y, radius, 0, Math.PI * 2);
        c.stroke();
        c.lineWidth = 1;
        c.strokeStyle = 'rgba(132, 210, 239, ' + 0.35 * fade + ')';
        c.beginPath();
        c.arc(pebble.x, pebble.y, Math.max(1, radius - 16), 0, Math.PI * 2);
        c.stroke();
      }
      c.save();
      c.globalAlpha = fade * fade;
      c.translate(pebble.x, pebble.y - 90 * fall * fall);
      c.rotate(0.43 + fall * 0.6);
      const stone = c.createLinearGradient(-10, -9, 10, 9);
      stone.addColorStop(0, '#dce7ec');
      stone.addColorStop(0.43, '#7c94a8');
      stone.addColorStop(1, '#263e56');
      c.fillStyle = stone;
      c.beginPath();
      c.ellipse(0, 0, 12 + fall * 3, 8 + fall * 2, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }
}
