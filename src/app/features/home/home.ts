import { NgComponentOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, Type, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DsEyebrowComponent } from '../../shared/design-system/eyebrow/eyebrow';
import { PreviewMetricsStore } from '../../shared/simulation/preview-metrics';
import { FEATURED_SIMULATION, SIMULATIONS } from '../../simulations/simulation-catalog';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgComponentOutlet, DsEyebrowComponent],
  providers: [PreviewMetricsStore],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly simulations = SIMULATIONS;
  readonly featuredSimulation = FEATURED_SIMULATION;
  readonly availableCountLabel = String(SIMULATIONS.length).padStart(2, '0');
  readonly activeWorldsLabel =
    SIMULATIONS.length === 1 ? 'ONE WORLD ACTIVE' : `${SIMULATIONS.length} WORLDS ACTIVE`;
  readonly previewMetrics = inject(PreviewMetricsStore);
  readonly previewComponent = signal<Type<unknown> | null>(null);
  readonly previewUnavailable = signal(false);

  ngOnInit(): void {
    const loader = this.featuredSimulation.preview?.loadComponent;
    if (!loader) return;

    // Neither the ecosystem engine nor its Canvas renderer is imported by Home.
    void loader().then(
      (component) => {
        if (!this.destroyRef.destroyed) this.previewComponent.set(component);
      },
      () => {
        if (!this.destroyRef.destroyed) this.previewUnavailable.set(true);
      },
    );
  }
}
