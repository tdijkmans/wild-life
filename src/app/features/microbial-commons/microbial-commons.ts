import { Component } from '@angular/core';
import { WorldExperienceComponent } from '../../shared/world-experience/world-experience';
import type { WorldExperienceDefinition } from '../../shared/world-experience/world-protocol';
import { MicrobialCommonsWorld } from './domain/microbial-commons-world';
import { MicrobialCommonsRenderer } from './rendering/microbial-commons-renderer';

const MICROBIAL_COMMONS: WorldExperienceDefinition = {
  number: '008',
  name: 'Microbial Commons',
  tagline: 'Invisible communities. Visible consequences.',
  description:
    'Watch microbial colonies colonize a petri dish through nutrient use, chemical competition and cross-feeding. Cooperative and competing strains shape each other’s future.',
  theme: 'microbial',
  sceneKicker: 'LIFE AT THE EDGE OF VISION',
  soundProfile: 'microbial',
  seed: 20261124,
  tools: [
    {
      id: 'nutrients',
      title: 'Nutrients',
      symbol: '✳',
      description: 'Enrich a local patch of agar without placing new microbes.',
    },
    {
      id: 'oxygen',
      title: 'Oxygen',
      symbol: '◌',
      description: 'Raise oxygen availability around growing colonies.',
    },
    {
      id: 'buffer',
      title: 'Buffer',
      symbol: '≈',
      description: 'Softly neutralize local chemical inhibitors.',
    },
  ],
  primaryHistoryLabel: 'Occupied habitat',
  secondaryHistoryLabel: 'Cross-feeding strains',
  principles: [
    'Three strains reproduce into neighboring empty sites. Producers consume nutrients and release metabolites; cross-feeders depend on products of nearby metabolism.',
    'Competitors consume shared nutrients and release chemical inhibitors. Local resource gradients and evolutionary variation in inhibitor tolerance alter colony edges.',
    'Nutrients, oxygen and buffering change growth opportunities, chemical diffusion and community composition. The resulting patterns are the consequence of local interactions.',
  ],
  scientificNote:
    'A highly simplified, biology-inspired spatial microbial food web. No real species, pathogenic traits, laboratory culturing protocols or validated chemical kinetics are represented.',
  createWorld: (seed) => new MicrobialCommonsWorld(seed),
  createRenderer: (canvas, world) =>
    new MicrobialCommonsRenderer(canvas, world as MicrobialCommonsWorld),
};

@Component({
  selector: 'app-microbial-commons',
  standalone: true,
  imports: [WorldExperienceComponent],
  template: '<app-world-experience [definition]="definition" />',
})
export class MicrobialCommonsComponent {
  readonly definition = MICROBIAL_COMMONS;
}
