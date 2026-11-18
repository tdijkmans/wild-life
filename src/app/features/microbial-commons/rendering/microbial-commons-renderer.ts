import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldCanvasRenderer,
} from '../../../shared/world-experience/world-protocol';
import {
  MicrobialCommonsWorld,
  MICRO_COLS,
  MICRO_ROWS,
  MICRO_SITES,
} from '../domain/microbial-commons-world';

interface AgarParticle {
  x: number;
  y: number;
  radius: number;
  phase: number;
}

const SITE_WIDTH = 1200 / MICRO_COLS;
const SITE_HEIGHT = 720 / MICRO_ROWS;

export class MicrobialCommonsRenderer implements WorldCanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private world: MicrobialCommonsWorld;
  private readonly motes: AgarParticle[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    world: MicrobialCommonsWorld,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Microbial Commons requires a 2D Canvas context');
    this.ctx = ctx;
    this.world = world;
    this.populate();
  }

  setWorld(world: InteractiveWorld): void {
    this.world = world as MicrobialCommonsWorld;
    this.populate();
  }

  private populate(): void {
    const random = new SeededRandom(this.world.seed ^ 0x542c917d);
    this.motes.length = 0;
    for (let i = 0; i < 250; i++) {
      this.motes.push({
        x: random.range(125, 1075),
        y: random.range(82, 640),
        radius: random.range(0.6, 2.3),
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
    ctx.fillStyle = '#100d20';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, left, top);

    const bench = ctx.createRadialGradient(580, 330, 15, 580, 330, 740);
    bench.addColorStop(0, '#2b203e');
    bench.addColorStop(0.54, '#1c162f');
    bench.addColorStop(1, '#0b1124');
    ctx.fillStyle = bench;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.save();
    ctx.shadowColor = 'rgba(155,129,232,0.36)';
    ctx.shadowBlur = 42;
    ctx.fillStyle = '#172b3c';
    ctx.beginPath();
    ctx.ellipse(600, 359, 555, 328, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(600, 359, 544, 315, 0, 0, Math.PI * 2);
    ctx.clip();
    const agar = ctx.createRadialGradient(535, 290, 45, 600, 355, 620);
    agar.addColorStop(0, '#244453');
    agar.addColorStop(0.37, '#193345');
    agar.addColorStop(0.7, '#14293e');
    agar.addColorStop(1, '#121c31');
    ctx.fillStyle = agar;
    ctx.fillRect(25, 24, 1150, 672);

    const moisture = ctx.createRadialGradient(400, 240, 20, 400, 240, 600);
    moisture.addColorStop(0, 'rgba(168,231,204,0.12)');
    moisture.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = moisture;
    ctx.fillRect(0, 0, 1200, 720);

    // The substrate glow is an interpolation of actual resource concentrations.
    for (let i = 0; i < MICRO_SITES; i += 3) {
      const col = i % MICRO_COLS;
      const row = Math.floor(i / MICRO_COLS);
      if (!world.insideDish(col, row)) continue;
      const n = world.nutrients[i];
      const metabolite = world.metabolite[i];
      const inhibitor = world.inhibitor[i];
      const x = (col + 0.5) * SITE_WIDTH;
      const y = (row + 0.5) * SITE_HEIGHT;
      ctx.fillStyle = `rgba(89,226,198,${0.017 + n * 0.045})`;
      ctx.fillRect(
        x - SITE_WIDTH * 1.3,
        y - SITE_HEIGHT * 1.3,
        SITE_WIDTH * 2.6,
        SITE_HEIGHT * 2.6,
      );
      if (metabolite > 0.04) {
        ctx.fillStyle = `rgba(136,160,249,${Math.min(0.16, metabolite * 0.2)})`;
        ctx.beginPath();
        ctx.arc(x, y, 8 + metabolite * 11, 0, Math.PI * 2);
        ctx.fill();
      }
      if (inhibitor > 0.05) {
        ctx.fillStyle = `rgba(248,145,120,${Math.min(0.13, inhibitor * 0.18)})`;
        ctx.beginPath();
        ctx.arc(x, y, 7 + inhibitor * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const colors = ['', '147,236,193', '174,167,255', '252,167,129'];
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < MICRO_SITES; i++) {
      const strain = world.species[i];
      const mass = world.biomass[i];
      if (!strain || mass < 0.05) continue;
      const col = i % MICRO_COLS;
      const row = Math.floor(i / MICRO_COLS);
      const x = (col + 0.5) * SITE_WIDTH;
      const y = (row + 0.5) * SITE_HEIGHT;
      const tint = colors[strain];
      const radius = 3.3 + mass * 5.2;
      ctx.fillStyle = `rgba(${tint},${0.1 + mass * 0.16})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${tint},${0.36 + mass * 0.54})`;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 0.87, Math.sin(i) * 0.45, 0, Math.PI * 2);
      ctx.fill();
      if (mass > 0.6) {
        ctx.fillStyle = `rgba(242,250,229,${(mass - 0.6) * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (col + 1 < MICRO_COLS && world.species[i + 1] === strain && world.biomass[i + 1] > 0.2) {
        ctx.strokeStyle = `rgba(${tint},${mass * 0.16})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + SITE_WIDTH, y);
        ctx.stroke();
      }
      if (
        row + 1 < MICRO_ROWS &&
        world.species[i + MICRO_COLS] === strain &&
        world.biomass[i + MICRO_COLS] > 0.2
      ) {
        ctx.strokeStyle = `rgba(${tint},${mass * 0.16})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + SITE_HEIGHT);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    for (const field of world.fields) {
      const tint =
        field.kind === 'nutrients'
          ? '245,220,132'
          : field.kind === 'oxygen'
            ? '127,225,243'
            : '204,175,249';
      const alpha = Math.min(1, field.remaining / 2) * 0.23;
      const halo = ctx.createRadialGradient(field.x, field.y, 4, field.x, field.y, field.radius);
      halo.addColorStop(0, `rgba(${tint},${alpha})`);
      halo.addColorStop(0.62, `rgba(${tint},${alpha * 0.22})`);
      halo.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${tint},${alpha * 0.85})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius * 0.45, -0.9, 2.5);
      ctx.stroke();
    }

    for (const mote of this.motes) {
      const x = mote.x + Math.sin(nowMs * 0.0007 + mote.phase) * 3;
      const y = mote.y + Math.cos(nowMs * 0.0006 + mote.phase) * 3;
      ctx.fillStyle = 'rgba(205,239,220,0.11)';
      ctx.beginPath();
      ctx.arc(x, y, mote.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Glass rims are the only nonliving circles in the scene.
    ctx.strokeStyle = 'rgba(189,232,239,0.29)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(600, 359, 549, 322, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(223,241,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(600, 359, 560, 333, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
