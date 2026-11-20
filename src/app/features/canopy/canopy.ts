import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { CanopyWorld } from './domain/canopy-world';
import { CanopyRenderer } from './rendering/canopy-renderer';

const CANOPY: WorldExperienceDefinition = {
  number: '004',
  name: 'Canopy',
  tagline: 'A forest unfolding, one leaf at a time.',
  description:
    'Watch living trees grow their branches and leaves, compete for light and recover from insect herbivory. Each crown takes shape from accumulated choices, resources and damage.',
  theme: 'forest',
  sceneKicker: 'A FOREST IS NEVER FINISHED',
  soundProfile: 'forest',
  seed: 20261120,
  tools: [
    {
      id: 'rain',
      title: 'Rain',
      symbol: '☂',
      description: 'Bring a pocket of moisture to growing roots.',
    },
    {
      id: 'sunlight',
      title: 'Sunbeam',
      symbol: '☀',
      description: 'Open a gentle shaft of light through the canopy.',
    },
    {
      id: 'wildflowers',
      title: 'Wildflowers',
      symbol: '✳',
      description: 'Create an insect-attracting patch of habitat.',
    },
  ],
  primaryHistoryLabel: 'Living foliage',
  secondaryHistoryLabel: 'Herbivorous insects',
  principles: [
    'Branches grow from the ends of their parents. Leaves expand gradually, depend on light and water, and contribute to each tree’s energy.',
    'Crowns compete for light. Local rain and sunbeams shift which trees grow most quickly; damage weakens photosynthetic capacity.',
    'Independent insects forage among actual leaf positions. They consume foliage, leave visible bite damage and can alter long-term growth and recovery.',
  ],
  scientificNote:
    'Biology-inspired structural growth and herbivory. Branching, shade, water use and insect feeding are deliberately simplified, not a validated forest ecology model.',
  createWorld: (seed) => new CanopyWorld(seed),
  soundScene: (scene) => {
    const world = scene as CanopyWorld;
    return {
      activity: world.insects.length / 65,
      detail: world.trees.reduce((sum, tree) => sum + tree.leaves.length, 0) / 465,
      pan: ((world.fields.at(-1)?.x ?? world.width / 2) / world.width) * 2 - 1,
    };
  },
  createRenderer: (canvas, world) => new CanopyRenderer(canvas, world as CanopyWorld),
};

@Component({
  selector: 'app-canopy',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class CanopyComponent {
  static readonly previewDefinition = CANOPY;
  readonly definition = CANOPY;
}
