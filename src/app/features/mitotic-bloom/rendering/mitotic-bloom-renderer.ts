import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { DISH, OUTLINE_RAYS, PHASES, phaseAt } from '../domain/mitotic-bloom-world';
import type { MitoticBloomWorld } from '../domain/mitotic-bloom-world';

export class MitoticBloomRenderer extends LivingCanvas<MitoticBloomWorld> {
  render(): void {
    this.begin(277);
    const c = this.ctx;
    this.glow(335, 450, 460, 272, 0.19);
    this.glow(965, 255, 340, 196, 0.1);
    c.strokeStyle = 'rgba(179, 152, 231, 0.20)';
    c.lineWidth = 1;
    c.strokeRect(DISH.left, DISH.top, DISH.right - DISH.left, DISH.bottom - DISH.top);
    for (const field of this.world.fields) {
      this.glow(
        field.x,
        field.y,
        field.radius,
        field.kind === 'shade' ? 269 : 147,
        field.life * 0.013,
      );
    }

    for (const cell of this.world.cells) {
      const { index: phase, progress } = phaseAt(cell.cycle);
      const focused = cell.id === this.world.selectedId;
      const death = this.world.apoptosisProgress(cell);
      const body = this.outline(cell.outline, cell.angle, phase === 5 ? progress : 0, death);
      const thickness = this.support(cell.outline, cell.angle + Math.PI / 2);
      const radius = Math.min(49, thickness * 0.84);
      const width = Math.min(radius * 1.35, this.support(cell.outline, cell.angle) * 0.85);
      const detailScale = Math.max(0.45, Math.min(1, radius / 44, width / 48));
      if (focused) this.glow(cell.x, cell.y, 85, 318, 0.21);
      c.save();
      c.translate(cell.x, cell.y);
      c.globalAlpha = 1 - death * 0.74;
      this.membrane(body);
      const fill = c.createRadialGradient(0, -10, 0, 0, 0, Math.max(12, cell.radius));
      fill.addColorStop(0, death > 0 ? 'rgba(120, 41, 87, 0.58)' : 'rgba(73, 51, 115, 0.52)');
      fill.addColorStop(0.6, 'rgba(96, 65, 147, 0.33)');
      fill.addColorStop(1, 'rgba(139, 102, 194, 0.72)');
      c.fillStyle = fill;
      c.fill();
      c.lineWidth = focused ? 1.8 : 1.15;
      c.strokeStyle = focused ? '#ecc4ff' : death > 0 ? '#e9a4ad' : 'rgba(196, 155, 235, 0.63)';
      c.stroke();
      if (cell.dyingAt !== null) {
        this.fragments(cell.id, death);
        c.restore();
        if (focused) this.label('APOPTOSIS', cell.x, cell.y);
        continue;
      }
      c.clip();
      c.rotate(cell.angle);
      c.scale(detailScale, detailScale);
      const internalWidth = width / detailScale;
      const internalRadius = radius / detailScale;

      if (phase <= 1)
        this.nucleus(
          0,
          phase === 1 ? 23 + progress * 2 : internalRadius * 0.55,
          phase === 0 ? 0.9 : 1 - progress,
        );
      if (phase >= 4) {
        const opacity = phase === 4 ? progress : 1;
        this.nucleus(-internalWidth * 0.48, internalRadius * 0.35, opacity);
        this.nucleus(internalWidth * 0.48, internalRadius * 0.35, opacity);
      }

      if (phase === 0) {
        for (let i = 0; i < cell.genome.length; i++) {
          const angle = i * 2.4 + cell.id;
          this.dot(Math.cos(angle) * 12, Math.sin(angle) * 12, 2.85, cell.genome[i], 0.47);
        }
      } else {
        const pole = internalWidth * (phase === 1 ? 0.39 + progress * 0.4 : 0.79);
        const separation =
          phase === 3 ? progress * internalWidth * 0.49 : phase >= 4 ? internalWidth * 0.49 : 0;
        for (let i = 0; i < cell.genome.length; i++) {
          const spread = (i - 2.5) * 7.7;
          const x = phase === 1 ? Math.sin(i * 2.3 + cell.id) * 12 * (1 - progress) : 0;
          const y = phase >= 4 ? spread * 0.57 : spread;
          if (phase <= 3) {
            for (const side of [-1, 1]) {
              c.strokeStyle = 'rgba(126, 242, 248, ' + (phase === 1 ? 0.32 * progress : 0.44) + ')';
              c.lineWidth = 0.9;
              c.beginPath();
              c.moveTo(side * pole, 0);
              c.quadraticCurveTo(side * pole * 0.36, y * 1.1, x + side * separation, y);
              c.stroke();
            }
          }
          c.strokeStyle = 'hsl(' + cell.genome[i] + ', 87%, 76%)';
          c.lineWidth = phase >= 4 ? 1.6 : 2.3;
          c.beginPath();
          for (const side of [-1, 1]) {
            const center = x + side * separation;
            c.moveTo(center - side * 2.6, y - 3.2);
            c.lineTo(center + side * 0.8, y);
            c.lineTo(center - side * 2.6, y + 3.2);
          }
          c.stroke();
        }
        if (phase <= 3) {
          this.dot(-pole, 0, 3.2, 175);
          this.dot(pole, 0, 3.2, 175);
        }
      }
      c.restore();

      if (focused) this.label(PHASES[phase].toUpperCase(), cell.x, cell.y);
    }
  }

  private outline(lengths: readonly number[], angle: number, pinch: number, death: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return OUTLINE_RAYS.map((ray, index) => {
      const r = Math.max(1, lengths[index] - 1.6);
      const x = r * ray.x;
      const y = r * ray.y;
      const axis = x * cos + y * sin;
      const width = (-x * sin + y * cos) * (1 - 0.92 * pinch * Math.exp(-((axis / 21) ** 2)));
      const swell = 1 + death * 0.17 * Math.sin(index * 0.92 + death * 5);
      return { x: (axis * cos - width * sin) * swell, y: (axis * sin + width * cos) * swell };
    });
  }

  private support(outline: readonly number[], angle: number): number {
    const ray = Math.round((angle / (2 * Math.PI)) * outline.length);
    const index = (ray + outline.length) % outline.length;
    return Math.max(
      7,
      Math.min(outline[index], outline[(index + outline.length / 2) % outline.length]),
    );
  }

  private membrane(points: readonly { x: number; y: number }[]): void {
    const c = this.ctx;
    const last = points[points.length - 1];
    c.beginPath();
    c.moveTo((last.x + points[0].x) / 2, (last.y + points[0].y) / 2);
    points.forEach((p, index) => {
      const next = points[(index + 1) % points.length];
      c.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    });
    c.closePath();
  }

  private fragments(id: number, progress: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = id + i * 2.4;
      const distance = (4 + i * 2.4) * (0.6 + progress * 0.55);
      this.dot(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        1.5 + progress * 1.6,
        330,
        (1 - progress) * 0.9,
      );
    }
  }

  private label(text: string, x: number, y: number): void {
    const c = this.ctx;
    c.fillStyle = '#f2d4ff';
    c.font = '600 15px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(text, x, Math.max(DISH.top + 18, y - 59));
    c.textAlign = 'start';
  }

  private nucleus(x: number, radius: number, opacity: number): void {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, 0, radius, 0, Math.PI * 2);
    c.fillStyle = 'rgba(21, 33, 73, ' + opacity * 0.64 + ')';
    c.strokeStyle = 'rgba(180, 209, 252, ' + opacity * 0.57 + ')';
    c.lineWidth = 1;
    c.fill();
    c.stroke();
  }
}
