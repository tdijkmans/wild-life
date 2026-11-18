import { SeededRandom } from './seeded-random';
import { SpatialGrid } from './spatial-grid';

describe('Shared deterministic world utilities', () => {
  it('repeats the exact random sequence for the same seed', () => {
    const one = new SeededRandom(20261118);
    const two = new SeededRandom(20261118);
    expect(Array.from({ length: 150 }, () => one.next())).toEqual(
      Array.from({ length: 150 }, () => two.next()),
    );
  });

  it('different seeds diverge, including seed zero', () => {
    expect(new SeededRandom(0).next()).not.toBe(new SeededRandom(1).next());
  });

  it('random values and integer samples stay in their requested bounds', () => {
    const random = new SeededRandom(9);
    for (let i = 0; i < 500; i++) {
      expect(random.next()).toBeGreaterThanOrEqual(0);
      expect(random.next()).toBeLessThan(1);
      expect(random.range(-12, 12)).toBeGreaterThanOrEqual(-12);
      const integer = random.integer(3, 11);
      expect(integer).toBeGreaterThanOrEqual(3);
      expect(integer).toBeLessThan(11);
    }
  });

  it('rejects non-integer and out-of-range seeds', () => {
    for (const seed of [-1, 1.5, NaN, Infinity, 0x100000000]) {
      expect(() => new SeededRandom(seed)).toThrow(RangeError);
    }
  });

  it('spatial lookup visits nearby cells and ignores distant entries', () => {
    const grid = new SpatialGrid(600, 400, 60);
    grid.insert(1, 65, 70);
    grid.insert(2, 120, 120);
    grid.insert(3, 460, 330);
    const found: number[] = [];
    grid.forNearby(70, 70, (index) => found.push(index));
    expect(found).toContain(1);
    expect(found).toContain(2);
    expect(found).not.toContain(3);
    grid.clear();
    const empty: number[] = [];
    grid.forNearby(70, 70, (index) => empty.push(index));
    expect(empty).toEqual([]);
  });
});
