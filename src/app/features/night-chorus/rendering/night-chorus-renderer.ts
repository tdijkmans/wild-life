import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import type { NightChorusWorld } from '../domain/night-chorus-world';

export class NightChorusRenderer extends LivingCanvas<NightChorusWorld> {
  render(): void {
    this.begin(233);
    const c = this.ctx;
    for (let i = 0; i < 13; i++) {
      const offset = i * 48;
      c.strokeStyle = 'rgba(107, 172, 221, 0.11)';
      c.beginPath();
      c.ellipse(600, 365, 110 + offset, 54 + offset * 0.47, -0.11, 0, 2 * Math.PI);
      c.stroke();
    }
    for (const field of this.world.fields) {
      this.glow(field.x, field.y, field.radius, field.kind === 'warmth' ? 40 : 235, 0.17);
    }
    for (const trace of this.world.pairTraces) {
      const fade = Math.max(0, 1 - (this.world.time - trace.time) / 5);
      c.strokeStyle = 'rgba(232, 213, 163, ' + fade * 0.58 + ')';
      c.beginPath();
      c.moveTo(trace.caller.x, trace.caller.y);
      c.lineTo(trace.listener.x, trace.listener.y);
      c.stroke();
    }
    for (const voice of this.world.voices) {
      const hue = 155 + voice.signal * 159;
      const elapsed = this.world.time - voice.lastCall;
      const radius = elapsed * (26 + 18 * voice.signal);
      if (elapsed < 1.65) {
        c.strokeStyle = 'hsla(' + hue + ',85%,76%,' + 0.52 * (1 - elapsed / 1.65) + ')';
        c.beginPath();
        c.ellipse(voice.x, voice.y, radius, radius * 0.67, 0, 0, 2 * Math.PI);
        c.stroke();
      }
      this.glow(voice.x, voice.y, 18, hue, elapsed < 0.2 ? 0.55 : 0.19);
      if (voice.caller) {
        c.fillStyle = 'hsl(' + hue + ',80%,78%)';
        c.beginPath();
        c.moveTo(voice.x, voice.y - 5);
        c.lineTo(voice.x + 5, voice.y);
        c.lineTo(voice.x, voice.y + 5);
        c.lineTo(voice.x - 5, voice.y);
        c.fill();
      } else {
        this.dot(voice.x, voice.y, voice.age < 12 ? 1.8 : 3.2, hue, 0.82);
      }
    }
  }
}
