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
  {
    id: 'canopy',
    number: '004',
    name: 'Canopy',
    description:
      'Watch trees branch, leaves unfold and insects consume the growing canopy. Alter rain, light and insect habitat.',
    path: '/canopy',
    tags: ['Forest growth', 'Herbivory', 'Ecology'],
    loadComponent: () => import('../features/canopy/canopy').then((m) => m.CanopyComponent),
  },
  {
    id: 'abyssal-bloom',
    number: '005',
    name: 'Abyssal Bloom',
    description:
      'Dive into a luminous plankton ecosystem shaped by nutrient cycles, grazing and ocean currents.',
    path: '/abyssal-bloom',
    tags: ['Ocean ecology', 'Plankton blooms', 'Nutrient cycles'],
    loadComponent: () =>
      import('../features/abyssal-bloom/abyssal-bloom').then((m) => m.AbyssalBloomComponent),
  },
  {
    id: 'synchrony',
    number: '006',
    name: 'Synchrony',
    description:
      'Hundreds of fireflies gradually synchronize their flashes through local signaling. Shape their rhythms with warmth, breeze and shade.',
    path: '/synchrony',
    tags: ['Synchrony', 'Collective rhythms', 'Emergence'],
    loadComponent: () =>
      import('../features/synchrony/synchrony').then((m) => m.SynchronyComponent),
  },
  {
    id: 'reef',
    number: '007',
    name: 'Reef',
    description:
      'A living coral garden grows, bleaches, recovers and competes with algae while fish graze. Influence the water gently.',
    path: '/reef',
    tags: ['Symbiosis', 'Coral growth', 'Marine ecology'],
    loadComponent: () => import('../features/reef/reef').then((m) => m.ReefComponent),
  },
  {
    id: 'microbial-commons',
    number: '008',
    name: 'Microbial Commons',
    description:
      'Microscopic communities grow, exchange metabolites and compete across an evolving chemical landscape.',
    path: '/microbial-commons',
    tags: ['Cross-feeding', 'Colony growth', 'Microbial ecology'],
    loadComponent: () =>
      import('../features/microbial-commons/microbial-commons').then(
        (m) => m.MicrobialCommonsComponent,
      ),
  },
  {
    id: 'neuroplasticity',
    number: '009',
    name: 'Neuroplasticity',
    description:
      'A luminous neural garden learns through activity, strengthens coactive connections and lets unused pathways fade.',
    path: '/neuroplasticity',
    tags: ['Emergence', 'Interactive', 'Living systems'],
    loadComponent: () =>
      import('../features/neuroplasticity/neuroplasticity').then((m) => m.NeuroplasticityComponent),
  },
  {
    id: 'morphogenesis',
    number: '010',
    name: 'Morphogenesis',
    description:
      'Watch a living sheet of cells grow and differentiate as competing growth factors diffuse through the tissue.',
    path: '/morphogenesis',
    tags: ['Emergence', 'Interactive', 'Living systems'],
    loadComponent: () =>
      import('../features/morphogenesis/morphogenesis').then((m) => m.MorphogenesisComponent),
  },
  {
    id: 'chromatic-commons',
    number: '011',
    name: 'Chromatic Commons',
    description:
      'Four luminous cell populations reproduce, sort through affinity and exchange energy across their shifting boundaries.',
    path: '/chromatic-commons',
    tags: ['Emergence', 'Interactive', 'Living systems'],
    loadComponent: () =>
      import('../features/chromatic-commons/chromatic-commons').then(
        (m) => m.ChromaticCommonsComponent,
      ),
  },
  {
    id: 'island-evolution',
    number: '012',
    name: 'Island Evolution',
    description:
      'Separated island populations inherit and mutate adaptive traits. Local conditions select different descendants; temporary passages restore gene flow.',
    path: '/island-evolution',
    tags: ['Emergence', 'Interactive', 'Living systems'],
    loadComponent: () =>
      import('../features/island-evolution/island-evolution').then(
        (m) => m.IslandEvolutionComponent,
      ),
  },
  {
    id: 'vascular-garden',
    number: '013',
    name: 'Vascular Garden',
    description:
      'A luminous vascular network sprouts toward unmet tissue demand, connects into loops and remodels around flowing blood.',
    path: '/vascular-garden',
    tags: ['Emergence', 'Interactive', 'Living systems'],
    loadComponent: () =>
      import('../features/vascular-garden/vascular-garden').then((m) => m.VascularGardenComponent),
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
