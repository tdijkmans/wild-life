import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { OsmoticGlassWorld } from './domain/osmotic-glass-world';
import { OsmoticGlassRenderer } from './rendering/osmotic-glass-renderer';

const DEFINITION: WorldExperienceDefinition = {
  number: '018',
  name: 'Osmotic Glass',
  tagline: 'Two chambers, one selective boundary.',
  description:
    'Blue water, gold tracer, and violet solute drift through a two-chamber glass cell. Each molecule follows its own permeability rule.',
  theme: 'abyss',
  sceneKicker: 'LIVING SYSTEMS',
  soundProfile: 'osmotic',
  seed: 73442,
  tools: [
    {
      id: 'stir',
      title: 'Stir',
      symbol: '↻',
      description: 'Drag to mix the molecules near your pointer.',
    },
    {
      id: 'solute',
      title: 'Add solute',
      symbol: '◉',
      description: 'Tap a chamber to add violet solute that stays on that side.',
      gesture: 'press',
    },
  ],
  primaryHistoryLabel: 'Water on left',
  secondaryHistoryLabel: 'Water on right',
  principles: [
    'Brownian motion moves each molecule independently. Water and the small tracer can cross the membrane; the larger violet solute stays behind.',
    'The retained solute biases net water movement toward the more concentrated side. A change in chamber volume adds opposing pressure.',
    'Gold tracer can diffuse in both directions. Water can keep crossing in both directions even when net flow slows.',
  ],
  scientificNote:
    'A two-dimensional particle model of selective permeability and osmotic pressure. Particle sizes and time scales use model units.',
  createWorld: (seed) => new OsmoticGlassWorld(seed),
  createRenderer: (canvas, world) => new OsmoticGlassRenderer(canvas, world as OsmoticGlassWorld),
};

@Component({
  selector: 'app-osmotic-glass',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class OsmoticGlassComponent {
  readonly definition = DEFINITION;
}
