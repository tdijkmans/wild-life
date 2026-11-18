import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldCanvasRenderer,
} from '../../../shared/world-experience/world-protocol';
import { SynchronyWorld, type Firefly } from '../domain/synchrony-world';

interface NightDetail {
  x: number;
  y: number;
  size: number;
  phase: number;
}

export class SynchronyRenderer implements WorldCanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private world: SynchronyWorld;
  private readonly stars: NightDetail[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    world: SynchronyWorld,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Synchrony requires a 2D Canvas context');
    this.ctx = ctx;
    this.world = world;
    this.seedBackdrop();
  }

  setWorld(world: InteractiveWorld): void {
    this.world = world as SynchronyWorld;
    this.seedBackdrop();
  }

  private seedBackdrop(): void {
    const random = new SeededRandom(this.world.seed ^ 0x53af18c2);
    this.stars.length = 0;
    for (let i = 0; i < 160; i++) {
      this.stars.push({
        x: random.range(0, this.world.width),
        y: random.range(15, 570),
        size: random.range(0.4, 1.5),
        phase: random.range(0, Math.PI * 2),
      });
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  }

  render(nowMs: number): void {
    const ctx = this.ctx;
    const world = this.world;
    const scale = Math.min(this.canvas.width / world.width, this.canvas.height / world.height);
    const offsetX = (this.canvas.width - world.width * scale) / 2;
    const offsetY = (this.canvas.height - world.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#030e1e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    const night = ctx.createLinearGradient(0, 0, 180, world.height);
    night.addColorStop(0, '#0c1832');
    night.addColorStop(0.45, '#132848');
    night.addColorStop(0.75, '#102b39');
    night.addColorStop(1, '#071d26');
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, world.width, world.height);

    const afterglow = ctx.createRadialGradient(620, 600, 30, 620, 600, 790);
    afterglow.addColorStop(0, 'rgba(94,192,175,0.18)');
    afterglow.addColorStop(0.52, 'rgba(72,113,151,0.09)');
    afterglow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = afterglow;
    ctx.fillRect(0, 0, world.width, world.height);
    for (const star of this.stars) {
      const shimmer = Math.sin(nowMs * 0.0003 + star.phase) * 0.08;
      ctx.fillStyle = `rgba(204,221,238,${0.22 + shimmer})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Receding silhouettes and water are ambience, never driving oscillator dynamics.
    ctx.fillStyle = 'rgba(5,20,31,0.48)';
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.moveTo(0, 720);
      for (let x = 0; x <= 1210; x += 30) {
        const ridge =
          565 +
          layer * 40 +
          Math.sin(x * 0.013 + layer * 1.3) * 35 +
          Math.cos(x * 0.041 + layer) * 14;
        ctx.lineTo(x, ridge);
      }
      ctx.lineTo(1200, 720);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(127,205,180,0.11)';
    for (let j = 0; j < 9; j++) {
      const y = 615 + j * 10;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= 1200; x += 40) {
        const wave = y + Math.sin(x * 0.014 + nowMs * 0.00032 + j) * 2.2;
        if (x === 0) ctx.moveTo(x, wave);
        else ctx.lineTo(x, wave);
      }
      ctx.stroke();
    }

    for (const field of world.fields) {
      const tint =
        field.kind === 'warmth'
          ? '249,186,124'
          : field.kind === 'shade'
            ? '101,144,214'
            : '155,239,218';
      const opacity = Math.min(1, field.remaining / 2) * 0.22;
      const aura = ctx.createRadialGradient(field.x, field.y, 1, field.x, field.y, field.radius);
      aura.addColorStop(0, `rgba(${tint},${opacity})`);
      aura.addColorStop(0.55, `rgba(${tint},${opacity * 0.18})`);
      aura.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nearby flashes highlight the actual evolving local phase agreement.
    ctx.globalCompositeOperation = 'screen';
    if (world.localCoherence > 0.22) {
      const flies = world.fireflies;
      ctx.lineWidth = 0.7;
      for (let i = 0; i < flies.length; i += 5) {
        const first = flies[i];
        if (first.flash < 0.28) continue;
        let neighbors = 0;
        for (let j = i + 1; j < flies.length && neighbors < 3; j++) {
          const second = flies[j];
          if (second.flash < 0.28) continue;
          const distance2 = (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
          if (distance2 > 87 * 87) continue;
          ctx.strokeStyle = `rgba(190,255,172,${Math.min(0.19, first.flash * second.flash * 0.16)})`;
          ctx.beginPath();
          ctx.moveTo(first.x, first.y);
          ctx.lineTo(second.x, second.y);
          ctx.stroke();
          neighbors++;
        }
      }
    }
    for (const fly of world.fireflies) this.drawFly(ctx, fly);
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawFly(ctx: CanvasRenderingContext2D, fly: Firefly): void {
    const intensity = Math.pow(fly.flash, 0.65);
    const core = 0.06 + intensity * 0.96;
    const radius = 2.1 + intensity * 3;
    if (intensity > 0.035) {
      ctx.fillStyle = `rgba(178,245,112,${intensity * 0.07})`;
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, radius * 6.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(233,255,132,${intensity * 0.17})`;
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, radius * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `hsla(${75 + fly.tint},95%,78%,${core})`;
    ctx.beginPath();
    ctx.arc(fly.x, fly.y, 0.9 + intensity * 1.7, 0, Math.PI * 2);
    ctx.fill();
    // A dim body remains visible between flashes.
    ctx.fillStyle = 'rgba(140,176,156,0.33)';
    ctx.beginPath();
    ctx.ellipse(fly.x, fly.y + 1.4, 1.1, 1.8, Math.atan2(fly.vy, fly.vx), 0, Math.PI * 2);
    ctx.fill();
  }
}
