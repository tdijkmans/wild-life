import {
  featuredSimulation,
  simulationRoutes,
  SIMULATIONS,
  type SimulationDefinition,
} from './simulation-catalog';

const loader: SimulationDefinition['loadComponent'] = async () => class ExampleComponent {};

function example(id: string, path: `/${string}`): SimulationDefinition {
  return {
    id,
    number: '002',
    name: 'Example simulation',
    description: 'Test world',
    path,
    tags: [],
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

  it('randomly selects throughout the catalogue and excludes the previous world', () => {
    const definitions = [
      example('first', '/first'),
      example('middle', '/middle'),
      example('last', '/last'),
    ];
    expect(featuredSimulation(definitions, 0).id).toBe('first');
    expect(featuredSimulation(definitions, 0.55).id).toBe('middle');
    expect(featuredSimulation(definitions, 0.99).id).toBe('last');
    expect(featuredSimulation(definitions, 0.55, 'middle').id).toBe('last');
    expect(featuredSimulation(definitions.slice(0, 1), 0.55, 'first').id).toBe('first');
  });

  it('registers twenty-one distinct living worlds with independent lazy routes', () => {
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
      { id: 'osmotic-glass', path: '/osmotic-glass' },
      { id: 'mitotic-bloom', path: '/mitotic-bloom' },
      { id: 'hyphal-network', path: '/hyphal-network' },
      { id: 'flagellar-drift', path: '/flagellar-drift' },
    ]);
    expect(simulationRoutes(SIMULATIONS)).toHaveLength(21);
  });

  it('requires a world to choose a featured simulation', () => {
    expect(() => featuredSimulation([], 0)).toThrow('must not be empty');
  });
});
