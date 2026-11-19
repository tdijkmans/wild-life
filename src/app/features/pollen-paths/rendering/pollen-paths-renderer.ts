import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import type { PollenPathsWorld } from '../domain/pollen-paths-world';

export class PollenPathsRenderer extends LivingCanvas<PollenPathsWorld> {
  render(): void {
    this.begin(146);
    const c = this.ctx;
    for (let i = 0; i < 9; i++) {
      const y = 160 + i * 69;
      c.strokeStyle = 'rgba(86, 144, 111, 0.105)';
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(320, y - 150, 755, y + 150, 1200, y - 50);
      c.stroke();
    }
    for (const f of this.world.fields)
      this.glow(f.x, f.y, f.radius, f.kind === 'rain' ? 192 : 49, 0.19);
    for (const path of this.world.deliveries) {
      c.strokeStyle = 'hsla(49,93%,72%,' + 0.34 * (1 - (this.world.time - path.time) / 7) + ')';
      c.setLineDash([2, 7]);
      c.beginPath();
      c.moveTo(path.from.x, path.from.y);
      c.quadraticCurveTo(
        (path.from.x + path.to.x) / 2,
        (path.from.y + path.to.y) / 2 - 27,
        path.to.x,
        path.to.y,
      );
      c.stroke();
    }
    c.setLineDash([]);
    for (const flower of this.world.flowers) {
      const hue = 48 + flower.shape * 256 + flower.pigment;
      const open = this.world.flowering(flower);
      const size = Math.min(1, 0.23 + flower.age / 24);
      this.glow(flower.x, flower.y, 31 * size, hue, open ? 0.29 : 0.1);
      c.save();
      c.translate(flower.x, flower.y);
      c.rotate(flower.x + Math.sin(this.world.time * 0.8 + flower.y) * 0.12);
      const petals = flower.shape < 0.5 ? 5 : 3;
      for (let i = 0; i < petals; i++) {
        c.rotate((2 * Math.PI) / petals);
        c.fillStyle = 'hsla(' + hue + ',78%,68%,' + (open ? 0.69 : 0.31) + ')';
        c.beginPath();
        c.ellipse(
          4 * size,
          0,
          size * (4 + 4 * flower.shape),
          size * (2.9 - flower.shape),
          0,
          0,
          2 * Math.PI,
        );
        c.fill();
      }
      c.restore();
      this.dot(flower.x, flower.y, size * (1.5 + flower.seeds), 48, 0.9);
    }
    for (const visitor of this.world.pollinators) {
      c.save();
      c.translate(visitor.x, visitor.y);
      c.rotate(visitor.heading);
      c.strokeStyle = 'rgba(206, 255, 220, 0.76)';
      c.beginPath();
      c.moveTo(-6, -4);
      c.lineTo(4, 0);
      c.lineTo(-6, 4);
      c.stroke();
      visitor.pollen.forEach((grain, side) => {
        if (grain) this.dot(-3, side === 0 ? -5 : 5, 2.4, 48 + grain.shape * 256, 1);
      });
      c.restore();
    }
  }
}
