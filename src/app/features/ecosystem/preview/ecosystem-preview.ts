import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FrameThrottle } from '../../../shared/simulation/frame-throttle';
import { PreviewMetricsStore } from '../../../shared/simulation/preview-metrics';
import { SimulationRunner } from '../../../shared/simulation/simulation-runner';
import { WorldEngine } from '../domain/engine';
import { WorldRenderer } from '../rendering/renderer';

/**
 * Ecosystem-only preview, loaded lazily from the central simulation catalog.
 * Owns biological execution and Canvas rendering, not homepage layout/navigation.
 */
@Component({
  selector: 'app-ecosystem-preview',
  standalone: true,
  template: '<canvas #previewCanvas aria-hidden="true"></canvas>',
  styleUrl: './ecosystem-preview.css',
})
export class EcosystemPreviewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('previewCanvas', { static: true })
  private previewCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly previewMetrics = inject(PreviewMetricsStore);
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
    this.previewMetrics.reset();
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
    this.previewMetrics.update([
      { label: 'PREY', value: prey, tone: 'mint' },
      { label: 'PREDATORS', value: predators, tone: 'coral' },
    ]);
  }
}
