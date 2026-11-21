import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { IslandEvolutionWorld } from './domain/island-evolution-world';
import { IslandEvolutionRenderer } from './rendering/island-evolution-renderer';
const DEFINITION: WorldExperienceDefinition = {
  number: '012',
  name: 'Island Evolution',
  tagline: 'Distance makes different futures.',
  description:
    'Separated island populations inherit and mutate adaptive traits. Local conditions select different descendants; temporary passages restore gene flow.',
  theme: 'abyss',
  sceneKicker: 'OBSERVE THE UNFOLDING',
  soundProfile: 'islands',
  seed: 20261128,
  tools: [
    {
      id: 'bridge',
      title: 'Passage',
      symbol: '✳',
      description: 'Open a temporary passage between the two nearest islands.',
    },
    {
      id: 'isolate',
      title: 'Isolation',
      symbol: '◌',
      description: 'Close passages connected to the nearest island.',
    },
    {
      id: 'rain',
      title: 'Rainfall',
      symbol: '≈',
      description: 'Replenish local island resources.',
    },
  ],
  primaryHistoryLabel: 'Population',
  secondaryHistoryLabel: 'Trait divergence',
  principles: [
    'All islands begin with similar traits but favor different local adaptations.',
    'Reproduction passes on a mutated trait. Survival and reproductive energy depend on local fitness and food.',
    'Passages permit migration and gene flow. Divergence measures trait separation, not a declaration of new biological species.',
  ],
  scientificNote:
    'A biology-inspired computational model with simplified rules and accelerated time. It is not a calibrated biological or medical prediction.',
  createWorld: (seed) => new IslandEvolutionWorld(seed),
  soundScene: (scene) => {
    const world = scene as IslandEvolutionWorld;
    const islandLevels = world.islands.map((island, i) => ({
      level:
        0.24 +
        world.divergence() * 0.5 +
        world.organisms.filter((animal) => animal.island === i).length / 220,
      pan: (2 * island.x) / world.width - 1,
    }));
    return {
      layers: [{ level: 0.72 }, ...islandLevels],
      activity: world.organisms.length / 220,
      detail: world.divergence() + world.passages.length * 0.16,
    };
  },
  createRenderer: (canvas, world) =>
    new IslandEvolutionRenderer(canvas, world as IslandEvolutionWorld),
};
@Component({
  selector: 'app-island-evolution',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class IslandEvolutionComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
