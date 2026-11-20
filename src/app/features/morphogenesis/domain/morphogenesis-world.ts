import { LivingWorld, clamp } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';
export const TISSUE_COLS = 40,
  TISSUE_ROWS = 24;
export interface TissueCell {
  x: number;
  y: number;
  fate: number;
  commitment: number;
  energy: number;
  age: number;
  size: number;
}
/** Diffusing antagonistic morphogens bias slowly committing, dividing progenitors. */
export class MorphogenesisWorld extends LivingWorld {
  readonly activator = new Float64Array(TISSUE_COLS * TISSUE_ROWS);
  readonly inhibitor = new Float64Array(TISSUE_COLS * TISSUE_ROWS);
  readonly cells: TissueCell[] = [];
  divisions = 0;
  differentiations = 0;
  private chemistry = 0;
  private turnover = 0;
  constructor(seed = 20261126) {
    super(seed);
    for (let y = 0; y < TISSUE_ROWS; y++)
      for (let x = 0; x < TISSUE_COLS; x++) {
        const i = y * TISSUE_COLS + x;
        this.activator[i] = 0.6 * Math.exp(-((x - 11) ** 2 + (y - 10) ** 2) / 75);
        this.inhibitor[i] = 0.6 * Math.exp(-((x - 29) ** 2 + (y - 14) ** 2) / 75);
      }
    for (let i = 0; i < 170; i++) {
      const a = this.random.range(0, Math.PI * 2),
        r = Math.sqrt(this.random.next());
      this.cells.push({
        x: 600 + Math.cos(a) * r * 310,
        y: 360 + Math.sin(a) * r * 220,
        fate: 0,
        commitment: 0,
        energy: this.random.range(0.4, 1),
        age: this.random.range(0, 20),
        size: this.random.range(6, 10),
      });
    }
    this.sample(this.cells.length, 0);
  }
  index(x: number, y: number): number {
    return (
      Math.floor(clamp(y / 30, 0, TISSUE_ROWS - 1)) * TISSUE_COLS +
      Math.floor(clamp(x / 30, 0, TISSUE_COLS - 1))
    );
  }
  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (this.field(kind, x, y, ['growth', 'inhibit', 'renew'], dx, dy))
      this.cue(kind === 'renew' ? 'division' : kind === 'growth' ? 'growth' : 'hush');
  }
  private diffuse(dt: number): void {
    const a = this.activator.slice(),
      b = this.inhibitor.slice();
    for (let y = 0; y < TISSUE_ROWS; y++)
      for (let x = 0; x < TISSUE_COLS; x++) {
        const i = y * TISSUE_COLS + x,
          ids = [
            y * TISSUE_COLS + Math.max(0, x - 1),
            y * TISSUE_COLS + Math.min(TISSUE_COLS - 1, x + 1),
            Math.max(0, y - 1) * TISSUE_COLS + x,
            Math.min(TISSUE_ROWS - 1, y + 1) * TISSUE_COLS + x,
          ];
        const lap = (v: Float64Array) => ids.reduce((sum, j) => sum + v[j], 0) / 4 - v[i];
        const px = x * 30 + 15,
          py = y * 30 + 15;
        const sourceA = 0.025 * Math.exp(-((x - 10) ** 2 + (y - 10) ** 2) / 28),
          sourceB = 0.025 * Math.exp(-((x - 30) ** 2 + (y - 14) ** 2) / 28);
        this.activator[i] = clamp(
          a[i] +
            dt * (lap(a) * 1.6 - a[i] * 0.025 + sourceA + this.fieldAt('growth', px, py) * 0.45),
          0,
          2,
        );
        this.inhibitor[i] = clamp(
          b[i] +
            dt * (lap(b) * 2.8 - b[i] * 0.025 + sourceB + this.fieldAt('inhibit', px, py) * 0.45),
          0,
          2,
        );
      }
    for (const cell of this.cells) {
      const i = this.index(cell.x, cell.y);
      if (cell.fate === 1) this.activator[i] = clamp(this.activator[i] + dt * 0.003, 0, 2);
      if (cell.fate === 2) this.inhibitor[i] = clamp(this.inhibitor[i] + dt * 0.003, 0, 2);
    }
  }
  step(dt: number): void {
    if (!this.advance(dt)) return;
    this.chemistry += dt;
    this.turnover += dt;
    if (this.chemistry >= 0.1) {
      this.diffuse(this.chemistry);
      this.chemistry = 0;
    }
    const moves = this.cells.map(() => ({ x: 0, y: 0, density: 0 }));
    for (let i = 0; i < this.cells.length; i++)
      for (let j = i + 1; j < this.cells.length; j++) {
        const a = this.cells[i],
          b = this.cells[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy) || 0.01;
        if (d > 40) continue;
        moves[i].density++;
        moves[j].density++;
        const force = d < a.size + b.size + 3 ? -(a.size + b.size + 3 - d) * 1.8 : (d - 23) * 0.09;
        moves[i].x += (dx / d) * force;
        moves[i].y += (dy / d) * force;
        moves[j].x -= (dx / d) * force;
        moves[j].y -= (dy / d) * force;
      }
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i],
        m = moves[i],
        index = this.index(cell.x, cell.y);
      const signal = this.activator[index] - this.inhibitor[index];
      cell.x = clamp(cell.x + m.x * dt, 65, 1135);
      cell.y = clamp(cell.y + m.y * dt, 65, 655);
      cell.age += dt;
      cell.energy = clamp(
        cell.energy +
          dt * (0.012 + this.fieldAt('renew', cell.x, cell.y) * 0.04 - m.density * 0.001),
        0,
        1.6,
      );
      if (cell.fate === 0) {
        cell.commitment = clamp(cell.commitment + dt * (Math.abs(signal) > 0.07 ? 0.028 : -0.016));
        if (cell.commitment >= 1) {
          cell.fate = signal > 0 ? 1 : 2;
          this.differentiations++;
          this.cue('shimmer', 0.3);
        }
      }
    }
    if (this.turnover >= 1) {
      this.turnover -= 1;
      const babies: TissueCell[] = [];
      const before = this.cells.length;
      for (let i = this.cells.length - 1; i >= 0; i--) {
        const cell = this.cells[i];
        if (cell.age > 220 || cell.energy <= 0) {
          this.cells.splice(i, 1);
          continue;
        }
        if (
          cell.energy > 0.9 &&
          moves[i].density < 10 &&
          this.cells.length + babies.length < 430 &&
          this.random.next() < 0.045
        ) {
          cell.energy *= 0.58;
          const a = this.random.range(0, Math.PI * 2);
          babies.push({
            ...cell,
            x: clamp(cell.x + Math.cos(a) * 18, 65, 1135),
            y: clamp(cell.y + Math.sin(a) * 18, 65, 655),
            age: 0,
            commitment: cell.fate ? 1 : 0,
            size: this.random.range(6, 10),
          });
          this.divisions++;
        }
      }
      if (this.cells.length < before) this.cue('apoptosis', 0.33);
      this.cells.push(...babies);
      if (babies.length) this.cue('division', 0.3);
    }
    this.sample(this.cells.length, this.cells.filter((c) => c.fate > 0).length);
  }
  metrics(): readonly WorldMetric[] {
    return [
      { label: 'CELLS', value: String(this.cells.length), note: 'living tissue', tone: 'mint' },
      {
        label: 'PROGENITORS',
        value: String(this.cells.filter((c) => c.fate === 0).length),
        note: 'uncommitted cells',
        tone: 'gold',
      },
      {
        label: 'DIFFERENTIATED',
        value: String(this.cells.filter((c) => c.fate > 0).length),
        note: 'stable cell identities',
        tone: 'blue',
      },
      {
        label: 'DIVISIONS',
        value: String(this.divisions),
        note: 'density-limited growth',
        tone: 'coral',
      },
    ];
  }
}
