import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { MurmurationWorld } from './domain/murmuration-world';
import { MurmurationRenderer } from './rendering/murmuration-renderer';

const MURMURATION: WorldExperienceDefinition = {
  number: '002',
  name: 'Murmuration',
  tagline: 'One mind, made from hundreds of wings.',
  description:
    'Watch small, independent decisions become sweeping aerial patterns. Starlings follow nearby birds, evade a passing raptor and respond to changes in the air.',
  theme: 'sky',
  soundProfile: 'sky',
  seed: 20261118,
  tools: [
    {
      id: 'wind',
      title: 'Breeze',
      symbol: '↝',
      description: 'Drag to shape a gentle current across the flock.',
    },
    {
      id: 'thermal',
      title: 'Thermal',
      symbol: '☀',
      description: 'Create warm rising air that bends the flight path.',
    },
    {
      id: 'calm',
      title: 'Stillness',
      symbol: '◌',
      description: 'Make a pocket of quieter air without commanding a bird.',
    },
  ],
  primaryHistoryLabel: 'Starlings',
  secondaryHistoryLabel: 'Local cohesion',
  principles: [
    'Each starling aligns with nearby neighbors, moves toward local groups and avoids crowding. No leader controls the flock.',
    'A free-moving raptor introduces risk, causing nearby starlings to scatter and reform through the same individual rules.',
    'Short-lived wind and thermal fields change individual trajectories. Population turnover and inherited flight traits allow the flock to change over time.',
  ],
  scientificNote:
    'Biology-inspired collective-motion model, not a calibrated reproduction of real starling behavior. Visual trails reveal movement; they do not alter the physics.',
  createWorld: (seed) => new MurmurationWorld(seed),
  soundScene: (scene) => {
    const world = scene as MurmurationWorld;
    return {
      activity: world.formation / 100,
      detail: world.meanNeighbors / 18,
      pan:
        world.birds.reduce((sum, bird) => sum + bird.vx, 0) / Math.max(1, world.birds.length * 65),
    };
  },
  createRenderer: (canvas, world) => new MurmurationRenderer(canvas, world as MurmurationWorld),
};

@Component({
  selector: 'app-murmuration',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class MurmurationComponent {
  static readonly previewDefinition = MURMURATION;
  readonly definition = MURMURATION;
}
