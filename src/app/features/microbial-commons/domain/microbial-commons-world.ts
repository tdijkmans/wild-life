import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldAudioCue,
  WorldHistoryPoint,
  WorldMetric,
} from '../../../shared/world-experience/world-protocol';

export const MICROBIAL_WIDTH = 1200;
export const MICROBIAL_HEIGHT = 720;
export const MICRO_COLS = 76;
export const MICRO_ROWS = 46;
export const MICRO_SITES = MICRO_COLS * MICRO_ROWS;
const UPDATE_SECONDS = 0.16;
const MAX_FIELDS = 22;

const clamp = (v: number, low: number, high: number): number => Math.max(low, Math.min(high, v));

export type MicrobeSpecies = 0 | 1 | 2 | 3;

export interface CommonsField {
  kind: 'nutrients' | 'oxygen' | 'buffer';
  x: number;
  y: number;
  radius: number;
  remaining: number;
}

/**
 * Spatial microbial ecology inspired by agar-plate colonies.
 * Strains grow only where local resources support them and may colonize
 * nearby empty sites. Producers release metabolites, cross-feeders use them,
 * and competitors secrete a localized inhibitor. No colony is preanimated.
 */
export class MicrobialCommonsWorld implements InteractiveWorld {
  readonly width = MICROBIAL_WIDTH;
  readonly height = MICROBIAL_HEIGHT;
  readonly seed: number;
  readonly species = new Uint8Array(MICRO_SITES);
  readonly biomass = new Float32Array(MICRO_SITES);
  readonly nutrients = new Float32Array(MICRO_SITES);
  readonly oxygen = new Float32Array(MICRO_SITES);
  readonly metabolite = new Float32Array(MICRO_SITES);
  readonly inhibitor = new Float32Array(MICRO_SITES);
  readonly tolerance = new Float32Array(MICRO_SITES);
  readonly fields: CommonsField[] = [];
  readonly history: WorldHistoryPoint[] = [];
  readonly audioCues: WorldAudioCue[] = [];

  private readonly random: SeededRandom;
  private nextCueId = 0;
  private updateAccumulator = 0;
  private sampleAccumulator = 0;
  private divisionSinceSample = 0;
  private exchangesSinceSample = 0;
  private stressedSinceSample = 0;
  time = 0;
  occupied = 0;
  producerCount = 0;
  crossfeederCount = 0;
  competitorCount = 0;
  divisions = 0;
  exchanges = 0;
  meanResources = 0;

  constructor(seed = 20261124, clusters = 19) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    if (!Number.isInteger(clusters) || clusters < 0 || clusters > 60) {
      throw new RangeError('Microbial clusters outside supported bounds');
    }
    for (let y = 0; y < MICRO_ROWS; y++) {
      for (let x = 0; x < MICRO_COLS; x++) {
        const index = y * MICRO_COLS + x;
        if (!this.insideDish(x, y)) continue;
        const edge = Math.hypot(
          (x - MICRO_COLS * 0.5) / (MICRO_COLS * 0.45),
          (y - MICRO_ROWS * 0.5) / (MICRO_ROWS * 0.43),
        );
        this.nutrients[index] = this.random.range(0.52, 0.94) - edge * 0.12;
        this.oxygen[index] = clamp(this.random.range(0.52, 0.95) + edge * 0.1, 0, 1.5);
        this.tolerance[index] = this.random.range(0.75, 1.1);
      }
    }

    // Seed neighboring but distinct strains in shared resource niches.
    // Cross-feeding then has an endogenous substrate: producer secretions
    // can diffuse across the gap to a nearby consumer without user input.
    let nicheX = MICRO_COLS * 0.5;
    let nicheY = MICRO_ROWS * 0.5;
    for (let c = 0; c < clusters; c++) {
      const role = c % 3;
      if (role === 0) {
        const theta = this.random.range(0, Math.PI * 2);
        const radius = Math.sqrt(this.random.next()) * 0.65;
        nicheX = MICRO_COLS * 0.5 + Math.cos(theta) * radius * MICRO_COLS * 0.43;
        nicheY = MICRO_ROWS * 0.5 + Math.sin(theta) * radius * MICRO_ROWS * 0.4;
      }
      const offset = role === 0 ? 0 : role === 1 ? 3.2 : 5.2;
      const angle = (role === 1 ? 0.8 : 3.3) + this.random.range(-0.45, 0.45);
      const x = Math.round(nicheX + Math.cos(angle) * offset);
      const y = Math.round(nicheY + Math.sin(angle) * offset);
      const species = (role + 1) as MicrobeSpecies;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (!this.insideDish(px, py)) continue;
          if (dx * dx + dy * dy > this.random.range(2.1, 7.1)) continue;
          const index = py * MICRO_COLS + px;
          if (this.species[index] !== 0) continue;
          this.species[index] = species;
          this.biomass[index] = this.random.range(0.28, 0.85);
          this.tolerance[index] = this.random.range(0.68, 1.25);
        }
      }
    }
    this.measure();
    this.sample();
  }

  insideDish(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= MICRO_COLS || y >= MICRO_ROWS) return false;
    const dx = (x + 0.5 - MICRO_COLS * 0.5) / (MICRO_COLS * 0.46);
    const dy = (y + 0.5 - MICRO_ROWS * 0.5) / (MICRO_ROWS * 0.445);
    return dx * dx + dy * dy < 1;
  }

  /** World-space coordinates of the center of a living agar site. */
  coordinates(index: number): { x: number; y: number } {
    return {
      x: ((index % MICRO_COLS) + 0.5) * (this.width / MICRO_COLS),
      y: (Math.floor(index / MICRO_COLS) + 0.5) * (this.height / MICRO_ROWS),
    };
  }

  private neighbors(index: number): number[] {
    const col = index % MICRO_COLS;
    const row = Math.floor(index / MICRO_COLS);
    const result: number[] = [];
    if (col > 0 && this.insideDish(col - 1, row)) result.push(index - 1);
    if (col < MICRO_COLS - 1 && this.insideDish(col + 1, row)) result.push(index + 1);
    if (row > 0 && this.insideDish(col, row - 1)) result.push(index - MICRO_COLS);
    if (row < MICRO_ROWS - 1 && this.insideDish(col, row + 1)) result.push(index + MICRO_COLS);
    return result;
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
      !['nutrients', 'oxygen', 'buffer'].includes(kind)
    )
      return;
    const col = Math.floor((x / this.width) * MICRO_COLS);
    const row = Math.floor((y / this.height) * MICRO_ROWS);
    if (!this.insideDish(col, row)) return;
    this.fields.push({
      kind: kind as CommonsField['kind'],
      x,
      y,
      radius: 123,
      remaining: kind === 'nutrients' ? 12 : 15,
    });
    if (this.fields.length > MAX_FIELDS) this.fields.shift();
    this.cue(kind === 'nutrients' ? 'division' : kind === 'oxygen' ? 'exchange' : 'hush', 0.33);
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
    this.time += dt;
    this.updateAccumulator += dt;
    this.sampleAccumulator += dt;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      this.fields[i].remaining -= dt;
      if (this.fields[i].remaining <= 0) this.fields.splice(i, 1);
    }
    if (this.updateAccumulator >= UPDATE_SECONDS) {
      const elapsed = this.updateAccumulator;
      this.updateAccumulator = 0;
      this.advanceChemistry(elapsed);
    }
    if (this.sampleAccumulator >= 1) {
      this.sampleAccumulator -= 1;
      this.measure();
      if (this.exchangesSinceSample > 7 && this.random.next() < 0.25) {
        this.cue('exchange', clamp(this.exchangesSinceSample / 120, 0.15, 0.65));
      } else if (this.divisionSinceSample > 9 && this.random.next() < 0.3) {
        this.cue('division', clamp(this.divisionSinceSample / 75, 0.18, 0.7));
      }
      if (this.stressedSinceSample > 60 && this.random.next() < 0.09) {
        this.cue('hush', 0.2);
      }
      this.exchangesSinceSample = 0;
      this.divisionSinceSample = 0;
      this.stressedSinceSample = 0;
      this.sample();
    }
  }

  private advanceChemistry(elapsed: number): void {
    const beforeNutrients = this.nutrients.slice();
    const beforeOxygen = this.oxygen.slice();
    const beforeMetabolite = this.metabolite.slice();
    const beforeInhibitor = this.inhibitor.slice();
    const beforeSpecies = this.species.slice();
    const beforeBiomass = this.biomass.slice();
    const colonists: { index: number; species: MicrobeSpecies; tolerance: number }[] = [];
    for (let index = 0; index < MICRO_SITES; index++) {
      const col = index % MICRO_COLS;
      const row = Math.floor(index / MICRO_COLS);
      if (!this.insideDish(col, row)) continue;
      const adjacent = this.neighbors(index);
      const average = (field: Float32Array): number =>
        adjacent.length
          ? adjacent.reduce((sum, i) => sum + field[i], 0) / adjacent.length
          : field[index];
      let nutrient =
        beforeNutrients[index] + (average(beforeNutrients) - beforeNutrients[index]) * 0.16;
      let oxygen = beforeOxygen[index] + (average(beforeOxygen) - beforeOxygen[index]) * 0.21;
      let metabolite =
        beforeMetabolite[index] + (average(beforeMetabolite) - beforeMetabolite[index]) * 0.22;
      let inhibitor =
        beforeInhibitor[index] + (average(beforeInhibitor) - beforeInhibitor[index]) * 0.15;
      const cellX = ((col + 0.5) * this.width) / MICRO_COLS;
      const cellY = ((row + 0.5) * this.height) / MICRO_ROWS;
      nutrient = clamp(nutrient + elapsed * 0.0013, 0, 1.5);
      oxygen = clamp(oxygen + elapsed * 0.0018, 0, 1.5);
      metabolite = clamp(metabolite - elapsed * 0.0012, 0, 1.5);
      inhibitor = clamp(inhibitor - elapsed * 0.0014, 0, 1.5);

      for (const field of this.fields) {
        const distance = Math.hypot(cellX - field.x, cellY - field.y);
        if (distance >= field.radius) continue;
        const strength = (1 - distance / field.radius) * Math.min(1, field.remaining / 3) * elapsed;
        if (field.kind === 'nutrients') nutrient += strength * 0.052;
        if (field.kind === 'oxygen') oxygen += strength * 0.047;
        if (field.kind === 'buffer') inhibitor = Math.max(0, inhibitor - strength * 0.06);
      }

      const strain = beforeSpecies[index] as MicrobeSpecies;
      const mass = beforeBiomass[index];
      if (strain > 0 && mass > 0) {
        const tolerance = this.tolerance[index];
        const stress = strain === 3 ? inhibitor * 0.12 : (inhibitor * 0.31) / tolerance;
        let resource = nutrient;
        if (strain === 2) resource = metabolite * 1.7 + nutrient * 0.06;
        const gain =
          Math.min(resource, oxygen) * (strain === 2 ? 0.25 : 0.23) * mass * (1 - mass) * elapsed;
        const decline = (0.004 + stress * 0.05) * elapsed;
        const updatedMass = clamp(mass + gain - decline, 0, 1);
        this.biomass[index] = updatedMass < 0.08 ? 0 : updatedMass;
        if (this.biomass[index] === 0) this.species[index] = 0;
        if (strain === 1) {
          const consumed = Math.min(nutrient, mass * elapsed * 0.012);
          nutrient -= consumed;
          oxygen -= consumed * 0.6;
          metabolite += consumed * 1.5;
        } else if (strain === 2) {
          const consumed = Math.min(metabolite, mass * elapsed * 0.024);
          metabolite -= consumed;
          oxygen -= consumed * 0.8;
          nutrient += consumed * 0.08;
          if (consumed > 0.0001) {
            this.exchanges++;
            this.exchangesSinceSample++;
          }
        } else {
          const consumed = Math.min(nutrient, mass * elapsed * 0.017);
          nutrient -= consumed;
          oxygen -= consumed * 0.7;
          inhibitor += consumed * 1.1;
        }
        if (stress > 0.16) this.stressedSinceSample++;
        if (
          this.biomass[index] > 0.38 &&
          resource > 0.18 &&
          oxygen > 0.1 &&
          adjacent.length &&
          this.random.next() < 0.29 * this.biomass[index]
        ) {
          const target = adjacent[this.random.integer(0, adjacent.length)];
          if (beforeSpecies[target] === 0) {
            colonists.push({
              index: target,
              species: strain,
              tolerance: clamp(tolerance + this.random.range(-0.035, 0.035), 0.6, 1.4),
            });
          }
        }
      }
      this.nutrients[index] = clamp(nutrient, 0, 1.5);
      this.oxygen[index] = clamp(oxygen, 0, 1.5);
      this.metabolite[index] = clamp(metabolite, 0, 1.5);
      this.inhibitor[index] = clamp(inhibitor, 0, 1.5);
    }
    for (const child of colonists) {
      if (this.species[child.index] !== 0) continue;
      this.species[child.index] = child.species;
      this.biomass[child.index] = 0.2;
      this.tolerance[child.index] = child.tolerance;
      this.divisions++;
      this.divisionSinceSample++;
    }
  }

  private measure(): void {
    this.producerCount = 0;
    this.crossfeederCount = 0;
    this.competitorCount = 0;
    let resources = 0;
    let valid = 0;
    for (let i = 0; i < MICRO_SITES; i++) {
      const col = i % MICRO_COLS;
      const row = Math.floor(i / MICRO_COLS);
      if (!this.insideDish(col, row)) continue;
      valid++;
      resources += this.nutrients[i];
      if (this.species[i] === 1) this.producerCount++;
      if (this.species[i] === 2) this.crossfeederCount++;
      if (this.species[i] === 3) this.competitorCount++;
    }
    this.occupied = this.producerCount + this.crossfeederCount + this.competitorCount;
    this.meanResources = valid ? resources / valid : 0;
  }

  private sample(): void {
    this.history.push({
      time: Math.round(this.time * 10) / 10,
      primary: this.occupied,
      secondary: this.crossfeederCount,
    });
    if (this.history.length > 160) this.history.shift();
  }

  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'PRODUCERS',
        value: String(this.producerCount),
        note: 'resource converters',
        tone: 'mint',
      },
      {
        label: 'CROSS-FEEDERS',
        value: String(this.crossfeederCount),
        note: 'metabolite consumers',
        tone: 'blue',
      },
      {
        label: 'COMPETITORS',
        value: String(this.competitorCount),
        note: 'chemical inhibitors',
        tone: 'coral',
      },
      {
        label: 'EXCHANGES',
        value: String(this.exchanges),
        note: 'metabolite uptake',
        tone: 'gold',
      },
    ];
  }
}
