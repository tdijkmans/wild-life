import { SeededRandom } from '../../../shared/simulation/seeded-random';
import { SpatialGrid } from '../../../shared/simulation/spatial-grid';
import type {
  InteractiveWorld,
  WorldAudioCue,
  WorldHistoryPoint,
  WorldMetric,
} from '../../../shared/world-experience/world-protocol';

export const ABYSS_WIDTH = 1200;
export const ABYSS_HEIGHT = 720;
const COLUMNS = 30;
const ROWS = 18;
const PHYTO_LIMIT = 1250;
const GRAZER_LIMIT = 80;

export interface Phytoplankton {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  luminosity: number;
  phase: number;
  hue: number;
}

export interface Zooplankton {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  phase: number;
  feedingGlow: number;
}

export interface OceanField {
  kind: 'current' | 'upwelling' | 'light';
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  remaining: number;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/**
 * An intentionally simplified pelagic food web. Ocean nutrient diffusion,
 * local light, currents, phytoplankton growth and grazing create bloom cycles.
 */
export class AbyssalBloomWorld implements InteractiveWorld {
  readonly width = ABYSS_WIDTH;
  readonly height = ABYSS_HEIGHT;
  readonly seed: number;
  readonly phytoplankton: Phytoplankton[] = [];
  readonly grazers: Zooplankton[] = [];
  readonly fields: OceanField[] = [];
  readonly nutrients = new Float32Array(COLUMNS * ROWS);
  readonly history: WorldHistoryPoint[] = [];
  readonly audioCues: WorldAudioCue[] = [];

  private readonly random: SeededRandom;
  private readonly grid = new SpatialGrid(this.width, this.height, 59);
  private nextId = 0;
  private cueId = 0;
  private nutrientTimer = 0;
  private sampleTimer = 0;
  private birthsSinceSample = 0;
  private feedsSinceSample = 0;
  time = 0;
  blooms = 0;
  grazingEvents = 0;
  luminousFraction = 0;

  constructor(seed = 20261121, producers = 360, consumers = 34) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    if (
      !Number.isInteger(producers) ||
      producers < 0 ||
      producers > PHYTO_LIMIT ||
      !Number.isInteger(consumers) ||
      consumers < 0 ||
      consumers > GRAZER_LIMIT
    ) {
      throw new RangeError('Ocean population is outside safe limits');
    }
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLUMNS; x++) {
        const deep = y / ROWS;
        this.nutrients[y * COLUMNS + x] = this.random.range(0.37, 0.8) + deep * 0.13;
      }
    }
    for (let i = 0; i < producers; i++) {
      const angle = this.random.range(0, Math.PI * 2);
      const radius = Math.sqrt(this.random.next());
      this.phytoplankton.push(
        this.makeProducer(
          570 + Math.cos(angle) * radius * 400,
          330 + Math.sin(angle) * radius * 220,
        ),
      );
    }
    for (let i = 0; i < consumers; i++) {
      this.grazers.push(this.makeGrazer(this.random.range(210, 960), this.random.range(130, 600)));
    }
    this.sample();
  }

  private makeProducer(x: number, y: number, parent?: Phytoplankton): Phytoplankton {
    return {
      id: this.nextId++,
      x: clamp(x, 4, this.width - 4),
      y: clamp(y, 4, this.height - 4),
      vx: this.random.range(-8, 8),
      vy: this.random.range(-8, 8),
      energy: parent ? 0.57 : this.random.range(0.58, 1.18),
      age: parent ? 0 : this.random.range(2, 40),
      luminosity: parent
        ? clamp(parent.luminosity + this.random.range(-0.09, 0.09), 0.3, 1)
        : this.random.range(0.4, 1),
      phase: this.random.range(0, Math.PI * 2),
      hue: parent ? parent.hue + this.random.range(-5, 5) : this.random.range(-16, 25),
    };
  }

  private makeGrazer(x: number, y: number): Zooplankton {
    return {
      id: this.nextId++,
      x: clamp(x, 5, this.width - 5),
      y: clamp(y, 5, this.height - 5),
      vx: this.random.range(-9, 9),
      vy: this.random.range(-9, 9),
      energy: this.random.range(0.6, 1.12),
      age: this.random.range(0, 55),
      phase: this.random.range(0, Math.PI * 2),
      feedingGlow: 0,
    };
  }

  private cue(kind: WorldAudioCue['kind'], strength: number): void {
    this.audioCues.push({ id: ++this.cueId, kind, strength });
    if (this.audioCues.length > 16) this.audioCues.shift();
  }

  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (
      ![x, y, dx, dy].every(Number.isFinite) ||
      x < 0 ||
      x > this.width ||
      y < 0 ||
      y > this.height ||
      !['current', 'upwelling', 'light'].includes(kind)
    )
      return;
    const length = Math.hypot(dx, dy);
    this.fields.push({
      kind: kind as OceanField['kind'],
      x,
      y,
      dx: kind === 'current' ? (length > 2 ? (dx / length) * 115 : 66) : 0,
      dy: kind === 'current' ? (length > 2 ? (dy / length) * 115 : -45) : 0,
      radius: kind === 'upwelling' ? 190 : 175,
      remaining: kind === 'light' ? 18 : 14,
    });
    if (this.fields.length > 22) this.fields.shift();
    if (kind === 'upwelling') {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
          const cx = ((col + 0.5) / COLUMNS) * this.width;
          const cy = ((row + 0.5) / ROWS) * this.height;
          const d = Math.hypot(cx - x, cy - y);
          if (d < 175) {
            const index = row * COLUMNS + col;
            this.nutrients[index] = Math.min(1.5, this.nutrients[index] + (1 - d / 175) * 0.35);
          }
        }
      }
    }
    this.cue(kind === 'upwelling' ? 'bubble' : kind === 'light' ? 'shimmer' : 'flow', 0.58);
  }

  private cellIndex(x: number, y: number): number {
    const col = Math.min(COLUMNS - 1, Math.max(0, Math.floor((x / this.width) * COLUMNS)));
    const row = Math.min(ROWS - 1, Math.max(0, Math.floor((y / this.height) * ROWS)));
    return row * COLUMNS + col;
  }

  nutrientAt(x: number, y: number): number {
    return this.nutrients[this.cellIndex(x, y)];
  }

  flowAt(x: number, y: number): { x: number; y: number } {
    const phase = this.time * 0.075;
    let vx = Math.sin(y * 0.008 + phase) * 15 + Math.cos(x * 0.006 - phase) * 7;
    let vy = Math.cos(x * 0.007 + phase) * 10 - Math.sin(y * 0.006 - phase) * 7;
    for (const field of this.fields) {
      const dx = x - field.x;
      const dy = y - field.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= field.radius) continue;
      const strength = (1 - distance / field.radius) * Math.min(1, field.remaining / 2);
      if (field.kind === 'current') {
        vx += field.dx * strength;
        vy += field.dy * strength;
      } else if (field.kind === 'upwelling') {
        vx += -dy * strength * 0.11;
        vy -= 60 * strength;
      }
    }
    return { x: clamp(vx, -155, 155), y: clamp(vy, -155, 155) };
  }

  lightAt(x: number, y: number): number {
    const surface = Math.exp(-y / 470) * (0.74 + Math.sin(this.time * 0.04) * 0.16);
    let artificial = 0;
    for (const field of this.fields) {
      if (field.kind !== 'light') continue;
      const distance = Math.hypot(x - field.x, y - field.y);
      if (distance < field.radius) {
        artificial += (1 - distance / field.radius) * Math.min(1, field.remaining / 3) * 0.8;
      }
    }
    return clamp(surface + artificial, 0.08, 1.5);
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
    this.time += dt;
    this.nutrientTimer += dt;
    this.sampleTimer += dt;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      this.fields[i].remaining -= dt;
      if (this.fields[i].remaining <= 0) this.fields.splice(i, 1);
    }
    if (this.nutrientTimer >= 0.16) {
      this.nutrientTimer -= 0.16;
      this.diffuseNutrients();
    }

    const newProducers: Phytoplankton[] = [];
    let glowing = 0;
    for (let i = this.phytoplankton.length - 1; i >= 0; i--) {
      const cell = this.phytoplankton[i];
      const flow = this.flowAt(cell.x, cell.y);
      cell.vx += (flow.x - cell.vx) * Math.min(1, dt * 2.1);
      cell.vy += (flow.y - cell.vy) * Math.min(1, dt * 2.1);
      cell.x = clamp(cell.x + cell.vx * dt, 3, this.width - 3);
      cell.y = clamp(cell.y + cell.vy * dt, 3, this.height - 3);
      const index = this.cellIndex(cell.x, cell.y);
      const nutrient = this.nutrients[index];
      const light = this.lightAt(cell.x, cell.y);
      const production = light * nutrient * 0.028;
      cell.energy += dt * (production - 0.007);
      this.nutrients[index] = Math.max(0, nutrient - dt * production * 0.004);
      cell.age += dt;
      cell.luminosity = clamp(cell.luminosity + dt * (light * 0.001 - 0.0005), 0.24, 1);
      if (cell.luminosity > 0.65 && cell.energy > 0.8) glowing++;
      if (
        cell.energy > 1.05 &&
        cell.age > 8 &&
        this.random.next() < dt * 0.045 &&
        this.phytoplankton.length + newProducers.length < PHYTO_LIMIT
      ) {
        cell.energy *= 0.54;
        newProducers.push(
          this.makeProducer(
            cell.x + this.random.range(-8, 8),
            cell.y + this.random.range(-8, 8),
            cell,
          ),
        );
        this.birthsSinceSample++;
        this.blooms++;
      }
      if (cell.age > 240 || cell.energy <= 0.03) {
        this.nutrients[index] = Math.min(1.5, this.nutrients[index] + 0.02);
        this.phytoplankton.splice(i, 1);
      }
    }
    this.phytoplankton.push(...newProducers);
    this.luminousFraction = this.phytoplankton.length
      ? Math.round((glowing / this.phytoplankton.length) * 100)
      : 0;

    this.grid.clear();
    for (let i = 0; i < this.phytoplankton.length; i++) {
      const cell = this.phytoplankton[i];
      this.grid.insert(i, cell.x, cell.y);
    }
    const newbornGrazers: Zooplankton[] = [];
    for (const grazer of this.grazers) {
      const flow = this.flowAt(grazer.x, grazer.y);
      let targetIndex = -1;
      let best = 58 * 58;
      this.grid.forNearby(grazer.x, grazer.y, (index) => {
        const cell = this.phytoplankton[index];
        const distance = (cell.x - grazer.x) ** 2 + (cell.y - grazer.y) ** 2;
        if (distance < best) {
          best = distance;
          targetIndex = index;
        }
      });
      let ax = flow.x * 0.2 + Math.sin(this.time * 1.3 + grazer.phase) * 8;
      let ay = flow.y * 0.2 + Math.cos(this.time * 1.1 + grazer.phase) * 8;
      if (targetIndex >= 0) {
        const prey = this.phytoplankton[targetIndex];
        ax += (prey.x - grazer.x) * 0.48;
        ay += (prey.y - grazer.y) * 0.48;
        if (best < 11 * 11) {
          // Grazers draw energy from feeding; producers lose biomass.
          const amount = dt * 0.37;
          prey.energy -= amount;
          grazer.energy += amount * 0.6;
          grazer.feedingGlow = Math.min(1, grazer.feedingGlow + dt * 2.8);
          this.feedsSinceSample++;
          this.grazingEvents++;
        }
      }
      grazer.vx = clamp(grazer.vx * (1 - dt * 0.6) + ax * dt, -46, 46);
      grazer.vy = clamp(grazer.vy * (1 - dt * 0.6) + ay * dt, -46, 46);
      grazer.x = clamp(grazer.x + grazer.vx * dt, 6, this.width - 6);
      grazer.y = clamp(grazer.y + grazer.vy * dt, 6, this.height - 6);
      grazer.age += dt;
      grazer.energy = Math.max(0, grazer.energy - dt * 0.004);
      grazer.feedingGlow = Math.max(0, grazer.feedingGlow - dt * 0.5);
      if (
        grazer.energy > 1.5 &&
        grazer.age > 25 &&
        this.grazers.length + newbornGrazers.length < GRAZER_LIMIT &&
        this.random.next() < dt * 0.012
      ) {
        grazer.energy *= 0.58;
        newbornGrazers.push(this.makeGrazer(grazer.x, grazer.y));
      }
    }
    this.grazers.push(...newbornGrazers);
    if (newbornGrazers.length) this.cue('bubble', 0.52);
    for (let i = this.grazers.length - 1; i >= 0; i--) {
      if (this.grazers[i].age > 280 || this.grazers[i].energy <= 0) this.grazers.splice(i, 1);
    }
    if (this.sampleTimer >= 1) {
      this.sampleTimer -= 1;
      if (this.birthsSinceSample > 4)
        this.cue('swell', clamp(this.birthsSinceSample / 25, 0.27, 0.9));
      else if (this.feedsSinceSample > 8 && this.random.next() < 0.28) this.cue('graze', 0.31);
      this.birthsSinceSample = 0;
      if (this.feedsSinceSample > 0)
        this.cue('graze', clamp(this.feedsSinceSample / 24, 0.27, 0.49));
      this.feedsSinceSample = 0;
      this.sample();
    }
  }

  private diffuseNutrients(): void {
    const before = this.nutrients.slice();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const index = row * COLUMNS + col;
        const left = before[row * COLUMNS + Math.max(0, col - 1)];
        const right = before[row * COLUMNS + Math.min(COLUMNS - 1, col + 1)];
        const up = before[Math.max(0, row - 1) * COLUMNS + col];
        const down = before[Math.min(ROWS - 1, row + 1) * COLUMNS + col];
        const average = (left + right + up + down) * 0.25;
        const deepRegeneration = row > ROWS * 0.64 ? 0.0009 : 0.00015;
        this.nutrients[index] = clamp(
          before[index] + (average - before[index]) * 0.075 + deepRegeneration,
          0,
          1.5,
        );
      }
    }
  }

  private sample(): void {
    this.history.push({
      time: Math.round(this.time),
      primary: this.phytoplankton.length,
      secondary: this.grazers.length,
    });
    if (this.history.length > 160) this.history.shift();
  }

  metrics(): readonly WorldMetric[] {
    const avgNutrients =
      this.nutrients.reduce((sum, value) => sum + value, 0) / this.nutrients.length;
    return [
      {
        label: 'PHYTOPLANKTON',
        value: String(this.phytoplankton.length),
        note: 'luminous producers',
        tone: 'mint',
      },
      {
        label: 'GRAZERS',
        value: String(this.grazers.length),
        note: 'feeding zooplankton',
        tone: 'coral',
      },
      {
        label: 'NUTRIENTS',
        value: `${Math.round((avgNutrients / 1.5) * 100)}%`,
        note: 'water column reserve',
        tone: 'blue',
      },
      {
        label: 'LUMINESCENCE',
        value: `${this.luminousFraction}%`,
        note: 'active glow',
        tone: 'gold',
      },
    ];
  }
}
