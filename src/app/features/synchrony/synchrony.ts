import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { SynchronyWorld } from './domain/synchrony-world';
import { SynchronyRenderer } from './rendering/synchrony-renderer';

const SYNCHRONY: WorldExperienceDefinition = {
  number: '006',
  name: 'Synchrony',
  tagline: 'A thousand rhythms. One luminous conversation.',
  description:
    'Watch living points of light learn to pulse together. Every firefly listens only to nearby neighbors; global waves emerge from their changing local relationships.',
  theme: 'twilight',
  sceneKicker: 'A FOREST LEARNING TO BREATHE',
  soundProfile: 'twilight',
  seed: 20261122,
  tools: [
    {
      id: 'warmth',
      title: 'Warmth',
      symbol: '☼',
      description: 'Raise the local flashing tempo without controlling an insect.',
    },
    {
      id: 'breeze',
      title: 'Breeze',
      symbol: '↝',
      description: 'Gently rearrange who can hear whom through drifting air.',
    },
    {
      id: 'shade',
      title: 'Shade',
      symbol: '◌',
      description: 'Create a quiet pocket with softer local coupling.',
    },
  ],
  primaryHistoryLabel: 'Global phase order',
  secondaryHistoryLabel: 'Local synchrony',
  principles: [
    'Each firefly has its own internal oscillator, inherited frequency and local sensitivity. It senses the flash phases of neighbors, not a central clock.',
    'Local phase coupling can produce synchronized flashes, traveling waves and regions that pulse together, while wind changes the neighborhood network.',
    'Warmth accelerates a region, shade softens coupling and birth introduces small inherited variations. The whole world remains autonomous without interaction.',
  ],
  scientificNote:
    'A Kuramoto-inspired, biology-inspired firefly model. Phase coupling is not a verified species-specific model of synchronous insects or their signaling.',
  createWorld: (seed) => new SynchronyWorld(seed),
  createRenderer: (canvas, world) => new SynchronyRenderer(canvas, world as SynchronyWorld),
};

@Component({
  selector: 'app-synchrony',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class SynchronyComponent {
  readonly definition = SYNCHRONY;
}
