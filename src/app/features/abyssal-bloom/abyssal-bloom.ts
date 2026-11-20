import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { AbyssalBloomWorld } from './domain/abyssal-bloom-world';
import { AbyssalBloomRenderer } from './rendering/abyssal-bloom-renderer';

const ABYSSAL_BLOOM: WorldExperienceDefinition = {
  number: '005',
  name: 'Abyssal Bloom',
  tagline: 'An entire sea, illuminated by small lives.',
  description:
    'Enter a drifting water column where light, nutrients, microscopic producers and grazers shape waves of bioluminescent life. Currents disperse every bloom and no pattern stays forever.',
  theme: 'abyss',
  sceneKicker: 'LIFE IN THE WATER COLUMN',
  soundProfile: 'abyss',
  seed: 20261121,
  tools: [
    {
      id: 'current',
      title: 'Current',
      symbol: '↝',
      description: 'Drag to redirect the flow of the ocean.',
    },
    {
      id: 'upwelling',
      title: 'Upwelling',
      symbol: '≋',
      description: 'Bring deep nutrients into the illuminated water.',
    },
    {
      id: 'light',
      title: 'Light',
      symbol: '☼',
      description: 'Add a soft shaft of light to the plankton.',
    },
  ],
  primaryHistoryLabel: 'Phytoplankton',
  secondaryHistoryLabel: 'Grazers',
  principles: [
    'Local nutrient concentration and light control phytoplankton energy. Cells drift with simulated currents, reproduce and recycle their biomass.',
    'Independent zooplankton seek living producers, graze and reproduce when conditions support it. A bloom changes the food available to its consumers.',
    'Nutrients diffuse through the water column while gentle currents, upwelling and localized light steer where new blooms form.',
  ],
  scientificNote:
    'An expressive, biology-inspired plankton food web. Bioluminescence, nutrient flux and feeding are stylized; this is not an empirically calibrated deep-sea ecosystem.',
  createWorld: (seed) => new AbyssalBloomWorld(seed),
  soundScene: (scene) => {
    const world = scene as AbyssalBloomWorld;
    return {
      activity: world.grazers.length / 100,
      detail: world.luminousFraction / 100,
      pan: ((world.fields.at(-1)?.x ?? world.width / 2) / world.width) * 2 - 1,
    };
  },
  createRenderer: (canvas, world) => new AbyssalBloomRenderer(canvas, world as AbyssalBloomWorld),
};

@Component({
  selector: 'app-abyssal-bloom',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class AbyssalBloomComponent {
  static readonly previewDefinition = ABYSSAL_BLOOM;
  readonly definition = ABYSSAL_BLOOM;
}
