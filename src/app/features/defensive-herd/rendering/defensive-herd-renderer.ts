import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldCanvasRenderer,
} from '../../../shared/world-experience/world-protocol';
import {
  DefensiveHerdWorld,
  type HerdAnimal,
  type Wolf,
} from '../domain/defensive-herd-world';

interface GroundDetail {
  x: number;
  y: number;
  size: number;
  angle: number;
}

export class DefensiveHerdRenderer implements WorldCanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private world: DefensiveHerdWorld;
  private readonly ground: GroundDetail[] = [];

  constructor(private readonly canvas: HTMLCanvasElement, world: DefensiveHerdWorld) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Defensive Herd requires a 2D Canvas context');
    this.ctx = ctx;
    this.world = world;
    this.buildLandscape();
  }

  setWorld(world: InteractiveWorld): void {
    this.world = world as DefensiveHerdWorld;
    this.buildLandscape();
  }

  private buildLandscape(): void {
    const random = new SeededRandom(this.world.seed ^ 0x37a9bedd);
    this.ground.length = 0;
    for (let i = 0; i < 450; i++) {
      this.ground.push({
        x: random.range(0, this.world.width),
        y: random.range(0, this.world.height),
        size: random.range(2, 13),
        angle: random.range(0, Math.PI * 2),
      });
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  render(nowMs: number): void {
    const { width, height } = this.world;
    const ctx = this.ctx;
    const scale = Math.min(this.canvas.width / width, this.canvas.height / height);
    const offsetX = (this.canvas.width - width * scale) / 2;
    const offsetY = (this.canvas.height - height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#071312';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    const grassland = ctx.createLinearGradient(100, 0, 950, height);
    grassland.addColorStop(0, '#102126');
    grassland.addColorStop(0.46, '#162f2f');
    grassland.addColorStop(1, '#102125');
    ctx.fillStyle = grassland;
    ctx.fillRect(0, 0, width, height);

    // A low, wide moonlit meadow. No animation is used to move the animals.
    const moonlight = ctx.createRadialGradient(520, 220, 30, 520, 220, 690);
    moonlight.addColorStop(0, 'rgba(125,195,175,0.21)');
    moonlight.addColorStop(0.48, 'rgba(76,126,124,0.09)');
    moonlight.addColorStop(1, 'rgba(24,47,53,0)');
    ctx.fillStyle = moonlight;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 10; i++) {
      const y = -38 + i * 86;
      ctx.strokeStyle = 'rgba(158,203,182,0.034)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-20, y);
      ctx.bezierCurveTo(260, y - 60, 680, y + 80, width + 40, y - 25);
      ctx.stroke();
    }

    for (const detail of this.ground) {
      ctx.save();
      ctx.translate(detail.x, detail.y);
      ctx.rotate(detail.angle);
      ctx.strokeStyle = 'rgba(144,195,139,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-detail.size * 0.5, 0);
      ctx.lineTo(0, -detail.size);
      ctx.lineTo(detail.size * 0.4, -detail.size * 0.7);
      ctx.stroke();
      ctx.restore();
    }

    for (const pasture of this.world.pastures) {
      const gradient = ctx.createRadialGradient(
        pasture.x, pasture.y, 5, pasture.x, pasture.y, pasture.radius,
      );
      gradient.addColorStop(0, `rgba(110,181,126,${0.15 + pasture.food * 0.17})`);
      gradient.addColorStop(0.57, `rgba(94,155,106,${pasture.food * 0.045})`);
      gradient.addColorStop(1, 'rgba(80,155,90,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pasture.x, pasture.y, pasture.radius, 0, Math.PI * 2);
      ctx.fill();
      const strokes = Math.round(pasture.food * 15);
      for (let i = 0; i < strokes; i++) {
        const angle = i * 2.3999632297;
        const d = Math.sqrt((i + 0.5) / 16) * pasture.radius * 0.75;
        const x = pasture.x + Math.cos(angle) * d;
        const y = pasture.y + Math.sin(angle) * d;
        ctx.strokeStyle = `rgba(155,213,156,${pasture.food * 0.34})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x + Math.sin(angle) * 2, y - 5);
        ctx.stroke();
      }
    }

    for (const field of this.world.influences) {
      const opacity = Math.min(1, field.remaining / 3) * 0.24;
      const color = field.kind === 'scent' ? '246,188,150' : '144,218,218';
      const aura = ctx.createRadialGradient(field.x, field.y, 4, field.x, field.y, field.radius);
      aura.addColorStop(0, `rgba(${color},${opacity})`);
      aura.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${color},${opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // The defensive halo is derived from actual herd stress and adult positions.
    const center = this.world.calfCenter();
    if (this.world.defenseLevel > 0.04) {
      ctx.strokeStyle = `rgba(163,247,209,${this.world.defenseLevel * 0.23})`;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 15]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, 101, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const centerGlow = ctx.createRadialGradient(center.x, center.y, 4, center.x, center.y, 130);
      centerGlow.addColorStop(0, `rgba(191,255,204,${this.world.defenseLevel * 0.11})`);
      centerGlow.addColorStop(1, 'rgba(191,255,204,0)');
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 130, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const animal of this.world.herd) {
      this.drawAnimal(ctx, animal, nowMs);
    }
    for (const wolf of this.world.wolves) this.drawWolf(ctx, wolf);

    // Small drifting motes are decorative and do not modify the model.
    for (let i = 0; i < 26; i++) {
      const particle = this.ground[i * 6];
      const y = particle.y + Math.sin(nowMs * 0.00055 + particle.angle) * 8;
      ctx.fillStyle = 'rgba(186,239,181,0.23)';
      ctx.beginPath();
      ctx.arc(particle.x, y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawAnimal(ctx: CanvasRenderingContext2D, animal: HerdAnimal, nowMs: number): void {
    const adult = animal.kind === 'adult';
    const facing = Math.atan2(animal.facingY, animal.facingX);
    const bodyLength = adult ? 20 : 11;
    const bodyWidth = adult ? 12 : 7;
    const shimmer = Math.sin(nowMs * 0.002 + animal.phase) * 0.12;
    const defending = adult && this.world.defenseLevel > 0.3;

    ctx.save();
    ctx.translate(animal.x, animal.y);
    ctx.rotate(facing);
    ctx.shadowColor = adult ? 'rgba(153,255,210,0.38)' : 'rgba(255,207,137,0.66)';
    ctx.shadowBlur = adult ? (defending ? 16 : 7) : 19;
    ctx.fillStyle = adult ? '#7cbdae' : '#f6d0a0';
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLength, bodyWidth, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = adult ? '#b1e6d3' : '#ffe3b6';
    ctx.beginPath();
    ctx.ellipse(bodyLength * 0.8, 0, adult ? 10 : 6, adult ? 7 : 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = adult ? 'rgba(213,251,223,0.93)' : 'rgba(255,226,189,0.9)';
    ctx.lineWidth = adult ? 2.2 : 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bodyLength * 0.7, -bodyWidth * 0.5);
    ctx.quadraticCurveTo(bodyLength + 2, -bodyWidth - 8, bodyLength + 8, -bodyWidth - 5);
    ctx.moveTo(bodyLength * 0.7, bodyWidth * 0.5);
    ctx.quadraticCurveTo(bodyLength + 2, bodyWidth + 8, bodyLength + 8, bodyWidth + 5);
    ctx.stroke();

    const stride = Math.sin(this.world.time * 5 + animal.phase) * (adult ? 3 : 2);
    ctx.strokeStyle = adult ? '#406f67' : '#c6a479';
    ctx.lineWidth = adult ? 2 : 1.3;
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.35, -bodyWidth * 0.8);
    ctx.lineTo(-bodyLength * 0.6 - stride, -bodyWidth - 4);
    ctx.moveTo(-bodyLength * 0.35, bodyWidth * 0.8);
    ctx.lineTo(-bodyLength * 0.6 + stride, bodyWidth + 4);
    ctx.stroke();

    if (defending) {
      ctx.strokeStyle = `rgba(177,255,215,${0.27 + this.world.defenseLevel * 0.37 + shimmer})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 28, -1.45, 1.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawWolf(ctx: CanvasRenderingContext2D, wolf: Wolf): void {
    const angle = Math.atan2(wolf.vy, wolf.vx);
    ctx.save();
    ctx.translate(wolf.x, wolf.y);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(255,140,115,0.72)';
    ctx.shadowBlur = 17;
    ctx.fillStyle = '#dc8d7a';
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(4, -9);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-18, 6);
    ctx.lineTo(4, 9);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe2bc';
    ctx.beginPath();
    ctx.moveTo(13, -5);
    ctx.lineTo(14, -12);
    ctx.lineTo(19, -4);
    ctx.moveTo(13, 5);
    ctx.lineTo(14, 12);
    ctx.lineTo(19, 4);
    ctx.fill();
    ctx.restore();
  }
}
