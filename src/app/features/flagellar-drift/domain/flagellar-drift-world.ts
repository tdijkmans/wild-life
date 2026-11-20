import { clamp, LivingWorld } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

export const PROPULSORS = ['Whip', 'Twin', 'Helix'] as const;
export type Propulsor = 0 | 1 | 2;
const TAU = Math.PI * 2;
const MAX_SWIMMERS = 120;

interface Swimmer {
  id: number;
  x: number;
  y: number;
  heading: number;
  phase: number;
  propulsion: Propulsor;
  drive: number;
  energy: number;
  age: number;
  lifespan: number;
  generation: number;
  readyAt: number;
}

interface FeedingPatch {
  x: number;
  y: number;
  food: number;
}

export class FlagellarDriftWorld extends LivingWorld {
  readonly swimmers: Swimmer[] = [];
  readonly food: FeedingPatch[] = [];
  readonly hatches: { x: number; y: number; time: number; mixed: boolean }[] = [];
  pairings = 0;
  mixedPairings = 0;
  mutations = 0;
  generation = 0;
  deaths = 0;
  private nextId = 0;
  private nextMate = 0;

  constructor(seed: number) {
    super(seed);
    for (let i = 0; i < 12; i++) {
      this.food.push({
        x: 112 + (i % 4) * 315 + this.random.range(-40, 40),
        y: 145 + Math.floor(i / 4) * 214 + this.random.range(-32, 32),
        food: 0.86,
      });
    }
    for (let i = 0; i < 54; i++) {
      const patch = this.food[i % this.food.length];
      this.spawn(
        patch.x + this.random.range(-82, 82),
        patch.y + this.random.range(-57, 57),
        (i % 3) as Propulsor,
        this.random.range(0.75, 1.26),
        this.random.range(6, 34),
        0,
      );
    }
  }

  private spawn(
    x: number,
    y: number,
    propulsion: Propulsor,
    drive: number,
    age: number,
    generation: number,
  ): void {
    this.swimmers.push({
      id: ++this.nextId,
      x,
      y,
      propulsion,
      drive,
      age,
      generation,
      lifespan: this.random.range(85, 139),
      heading: this.random.range(0, TAU),
      phase: this.random.range(0, TAU),
      energy: age > 0 ? this.random.range(0.82, 1.18) : 0.76,
      readyAt: this.time + 5,
    });
  }

  influence(kind: string, x: number, y: number, dx: number, dy: number): void {
    if (!this.field(kind, x, y, ['food', 'eddy'], dx, dy)) return;
    if (kind !== 'food') return;
    const patch = this.food.find((food) => Math.hypot(food.x - x, food.y - y) < 85);
    if (patch) patch.food = Math.min(1.5, patch.food + 0.4);
    else if (this.food.length < 22) this.food.push({ x, y, food: 0.9 });
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    for (const patch of this.food) patch.food = Math.min(1.05, patch.food + dt * 0.032);
    for (let i = this.swimmers.length - 1; i >= 0; i--) {
      const swimmer = this.swimmers[i];
      this.swim(swimmer, dt);
      swimmer.age += dt;
      if (swimmer.energy > 0 && swimmer.age < swimmer.lifespan) continue;
      this.swimmers.splice(i, 1);
      this.deaths++;
    }
    if (this.time >= this.nextMate) {
      this.nextMate = this.time + 0.36;
      this.mate();
    }
    while (this.hatches.length && this.hatches[0].time < this.time - 3.2) this.hatches.shift();
    this.sample(this.swimmers.length, this.generation);
  }

  private swim(swimmer: Swimmer, dt: number): void {
    const { propulsion, drive, x, y } = swimmer;
    let attraction = 0;
    let target: FeedingPatch | undefined;
    let range = Infinity;
    for (const patch of this.food) {
      const distance = Math.hypot(patch.x - x, patch.y - y);
      const score = (patch.food + 0.12) / (75 + distance);
      if (score <= attraction) continue;
      attraction = score;
      target = patch;
      range = distance;
    }
    const turning = [1.35, 2.5, 1.75][propulsion];
    const speed = [57, 40, 49][propulsion] * drive;
    const ownBeat = [11.1, 14.2, 8.2][propulsion];
    swimmer.phase = (swimmer.phase + ownBeat * drive * dt) % TAU;
    swimmer.heading += Math.sin(swimmer.id * 2.37 + this.time * 0.64) * 1.14 * dt;
    if (target && range > 11) {
      // Small offsets prevent all swimmers from occupying the same feeding point.
      const dx = target.x + Math.cos(swimmer.id * 2.4) * 40 - x;
      const dy = target.y + Math.sin(swimmer.id * 2.4) * 40 - y;
      const toward = Math.atan2(dy, dx) - swimmer.heading;
      swimmer.heading += Math.atan2(Math.sin(toward), Math.cos(toward)) * turning * dt;
    }
    let currentX = 24 * Math.sin(y * 0.014 + this.time * 0.21);
    let currentY = 18 * Math.sin(x * 0.009 - this.time * 0.23);
    for (const eddy of this.fields) {
      const dx = x - eddy.x;
      const dy = y - eddy.y;
      const distance = Math.hypot(dx, dy);
      const strength =
        (clamp(1 - distance / 158) * clamp(eddy.life / 3) * 138) / Math.max(33, distance);
      if (eddy.kind !== 'eddy') continue;
      currentX -= dy * strength;
      currentY += dx * strength;
    }
    const drift = [1, 0.78, 0.48][propulsion];
    const stroke = 0.78 + Math.sin(swimmer.phase) * (propulsion === 2 ? 0.09 : 0.22);
    const cruise = speed * stroke * (range < 64 ? 0.56 : 1);
    swimmer.x = clamp(
      x + (Math.cos(swimmer.heading) * cruise + currentX * drift) * dt,
      32,
      this.width - 32,
    );
    swimmer.y = clamp(
      y + (Math.sin(swimmer.heading) * cruise + currentY * drift) * dt,
      43,
      this.height - 41,
    );
    swimmer.energy -= dt * ([0.014, 0.012, 0.018][propulsion] + drive * 0.003);
    if (target && range < 80) {
      const bite = Math.min(target.food, dt * 0.032 * (1 - range / 112));
      target.food -= bite;
      swimmer.energy = Math.min(1.42, swimmer.energy + bite * 3.45);
    }
  }

  private mate(): void {
    const eligible = this.swimmers.filter(
      (swimmer) => swimmer.age >= 9 && swimmer.energy >= 0.94 && swimmer.readyAt <= this.time,
    );
    if (eligible.length < 2 || this.swimmers.length >= MAX_SWIMMERS) return;
    const first = eligible[this.random.integer(0, eligible.length)];
    const partners = eligible.filter(
      (partner) => partner !== first && Math.hypot(first.x - partner.x, first.y - partner.y) < 56,
    );
    if (partners.length === 0) return;
    const second = partners[this.random.integer(0, partners.length)];
    const mixed = first.propulsion !== second.propulsion;
    let propulsion = this.random.next() < 0.5 ? first.propulsion : second.propulsion;
    if (this.random.next() < 0.065) {
      propulsion = ((propulsion + this.random.integer(1, 3)) % 3) as Propulsor;
      this.mutations++;
    }
    const x = (first.x + second.x) / 2;
    const y = (first.y + second.y) / 2;
    const generation = Math.max(first.generation, second.generation) + 1;
    this.spawn(
      x,
      y,
      propulsion,
      clamp((first.drive + second.drive) / 2 + this.random.range(-0.115, 0.115), 0.6, 1.5),
      0,
      generation,
    );
    for (const parent of [first, second]) {
      parent.energy -= 0.26;
      parent.readyAt = this.time + 10;
    }
    this.generation = Math.max(generation, this.generation);
    this.pairings++;
    if (mixed) this.mixedPairings++;
    this.hatches.push({ x, y, time: this.time, mixed });
    this.cue('flagellar-mating', mixed ? 0.6 : 0.37);
  }

  metrics(): readonly WorldMetric[] {
    const counts = PROPULSORS.map(
      (_, kind) => this.swimmers.filter((item) => item.propulsion === kind).length,
    );
    return [
      {
        label: 'SWIMMERS',
        value: String(this.swimmers.length),
        note: 'Competing for food in the same drifting world',
        tone: 'mint',
      },
      {
        label: 'WHIP / TWIN / HELIX',
        value: counts.join(' / '),
        note: 'Counts by inherited propulsion form',
        tone: 'blue',
      },
      {
        label: 'DEEPEST GENERATION',
        value: String(this.generation),
        note: 'Beat drive varies through inheritance and mutation',
        tone: 'gold',
      },
      {
        label: 'PAIRINGS',
        value: String(this.pairings),
        note: 'Mixed forms: ' + this.mixedPairings + ' · Propulsor mutations: ' + this.mutations,
        tone: 'coral',
      },
    ];
  }
}
