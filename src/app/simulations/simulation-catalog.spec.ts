import {
  featuredSimulation,
  simulationRoutes,
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

  it('requires a world and disallows multiple featured worlds', () => {
    expect(() => featuredSimulation([])).toThrow('must not be empty');
    const multipleFeatured = [example('a', '/a', true), example('b', '/b', true)];
    expect(() => featuredSimulation(multipleFeatured)).toThrow('Only one featured simulation');
  });
});
