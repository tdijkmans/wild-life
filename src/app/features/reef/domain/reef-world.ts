import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldAudioCue,
  WorldHistoryPoint,
  WorldMetric,
} from '../../../shared/world-experience/world-protocol';

export const REEF_WIDTH = 1200;
export const REEF_HEIGHT = 720;
const MAX_CORALS = 36;
const MAX_FISH = 35;
const MAX_ALGAE = 115;
const MAX_BRANCHES = 62;
const TAU = Math.PI * 2;

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

export interface CoralBranch {
  parent: number;
  angle: number;
  length: number;
  progress: number;
  depth: number;
  width: number;
  forked: boolean;
}

export interface CoralColony {
  id: number;
  x: number;
  y: number;
  age: number;
  energy: number;
  symbionts: number;
  tolerance: number;
  hue: number;
  branches: CoralBranch[];
}

export interface AlgaePatch {
  x: number;
  y: number;
  mass: number;
  radius: number;
  hue: number;
}

export interface ReefFish {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  phase: number;
  hue: number;
}

export interface ReefField {
  kind: 'cool' | 'nutrients' | 'current';
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  remaining: number;
}

/**
 * Growing coral colonies with light-dependent symbiosis and thermal stress.
 * Algae compete for space and light; grazing fish consume algae biomass.
 * Geometric branch tips and grazing interactions are part of the world model,
 * not pre-scripted canvas effects.
 */
export class ReefWorld implements InteractiveWorld {
  readonly seed: number;
  readonly width = REEF_WIDTH;
  readonly height = REEF_HEIGHT;
  readonly corals: CoralColony[] = [];
  readonly algae: AlgaePatch[] = [];
  readonly fish: ReefFish[] = [];
  readonly fields: ReefField[] = [];
  readonly history: WorldHistoryPoint[] = [];
  readonly audioCues: WorldAudioCue[] = [];

  private readonly random: SeededRandom;
  private nextId = 1;
  private nextCueId = 0;
  private sampleTimer = 0;
  private growthTimer = 0;
  private settlementTimer = 0;
  private grazesSinceSample = 0;
  private bleachedBefore = 0;
  time = 0;
  bleaching = 0;
  meanSymbiosis = 0;
  grazingEvents = 0;
  branchBirths = 0;
  recruits = 0;

  constructor(seed = 20261123, colonyCount = 24, algaeCount = 66, fishCount = 16) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    if (
      ![colonyCount, algaeCount, fishCount].every(Number.isInteger) ||
      colonyCount < 0 ||
      colonyCount > MAX_CORALS ||
      algaeCount < 0 ||
      algaeCount > MAX_ALGAE ||
      fishCount < 0 ||
      fishCount > MAX_FISH
    )
      throw new RangeError('Reef population is outside supported bounds');

    for (let i = 0; i < colonyCount; i++) {
      const x = 90 + (i / Math.max(1, colonyCount - 1)) * 1015 + this.random.range(-28, 28);
      this.plantCoral(x, false);
    }
    for (let i = 0; i < algaeCount; i++) {
      this.algae.push({
        x: this.random.range(48, this.width - 48),
        y: this.random.range(480, 690),
        mass: this.random.range(0.25, 0.87),
        radius: this.random.range(16, 42),
        hue: this.random.range(-15, 22),
      });
    }
    for (let i = 0; i < fishCount; i++) {
      this.fish.push(this.spawnFish(this.random.range(90, 1110), this.random.range(250, 640)));
    }
    this.measure();
    this.sample();
  }

  private plantCoral(x: number, sapling: boolean): void {
    const colony: CoralColony = {
      id: this.nextId++,
      x: clamp(x, 25, this.width - 25),
      y: this.random.range(634, 697),
      age: sapling ? 0 : this.random.range(40, 130),
      energy: this.random.range(0.6, 1.1),
      symbionts: this.random.range(0.68, 0.99),
      tolerance: this.random.range(27.3, 29.4),
      hue: this.random.range(-23, 34),
      branches: [
        {
          parent: -1,
          angle: -Math.PI / 2 + this.random.range(-0.35, 0.35),
          length: this.random.range(42, 75),
          progress: sapling ? 0.14 : 1,
          depth: 0,
          width: this.random.range(5, 9),
          forked: false,
        },
      ],
    };
    if (!sapling) {
      this.fork(colony, 0, true);
      const firstTier = colony.branches.length;
      for (let i = 1; i < firstTier; i++) this.fork(colony, i, true);
      const secondTier = colony.branches.length;
      for (let i = firstTier; i < secondTier; i++) {
        if (this.random.next() < 0.6) this.fork(colony, i, true);
      }
    }
    this.corals.push(colony);
  }

  branchGeometry(
    coral: CoralColony,
    index: number,
  ): {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } {
    const branch = coral.branches[index];
    const start =
      branch.parent >= 0 ? this.branchEndpoint(coral, branch.parent) : { x: coral.x, y: coral.y };
    return {
      x1: start.x,
      y1: start.y,
      x2: start.x + Math.cos(branch.angle) * branch.length * branch.progress,
      y2: start.y + Math.sin(branch.angle) * branch.length * branch.progress,
    };
  }

  private branchEndpoint(coral: CoralColony, index: number): { x: number; y: number } {
    const geom = this.branchGeometry(coral, index);
    return { x: geom.x2, y: geom.y2 };
  }

  private fork(coral: CoralColony, index: number, established = false): void {
    const branch = coral.branches[index];
    if (branch.forked || branch.depth >= 4 || coral.branches.length >= MAX_BRANCHES) return;
    branch.forked = true;
    const count = branch.depth <= 1 ? 2 : this.random.next() < 0.48 ? 2 : 1;
    for (let i = 0; i < count && coral.branches.length < MAX_BRANCHES; i++) {
      const sign = i % 2 === 0 ? -1 : 1;
      const angle = clamp(
        branch.angle + sign * this.random.range(0.34, 0.68),
        -Math.PI + 0.25,
        -0.23,
      );
      coral.branches.push({
        parent: index,
        angle,
        length: branch.length * this.random.range(0.62, 0.87),
        progress: established ? this.random.range(0.62, 1) : 0.08,
        depth: branch.depth + 1,
        width: Math.max(0.8, branch.width * 0.63),
        forked: false,
      });
      if (!established) this.branchBirths++;
    }
  }

  private spawnFish(x: number, y: number, parent?: ReefFish): ReefFish {
    const angle = this.random.range(0, TAU);
    const speed = this.random.range(14, 36);
    return {
      id: this.nextId++,
      x: clamp(x, 15, this.width - 15),
      y: clamp(y, 70, this.height - 16),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: parent ? 0 : this.random.range(5, 85),
      energy: parent ? 0.68 : this.random.range(0.58, 1.05),
      phase: this.random.range(0, TAU),
      hue: parent ? parent.hue + this.random.range(-4, 4) : this.random.range(-22, 28),
    };
  }

  private cue(kind: WorldAudioCue['kind'], strength: number): void {
    this.audioCues.push({
      id: ++this.nextCueId,
      kind,
      strength: clamp(strength, 0.06, 1),
    });
    if (this.audioCues.length > 16) this.audioCues.shift();
  }

  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (
      ![x, y, dx, dy].every(Number.isFinite) ||
      x < 0 ||
      y < 0 ||
      x > this.width ||
      y > this.height ||
      !['cool', 'nutrients', 'current'].includes(kind)
    )
      return;
    const length = Math.hypot(dx, dy);
    this.fields.push({
      kind: kind as ReefField['kind'],
      x,
      y,
      dx: kind === 'current' ? (length > 2 ? (dx / length) * 86 : 48) : 0,
      dy: kind === 'current' ? (length > 2 ? (dy / length) * 86 : -18) : 0,
      radius: kind === 'cool' ? 195 : 175,
      remaining: kind === 'current' ? 12 : 18,
    });
    if (this.fields.length > 24) this.fields.shift();
    this.cue(kind === 'nutrients' ? 'bloom' : kind === 'cool' ? 'reef' : 'flow', 0.4);
  }

  temperatureAt(x: number, y: number): number {
    let temperature = 28.1 + Math.sin(this.time * 0.052) * 1.25;
    for (const field of this.fields) {
      if (field.kind !== 'cool') continue;
      const distance = Math.hypot(field.x - x, field.y - y);
      if (distance < field.radius) {
        temperature -= (1 - distance / field.radius) * Math.min(1, field.remaining / 2) * 2.2;
      }
    }
    return temperature;
  }

  private currentAt(x: number, y: number): { x: number; y: number } {
    let vx = Math.sin(y * 0.008 + this.time * 0.08) * 12;
    let vy = Math.cos(x * 0.007 - this.time * 0.07) * 8;
    for (const field of this.fields) {
      if (field.kind !== 'current') continue;
      const distance = Math.hypot(x - field.x, y - field.y);
      if (distance >= field.radius) continue;
      const falloff = (1 - distance / field.radius) * Math.min(1, field.remaining / 2);
      vx += field.dx * falloff;
      vy += field.dy * falloff;
    }
    return { x: clamp(vx, -112, 112), y: clamp(vy, -112, 112) };
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
    this.time += dt;
    this.sampleTimer += dt;
    this.growthTimer += dt;
    this.settlementTimer += dt;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      this.fields[i].remaining -= dt;
      if (this.fields[i].remaining <= 0) this.fields.splice(i, 1);
    }
    for (const coral of this.corals) {
      const localTemp = this.temperatureAt(coral.x, coral.y - 130);
      const nearbyAlgae = this.algae.reduce((sum, patch) => {
        const distance = Math.hypot(patch.x - coral.x, patch.y - (coral.y - 75));
        return sum + (distance < 100 ? patch.mass * (1 - distance / 100) : 0);
      }, 0);
      const light = clamp(1 - (coral.y - 350) / 900 - nearbyAlgae * 0.14, 0.16, 1.15);
      const heat = Math.max(0, localTemp - coral.tolerance);
      coral.symbionts = clamp(
        coral.symbionts + dt * (heat > 0 ? -heat * 0.035 : 0.007 * light),
        0.04,
        1,
      );
      coral.energy = clamp(
        coral.energy + dt * (coral.symbionts * light * 0.021 - 0.01 - nearbyAlgae * 0.0015),
        0.04,
        1.65,
      );
      coral.age += dt;
      for (const branch of coral.branches) {
        branch.progress = Math.min(
          1,
          branch.progress + dt * 0.018 * coral.symbionts * coral.energy,
        );
      }
    }
    for (const patch of this.algae) {
      let enrich = 0;
      for (const field of this.fields) {
        if (field.kind !== 'nutrients') continue;
        const distance = Math.hypot(patch.x - field.x, patch.y - field.y);
        if (distance < field.radius) {
          enrich += (1 - distance / field.radius) * Math.min(1, field.remaining / 2);
        }
      }
      const sunlight = clamp(0.9 - patch.y / 1250, 0.25, 0.95);
      const crowding = this.corals.reduce((sum, coral) => {
        const distance = Math.hypot(patch.x - coral.x, patch.y - coral.y + 40);
        return sum + (distance < 67 ? coral.energy * (1 - distance / 67) : 0);
      }, 0);
      patch.mass = clamp(
        patch.mass +
          dt *
            ((sunlight + enrich * 1.2) * patch.mass * (1 - patch.mass) * 0.048 - crowding * 0.009),
        0.01,
        1,
      );
    }
    this.advanceFish(dt);
    if (this.growthTimer >= 2.6) {
      this.growthTimer -= 2.6;
      let branches = 0;
      for (const coral of this.corals) {
        if (coral.energy < 0.38 || coral.symbionts < 0.28) continue;
        const available = coral.branches
          .map((branch, index) => ({ branch, index }))
          .filter(({ branch }) => !branch.forked && branch.progress > 0.78 && branch.depth < 4);
        if (!available.length) continue;
        if (this.random.next() < coral.energy * coral.symbionts * 0.66) {
          const selected = available[this.random.integer(0, available.length)];
          this.fork(coral, selected.index);
          branches++;
        }
      }
      if (branches > 2 && this.random.next() < 0.3) this.cue('reef', Math.min(1, branches / 9));
    }
    if (this.settlementTimer >= 22) {
      this.settlementTimer -= 22;
      this.turnover();
    }
    if (this.sampleTimer >= 1) {
      this.sampleTimer -= 1;
      this.measure();
      const bleaching = this.bleaching > this.bleachedBefore + 2;
      if (bleaching) this.cue('bleach', 0.48);
      else if (this.bleaching < this.bleachedBefore - 2) this.cue('shimmer', 0.44);
      const sustainedGrazing =
        !bleaching && this.grazesSinceSample > 30 && this.random.next() < 0.35;
      if (this.grazesSinceSample > 0) this.cue('graze', sustainedGrazing ? 0.48 : 0.29);
      this.bleachedBefore = this.bleaching;
      this.grazesSinceSample = 0;
      this.sample();
    }
  }

  private advanceFish(dt: number): void {
    for (const fish of this.fish) {
      let nearest: AlgaePatch | undefined;
      let best = Infinity;
      for (const patch of this.algae) {
        if (patch.mass < 0.04) continue;
        const distance = (patch.x - fish.x) ** 2 + (patch.y - fish.y) ** 2;
        if (distance < best) {
          nearest = patch;
          best = distance;
        }
      }
      let ax = Math.sin(fish.phase + this.time * 1.08) * 10;
      let ay = Math.cos(fish.phase + this.time * 0.92) * 10;
      if (nearest) {
        ax += (nearest.x - fish.x) * 0.17;
        ay += (nearest.y - fish.y) * 0.17;
        if (best < 25 * 25) {
          const portion = Math.min(nearest.mass, dt * 0.12);
          nearest.mass -= portion;
          fish.energy = clamp(fish.energy + portion * 0.4, 0, 1.5);
          this.grazingEvents++;
          this.grazesSinceSample++;
        }
      }
      const drift = this.currentAt(fish.x, fish.y);
      ax += (drift.x - fish.vx) * 0.15;
      ay += (drift.y - fish.vy) * 0.15;
      for (const other of this.fish) {
        if (other.id === fish.id) continue;
        const dx = other.x - fish.x;
        const dy = other.y - fish.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 24 * 24 || d2 < 0.01) continue;
        ax -= (dx / (d2 + 9)) * 780;
        ay -= (dy / (d2 + 9)) * 780;
      }
      const acceleration = Math.hypot(ax, ay);
      if (acceleration > 110) {
        ax *= 110 / acceleration;
        ay *= 110 / acceleration;
      }
      fish.vx = clamp((fish.vx + ax * dt) * (1 - dt * 0.1), -65, 65);
      fish.vy = clamp((fish.vy + ay * dt) * (1 - dt * 0.1), -65, 65);
      fish.x = clamp(fish.x + fish.vx * dt, 20, this.width - 20);
      fish.y = clamp(fish.y + fish.vy * dt, 130, this.height - 20);
      fish.age += dt;
      fish.energy = clamp(fish.energy - dt * 0.0008, 0, 1.5);
    }
  }

  private turnover(): void {
    for (let i = this.fish.length - 1; i >= 0; i--) {
      if (this.fish[i].age > 240 || this.fish[i].energy <= 0) this.fish.splice(i, 1);
    }
    const candidates = this.fish.filter((fish) => fish.energy > 0.78 && fish.age > 30);
    if (candidates.length && this.fish.length < MAX_FISH && this.random.next() < 0.43) {
      const parent = candidates[this.random.integer(0, candidates.length)];
      this.fish.push(this.spawnFish(parent.x, parent.y, parent));
      parent.energy *= 0.65;
    }
    if (this.corals.length >= MAX_CORALS || !this.corals.length) return;
    const parents = this.corals.filter((coral) => coral.energy > 0.8 && coral.symbionts > 0.72);
    if (!parents.length || this.random.next() > 0.3) return;
    const parent = parents[this.random.integer(0, parents.length)];
    this.plantCoral(parent.x + this.random.range(-58, 58), true);
    parent.energy *= 0.86;
    this.recruits++;
    this.cue('bubble', 0.48);
  }

  private measure(): void {
    if (!this.corals.length) {
      this.meanSymbiosis = 0;
      this.bleaching = 0;
      return;
    }
    this.meanSymbiosis =
      this.corals.reduce((sum, coral) => sum + coral.symbionts, 0) / this.corals.length;
    this.bleaching = this.corals.filter((coral) => coral.symbionts < 0.48).length;
  }

  private sample(): void {
    this.history.push({
      time: Math.round(this.time * 10) / 10,
      primary: Math.round(this.meanSymbiosis * 100),
      secondary: Math.round(
        (this.algae.reduce((sum, patch) => sum + patch.mass, 0) / Math.max(1, this.algae.length)) *
          100,
      ),
    });
    if (this.history.length > 160) this.history.shift();
  }

  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'CORAL BRANCHES',
        value: String(this.corals.reduce((sum, coral) => sum + coral.branches.length, 0)),
        note: 'living calcified tips',
        tone: 'mint',
      },
      {
        label: 'SYMBIOSIS',
        value: `${Math.round(this.meanSymbiosis * 100)}%`,
        note: 'symbiotic algae retained',
        tone: 'gold',
      },
      {
        label: 'BLEACHING',
        value: String(this.bleaching),
        note: 'stressed coral colonies',
        tone: 'coral',
      },
      {
        label: 'GRAZERS',
        value: String(this.fish.length),
        note: 'algae-eating fish',
        tone: 'blue',
      },
    ];
  }
}
