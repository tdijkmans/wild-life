import { NgComponentOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, Type, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DsEyebrowComponent } from '../../shared/design-system/eyebrow/eyebrow';
import { PreviewMetricsStore } from '../../shared/simulation/preview-metrics';
import { WorldSoundSettingsComponent } from '../../shared/world-experience/world-sound-settings';
import { FEATURED_WORLD } from '../../simulations/featured-world';
import { SIMULATIONS } from '../../simulations/simulation-catalog';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgComponentOutlet, DsEyebrowComponent, WorldSoundSettingsComponent],
  providers: [PreviewMetricsStore],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly simulations = SIMULATIONS;
  readonly featuredSimulation = inject(FEATURED_WORLD);
  readonly availableCountLabel = String(SIMULATIONS.length).padStart(2, '0');
  readonly activeWorldsLabel =
    SIMULATIONS.length === 1 ? 'ONE WORLD ACTIVE' : `${SIMULATIONS.length} WORLDS ACTIVE`;
  readonly previewMetrics = inject(PreviewMetricsStore);
  readonly previewComponent = signal<Type<unknown> | null>(null);
  readonly previewUnavailable = signal(false);
  readonly previewInputs = signal<Record<string, unknown>>({});

  async ngOnInit(): Promise<void> {
    try {
      const featured = this.featuredSimulation;
      if (featured.preview) {
        const component = await featured.preview.loadComponent();
        if (!this.destroyRef.destroyed) this.previewComponent.set(component);
        return;
      }
      const [world, preview] = await Promise.all([
        featured.loadComponent(),
        import('../../shared/world-experience/world-preview'),
      ]);
      if (this.destroyRef.destroyed) return;
      if (world.previewDefinition) {
        this.previewInputs.set({ definition: world.previewDefinition });
        this.previewComponent.set(preview.WorldPreviewComponent);
      } else {
        this.previewUnavailable.set(true);
      }
    } catch {
      if (!this.destroyRef.destroyed) this.previewUnavailable.set(true);
    }
  }
}
