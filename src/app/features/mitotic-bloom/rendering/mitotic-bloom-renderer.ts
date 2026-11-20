import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { PHASES, phaseAt } from '../domain/mitotic-bloom-world';
import type { MitoticBloomWorld } from '../domain/mitotic-bloom-world';

export class MitoticBloomRenderer extends LivingCanvas<MitoticBloomWorld> {
  render(): void {
    this.begin(277);
    const c = this.ctx;
    this.glow(335, 450, 460, 272, 0.19);
    this.glow(965, 255, 340, 196, 0.1);
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
      const pinch = phase === 5 ? progress : 0;
      const radius = phase === 0 ? 37 + progress * 12 : 49;
      const stretch =
        phase >= 3 ? 1.1 + (phase === 3 ? progress * 0.17 : 0.17) + pinch * 0.12 : 1.03;
      const width = radius * stretch;
      this.glow(cell.x, cell.y, 82, focused ? 322 : 265, focused ? 0.24 : 0.11);
      c.save();
      c.translate(cell.x, cell.y);
      c.rotate(cell.angle);
      const waist = radius * (0.95 - pinch * 0.86);
      const cellFill = c.createRadialGradient(0, -10, 0, 0, 0, width);
      cellFill.addColorStop(0, 'rgba(101, 78, 153, 0.38)');
      cellFill.addColorStop(0.73, 'rgba(97, 68, 139, 0.28)');
      cellFill.addColorStop(1, 'rgba(132, 101, 190, 0.64)');
      c.beginPath();
      c.moveTo(0, -waist);
      c.bezierCurveTo(width * 0.43, -radius, width, -radius * 0.92, width, 0);
      c.bezierCurveTo(width, radius * 0.92, width * 0.43, radius, 0, waist);
      c.bezierCurveTo(-width * 0.43, radius, -width, radius * 0.92, -width, 0);
      c.bezierCurveTo(-width, -radius * 0.92, -width * 0.43, -radius, 0, -waist);
      c.fillStyle = cellFill;
      c.fill();
      c.lineWidth = focused ? 1.8 : 1;
      c.strokeStyle = focused ? '#ecc4ff' : 'rgba(196, 155, 235, 0.63)';
      c.stroke();

      if (phase <= 1)
        this.nucleus(
          0,
          phase === 1 ? 23 + progress * 2 : radius * 0.55,
          phase === 0 ? 0.9 : 1 - progress,
        );
      if (phase >= 4) {
        const opacity = phase === 4 ? progress : 1;
        this.nucleus(-width * 0.48, radius * 0.35, opacity);
        this.nucleus(width * 0.48, radius * 0.35, opacity);
      }

      if (phase === 0) {
        for (let i = 0; i < cell.genome.length; i++) {
          const angle = i * 2.4 + cell.id;
          this.dot(Math.cos(angle) * 12, Math.sin(angle) * 12, 2.85, cell.genome[i], 0.47);
        }
      } else {
        const pole = width * (phase === 1 ? 0.39 + progress * 0.4 : 0.79);
        const separation = phase === 3 ? progress * width * 0.49 : phase >= 4 ? width * 0.49 : 0;
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

      if (focused) {
        c.fillStyle = '#f2d4ff';
        c.font = '600 15px ui-monospace, monospace';
        c.textAlign = 'center';
        c.fillText(PHASES[phase].toUpperCase(), cell.x, cell.y - 74);
        c.textAlign = 'start';
      }
    }
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
