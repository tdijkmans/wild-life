import { SeededRandom } from '../../../shared/simulation/seeded-random';
import { SpatialGrid } from '../../../shared/simulation/spatial-grid';
import type {
  InteractiveWorld,
  WorldAudioCue,
  WorldHistoryPoint,
  WorldMetric,
} from '../../../shared/world-experience/world-protocol';

export const SYNCHRONY_WIDTH = 1200;
export const SYNCHRONY_HEIGHT = 720;
const TAU = Math.PI * 2;
const MAX_FIREFLIES = 720;
const NEIGHBOR_RADIUS = 86;

export interface Firefly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  frequency: number;
  coupling: number;
  age: number;
  energy: number;
  tint: number;
  flash: number;
}

export interface SynchronyField {
  kind: 'warmth' | 'breeze' | 'shade';
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  remaining: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Local phase-coupled oscillators inspired by synchronous fireflies.
 * Each insect reads only its spatial neighbors. The model never schedules
 * a global flash or assigns leader-controlled formations.
 */
export class SynchronyWorld implements InteractiveWorld {
  readonly seed: number;
  readonly width = SYNCHRONY_WIDTH;
  readonly height = SYNCHRONY_HEIGHT;
  readonly fireflies: Firefly[] = [];
  readonly fields: SynchronyField[] = [];
  readonly history: WorldHistoryPoint[] = [];
  readonly audioCues: WorldAudioCue[] = [];

  private readonly random: SeededRandom;
  private readonly grid = new SpatialGrid(this.width, this.height, NEIGHBOR_RADIUS);
  private nextId = 0;
  private nextCueId = 0;
  private sampleTimer = 0;
  private lifecycleTimer = 0;
  private lastChorus = -30;
  time = 0;
  coherence = 0;
  localCoherence = 0;
  activeFlashes = 0;
  births = 0;

  constructor(seed = 20261122, population = 440) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    if (!Number.isInteger(population) || population < 0 || population > MAX_FIREFLIES) {
      throw new RangeError('Firefly population exceeds the safe limit');
    }
    for (let i = 0; i < population; i++) {
      const group = i % 4;
      const gx = 250 + (group % 2) * 670;
      const gy = 195 + Math.floor(group / 2) * 310;
      const theta = this.random.range(0, TAU);
      const radial = Math.sqrt(this.random.next());
      this.birth(gx + Math.cos(theta) * radial * 240, gy + Math.sin(theta) * radial * 185);
    }
    this.measure();
    this.sample();
  }

  private birth(x: number, y: number, parent?: Firefly): void {
    const angle = this.random.range(0, TAU);
    const speed = this.random.range(5, 16);
    this.fireflies.push({
      id: ++this.nextId,
      x: clamp(x, 18, this.width - 18),
      y: clamp(y, 18, this.height - 18),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      phase: parent
        ? (parent.phase + this.random.range(-0.45, 0.45) + TAU) % TAU
        : this.random.range(0, TAU),
      frequency: parent
        ? clamp(parent.frequency + this.random.range(-0.11, 0.11), 1.08, 2.7)
        : this.random.range(1.35, 2.16),
      coupling: parent
        ? clamp(parent.coupling + this.random.range(-0.08, 0.08), 0.68, 1.32)
        : this.random.range(0.84, 1.16),
      age: parent ? 0 : this.random.range(6, 80),
      energy: parent ? 0.85 : this.random.range(0.75, 1.15),
      tint: parent
        ? clamp(parent.tint + this.random.range(-7, 7), -25, 28)
        : this.random.range(-20, 26),
      flash: 0,
    });
  }

  private cue(kind: WorldAudioCue['kind'], strength: number): void {
    this.audioCues.push({ id: ++this.nextCueId, kind, strength: clamp(strength, 0.05, 1) });
    if (this.audioCues.length > 16) this.audioCues.shift();
  }

  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (
      ![x, y, dx, dy].every(Number.isFinite) ||
      x < 0 ||
      y < 0 ||
      x > this.width ||
      y > this.height ||
      !['warmth', 'breeze', 'shade'].includes(kind)
    )
      return;
    const length = Math.hypot(dx, dy);
    this.fields.push({
      kind: kind as SynchronyField['kind'],
      x,
      y,
      dx: kind === 'breeze' ? (length > 3 ? (dx / length) * 70 : 42) : 0,
      dy: kind === 'breeze' ? (length > 3 ? (dy / length) * 70 : -17) : 0,
      radius: kind === 'shade' ? 170 : 155,
      remaining: kind === 'breeze' ? 10 : 15,
    });
    if (this.fields.length > 24) this.fields.shift();
    this.cue(kind === 'warmth' ? 'pulse' : kind === 'shade' ? 'hush' : 'flow', 0.36);
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
    this.time += dt;
    this.sampleTimer += dt;
    this.lifecycleTimer += dt;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      this.fields[i].remaining -= dt;
      if (this.fields[i].remaining <= 0) this.fields.splice(i, 1);
    }

    this.grid.clear();
    const phases = this.fireflies.map((firefly) => firefly.phase);
    for (let i = 0; i < this.fireflies.length; i++) {
      const fly = this.fireflies[i];
      this.grid.insert(i, fly.x, fly.y);
    }

    const updates: { phase: number; vx: number; vy: number }[] = [];
    let localAgreement = 0;
    let flashing = 0;
    for (let i = 0; i < this.fireflies.length; i++) {
      const fly = this.fireflies[i];
      let sine = 0;
      let cosine = 0;
      let alignment = 0;
      let neighbors = 0;
      this.grid.forNearby(fly.x, fly.y, (index) => {
        if (index === i) return;
        const other = this.fireflies[index];
        const dx = other.x - fly.x;
        const dy = other.y - fly.y;
        if (dx * dx + dy * dy > NEIGHBOR_RADIUS * NEIGHBOR_RADIUS) return;
        const otherPhase = phases[index];
        const difference = otherPhase - phases[i];
        alignment += Math.sin(difference);
        sine += Math.sin(otherPhase);
        cosine += Math.cos(otherPhase);
        neighbors++;
      });
      if (neighbors) {
        localAgreement += Math.hypot(sine, cosine) / neighbors;
      }
      let frequencyModifier = 0;
      let couplingModifier = 1;
      let ax = Math.sin(this.time * 0.37 + fly.id * 0.31) * 6;
      let ay = Math.cos(this.time * 0.29 + fly.id * 0.47) * 6;
      for (const field of this.fields) {
        const dx = fly.x - field.x;
        const dy = fly.y - field.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= field.radius) continue;
        const falloff = (1 - distance / field.radius) * Math.min(1, field.remaining / 2);
        if (field.kind === 'warmth') frequencyModifier += falloff * 0.8;
        if (field.kind === 'shade') {
          frequencyModifier -= falloff * 0.3;
          couplingModifier *= 1 - falloff * 0.36;
        }
        if (field.kind === 'breeze') {
          ax += field.dx * falloff * 0.47;
          ay += field.dy * falloff * 0.47;
        }
      }
      const coupled = neighbors
        ? (alignment / neighbors) * fly.coupling * 3.6 * couplingModifier
        : 0;
      const phase =
        (phases[i] + Math.max(0.22, fly.frequency + frequencyModifier + coupled) * dt) % TAU;
      const vx = clamp(fly.vx * (1 - dt * 0.34) + ax * dt, -27, 27);
      const vy = clamp(fly.vy * (1 - dt * 0.34) + ay * dt, -27, 27);
      updates.push({ phase, vx, vy });
      fly.flash = phase < 0.64 ? (1 - phase / 0.64) ** 1.4 : 0;
      if (fly.flash > 0.36) flashing++;
      fly.age += dt;
      fly.energy = clamp(fly.energy + dt * (0.0015 - fly.flash * 0.0006), 0.2, 1.3);
    }
    for (let i = 0; i < this.fireflies.length; i++) {
      const fly = this.fireflies[i];
      const change = updates[i];
      fly.phase = change.phase;
      fly.vx = change.vx;
      fly.vy = change.vy;
      fly.x = clamp(fly.x + fly.vx * dt, 15, this.width - 15);
      fly.y = clamp(fly.y + fly.vy * dt, 15, this.height - 15);
      if ((fly.x === 15 && fly.vx < 0) || (fly.x === this.width - 15 && fly.vx > 0)) {
        fly.vx *= -0.6;
      }
      if ((fly.y === 15 && fly.vy < 0) || (fly.y === this.height - 15 && fly.vy > 0)) {
        fly.vy *= -0.6;
      }
    }
    const share = flashing / Math.max(1, this.fireflies.length);
    const previousShare = this.activeFlashes / Math.max(1, this.fireflies.length);
    this.activeFlashes = flashing;
    this.localCoherence = this.fireflies.length ? localAgreement / this.fireflies.length : 0;
    if (this.sampleTimer >= 1) {
      this.sampleTimer -= 1;
      this.measure();
      this.sample();
    }
    if (
      this.localCoherence > 0.68 &&
      previousShare <= 0.14 &&
      share > 0.14 &&
      this.time - this.lastChorus > 1.1
    ) {
      this.lastChorus = this.time;
      this.cue('chorus', Math.min(0.78, 0.42 + share));
    }
    if (this.lifecycleTimer >= 26) {
      this.lifecycleTimer -= 26;
      this.turnover();
    }
  }

  private measure(): void {
    if (!this.fireflies.length) {
      this.coherence = 0;
      return;
    }
    let sumX = 0;
    let sumY = 0;
    for (const fly of this.fireflies) {
      sumX += Math.cos(fly.phase);
      sumY += Math.sin(fly.phase);
    }
    this.coherence = clamp(Math.hypot(sumX, sumY) / this.fireflies.length, 0, 1);
  }

  private turnover(): void {
    const offspring: { x: number; y: number; parent: Firefly }[] = [];
    for (let i = this.fireflies.length - 1; i >= 0; i--) {
      const fly = this.fireflies[i];
      if (fly.age > 210 || (fly.age > 115 && this.random.next() < 0.012)) {
        this.fireflies.splice(i, 1);
        continue;
      }
      if (
        fly.age > 25 &&
        fly.energy > 0.95 &&
        this.fireflies.length + offspring.length < MAX_FIREFLIES &&
        this.random.next() < 0.028
      ) {
        fly.energy *= 0.7;
        offspring.push({ x: fly.x, y: fly.y, parent: fly });
      }
    }
    if (offspring.length) this.cue('growth', 0.52);
    for (const baby of offspring) {
      this.birth(
        baby.x + this.random.range(-20, 20),
        baby.y + this.random.range(-20, 20),
        baby.parent,
      );
      this.births++;
    }
  }

  private sample(): void {
    this.history.push({
      time: Math.round(this.time * 10) / 10,
      primary: Math.round(this.coherence * 100),
      secondary: Math.round(this.localCoherence * 100),
    });
    if (this.history.length > 160) this.history.shift();
  }

  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'FIREFLIES',
        value: String(this.fireflies.length),
        note: 'autonomous oscillators',
        tone: 'mint',
      },
      {
        label: 'GLOBAL ORDER',
        value: `${Math.round(this.coherence * 100)}%`,
        note: 'whole-world coherence',
        tone: 'gold',
      },
      {
        label: 'LOCAL SYNC',
        value: `${Math.round(this.localCoherence * 100)}%`,
        note: 'neighbor phase agreement',
        tone: 'blue',
      },
      {
        label: 'FLASHING',
        value: String(this.activeFlashes),
        note: 'currently illuminated',
        tone: 'coral',
      },
    ];
  }
}
