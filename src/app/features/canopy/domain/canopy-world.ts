import { SeededRandom } from '../../../shared/simulation/seeded-random';
import { SpatialGrid } from '../../../shared/simulation/spatial-grid';
import type {
  InteractiveWorld,
  WorldAudioCue,
  WorldHistoryPoint,
  WorldMetric,
} from '../../../shared/world-experience/world-protocol';

export const CANOPY_WIDTH = 1200;
export const CANOPY_HEIGHT = 720;
const TREE_LIMIT = 16;
const LEAF_LIMIT = 2400;
const INSECT_LIMIT = 100;
const GROUND = 678;

export interface Branch {
  parent: number;
  angle: number;
  length: number;
  progress: number;
  depth: number;
  thickness: number;
  children: boolean;
}

export interface Leaf {
  id: number;
  branch: number;
  position: number;
  side: number;
  x: number;
  y: number;
  growth: number;
  health: number;
  age: number;
  hue: number;
}

export interface CanopyTree {
  id: number;
  x: number;
  y: number;
  age: number;
  energy: number;
  water: number;
  shade: number;
  hue: number;
  branches: Branch[];
  leaves: Leaf[];
}

export interface Herbivore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  energy: number;
  phase: number;
}

export interface ForestField {
  kind: 'rain' | 'sunlight' | 'wildflowers';
  x: number;
  y: number;
  radius: number;
  remaining: number;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/**
 * Trees and insects are simulated rather than animated. Branch architecture
 * grows from parent tips; leaf damage feeds back into each tree's energy.
 */
export class CanopyWorld implements InteractiveWorld {
  readonly width = CANOPY_WIDTH;
  readonly height = CANOPY_HEIGHT;
  readonly seed: number;
  readonly trees: CanopyTree[] = [];
  readonly insects: Herbivore[] = [];
  readonly fields: ForestField[] = [];
  readonly history: WorldHistoryPoint[] = [];
  readonly audioCues: WorldAudioCue[] = [];

  private readonly random: SeededRandom;
  private readonly leafGrid = new SpatialGrid(this.width, this.height, 58);
  private readonly leafRefs: Leaf[] = [];
  private nextLeafId = 0;
  private nextTreeId = 0;
  private nextCueId = 0;
  private sampleTimer = 0;
  private reproductionTimer = 0;
  private growthTimer = 0;
  private lostSinceSample = 0;
  time = 0;
  leavesEaten = 0;
  births = 0;
  rain = 0;
  meanShade = 0;

  constructor(seed = 20261120, treeCount = 10, insectCount = 36) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    if (
      !Number.isInteger(treeCount) ||
      treeCount < 0 ||
      treeCount > TREE_LIMIT ||
      !Number.isInteger(insectCount) ||
      insectCount < 0 ||
      insectCount > INSECT_LIMIT
    ) {
      throw new RangeError('Canopy population exceeds its safe bounds');
    }
    for (let i = 0; i < treeCount; i++) {
      const x = 90 + (i / Math.max(1, treeCount - 1)) * 1010 + this.random.range(-22, 22);
      this.plant(x, false);
    }
    for (let i = 0; i < insectCount; i++) {
      this.insects.push(this.makeInsect(this.random.range(90, 1110), this.random.range(170, 560)));
    }
    this.rebuildLeaves();
    this.sample();
  }

  private plant(x: number, sapling: boolean): void {
    const age = sapling ? 0 : this.random.range(24, 110);
    const tree: CanopyTree = {
      id: this.nextTreeId++,
      x: clamp(x, 25, this.width - 25),
      y: GROUND + this.random.range(-12, 9),
      age,
      energy: this.random.range(0.66, 1.2),
      water: this.random.range(0.45, 0.85),
      shade: 0,
      hue: this.random.range(-8, 18),
      branches: [
        {
          parent: -1,
          angle: -Math.PI / 2 + this.random.range(-0.12, 0.12),
          length: this.random.range(130, 205),
          progress: sapling ? 0.17 : 1,
          depth: 0,
          thickness: this.random.range(9, 15),
          children: false,
        },
      ],
      leaves: [],
    };
    if (!sapling) {
      this.fork(tree, 0, true);
      // Start with an established but still-developing crown. This ensures
      // Aquarium feels like a living forest from its very first frame.
      const firstTier = tree.branches.length;
      for (let branch = 1; branch < firstTier; branch++) {
        this.fork(tree, branch, true);
      }
      for (let branch = 1; branch < tree.branches.length; branch++) {
        const amount = tree.branches[branch].depth > 1 ? 10 : 6;
        this.addLeaves(tree, branch, amount);
      }
    }
    this.trees.push(tree);
  }

  private endpoint(tree: CanopyTree, index: number): { x: number; y: number } {
    const branch = tree.branches[index];
    const start =
      branch.parent >= 0 ? this.endpoint(tree, branch.parent) : { x: tree.x, y: tree.y };
    return {
      x: start.x + Math.cos(branch.angle) * branch.length * branch.progress,
      y: start.y + Math.sin(branch.angle) * branch.length * branch.progress,
    };
  }

  /** Exposed geometry is shared by ecology and renderer; Canvas never owns branch growth. */
  branchGeometry(
    tree: CanopyTree,
    index: number,
  ): {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } {
    const branch = tree.branches[index];
    const start =
      branch.parent >= 0 ? this.endpoint(tree, branch.parent) : { x: tree.x, y: tree.y };
    const end = this.endpoint(tree, index);
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  }

  private fork(tree: CanopyTree, index: number, initial = false): void {
    const parent = tree.branches[index];
    if (parent.children || parent.depth >= 4 || tree.branches.length >= 75) return;
    parent.children = true;
    const number = parent.depth === 0 ? 3 : this.random.next() < 0.6 ? 2 : 1;
    for (let i = 0; i < number && tree.branches.length < 75; i++) {
      const sign = i % 2 === 0 ? -1 : 1;
      const spread = parent.depth === 0 ? 0.52 : 0.5;
      const angle = parent.angle + sign * (spread + this.random.range(-0.19, 0.19));
      tree.branches.push({
        parent: index,
        angle: clamp(angle, -Math.PI + 0.17, -0.17),
        length: parent.length * this.random.range(0.63, 0.77),
        progress: initial ? this.random.range(0.58, 1) : 0.08,
        depth: parent.depth + 1,
        thickness: Math.max(0.75, parent.thickness * 0.62),
        children: false,
      });
    }
  }

  private addLeaves(tree: CanopyTree, index: number, amount: number): void {
    for (let i = 0; i < amount && this.countLeaves() < LEAF_LIMIT; i++) {
      const leaf: Leaf = {
        id: this.nextLeafId++,
        branch: index,
        position: this.random.range(0.52, 1),
        side: this.random.next() < 0.5 ? -1 : 1,
        x: 0,
        y: 0,
        growth: this.random.range(0.24, 0.81),
        health: 1,
        age: 0,
        hue: this.random.range(-12, 16),
      };
      tree.leaves.push(leaf);
    }
  }

  private countLeaves(): number {
    return this.trees.reduce((sum, tree) => sum + tree.leaves.length, 0);
  }

  private makeInsect(x: number, y: number): Herbivore {
    const angle = this.random.range(0, Math.PI * 2);
    return {
      x,
      y,
      vx: Math.cos(angle) * 17,
      vy: Math.sin(angle) * 17,
      age: 0,
      energy: this.random.range(0.5, 1),
      phase: this.random.range(0, Math.PI * 2),
    };
  }

  private cue(kind: WorldAudioCue['kind'], strength: number): void {
    this.audioCues.push({ id: ++this.nextCueId, kind, strength });
    if (this.audioCues.length > 16) this.audioCues.shift();
  }

  influence(kind: string, x: number, y: number, dx = 0, dy = 0): void {
    if (
      ![x, y, dx, dy].every(Number.isFinite) ||
      x < 0 ||
      x > this.width ||
      y < 0 ||
      y > this.height ||
      !['rain', 'sunlight', 'wildflowers'].includes(kind)
    )
      return;
    this.fields.push({
      kind: kind as ForestField['kind'],
      x,
      y,
      radius: kind === 'rain' ? 175 : 160,
      remaining: kind === 'rain' ? 13 : 19,
    });
    if (this.fields.length > 24) this.fields.shift();
    this.cue(kind === 'rain' ? 'rain' : kind === 'sunlight' ? 'growth' : 'rustle', 0.52);
  }

  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
    this.time += dt;
    this.sampleTimer += dt;
    this.reproductionTimer += dt;
    this.growthTimer += dt;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      this.fields[i].remaining -= dt;
      if (this.fields[i].remaining <= 0) this.fields.splice(i, 1);
    }
    this.rain = 0;
    let shadeSum = 0;
    for (const tree of this.trees) {
      const overlapping = this.trees.filter(
        (other) =>
          other !== tree &&
          Math.abs(other.x - tree.x) < 155 &&
          other.branches.length >= tree.branches.length - 5,
      ).length;
      tree.shade = Math.min(0.74, overlapping * 0.15);
      shadeSum += tree.shade;
      let wetness = 0;
      let sun = 0;
      for (const field of this.fields) {
        const d = Math.hypot(tree.x - field.x, tree.y - 320 - field.y);
        if (d < field.radius) {
          const factor = (1 - d / field.radius) * Math.min(1, field.remaining / 3);
          if (field.kind === 'rain') wetness += factor;
          if (field.kind === 'sunlight') sun += factor;
        }
      }
      this.rain += wetness;
      tree.water = clamp(tree.water + (wetness * 0.018 - 0.0015) * dt, 0.08, 1);
      const foliage = tree.leaves.reduce((sum, leaf) => sum + leaf.growth * leaf.health, 0);
      const light = clamp(0.78 - tree.shade + sun * 0.38, 0.13, 1.25);
      tree.energy = clamp(
        tree.energy + dt * (foliage * light * tree.water * 0.00045 - 0.0028),
        0.08,
        1.6,
      );
      tree.age += dt;
      for (let index = 0; index < tree.branches.length; index++) {
        const branch = tree.branches[index];
        branch.progress = Math.min(
          1,
          branch.progress + dt * (0.008 + tree.energy * tree.water * light * 0.022),
        );
      }
      for (const leaf of tree.leaves) {
        leaf.growth = Math.min(1, leaf.growth + dt * 0.033 * light * tree.water * tree.energy);
        leaf.age += dt;
        if (leaf.health < 1 && tree.energy > 0.4) {
          leaf.health = Math.min(1, leaf.health + dt * 0.00035 * tree.water);
        }
      }
      // Leaf positions are computed from the actual (growing) branches.
      for (const leaf of tree.leaves) {
        const geom = this.branchGeometry(tree, leaf.branch);
        leaf.x =
          geom.x1 +
          (geom.x2 - geom.x1) * leaf.position +
          Math.cos(tree.branches[leaf.branch].angle + Math.PI / 2) * leaf.side * 5;
        leaf.y =
          geom.y1 +
          (geom.y2 - geom.y1) * leaf.position +
          Math.sin(tree.branches[leaf.branch].angle + Math.PI / 2) * leaf.side * 5;
      }
    }
    this.meanShade = this.trees.length ? shadeSum / this.trees.length : 0;
    this.advanceInsects(dt);

    if (this.growthTimer >= 2.4) {
      this.growthTimer -= 2.4;
      let newBranches = 0;
      let leafFlush = 0;
      for (const tree of this.trees) {
        if (tree.energy < 0.27) continue;
        const candidates = tree.branches
          .map((branch, index) => ({ branch, index }))
          .filter(({ branch }) => !branch.children && branch.progress > 0.64 && branch.depth < 4);
        if (candidates.length && this.random.next() < tree.energy * 0.64) {
          const candidate = candidates[this.random.integer(0, candidates.length)];
          this.fork(tree, candidate.index);
          newBranches++;
        }
        const branch = tree.branches[this.random.integer(0, tree.branches.length)];
        if (branch.progress > 0.47 && tree.leaves.length < 200) {
          const before = tree.leaves.length;
          this.addLeaves(tree, tree.branches.indexOf(branch), this.random.integer(1, 4));
          leafFlush += tree.leaves.length - before;
        }
      }
      const branchFlush = newBranches > 1 && this.random.next() < 0.18;
      if (newBranches) this.cue('wood', branchFlush ? 0.51 : 0.32);
      if (leafFlush) this.cue('leaf', Math.min(0.48, 0.22 + leafFlush * 0.02));
    }
    if (this.sampleTimer >= 1) {
      this.sampleTimer -= 1;
      if (this.lostSinceSample >= 3) this.cue('rustle', Math.min(1, this.lostSinceSample / 20));
      this.lostSinceSample = 0;
      this.sample();
    }
    if (this.reproductionTimer >= 18) {
      this.reproductionTimer -= 18;
      this.reproduce();
    }
  }

  private rebuildLeaves(): void {
    this.leafGrid.clear();
    this.leafRefs.length = 0;
    for (const tree of this.trees) {
      for (const leaf of tree.leaves) {
        const geom = this.branchGeometry(tree, leaf.branch);
        const branch = tree.branches[leaf.branch];
        const normal = branch.angle + Math.PI / 2;
        leaf.x = geom.x1 + (geom.x2 - geom.x1) * leaf.position + Math.cos(normal) * leaf.side * 5;
        leaf.y = geom.y1 + (geom.y2 - geom.y1) * leaf.position + Math.sin(normal) * leaf.side * 5;
        this.leafGrid.insert(this.leafRefs.length, leaf.x, leaf.y);
        this.leafRefs.push(leaf);
      }
    }
  }

  private advanceInsects(dt: number): void {
    this.rebuildLeaves();
    for (let i = this.insects.length - 1; i >= 0; i--) {
      const insect = this.insects[i];
      let target: Leaf | undefined;
      let best = Infinity;
      this.leafGrid.forNearby(insect.x, insect.y, (index) => {
        const leaf = this.leafRefs[index];
        if (leaf.health < 0.06) return;
        const d2 = (leaf.x - insect.x) ** 2 + (leaf.y - insect.y) ** 2;
        if (d2 < best && d2 < 68 * 68) {
          best = d2;
          target = leaf;
        }
      });
      let ax = Math.sin(this.time * 1.5 + insect.phase) * 27;
      let ay = Math.cos(this.time * 1.17 + insect.phase) * 27;
      if (target) {
        ax += (target.x - insect.x) * 0.75;
        ay += (target.y - insect.y) * 0.75;
        if (best < 10 * 10) {
          target.health -= dt * 0.19;
          insect.energy = Math.min(1.5, insect.energy + dt * 0.11);
          if (target.health <= 0) {
            target.health = 0;
            this.leavesEaten++;
            this.lostSinceSample++;
          }
        }
      }
      for (const field of this.fields) {
        if (field.kind !== 'wildflowers') continue;
        const distance = Math.hypot(insect.x - field.x, insect.y - field.y);
        if (distance < field.radius) {
          ax += (field.x - insect.x) * 0.13;
          ay += (field.y - insect.y) * 0.13;
        }
      }
      insect.vx = clamp(insect.vx * (1 - dt * 1.25) + ax * dt, -34, 34);
      insect.vy = clamp(insect.vy * (1 - dt * 1.25) + ay * dt, -34, 34);
      insect.x = clamp(insect.x + insect.vx * dt, 4, this.width - 4);
      insect.y = clamp(insect.y + insect.vy * dt, 18, GROUND - 7);
      insect.age += dt;
      insect.energy -= dt * 0.002;
      if (insect.age > 150 || insect.energy <= 0) this.insects.splice(i, 1);
    }
  }

  private reproduce(): void {
    if (this.insects.length < INSECT_LIMIT && this.insects.length) {
      const available = this.insects.filter((insect) => insect.energy > 0.55);
      if (available.length) {
        const source = available[this.random.integer(0, available.length)];
        this.insects.push(this.makeInsect(source.x + this.random.range(-12, 12), source.y));
        source.energy *= 0.7;
      }
    }
    if (this.trees.length < TREE_LIMIT && this.trees.length > 0 && this.time > 65) {
      const parent = this.trees[this.random.integer(0, this.trees.length)];
      if (parent.energy > 0.78 && this.random.next() < 0.34) {
        this.plant(parent.x + this.random.range(-90, 90), true);
        parent.energy *= 0.86;
        this.births++;
        this.cue('seed-set', 0.49);
      }
    }
    for (const tree of this.trees) {
      tree.leaves = tree.leaves.filter((leaf) => leaf.health > 0 && leaf.age < 240);
    }
  }

  private sample(): void {
    this.history.push({
      time: Math.round(this.time),
      primary: this.countLeaves(),
      secondary: this.insects.length,
    });
    if (this.history.length > 160) this.history.shift();
  }

  metrics(): readonly WorldMetric[] {
    return [
      { label: 'FOLIAGE', value: String(this.countLeaves()), note: 'growing leaves', tone: 'mint' },
      { label: 'TREES', value: String(this.trees.length), note: 'living crowns', tone: 'blue' },
      {
        label: 'HERBIVORES',
        value: String(this.insects.length),
        note: 'leaf-eating insects',
        tone: 'gold',
      },
      {
        label: 'LEAVES EATEN',
        value: String(this.leavesEaten),
        note: 'herbivory events',
        tone: 'coral',
      },
    ];
  }
}
