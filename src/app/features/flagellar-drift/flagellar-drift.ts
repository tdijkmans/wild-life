import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { FlagellarDriftWorld } from './domain/flagellar-drift-world';
import { FlagellarDriftRenderer } from './rendering/flagellar-drift-renderer';

const DEFINITION: WorldExperienceDefinition = {
  number: '021',
  name: 'Flagellar Drift',
  tagline: 'Different strokes, changing lineages.',
  description:
    'Whip-tailed, twin-tailed, and helical flagellates compete for food, mate, and pass on distinctive propulsion traits.',
  theme: 'reef',
  sceneKicker: 'LIVING SYSTEMS',
  soundProfile: 'flagellar',
  seed: 63584,
  tools: [
    {
      id: 'food',
      title: 'Food bloom',
      symbol: '✧',
      description: 'Tap to enrich the area and draw nearby swimmers.',
      gesture: 'press',
    },
    {
      id: 'eddy',
      title: 'Eddy',
      symbol: '↻',
      description: 'Stir a local current. Propulsion forms respond differently to the same flow.',
    },
  ],
  primaryHistoryLabel: 'Living swimmers',
  secondaryHistoryLabel: 'Deepest generation',
  principles: [
    'Single whips are fast, twin tails turn tightly, and helical propulsors resist drift at a higher energy cost.',
    'Fed adults that meet can mate. Their offspring inherit a propulsor from either parent and a blend of both parents’ beat traits.',
    'Mutations can alter beat drive and occasionally change propulsor form. Food and eddies change which traits do well.',
  ],
  scientificNote:
    'Fictional flagellate forms with simplified swimming and sexual inheritance. Propulsion differences are illustrative model rules.',
  createWorld: (seed) => new FlagellarDriftWorld(seed),
  createRenderer: (canvas, world) =>
    new FlagellarDriftRenderer(canvas, world as FlagellarDriftWorld),
};

@Component({
  selector: 'app-flagellar-drift',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class FlagellarDriftComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
