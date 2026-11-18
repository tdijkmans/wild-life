import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldCanvasRenderer,
} from '../../../shared/world-experience/world-protocol';
import { ReefWorld, type CoralColony, type AlgaePatch, type ReefFish } from '../domain/reef-world';

interface ReefMote {
  x: number;
  y: number;
  size: number;
  phase: number;
}

export class ReefRenderer implements WorldCanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private world: ReefWorld;
  private readonly motes: ReefMote[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    world: ReefWorld,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Reef requires a 2D Canvas context');
    this.ctx = ctx;
    this.world = world;
    this.populate();
  }

  setWorld(world: InteractiveWorld): void {
    this.world = world as ReefWorld;
    this.populate();
  }

  private populate(): void {
    const random = new SeededRandom((this.world.seed ^ 0x91de20c4) >>> 0);
    this.motes.length = 0;
    for (let i = 0; i < 185; i++) {
      this.motes.push({
        x: random.range(0, this.world.width),
        y: random.range(0, this.world.height),
        size: random.range(0.5, 2),
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
    ctx.fillStyle = '#042332';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, left, top);

    const sea = ctx.createLinearGradient(0, 0, 160, 720);
    sea.addColorStop(0, '#11566c');
    sea.addColorStop(0.35, '#104759');
    sea.addColorStop(0.68, '#0b3442');
    sea.addColorStop(1, '#092831');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, 1200, 720);
    const sunlight = ctx.createRadialGradient(560, -70, 8, 560, -70, 780);
    sunlight.addColorStop(0, 'rgba(182,248,220,0.39)');
    sunlight.addColorStop(0.45, 'rgba(99,215,202,0.11)');
    sunlight.addColorStop(1, 'rgba(20,89,97,0)');
    ctx.fillStyle = sunlight;
    ctx.fillRect(0, 0, 1200, 720);

    // Gentle shafts and distant terrain establish depth; all coral is modeled.
    for (let i = 0; i < 9; i++) {
      const startX = 50 + i * 140 + Math.sin(nowMs * 0.00024 + i) * 10;
      const light = ctx.createLinearGradient(0, 0, 0, 720);
      light.addColorStop(0, 'rgba(199,255,223,0.085)');
      light.addColorStop(1, 'rgba(199,255,223,0)');
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + 28, 0);
      ctx.lineTo(startX + 200, 720);
      ctx.lineTo(startX + 100, 720);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(7,42,48,0.42)';
    ctx.beginPath();
    ctx.moveTo(0, 720);
    for (let x = 0; x <= 1200; x += 20) {
      const y = 610 + Math.sin(x * 0.018) * 21 + Math.cos(x * 0.042) * 11;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(1200, 720);
    ctx.fill();

    for (const algae of world.algae) this.drawAlgae(ctx, algae);
    for (const coral of world.corals) this.drawCoral(ctx, coral, nowMs);

    for (const field of world.fields) {
      const tint =
        field.kind === 'cool'
          ? '156,229,244'
          : field.kind === 'nutrients'
            ? '230,221,131'
            : '130,208,243';
      const opacity = Math.min(1, field.remaining / 2) * 0.25;
      const glow = ctx.createRadialGradient(field.x, field.y, 4, field.x, field.y, field.radius);
      glow.addColorStop(0, `rgba(${tint},${opacity})`);
      glow.addColorStop(0.65, `rgba(${tint},${opacity * 0.2})`);
      glow.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      ctx.fill();
      if (field.kind === 'current') {
        ctx.strokeStyle = `rgba(${tint},${opacity})`;
        ctx.lineWidth = 1;
        for (let j = -2; j <= 2; j++) {
          ctx.beginPath();
          ctx.moveTo(field.x - 55, field.y + j * 20);
          ctx.quadraticCurveTo(field.x, field.y + j * 20 - 15, field.x + 55, field.y + j * 20);
          ctx.stroke();
        }
      }
    }
    for (const fish of world.fish) this.drawFish(ctx, fish, nowMs);
    for (const mote of this.motes) {
      const sway = Math.sin(nowMs * 0.0006 + mote.phase) * 7;
      ctx.fillStyle = 'rgba(191,245,231,0.16)';
      ctx.beginPath();
      ctx.arc(mote.x + sway, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
    const deep = ctx.createLinearGradient(0, 535, 0, 720);
    deep.addColorStop(0, 'rgba(1,25,30,0)');
    deep.addColorStop(1, 'rgba(4,20,28,0.36)');
    ctx.fillStyle = deep;
    ctx.fillRect(0, 535, 1200, 185);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawCoral(ctx: CanvasRenderingContext2D, coral: CoralColony, nowMs: number): void {
    const symbiosis = coral.symbionts;
    const hue = 12 + coral.hue + symbiosis * 22;
    const saturation = 10 + symbiosis * 66;
    const brightness = 63 + symbiosis * 10;
    const coralTone = `hsl(${hue},${saturation}%,${brightness}%)`;
    for (let index = 0; index < coral.branches.length; index++) {
      const branch = coral.branches[index];
      const shape = this.world.branchGeometry(coral, index);
      ctx.strokeStyle = `hsla(${hue + 9},${saturation * 0.74}%,${brightness * 0.58}%,0.97)`;
      ctx.lineWidth = Math.max(1.1, branch.width + 1.6);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      ctx.strokeStyle = coralTone;
      ctx.lineWidth = Math.max(0.8, branch.width * 0.59);
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      if (branch.depth >= 2) {
        const pulse = 0.7 + Math.sin(nowMs * 0.0017 + coral.id + index) * 0.13;
        const tip = 1.2 + branch.depth * 0.35;
        ctx.fillStyle = `hsla(${hue - 6},${saturation}%,88%,${pulse})`;
        ctx.beginPath();
        ctx.arc(shape.x2, shape.y2, tip, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (symbiosis < 0.45) {
      // Desaturation follows real symbiont loss, not an arbitrary screen effect.
      ctx.strokeStyle = `rgba(236,243,230,${0.27 + (0.45 - symbiosis) * 0.45})`;
      ctx.lineWidth = 1;
      const top = this.world.branchGeometry(coral, 0);
      ctx.beginPath();
      ctx.arc(top.x2, top.y2, 11, -1.9, 0.25);
      ctx.stroke();
    }
  }

  private drawAlgae(ctx: CanvasRenderingContext2D, algae: AlgaePatch): void {
    if (algae.mass < 0.02) return;
    const radius = algae.radius * (0.35 + algae.mass * 0.65);
    const light = ctx.createRadialGradient(algae.x, algae.y, 0, algae.x, algae.y, radius * 1.5);
    light.addColorStop(0, `rgba(113,209,143,${algae.mass * 0.17})`);
    light.addColorStop(1, 'rgba(113,209,143,0)');
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(algae.x, algae.y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${147 + algae.hue},55%,66%,${0.3 + algae.mass * 0.48})`;
    ctx.lineWidth = 1.6;
    const fronds = Math.max(2, Math.round(algae.mass * 10));
    for (let i = 0; i < fronds; i++) {
      const theta = (i / fronds) * Math.PI * 1.2 - Math.PI * 0.94;
      const span = radius * (0.56 + (i % 3) * 0.16);
      ctx.beginPath();
      ctx.moveTo(algae.x, algae.y);
      ctx.quadraticCurveTo(
        algae.x + Math.cos(theta) * span * 0.48 - 7,
        algae.y + Math.sin(theta) * span * 0.44,
        algae.x + Math.cos(theta) * span,
        algae.y + Math.sin(theta) * span,
      );
      ctx.stroke();
    }
  }

  private drawFish(ctx: CanvasRenderingContext2D, fish: ReefFish, nowMs: number): void {
    const angle = Math.atan2(fish.vy, fish.vx);
    const flutter = Math.sin(nowMs * 0.004 + fish.phase) * 3;
    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.rotate(angle);
    ctx.fillStyle = `hsla(${41 + fish.hue},78%,75%,0.94)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 6.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,169,134,0.91)';
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(-22, -8 + flutter);
    ctx.lineTo(-22, 8 + flutter);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(13,61,67,0.85)';
    ctx.beginPath();
    ctx.arc(6.5, -1.2, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(252,234,174,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.lineTo(0, -9);
    ctx.lineTo(4, -5);
    ctx.stroke();
    ctx.restore();
  }
}
