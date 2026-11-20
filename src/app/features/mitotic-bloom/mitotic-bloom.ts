import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { MitoticBloomWorld } from './domain/mitotic-bloom-world';
import { MitoticBloomRenderer } from './rendering/mitotic-bloom-renderer';

const DEFINITION: WorldExperienceDefinition = {
  number: '019',
  name: 'Mitotic Bloom',
  tagline: 'One cell becomes two.',
  description:
    'Watch dividing cells spread into a continuous tissue. As the dish fills, occasional cells break down through apoptosis.',
  theme: 'twilight',
  sceneKicker: 'LIVING SYSTEMS',
  soundProfile: 'mitotic',
  seed: 86281,
  tools: [
    {
      id: 'focus',
      title: 'Focus cell',
      symbol: '◎',
      description: 'Tap a cell to follow its phase. Focus follows one daughter after division.',
      gesture: 'press',
    },
    {
      id: 'nutrients',
      title: 'Nutrients',
      symbol: '✧',
      description: 'Support local progress through the cell cycle.',
    },
    {
      id: 'shade',
      title: 'Shade',
      symbol: '◒',
      description: 'Slow the cycle in a small area.',
    },
  ],
  primaryHistoryLabel: 'Tissue coverage (%)',
  secondaryHistoryLabel: 'Cells in division',
  principles: [
    'Colored sister chromatids condense and line up across the spindle before they separate.',
    'Chromatids gather at opposite poles. The nuclear envelopes return before the cleavage furrow splits the cell.',
    'Each daughter inherits the same chromosome set. Cells spread into open space and reshape against their neighbors.',
    'Crowding slows division. After the dish fills, occasional cells dismantle through apoptosis and open a gap in the tissue.',
  ],
  scientificNote:
    'A stylized animal-like cell cycle. Prometaphase is grouped with prophase, and cycle lengths and tissue geometry use model units.',
  createWorld: (seed) => new MitoticBloomWorld(seed),
  createRenderer: (canvas, world) => new MitoticBloomRenderer(canvas, world as MitoticBloomWorld),
};

@Component({
  selector: 'app-mitotic-bloom',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class MitoticBloomComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
