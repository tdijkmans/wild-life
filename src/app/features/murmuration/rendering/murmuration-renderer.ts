import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldCanvasRenderer,
} from '../../../shared/world-experience/world-protocol';
import { MurmurationWorld, type Starling } from '../domain/murmuration-world';

interface SkyParticle {
  x: number;
  y: number;
  size: number;
  phase: number;
}

export class MurmurationRenderer implements WorldCanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private world: MurmurationWorld;
  private readonly particles: SkyParticle[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    world: MurmurationWorld,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Murmuration requires a 2D Canvas context');
    this.context = context;
    this.world = world;
    this.populateSky();
  }

  setWorld(world: InteractiveWorld): void {
    this.world = world as MurmurationWorld;
    this.populateSky();
  }

  private populateSky(): void {
    const random = new SeededRandom(this.world.seed ^ 0x7e1f5a3c);
    this.particles.length = 0;
    for (let i = 0; i < 160; i++) {
      this.particles.push({
        x: random.range(0, this.world.width),
        y: random.range(0, this.world.height * 0.72),
        size: random.range(0.35, 1.5),
        phase: random.range(0, Math.PI * 2),
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
    const ctx = this.context;
    const { width, height } = this.world;
    const scale = Math.min(this.canvas.width / width, this.canvas.height / height);
    const offsetX = (this.canvas.width - width * scale) / 2;
    const offsetY = (this.canvas.height - height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#090c19';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    const sky = ctx.createLinearGradient(0, 0, 160, height);
    sky.addColorStop(0, '#100e21');
    sky.addColorStop(0.35, '#25253b');
    sky.addColorStop(0.72, '#3d3547');
    sky.addColorStop(0.91, '#735162');
    sky.addColorStop(1, '#2d2c38');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const dusk = ctx.createRadialGradient(810, 620, 40, 810, 620, 660);
    dusk.addColorStop(0, 'rgba(248,167,119,0.29)');
    dusk.addColorStop(0.44, 'rgba(172,119,146,0.11)');
    dusk.addColorStop(1, 'rgba(58,58,86,0)');
    ctx.fillStyle = dusk;
    ctx.fillRect(0, 0, width, height);

    // Long translucent bands give the scene atmospheric depth, not motion rules.
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(190,166,205,${0.017 + i * 0.006})`;
      ctx.lineWidth = 22 + i * 15;
      ctx.beginPath();
      const y = 110 + i * 79;
      ctx.moveTo(-80, y);
      ctx.bezierCurveTo(220, y - 100, 660, y + 160, width + 100, y - 55);
      ctx.stroke();
    }

    for (const particle of this.particles) {
      const flicker = 0.55 + Math.sin(nowMs * 0.0007 + particle.phase) * 0.3;
      ctx.fillStyle = `rgba(225,222,241,${flicker * 0.54})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // A distant flock shadow conveys depth below the active flight plane.
    ctx.fillStyle = 'rgba(14,19,32,0.12)';
    ctx.beginPath();
    ctx.ellipse(680, 710, 530, 68, -0.1, 0, Math.PI * 2);
    ctx.fill();

    for (const field of this.world.fields) {
      const alpha = Math.min(1, field.remaining / 3) * 0.23;
      const tint =
        field.kind === 'thermal'
          ? '247,178,130'
          : field.kind === 'wind'
            ? '158,220,246'
            : '181,229,209';
      const halo = ctx.createRadialGradient(field.x, field.y, 4, field.x, field.y, field.radius);
      halo.addColorStop(0, `rgba(${tint},${alpha})`);
      halo.addColorStop(0.6, `rgba(${tint},${alpha * 0.25})`);
      halo.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = `rgba(${tint},${alpha * 1.1})`;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius * 0.5, -1.2, 2.6);
      ctx.stroke();
    }

    for (const bird of this.world.birds) {
      this.drawBird(ctx, bird);
    }
    this.drawRaptor(ctx);

    const ground = ctx.createLinearGradient(0, 635, 0, 720);
    ground.addColorStop(0, 'rgba(18,17,30,0)');
    ground.addColorStop(1, 'rgba(6,12,22,0.55)');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 635, width, 85);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawBird(ctx: CanvasRenderingContext2D, bird: Starling): void {
    const angle = Math.atan2(bird.vy, bird.vx);
    const wing = Math.sin(this.world.time * 13 + bird.phase);
    const span = 5.2 + Math.abs(wing) * 2.6;
    const speed = Math.hypot(bird.vx, bird.vy);
    ctx.strokeStyle = `rgba(199,213,233,${0.05 + bird.shade * 0.075})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bird.x - bird.vx * 0.19, bird.y - bird.vy * 0.19);
    ctx.lineTo(bird.x, bird.y);
    ctx.stroke();
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(233,227,236,${Math.min(1, bird.shade * 0.87)})`;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.quadraticCurveTo(-1, -1.8 - wing * 0.4, -4, -span);
    ctx.quadraticCurveTo(-2, -2.8, -7, 0);
    ctx.quadraticCurveTo(-2, 2.8, -4, span);
    ctx.quadraticCurveTo(-1, 1.8 + wing * 0.4, 6, 0);
    ctx.fill();
    if (speed > 110) {
      ctx.strokeStyle = 'rgba(239,198,177,0.3)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-9, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawRaptor(ctx: CanvasRenderingContext2D): void {
    const raptor = this.world.raptor;
    const direction = Math.atan2(raptor.vy, raptor.vx);
    const wing = Math.sin(this.world.time * 5) * 4;
    ctx.save();
    ctx.translate(raptor.x, raptor.y);
    ctx.rotate(direction);
    ctx.shadowColor = 'rgba(255,167,104,0.75)';
    ctx.shadowBlur = 21;
    ctx.fillStyle = '#ffd6ad';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.quadraticCurveTo(-4, -7, -15, -21 - wing);
    ctx.quadraticCurveTo(-7, -4, -18, 0);
    ctx.quadraticCurveTo(-7, 4, -15, 21 + wing);
    ctx.quadraticCurveTo(-4, 7, 16, 0);
    ctx.fill();
    ctx.restore();
  }
}
