import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { VascularGardenWorld } from './domain/vascular-garden-world';
import { VascularGardenRenderer } from './rendering/vascular-garden-renderer';
const DEFINITION: WorldExperienceDefinition = {
  number: '013',
  name: 'Vascular Garden',
  tagline: 'Life grows toward what is missing.',
  description:
    'A luminous vascular network sprouts toward unmet tissue demand, connects into loops and remodels around flowing blood.',
  theme: 'reef',
  sceneKicker: 'OBSERVE THE UNFOLDING',
  soundProfile: 'vascular',
  seed: 20261129,
  tools: [
    {
      id: 'demand',
      title: 'Metabolic demand',
      symbol: '✳',
      description: 'Increase local tissue demand and growth signaling.',
    },
    {
      id: 'oxygen',
      title: 'Oxygen',
      symbol: '◌',
      description: 'Temporarily supply oxygen to the surrounding tissue.',
    },
    {
      id: 'rest',
      title: 'Rest',
      symbol: '≈',
      description: 'Ease local demand and let tissue recover.',
    },
  ],
  primaryHistoryLabel: 'Vessel segments',
  secondaryHistoryLabel: 'Oxygenation',
  principles: [
    'Pressure differences drive flow through a branching resistance network; connected loops carry perfusion.',
    'Low tissue oxygen raises a growth signal that attracts nearby vessel sprouts.',
    'Flow supports vessel caliber; unused terminal branches may regress. Tissue oxygen feeds back into future growth.',
  ],
  scientificNote:
    'A biology-inspired computational model with simplified rules and accelerated time. It is not a calibrated biological or medical prediction.',
  createWorld: (seed) => new VascularGardenWorld(seed),
  createRenderer: (canvas, world) =>
    new VascularGardenRenderer(canvas, world as VascularGardenWorld),
};
@Component({
  selector: 'app-vascular-garden',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class VascularGardenComponent {
  readonly definition = DEFINITION;
}
