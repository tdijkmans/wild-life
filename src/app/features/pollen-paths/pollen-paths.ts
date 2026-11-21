import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { PollenPathsWorld } from './domain/pollen-paths-world';
import { PollenPathsRenderer } from './rendering/pollen-paths-renderer';

const DEFINITION: WorldExperienceDefinition = {
  number: '014',
  name: 'Pollen Paths',
  tagline: 'A meadow remembers every visit.',
  description:
    'Small differences in floral geometry change where visitors carry pollen. Watch those contacts reshape the meadow over generations.',
  theme: 'forest',
  sceneKicker: 'REPRODUCTIVE ISOLATION',
  soundProfile: 'pollen',
  seed: 15725,
  tools: [
    {
      id: 'sunlight',
      title: 'Sunlight',
      symbol: '☼',
      description: 'Advance local flowering and attract more foraging visits.',
    },
    {
      id: 'rain',
      title: 'Rain',
      symbol: '⋮',
      description: 'Increase local seed establishment after pollen delivery.',
    },
  ],
  primaryHistoryLabel: 'Living plants',
  secondaryHistoryLabel: 'Cross-form deliveries',
  principles: [
    'Contact geometry usually sets which side of a visitor carries each flower’s pollen.',
    'A transfer begins when another flower contacts the same surface. The luminous arc marks the donor and recipient.',
    'Seeds inherit floral shape and pigment from both parents. A few cross-form contacts can connect the lineages.',
  ],
  scientificNote:
    'A biology-inspired model of abstract forms and lineages. Traits, lifetimes, and rates use simulation units.',
  createWorld: (seed) => new PollenPathsWorld(seed),
  soundScene: (scene) => {
    const world = scene as PollenPathsWorld;
    const center =
      world.pollinators.reduce((sum, visitor) => sum + visitor.x, 0) /
      Math.max(1, world.pollinators.length);
    return {
      layers: [
        { level: 0.58 },
        {
          level: world.pollinators.length / 37,
          pan: world.pollinators.length ? (2 * center) / world.width - 1 : 0,
        },
        { level: world.flowers.filter((flower) => world.flowering(flower)).length / 150 },
      ],
      activity: world.deliveries.length / 12,
      detail: world.flowers.filter((flower) => world.flowering(flower)).length / 150,
      pan: ((world.deliveries.at(-1)?.to.x ?? world.width / 2) / world.width) * 2 - 1,
    };
  },
  createRenderer: (canvas, world) => new PollenPathsRenderer(canvas, world as PollenPathsWorld),
};

@Component({
  selector: 'app-pollen-paths',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class PollenPathsComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
