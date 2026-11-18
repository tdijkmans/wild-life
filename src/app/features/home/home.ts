import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorldEngine } from '../ecosystem/domain/engine';
import { WorldRenderer } from '../ecosystem/rendering/renderer';
import { SimulationRunner } from '../../shared/simulation/simulation-runner';
import { SIMULATIONS } from './simulation-catalog';
import { DsEyebrowComponent } from '../../shared/design-system/eyebrow/eyebrow';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DsEyebrowComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('previewCanvas', { static: true })
  private previewCanvas!: ElementRef<HTMLCanvasElement>;
  readonly simulations = SIMULATIONS;
  readonly previewCounts = signal({ prey: 0, predators: 0 });
  private readonly world = new WorldEngine(20261118, 120, 12);
  private renderer?: WorldRenderer;
  private observer?: ResizeObserver;
  private readonly runner = new SimulationRunner(this.world, {
    maxFrameSeconds: 0.09,
    maxStepsPerFrame: 6,
    maxAccumulatedSeconds: 0.28,
    isActive: () => !document.hidden,
    onFrame: ({ nowMs }) => {
      this.renderer?.render(nowMs);
      if (nowMs - this.lastRead >= 600) {
        this.updateCounters();
        this.lastRead = nowMs;
      }
    },
  });
  private lastRead = 0;

  ngAfterViewInit(): void {
    this.renderer = new WorldRenderer(this.previewCanvas.nativeElement, this.world);
    this.observer = new ResizeObserver(() => this.renderer?.resize());
    this.observer.observe(this.previewCanvas.nativeElement);
    this.renderer.resize();
    this.updateCounters();
    this.runner.start();
  }

  ngOnDestroy(): void {
    this.runner.stop();
    this.observer?.disconnect();
  }

  private updateCounters(): void {
    const { prey, predators } = this.world.stats();
    this.previewCounts.set({ prey, predators });
  }
}
