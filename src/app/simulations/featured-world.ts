import { InjectionToken } from '@angular/core';
import { featuredSimulation, SIMULATIONS, type SimulationDefinition } from './simulation-catalog';

const STORAGE_KEY = 'wild-life:featured-world';

export const FEATURED_WORLD = new InjectionToken<SimulationDefinition>('Featured world', {
  factory: () => {
    let previousId: string | null = null;
    try {
      previousId = globalThis.sessionStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      // The gallery still works when the browser disables session storage.
    }
    const world = featuredSimulation(SIMULATIONS, Math.random(), previousId);
    try {
      globalThis.sessionStorage?.setItem(STORAGE_KEY, world.id);
    } catch {
      // Repeat avoidance is optional; selection is still random.
    }
    return world;
  },
});
