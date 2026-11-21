import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { NeuroplasticityWorld } from './domain/neuroplasticity-world';
import { NeuroplasticityRenderer } from './rendering/neuroplasticity-renderer';
const DEFINITION: WorldExperienceDefinition = {
  number: '009',
  name: 'Neuroplasticity',
  tagline: 'Pathways remember what passes through them.',
  description:
    'A luminous neural garden learns through activity, strengthens coactive connections and lets unused pathways fade.',
  theme: 'twilight',
  sceneKicker: 'OBSERVE THE UNFOLDING',
  soundProfile: 'neural',
  seed: 20261125,
  tools: [
    {
      id: 'stimulus',
      title: 'Stimulus',
      symbol: '✳',
      description: 'Send a gentle local pulse of activity.',
    },
    {
      id: 'nourish',
      title: 'Nourish',
      symbol: '◌',
      description: 'Support nearby connections as activity unfolds.',
    },
    {
      id: 'quiet',
      title: 'Quiet',
      symbol: '≈',
      description: 'Calm local firing and allow pathways to rest.',
    },
  ],
  primaryHistoryLabel: 'Synapses',
  secondaryHistoryLabel: 'Active neurons',
  principles: [
    'Neurons accumulate input, fire, recover and signal through weighted connections.',
    'Coactive neighbors strengthen their connections; weak pathways prune and nearby coactive neurons may form new links.',
    'Stimulation and quiet change local activity. Learning is a simplified local plasticity rule, without tasks or a central controller.',
  ],
  scientificNote:
    'A biology-inspired computational model with simplified rules and accelerated time. It is not a calibrated biological or medical prediction.',
  createWorld: (seed) => new NeuroplasticityWorld(seed),
  soundScene: (scene) => {
    const world = scene as NeuroplasticityWorld;
    return {
      layers: [
        { level: world.neurons.filter((neuron) => neuron.trace > 0.3).length / 45 },
        { level: world.synapses.reduce((sum, synapse) => sum + synapse.activity, 0) / 140 },
      ],
      activity: world.neurons.filter((neuron) => neuron.trace > 0.3).length / 45,
      detail: world.synapses.reduce((sum, synapse) => sum + synapse.activity, 0) / 140,
    };
  },
  createRenderer: (canvas, world) =>
    new NeuroplasticityRenderer(canvas, world as NeuroplasticityWorld),
};
@Component({
  selector: 'app-neuroplasticity',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class NeuroplasticityComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
