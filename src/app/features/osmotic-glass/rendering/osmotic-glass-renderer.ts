import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { CHAMBER } from '../domain/osmotic-glass-world';
import type { OsmoticGlassWorld } from '../domain/osmotic-glass-world';

export class OsmoticGlassRenderer extends LivingCanvas<OsmoticGlassWorld> {
  render(): void {
    this.begin(218);
    const c = this.ctx;
    const { left, right, top, bottom } = CHAMBER;
    const { membrane, molecules, fields } = this.world;
    const glass = c.createLinearGradient(0, top, 0, bottom);
    glass.addColorStop(0, '#142936');
    glass.addColorStop(0.45, '#091724');
    glass.addColorStop(1, '#18132e');
    c.fillStyle = glass;
    c.beginPath();
    c.roundRect(left, top, right - left, bottom - top, 29);
    c.fill();
    c.save();
    c.clip();
    this.glow(membrane + 156, 351, 355, 279, 0.24);
    this.glow(membrane - 164, 351, 380, 197, 0.24);
    for (const field of fields) {
      if (field.life > 11) this.glow(field.x, field.y, 135, 47, (field.life - 11) * 0.047);
    }

    for (let i = 0; i < 18; i++) {
      const y = top + 24 + i * 27.2;
      c.strokeStyle = 'rgba(143, 205, 222, .045)';
      c.beginPath();
      c.moveTo(left, y);
      c.lineTo(right, y);
      c.stroke();
    }

    for (const molecule of molecules) {
      const { kind, x, y } = molecule;
      if (kind === 'water') this.dot(x, y, 1.75, 195, 0.68);
      else if (kind === 'tracer') {
        this.dot(x, y, 4.2, 46, 0.15);
        this.dot(x, y, 2.45, 47, 0.96);
      } else {
        c.strokeStyle = 'rgba(226, 152, 247, 0.82)';
        c.lineWidth = 1.3;
        c.beginPath();
        c.arc(x, y, 3.8, 0, 2 * Math.PI);
        c.stroke();
        this.dot(x, y, 1.23, 291, 0.93);
      }
    }

    const film = c.createLinearGradient(membrane - 24, 0, membrane + 24, 0);
    film.addColorStop(0, 'rgba(123, 237, 255, 0)');
    film.addColorStop(0.5, 'rgba(154, 240, 255, 0.2)');
    film.addColorStop(1, 'rgba(123, 237, 255, 0)');
    c.fillStyle = film;
    c.fillRect(membrane - 24, top, 48, bottom - top);
    for (let y = top + 10; y < bottom; y += 10) {
      c.strokeStyle = 'rgba(169, 232, 239, 0.26)';
      c.beginPath();
      c.moveTo(membrane - 4, y - 2);
      c.lineTo(membrane + 4, y + 2);
      c.stroke();
      this.dot(membrane - 5, y, 1.55, 198, 0.8);
      this.dot(membrane + 5, y, 1.55, 180, 0.8);
    }
    c.restore();
    c.strokeStyle = 'rgba(169, 232, 239, .27)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.roundRect(left, top, right - left, bottom - top, 29);
    c.stroke();
    c.font = '600 13px ui-monospace, monospace';
    c.fillStyle = '#8fe6ff';
    c.fillText('● WATER', left + 24, 663);
    c.fillStyle = '#ffe3a1';
    c.fillText('● SMALL TRACER', left + 131, 663);
    c.fillStyle = '#efb7fb';
    c.fillText('◉ RETAINED SOLUTE', left + 293, 663);
  }
}
