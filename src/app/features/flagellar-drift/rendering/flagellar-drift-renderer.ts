import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import type { FlagellarDriftWorld, Propulsor } from '../domain/flagellar-drift-world';

const HUES = [174, 309, 48] as const;

export class FlagellarDriftRenderer extends LivingCanvas<FlagellarDriftWorld> {
  render(): void {
    this.begin(196);
    const c = this.ctx;
    const { time, food, swimmers, hatches, fields } = this.world;
    this.glow(810, 476, 410, 226, 0.15);
    for (let i = 0; i < 11; i++) {
      const y = 80 + i * 56;
      c.strokeStyle = 'rgba(117, 205, 228, 0.085)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(380, y + 120 * Math.sin(time * 0.14 + i * 0.17), 706, y - 101, 1200, y + 21);
      c.stroke();
    }
    for (const patch of food) {
      this.glow(patch.x, patch.y, 91, 132, Math.min(0.25, patch.food * 0.24));
      for (let i = 0; i < 12; i++) {
        const angle = i * 2.4 + time * 0.08;
        const radius = 14 * Math.sqrt(i);
        this.dot(
          patch.x + Math.cos(angle) * radius,
          patch.y + Math.sin(angle) * radius,
          0.9 + (i % 3) * 0.48,
          102 + i * 2,
          patch.food * 0.64,
        );
      }
    }
    for (const field of fields) {
      if (field.kind !== 'eddy') continue;
      const fade = Math.min(1, field.life / 2);
      this.glow(field.x, field.y, 154, 216, fade * 0.16);
      c.strokeStyle = 'rgba(133, 197, 244, ' + fade * 0.39 + ')';
      c.lineWidth = 1.4;
      c.beginPath();
      for (let i = 0; i < 57; i++) {
        const angle = time * 1.9 + i * 0.13;
        const radius = 6 + 2.4 * i;
        const x = field.x + Math.cos(angle) * radius;
        const y = field.y + Math.sin(angle) * radius;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    for (const hatch of hatches) {
      const age = time - hatch.time;
      this.glow(hatch.x, hatch.y, 22 + age * 17, hatch.mixed ? 275 : 167, 0.36 * (1 - age / 3.2));
      c.strokeStyle = 'rgba(220, 232, 255, ' + 0.5 * (1 - age / 3.2) + ')';
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(hatch.x, hatch.y, 6 + age * 24, 0, Math.PI * 2);
      c.stroke();
    }
    for (const swimmer of swimmers) {
      const hue = HUES[swimmer.propulsion];
      const scale = Math.min(1, 0.58 + swimmer.age / 25);
      this.glow(swimmer.x, swimmer.y, 23, hue, 0.18 + swimmer.energy * 0.12);
      c.save();
      c.translate(swimmer.x, swimmer.y);
      c.rotate(swimmer.heading);
      c.scale(scale, scale);
      this.flagella(swimmer.propulsion, swimmer.phase, hue);
      const gradient = c.createLinearGradient(-9, 0, 10, 4);
      gradient.addColorStop(0, 'hsla(' + hue + ', 55%, 33%, 0.88)');
      gradient.addColorStop(0.7, 'hsla(' + hue + ', 87%, 65%, 0.93)');
      gradient.addColorStop(1, 'hsla(' + hue + ', 92%, 83%, 0.99)');
      c.fillStyle = gradient;
      c.beginPath();
      c.ellipse(
        0,
        0,
        swimmer.propulsion === 0 ? 11 : 8.9,
        swimmer.propulsion === 1 ? 6.6 : 4.7,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
      this.dot(1, 0, 2.4, hue + 18);
      c.restore();
    }
  }

  private flagella(kind: Propulsor, phase: number, hue: number): void {
    const c = this.ctx;
    const count = kind === 1 ? 2 : 1;
    const length = kind === 0 ? 32 : kind === 1 ? 24 : 23;
    for (let flagellum = 0; flagellum < count; flagellum++) {
      c.beginPath();
      c.strokeStyle = 'hsla(' + hue + ', 87%, 75%, 0.74)';
      c.lineWidth = kind === 2 ? 1.8 : 1.5;
      for (let i = 0; i <= 20; i++) {
        const p = i / 20;
        const side = flagellum === 0 ? -1 : 1;
        const x = (kind === 2 ? 1 : -1) * (6 + p * length);
        const wave = Math.sin(p * (kind === 2 ? 14 : 7.4) - phase + flagellum * Math.PI);
        const y = kind === 1 ? side * (4 + 5 * p) + wave * p * 5 : wave * p * (kind === 2 ? 4 : 8);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  }
}
