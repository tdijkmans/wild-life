import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldCanvasRenderer,
} from '../../../shared/world-experience/world-protocol';
import {
  AbyssalBloomWorld,
  type Phytoplankton,
  type Zooplankton,
} from '../domain/abyssal-bloom-world';

interface MarineDetail {
  x: number;
  y: number;
  depth: number;
  size: number;
  phase: number;
}

export class AbyssalBloomRenderer implements WorldCanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private world: AbyssalBloomWorld;
  private readonly motes: MarineDetail[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    world: AbyssalBloomWorld,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Abyssal Bloom needs a 2D Canvas context');
    this.ctx = ctx;
    this.world = world;
    this.populate();
  }

  setWorld(world: InteractiveWorld): void {
    this.world = world as AbyssalBloomWorld;
    this.populate();
  }

  private populate(): void {
    const random = new SeededRandom(this.world.seed ^ 0x2a6e7b3c);
    this.motes.length = 0;
    for (let i = 0; i < 210; i++) {
      this.motes.push({
        x: random.range(0, this.world.width),
        y: random.range(0, this.world.height),
        depth: random.range(0.2, 1),
        size: random.range(0.45, 2.1),
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
    const left = (this.canvas.width - world.width * scale) / 2;
    const top = (this.canvas.height - world.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#020a18';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, left, top);

    const water = ctx.createLinearGradient(0, 0, 70, world.height);
    water.addColorStop(0, '#0b354b');
    water.addColorStop(0.22, '#093344');
    water.addColorStop(0.55, '#071d35');
    water.addColorStop(1, '#050b22');
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, world.width, world.height);

    const topGlow = ctx.createRadialGradient(460, -80, 30, 460, 0, 650);
    topGlow.addColorStop(0, 'rgba(103,229,226,0.38)');
    topGlow.addColorStop(0.55, 'rgba(63,164,184,0.11)');
    topGlow.addColorStop(1, 'rgba(24,73,133,0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, world.width, world.height);

    // Water-column shafts and shallow caustics are presentation-only.
    for (let i = 0; i < 10; i++) {
      const beam = ctx.createLinearGradient(0, 0, 0, 620);
      beam.addColorStop(0, 'rgba(158,242,230,0.11)');
      beam.addColorStop(1, 'rgba(136,214,239,0)');
      ctx.fillStyle = beam;
      const x = 95 + i * 115 + Math.sin(nowMs * 0.00017 + i) * 20;
      ctx.beginPath();
      ctx.moveTo(x - 30, 0);
      ctx.lineTo(x + 22, 0);
      ctx.lineTo(x + 160, 655);
      ctx.lineTo(x + 90, 655);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(142,250,243,0.1)';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 11; i++) {
      const x = i * 132;
      const y = 10 + Math.sin(nowMs * 0.0005 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 58, y + 13, x + 128, y);
      ctx.stroke();
    }

    // Currents and nutrient gradients are read from the simulated flow.
    for (let y = 55; y < world.height; y += 100) {
      for (let x = 50; x < world.width; x += 107) {
        const flow = world.flowAt(x, y);
        const nutrients = world.nutrientAt(x, y);
        const mag = Math.max(1, Math.hypot(flow.x, flow.y));
        const vx = (flow.x / mag) * Math.min(16, mag * 0.2);
        const vy = (flow.y / mag) * Math.min(16, mag * 0.2);
        ctx.strokeStyle = `rgba(118,209,237,${0.03 + nutrients * 0.046})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - vx, y - vy);
        ctx.quadraticCurveTo(x, y, x + vx, y + vy);
        ctx.stroke();
      }
    }

    for (const field of world.fields) {
      const tint =
        field.kind === 'light'
          ? '163,236,209'
          : field.kind === 'upwelling'
            ? '101,206,242'
            : '148,166,239';
      const alpha = Math.min(1, field.remaining / 3) * 0.27;
      const halo = ctx.createRadialGradient(field.x, field.y, 0, field.x, field.y, field.radius);
      halo.addColorStop(0, `rgba(${tint},${alpha})`);
      halo.addColorStop(0.58, `rgba(${tint},${alpha * 0.23})`);
      halo.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = `rgba(${tint},${alpha * 0.8})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius * 0.45, -1, 2.2);
      ctx.stroke();
    }

    // Dim surrounding particles first, then luminous living producers.
    for (const mote of this.motes) {
      const drift = Math.sin(nowMs * 0.00055 + mote.phase) * 9 * mote.depth;
      ctx.fillStyle = `rgba(149,205,230,${0.07 + mote.depth * 0.1})`;
      ctx.beginPath();
      ctx.arc(mote.x + drift, mote.y, mote.size, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'screen';
    for (const producer of world.phytoplankton) this.drawProducer(ctx, producer, nowMs);
    for (const grazer of world.grazers) this.drawGrazer(ctx, grazer, nowMs);
    ctx.globalCompositeOperation = 'source-over';

    const depth = ctx.createLinearGradient(0, 500, 0, 720);
    depth.addColorStop(0, 'rgba(3,15,33,0)');
    depth.addColorStop(1, 'rgba(2,5,21,0.65)');
    ctx.fillStyle = depth;
    ctx.fillRect(0, 500, world.width, 220);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawProducer(
    ctx: CanvasRenderingContext2D,
    producer: Phytoplankton,
    nowMs: number,
  ): void {
    const pulse = 0.7 + Math.sin(nowMs * 0.0017 + producer.phase) * 0.28;
    const luminous = Math.max(0.15, producer.luminosity * producer.energy * pulse);
    const radius = 1.3 + Math.min(2.4, producer.energy * 1.5);
    ctx.fillStyle = `hsla(${175 + producer.hue}, 91%, 64%, ${Math.min(0.28, luminous * 0.2)})`;
    ctx.beginPath();
    ctx.arc(producer.x, producer.y, radius * 3.1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = `hsla(${177 + producer.hue}, 100%, 82%, ${Math.min(1, luminous * 0.89)})`;
    ctx.beginPath();
    ctx.arc(producer.x, producer.y, radius * 0.85, 0, 2 * Math.PI);
    ctx.fill();
  }

  private drawGrazer(ctx: CanvasRenderingContext2D, grazer: Zooplankton, nowMs: number): void {
    const angle = Math.atan2(grazer.vy, grazer.vx);
    const breath = 1 + Math.sin(nowMs * 0.0024 + grazer.phase) * 0.16;
    const glow = 0.22 + grazer.feedingGlow * 0.62;
    ctx.save();
    ctx.translate(grazer.x, grazer.y);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(244,164,205,${glow * 0.36})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17 * breath, 10 * breath, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = `rgba(250,190,219,${0.49 + glow * 0.42})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 * breath, 5 * breath, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = `rgba(251,196,224,${0.34 + glow * 0.34})`;
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-6, i * 3);
      ctx.quadraticCurveTo(-20, i * 7 + Math.sin(nowMs * 0.002 + i) * 4, -26, i * 7);
      ctx.stroke();
    }
    ctx.restore();
  }
}
