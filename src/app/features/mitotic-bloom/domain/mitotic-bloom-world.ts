import { clamp, LivingWorld } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

export const PHASES = [
  'Interphase',
  'Prophase',
  'Metaphase',
  'Anaphase',
  'Telophase',
  'Cytokinesis',
] as const;
export const GENOME_SIZE = 6;
export const DISH = { left: 41, right: 1159, top: 55, bottom: 669 };
export const OUTLINE_RAYS = Array.from({ length: 48 }, (_, index) => {
  const angle = (index * Math.PI) / 24;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});
const PHASE_START = [0, 0.57, 0.69, 0.78, 0.88, 0.94, 1] as const;
const MAX_CELLS = 94;
const DISH_AREA = (DISH.right - DISH.left) * (DISH.bottom - DISH.top);
const AREA_TO_DIVIDE = 9800;
const CONFLUENCE = 0.97;
const APOPTOSIS_SECONDS = 3.5;

interface Cell {
  id: number;
  x: number;
  y: number;
  cycle: number;
  duration: number;
  angle: number;
  generation: number;
  genome: readonly number[];
  radius: number;
  area: number;
  dyingAt: number | null;
  outline: number[];
  targetOutline: number[];
}

export function phaseAt(cycle: number): { index: number; progress: number } {
  let phase = 0;
  while (phase + 1 < PHASES.length && cycle >= PHASE_START[phase + 1]) phase++;
  return {
    index: phase,
    progress: clamp((cycle - PHASE_START[phase]) / (PHASE_START[phase + 1] - PHASE_START[phase])),
  };
}

export class MitoticBloomWorld extends LivingWorld {
  readonly cells: Cell[] = [];
  divisions = 0;
  retirements = 0;
  selectedId = 0;
  coverage = 0;
  private nextId = 0;
  private nextOutline = 0;
  private nextApoptosis: number | null = null;

  constructor(seed: number) {
    super(seed);
    for (let i = 0; i < 12; i++) {
      this.cells.push(
        this.cell(
          165 + (i % 4) * 290 + this.random.range(-38, 38),
          160 + Math.floor(i / 4) * 200 + this.random.range(-29, 29),
          i === 5 ? 0.64 : this.random.range(0.08, 0.53),
          0,
          Array.from({ length: GENOME_SIZE }, (_, j) => 169 + j * 26 + this.random.range(-7, 7)),
          39 + (i % 5) * 3,
        ),
      );
    }
    this.selectedId = this.cells[5].id;
    this.measureTissue();
  }

  private cell(
    x: number,
    y: number,
    cycle: number,
    generation: number,
    genome: readonly number[],
    radius: number,
  ): Cell {
    return {
      id: ++this.nextId,
      x: clamp(x, DISH.left + 19, DISH.right - 19),
      y: clamp(y, DISH.top + 19, DISH.bottom - 19),
      cycle,
      generation,
      genome,
      radius,
      area: 0,
      dyingAt: null,
      duration: this.random.range(26, 45),
      angle: this.random.range(0, 2 * Math.PI),
      outline: OUTLINE_RAYS.map(() => radius),
      targetOutline: OUTLINE_RAYS.map(() => radius),
    };
  }

  get selected(): Cell | undefined {
    return this.cells.find((cell) => cell.id === this.selectedId);
  }

  apoptosisProgress(cell: Cell): number {
    return cell.dyingAt === null ? 0 : clamp((this.time - cell.dyingAt) / APOPTOSIS_SECONDS);
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
    if (kind === 'focus') {
      let nearest = 84;
      let focused = false;
      for (const cell of this.cells) {
        const distance = Math.hypot(cell.x - x, cell.y - y);
        if (distance < nearest) {
          this.selectedId = cell.id;
          focused = true;
          nearest = distance;
        }
      }
      if (focused) this.cue('mitotic-phase', 0.54, x);
    } else if (this.field(kind, x, y, ['nutrients', 'shade'], dx, dy)) {
      this.cue(kind === 'nutrients' ? 'bubble' : 'hush', 0.53, x);
    }
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    this.advanceCells(dt);
    if (this.time >= this.nextOutline) {
      this.nextOutline = this.time + 0.22;
      this.measureTissue();
      this.tryApoptosis();
    }
    // The layout samples contacts periodically. The membrane interpolates between samples.
    const smoothing = 1 - Math.exp(-6 * dt);
    for (const cell of this.cells) {
      for (let i = 0; i < cell.outline.length; i++) {
        cell.outline[i] += (cell.targetOutline[i] - cell.outline[i]) * smoothing;
      }
    }
    this.sample(this.coverage * 100, this.cells.filter((cell) => cell.cycle >= 0.57).length);
  }

  private advanceCells(dt: number): void {
    let committed = this.cells.filter((cell) => cell.cycle >= 0.57).length;
    const motion = this.cells.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < this.cells.length; i++) {
      const a = this.cells[i];
      if (a.dyingAt !== null) continue;
      for (let j = i + 1; j < this.cells.length; j++) {
        const b = this.cells[j];
        if (b.dyingAt !== null) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const preferred = (a.radius + b.radius) * 0.6;
        if (Math.abs(dx) >= preferred || Math.abs(dy) >= preferred) continue;
        const distance = Math.hypot(dx, dy);
        const force = (Math.max(0, preferred - distance) * 0.4) / Math.max(1, distance);
        motion[i].x += dx * force;
        motion[i].y += dy * force;
        motion[j].x -= dx * force;
        motion[j].y -= dy * force;
      }
    }
    let phaseChange: Cell | undefined;
    this.cells.slice().forEach((cell, i) => {
      if (cell.dyingAt !== null) {
        if (this.apoptosisProgress(cell) >= 1) {
          this.cells.splice(this.cells.indexOf(cell), 1);
          this.retirements++;
          if (cell.id === this.selectedId) this.selectedId = this.cells[0]?.id ?? 0;
        }
        return;
      }
      const nutrients = clamp(this.fieldAt('nutrients', cell.x, cell.y));
      const shade = clamp(this.fieldAt('shade', cell.x, cell.y));
      const rate = 1 + 1.4 * nutrients - 0.6 * shade;
      cell.radius += (102 - cell.radius) * Math.min(1, dt * rate * 0.093);
      const dx = motion[i].x + Math.sin(cell.id + this.time * 0.18) * 1.4;
      const dy = motion[i].y + Math.cos(cell.id * 0.77 - this.time * 0.17) * 1.4;
      cell.x = clamp(cell.x + dx * dt, DISH.left + 19, DISH.right - 19);
      cell.y = clamp(cell.y + dy * dt, DISH.top + 19, DISH.bottom - 19);
      const before = phaseAt(cell.cycle).index;
      const next = Math.min(1, cell.cycle + (dt * rate) / cell.duration);
      if (before === 0 && next >= 0.57) {
        if (this.cells.length + committed >= MAX_CELLS || cell.area < AREA_TO_DIVIDE) {
          cell.cycle = Math.min(cell.cycle, 0.569);
          return;
        }
        committed++;
      }
      cell.cycle = next;
      const after = phaseAt(cell.cycle).index;
      if (after !== before && (!phaseChange || cell.id === this.selectedId)) phaseChange = cell;
      if (cell.cycle < 1) return;
      this.divide(cell);
      committed--;
    });
    if (phaseChange)
      this.cue('mitotic-phase', phaseChange.id === this.selectedId ? 0.55 : 0.3, phaseChange.x);
  }

  private divide(cell: Cell): void {
    const index = this.cells.indexOf(cell);
    const spacing = clamp(Math.sqrt(cell.area / Math.PI) * 0.5, 16, 33);
    const dx = Math.cos(cell.angle) * spacing;
    const dy = Math.sin(cell.angle) * spacing;
    const radius = Math.max(26, Math.sqrt(cell.area / (2 * Math.PI)));
    const first = this.cell(
      cell.x - dx,
      cell.y - dy,
      0,
      cell.generation + 1,
      [...cell.genome],
      radius,
    );
    const second = this.cell(
      cell.x + dx,
      cell.y + dy,
      0,
      cell.generation + 1,
      [...cell.genome],
      radius,
    );
    this.cells.splice(index, 1, first, second);
    if (cell.id === this.selectedId) this.selectedId = first.id;
    this.divisions++;
    this.cue('division', 0.58, cell.x);
  }

  private measureTissue(): void {
    let area = 0;
    for (const cell of this.cells) {
      const radius = cell.radius * (1 - this.apoptosisProgress(cell) * 0.93);
      const contacts = this.cells.flatMap((neighbor) => {
        if (neighbor === cell) return [];
        const x = neighbor.x - cell.x;
        const y = neighbor.y - cell.y;
        const distanceSquared = x * x + y * y;
        if (distanceSquared > 4 * radius * radius) return [];
        // Neighboring membranes meet at the midpoint. A shrinking neighbor
        // gradually releases this boundary, allowing its neighbors to spread.
        const release = this.apoptosisProgress(neighbor);
        return [{ x, y, limit: distanceSquared * (0.5 + release * 1.15) }];
      });
      for (let i = 0; i < OUTLINE_RAYS.length; i++) {
        const ray = OUTLINE_RAYS[i];
        const wallX =
          Math.abs(ray.x) < 0.00001
            ? Infinity
            : ((ray.x > 0 ? DISH.right : DISH.left) - cell.x) / ray.x;
        const wallY =
          Math.abs(ray.y) < 0.00001
            ? Infinity
            : ((ray.y > 0 ? DISH.bottom : DISH.top) - cell.y) / ray.y;
        let length = Math.min(radius, wallX, wallY);
        for (const contact of contacts) {
          const toward = ray.x * contact.x + ray.y * contact.y;
          if (toward > 0.00001) length = Math.min(length, contact.limit / toward);
        }
        cell.targetOutline[i] = Math.max(1, length);
      }
      cell.area =
        (cell.targetOutline.reduce(
          (sum, length, i) => sum + length * cell.targetOutline[(i + 1) % OUTLINE_RAYS.length],
          0,
        ) *
          Math.sin(Math.PI / 24)) /
        2;
      area += cell.area;
    }
    this.coverage = clamp(area / DISH_AREA);
  }

  private tryApoptosis(): void {
    if (this.coverage < CONFLUENCE) return;
    this.nextApoptosis ??= this.time + this.random.range(7, 15);
    if (this.time < this.nextApoptosis) return;
    const candidates = this.cells.filter(
      (cell) => cell.dyingAt === null && cell.cycle < 0.57 && cell.area < AREA_TO_DIVIDE,
    );
    if (!candidates.length) return;
    const cell = candidates[this.random.integer(0, candidates.length)];
    cell.dyingAt = this.time;
    this.nextApoptosis = this.time + this.random.range(12, 23);
    this.cue('apoptosis', 0.44);
  }

  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'FOCUSED PHASE',
        value: this.selected
          ? this.selected.dyingAt === null
            ? PHASES[phaseAt(this.selected.cycle).index]
            : 'Apoptosis'
          : '-',
        note: 'Select a cell to follow its cycle',
        tone: 'mint',
      },
      {
        label: 'TISSUE COVERAGE',
        value: Math.round(this.coverage * 100) + '%',
        note: 'Share of the culture surface occupied by cells',
        tone: 'blue',
      },
      {
        label: 'LIVING CELLS',
        value: String(this.cells.filter((cell) => cell.dyingAt === null).length),
        note: 'Neighboring cells reshape where they touch',
        tone: 'blue',
      },
      {
        label: 'COMPLETED DIVISIONS',
        value: String(this.divisions),
        note: 'Each daughter inherits one copy of every chromosome',
        tone: 'gold',
      },
      {
        label: 'IN DIVISION',
        value: String(this.cells.filter((cell) => cell.cycle >= 0.57).length),
        note: 'From prophase through cytokinesis',
        tone: 'coral',
      },
      {
        label: 'APOPTOSIS',
        value: String(this.retirements),
        note: 'Cells dismantled after the tissue reached confluence',
        tone: 'coral',
      },
    ];
  }
}
