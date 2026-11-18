import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorldEngine } from '../ecosystem/domain/engine';
import { WorldRenderer } from '../ecosystem/rendering/renderer';
import { SimulationRunner } from '../../shared/simulation/simulation-runner';
import { FrameThrottle } from '../../shared/simulation/frame-throttle';
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
  private intersectionObserver?: IntersectionObserver;
  private previewVisible = false;
  private readonly frameThrottle = new FrameThrottle(30);
  private readonly visibilityHandler = () => this.syncPreviewPlayback();
  private readonly runner = new SimulationRunner(this.world, {
    maxFrameSeconds: 0.09,
    maxStepsPerFrame: 6,
    maxAccumulatedSeconds: 0.28,
    isActive: () => this.previewVisible && !document.hidden,
    onFrame: ({ nowMs }) => {
      if (this.frameThrottle.shouldRender(nowMs)) this.renderer?.render(nowMs);
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
    document.addEventListener('visibilitychange', this.visibilityHandler);
    if (typeof IntersectionObserver === 'undefined') {
      // Older embedded browsers can still display the preview without visibility tracking.
      this.previewVisible = true;
      this.syncPreviewPlayback();
    } else {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.previewVisible = entries[0]?.isIntersecting ?? false;
        this.syncPreviewPlayback();
      });
      this.intersectionObserver.observe(this.previewCanvas.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.runner.stop();
    this.observer?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  private syncPreviewPlayback(): void {
    const shouldRun = this.previewVisible && !document.hidden;
    if (shouldRun && !this.runner.isRunning) {
      this.frameThrottle.reset();
      this.lastRead = 0;
      this.runner.start();
    } else if (!shouldRun && this.runner.isRunning) {
      this.runner.stop();
    }
  }

  private updateCounters(): void {
    const { prey, predators } = this.world.stats();
    this.previewCounts.set({ prey, predators });
  }
}
