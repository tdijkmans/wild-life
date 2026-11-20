import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { MorphogenesisWorld } from './domain/morphogenesis-world';
import { MorphogenesisRenderer } from './rendering/morphogenesis-renderer';
const DEFINITION: WorldExperienceDefinition = {
  number: '010',
  name: 'Morphogenesis',
  tagline: 'A shared beginning. Many possible futures.',
  description:
    'Watch a living sheet of cells grow and differentiate as competing growth factors diffuse through the tissue.',
  theme: 'microbial',
  sceneKicker: 'OBSERVE THE UNFOLDING',
  soundProfile: 'tissue',
  seed: 20261126,
  tools: [
    {
      id: 'growth',
      title: 'Growth factor',
      symbol: '✳',
      description: 'Enrich the local activating morphogen.',
    },
    {
      id: 'inhibit',
      title: 'Counter-signal',
      symbol: '◌',
      description: 'Create a competing differentiation signal.',
    },
    {
      id: 'renew',
      title: 'Renewal',
      symbol: '≈',
      description: 'Support local cell energy and division.',
    },
  ],
  primaryHistoryLabel: 'Cells',
  secondaryHistoryLabel: 'Differentiated',
  principles: [
    'Two diffusing signals form spatial gradients and are reinforced by differentiated cells.',
    'Progenitors gradually commit to a fate after sustained exposure; daughter cells inherit differentiated identity.',
    'Cell spacing, density-limited reproduction, energy and turnover shape the growing tissue.',
  ],
  scientificNote:
    'A biology-inspired computational model with simplified rules and accelerated time. It is not a calibrated biological or medical prediction.',
  createWorld: (seed) => new MorphogenesisWorld(seed),
  createRenderer: (canvas, world) => new MorphogenesisRenderer(canvas, world as MorphogenesisWorld),
};
@Component({
  selector: 'app-morphogenesis',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class MorphogenesisComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
