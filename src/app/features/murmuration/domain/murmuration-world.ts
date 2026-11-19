import { SeededRandom } from '../../../shared/simulation/seeded-random';
import { SpatialGrid } from '../../../shared/simulation/spatial-grid';
import type {
  InteractiveWorld,
  WorldAudioCue,
  WorldHistoryPoint,
  WorldMetric,
} from '../../../shared/world-experience/world-protocol';

export const MURMURATION_WIDTH = 1200;
export const MURMURATION_HEIGHT = 720;
const MAX_BIRDS = 420;
const NEIGHBOR_RADIUS = 77;
const EDGE = 46;

export interface Starling {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  energy: number;
  phase: number;
  alignment: number;
  cohesion: number;
  separation: number;
  shade: number;
}

export interface SkyField {
  kind: 'wind' | 'thermal' | 'calm';
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  strength: number;
  remaining: number;
}

export interface Raptor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  cooldown: number;
}

export class MurmurationWorld implements InteractiveWorld {
  readonly audioCues: WorldAudioCue[] = [];
  private nextCueId = 0;
  private cue(kind: WorldAudioCue['kind'], strength = 0.3): void {
    this.audioCues.push({ id: ++this.nextCueId, kind, strength });
    if (this.audioCues.length > 16) this.audioCues.shift();
  }
  readonly width = MURMURATION_WIDTH;
  readonly height = MURMURATION_HEIGHT;
  readonly seed: number;
  readonly birds: Starling[] = [];
  readonly fields: SkyField[] = [];
  readonly history: WorldHistoryPoint[] = [];
  readonly raptor: Raptor;
  private readonly random: SeededRandom;
  private readonly grid = new SpatialGrid(this.width, this.height, NEIGHBOR_RADIUS);
  private nextBirdId = 1;
  private sampleTime = 0;
  time = 0;
  births = 0;
  caught = 0;
  meanNeighbors = 0;
  formation = 0;

  constructor(seed = 20261118, count = 260) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    if (!Number.isInteger(count) || count < 0 || count > MAX_BIRDS) {
      throw new RangeError('Bird count outside the supported range');
    }
    for (let i = 0; i < count; i++) {
      const cluster = i % 3;
      const cx = this.width * (0.29 + cluster * 0.19);
      const cy = this.height * (0.39 + (cluster % 2) * 0.16);
      const angle = this.random.range(0, 2 * Math.PI);
      const radius = Math.sqrt(this.random.next()) * 105;
      this.spawn(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    this.raptor = {
      x: 110,
      y: 118,
      vx: 76,
      vy: 20,
      cooldown: 5,
    };
    this.sample();
  }

  private spawn(x: number, y: number, parent?: Starling): void {
    const phase = this.random.range(0, Math.PI * 2);
    const angle = this.random.range(-Math.PI, Math.PI);
    const speed = this.random.range(70, 105);
    const mutate = (value: number, scale: number) =>
      Math.max(0.65, Math.min(1.38, value + this.random.range(-scale, scale)));
    this.birds.push({
      id: this.nextBirdId++,
      x: Math.max(EDGE, Math.min(this.width - EDGE, x)),
      y: Math.max(EDGE, Math.min(this.height - EDGE, y)),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: parent ? 0 : this.random.range(8, 48),
      energy: parent ? 0.8 : this.random.range(0.7, 1.3),
      phase,
      alignment: mutate(parent?.alignment ?? 1, 0.08),
      cohesion: mutate(parent?.cohesion ?? 1, 0.08),
      separation: mutate(parent?.separation ?? 1, 0.08),
      shade: parent ? mutate(parent.shade, 0.08) : this.random.range(0.72, 1.15),
    });
  }

  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(dx) ||
      !Number.isFinite(dy)
    ) {
      return;
    }
    if (!['wind', 'thermal', 'calm'].includes(kind)) return;
    if (x < 0 || y < 0 || x > this.width || y > this.height) return;
    const length = Math.hypot(dx, dy);
    this.fields.push({
      kind: kind as SkyField['kind'],
      x,
      y,
      dx: kind === 'wind' ? (length > 3 ? (dx / length) * 150 : 70) : 0,
      dy: kind === 'wind' ? (length > 3 ? (dy / length) * 150 : -30) : 0,
      radius: kind === 'wind' ? 160 : 145,
      strength: kind === 'calm' ? 0.8 : 1,
      remaining: kind === 'wind' ? 9 : 12,
    });
    if (this.fields.length > 24) this.fields.shift();
    this.cue(kind === 'calm' ? 'hush' : 'flow');
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
    this.time += dt;
    this.sampleTime += dt;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      this.fields[i].remaining -= dt;
      if (this.fields[i].remaining <= 0) this.fields.splice(i, 1);
    }

    this.grid.clear();
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      this.grid.insert(i, bird.x, bird.y);
    }

    const updated: { vx: number; vy: number }[] = [];
    let totalNeighbors = 0;
    let localGroups = 0;
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      let neighbors = 0;
      let alignX = 0;
      let alignY = 0;
      let centerX = 0;
      let centerY = 0;
      let separateX = 0;
      let separateY = 0;
      this.grid.forNearby(bird.x, bird.y, (index) => {
        if (index === i) return;
        const other = this.birds[index];
        const px = other.x - bird.x;
        const py = other.y - bird.y;
        const dist2 = px * px + py * py;
        if (dist2 > NEIGHBOR_RADIUS * NEIGHBOR_RADIUS || dist2 < 0.0001) return;
        neighbors++;
        alignX += other.vx;
        alignY += other.vy;
        centerX += other.x;
        centerY += other.y;
        if (dist2 < 28 * 28) {
          separateX -= px / (dist2 + 26);
          separateY -= py / (dist2 + 26);
        }
      });
      totalNeighbors += neighbors;
      if (neighbors >= 5) localGroups++;
      let ax = Math.sin(this.time * 0.45 + bird.phase) * 5;
      let ay = Math.cos(this.time * 0.37 + bird.phase) * 5;
      if (neighbors) {
        const inv = 1 / neighbors;
        ax += (alignX * inv - bird.vx) * 0.95 * bird.alignment;
        ay += (alignY * inv - bird.vy) * 0.95 * bird.alignment;
        ax += (centerX * inv - bird.x) * 0.36 * bird.cohesion;
        ay += (centerY * inv - bird.y) * 0.36 * bird.cohesion;
        ax += separateX * 2200 * bird.separation;
        ay += separateY * 2200 * bird.separation;
      } else {
        ax += (this.width * 0.5 - bird.x) * 0.025;
        ay += (this.height * 0.5 - bird.y) * 0.025;
      }

      // The raptor creates a moving disturbance; flock members evade individually.
      const rx = bird.x - this.raptor.x;
      const ry = bird.y - this.raptor.y;
      const r2 = rx * rx + ry * ry;
      if (r2 < 185 * 185 && r2 > 1) {
        const factor = ((1 - Math.sqrt(r2) / 185) * 280) / Math.sqrt(r2);
        ax += rx * factor;
        ay += ry * factor;
      }

      for (const field of this.fields) {
        const dx = bird.x - field.x;
        const dy = bird.y - field.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= field.radius * field.radius) continue;
        const falloff = 1 - Math.sqrt(d2) / field.radius;
        const fade = Math.min(1, field.remaining / 2);
        if (field.kind === 'wind') {
          ax += field.dx * falloff * fade * 0.85;
          ay += field.dy * falloff * fade * 0.85;
        } else if (field.kind === 'thermal') {
          ax += -dy * falloff * fade * 0.45;
          ay += (dx * 0.45 - 130) * falloff * fade;
        } else {
          ax -= bird.vx * falloff * fade * 0.68;
          ay -= bird.vy * falloff * fade * 0.68;
        }
      }
      if (bird.x < 100) ax += (100 - bird.x) * 4;
      if (bird.x > this.width - 100) ax -= (bird.x - this.width + 100) * 4;
      if (bird.y < 90) ay += (90 - bird.y) * 4;
      if (bird.y > this.height - 90) ay -= (bird.y - this.height + 90) * 4;
      const turnLength = Math.hypot(ax, ay);
      if (turnLength > 260) {
        ax = (ax / turnLength) * 260;
        ay = (ay / turnLength) * 260;
      }
      let vx = bird.vx + ax * dt;
      let vy = bird.vy + ay * dt;
      const speed = Math.hypot(vx, vy) || 1;
      const target = Math.max(38, Math.min(142, speed));
      vx = (vx / speed) * target;
      vy = (vy / speed) * target;
      updated.push({ vx, vy });
      bird.age += dt;
      bird.energy = Math.min(1.5, bird.energy + dt * (0.004 + neighbors * 0.00035));
    }

    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      bird.vx = updated[i].vx;
      bird.vy = updated[i].vy;
      bird.x = Math.max(8, Math.min(this.width - 8, bird.x + bird.vx * dt));
      bird.y = Math.max(8, Math.min(this.height - 8, bird.y + bird.vy * dt));
    }
    this.meanNeighbors = this.birds.length ? totalNeighbors / this.birds.length : 0;
    this.formation = this.birds.length ? (localGroups / this.birds.length) * 100 : 0;
    this.advanceRaptor(dt);
    if (this.sampleTime >= 1) {
      this.sampleTime -= 1;
      this.populationTurnover();
      this.sample();
    }
  }

  private advanceRaptor(dt: number): void {
    const predator = this.raptor;
    predator.cooldown -= dt;
    let nearest: Starling | undefined;
    let nearestDistance = Infinity;
    for (const bird of this.birds) {
      const d2 = (bird.x - predator.x) ** 2 + (bird.y - predator.y) ** 2;
      if (d2 < nearestDistance) {
        nearestDistance = d2;
        nearest = bird;
      }
    }
    if (nearest) {
      const pursuit = predator.cooldown < 0 ? 1.15 : 0.52;
      const ax = (nearest.x - predator.x) * pursuit - predator.vx * 0.9;
      const ay = (nearest.y - predator.y) * pursuit - predator.vy * 0.9;
      predator.vx += ax * dt;
      predator.vy += ay * dt;
    }
    const speed = Math.hypot(predator.vx, predator.vy) || 1;
    const capped = Math.min(125, Math.max(54, speed));
    predator.vx = (predator.vx / speed) * capped;
    predator.vy = (predator.vy / speed) * capped;
    predator.x = Math.max(20, Math.min(this.width - 20, predator.x + predator.vx * dt));
    predator.y = Math.max(20, Math.min(this.height - 20, predator.y + predator.vy * dt));
    if (predator.cooldown <= 0 && nearest && nearestDistance < 14 * 14) {
      this.birds.splice(this.birds.indexOf(nearest), 1);
      this.caught++;
      this.cue('rustle', 0.35);
      predator.cooldown = 7;
    }
  }

  private populationTurnover(): void {
    const newborn: { x: number; y: number; parent: Starling }[] = [];
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];
      if (bird.age > 190 || (bird.age > 80 && this.random.next() < 0.0015)) {
        this.birds.splice(i, 1);
        continue;
      }
      if (
        bird.age > 12 &&
        bird.energy > 1.2 &&
        this.birds.length + newborn.length < MAX_BIRDS &&
        this.random.next() < 0.003
      ) {
        bird.energy *= 0.55;
        newborn.push({ x: bird.x, y: bird.y, parent: bird });
      }
    }
    for (const baby of newborn) {
      this.spawn(
        baby.x + this.random.range(-16, 16),
        baby.y + this.random.range(-16, 16),
        baby.parent,
      );
      this.births++;
      this.cue('growth');
    }
  }

  private sample(): void {
    this.history.push({
      time: Math.round(this.time * 10) / 10,
      primary: this.birds.length,
      secondary: Math.round(this.formation),
    });
    if (this.history.length > 160) this.history.shift();
  }

  metrics(): readonly WorldMetric[] {
    return [
      { label: 'STARLINGS', value: String(this.birds.length), note: 'living agents', tone: 'mint' },
      {
        label: 'COHESION',
        value: `${Math.round(this.formation)}%`,
        note: 'dense neighbors',
        tone: 'blue',
      },
      {
        label: 'NEIGHBORS',
        value: this.meanNeighbors.toFixed(1),
        note: 'average nearby',
        tone: 'gold',
      },
      { label: 'NEW LIFE', value: String(this.births), note: 'born in flight', tone: 'coral' },
    ];
  }
}
