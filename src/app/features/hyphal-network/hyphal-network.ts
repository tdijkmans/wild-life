import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { HyphalNetworkWorld } from './domain/hyphal-network-world';
import { HyphalNetworkRenderer } from './rendering/hyphal-network-renderer';

const DEFINITION: WorldExperienceDefinition = {
  number: '020',
  name: 'Hyphal Network',
  tagline: 'A living network feeds its own edges.',
  description:
    'Hyphal tips extend into the substrate, branch, and sometimes fuse. Watch cytoplasm flow from food-rich regions through connected compartments.',
  theme: 'forest',
  sceneKicker: 'LIVING SYSTEMS',
  soundProfile: 'hyphal',
  seed: 84296,
  tools: [
    {
      id: 'food',
      title: 'Food patch',
      symbol: '✶',
      description: 'Tap to enrich the substrate so connected hyphae can take up more resources.',
      gesture: 'press',
    },
    {
      id: 'mist',
      title: 'Mist',
      symbol: '≋',
      description: 'Increase local conductance so cytoplasm flows more easily through damp hyphae.',
    },
  ],
  primaryHistoryLabel: 'Connected hyphae',
  secondaryHistoryLabel: 'Growing tips',
  principles: [
    'Hyphal compartments stay connected through septal pores. Golden particles follow the direction of calculated flow.',
    'Local uptake supplies pressure to the network, while growing tips draw from it. A well-supplied tip can extend or branch.',
    'When compatible tips encounter existing hyphae they can fuse, opening new routes through the same network.',
  ],
  scientificNote:
    'A coarse-grained, pressure-driven model of cytoplasmic transport in a septate mycelium. Rates and geometry use model units.',
  createWorld: (seed) => new HyphalNetworkWorld(seed),
  soundScene: (scene) => {
    const world = scene as HyphalNetworkWorld;
    return {
      activity: world.hyphae.reduce((sum, edge) => sum + Math.abs(edge.streamingFlux), 0) / 32,
      detail: world.hyphae.filter((edge) => edge.growth < 1).length / 23,
      pan: world.hyphae.reduce((sum, edge) => sum + edge.streamingFlux, 0) / 14,
    };
  },
  createRenderer: (canvas, world) => new HyphalNetworkRenderer(canvas, world as HyphalNetworkWorld),
};

@Component({
  selector: 'app-hyphal-network',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class HyphalNetworkComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
