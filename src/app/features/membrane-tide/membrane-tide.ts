import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { MembraneTideWorld } from './domain/membrane-tide-world';
import { MembraneTideRenderer } from './rendering/membrane-tide-renderer';

const DEFINITION: WorldExperienceDefinition = {
  number: '017',
  name: 'Membrane Tide',
  tagline: 'A boundary takes shape.',
  description:
    'Lipid patches drift, join into double-layered ribbons, and sometimes seal into vesicles. Each boundary begins as an open assembly.',
  theme: 'abyss',
  sceneKicker: 'SELF-ASSEMBLING BILAYERS',
  soundProfile: 'membrane',
  seed: 12,
  tools: [
    {
      id: 'swirl',
      title: 'Swirl',
      symbol: '↻',
      description: 'Drag through the fluid to turn and stretch nearby membranes.',
    },
    {
      id: 'pebble',
      title: 'Pebble',
      symbol: '◆',
      gesture: 'press',
      description: 'Tap to drop a pebble. Its expanding wave may open nearby membranes.',
    },
  ],
  primaryHistoryLabel: 'Sealed vesicles',
  secondaryHistoryLabel: 'All assemblies',
  principles: [
    'Each patch depicts two rows of lipid heads around a shared interior. Aligned exposed ends can join on contact.',
    'Flexible ribbons bend. If their ends meet around a pocket of fluid, they seal it off as a vesicle.',
    'Fluid motion stretches the membranes. A sufficiently uneven pressure wave can open a closed membrane and leave material free to assemble again.',
  ],
  scientificNote:
    'A two-dimensional, coarse-grained model of lipid bilayer assembly. The closed compartments are vesicles, which model the boundary of a cell.',
  createWorld: (seed) => new MembraneTideWorld(seed),
  soundScene: (scene) => {
    const world = scene as MembraneTideWorld;
    return {
      layers: [
        {
          level: 0.3 + world.vortices.length / 7,
          pan: (2 * (world.vortices.at(-1)?.x ?? world.width / 2)) / world.width - 1,
        },
        { level: world.ribbons.filter((ribbon) => ribbon.closed).length / 8 },
      ],
      activity: world.vortices.length / 5 + world.pebbles.length * 0.2,
      detail: world.ribbons.filter((ribbon) => ribbon.closed).length / 9,
      pan: ((world.vortices.at(-1)?.x ?? world.width / 2) / world.width) * 2 - 1,
    };
  },
  createRenderer: (canvas, world) => new MembraneTideRenderer(canvas, world as MembraneTideWorld),
};

@Component({
  selector: 'app-membrane-tide',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class MembraneTideComponent {
  static readonly previewDefinition = DEFINITION;
  readonly definition = DEFINITION;
}
