import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldCanvasRenderer,
} from '../../../shared/world-experience/world-protocol';
import { CanopyWorld, type CanopyTree, type Leaf } from '../domain/canopy-world';

interface ForestDetail {
  x: number;
  y: number;
  radius: number;
  phase: number;
}

export class CanopyRenderer implements WorldCanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private world: CanopyWorld;
  private readonly motes: ForestDetail[] = [];

  constructor(private readonly canvas: HTMLCanvasElement, world: CanopyWorld) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canopy needs a 2D Canvas context');
    this.ctx = ctx;
    this.world = world;
    this.populate();
  }

  setWorld(world: InteractiveWorld): void {
    this.world = world as CanopyWorld;
    this.populate();
  }

  private populate(): void {
    const random = new SeededRandom(this.world.seed ^ 0x4c9eab31);
    this.motes.length = 0;
    for (let i = 0; i < 150; i++) {
      this.motes.push({
        x: random.range(0, this.world.width),
        y: random.range(40, this.world.height),
        radius: random.range(0.4, 1.7),
        phase: random.range(0, 2 * Math.PI),
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
    ctx.fillStyle = '#071b19';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    const sky = ctx.createLinearGradient(0, 0, 0, world.height);
    sky.addColorStop(0, '#132f33');
    sky.addColorStop(0.34, '#20463e');
    sky.addColorStop(0.71, '#233f36');
    sky.addColorStop(1, '#0b2425');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, world.width, world.height);

    const sun = ctx.createRadialGradient(780, 54, 10, 780, 54, 570);
    sun.addColorStop(0, 'rgba(245,235,157,0.41)');
    sun.addColorStop(0.24, 'rgba(210,225,138,0.17)');
    sun.addColorStop(1, 'rgba(79,149,115,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.globalAlpha = 0.36;
    for (let i = 0; i < 7; i++) {
      const beam = ctx.createLinearGradient(470 + i * 62, 0, 620 + i * 65, 680);
      beam.addColorStop(0, 'rgba(226,238,179,0.22)');
      beam.addColorStop(1, 'rgba(226,238,179,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(742, 0);
      ctx.lineTo(810, 0);
      ctx.lineTo(100 + i * 150, 685);
      ctx.lineTo(60 + i * 150, 685);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Distant layers frame the growing foreground; only the foreground is simulated.
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['rgba(9,36,38,0.22)', 'rgba(11,39,35,0.29)', 'rgba(5,31,29,0.36)'][layer];
      ctx.beginPath();
      ctx.moveTo(0, 720);
      for (let x = -20; x <= 1240; x += 22) {
        const y = 560 + layer * 40 +
          Math.sin(x * 0.024 + layer * 2) * 26 +
          Math.sin(x * 0.066 + layer) * 13;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(1200, 720);
      ctx.fill();
    }

    for (const field of world.fields) {
      const tint = field.kind === 'rain' ? '139,211,210' :
        field.kind === 'sunlight' ? '250,229,146' : '240,178,188';
      const strength = Math.min(1, field.remaining / 3);
      const halo = ctx.createRadialGradient(field.x, field.y, 3, field.x, field.y, field.radius);
      halo.addColorStop(0, `rgba(${tint},${strength * 0.24})`);
      halo.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, 2 * Math.PI);
      ctx.fill();
      if (field.kind === 'rain') {
        ctx.strokeStyle = `rgba(191,238,230,${strength * 0.21})`;
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 28; i++) {
          const angle = i * 2.39996323;
          const radius = Math.sqrt((i + 0.5) / 28) * field.radius;
          const x = field.x + Math.cos(angle) * radius;
          const y = field.y + Math.sin(angle) * radius;
          const offset = ((nowMs * 0.035 + i * 17) % 38);
          ctx.beginPath();
          ctx.moveTo(x, y + offset - 20);
          ctx.lineTo(x - 3, y + offset - 8);
          ctx.stroke();
        }
      }
    }

    const ground = ctx.createLinearGradient(0, 605, 0, 720);
    ground.addColorStop(0, 'rgba(10,32,29,0)');
    ground.addColorStop(1, 'rgba(3,19,16,0.95)');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 605, world.width, 115);

    for (const tree of world.trees) this.drawTree(ctx, tree, nowMs);
    for (const insect of world.insects) {
      const bob = Math.sin(nowMs * 0.004 + insect.phase) * 2;
      ctx.strokeStyle = 'rgba(250,212,148,0.2)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(insect.x - insect.vx * 0.08, insect.y - insect.vy * 0.08);
      ctx.lineTo(insect.x, insect.y);
      ctx.stroke();
      ctx.shadowColor = 'rgba(255,217,130,0.65)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#e1c68b';
      ctx.beginPath();
      ctx.ellipse(insect.x, insect.y + bob, 2.5, 1.5, Math.atan2(insect.vy, insect.vx), 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const mote of this.motes) {
      const drift = Math.sin(nowMs * 0.0007 + mote.phase);
      ctx.fillStyle = `rgba(217,250,185,${0.16 + drift * 0.09})`;
      ctx.beginPath();
      ctx.arc(mote.x + drift * 5, mote.y, mote.radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawTree(ctx: CanvasRenderingContext2D, tree: CanopyTree, nowMs: number): void {
    ctx.strokeStyle = '#4b4836';
    ctx.lineCap = 'round';
    // Branches inherit their positions from growing parent tips.
    for (let index = 0; index < tree.branches.length; index++) {
      const branch = tree.branches[index];
      const geom = this.world.branchGeometry(tree, index);
      ctx.strokeStyle = branch.depth < 2 ? '#605d46' : '#637052';
      ctx.lineWidth = Math.max(1, branch.thickness * Math.pow(branch.progress, 0.4));
      ctx.beginPath();
      ctx.moveTo(geom.x1, geom.y1);
      const curl = Math.sin(branch.angle * 2) * 4 * branch.progress;
      ctx.quadraticCurveTo(
        (geom.x1 + geom.x2) * 0.5 + curl,
        (geom.y1 + geom.y2) * 0.5,
        geom.x2, geom.y2,
      );
      ctx.stroke();
      if (branch.depth < 2) {
        ctx.strokeStyle = 'rgba(176,177,118,0.19)';
        ctx.lineWidth = Math.max(0.5, branch.thickness * 0.13);
        ctx.beginPath();
        ctx.moveTo(geom.x1 + 1.5, geom.y1);
        ctx.lineTo(geom.x2 + 1.5, geom.y2);
        ctx.stroke();
      }
    }
    for (const leaf of tree.leaves) this.drawLeaf(ctx, leaf, tree, nowMs);
  }

  private drawLeaf(ctx: CanvasRenderingContext2D, leaf: Leaf, tree: CanopyTree, nowMs: number): void {
    if (leaf.health <= 0.03 || leaf.growth <= 0.03) return;
    const branch = tree.branches[leaf.branch];
    const size = leaf.growth * (8.4 + branch.depth * 1.1);
    const injury = Math.min(1, Math.max(0, 1 - leaf.health));
    const angle = branch.angle + leaf.side * 0.85;
    const sway = Math.sin(nowMs * 0.0015 + leaf.id * 0.31) * (1.5 + leaf.growth);
    const x = leaf.x + sway;
    const y = leaf.y + sway * 0.35;
    const tone = Math.round(133 + tree.hue + leaf.hue);
    const opacity = Math.max(0.12, leaf.health * 0.83);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = `hsla(${tone}, 44%, ${33 + leaf.growth * 16}%, ${opacity})`;
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, 0);
    ctx.quadraticCurveTo(-size * 0.13, -size * 0.85, size, 0);
    ctx.quadraticCurveTo(-size * 0.13, size * 0.85 * (1 - injury * 0.53), -size * 0.5, 0);
    ctx.fill();
    ctx.strokeStyle = `rgba(200,244,167,${opacity * 0.29})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, 0);
    ctx.lineTo(size * (1 - injury * 0.4), 0);
    ctx.stroke();
    // Irregular damage is a direct visualization of remaining leaf health.
    if (injury > 0.24) {
      ctx.fillStyle = 'rgba(17,42,32,0.75)';
      ctx.beginPath();
      ctx.arc(size * 0.23, size * 0.33, size * injury * 0.28, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }
}
