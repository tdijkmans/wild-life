import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { MorphogenesisWorld, TISSUE_COLS, TISSUE_ROWS } from '../domain/morphogenesis-world';
export class MorphogenesisRenderer extends LivingCanvas<MorphogenesisWorld> {
  render(): void {
    this.begin(260);
    const c = this.ctx,
      w = this.world;
    for (let y = 0; y < TISSUE_ROWS; y += 2)
      for (let x = 0; x < TISSUE_COLS; x += 2) {
        const i = y * TISSUE_COLS + x;
        this.glow(
          x * 30 + 15,
          y * 30 + 15,
          65,
          w.activator[i] > w.inhibitor[i] ? 175 : 315,
          Math.min(0.11, (w.activator[i] + w.inhibitor[i]) * 0.12),
        );
      }
    for (const cell of w.cells) {
      const hue = cell.fate === 1 ? 172 : cell.fate === 2 ? 315 : 45;
      this.glow(cell.x, cell.y, cell.size * 3, hue, 0.14);
      c.fillStyle = `hsla(${hue},65%,55%,0.16)`;
      c.strokeStyle = `hsla(${hue},80%,77%,0.6)`;
      c.lineWidth = 1.1;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3,
          r = cell.size + 2;
        const x = cell.x + Math.cos(a) * r,
          y = cell.y + Math.sin(a) * r;
        if (k === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
      c.stroke();
      this.dot(cell.x + 2, cell.y - 1, 2 + cell.commitment, hue, 0.8);
    }
    this.fields(w.fields, 195);
  }
}
