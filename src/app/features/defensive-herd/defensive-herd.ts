import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { DefensiveHerdWorld } from './domain/defensive-herd-world';
import { DefensiveHerdRenderer } from './rendering/defensive-herd-renderer';

const DEFENSIVE_HERD: WorldExperienceDefinition = {
  number: '003',
  name: 'Defensive Herd',
  tagline: 'Safety is a shape they make together.',
  description:
    'A living herd grazes in a moonlit meadow. As predators draw near, adults independently gather around their young. A defensive ring can emerge — but its gaps matter.',
  theme: 'tundra',
  soundProfile: 'meadow',
  seed: 20261119,
  tools: [
    {
      id: 'pasture',
      title: 'Pasture',
      symbol: '✳',
      description: 'Encourage fresh grazing where the herd can find it.',
    },
    {
      id: 'scent',
      title: 'Scent',
      symbol: '〰',
      description: 'Lay a gentle scent field that predators avoid.',
    },
    {
      id: 'breeze',
      title: 'Breeze',
      symbol: '↝',
      description: 'Draw a soft wind that nudges the herd across the meadow.',
    },
  ],
  primaryHistoryLabel: 'Young',
  secondaryHistoryLabel: 'Ring coverage',
  principles: [
    'Adults react individually to nearby young, neighbors and approaching predators. Spacing and outward-facing posture form a ring without predefined positions.',
    'Predators pursue vulnerable animals but can be deterred by adults physically positioned between hunter and calf. Incomplete rings leave openings.',
    'Grass regrows, grazing restores energy, calves mature and new young are born. Gentle scent, wind and pasture changes reshape the encounter.',
  ],
  scientificNote:
    'Biology-inspired herd defense, informed by the protective formations of animals such as musk oxen. The model is stylized and not calibrated to field data; protection depends on simulated interposition.',
  createWorld: (seed) => new DefensiveHerdWorld(seed),
  createRenderer: (canvas, world) => new DefensiveHerdRenderer(canvas, world as DefensiveHerdWorld),
};

@Component({
  selector: 'app-defensive-herd',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class DefensiveHerdComponent {
  static readonly previewDefinition = DEFENSIVE_HERD;
  readonly definition = DEFENSIVE_HERD;
}
