import { LivingWorld, clamp } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';
export interface VesselNode {
  x: number;
  y: number;
  pressure: number;
  fixed: boolean;
}
export interface Vessel {
  a: number;
  b: number;
  radius: number;
  flow: number;
  age: number;
}
export interface TissueDemand {
  x: number;
  y: number;
  oxygen: number;
  demand: number;
  vegf: number;
}
/** Demand-driven angiogenesis with pressure relaxation, perfusion and flow remodeling. */
export class VascularGardenWorld extends LivingWorld {
  readonly nodes: VesselNode[] = [];
  readonly vessels: Vessel[] = [];
  private readonly awaitingPerfusion = new WeakSet<Vessel>();
  readonly tissue: TissueDemand[] = [];
  sprouts = 0;
  connections = 0;
  regressed = 0;
  private growth = 0;
  constructor(seed = 20261129) {
    super(seed);
    for (let i = 0; i < 15; i++) {
      this.nodes.push({
        x: 90 + i * 72,
        y: 360 + Math.sin(i * 0.5) * 22,
        pressure: 1 - i / 14,
        fixed: i === 0 || i === 14,
      });
      if (i) this.vessels.push({ a: i - 1, b: i, radius: 3, flow: 0, age: 20 });
    }
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 11; x++)
        this.tissue.push({
          x: 120 + x * 96 + this.random.range(-20, 20),
          y: 100 + y * 103 + this.random.range(-18, 18),
          oxygen: 0.2,
          demand: this.random.range(0.65, 1),
          vegf: 0.5,
        });
    this.sample(this.vessels.length, this.oxygenation() * 100);
  }
  oxygenation(): number {
    return this.tissue.reduce((sum, t) => sum + t.oxygen, 0) / this.tissue.length;
  }
  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (this.field(kind, x, y, ['demand', 'oxygen', 'rest'], dx, dy))
      this.cue(kind === 'demand' ? 'pulse' : kind === 'oxygen' ? 'shimmer' : 'hush');
  }
  private distance(t: { x: number; y: number }, v: Vessel): number {
    const a = this.nodes[v.a],
      b = this.nodes[v.b],
      dx = b.x - a.x,
      dy = b.y - a.y,
      p = clamp(((t.x - a.x) * dx + (t.y - a.y) * dy) / (dx * dx + dy * dy || 1));
    return Math.hypot(t.x - a.x - p * dx, t.y - a.y - p * dy);
  }
  private perfuse(dt: number): void {
    const adjacency = this.nodes.map(() => [] as { other: number; g: number }[]);
    for (const v of this.vessels) {
      const a = this.nodes[v.a],
        b = this.nodes[v.b],
        g = v.radius ** 4 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      adjacency[v.a].push({ other: v.b, g });
      adjacency[v.b].push({ other: v.a, g });
    }
    for (let iteration = 0; iteration < 12; iteration++)
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        if (n.fixed) continue;
        const links = adjacency[i],
          sum = links.reduce((s, l) => s + l.g, 0);
        if (sum)
          n.pressure = links.reduce((s, l) => s + this.nodes[l.other].pressure * l.g, 0) / sum;
      }
    for (const v of this.vessels) {
      const a = this.nodes[v.a],
        b = this.nodes[v.b];
      v.flow =
        ((a.pressure - b.pressure) * v.radius ** 4) / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      if (Math.abs(v.flow) > 0.012 && this.awaitingPerfusion.delete(v))
        this.cue('flow', 0.43, a.x, { toX: b.x });
      v.age += dt;
      const target = clamp(1.1 + Math.sqrt(Math.abs(v.flow)) * 10, 1.1, 3.7);
      v.radius = clamp(v.radius + (target - v.radius) * dt * 0.035, 0.5, 3.7);
    }
    for (const t of this.tissue) {
      let supply = 0;
      for (const v of this.vessels) {
        const d = this.distance(t, v);
        if (d < 110) supply += Math.max(0, 1 - d / 110) * Math.min(1, Math.abs(v.flow) * 22);
      }
      const demand =
        (t.demand * (1 + this.fieldAt('demand', t.x, t.y) * 1.7)) /
        (1 + this.fieldAt('rest', t.x, t.y) * 1.5);
      t.oxygen = clamp(
        t.oxygen + dt * (supply * 0.18 + this.fieldAt('oxygen', t.x, t.y) * 0.12 - demand * 0.025),
      );
      t.vegf = clamp(t.vegf + dt * ((1 - t.oxygen) * demand * 0.08 - t.vegf * 0.06), 0, 2);
    }
  }
  step(dt: number): void {
    if (!this.advance(dt)) return;
    this.perfuse(dt);
    this.growth += dt;
    if (this.growth >= 0.65) {
      this.growth -= 0.65;
      const degrees = this.nodes.map(() => 0);
      for (const v of this.vessels) {
        degrees[v.a]++;
        degrees[v.b]++;
      }
      // A tip advances toward nearby unmet demand. Fusion creates perfused loops.
      const candidates = this.nodes
        .map((n, i) => ({ n, i }))
        .filter(({ i }) => degrees[i] > 0 && degrees[i] < 4);
      for (
        let attempt = 0;
        attempt < 4 && this.nodes.length < 230 && this.vessels.length < 300;
        attempt++
      ) {
        if (!candidates.length) break;
        const { n, i } = candidates[this.random.integer(0, candidates.length)];
        let target: TissueDemand | undefined,
          best = 0;
        for (const t of this.tissue) {
          const d = Math.hypot(t.x - n.x, t.y - n.y),
            score = t.vegf * Math.exp(-d / 140);
          if (d > 20 && score > best) {
            best = score;
            target = t;
          }
        }
        if (!target || best < 0.09) continue;
        const angle = Math.atan2(target.y - n.y, target.x - n.x) + this.random.range(-0.35, 0.35),
          x = clamp(n.x + Math.cos(angle) * 30, 55, 1145),
          y = clamp(n.y + Math.sin(angle) * 30, 55, 665);
        const near = this.nodes.findIndex(
          (other, j) =>
            j !== i &&
            degrees[j] > 0 &&
            Math.hypot(other.x - x, other.y - y) < 25 &&
            !this.vessels.some((v) => (v.a === i && v.b === j) || (v.b === i && v.a === j)),
        );
        if (near >= 0) {
          const link = { a: i, b: near, radius: 1.3, flow: 0, age: 0 };
          this.vessels.push(link);
          this.awaitingPerfusion.add(link);
          degrees[i]++;
          degrees[near]++;
          this.connections++;
          this.cue('circuit-join', 0.49, n.x, { toX: this.nodes[near].x });
        } else if (
          !this.nodes.some((other, j) => j !== i && Math.hypot(other.x - x, other.y - y) < 18)
        ) {
          this.nodes.push({ x, y, pressure: n.pressure, fixed: false });
          degrees.push(1);
          degrees[i]++;
          this.vessels.push({ a: i, b: this.nodes.length - 1, radius: 1.1, flow: 0, age: 0 });
          this.sprouts++;
          this.cue('fiber', 0.33, x);
        }
      }
      for (let i = this.vessels.length - 1; i >= 0; i--) {
        const v = this.vessels[i];
        if (
          v.age > 65 &&
          Math.abs(v.flow) < 0.00008 &&
          (degrees[v.a] === 1 || degrees[v.b] === 1) &&
          !this.nodes[v.a].fixed &&
          !this.nodes[v.b].fixed
        ) {
          this.vessels.splice(i, 1);
          this.regressed++;
          this.cue('circuit-release', 0.34, (this.nodes[v.a].x + this.nodes[v.b].x) / 2);
        }
      }
    }
    this.sample(this.vessels.length, this.oxygenation() * 100);
  }
  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'VESSELS',
        value: String(this.vessels.length),
        note: 'adaptive vascular segments',
        tone: 'coral',
      },
      {
        label: 'OXYGENATION',
        value: `${Math.round(this.oxygenation() * 100)}%`,
        note: 'mean tissue oxygen',
        tone: 'blue',
      },
      {
        label: 'CONNECTIONS',
        value: String(this.connections),
        note: 'new vascular loops',
        tone: 'mint',
      },
      {
        label: 'REGRESSION',
        value: String(this.regressed),
        note: 'unused terminal branches',
        tone: 'gold',
      },
    ];
  }
}
