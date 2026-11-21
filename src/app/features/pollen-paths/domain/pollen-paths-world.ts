import { clamp, LivingWorld } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

interface Bloom {
  x: number;
  y: number;
  shape: number;
  pigment: number;
  age: number;
  lifespan: number;
  generation: number;
  seeds: number;
}

interface Pollinator {
  x: number;
  y: number;
  heading: number;
  target: Bloom | undefined;
  last: Bloom | undefined;
  pollen: [Bloom | undefined, Bloom | undefined];
}

export class PollenPathsWorld extends LivingWorld {
  readonly flowers: Bloom[] = [];
  readonly pollinators: Pollinator[] = [];
  readonly deliveries: { from: Bloom; to: Bloom; time: number }[] = [];
  visits = 0;
  transfers = 0;
  crossTransfers = 0;
  generations = 0;

  constructor(seed: number) {
    super(seed);
    for (let i = 0; i < 105; i++) {
      const shape = this.random.range(0.08, 0.26) + (i % 2) * 0.62;
      this.plant(
        this.random.range(50, 1150),
        this.random.range(80, 660),
        shape,
        this.random.range(-9, 9),
        this.random.range(10, 65),
        0,
      );
    }
    for (let i = 0; i < 18; i++) {
      this.pollinators.push({
        x: this.random.range(60, 1140),
        y: this.random.range(80, 650),
        heading: this.random.range(0, 2 * Math.PI),
        target: undefined,
        last: undefined,
        pollen: [undefined, undefined],
      });
    }
  }

  private plant(
    x: number,
    y: number,
    shape: number,
    pigment: number,
    age: number,
    generation: number,
  ): void {
    this.flowers.push({
      x,
      y,
      shape,
      pigment,
      age,
      generation,
      seeds: 0,
      lifespan: this.random.range(95, 155),
    });
  }

  flowering(flower: Bloom): boolean {
    return flower.age >= 20 && flower.seeds < 3;
  }

  influence(kind: string, x: number, y: number, dx: number, dy: number): void {
    if (this.field(kind, x, y, ['sunlight', 'rain'], dx, dy))
      this.cue(kind === 'rain' ? 'rain' : 'shimmer', 0.55, x);
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const flower = this.flowers[i];
      const sun = Math.min(1, this.fieldAt('sunlight', flower.x, flower.y));
      flower.age += dt * (1 + sun * 2);
      if (flower.age > flower.lifespan) this.flowers.splice(i, 1);
    }
    for (const visitor of this.pollinators) this.forage(visitor, dt);
    while (this.deliveries.length && this.deliveries[0].time < this.time - 7)
      this.deliveries.shift();
    this.sample(this.flowers.length, this.crossTransfers);
  }

  private forage(visitor: Pollinator, dt: number): void {
    if (
      !visitor.target ||
      !this.flowers.includes(visitor.target) ||
      !this.flowering(visitor.target)
    ) {
      let best = Infinity;
      visitor.target = undefined;
      for (const flower of this.flowers) {
        if (flower === visitor.last || !this.flowering(flower)) continue;
        const distance = Math.hypot(visitor.x - flower.x, visitor.y - flower.y);
        const sun = Math.min(1, this.fieldAt('sunlight', flower.x, flower.y));
        const score = (distance + this.random.range(0, 170)) / (1 + sun);
        if (score < best) {
          best = score;
          visitor.target = flower;
        }
      }
    }
    const flower = visitor.target;
    if (!flower) return;
    const distance = Math.hypot(flower.x - visitor.x, flower.y - visitor.y);
    visitor.heading = Math.atan2(flower.y - visitor.y, flower.x - visitor.x);
    const travel = Math.min(distance, 46 * dt);
    visitor.x += Math.cos(visitor.heading) * travel;
    visitor.y += Math.sin(visitor.heading) * travel;
    if (distance > 5) return;
    visitor.target = undefined;
    visitor.last = flower;
    this.visits++;
    // Geometry determines the contact surface. Visitor posture sometimes shifts that contact.
    const surface = flower.shape + this.random.range(-0.34, 0.34) < 0.5 ? 0 : 1;
    const donor = visitor.pollen[surface];
    visitor.pollen[surface] = flower;
    if (!donor || donor === flower) {
      this.cue('tack', 0.2, flower.x);
      return;
    }
    this.transfers++;
    const crossed = donor.shape < 0.5 !== flower.shape < 0.5;
    this.cue(crossed ? 'cross-pollen' : 'seed-delivery', crossed ? 0.51 : 0.43, flower.x);
    if (crossed) this.crossTransfers++;
    this.deliveries.push({ from: donor, to: flower, time: this.time });
    if (this.deliveries.length > 36) this.deliveries.shift();
    const rain = Math.min(1, this.fieldAt('rain', flower.x, flower.y));
    if (this.flowers.length >= 180 || this.random.next() >= 0.55 + rain * 0.35) return;
    flower.seeds++;
    const generation = Math.max(flower.generation, donor.generation) + 1;
    this.generations = Math.max(this.generations, generation);
    const angle = this.random.range(0, 2 * Math.PI);
    const spread = this.random.range(16, 125);
    this.plant(
      clamp(flower.x + Math.cos(angle) * spread, 22, this.width - 22),
      clamp(flower.y + Math.sin(angle) * spread, 40, this.height - 36),
      clamp((flower.shape + donor.shape) / 2 + this.random.range(-0.022, 0.022)),
      clamp((flower.pigment + donor.pigment) / 2 + this.random.range(-3, 3), -22, 22),
      0,
      generation,
    );
    this.cue('seed-set', 0.38 + rain * 0.23, flower.x);
  }

  metrics(): readonly WorldMetric[] {
    const share = this.transfers ? Math.round((this.crossTransfers * 100) / this.transfers) : 0;
    return [
      {
        label: 'FLOWER FORMS',
        value: String(this.flowers.length),
        note: 'Living plants across all generations',
        tone: 'mint',
      },
      {
        label: 'CROSS-FORM POLLEN',
        value: share + '%',
        note: 'Share of pollen deliveries crossing the shape midpoint',
        tone: 'coral',
      },
      {
        label: 'POLLEN DELIVERIES',
        value: String(this.transfers),
        note: this.visits + ' pollinator visits',
        tone: 'gold',
      },
      {
        label: 'DEEPEST GENERATION',
        value: String(this.generations),
        note: 'Offspring inherit shape and pigment from both parents',
        tone: 'blue',
      },
    ];
  }
}
