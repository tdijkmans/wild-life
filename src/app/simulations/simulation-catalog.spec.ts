import {
  featuredSimulation,
  simulationRoutes,
  SIMULATIONS,
  type SimulationDefinition,
} from './simulation-catalog';

const loader: SimulationDefinition['loadComponent'] = async () => class ExampleComponent {};

function example(id: string, path: `/${string}`, featured = false): SimulationDefinition {
  return {
    id,
    number: '002',
    name: 'Example simulation',
    description: 'Test world',
    path,
    tags: [],
    featured,
    loadComponent: loader,
  };
}

describe('Simulation catalog registration', () => {
  it('derives new lazy-loaded routes without editing the Angular router', () => {
    const definitions = [example('a', '/first'), example('b', '/second')];
    expect(simulationRoutes(definitions).map((route) => route.path)).toEqual(['first', 'second']);
    expect(simulationRoutes(definitions)[0].loadComponent).toBe(loader);
  });

  it('rejects duplicate IDs and paths before Angular sees conflicting routes', () => {
    const duplicateId = [example('same', '/a'), example('same', '/b')];
    const duplicatePath = [example('a', '/same'), example('b', '/same')];
    expect(() => simulationRoutes(duplicateId)).toThrow('Duplicate simulation registration');
    expect(() => simulationRoutes(duplicatePath)).toThrow('Duplicate simulation registration');
  });

  it('rejects paths that could conflict with root and wildcard routing', () => {
    const invalidPaths = ['/', '/**', '/MixedCase'] as const;
    for (const path of invalidPaths) {
      expect(() => simulationRoutes([example('invalid', path)])).toThrow('Invalid simulation path');
    }
  });

  it('selects the configured featured world, not a hardcoded index', () => {
    const definitions = [example('first', '/first'), example('selected', '/selected', true)];
    expect(featuredSimulation(definitions).id).toBe('selected');
    expect(featuredSimulation([example('fallback', '/fallback')]).id).toBe('fallback');
  });

  it('registers seventeen distinct living worlds with independent lazy routes', () => {
    const registered = SIMULATIONS.map((world) => ({ id: world.id, path: world.path }));
    expect(registered).toEqual([
      { id: 'ecosystem', path: '/ecosystem' },
      { id: 'murmuration', path: '/murmuration' },
      { id: 'defensive-herd', path: '/defensive-herd' },
      { id: 'canopy', path: '/canopy' },
      { id: 'abyssal-bloom', path: '/abyssal-bloom' },
      { id: 'synchrony', path: '/synchrony' },
      { id: 'reef', path: '/reef' },
      { id: 'microbial-commons', path: '/microbial-commons' },
      { id: 'neuroplasticity', path: '/neuroplasticity' },
      { id: 'morphogenesis', path: '/morphogenesis' },
      { id: 'chromatic-commons', path: '/chromatic-commons' },
      { id: 'island-evolution', path: '/island-evolution' },
      { id: 'vascular-garden', path: '/vascular-garden' },
      { id: 'pollen-paths', path: '/pollen-paths' },
      { id: 'night-chorus', path: '/night-chorus' },
      { id: 'silver-shoals', path: '/silver-shoals' },
      { id: 'membrane-tide', path: '/membrane-tide' },
    ]);
    expect(simulationRoutes(SIMULATIONS)).toHaveLength(17);
    expect(SIMULATIONS.filter((world) => world.featured)).toHaveLength(1);
  });

  it('requires a world and disallows multiple featured worlds', () => {
    expect(() => featuredSimulation([])).toThrow('must not be empty');
    const multipleFeatured = [example('a', '/a', true), example('b', '/b', true)];
    expect(() => featuredSimulation(multipleFeatured)).toThrow('Only one featured simulation');
  });
});
