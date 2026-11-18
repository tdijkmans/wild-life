import { WorldEngine, type Genes, type Organism } from './engine';

const STEPS_PER_SECOND = 60;
const GENE_BOUNDS: Record<keyof Genes, readonly [number, number]> = {
  speed: [0.55, 1.6],
  vision: [0.55, 1.6],
  camouflage: [0, 1],
  fertility: [0.6, 1.5],
  thermal: [-1, 1],
};

function advance(world: WorldEngine, steps: number, dt = 1 / STEPS_PER_SECOND): void {
  for (let i = 0; i < steps; i++) world.step(dt);
}

/** Domain invariants, independent of exactly which organisms survive a seed. */
function assertWorldInvariants(world: WorldEngine): void {
  const stats = world.stats();
  const prey = world.organisms.filter((organism) => organism.species === 'prey');
  const predators = world.organisms.filter((organism) => organism.species === 'predator');
  expect(stats.prey).toBe(prey.length);
  expect(stats.predators).toBe(predators.length);
  expect(stats.food).toBe(world.food.length);
  expect(stats.prey).toBeLessThanOrEqual(720);
  expect(stats.predators).toBeLessThanOrEqual(120);
  expect(stats.food).toBeLessThanOrEqual(780);
  expect(world.organisms.length).toBeLessThanOrEqual(stats.populationPeak);
  expect(stats.births).toBeGreaterThanOrEqual(0);
  expect(stats.deaths).toBeGreaterThanOrEqual(stats.kills);
  expect(stats.diversity).toBeGreaterThanOrEqual(0);
  expect(stats.diversity).toBeLessThanOrEqual(100);
  expect(Object.values(stats).every(Number.isFinite)).toBe(true);
  expect(world.history.length).toBeLessThanOrEqual(180);
  expect(world.events.length).toBeLessThanOrEqual(8);
  expect(world.flashes.length).toBeLessThanOrEqual(80);
  expect(world.patches.length).toBeLessThanOrEqual(25);

  const ids = world.organisms.map((organism) => organism.id);
  expect(new Set(ids).size).toBe(ids.length);

  for (const organism of world.organisms) {
    expect(organism.alive).toBe(true);
    expect(organism.x).toBeGreaterThanOrEqual(8);
    expect(organism.x).toBeLessThanOrEqual(world.width - 8);
    expect(organism.y).toBeGreaterThanOrEqual(8);
    expect(organism.y).toBeLessThanOrEqual(world.height - 8);
    expect(organism.energy).toBeGreaterThan(0);
    expect(organism.age).toBeGreaterThanOrEqual(0);
    expect(organism.generation).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(organism.generation)).toBe(true);
    expect(
      [organism.vx, organism.vy, organism.angle, organism.energy, organism.age].every(
        Number.isFinite,
      ),
    ).toBe(true);
    for (const key of Object.keys(GENE_BOUNDS) as (keyof Genes)[]) {
      const [min, max] = GENE_BOUNDS[key];
      expect(Number.isFinite(organism.genes[key])).toBe(true);
      expect(organism.genes[key]).toBeGreaterThanOrEqual(min);
      expect(organism.genes[key]).toBeLessThanOrEqual(max);
    }
  }
  for (const food of world.food) {
    expect([food.x, food.y, food.energy].every(Number.isFinite)).toBe(true);
    expect(food.energy).toBeGreaterThan(0);
    expect(food.x).toBeGreaterThanOrEqual(0);
    expect(food.x).toBeLessThanOrEqual(world.width);
    expect(food.y).toBeGreaterThanOrEqual(0);
    expect(food.y).toBeLessThanOrEqual(world.height);
  }
}

function prepareForReproduction(parent: Organism): void {
  parent.x = 600;
  parent.y = 370;
  parent.age = 20;
  parent.cooldown = -1;
  parent.energy = 5;
  parent.genes.fertility = 1.5;
}

describe('WILD ecosystem — regression and invariants', () => {
  describe('deterministic reproduction of experiments', () => {
    it('reproduces full organism, food, history, and event state with identical interventions', () => {
      const a = new WorldEngine(190911, 90, 9);
      const b = new WorldEngine(190911, 90, 9);
      for (let i = 0; i < 360; i++) {
        for (const world of [a, b]) {
          if (i === 45) world.bloom(440, 370, 28);
          if (i === 90) world.flow(500, 350, 40, -12);
          if (i === 160) world.climate(680, 360, 'heat');
          if (i === 220) world.climate(260, 210, 'cold');
          world.step(1 / STEPS_PER_SECOND);
        }
      }
      expect(a.seed).toBe(b.seed);
      expect(a.organisms).toEqual(b.organisms);
      expect(a.food).toEqual(b.food);
      expect(a.history).toEqual(b.history);
      expect(a.events).toEqual(b.events);
      expect(a.stats()).toEqual(b.stats());
    });

    it('creates distinct starting populations for different seeds', () => {
      const a = new WorldEngine(11, 25, 4);
      const b = new WorldEngine(12, 25, 4);
      expect(a.organisms).not.toEqual(b.organisms);
    });
  });

  describe('predation, food and mortality', () => {
    it('allows a predator to catch nearby prey exactly once', () => {
      const world = new WorldEngine(4, 1, 1);
      const prey = world.organisms.find((organism) => organism.species === 'prey')!;
      const predator = world.organisms.find((organism) => organism.species === 'predator')!;
      prey.x = predator.x = 600;
      prey.y = predator.y = 360;
      prey.age = predator.age = 1;
      prey.cooldown = predator.cooldown = 100;
      predator.energy = 0.6;

      world.step(1 / STEPS_PER_SECOND);

      expect(world.stats().prey).toBe(0);
      expect(world.stats().predators).toBe(1);
      expect(world.stats().kills).toBe(1);
      expect(world.stats().deaths).toBe(1);
      expect(predator.energy).toBeGreaterThan(0.6);
      world.step(1 / STEPS_PER_SECOND);
      expect(world.stats().kills).toBe(1);
    });

    it('allows a grazer to consume food and gain energy', () => {
      const world = new WorldEngine(8, 1, 0);
      const grazer = world.organisms[0];
      grazer.x = 600;
      grazer.y = 360;
      grazer.age = 1;
      grazer.cooldown = 100;
      grazer.energy = 1;
      world.food.splice(0, world.food.length, { id: 999_001, x: 600, y: 360, energy: 0.6 });

      world.step(1 / STEPS_PER_SECOND);

      expect(world.food).toHaveLength(0);
      expect(world.stats().food).toBe(0);
      expect(grazer.energy).toBeGreaterThan(1);
      expect(world.stats().prey).toBe(1);
    });

    it('removes an organism after its lifespan and records the death', () => {
      const world = new WorldEngine(6, 1, 0);
      world.organisms[0].age = 300;
      world.organisms[0].cooldown = 100;
      world.step(1 / STEPS_PER_SECOND);
      expect(world.stats().prey).toBe(0);
      expect(world.stats().deaths).toBe(1);
    });

    it('never creates organisms spontaneously in an extinct world', () => {
      const world = new WorldEngine(14, 0, 0);
      advance(world, 240);
      expect(world.organisms).toHaveLength(0);
      expect(world.stats().births).toBe(0);
      expect(world.stats().prey).toBe(0);
      expect(world.stats().predators).toBe(0);
      expect(Object.values(world.stats()).every(Number.isFinite)).toBe(true);
    });

    it('maintains the cumulative births/deaths conservation identity', () => {
      const startingPrey = 65;
      const startingPredators = 7;
      const world = new WorldEngine(145, startingPrey, startingPredators);
      advance(world, 600);
      const { births, deaths, prey, predators } = world.stats();
      expect(prey + predators).toBe(startingPrey + startingPredators + births - deaths);
      expect(world.stats().kills).toBeLessThanOrEqual(deaths);
    });
  });

  describe('reproduction and genetic inheritance', () => {
    it('creates offspring with a new ID, higher generation, and a new genes object', () => {
      const world = new WorldEngine(24, 1, 0);
      const parent = world.organisms[0];
      prepareForReproduction(parent);
      const parentGenes = { ...parent.genes };
      const parentId = parent.id;
      const parentGeneration = parent.generation;

      world.step(1 / STEPS_PER_SECOND);

      expect(world.stats().births).toBe(1);
      const child = world.organisms.find((organism) => organism.id !== parentId)!;
      expect(child).toBeDefined();
      expect(child.species).toBe('prey');
      expect(child.generation).toBe(parentGeneration + 1);
      expect(child.age).toBe(0);
      expect(child.genes).not.toBe(parent.genes);
      expect(parent.genes).toEqual(parentGenes);
      for (const key of Object.keys(GENE_BOUNDS) as (keyof Genes)[]) {
        expect(Math.abs(child.genes[key] - parentGenes[key])).toBeLessThanOrEqual(0.19000000001);
      }
      assertWorldInvariants(world);
    });

    it('does not reproduce before the maturity age or during cooldown', () => {
      const world = new WorldEngine(53, 2, 0);
      for (const organism of world.organisms) {
        prepareForReproduction(organism);
        organism.cooldown = 100;
      }
      world.organisms[0].cooldown = -1;
      world.organisms[0].age = 5;
      world.step(1 / STEPS_PER_SECOND);
      expect(world.stats().births).toBe(0);
    });

    it('never exceeds the genetic bounds during repeated inheritance', () => {
      const world = new WorldEngine(54, 1, 0);
      for (let generation = 1; generation <= 30; generation++) {
        const parent = world.organisms.at(-1)!;
        prepareForReproduction(parent);
        const nextGeneration = parent.generation + 1;
        world.step(1 / STEPS_PER_SECOND);
        const child = world.organisms.find((organism) => organism.generation === nextGeneration);
        expect(child).toBeDefined();
        for (const key of Object.keys(GENE_BOUNDS) as (keyof Genes)[]) {
          const [min, max] = GENE_BOUNDS[key];
          expect(child!.genes[key]).toBeGreaterThanOrEqual(min);
          expect(child!.genes[key]).toBeLessThanOrEqual(max);
        }
      }
    });
  });

  describe('carrying capacity and intervention limits', () => {
    it('clamps excessive and malformed initial population sizes', () => {
      const huge = new WorldEngine(14, 999, 999);
      expect(huge.stats().prey).toBe(720);
      expect(huge.stats().predators).toBe(120);
      expect(huge.stats().populationPeak).toBe(840);

      const invalid = new WorldEngine(15, Number.NaN, Number.POSITIVE_INFINITY);
      expect(invalid.stats().prey).toBe(0);
      expect(invalid.stats().predators).toBe(0);

      const negative = new WorldEngine(16, -10, -2);
      expect(negative.organisms).toHaveLength(0);
    });

    it('respects both birth caps even when many adults are ready', () => {
      const world = new WorldEngine(101, 719, 119);
      for (const organism of world.organisms) prepareForReproduction(organism);
      world.step(1 / STEPS_PER_SECOND);
      expect(world.stats().prey).toBeLessThanOrEqual(720);
      expect(world.stats().predators).toBeLessThanOrEqual(120);
      expect(world.stats().births).toBeLessThanOrEqual(2);
      assertWorldInvariants(world);
    });

    it('limits food when large blooms are applied', () => {
      const world = new WorldEngine(202, 0, 0);
      world.bloom(600, 370, 2_000);
      expect(world.food).toHaveLength(780);
      assertWorldInvariants(world);
    });

    it('ignores invalid bloom quantities rather than entering an unbounded loop', () => {
      const world = new WorldEngine(212, 0, 0);
      const before = world.stats().food;
      const invalidAmounts = [NaN, Infinity, -Infinity, -9, 0];
      for (const quantity of invalidAmounts) {
        world.bloom(400, 360, quantity);
      }
      expect(world.stats().food).toBe(before);
      expect(world.patches).toHaveLength(0);
    });

    it('refreshes cached statistics after adding food without a time step', () => {
      const world = new WorldEngine(203, 0, 0);
      const before = world.stats().food;
      world.bloom(600, 370, 6);
      expect(world.stats().food).toBe(before + 6);
    });

    it('rejects invalid intervention coordinates and motion vectors', () => {
      const world = new WorldEngine(204, 0, 0);
      const beforeFood = world.food.length;
      world.bloom(Number.NaN, 300, 20);
      world.bloom(Number.POSITIVE_INFINITY, 300, 20);
      world.climate(300, Number.NaN, 'heat');
      world.flow(Number.NEGATIVE_INFINITY, 200, 30, 0);
      world.flow(300, 200, Number.NaN, 0);
      world.flow(300, 200, 0, 0);
      expect(world.food).toHaveLength(beforeFood);
      expect(world.patches).toHaveLength(0);
    });

    it('bounds the number of environmental patches and expires old pulses', () => {
      const world = new WorldEngine(205, 0, 0);
      for (let i = 0; i < 55; i++) world.flow(500, 300, 25, -10);
      expect(world.patches.length).toBeLessThanOrEqual(25);
      world.bloom(600, 370, 2);
      advance(world, 25, 0.05);
      expect(world.patches.some((patch) => patch.kind === 'bloom')).toBe(false);
      assertWorldInvariants(world);
    });

    it('ignores NaN, infinity, zero and negative simulation time', () => {
      const world = new WorldEngine(206, 3, 2);
      const before = {
        elapsed: world.elapsed,
        organisms: structuredClone(world.organisms),
        food: structuredClone(world.food),
        stats: world.stats(),
      };
      for (const dt of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -0.01])
        world.step(dt);
      expect(world.elapsed).toBe(before.elapsed);
      expect(world.organisms).toEqual(before.organisms);
      expect(world.food).toEqual(before.food);
      expect(world.stats()).toEqual(before.stats);
    });

    it('caps exceptionally large finite step sizes', () => {
      const world = new WorldEngine(207, 0, 0);
      world.step(10_000);
      expect(world.elapsed).toBeCloseTo(0.05, 9);
      assertWorldInvariants(world);
    });
  });

  describe('long-running seeded scenarios', () => {
    it.each([1, 42, 20_261_118])(
      'maintains conservation, numeric, spatial and genetic invariants for seed %i',
      (seed) => {
        const initialPrey = 90;
        const initialPredators = 10;
        const world = new WorldEngine(seed, initialPrey, initialPredators);
        for (let i = 0; i < 900; i++) {
          if (i % 150 === 0) world.bloom(200 + (i % 500), 300, 15);
          if (i % 275 === 0) world.climate(580, 360, 'heat');
          if (i % 325 === 0) world.flow(650, 400, -10, 30);
          world.step(1 / STEPS_PER_SECOND);
          if (i % 75 === 0) {
            assertWorldInvariants(world);
            const stats = world.stats();
            expect(stats.prey + stats.predators).toBe(
              initialPrey + initialPredators + stats.births - stats.deaths,
            );
          }
        }
        assertWorldInvariants(world);
      },
    );

    it('keeps capped history and event records through long, empty-world runs', () => {
      const world = new WorldEngine(901, 0, 0);
      advance(world, 4_500, 0.05);
      expect(world.history).toHaveLength(180);
      expect(world.events.length).toBeLessThanOrEqual(8);
      expect(world.history.at(-1)!.time).toBeGreaterThan(world.history[0].time);
    });
  });
});
