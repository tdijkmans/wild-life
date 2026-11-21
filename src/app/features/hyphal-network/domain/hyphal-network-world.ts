import { clamp, LivingWorld } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

interface Septum {
  x: number;
  y: number;
  heading: number;
  pressure: number;
  reserves: number;
  tip: boolean;
  readyAt: number;
  depth: number;
}

interface Hypha {
  start: number;
  end: number;
  flux: number;
  transport: number;
  growth: number;
  streamingFlux: number;
}

interface Food {
  x: number;
  y: number;
  reserve: number;
  radius: number;
}

const MAX_COMPARTMENTS = 250;
const TAU = Math.PI * 2;
const EXTENSION_SECONDS = 7.2;

export class HyphalNetworkWorld extends LivingWorld {
  readonly nodes: Septum[] = [];
  readonly hyphae: Hypha[] = [];
  readonly food: Food[] = [];
  fusions = 0;
  uptake = 0;
  private nextSolve = 0;
  private nextTransitCue = 0;
  private readonly neighbors: number[][] = [];
  private tipCount = 0;

  constructor(seed: number) {
    super(seed);
    this.food.push({ x: 582, y: 345, reserve: 1, radius: 96 });
    for (const [x, y] of [
      [225, 165],
      [960, 154],
      [986, 530],
      [270, 550],
      [561, 145],
      [658, 585],
    ]) {
      this.food.push({
        x: x + this.random.range(-65, 65),
        y: y + this.random.range(-34, 34),
        reserve: this.random.range(0.7, 1),
        radius: this.random.range(84, 132),
      });
    }
    const founder = this.addNode(582, 345, 0, false);
    for (let i = 0; i < 5; i++) {
      const angle = (i * TAU) / 5 + this.random.range(-0.16, 0.16);
      const tip = this.addNode(
        582 + Math.cos(angle) * 29,
        345 + Math.sin(angle) * 29,
        angle,
        true,
        1,
      );
      this.link(founder, tip, 1);
    }
  }

  private addNode(x: number, y: number, heading: number, tip: boolean, depth = 0): number {
    if (tip) this.tipCount++;
    this.neighbors.push([]);
    this.nodes.push({
      x,
      y,
      heading,
      tip,
      pressure: 0,
      reserves: 0.025,
      depth,
      readyAt: this.time + EXTENSION_SECONDS + this.random.range(0.4, 2.5),
    });
    return this.nodes.length - 1;
  }

  private link(start: number, end: number, growth = 0): void {
    const edge = this.hyphae.length;
    this.neighbors[start].push(edge);
    this.neighbors[end].push(edge);
    this.hyphae.push({ start, end, growth, flux: 0, streamingFlux: 0, transport: 0 });
  }

  influence(kind: string, x: number, y: number, dx: number, dy: number): void {
    if (!this.field(kind, x, y, ['food', 'mist'], dx, dy)) return;
    this.cue(kind === 'food' ? 'seed-set' : 'rain', 0.5, x);
    if (kind !== 'food') return;
    const nearby = this.food.find((patch) => Math.hypot(patch.x - x, patch.y - y) < 55);
    if (nearby) nearby.reserve = Math.min(1.32, nearby.reserve + 0.38);
    else if (this.food.length < 18) this.food.push({ x, y, reserve: 0.92, radius: 115 });
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    if (this.time >= this.nextSolve) {
      this.nextSolve = this.time + 0.24;
      this.solveFlows();
      this.growTips();
    }
    for (const edge of this.hyphae) {
      edge.growth = Math.min(1, edge.growth + dt / EXTENSION_SECONDS);
      edge.streamingFlux += (edge.flux - edge.streamingFlux) * (1 - Math.exp(-1.8 * dt));
      const next = edge.transport + Math.tanh(edge.streamingFlux * 4) * 0.76 * dt;
      if (
        (next >= 1 || next < 0) &&
        edge.growth === 1 &&
        Math.abs(edge.streamingFlux) > 0.085 &&
        this.time >= this.nextTransitCue
      ) {
        const destination = this.nodes[next >= 1 ? edge.end : edge.start];
        this.cue('septum', 0.41, destination.x);
        this.nextTransitCue = this.time + 1.8;
      }
      edge.transport = next - Math.floor(next);
    }
    this.sample(this.hyphae.length, this.tipCount);
  }

  private solveFlows(): void {
    const source = new Float64Array(this.nodes.length);
    const moisture = this.nodes.map((node) => clamp(this.fieldAt('mist', node.x, node.y)));
    for (const patch of this.food) {
      const weights = this.nodes.map((node) =>
        Math.max(0, 1 - Math.hypot(node.x - patch.x, node.y - patch.y) / patch.radius),
      );
      const total = weights.reduce((sum, value) => sum + value, 0);
      const incoming = patch.reserve * (1 - Math.exp(-total * 0.72)) * 1.5;
      patch.reserve = clamp(patch.reserve + 0.0007 - incoming * 0.0018, 0, 1.32);
      this.uptake += incoming * 0.24;
      if (total > 0)
        weights.forEach((weight, index) => (source[index] += (weight * incoming) / total));
    }
    const conductance = this.hyphae.map((edge) => {
      const a = this.nodes[edge.start];
      const b = this.nodes[edge.end];
      return (
        (2.9 * edge.growth * (1 + (moisture[edge.start] + moisture[edge.end]) * 0.8)) /
        Math.max(0.45, Math.hypot(a.x - b.x, a.y - b.y) / 32)
      );
    });
    // Solve a pressure balance across the connected graph. Uptake supplies the
    // network; growing apices draw fluid through their attached hyphae.
    for (let pass = 0; pass < 24; pass++) {
      for (let index = 0; index < this.nodes.length; index++) {
        const node = this.nodes[index];
        let numerator = source[index];
        let denominator = node.tip ? 0.95 : 0.014;
        for (const edge of this.neighbors[index]) {
          const { start, end } = this.hyphae[edge];
          numerator += conductance[edge] * this.nodes[index === start ? end : start].pressure;
          denominator += conductance[edge];
        }
        node.pressure = numerator / denominator;
      }
    }
    this.hyphae.forEach((edge, index) => {
      edge.flux =
        conductance[index] * (this.nodes[edge.start].pressure - this.nodes[edge.end].pressure);
    });
    for (const node of this.nodes) {
      if (node.tip) node.reserves = Math.min(0.4, node.reserves + node.pressure * 0.29);
    }
  }

  private growTips(): void {
    const count = this.nodes.length;
    for (let index = 0; index < count && this.nodes.length < MAX_COMPARTMENTS; index++) {
      const tip = this.nodes[index];
      if (!tip.tip || tip.readyAt > this.time || tip.reserves < 0.045) continue;
      if (!this.extend(index, 0)) {
        tip.heading += this.random.range(-0.72, 0.72);
        tip.readyAt = this.time + 0.8;
        continue;
      }
      tip.tip = false;
      this.tipCount--;
      // A supplied junction can send out a lateral branch beside its leading tip.
      if (
        this.nodes.length < MAX_COMPARTMENTS &&
        this.tipCount < 24 &&
        tip.reserves > 0.067 &&
        this.random.next() < 0.22
      ) {
        this.extend(index, this.random.next() < 0.5 ? -1.02 : 1.02);
      }
      if (this.nodes.length % 5 === 0) this.cue('fiber', 0.41, tip.x);
    }
  }

  private extend(index: number, branch: number): boolean {
    const source = this.nodes[index];
    let direction = source.heading + branch + this.random.range(-0.27, 0.27);
    let strongest = 0;
    for (const patch of this.food) {
      const dx = patch.x - source.x;
      const dy = patch.y - source.y;
      const distance = Math.hypot(dx, dy);
      const attraction = patch.reserve * clamp(1 - distance / 560);
      if (distance < 80 || attraction <= strongest) continue;
      const toward = Math.atan2(dy, dx) - source.heading;
      const turn = Math.atan2(Math.sin(toward), Math.cos(toward));
      if (Math.abs(turn) > 1.33) continue;
      strongest = attraction;
      direction = source.heading + branch + turn * 0.26 * attraction + this.random.range(-0.2, 0.2);
    }
    const x = source.x + Math.cos(direction) * 32;
    const y = source.y + Math.sin(direction) * 32;
    if (x < 55 || x > this.width - 55 || y < 64 || y > this.height - 60) return false;
    const candidate = this.nodes.findIndex(
      (node, other) => index !== other && Math.hypot(node.x - x, node.y - y) < 18,
    );
    if (candidate >= 0) {
      const alreadyConnected = this.neighbors[index].some((edge) => {
        const segment = this.hyphae[edge];
        return segment.start === candidate || segment.end === candidate;
      });
      if (
        alreadyConnected ||
        Math.hypot(this.nodes[candidate].x - source.x, this.nodes[candidate].y - source.y) < 20
      )
        return false;
      this.link(index, candidate);
      this.fusions++;
      this.cue('hyphal-fusion', 0.62, this.nodes[candidate].x);
    } else {
      const next = this.addNode(x, y, direction, true, source.depth + 1);
      this.nodes[next].reserves = Math.max(0, (source.reserves - 0.045) * 0.5);
      this.nodes[next].pressure = source.pressure;
      this.link(index, next);
    }
    return true;
  }

  metrics(): readonly WorldMetric[] {
    const flux = this.hyphae.reduce((sum, segment) => sum + Math.abs(segment.flux), 0);
    return [
      {
        label: 'CONNECTED COMPARTMENTS',
        value: String(this.nodes.length),
        note: 'Septal pores link neighboring hyphal compartments',
        tone: 'mint',
      },
      {
        label: 'CYTOPLASMIC FLOW',
        value: flux.toFixed(2),
        note: 'Total absolute flux through the network in model units',
        tone: 'gold',
      },
      {
        label: 'GROWING TIPS',
        value: String(this.tipCount),
        note: 'Tips extend when they receive enough supply',
        tone: 'blue',
      },
      {
        label: 'HYPHAL FUSIONS',
        value: String(this.fusions),
        note: 'Contacts that closed a new loop',
        tone: 'coral',
      },
    ];
  }
}
