import { LivingWorld, clamp } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';
export interface Island {
  x: number;
  y: number;
  radius: number;
  optimum: number;
  food: number;
}
export interface IslandOrganism {
  id: number;
  island: number;
  x: number;
  y: number;
  trait: number;
  energy: number;
  age: number;
  generation: number;
  lineage: number;
}
/** Isolation, mutation, local selection, carrying capacity and occasional dispersal. */
export class IslandEvolutionWorld extends LivingWorld {
  readonly islands: Island[] = [
    { x: 280, y: 235, radius: 140, optimum: 0.15, food: 1 },
    { x: 860, y: 200, radius: 125, optimum: 0.85, food: 1 },
    { x: 605, y: 500, radius: 145, optimum: 0.5, food: 1 },
  ];
  readonly organisms: IslandOrganism[] = [];
  readonly passages: { from: number; to: number; life: number }[] = [];
  births = 0;
  migrations = 0;
  deaths = 0;
  private id = 0;
  private lifecycle = 0;
  constructor(seed = 20261128) {
    super(seed);
    for (let island = 0; island < 3; island++)
      for (let i = 0; i < 65; i++) this.spawn(island, this.random.range(0.42, 0.58), 1, i % 5);
    this.sample(this.organisms.length, this.divergence() * 100);
  }
  private spawn(island: number, trait: number, generation: number, lineage: number): void {
    const land = this.islands[island],
      a = this.random.range(0, Math.PI * 2),
      r = Math.sqrt(this.random.next()) * (land.radius - 18);
    this.organisms.push({
      id: ++this.id,
      island,
      x: land.x + Math.cos(a) * r,
      y: land.y + Math.sin(a) * r,
      trait,
      energy: this.random.range(0.6, 0.9),
      age: generation === 1 ? this.random.range(0, 35) : 0,
      generation,
      lineage,
    });
  }
  meanTrait(index: number): number {
    const population = this.organisms.filter((a) => a.island === index);
    return population.length ? population.reduce((s, a) => s + a.trait, 0) / population.length : 0;
  }
  divergence(): number {
    const means = this.islands.map((_, i) => this.meanTrait(i));
    return Math.max(...means) - Math.min(...means);
  }
  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (!this.field(kind, x, y, ['bridge', 'isolate', 'rain'], dx, dy)) return;
    const order = this.islands
      .map((a, i) => ({ i, d: Math.hypot(a.x - x, a.y - y) }))
      .sort((a, b) => a.d - b.d);
    if (kind === 'bridge') {
      const from = order[0].i,
        to = order[1].i;
      const existing = this.passages.find(
        (p) => (p.from === from && p.to === to) || (p.from === to && p.to === from),
      );
      if (existing) existing.life = 24;
      else this.passages.push({ from, to, life: 24 });
      this.cue('flow');
    }
    if (kind === 'isolate') {
      for (let i = this.passages.length - 1; i >= 0; i--)
        if (this.passages[i].from === order[0].i || this.passages[i].to === order[0].i)
          this.passages.splice(i, 1);
      this.cue('hush');
    }
    if (kind === 'rain') this.cue('rain');
  }
  step(dt: number): void {
    if (!this.advance(dt)) return;
    this.lifecycle += dt;
    for (let i = this.passages.length - 1; i >= 0; i--) {
      this.passages[i].life -= dt;
      const passage = this.passages[i];
      if (passage.life <= 0) {
        this.passages.splice(i, 1);
        this.cue('passage-close', 0.36, this.islands[passage.from].x, {
          toX: this.islands[passage.to].x,
        });
      }
    }
    const counts = this.islands.map((_, i) => this.organisms.filter((a) => a.island === i).length);
    for (let i = 0; i < this.islands.length; i++) {
      const land = this.islands[i];
      land.food = clamp(
        land.food +
          dt * (0.025 + this.fieldAt('rain', land.x, land.y) * 0.06 - counts[i] * 0.00022),
        0.05,
        1.2,
      );
    }
    for (const a of this.organisms) {
      const land = this.islands[a.island],
        fitness = Math.exp(-((a.trait - land.optimum) ** 2) * 12);
      a.energy = clamp(a.energy + dt * (land.food * (0.012 + fitness * 0.035) - 0.02), 0, 1.7);
      a.age += dt;
      const angle = a.id * 1.73 + this.time * (0.12 + a.trait * 0.05),
        r = (0.3 + ((a.id * 37) % 100) / 160) * (land.radius - 15);
      a.x += (land.x + Math.cos(angle) * r - a.x) * dt * 0.4;
      a.y += (land.y + Math.sin(angle) * r - a.y) * dt * 0.4;
    }
    if (this.lifecycle >= 1) {
      this.lifecycle -= 1;
      const babies: { island: number; trait: number; generation: number; lineage: number }[] = [];
      for (let i = this.organisms.length - 1; i >= 0; i--) {
        const a = this.organisms[i];
        if (a.energy <= 0 || a.age > 155) {
          this.organisms.splice(i, 1);
          this.deaths++;
          this.cue('hush', 0.27);
          continue;
        }
        if (
          a.energy > 1 &&
          a.age > 10 &&
          counts[a.island] < 135 &&
          this.organisms.length + babies.length < 405 &&
          this.random.next() < 0.12
        ) {
          a.energy *= 0.6;
          counts[a.island]++;
          babies.push({
            ...a,
            trait: clamp(a.trait + this.random.range(-0.085, 0.085)),
            generation: a.generation + 1,
          });
          this.births++;
        }
        const passage = this.passages.find((p) => p.from === a.island || p.to === a.island);
        if (passage && this.random.next() < 0.025) {
          const target = passage.from === a.island ? passage.to : passage.from;
          if (counts[target] >= 135) continue;
          const originX = this.islands[a.island].x;
          counts[a.island]--;
          a.island = target;
          counts[target]++;
          const land = this.islands[target];
          a.x = land.x;
          a.y = land.y;
          this.migrations++;
          this.cue('migration', 0.46, originX, { toX: land.x });
        }
      }
      for (const b of babies) this.spawn(b.island, b.trait, b.generation, b.lineage);
      if (babies.length) this.cue('division', 0.3);
    }
    this.sample(this.organisms.length, this.divergence() * 100);
  }
  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'POPULATION',
        value: String(this.organisms.length),
        note: 'three island habitats',
        tone: 'mint',
      },
      {
        label: 'DIVERGENCE',
        value: `${Math.round(this.divergence() * 100)}%`,
        note: 'range of mean adaptive traits',
        tone: 'blue',
      },
      {
        label: 'GENERATIONS',
        value: String(Math.max(1, ...this.organisms.map((a) => a.generation))),
        note: 'deepest living lineage',
        tone: 'gold',
      },
      {
        label: 'MIGRANTS',
        value: String(this.migrations),
        note: 'gene flow across passages',
        tone: 'coral',
      },
    ];
  }
}
