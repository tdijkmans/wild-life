import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { SimulationRunner } from '../simulation/simulation-runner';
import { PreviewMetricsStore } from '../simulation/preview-metrics';
import { FrameThrottle } from '../simulation/frame-throttle';
import type { InteractiveWorld, WorldExperienceDefinition } from './world-protocol';

@Component({
  selector: 'app-world-preview',
  template: '<canvas #canvas aria-hidden="true"></canvas>',
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        display: block;
      }
      canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    `,
  ],
})
export class WorldPreviewComponent implements AfterViewInit, OnDestroy {
  readonly definition = input.required<WorldExperienceDefinition>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly metrics = inject(PreviewMetricsStore);
  private readonly throttle = new FrameThrottle(30);
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private runner?: SimulationRunner<InteractiveWorld>;
  private visible = false;
  private lastRead = 0;

  ngAfterViewInit(): void {
    const definition = this.definition();
    const canvas = this.canvas().nativeElement;
    const world = definition.createWorld(definition.seed);
    const renderer = definition.createRenderer(canvas, world);
    const updateMetrics = () => this.metrics.update(world.metrics().slice(0, 2));
    const resize = () => {
      renderer.resize();
      renderer.render(performance.now());
    };
    resize();
    updateMetrics();
    this.runner = new SimulationRunner(world, {
      maxFrameSeconds: 0.09,
      maxStepsPerFrame: 6,
      maxAccumulatedSeconds: 0.28,
      isActive: () => this.visible && !document.hidden,
      onFrame: ({ nowMs }) => {
        if (this.throttle.shouldRender(nowMs)) renderer.render(nowMs);
        if (nowMs - this.lastRead >= 600) {
          updateMetrics();
          this.lastRead = nowMs;
        }
      },
    });
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', this.syncPlayback);
    if (typeof IntersectionObserver === 'undefined') {
      this.visible = true;
      this.syncPlayback();
    } else {
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.visible = entry?.isIntersecting ?? false;
        this.syncPlayback();
      });
      this.intersectionObserver.observe(canvas);
    }
  }

  private readonly syncPlayback = (): void => {
    if (this.visible && !document.hidden && !this.runner?.isRunning) {
      this.throttle.reset();
      this.lastRead = 0;
      this.runner?.start();
    } else if (!this.visible || document.hidden) {
      this.runner?.stop();
    }
  };

  ngOnDestroy(): void {
    this.runner?.stop();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.syncPlayback);
    this.metrics.reset();
  }
}
