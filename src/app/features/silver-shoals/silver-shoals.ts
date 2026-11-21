import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { SilverShoalsWorld } from './domain/silver-shoals-world';
import { SilverShoalsRenderer } from './rendering/silver-shoals-renderer';

const DEFINITION: WorldExperienceDefinition = {
  number: '016',
  name: 'Silver Shoals',
  tagline: 'A living lineage can end with a hatch.',
  description:
    'Two parent forms gather in tributaries and meet as the tide shifts. Their silver offspring live alongside them and have no descendants.',
  theme: 'reef',
  sceneKicker: 'REPRODUCTIVE ISOLATION',
  soundProfile: 'estuary',
  seed: 90198,
  tools: [
    {
      id: 'current',
      title: 'Tidal current',
      symbol: '≈',
      description: 'Drag to steer local water flow. Tap for an inward current.',
    },
    {
      id: 'shelter',
      title: 'Eddy shelter',
      symbol: '◎',
      description: 'Draw nearby swimmers into a temporary spawning pocket.',
    },
  ],
  primaryHistoryLabel: 'Living swimmers',
  secondaryHistoryLabel: 'Living hybrids',
  principles: [
    'Currents and shelter change where mature parent forms meet. Spawning depends on proximity.',
    'Fish of different parent forms produce silver offspring. The young inherit swimming drive and grow into fully mobile adults.',
    'Silver adults never become parents. The latest hybrid’s two parent IDs remain visible in the Laboratory.',
  ],
  scientificNote:
    'A biology-inspired model of abstract forms and lineages. Traits, lifetimes, and rates use simulation units.',
  createWorld: (seed) => new SilverShoalsWorld(seed),
  soundScene: (scene) => {
    const world = scene as SilverShoalsWorld;
    const schools = (['amber', 'blue', 'hybrid'] as const).map((kind) =>
      world.fish.filter((fish) => fish.lineage === kind),
    );
    return {
      layers: [
        { level: 0.72 },
        ...schools.map((school) => {
          const motion = school.reduce((sum, fish) => sum + Math.hypot(fish.vx, fish.vy), 0);
          const center = school.reduce((sum, fish) => sum + fish.x, 0) / Math.max(1, school.length);
          return { level: motion / 3100, pan: school.length ? (2 * center) / world.width - 1 : 0 };
        }),
      ],
      activity:
        world.fish.reduce((sum, fish) => sum + Math.hypot(fish.vx, fish.vy), 0) /
        Math.max(1, world.fish.length * 70),
      detail: world.fish.filter((fish) => fish.lineage === 'hybrid').length / 28,
    };
  },
  createRenderer: (canvas, world) => new SilverShoalsRenderer(canvas, world as SilverShoalsWorld),
};

@Component({
  selector: 'app-silver-shoals',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class SilverShoalsComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
