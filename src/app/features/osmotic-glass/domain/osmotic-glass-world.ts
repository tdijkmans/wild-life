import { clamp, LivingWorld } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

export type MoleculeKind = 'water' | 'tracer' | 'solute';

interface Molecule {
  readonly kind: MoleculeKind;
  x: number;
  y: number;
}

export const CHAMBER = { left: 80, right: 1120, top: 104, bottom: 625, middle: 600 };

export class OsmoticGlassWorld extends LivingWorld {
  readonly molecules: Molecule[] = [];
  membrane = CHAMBER.middle;
  waterLeft = 190;
  waterRight = 190;
  waterToRight = 0;
  waterToLeft = 0;
  tracerCrossings = 0;
  private soluteLeft = 14;
  private soluteRight = 72;
  private nextChime = 0;

  constructor(seed: number) {
    super(seed);
    for (const right of [false, true]) {
      this.seedChamber('water', 190, right);
      this.seedChamber('tracer', right ? 12 : 65, right);
      this.seedChamber('solute', right ? this.soluteRight : this.soluteLeft, right);
    }
  }

  private seedChamber(kind: MoleculeKind, count: number, right: boolean): void {
    for (let i = 0; i < count; i++) {
      this.molecules.push({
        kind,
        x: this.random.range(
          right ? this.membrane + 12 : CHAMBER.left + 10,
          right ? CHAMBER.right - 10 : this.membrane - 12,
        ),
        y: this.random.range(CHAMBER.top + 10, CHAMBER.bottom - 10),
      });
    }
  }

  influence(kind: string, x: number, y: number, dx: number, dy: number): void {
    const chamber = CHAMBER;
    if (
      ![x, y, dx, dy].every(Number.isFinite) ||
      x < chamber.left ||
      x > chamber.right ||
      y < chamber.top ||
      y > chamber.bottom
    )
      return;
    if (kind === 'stir' && this.field(kind, x, y, ['stir'], dx, dy)) this.cue('flow', 0.5, x);
    if (kind !== 'solute' || this.soluteLeft + this.soluteRight >= 180) return;
    const right = x >= this.membrane;
    const dose = Math.min(18, 180 - this.soluteLeft - this.soluteRight);
    for (let i = 0; i < dose; i++) {
      this.molecules.push({
        kind: 'solute',
        x: clamp(
          x + this.random.range(-27, 27),
          right ? this.membrane + 0.01 : chamber.left,
          right ? chamber.right : this.membrane - 0.01,
        ),
        y: clamp(y + this.random.range(-26, 26), chamber.top, chamber.bottom),
      });
    }
    if (right) this.soluteRight += dose;
    else this.soluteLeft += dose;
    this.cue('solute-drop', 0.61, x);
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    const chamber = CHAMBER;
    const previous = this.membrane;
    const target = chamber.middle + (this.waterLeft - this.waterRight) * 0.35;
    this.membrane += (target - this.membrane) * Math.min(1, dt * 1.8);
    const leftWidth = this.membrane - chamber.left;
    const rightWidth = chamber.right - this.membrane;
    const concentrationDifference = this.soluteRight / rightWidth - this.soluteLeft / leftWidth;
    const pressureDifference = (chamber.middle - this.membrane) / 160;
    const bias = clamp(concentrationDifference * 3.8 - pressureDifference, -0.8, 0.8);
    const diffusion = Math.sqrt(dt) * 44;
    const activeStirs = this.fields.filter((field) => field.life > 11);
    for (const molecule of this.molecules) {
      const right = molecule.x > previous;
      // Affinely map each side as the membrane moves, preserving compartment membership.
      const x = right
        ? this.membrane + ((molecule.x - previous) * rightWidth) / (chamber.right - previous)
        : chamber.left + ((molecule.x - chamber.left) * leftWidth) / (previous - chamber.left);
      let vx = 0;
      let vy = 0;
      for (const field of activeStirs) {
        const dx = x - field.x;
        const dy = molecule.y - field.y;
        const strength = clamp(1 - Math.hypot(dx, dy) / 135) * (field.life - 11) * 0.6;
        vx -= dy * strength;
        vy += dx * strength;
      }
      const mobility = molecule.kind === 'solute' ? 0.43 : molecule.kind === 'tracer' ? 0.84 : 1;
      let nx = x + this.random.range(-diffusion, diffusion) * mobility + vx * dt;
      let ny = molecule.y + this.random.range(-diffusion, diffusion) * mobility + vy * dt;
      if (nx < chamber.left) nx = 2 * chamber.left - nx;
      else if (nx > chamber.right) nx = 2 * chamber.right - nx;
      if (ny < chamber.top) ny = 2 * chamber.top - ny;
      else if (ny > chamber.bottom) ny = 2 * chamber.bottom - ny;
      if (nx > this.membrane !== right) {
        const permeability =
          molecule.kind === 'water'
            ? 0.74 * (1 + (right ? -bias : bias))
            : molecule.kind === 'tracer'
              ? 0.31
              : 0;
        if (permeability > 0 && this.random.next() < permeability) {
          if (molecule.kind === 'water') {
            this.waterLeft += right ? 1 : -1;
            this.waterRight += right ? -1 : 1;
            if (right) this.waterToLeft++;
            else this.waterToRight++;
          } else this.tracerCrossings++;
          if (this.time >= this.nextChime) {
            this.cue('pore-crossing', molecule.kind === 'water' ? 0.28 : 0.48, this.membrane);
            this.nextChime = this.time + 2;
          }
        } else nx = 2 * this.membrane - nx;
      }
      molecule.x = nx;
      molecule.y = ny;
    }
    this.sample(this.waterLeft, this.waterRight);
  }

  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'WATER · LEFT',
        value: String(this.waterLeft),
        note: 'Blue water molecules in the left chamber',
        tone: 'blue',
      },
      {
        label: 'WATER · RIGHT',
        value: String(this.waterRight),
        note: 'Blue water molecules in the right chamber',
        tone: 'mint',
      },
      {
        label: 'TRACER CROSSINGS',
        value: String(this.tracerCrossings),
        note: 'Gold tracer crosses and diffuses in both directions',
        tone: 'gold',
      },
      {
        label: 'RETAINED SOLUTE',
        value: this.soluteLeft + ' / ' + this.soluteRight,
        note: 'Violet molecules stay in their original chamber',
        tone: 'coral',
      },
    ];
  }
}
