import { WorldFoleyQueue } from './world-foley';

describe(WorldFoleyQueue.name, () => {
  it('plays distinct events from the same simulation step and retains the strongest repeat', () => {
    const queue = new WorldFoleyQueue();
    queue.add({ kind: 'pebble-impact', strength: 0.8, pan: -0.5 }, 0);
    queue.add({ kind: 'membrane-rupture', strength: 0.3, pan: 0.5 }, 0);
    queue.add({ kind: 'membrane-rupture', strength: 0.6, pan: 0.25 }, 0);

    expect(queue.next(0)).toEqual({ kind: 'pebble-impact', strength: 0.8, pan: -0.5 });
    expect(queue.next(0.04)).toBeUndefined();
    expect(queue.next(0.06)).toEqual({ kind: 'membrane-rupture', strength: 0.636, pan: 0.25 });
    expect(queue.next(0.4)).toBeUndefined();
  });

  it('does not let a busy event kind block a different one during its cooldown', () => {
    const queue = new WorldFoleyQueue();
    queue.add({ kind: 'pulse', strength: 0.4 }, 0);
    expect(queue.next(0)?.kind).toBe('pulse');
    queue.add({ kind: 'pulse', strength: 0.4 }, 2);
    queue.add({ kind: 'division', strength: 0.7 }, 2);
    expect(queue.next(2)?.kind).toBe('division');
    expect(queue.next(2.9)).toBeUndefined();
    expect(queue.next(4)?.kind).toBe('pulse');
    queue.add({ kind: 'pulse', strength: 0.4 }, 7.5);
    expect(queue.next(7.5)?.kind).toBe('pulse');
  });

  it('brings a catch or a new branch forward when background events are waiting', () => {
    const queue = new WorldFoleyQueue();
    queue.add({ kind: 'graze', strength: 0.3 }, 0);
    expect(queue.next(0)?.kind).toBe('graze');
    queue.add({ kind: 'food-contact', strength: 0.3 }, 0.1);
    queue.add({ kind: 'prey-catch', strength: 0.7, pan: -0.5 }, 0.2);
    queue.add({ kind: 'hyphal-branch', strength: 0.59, pan: 0.5 }, 0.3);
    expect(queue.next(0.36)?.kind).toBe('prey-catch');
    expect(queue.next(0.73)?.kind).toBe('hyphal-branch');
    expect(queue.next(1.54)?.kind).toBe('food-contact');
  });

  it('discards stale events and can clear pending events on pause or restart', () => {
    const queue = new WorldFoleyQueue();
    queue.add({ kind: 'rain', strength: 0.5 }, 0);
    expect(queue.next(2.5)).toBeUndefined();
    queue.add({ kind: 'division', strength: 0.5 }, 2);
    queue.clear();
    expect(queue.next(2)).toBeUndefined();
  });
});
