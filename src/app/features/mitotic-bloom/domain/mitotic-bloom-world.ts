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
const PHASE_START = [0, 0.57, 0.69, 0.78, 0.88, 0.94, 1] as const;
const MAX_CELLS = 31;

interface Cell {
  id: number;
  x: number;
  y: number;
  cycle: number;
  duration: number;
  age: number;
  lifespan: number;
  angle: number;
  generation: number;
  genome: readonly number[];
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
  private nextId = 0;

  constructor(seed: number) {
    super(seed);
    for (let i = 0; i < 12; i++) {
      this.cells.push(
        this.cell(
          165 + (i % 4) * 290 + this.random.range(-38, 38),
          160 + Math.floor(i / 4) * 200 + this.random.range(-29, 29),
          i === 5 ? 0.64 : this.random.range(0.08, 0.66),
          0,
          Array.from({ length: GENOME_SIZE }, (_, j) => 169 + j * 26 + this.random.range(-7, 7)),
        ),
      );
    }
    this.selectedId = this.cells[5].id;
  }

  private cell(
    x: number,
    y: number,
    cycle: number,
    generation: number,
    genome: readonly number[],
  ): Cell {
    return {
      id: ++this.nextId,
      x,
      y,
      cycle,
      generation,
      genome,
      duration: this.random.range(22, 41),
      angle: this.random.range(0, 2 * Math.PI),
      age: 0,
      lifespan: this.random.range(67, 111),
    };
  }

  get selected(): Cell | undefined {
    return this.cells.find((cell) => cell.id === this.selectedId);
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
      for (const cell of this.cells) {
        const distance = Math.hypot(cell.x - x, cell.y - y);
        if (distance < nearest) {
          this.selectedId = cell.id;
          nearest = distance;
        }
      }
    } else this.field(kind, x, y, ['nutrients', 'shade'], dx, dy);
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    for (const cell of this.cells.slice()) {
      cell.age += dt;
      if (cell.age > cell.lifespan && cell.cycle < 0.57) {
        this.cells.splice(this.cells.indexOf(cell), 1);
        this.retirements++;
        if (cell.id === this.selectedId) this.selectedId = this.cells[0]?.id ?? 0;
        continue;
      }
      let vx = Math.sin(cell.id + this.time * 0.18) * 5;
      let vy = Math.cos(cell.id * 0.77 - this.time * 0.17) * 5;
      let neighbors = 0;
      for (const neighbor of this.cells) {
        if (neighbor === cell) continue;
        const dx = cell.x - neighbor.x;
        const dy = cell.y - neighbor.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 114) neighbors++;
        const repel = (Math.max(0, 99 - distance) * 0.65) / Math.max(1, distance);
        vx += dx * repel;
        vy += dy * repel;
      }
      cell.x = clamp(cell.x + vx * dt, 60, this.width - 60);
      cell.y = clamp(cell.y + vy * dt, 70, this.height - 65);
      const before = phaseAt(cell.cycle).index;
      const capacity = this.cells.length < MAX_CELLS;
      const occupied = this.cells.length + this.cells.filter((other) => other.cycle >= 0.57).length;
      if (cell.cycle >= 0.52 && cell.cycle < 0.57 && (occupied >= MAX_CELLS || neighbors >= 4))
        continue;
      const nutrients = clamp(this.fieldAt('nutrients', cell.x, cell.y));
      const shade = clamp(this.fieldAt('shade', cell.x, cell.y));
      cell.cycle = Math.min(
        1,
        cell.cycle + (dt * (1 + 1.4 * nutrients - 0.6 * shade)) / cell.duration,
      );
      const after = phaseAt(cell.cycle).index;
      if (after !== before && cell.id === this.selectedId) this.cue('mitotic-phase', 0.55);
      if (cell.cycle < 1 || !capacity) continue;
      const index = this.cells.indexOf(cell);
      const dx = Math.cos(cell.angle) * 28;
      const dy = Math.sin(cell.angle) * 28;
      const first = this.cell(cell.x - dx, cell.y - dy, 0, cell.generation + 1, [...cell.genome]);
      const second = this.cell(cell.x + dx, cell.y + dy, 0, cell.generation + 1, [...cell.genome]);
      this.cells.splice(index, 1, first, second);
      if (cell.id === this.selectedId) this.selectedId = first.id;
      this.divisions++;
      this.cue('division', 0.58);
    }
    this.sample(this.cells.length, this.cells.filter((cell) => cell.cycle >= 0.57).length);
  }

  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'FOCUSED PHASE',
        value: this.selected ? PHASES[phaseAt(this.selected.cycle).index] : '—',
        note: 'Interphase prepares DNA. The following stages separate the copies.',
        tone: 'mint',
      },
      {
        label: 'LIVING CELLS',
        value: String(this.cells.length),
        note: 'One mother becomes two daughters at cytokinesis',
        tone: 'blue',
      },
      {
        label: 'COMPLETED DIVISIONS',
        value: String(this.divisions),
        note: 'Daughters receive one copy of each chromosome',
        tone: 'gold',
      },
      {
        label: 'IN DIVISION',
        value: String(this.cells.filter((cell) => cell.cycle >= 0.57).length),
        note: 'Cells from prophase through cytokinesis',
        tone: 'coral',
      },
    ];
  }
}
