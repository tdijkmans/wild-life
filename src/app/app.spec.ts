import { routes } from './app.routes';
import {
  FEATURED_SIMULATION,
  SIMULATIONS,
  simulationRoutes,
} from './simulations/simulation-catalog';

describe('WILD LIFE catalogue and routes', () => {
  it('starts at the experiment catalogue', () => {
    expect(routes[0].path).toBe('');
    expect(routes[0].loadComponent).toBeDefined();
  });

  it('generates all simulation routes from the single registry', () => {
    expect(routes.slice(1, -1).map((route) => route.path)).toEqual(
      SIMULATIONS.map((simulation) => simulation.path.slice(1)),
    );
    expect(routes[1].loadComponent).toBe(SIMULATIONS[0].loadComponent);
  });

  it('registers Predator–Prey Evolution as the featured world with a lazy preview', () => {
    expect(SIMULATIONS).toHaveLength(3);
    expect(SIMULATIONS.map((entry) => entry.path)).toEqual([
      '/ecosystem',
      '/murmuration',
      '/defensive-herd',
    ]);
    expect(FEATURED_SIMULATION.id).toBe('ecosystem');
    expect(FEATURED_SIMULATION.path).toBe('/ecosystem');
    expect(FEATURED_SIMULATION.preview?.loadComponent).toBeTypeOf('function');
  });

  it('keeps the wildcard route after the generated simulation routes', () => {
    expect(routes.at(-1)?.redirectTo).toBe('');
    expect(simulationRoutes(SIMULATIONS)).toHaveLength(SIMULATIONS.length);
  });
});
