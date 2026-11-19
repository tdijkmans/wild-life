import { LivingWorld, clamp } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';
export interface ColorCell {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: number;
  energy: number;
  age: number;
  affinity: number;
}
/** Four heritable populations with short-range repulsion and pair-specific affinities. */
export class ChromaticCommonsWorld extends LivingWorld {
  readonly cells: ColorCell[] = [];
  readonly affinities = [
    [1, 0.28, -0.2, 0.1],
    [0.28, 1, 0.12, -0.2],
    [-0.2, 0.12, 1, 0.28],
    [0.1, -0.2, 0.28, 1],
  ];
  births = 0;
  exchanges = 0;
  assortment = 0;
  private id = 0;
  private turnover = 0;
  constructor(seed = 20261127) {
    super(seed);
    for (let i = 0; i < 220; i++)
      this.cells.push({
        id: ++this.id,
        x: this.random.range(160, 1040),
        y: this.random.range(120, 600),
        vx: 0,
        vy: 0,
        kind: i % 4,
        energy: this.random.range(0.5, 1),
        age: this.random.range(0, 55),
        affinity: this.random.range(0.8, 1.2),
      });
    this.sample(this.cells.length, 0);
  }
  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (this.field(kind, x, y, ['nutrients', 'mix', 'haven'], dx, dy))
      this.cue(kind === 'mix' ? 'flow' : kind === 'haven' ? 'hush' : 'bloom');
  }
  step(dt: number): void {
    if (!this.advance(dt)) return;
    this.turnover += dt;
    const forces = this.cells.map(() => ({ x: 0, y: 0, neighbors: 0, same: 0 }));
    let contacts = 0,
      same = 0;
    for (let i = 0; i < this.cells.length; i++)
      for (let j = i + 1; j < this.cells.length; j++) {
        const a = this.cells[i],
          b = this.cells[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy) || 0.01;
        if (d > 95) continue;
        forces[i].neighbors++;
        forces[j].neighbors++;
        contacts++;
        if (a.kind === b.kind) {
          same++;
          forces[i].same++;
          forces[j].same++;
        }
        const affinity = (this.affinities[a.kind][b.kind] * (a.affinity + b.affinity)) / 2;
        const force = d < 15 ? -(15 - d) * 3 : affinity * Math.sin(((d - 15) / 80) * Math.PI) * 9;
        forces[i].x += (dx / d) * force;
        forces[i].y += (dy / d) * force;
        forces[j].x -= (dx / d) * force;
        forces[j].y -= (dy / d) * force;
        if (a.kind !== b.kind && affinity > 0 && d < 24) {
          const transfer = (a.energy - b.energy) * dt * 0.08;
          a.energy -= transfer;
          b.energy += transfer;
          if (Math.abs(transfer) > 0.00005) this.exchanges++;
        }
      }
    this.assortment = contacts ? same / contacts : 0;
    for (let i = 0; i < this.cells.length; i++) {
      const a = this.cells[i],
        f = forces[i],
        mix = this.fieldAt('mix', a.x, a.y),
        haven = this.fieldAt('haven', a.x, a.y);
      const wander = a.id * 2.3 + this.time * 0.4;
      let ax = f.x + Math.cos(wander) * 3,
        ay = f.y + Math.sin(wander) * 3;
      for (const field of this.fields)
        if (field.kind === 'mix') {
          const dx = a.x - field.x,
            dy = a.y - field.y,
            d = Math.hypot(dx, dy) || 1,
            s = Math.max(0, 1 - d / field.radius);
          ax -= (dy / d) * s * 85;
          ay += (dx / d) * s * 85;
        }
      ax += (600 - a.x) * 0.012;
      ay += (360 - a.y) * 0.012;
      a.vx = clamp((a.vx + ax * dt) * Math.exp(-dt * (1.2 + haven)), -65, 65);
      a.vy = clamp((a.vy + ay * dt) * Math.exp(-dt * (1.2 + haven)), -65, 65);
      a.x = clamp(a.x + a.vx * dt, 45, 1155);
      a.y = clamp(a.y + a.vy * dt, 45, 675);
      a.age += dt;
      a.energy = clamp(
        a.energy +
          dt *
            (0.026 +
              this.fieldAt('nutrients', a.x, a.y) * 0.06 -
              f.neighbors * 0.0003 -
              mix * 0.001),
        0,
        1.6,
      );
    }
    if (this.turnover >= 1) {
      this.turnover -= 1;
      const babies: ColorCell[] = [];
      for (let i = this.cells.length - 1; i >= 0; i--) {
        const a = this.cells[i];
        if (a.energy <= 0 || a.age > 190) {
          this.cells.splice(i, 1);
          continue;
        }
        if (
          a.energy > 1 &&
          a.age > 12 &&
          this.cells.length + babies.length < 400 &&
          this.random.next() < 0.08
        ) {
          a.energy *= 0.57;
          const angle = this.random.range(0, Math.PI * 2);
          babies.push({
            ...a,
            id: ++this.id,
            x: clamp(a.x + Math.cos(angle) * 18, 45, 1155),
            y: clamp(a.y + Math.sin(angle) * 18, 45, 675),
            age: 0,
            affinity: clamp(a.affinity + this.random.range(-0.04, 0.04), 0.6, 1.4),
          });
          this.births++;
        }
      }
      this.cells.push(...babies);
      if (babies.length) this.cue('division', 0.35);
      if (this.exchanges > 0 && Math.floor(this.time) % 9 === 0) this.cue('exchange', 0.25);
    }
    this.sample(this.cells.length, this.assortment * 100);
  }
  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'CELLS',
        value: String(this.cells.length),
        note: 'four interacting populations',
        tone: 'mint',
      },
      {
        label: 'LIKE NEIGHBORS',
        value: `${Math.round(this.assortment * 100)}%`,
        note: 'local assortment',
        tone: 'blue',
      },
      {
        label: 'NEW LIFE',
        value: String(this.births),
        note: 'inherited color and affinity',
        tone: 'gold',
      },
      {
        label: 'EXCHANGES',
        value: String(this.exchanges),
        note: 'cross-population energy transfers',
        tone: 'coral',
      },
    ];
  }
}
