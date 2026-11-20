import { LivingCanvas } from '../../../shared/world-experience/living-canvas';
import { clamp } from '../../../shared/simulation/living-world';
import type { HyphalNetworkWorld } from '../domain/hyphal-network-world';

interface Point {
  x: number;
  y: number;
}

/** One centerline is used for the tube, septa, and particles. */
function sampleCurve(start: Point, bend: Point, end: Point, at: number) {
  const before = 1 - at;
  const dx = 2 * (before * (bend.x - start.x) + at * (end.x - bend.x));
  const dy = 2 * (before * (bend.y - start.y) + at * (end.y - bend.y));
  const length = Math.max(1, Math.hypot(dx, dy));
  return {
    x: before * before * start.x + 2 * at * before * bend.x + at * at * end.x,
    y: before * before * start.y + 2 * at * before * bend.y + at * at * end.y,
    nx: -dy / length,
    ny: dx / length,
  };
}

export class HyphalNetworkRenderer extends LivingCanvas<HyphalNetworkWorld> {
  render(): void {
    this.begin(132);
    const c = this.ctx;
    const { nodes, hyphae, food, fields } = this.world;
    this.glow(538, 342, 520, 131, 0.14);
    for (let i = 0; i < 170; i++) {
      this.dot((i * 277.37) % 1200, (i * 149.53) % 720, 0.55 + (i % 4) * 0.35, 71 + (i % 37), 0.12);
    }
    for (const patch of food) {
      this.glow(patch.x, patch.y, patch.radius + 24, 45, Math.min(0.22, patch.reserve * 0.2));
      for (let i = 0; i < 15; i++) {
        const angle = i * 2.4;
        const radius = Math.sqrt(i / 15) * patch.radius * 0.56;
        this.dot(
          patch.x + Math.cos(angle) * radius,
          patch.y + Math.sin(angle) * radius,
          0.8 + (i % 4) * 0.45,
          38 + (i % 10),
          Math.min(0.46, patch.reserve * 0.52),
        );
      }
    }
    for (const field of fields) {
      if (field.kind === 'mist') this.glow(field.x, field.y, field.radius, 186, field.life * 0.013);
    }

    const growthAtJunction = new Float64Array(nodes.length);
    for (const edge of hyphae) {
      growthAtJunction[edge.start] = Math.max(growthAtJunction[edge.start], edge.growth);
    }
    const radius = (index: number): number => {
      const node = nodes[index];
      const mature = 2.2 + 5.9 / (1 + node.depth * 0.085);
      return 0.7 + (mature - 0.7) * clamp(growthAtJunction[index] * 2.3);
    };

    c.lineJoin = 'round';
    for (const edge of hyphae) {
      if (edge.growth < 0.002) continue;
      const start = nodes[edge.start];
      const end = nodes[edge.end];
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const turn = Math.atan2(Math.sin(start.heading - angle), Math.cos(start.heading - angle));
      const heading = angle + clamp(turn, -0.65, 0.65) * 0.57;
      const bend = {
        x: start.x + Math.cos(heading) * distance * 0.58,
        y: start.y + Math.sin(heading) * distance * 0.58,
      };
      const base = radius(edge.start);
      const endRadius = 0.58 + (radius(edge.end) - 0.58) * edge.growth ** 8;
      const outline = Array.from({ length: 11 }, (_, index) => {
        const at = index / 10;
        return {
          ...sampleCurve(start, bend, end, at * edge.growth),
          radius: endRadius + (base - endRadius) * (1 - at ** 1.85),
        };
      });
      this.tube(outline, 1, 'rgba(169, 224, 150, 0.69)');
      this.tube(outline, 0.76, 'rgba(45, 99, 74, 0.98)');
      this.tube(outline, 0.45, 'rgba(88, 157, 102, 0.38)');

      if (edge.growth > 0.55) {
        const septum = sampleCurve(start, bend, end, 0.5);
        const halfWidth = (base + endRadius) * 0.29;
        c.strokeStyle = 'rgba(217, 244, 183,' + clamp((edge.growth - 0.55) * 0.47) + ')';
        c.lineWidth = 0.85;
        c.beginPath();
        for (const side of [-1, 1]) {
          c.moveTo(
            septum.x + septum.nx * halfWidth * side,
            septum.y + septum.ny * halfWidth * side,
          );
          c.lineTo(septum.x + septum.nx * side, septum.y + septum.ny * side);
        }
        c.stroke();
      }

      const strength = clamp(Math.abs(edge.streamingFlux) * 11);
      for (let i = 0; i < 3; i++) {
        const phase = edge.transport + edge.start * 0.394 + i / 3;
        const at = phase - Math.floor(phase);
        const envelope = clamp(Math.min(at, edge.growth - at) * 9);
        if (envelope <= 0 || strength < 0.001) continue;
        const pulse = sampleCurve(start, bend, end, at);
        this.dot(pulse.x, pulse.y, 1.8 + strength, 50, envelope * strength * 0.2);
        this.dot(pulse.x, pulse.y, 0.75 + strength * 0.5, 57, envelope * strength * 0.68);
      }

      if (edge.growth < 1 || end.tip) {
        const tip = outline[outline.length - 1];
        this.glow(tip.x, tip.y, 10, 105, 0.19);
      }
    }
  }

  private tube(
    outline: readonly { x: number; y: number; nx: number; ny: number; radius: number }[],
    scale: number,
    fill: string,
  ): void {
    const c = this.ctx;
    c.beginPath();
    outline.forEach(({ x, y, nx, ny, radius }, index) => {
      const ox = nx * radius * scale;
      const oy = ny * radius * scale;
      if (index === 0) c.moveTo(x + ox, y + oy);
      else c.lineTo(x + ox, y + oy);
    });
    for (let i = outline.length - 1; i >= 0; i--) {
      const { x, y, nx, ny, radius } = outline[i];
      c.lineTo(x - nx * radius * scale, y - ny * radius * scale);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
}
