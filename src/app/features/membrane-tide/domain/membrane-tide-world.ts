import { clamp, LivingWorld } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

const SPACING = 15;
const MIN_LOOP = 11;
const MAX_RIBBON = 25;
const TAU = Math.PI * 2;
const DROP_TIME = 0.36;
const WAVE_SPEED = 155;
const WAVE_LIFETIME = 1.9;

interface Point {
  x: number;
  y: number;
}

interface Patch extends Point {
  id: number;
}

interface Ribbon {
  patches: Patch[];
  closed: boolean;
  joinAfter: number;
  sealedAt: number;
}

interface Vortex extends Point {
  life: number;
  spin: number;
  driftX: number;
  driftY: number;
}

interface Pebble extends Point {
  age: number;
}

function gap(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function side(a: Point, b: Point, p: Point): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

export class MembraneTideWorld extends LivingWorld {
  readonly ribbons: Ribbon[] = [];
  readonly vortices: Vortex[] = [];
  readonly pebbles: Pebble[] = [];
  readonly lipids: number;
  seals = 0;
  ruptures = 0;
  joins = 0;
  impacts = 0;
  private nextPatch = 0;
  private nextBondCheck = 0;

  constructor(seed: number) {
    super(seed);
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 7; column++) {
        const x = 105 + column * 165 + this.random.range(-47, 47);
        const y = 112 + row * 164 + this.random.range(-47, 47);
        const count =
          this.random.next() < 0.48 ? this.random.integer(11, 18) : this.random.integer(1, 8);
        const bend = this.random.range(0.17, 0.35);
        const heading = this.random.range(0, TAU);
        const radius = SPACING / (2 * Math.sin(bend / 2));
        const patches = Array.from({ length: count }, (_, index) => {
          const angle = heading + (index - (count - 1) / 2) * bend;
          return {
            id: ++this.nextPatch,
            x: x + Math.cos(angle) * radius,
            y: y + Math.sin(angle) * radius,
          };
        });
        this.ribbons.push({ patches, closed: false, joinAfter: 0.65, sealedAt: -1 });
      }
    }
    this.lipids = this.nextPatch;
  }

  influence(kind: string, x: number, y: number, dx: number, dy: number): void {
    if (
      ![x, y, dx, dy].every(Number.isFinite) ||
      x < 0 ||
      x > this.width ||
      y < 0 ||
      y > this.height
    )
      return;
    if (kind === 'pebble') {
      if (this.pebbles.length >= 8) return;
      this.pebbles.push({ x, y, age: 0 });
    }
    if (kind === 'swirl') {
      const length = Math.hypot(dx, dy);
      const drift = length > 0 ? 40 / length : 0;
      const previous = this.vortices.at(-1);
      if (previous && gap(previous, { x, y }) < 34) this.vortices.pop();
      this.vortices.push({
        x,
        y,
        life: 5,
        spin: x < this.width / 2 ? -1 : 1,
        driftX: clamp(dx * drift, -40, 40),
        driftY: clamp(dy * drift, -40, 40),
      });
      if (this.vortices.length > 8) this.vortices.shift();
    }
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    for (let index = this.vortices.length - 1; index >= 0; index--) {
      this.vortices[index].life -= dt;
      if (this.vortices[index].life <= 0) this.vortices.splice(index, 1);
    }
    for (let index = this.pebbles.length - 1; index >= 0; index--) {
      const pebble = this.pebbles[index];
      if (pebble.age < DROP_TIME && pebble.age + dt >= DROP_TIME) {
        this.impacts++;
        this.cue('pebble-impact', 0.8);
      }
      pebble.age += dt;
      if (pebble.age > DROP_TIME + WAVE_LIFETIME) this.pebbles.splice(index, 1);
    }

    for (const ribbon of this.ribbons) {
      for (const patch of ribbon.patches) this.advect(patch, dt);
      this.relax(ribbon, dt);
    }
    if (this.time >= this.nextBondCheck) {
      this.nextBondCheck = this.time + 0.09;
      this.updateBonds();
    }
    this.sample(this.ribbons.filter((ribbon) => ribbon.closed).length, this.ribbons.length);
  }

  waveRadius(pebble: Pebble): number {
    return Math.max(0, pebble.age - DROP_TIME) * WAVE_SPEED;
  }

  private waveAt(pebble: Pebble, point: Point): number {
    if (pebble.age < DROP_TIME) return 0;
    const radius = this.waveRadius(pebble);
    const front = Math.abs(gap(pebble, point) - radius);
    return clamp(1 - front / 29) * clamp(1 - radius / 300);
  }

  private advect(patch: Patch, dt: number): void {
    const { x, y, id } = patch;
    let vx = 21 * Math.sin(y * 0.012 + this.time * 0.14) + 5 * Math.cos(id * 0.77 + this.time);
    let vy = 17 * Math.cos(x * 0.009 - this.time * 0.17) + 5 * Math.sin(id * 1.4 - this.time);
    for (const vortex of this.vortices) {
      const dx = x - vortex.x;
      const dy = y - vortex.y;
      const distance = Math.hypot(dx, dy);
      const weight = Math.pow(clamp(1 - distance / 235), 1.2) * clamp(vortex.life / 1.5);
      const tangential = (185 * vortex.spin * weight) / Math.max(34, distance);
      vx += -dy * tangential + vortex.driftX * weight;
      vy += dx * tangential + vortex.driftY * weight;
    }
    for (const pebble of this.pebbles) {
      const weight = this.waveAt(pebble, patch);
      if (weight <= 0) continue;
      const scale = (270 * weight) / Math.max(18, gap(pebble, patch));
      vx += (x - pebble.x) * scale;
      vy += (y - pebble.y) * scale;
    }
    patch.x = clamp(x + (vx + (clamp(x, 65, this.width - 65) - x) * 1.9) * dt, 6, this.width - 6);
    patch.y = clamp(y + (vy + (clamp(y, 65, this.height - 65) - y) * 1.9) * dt, 6, this.height - 6);
  }

  private relax(ribbon: Ribbon, dt: number): void {
    const points = ribbon.patches;
    const count = points.length;
    const turn = ribbon.closed ? TAU / count : Math.min(TAU / (count + 1), 0.375);
    const bend = Math.tan(turn / 2) / 2;
    const flex = Math.min(0.35, 9 * dt);
    for (let i = ribbon.closed ? 0 : 1; i < (ribbon.closed ? count : count - 1); i++) {
      const previous = points[(i + count - 1) % count];
      const middle = points[i];
      const next = points[(i + 1) % count];
      const offsetX = ((previous.x + next.x) / 2 + (next.y - previous.y) * bend - middle.x) * flex;
      const offsetY = ((previous.y + next.y) / 2 - (next.x - previous.x) * bend - middle.y) * flex;
      middle.x += offsetX;
      middle.y += offsetY;
      previous.x -= offsetX / 2;
      previous.y -= offsetY / 2;
      next.x -= offsetX / 2;
      next.y -= offsetY / 2;
    }
    if (!ribbon.closed && count >= MIN_LOOP && this.aligned(points, points, 46)) {
      // Exposed ends draw together at short range, without prescribing a closed shape.
      const a = points[count - 1];
      const b = points[0];
      const distance = gap(a, b);
      const pull = (Math.max(0, distance - SPACING) / distance) * Math.min(0.4, 5 * dt);
      const dx = (b.x - a.x) * pull;
      const dy = (b.y - a.y) * pull;
      a.x += dx;
      a.y += dy;
      b.x -= dx;
      b.y -= dy;
    }
    const stiffness = Math.min(0.45, 24 * dt);
    for (let i = 0; i < (ribbon.closed ? count : count - 1); i++) {
      const a = points[i];
      const b = points[(i + 1) % count];
      const distance = gap(a, b);
      if (distance < 0.001) continue;
      const correction = ((distance - SPACING) / distance) * stiffness;
      const dx = (b.x - a.x) * correction;
      const dy = (b.y - a.y) * correction;
      a.x += dx;
      a.y += dy;
      b.x -= dx;
      b.y -= dy;
    }
  }

  private updateBonds(): void {
    for (const ribbon of this.ribbons.slice()) {
      const { patches, closed } = ribbon;
      for (let i = 0; i < (closed ? patches.length : patches.length - 1); i++) {
        const a = patches[i];
        const b = patches[(i + 1) % patches.length];
        const shock = this.pebbles.some(
          (pebble) =>
            Math.max(this.waveAt(pebble, a), this.waveAt(pebble, b)) > 0.64 &&
            (Math.abs(this.waveAt(pebble, a) - this.waveAt(pebble, b)) > 0.24 ||
              gap(pebble, a) < 31),
        );
        if (gap(a, b) > 29 || shock) {
          this.rupture(ribbon, i + 1);
          break;
        }
      }
      if (ribbon.closed || ribbon.joinAfter > this.time || patches.length < MIN_LOOP) continue;
      if (!this.aligned(patches, patches, 24)) continue;
      // A nearby pair of ends can close only once the path has wrapped around an interior.
      let area = 0;
      for (let i = 0; i < patches.length; i++) {
        const a = patches[i];
        const b = patches[(i + 1) % patches.length];
        area += a.x * b.y - a.y * b.x;
      }
      if (area < patches.length * 140 || !this.simpleLoop(patches)) continue;
      ribbon.closed = true;
      ribbon.sealedAt = this.time;
      this.seals++;
      this.cue('membrane-seal', 0.58);
    }
    for (let i = 0; i < this.ribbons.length; i++) {
      const first = this.ribbons[i];
      if (first.closed || first.joinAfter > this.time) continue;
      for (let j = i + 1; j < this.ribbons.length; j++) {
        const second = this.ribbons[j];
        if (
          second.closed ||
          second.joinAfter > this.time ||
          first.patches.length + second.patches.length > MAX_RIBBON
        )
          continue;
        const direct = this.aligned(first.patches, second.patches);
        if (!direct && !this.aligned(second.patches, first.patches)) continue;
        first.patches = direct
          ? first.patches.concat(second.patches)
          : second.patches.concat(first.patches);
        first.joinAfter = this.time + 0.25;
        this.ribbons.splice(j, 1);
        this.joins++;
        break;
      }
    }
  }

  private simpleLoop(points: readonly Point[]): boolean {
    const count = points.length;
    for (let i = 0; i < count - 2; i++) {
      const last = i === 0 ? count - 1 : count;
      for (let j = i + 2; j < last; j++) {
        if (crosses(points[i], points[i + 1], points[j], points[(j + 1) % count])) return false;
      }
    }
    return true;
  }

  private aligned(first: readonly Point[], second: readonly Point[], reach = 25): boolean {
    const a = first[first.length - 1];
    const b = second[0];
    const distance = gap(a, b);
    if (distance > reach || distance < 1) return false;
    const before = first[first.length - 2];
    const after = second[1];
    const directionX = (b.x - a.x) / distance;
    const directionY = (b.y - a.y) / distance;
    const alignment = (from: Point, to: Point): number =>
      ((to.x - from.x) * directionX + (to.y - from.y) * directionY) / Math.max(1, gap(from, to));
    return (!before || alignment(before, a) > 0.26) && (!after || alignment(b, after) > 0.26);
  }

  private rupture(ribbon: Ribbon, cut: number): void {
    if (ribbon.joinAfter > this.time) return;
    const trailing = ribbon.patches.splice(cut);
    if (ribbon.closed) {
      ribbon.patches = trailing.concat(ribbon.patches);
      ribbon.closed = false;
      this.ruptures++;
      this.cue('membrane-rupture', 0.6);
    } else if (trailing.length) {
      this.ribbons.push({
        patches: trailing,
        closed: false,
        joinAfter: this.time + 0.9,
        sealedAt: -1,
      });
    }
    ribbon.joinAfter = this.time + 0.9;
  }

  metrics(): readonly WorldMetric[] {
    const sealed = this.ribbons.filter((ribbon) => ribbon.closed).length;
    return [
      {
        label: 'SEALED VESICLES',
        value: String(sealed),
        note: 'Closed bilayers currently enclosing fluid',
        tone: 'mint',
      },
      {
        label: 'MEMBRANE RUPTURES',
        value: String(this.ruptures),
        note: 'Closed membranes opened by stress',
        tone: 'coral',
      },
      {
        label: 'OPEN ASSEMBLIES',
        value: String(this.ribbons.length - sealed),
        note: 'Loose patches and open ribbons',
        tone: 'blue',
      },
      {
        label: 'VESICLE CLOSURES',
        value: String(this.seals),
        note: 'Ribbon joins: ' + this.joins + ' · Pebble impacts: ' + this.impacts,
        tone: 'gold',
      },
    ];
  }
}
