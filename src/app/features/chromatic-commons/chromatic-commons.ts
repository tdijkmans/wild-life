import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { ChromaticCommonsWorld } from './domain/chromatic-commons-world';
import { ChromaticCommonsRenderer } from './rendering/chromatic-commons-renderer';
const DEFINITION: WorldExperienceDefinition = {
  number: '011',
  name: 'Chromatic Commons',
  tagline: 'Similarity gathers. Difference keeps life moving.',
  description:
    'Four luminous cell populations reproduce, sort through affinity and exchange energy across their shifting boundaries.',
  theme: 'twilight',
  sceneKicker: 'OBSERVE THE UNFOLDING',
  soundProfile: 'chromatic',
  seed: 20261127,
  tools: [
    {
      id: 'nutrients',
      title: 'Nutrients',
      symbol: '✳',
      description: 'Support reproduction in a local resource pocket.',
    },
    {
      id: 'mix',
      title: 'Mixing current',
      symbol: '◌',
      description: 'Gently swirl populations and bring new neighbors together.',
    },
    {
      id: 'haven',
      title: 'Still haven',
      symbol: '≈',
      description: 'Dampen local movement to let clusters settle.',
    },
  ],
  primaryHistoryLabel: 'Cells',
  secondaryHistoryLabel: 'Like neighbors',
  principles: [
    'Short-range repulsion prevents collapse while longer-range affinities draw similar cells together.',
    'Different populations may attract, repel or exchange energy; no cluster boundary is pre-drawn.',
    'Offspring inherit color and slightly varied affinity. Crowding, resources and ageing change the population.',
  ],
  scientificNote:
    'A biology-inspired computational model with simplified rules and accelerated time. It is not a calibrated biological or medical prediction.',
  createWorld: (seed) => new ChromaticCommonsWorld(seed),
  createRenderer: (canvas, world) =>
    new ChromaticCommonsRenderer(canvas, world as ChromaticCommonsWorld),
};
@Component({
  selector: 'app-chromatic-commons',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class ChromaticCommonsComponent {
  readonly definition = DEFINITION;
}
