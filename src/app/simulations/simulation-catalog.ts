import type { Type } from '@angular/core';
import type { Route, Routes } from '@angular/router';

/**
 * Single source of truth for WILD LIFE worlds: cards, navigation, route loaders,
 * featured selection and optional lightweight preview loaders.
 */
export interface SimulationDefinition {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly description: string;
  readonly path: `/${string}`;
  readonly tags: readonly string[];
  readonly featured?: boolean;
  readonly loadComponent: NonNullable<Route['loadComponent']>;
  readonly preview?: {
    readonly title: string;
    readonly loadComponent: () => Promise<Type<unknown>>;
  };
}

export const SIMULATIONS: readonly SimulationDefinition[] = [
  {
    id: 'ecosystem',
    number: '001',
    name: 'Predator–Prey Evolution',
    description:
      'A living ecosystem that feeds, hunts, reproduces and evolves. Alter its environment and watch what emerges.',
    path: '/ecosystem',
    tags: ['Evolution', 'Natural selection', 'Interactive'],
    featured: true,
    loadComponent: () =>
      import('../features/ecosystem/ecosystem').then((m) => m.EcosystemComponent),
    preview: {
      title: 'A living balance.',
      loadComponent: () =>
        import('../features/ecosystem/preview/ecosystem-preview').then(
          (m) => m.EcosystemPreviewComponent,
        ),
    },
  },
  {
    id: 'murmuration',
    number: '002',
    name: 'Murmuration',
    description:
      'Hundreds of autonomous starlings create flowing formations in a living sky. Influence them with breeze, thermals and stillness.',
    path: '/murmuration',
    tags: ['Flocking', 'Collective behavior', 'Air currents'],
    loadComponent: () =>
      import('../features/murmuration/murmuration').then((m) => m.MurmurationComponent),
  },
  {
    id: 'defensive-herd',
    number: '003',
    name: 'Defensive Herd',
    description:
      'Witness a herd gather around its young as predators approach. Encourage protection with pasture, scent and soft wind.',
    path: '/defensive-herd',
    tags: ['Emergence', 'Group defense', 'Ecology'],
    loadComponent: () =>
      import('../features/defensive-herd/defensive-herd').then((m) => m.DefensiveHerdComponent),
  },
];

/** New worlds automatically get lazy-loaded routes from their catalog registration. */
export function simulationRoutes(definitions: readonly SimulationDefinition[]): Routes {
  const paths = new Set<string>();
  const ids = new Set<string>();
  return definitions.map((simulation) => {
    const routePath = simulation.path.slice(1);
    if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(routePath)) {
      throw new Error(`Invalid simulation path: ${simulation.path}`);
    }
    if (paths.has(routePath) || ids.has(simulation.id)) {
      throw new Error(`Duplicate simulation registration: ${simulation.id}`);
    }
    paths.add(routePath);
    ids.add(simulation.id);
    return { path: routePath, loadComponent: simulation.loadComponent };
  });
}

export function featuredSimulation(
  definitions: readonly SimulationDefinition[],
): SimulationDefinition {
  const featured = definitions.find((entry) => entry.featured) ?? definitions[0];
  if (!featured) throw new Error('The WILD LIFE simulation catalog must not be empty');
  if (definitions.filter((entry) => entry.featured).length > 1) {
    throw new Error('Only one featured simulation can be configured');
  }
  return featured;
}

export const FEATURED_SIMULATION = featuredSimulation(SIMULATIONS);
