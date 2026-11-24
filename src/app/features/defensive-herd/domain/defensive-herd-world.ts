import { SeededRandom } from '../../../shared/simulation/seeded-random';
import type {
  InteractiveWorld,
  WorldAudioCue,
  WorldHistoryPoint,
  WorldMetric,
} from '../../../shared/world-experience/world-protocol';

export const HERD_WIDTH = 1200;
export const HERD_HEIGHT = 720;
const MAX_HERD = 85;
const TAU = Math.PI * 2;

export interface HerdAnimal {
  id: number;
  kind: 'adult' | 'calf';
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  energy: number;
  age: number;
  phase: number;
  boldness: number;
}

export interface Wolf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hunger: number;
  cooldown: number;
}

export interface Pasture {
  x: number;
  y: number;
  food: number;
  radius: number;
  richness: number;
}

export interface MeadowInfluence {
  kind: 'scent' | 'breeze';
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  remaining: number;
}

export class DefensiveHerdWorld implements InteractiveWorld {
  readonly audioCues: WorldAudioCue[] = [];
  private nextCueId = 0;
  private ringAudible = false;
  private threatAudible = false;
  private cue(kind: WorldAudioCue['kind'], strength = 0.3, x?: number): void {
    const pan = x === undefined ? undefined : (x / this.width) * 2 - 1;
    this.audioCues.push({ id: ++this.nextCueId, kind, strength, pan });
    if (this.audioCues.length > 16) this.audioCues.shift();
  }
  readonly seed: number;
  readonly width = HERD_WIDTH;
  readonly height = HERD_HEIGHT;
  readonly herd: HerdAnimal[] = [];
  readonly wolves: Wolf[] = [];
  readonly pastures: Pasture[] = [];
  readonly influences: MeadowInfluence[] = [];
  readonly history: WorldHistoryPoint[] = [];

  private readonly random: SeededRandom;
  private sampleTime = 0;
  private reproductionTime = 0;
  private nextId = 1;
  time = 0;
  defenseLevel = 0;
  ringCoverage = 0;
  births = 0;
  losses = 0;

  constructor(seed = 20261119, adults = 34, calves = 9, predators = 3) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    if (
      ![adults, calves, predators].every(Number.isInteger) ||
      adults < 0 ||
      calves < 0 ||
      predators < 0 ||
      adults + calves > MAX_HERD ||
      predators > 6
    ) {
      throw new RangeError('Herd configuration exceeds supported bounds');
    }
    for (let i = 0; i < 38; i++) {
      this.pastures.push({
        x: this.random.range(90, this.width - 90),
        y: this.random.range(85, this.height - 85),
        food: this.random.range(0.35, 1),
        radius: this.random.range(52, 92),
        richness: this.random.range(0.45, 1),
      });
    }
    for (let i = 0; i < adults; i++) {
      const angle = (i / Math.max(1, adults)) * TAU + this.random.range(-0.3, 0.3);
      const radius = this.random.range(82, 178);
      this.addAnimal('adult', 600 + Math.cos(angle) * radius, 366 + Math.sin(angle) * radius);
    }
    for (let i = 0; i < calves; i++) {
      this.addAnimal('calf', this.random.range(555, 645), this.random.range(330, 405));
    }
    for (let i = 0; i < predators; i++) {
      const angle = (i / Math.max(1, predators)) * TAU + 0.45;
      const x = 600 + Math.cos(angle) * 410;
      const y = 360 + Math.sin(angle) * 270;
      this.wolves.push({
        x,
        y,
        vx: this.random.range(-35, 35),
        vy: this.random.range(-35, 35),
        hunger: this.random.range(0.25, 0.55),
        cooldown: this.random.range(2, 8),
      });
    }
    this.sample();
  }

  private addAnimal(kind: HerdAnimal['kind'], x: number, y: number): void {
    const angle = this.random.range(-Math.PI, Math.PI);
    const speed = this.random.range(15, 34);
    this.herd.push({
      id: this.nextId++,
      kind,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      facingX: Math.cos(angle),
      facingY: Math.sin(angle),
      age: kind === 'calf' ? 0 : this.random.range(16, 90),
      energy: this.random.range(0.6, 1.15),
      phase: this.random.range(0, TAU),
      boldness: this.random.range(0.75, 1.25),
    });
  }

  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (
      ![x, y, dx, dy].every(Number.isFinite) ||
      x < 0 ||
      x > this.width ||
      y < 0 ||
      y > this.height
    )
      return;

    if (['pasture', 'scent', 'breeze'].includes(kind))
      this.cue(kind === 'pasture' ? 'graze' : kind === 'scent' ? 'hush' : 'flow');
    if (kind === 'pasture') {
      const nearby = this.pastures.find((patch) => Math.hypot(patch.x - x, patch.y - y) < 68);
      if (nearby) {
        nearby.food = Math.min(1, nearby.food + 0.32);
        nearby.richness = Math.min(1, nearby.richness + 0.06);
      } else {
        this.pastures.push({ x, y, food: 0.9, radius: 87, richness: 0.9 });
      }
      if (this.pastures.length > 70) this.pastures.shift();
    } else if (kind === 'scent' || kind === 'breeze') {
      const length = Math.hypot(dx, dy);
      this.influences.push({
        kind,
        x,
        y,
        dx: kind === 'breeze' && length > 2 ? (dx / length) * 95 : 50,
        dy: kind === 'breeze' && length > 2 ? (dy / length) * 95 : 0,
        radius: kind === 'scent' ? 160 : 200,
        remaining: kind === 'scent' ? 15 : 9,
      });
      if (this.influences.length > 30) this.influences.shift();
    }
  }

  calfCenter(): { x: number; y: number } {
    const calves = this.herd.filter((animal) => animal.kind === 'calf');
    const group = calves.length ? calves : this.herd;
    if (!group.length) return { x: this.width / 2, y: this.height / 2 };
    return {
      x: group.reduce((sum, animal) => sum + animal.x, 0) / group.length,
      y: group.reduce((sum, animal) => sum + animal.y, 0) / group.length,
    };
  }

  private blocksAttack(wolf: Wolf, calf: HerdAnimal): boolean {
    const dx = wolf.x - calf.x;
    const dy = wolf.y - calf.y;
    const length2 = dx * dx + dy * dy;
    if (length2 < 1) return false;
    for (const adult of this.herd) {
      if (adult.kind !== 'adult') continue;
      const projection = ((adult.x - calf.x) * dx + (adult.y - calf.y) * dy) / length2;
      if (projection < 0.24 || projection > 0.94) continue;
      const px = calf.x + projection * dx;
      const py = calf.y + projection * dy;
      if (Math.hypot(px - adult.x, py - adult.y) < 34) return true;
    }
    return false;
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
    this.time += dt;
    this.sampleTime += dt;
    this.reproductionTime += dt;

    for (const pasture of this.pastures) {
      pasture.food = Math.min(1, pasture.food + dt * 0.008 * pasture.richness);
    }
    for (let i = this.influences.length - 1; i >= 0; i--) {
      this.influences[i].remaining -= dt;
      if (this.influences[i].remaining <= 0) this.influences.splice(i, 1);
    }

    const center = this.calfCenter();
    let nearestThreat = Infinity;
    for (const wolf of this.wolves) {
      nearestThreat = Math.min(nearestThreat, Math.hypot(wolf.x - center.x, wolf.y - center.y));
    }
    const threatened = nearestThreat < (this.threatAudible ? 330 : 265);
    if (threatened && !this.threatAudible) this.cue('low-call', 0.43, center.x);
    this.threatAudible = threatened;
    const requestedDefense = Math.max(0, Math.min(1, (345 - nearestThreat) / 185));
    this.defenseLevel += (requestedDefense - this.defenseLevel) * Math.min(1, dt * 2.2);

    const pending: { vx: number; vy: number; fx: number; fy: number }[] = [];
    for (const animal of this.herd) {
      const isCalf = animal.kind === 'calf';
      const speedLimit = isCalf ? 57 : 68;
      const angle = this.time * 0.26 + animal.phase;
      let ax = Math.cos(angle) * 7;
      let ay = Math.sin(angle) * 7;
      let separateX = 0;
      let separateY = 0;
      let neighborCount = 0;
      let alignX = 0;
      let alignY = 0;
      let herdX = 0;
      let herdY = 0;
      for (const other of this.herd) {
        if (other.id === animal.id) continue;
        const dx = other.x - animal.x;
        const dy = other.y - animal.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 30 * 30 && d2 > 0.0001) {
          separateX -= dx / (d2 + 10);
          separateY -= dy / (d2 + 10);
        }
        if (d2 < 135 * 135) {
          neighborCount++;
          alignX += other.vx;
          alignY += other.vy;
          herdX += other.x;
          herdY += other.y;
        }
      }
      ax += separateX * 1600;
      ay += separateY * 1600;
      if (neighborCount) {
        ax += (alignX / neighborCount - animal.vx) * 0.65;
        ay += (alignY / neighborCount - animal.vy) * 0.65;
        if (this.defenseLevel < 0.5) {
          ax += (herdX / neighborCount - animal.x) * 0.035;
          ay += (herdY / neighborCount - animal.y) * 0.035;
        }
      }

      const toCenterX = center.x - animal.x;
      const toCenterY = center.y - animal.y;
      const centerDistance = Math.max(1, Math.hypot(toCenterX, toCenterY));
      const outwardX = -toCenterX / centerDistance;
      const outwardY = -toCenterY / centerDistance;
      let facingX = animal.vx;
      let facingY = animal.vy;

      if (isCalf) {
        // Calves seek a compact group when threatened.
        const collect = 0.06 + this.defenseLevel * 0.95;
        ax += toCenterX * collect;
        ay += toCenterY * collect;
        for (const wolf of this.wolves) {
          const dx = animal.x - wolf.x;
          const dy = animal.y - wolf.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 210 && distance > 1) {
            ax += (dx / distance) * (210 - distance) * 1.8;
            ay += (dy / distance) * (210 - distance) * 1.8;
          }
        }
      } else if (this.defenseLevel > 0.02) {
        // There are no assigned ring positions or scripted formations. Adults
        // independently maintain a distance from calves and avoid neighbors.
        const radiusError = 101 - centerDistance;
        const guarding = this.defenseLevel * animal.boldness;
        ax += outwardX * radiusError * guarding * 1.65;
        ay += outwardY * radiusError * guarding * 1.65;
        facingX = outwardX * guarding + animal.vx * (1 - this.defenseLevel) * 0.02;
        facingY = outwardY * guarding + animal.vy * (1 - this.defenseLevel) * 0.02;
      } else {
        const grazing = this.pastures
          .filter((patch) => patch.food > 0.12)
          .sort(
            (a, b) =>
              Math.hypot(a.x - animal.x, a.y - animal.y) -
              Math.hypot(b.x - animal.x, b.y - animal.y),
          )[0];
        if (grazing && animal.energy < 1.32) {
          ax += (grazing.x - animal.x) * 0.18;
          ay += (grazing.y - animal.y) * 0.18;
        }
      }

      for (const field of this.influences) {
        const dx = animal.x - field.x;
        const dy = animal.y - field.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= field.radius) continue;
        const strength = (1 - distance / field.radius) * Math.min(1, field.remaining / 2);
        if (field.kind === 'breeze') {
          ax += field.dx * strength * 0.42;
          ay += field.dy * strength * 0.42;
        }
      }

      if (animal.x < 70) ax += (70 - animal.x) * 3;
      if (animal.x > this.width - 70) ax -= (animal.x - this.width + 70) * 3;
      if (animal.y < 65) ay += (65 - animal.y) * 3;
      if (animal.y > this.height - 65) ay -= (animal.y - this.height + 65) * 3;
      const acceleration = Math.hypot(ax, ay);
      if (acceleration > 250) {
        ax = (ax / acceleration) * 250;
        ay = (ay / acceleration) * 250;
      }

      let vx = animal.vx + ax * dt;
      let vy = animal.vy + ay * dt;
      const magnitude = Math.hypot(vx, vy) || 1;
      const speed = Math.min(speedLimit, magnitude);
      vx = (vx / magnitude) * speed;
      vy = (vy / magnitude) * speed;
      const headLength = Math.hypot(facingX, facingY) || 1;
      pending.push({ vx, vy, fx: facingX / headLength, fy: facingY / headLength });
      animal.age += dt;
      animal.energy = Math.max(0.15, animal.energy - dt * (isCalf ? 0.001 : 0.0025));
    }

    for (let i = 0; i < this.herd.length; i++) {
      const animal = this.herd[i];
      const move = pending[i];
      animal.vx = move.vx;
      animal.vy = move.vy;
      animal.x = Math.max(12, Math.min(this.width - 12, animal.x + move.vx * dt));
      animal.y = Math.max(12, Math.min(this.height - 12, animal.y + move.vy * dt));
      if (this.defenseLevel > 0.4 && animal.kind === 'adult') {
        animal.facingX = move.fx;
        animal.facingY = move.fy;
      } else {
        const speed = Math.hypot(move.vx, move.vy);
        if (speed > 2) {
          animal.facingX = move.vx / speed;
          animal.facingY = move.vy / speed;
        }
      }
      if (animal.kind === 'adult' && this.defenseLevel < 0.55) {
        for (const pasture of this.pastures) {
          if (pasture.food < 0.02 || Math.hypot(animal.x - pasture.x, animal.y - pasture.y) > 42) {
            continue;
          }
          pasture.food = Math.max(0, pasture.food - dt * 0.009);
          animal.energy = Math.min(1.5, animal.energy + dt * 0.012);
          break;
        }
      }
    }

    this.advanceWolves(dt);
    if (this.sampleTime >= 1) {
      this.sampleTime -= 1;
      this.updateRingCoverage();
      this.sample();
    }
    if (this.reproductionTime >= 22) {
      this.reproductionTime -= 22;
      this.populationTurnover();
    }
  }

  private advanceWolves(dt: number): void {
    const calves = this.herd.filter((animal) => animal.kind === 'calf');
    const candidates = calves.length ? calves : this.herd;
    for (const wolf of this.wolves) {
      wolf.cooldown = Math.max(0, wolf.cooldown - dt);
      wolf.hunger = Math.min(1, wolf.hunger + dt * 0.004);
      if (!candidates.length) continue;
      let target = candidates[0];
      let distance = Infinity;
      for (const animal of candidates) {
        const d2 = (wolf.x - animal.x) ** 2 + (wolf.y - animal.y) ** 2;
        if (d2 < distance) {
          distance = d2;
          target = animal;
        }
      }
      const actual = Math.sqrt(distance);
      const protectedCalf = target.kind === 'calf' && this.blocksAttack(wolf, target);
      const threat = this.herd.filter(
        (animal) =>
          animal.kind === 'adult' && Math.hypot(animal.x - wolf.x, animal.y - wolf.y) < 56,
      ).length;
      let ax = ((target.x - wolf.x) / Math.max(1, actual)) * (wolf.cooldown ? 15 : 68);
      let ay = ((target.y - wolf.y) / Math.max(1, actual)) * (wolf.cooldown ? 15 : 68);
      if (protectedCalf && actual < 150) {
        // Interposing defenders genuinely change what a predator can reach.
        ax -= ((target.x - wolf.x) / Math.max(1, actual)) * 235;
        ay -= ((target.y - wolf.y) / Math.max(1, actual)) * 235;
      }
      if (threat) {
        ax -= ((target.x - wolf.x) / Math.max(1, actual)) * threat * 25;
        ay -= ((target.y - wolf.y) / Math.max(1, actual)) * threat * 25;
      }
      for (const field of this.influences) {
        if (field.kind !== 'scent') continue;
        const dx = wolf.x - field.x;
        const dy = wolf.y - field.y;
        const dist = Math.hypot(dx, dy);
        if (dist < field.radius && dist > 1) {
          const force = (1 - dist / field.radius) * 210;
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
      }
      wolf.vx += (ax - wolf.vx * 0.65) * dt;
      wolf.vy += (ay - wolf.vy * 0.65) * dt;
      const speed = Math.hypot(wolf.vx, wolf.vy) || 1;
      const limited = Math.min(78, Math.max(12, speed));
      wolf.vx = (wolf.vx / speed) * limited;
      wolf.vy = (wolf.vy / speed) * limited;
      wolf.x = Math.max(18, Math.min(this.width - 18, wolf.x + wolf.vx * dt));
      wolf.y = Math.max(18, Math.min(this.height - 18, wolf.y + wolf.vy * dt));

      if (wolf.cooldown === 0 && actual < 24 && !protectedCalf) {
        const index = this.herd.indexOf(target);
        if (index >= 0) {
          this.herd.splice(index, 1);
          this.losses++;
          this.cue('prey-catch', 0.57, target.x);
          wolf.cooldown = 13;
          wolf.hunger = 0;
        }
      }
    }
  }

  private populationTurnover(): void {
    for (const animal of this.herd) {
      if (animal.kind === 'calf' && animal.age >= 70) {
        animal.kind = 'adult';
        this.cue('shimmer', 0.2);
        animal.energy = Math.max(animal.energy, 0.8);
      }
    }
    const adults = this.herd.filter((animal) => animal.kind === 'adult');
    const calves = this.herd.filter((animal) => animal.kind === 'calf');
    if (this.herd.length >= MAX_HERD || adults.length < 4 || calves.length >= 16) return;
    const parents = adults.filter((animal) => animal.energy > 0.8);
    if (!parents.length) return;
    const parent = parents[this.random.integer(0, parents.length)];
    this.addAnimal(
      'calf',
      parent.x + this.random.range(-15, 15),
      parent.y + this.random.range(-15, 15),
    );
    this.births++;
    this.cue('calf', 0.54, parent.x);
    parent.energy *= 0.78;
  }

  private updateRingCoverage(): void {
    const center = this.calfCenter();
    const sectors = new Set<number>();
    for (const animal of this.herd) {
      if (animal.kind !== 'adult') continue;
      const dx = animal.x - center.x;
      const dy = animal.y - center.y;
      const radius = Math.hypot(dx, dy);
      if (radius < 65 || radius > 155) continue;
      const facing = (dx * animal.facingX + dy * animal.facingY) / Math.max(1, radius);
      if (facing < 0.3) continue;
      const angle = (Math.atan2(dy, dx) + TAU) % TAU;
      sectors.add(Math.floor((angle / TAU) * 12));
    }
    this.ringCoverage = Math.round((sectors.size / 12) * 100);
    const ringFormed = this.ringCoverage >= (this.ringAudible ? 33 : 58);
    if (ringFormed !== this.ringAudible) this.cue('footsteps', ringFormed ? 0.66 : 0.29, center.x);
    this.ringAudible = ringFormed;
  }

  private sample(): void {
    this.history.push({
      time: Math.round(this.time * 10) / 10,
      primary: this.herd.filter((animal) => animal.kind === 'calf').length,
      secondary: this.ringCoverage,
    });
    if (this.history.length > 160) this.history.shift();
  }

  metrics(): readonly WorldMetric[] {
    const adults = this.herd.filter((animal) => animal.kind === 'adult').length;
    const calves = this.herd.length - adults;
    return [
      { label: 'GUARDIANS', value: String(adults), note: 'adult grazers', tone: 'mint' },
      { label: 'YOUNG', value: String(calves), note: 'protected calves', tone: 'gold' },
      {
        label: 'RING',
        value: `${this.ringCoverage}%`,
        note: 'outward-facing sectors',
        tone: 'blue',
      },
      { label: 'LOSSES', value: String(this.losses), note: 'predation events', tone: 'coral' },
    ];
  }
}
