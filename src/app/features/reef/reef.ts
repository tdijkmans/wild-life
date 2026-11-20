import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { ReefWorld } from './domain/reef-world';
import { ReefRenderer } from './rendering/reef-renderer';

const REEF: WorldExperienceDefinition = {
  number: '007',
  name: 'Reef',
  tagline: 'Every colony is a negotiation with its environment.',
  description:
    'A colorful underwater community grows and changes. Corals branch with help from symbiotic algae, grazing fish restrain algae, and temperature stress can bleach the reef.',
  theme: 'reef',
  sceneKicker: 'THE REEF IS NEVER STILL',
  soundProfile: 'reef',
  seed: 20261123,
  tools: [
    {
      id: 'cool',
      title: 'Cool water',
      symbol: '❄',
      description: 'Reduce local heat stress and give coral symbionts room to recover.',
    },
    {
      id: 'nutrients',
      title: 'Nutrients',
      symbol: '✳',
      description: 'Enrich the water, which can also favor competing algae.',
    },
    {
      id: 'current',
      title: 'Current',
      symbol: '↝',
      description: 'Draw a current through the living reef and its grazers.',
    },
  ],
  primaryHistoryLabel: 'Coral symbiosis',
  secondaryHistoryLabel: 'Algae biomass',
  principles: [
    'Coral colonies physically extend their branches as symbiotic algae and available light support growth. Heat stress makes corals lose symbionts and color.',
    'Algae compete for light and space near corals, while fish actively seek and graze living patches of algae. Predetermined reef animation is never substituted for ecology.',
    'Temperature, nutrients and flow change ecological relationships over time. Cooling can help coral recovery; extra nutrients can also intensify competition.',
  ],
  scientificNote:
    'Biology-inspired coral–algae–grazer ecology. Branching, bleaching thresholds, fish behavior and nutrient effects are intentionally simplified, not field-calibrated reef forecasts.',
  createWorld: (seed) => new ReefWorld(seed),
  soundScene: (scene) => {
    const world = scene as ReefWorld;
    return {
      activity:
        world.fish.length / 36 +
        world.fields.filter((field) => field.kind === 'current').length * 0.1,
      detail: world.meanSymbiosis,
    };
  },
  createRenderer: (canvas, world) => new ReefRenderer(canvas, world as ReefWorld),
};

@Component({
  selector: 'app-reef',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class ReefComponent {
  static readonly previewDefinition = REEF;
  readonly definition = REEF;
}
