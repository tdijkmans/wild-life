import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { NightChorusWorld } from './domain/night-chorus-world';
import { NightChorusRenderer } from './rendering/night-chorus-renderer';

const DEFINITION: WorldExperienceDefinition = {
  number: '015',
  name: 'Night Chorus',
  tagline: 'One pond, many chances to be heard.',
  description:
    'Two overlapping distributions of call rhythms and listening preferences share a pond. The water carries the evidence of every call.',
  theme: 'twilight',
  sceneKicker: 'REPRODUCTIVE ISOLATION',
  soundProfile: 'pond',
  seed: 45841,
  tools: [
    {
      id: 'warmth',
      title: 'Warmth',
      symbol: '◉',
      description: 'Bring local calling and listening windows forward.',
    },
    {
      id: 'shade',
      title: 'Shade',
      symbol: '◒',
      description: 'Delay local calling and listening windows.',
    },
  ],
  primaryHistoryLabel: 'Active individuals',
  secondaryHistoryLabel: 'Mixed pairings',
  principles: [
    'Individuals inherit call rhythm, listening preference, and when in the cycle they become active.',
    'A listener can pair only with a nearby, active caller. Similar calls are more likely to pass the listener’s preference filter.',
    'Warmth and shade can change which windows overlap. Ripples represent calls; brief connecting lines represent pairings.',
  ],
  scientificNote:
    'A biology-inspired model of abstract forms and lineages. Traits, lifetimes, and rates use simulation units.',
  createWorld: (seed) => new NightChorusWorld(seed),
  soundScene: (scene) => {
    const world = scene as NightChorusWorld;
    return {
      activity: world.voices.filter((voice) => world.time - voice.lastCall < 1.8).length / 12,
      detail: world.pairTraces.length / 8,
      pan: ((world.pairTraces.at(-1)?.caller.x ?? world.width / 2) / world.width) * 2 - 1,
    };
  },
  createRenderer: (canvas, world) => new NightChorusRenderer(canvas, world as NightChorusWorld),
};

@Component({
  selector: 'app-night-chorus',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class NightChorusComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
