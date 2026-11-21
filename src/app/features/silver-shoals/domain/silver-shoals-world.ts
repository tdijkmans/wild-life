import { clamp, LivingWorld } from '../../../shared/simulation/living-world';
import type { InfluenceField } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

type Lineage = 'amber' | 'blue' | 'hybrid';

interface Swimmer {
  id: number;
  lineage: Lineage;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifespan: number;
  drive: number;
  readyAt: number;
}

interface Hatch {
  time: number;
  offspring: Swimmer;
  first: Swimmer;
  second: Swimmer;
}

export class SilverShoalsWorld extends LivingWorld {
  readonly fish: Swimmer[] = [];
  readonly hatches: Hatch[] = [];
  latestHybrid: Hatch | undefined;
  hybridBirths = 0;
  parentBirths = 0;
  private nextId = 0;
  private nextSpawningRound = 0;
  private readonly currents = new WeakMap<InfluenceField, { x: number; y: number }>();

  constructor(seed: number) {
    super(seed);
    for (let i = 0; i < 104; i++) {
      const blue = i % 2 === 1;
      this.spawn(
        blue ? 'blue' : 'amber',
        this.random.range(80, 490) + (blue ? 630 : 0),
        this.random.range(145, 570),
        this.random.range(10, 55),
        this.random.range(0.72, 1.28),
      );
    }
  }

  private spawn(lineage: Lineage, x: number, y: number, age: number, drive: number): Swimmer {
    const fish = {
      id: ++this.nextId,
      lineage,
      x,
      y,
      age,
      drive,
      vx: this.random.range(-24, 24),
      vy: this.random.range(-16, 16),
      lifespan: this.random.range(135, 230),
      readyAt: 0,
    };
    this.fish.push(fish);
    return fish;
  }

  influence(kind: string, x: number, y: number, dx: number, dy: number): void {
    if (!this.field(kind, x, y, ['current', 'shelter'], dx, dy)) return;
    this.cue(kind === 'current' ? 'flow' : 'hush', 0.56, x);
    if (kind === 'current') {
      const length = Math.hypot(dx, dy);
      this.currents.set(
        this.fields[this.fields.length - 1],
        length > 0 ? { x: dx / length, y: dy / length } : { x: x < 600 ? 1 : -1, y: 0 },
      );
    }
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const fish = this.fish[i];
      fish.age += dt;
      if (fish.age > fish.lifespan) {
        this.fish.splice(i, 1);
        this.cue('hush', 0.28, fish.x);
      }
    }
    while (this.hatches.length && this.hatches[0].time < this.time - 6) this.hatches.shift();

    const tide = Math.sin(this.time * 0.18);
    const schools = {
      amber: { x: 0, y: 0, n: 0 },
      blue: { x: 0, y: 0, n: 0 },
      hybrid: { x: 0, y: 0, n: 0 },
    };
    for (const fish of this.fish) {
      const school = schools[fish.lineage];
      school.x += fish.x;
      school.y += fish.y;
      school.n++;
    }
    for (const fish of this.fish) {
      const school = schools[fish.lineage];
      const inlet = fish.lineage === 'amber' ? 325 : fish.lineage === 'blue' ? 875 : 600;
      const targetX = inlet + (600 - inlet) * (0.58 + tide * 0.46);
      const targetY = 360 + Math.cos(this.time * 0.15 + (fish.id % 6)) * 110;
      let vx = (targetX - fish.x) * 0.19 + (school.x / school.n - fish.x) * 0.09;
      let vy = (targetY - fish.y) * 0.2 + (school.y / school.n - fish.y) * 0.07;
      for (const field of this.fields) {
        const distance = Math.hypot(fish.x - field.x, fish.y - field.y);
        const weight = Math.max(0, 1 - distance / field.radius) * Math.min(1, field.life / 4);
        const current = this.currents.get(field);
        if (current) {
          vx += current.x * 112 * weight;
          vy += current.y * 112 * weight;
        } else {
          vx += (field.x - fish.x) * weight * 0.7;
          vy += (field.y - fish.y) * weight * 0.7;
        }
      }
      const flutter = this.time * fish.drive + fish.id * 2.39;
      fish.vx += (clamp(vx + Math.cos(flutter) * 24, -112, 112) - fish.vx) * dt * fish.drive;
      fish.vy += (clamp(vy + Math.sin(flutter) * 23, -91, 91) - fish.vy) * dt * fish.drive;
      fish.x = clamp(fish.x + fish.vx * dt, 25, this.width - 25);
      fish.y = clamp(fish.y + fish.vy * dt, 75, this.height - 65);
    }
    if (this.time >= this.nextSpawningRound) {
      this.nextSpawningRound = this.time + 0.85;
      this.spawnLocally();
    }
    this.sample(this.fish.length, this.fish.filter((fish) => fish.lineage === 'hybrid').length);
  }

  private spawnLocally(): void {
    const ready = this.fish.filter(
      (fish) =>
        fish.lineage !== 'hybrid' &&
        fish.age > 16 &&
        fish.readyAt <= this.time &&
        (Math.abs(fish.x - 600) < 185 || this.fieldAt('shelter', fish.x, fish.y) > 0.2),
    );
    if (ready.length < 2 || this.fish.length >= 170) return;
    const first = ready[this.random.integer(0, ready.length)];
    const nearby = ready.filter(
      (fish) => fish !== first && Math.hypot(fish.x - first.x, fish.y - first.y) < 62,
    );
    if (!nearby.length) return;
    const second = nearby[this.random.integer(0, nearby.length)];
    first.readyAt = second.readyAt = this.time + 8;
    const lineage = first.lineage === second.lineage ? first.lineage : 'hybrid';
    const offspring = this.spawn(
      lineage,
      (first.x + second.x) / 2,
      (first.y + second.y) / 2,
      0,
      clamp((first.drive + second.drive) / 2 + this.random.range(-0.08, 0.08), 0.5, 1.6),
    );
    const hatch = { time: this.time, first, second, offspring };
    this.hatches.push(hatch);
    if (lineage === 'hybrid') {
      this.latestHybrid = hatch;
      this.hybridBirths++;
    } else {
      this.parentBirths++;
    }
    this.cue(
      lineage === 'hybrid' ? 'hybrid-hatch' : 'bubble',
      lineage === 'hybrid' ? 0.72 : 0.43,
      first.x,
      { toX: offspring.x, pitch: lineage === 'blue' ? 1.29 : 0.94 },
    );
  }

  metrics(): readonly WorldMetric[] {
    const live = this.fish.filter((fish) => fish.lineage === 'hybrid').length;
    const hatch = this.latestHybrid;
    return [
      {
        label: 'LIVING HYBRIDS',
        value: String(live),
        note: 'Silver offspring survive and swim alongside parent forms',
        tone: 'blue',
      },
      {
        label: 'HYBRID HATCHES',
        value: String(this.hybridBirths),
        note: hatch
          ? 'Latest lineage: #' +
            hatch.first.id +
            ' + #' +
            hatch.second.id +
            ' → #' +
            hatch.offspring.id
          : 'Waiting for a cross-lineage hatch',
        tone: 'mint',
      },
      {
        label: 'PARENT-FORM HATCHES',
        value: String(this.parentBirths),
        note: 'Offspring of two parents in the same lineage',
        tone: 'gold',
      },
      {
        label: 'HYBRID DESCENDANTS',
        value: '0',
        note: 'Hybrids reach maturity and are sterile in this model',
        tone: 'coral',
      },
    ];
  }
}
