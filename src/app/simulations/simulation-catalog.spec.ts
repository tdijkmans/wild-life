import { featuredSimulation, simulationRoutes, type SimulationDefinition } from './simulation-catalog';

const loader: SimulationDefinition['loadComponent'] = async () => class ExampleComponent {};

function example(
  id: string,
  path: `/${string}`,
  featured = false,
): SimulationDefinition {
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
    expect(simulationRoutes(definitions).map((route) => route.path)).toEqual([
      'first',
      'second',
    ]);
    expect(simulationRoutes(definitions)[0].loadComponent).toBe(loader);
  });

  it('rejects duplicate IDs and paths before Angular sees conflicting routes', () => {
    expect(() => simulationRoutes([example('same', '/a'), example('same', '/b')])).toThrow(
      'Duplicate simulation registration',
    );
    expect(() => simulationRoutes([example('a', '/same'), example('b', '/same')])).toThrow(
      'Duplicate simulation registration',
    );
  });

  it('rejects paths that could conflict with root and wildcard routing', () => {
    expect(() => simulationRoutes([example('root', '/')])).toThrow('Invalid simulation path');
    expect(() => simulationRoutes([example('wildcard', '/**')])).toThrow('Invalid simulation path');
    expect(() => simulationRoutes([example('caps', '/MixedCase')])).toThrow('Invalid simulation path');
  });

  it('selects the configured featured world, not a hardcoded index', () => {
    const definitions = [example('first', '/first'), example('selected', '/selected', true)];
    expect(featuredSimulation(definitions).id).toBe('selected');
    expect(featuredSimulation([example('fallback', '/fallback')]).id).toBe('fallback');
  });

  it('requires a world and disallows multiple featured worlds', () => {
    expect(() => featuredSimulation([])).toThrow('must not be empty');
    expect(() =>
      featuredSimulation([example('a', '/a', true), example('b', '/b', true)]),
    ).toThrow('Only one featured simulation');
  });
});
