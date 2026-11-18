import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorldEngine } from '../ecosystem/domain/engine';
import { WorldRenderer } from '../ecosystem/rendering/renderer';
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
  private frameId = 0;
  private previousTime = 0;
  private accumulated = 0;
  private lastRead = 0;

  ngAfterViewInit(): void {
    this.renderer = new WorldRenderer(this.previewCanvas.nativeElement, this.world);
    this.observer = new ResizeObserver(() => this.renderer?.resize());
    this.observer.observe(this.previewCanvas.nativeElement);
    this.renderer.resize();
    this.updateCounters();
    this.frameId = requestAnimationFrame(this.frame);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.observer?.disconnect();
  }

  private updateCounters(): void {
    const { prey, predators } = this.world.stats();
    this.previewCounts.set({ prey, predators });
  }

  private readonly frame = (time: number): void => {
    if (!document.hidden && this.renderer) {
      const dt = this.previousTime ? Math.min((time - this.previousTime) / 1000, 0.09) : 0;
      this.accumulated += dt;
      let steps = 0;
      while (this.accumulated >= 1 / 60 && steps < 6) {
        this.world.step(1 / 60);
        this.accumulated -= 1 / 60;
        steps++;
      }
      this.renderer.render(time);
      if (time - this.lastRead > 600) {
        this.updateCounters();
        this.lastRead = time;
      }
    }
    this.previousTime = time;
    this.frameId = requestAnimationFrame(this.frame);
  };
}
