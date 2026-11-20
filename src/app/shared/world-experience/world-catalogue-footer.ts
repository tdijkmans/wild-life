import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SIMULATIONS } from '../../simulations/simulation-catalog';

@Component({
  selector: 'app-world-catalogue-footer',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './world-catalogue-footer.html',
  styleUrl: './world-catalogue-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldCatalogueFooterComponent {
  readonly worlds = SIMULATIONS;
}
