import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import type { HyphalNetworkWorld } from '../domain/hyphal-network-world';

export class HyphalNetworkRenderer extends LivingCanvas<HyphalNetworkWorld> {
  render(): void {
    this.begin(132);
    const c = this.ctx;
    const { nodes, hyphae, food, fields } = this.world;
    this.glow(540, 275, 515, 125, 0.16);
    for (let i = 0; i < 240; i++) {
      const x = (i * 277.37) % 1200;
      const y = (i * 149.53) % 720;
      this.dot(x, y, 0.55 + (i % 4) * 0.43, 71 + (i % 37), 0.12);
    }
    for (const patch of food) {
      this.glow(patch.x, patch.y, patch.radius + 24, 45, Math.min(0.28, patch.reserve * 0.28));
      for (let i = 0; i < 17; i++) {
        const angle = i * 2.4;
        const radius = Math.sqrt(i / 17) * patch.radius * 0.56;
        this.dot(
          patch.x + Math.cos(angle) * radius,
          patch.y + Math.sin(angle) * radius,
          1 + (i % 4) * 0.45,
          38 + (i % 10),
          Math.min(0.55, patch.reserve * 0.52),
        );
      }
    }
    for (const field of fields) {
      if (field.kind === 'mist') this.glow(field.x, field.y, field.radius, 186, field.life * 0.013);
    }
    c.lineCap = 'round';
    for (const hypha of hyphae) {
      const a = nodes[hypha.start];
      const b = nodes[hypha.end];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const strength = Math.min(1, Math.abs(hypha.flux) * 9);
      const width = 5.8 + strength * 5.5;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.strokeStyle = 'rgba(6, 17, 13, 0.83)';
      c.lineWidth = width + 5;
      c.stroke();
      c.strokeStyle = 'hsla(' + (123 - strength * 20) + ', 49%, 54%, .73)';
      c.lineWidth = width;
      c.stroke();
      c.strokeStyle = 'rgba(9, 35, 29, 0.84)';
      c.lineWidth = width * 0.66;
      c.stroke();

      const length = Math.hypot(dx, dy);
      const nx = (-dy / length) * width * 0.45;
      const ny = (dx / length) * width * 0.45;
      for (const at of [0.28, 0.67]) {
        const x = a.x + dx * at;
        const y = a.y + dy * at;
        c.strokeStyle = 'rgba(197, 229, 144, 0.44)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x + nx, y + ny);
        c.lineTo(x + nx * 0.25, y + ny * 0.25);
        c.moveTo(x - nx, y - ny);
        c.lineTo(x - nx * 0.25, y - ny * 0.25);
        c.stroke();
      }
      if (strength > 0.009) {
        for (let i = 0; i < 3; i++) {
          const position = hypha.transport + hypha.start * 0.394 + i / 3;
          const at = position - Math.floor(position);
          const x = a.x + dx * at;
          const y = a.y + dy * at;
          this.dot(x, y, 2.6 + strength * 0.8, 49, 0.16 + strength * 0.38);
          this.dot(x, y, 1.08 + strength * 0.5, 56, 0.52 + strength * 0.41);
        }
      }
    }
    for (const node of nodes) {
      if (!node.tip) continue;
      this.glow(node.x, node.y, 17, 105, 0.29);
      this.dot(node.x, node.y, 2.7, 91, 0.87);
    }
  }
}
