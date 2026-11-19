import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DsButtonComponent } from '../design-system/button/button';
import { FrameThrottle } from '../simulation/frame-throttle';
import { SimulationRunner } from '../simulation/simulation-runner';
import { WorldSoundscape } from './world-soundscape';
import type {
  InteractiveWorld,
  WorldCanvasRenderer,
  WorldExperienceDefinition,
  WorldMetric,
  WorldHistoryPoint,
} from './world-protocol';

/**
 * Common immersive UI for distinct worlds. Only the world adapter owns the
 * biological rules and Canvas scene; this component owns lifecycle and input.
 */
@Component({
  selector: 'app-world-experience',
  standalone: true,
  imports: [RouterLink, DsButtonComponent],
  templateUrl: './world-experience.html',
  styleUrl: './world-experience.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldExperienceComponent implements AfterViewInit, OnDestroy {
  readonly definition = input.required<WorldExperienceDefinition>();
  @ViewChild('stage', { static: true }) private stage!: ElementRef<HTMLElement>;
  @ViewChild('worldCanvas', { static: true }) private canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('historyCanvas', { static: true })
  private historyCanvas!: ElementRef<HTMLCanvasElement>;

  readonly metrics = signal<readonly WorldMetric[]>([]);
  readonly paused = signal(false);
  readonly soundEnabled = signal(false);
  readonly soundBusy = signal(false);
  readonly speed = signal(1);
  readonly aquarium = signal(false);
  readonly interactionEnabled = signal(false);
  readonly hudVisible = signal(true);
  readonly seed = signal(0);
  readonly seedInput = signal(0);
  readonly status = signal('');
  readonly selectedTool = signal('');
  readonly cursor = signal<{ x: number; y: number } | null>(null);
  readonly activeTool = computed(
    () =>
      this.definition().tools.find((tool) => tool.id === this.selectedTool()) ??
      this.definition().tools[0],
  );

  private world?: InteractiveWorld;
  private renderer?: WorldCanvasRenderer;
  private runner?: SimulationRunner<InteractiveWorld>;
  private observer?: ResizeObserver;
  private drawTimer = 0;
  private latestHistorySample?: WorldHistoryPoint;
  private readonly throttle = new FrameThrottle(60);
  private readonly soundscape = new WorldSoundscape();
  private lastCueId = 0;
  private readonly pointers = new Set<number>();
  private lastPointer: { x: number; y: number; at: number } | null = null;
  private previousBodyOverflow: string | null = null;
  private nativeFullscreen = false;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;

  private readonly onVisibility = (): void => {
    void this.soundscape.setActive(!document.hidden && !this.paused());
  };

  private readonly onKey = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (event.key === 'Escape' && this.aquarium()) {
      this.leaveAquarium();
      return;
    }
    if (event.key.toLowerCase() === 'f' && !event.repeat) {
      event.preventDefault();
      void this.toggleAquarium();
      return;
    }
    if (event.key.toLowerCase() === 'm' && !event.repeat && this.definition().soundProfile) {
      event.preventDefault();
      void this.toggleSound();
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      this.togglePause();
      return;
    }
    const index = Number(event.key) - 1;
    const tool = this.definition().tools[index];
    if (index >= 0 && tool) this.selectedTool.set(tool.id);
  };

  private readonly onFullscreenChange = (): void => {
    if (this.nativeFullscreen && document.fullscreenElement !== this.stage.nativeElement) {
      this.finishAquarium();
    }
    this.scheduleResize();
  };

  ngAfterViewInit(): void {
    this.seed.set(this.definition().seed);
    this.seedInput.set(this.definition().seed);
    this.selectedTool.set(this.definition().tools[0]?.id ?? '');
    this.startWorld(this.definition().seed);
    this.observer = new ResizeObserver(() => this.scheduleResize());
    this.observer.observe(this.canvas.nativeElement);
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.runner?.stop();
    this.observer?.disconnect();
    clearTimeout(this.hideTimer);
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.soundEnabled.set(false);
    void this.soundscape.stop();
    this.pointers.clear();
    if (this.aquarium()) {
      if (document.fullscreenElement === this.stage.nativeElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {});
      }
      this.finishAquarium();
    }
  }

  private startWorld(seed: number): void {
    const world = this.definition().createWorld(seed);
    this.world = world;
    this.lastCueId = world.audioCues?.at(-1)?.id ?? 0;
    this.seed.set(seed);
    this.seedInput.set(seed);
    this.drawTimer = 0;
    this.latestHistorySample = undefined;
    this.throttle.reset();
    this.pointers.clear();
    this.lastPointer = null;
    this.cursor.set(null);
    this.metrics.set(world.metrics());
    if (this.renderer) {
      this.renderer.setWorld(world);
      this.runner?.setWorld(world);
      this.runner?.setPaused(false);
      this.paused.set(false);
      void this.soundscape.setActive(!document.hidden);
      this.renderer.resize();
    } else {
      this.renderer = this.definition().createRenderer(this.canvas.nativeElement, world);
      this.runner = new SimulationRunner(world, {
        maxFrameSeconds: 0.065,
        maxStepsPerFrame: 18,
        maxAccumulatedSeconds: 0.28,
        isActive: () => !document.hidden,
        onFrame: ({ nowMs, deltaSeconds }) => this.onFrame(nowMs, deltaSeconds),
      });
      this.renderer.resize();
      this.runner.start();
    }
    this.drawHistory();
  }

  private onFrame(nowMs: number, deltaSeconds: number): void {
    if (this.throttle.shouldRender(nowMs)) this.renderer?.render(nowMs);
    const cues = this.world?.audioCues;
    if (cues?.length) {
      for (const cue of cues) {
        if (cue.id > this.lastCueId && this.soundEnabled()) this.soundscape.cue(cue);
      }
      this.lastCueId = cues[cues.length - 1].id;
    }
    this.drawTimer += deltaSeconds;
    if (this.drawTimer >= 0.28) {
      this.drawTimer = 0;
      this.metrics.set(this.world?.metrics() ?? []);
      if (this.soundEnabled()) this.soundscape.modulate(nowMs);
      if (this.world && this.latestHistorySample !== this.world.history.at(-1)) {
        this.drawHistory();
      }
    }
  }

  private scheduleResize(): void {
    requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderer?.resize();
      this.drawHistory();
    });
  }

  private drawHistory(): void {
    if (!this.world) return;
    const canvas = this.historyCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const pixelWidth = Math.max(1, Math.round(rect.width * Math.min(2, devicePixelRatio || 1)));
    const pixelHeight = Math.max(1, Math.round(rect.height * Math.min(2, devicePixelRatio || 1)));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    const series = this.world.history;
    this.latestHistorySample = series.at(-1);
    if (series.length < 2) return;
    const padding = 9;
    const plotWidth = pixelWidth - padding * 2;
    const plotHeight = pixelHeight - padding * 2;
    const values = [
      series.map((sample) => sample.primary),
      series.map((sample) => sample.secondary),
    ];
    for (let i = 0; i < 2; i++) {
      const max = Math.max(1, ...values[i]);
      ctx.strokeStyle = i === 0 ? '#8af2d8' : '#f3bb85';
      ctx.lineWidth = Math.max(1, (devicePixelRatio || 1) * 1.4);
      ctx.beginPath();
      values[i].forEach((value, index) => {
        const x = padding + (index / (series.length - 1)) * plotWidth;
        const y = padding + (1 - value / max) * plotHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  updateSeed(event: Event): void {
    this.seedInput.set(Number((event.target as HTMLInputElement).value));
  }

  restartWithSeed(): void {
    const seed = this.seedInput();
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      this.status.set('Enter a valid integer seed between 0 and 4294967295.');
      return;
    }
    this.startWorld(seed);
    this.status.set(`World restarted from seed ${seed}.`);
  }

  newVariation(): void {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    this.startWorld(bytes[0]);
    this.status.set('A new evolutionary story begins.');
  }

  togglePause(): void {
    if (!this.runner) return;
    this.runner.setPaused(!this.runner.isPaused);
    this.paused.set(this.runner.isPaused);
    void this.soundscape.setActive(!this.runner.isPaused && !document.hidden);
  }

  /** Explicit opt-in. Browsers never start AudioContext on page load. */
  async toggleSound(): Promise<void> {
    if (this.soundBusy()) return;
    this.soundBusy.set(true);
    try {
      if (this.soundEnabled()) {
        this.soundEnabled.set(false);
        await this.soundscape.stop();
        return;
      }
      const profile = this.definition().soundProfile;
      if (!profile) return;
      this.lastCueId = this.world?.audioCues?.at(-1)?.id ?? 0;
      const started = await this.soundscape.start(profile);
      if (this.disposed) {
        await this.soundscape.stop();
        return;
      }
      this.soundEnabled.set(started);
      if (!started) {
        this.status.set('Sound is unavailable on this device.');
      } else {
        void this.soundscape.setActive(!this.paused() && !document.hidden);
        this.status.set('Gentle ambient sound enabled. Press M or Sound to mute.');
      }
    } finally {
      this.soundBusy.set(false);
    }
  }

  cycleSpeed(): void {
    if (!this.runner) return;
    const current = this.runner.playbackSpeed;
    const next = current === 1 ? 2 : current === 2 ? 4 : 1;
    this.runner.setSpeed(next);
    this.speed.set(next);
  }

  chooseTool(tool: string): void {
    this.selectedTool.set(tool);
    this.status.set(this.definition().tools.find((item) => item.id === tool)?.description ?? '');
  }

  private toWorld(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const world = this.world!;
    const scale = Math.min(rect.width / world.width, rect.height / world.height) || 1;
    const left = rect.left + (rect.width - world.width * scale) / 2;
    const top = rect.top + (rect.height - world.height * scale) / 2;
    return {
      x: Math.max(0, Math.min(world.width, (event.clientX - left) / scale)),
      y: Math.max(0, Math.min(world.height, (event.clientY - top) / scale)),
    };
  }

  onPointerDown(event: PointerEvent): void {
    this.wakeHud();
    if (!this.world || this.paused() || (this.aquarium() && !this.interactionEnabled())) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.pointers.add(event.pointerId);
    const point = this.toWorld(event);
    this.lastPointer = { ...point, at: event.timeStamp };
    this.world.influence(this.selectedTool(), point.x, point.y, 0, 0);
    if (!this.world.audioCues && this.soundEnabled()) {
      this.soundscape.cue({ kind: 'flow', strength: 0.38 });
    }
  }

  onPointerMove(event: PointerEvent): void {
    const point = this.toWorld(event);
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    this.cursor.set({
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100,
    });
    this.wakeHud();
    if (
      !this.world ||
      !this.pointers.has(event.pointerId) ||
      this.paused() ||
      (this.aquarium() && !this.interactionEnabled())
    )
      return;
    const last = this.lastPointer;
    if (!last) return;
    const distance = Math.hypot(point.x - last.x, point.y - last.y);
    if (distance > 15 || event.timeStamp - last.at > 110) {
      this.world.influence(
        this.selectedTool(),
        point.x,
        point.y,
        point.x - last.x,
        point.y - last.y,
      );
      if (!this.world.audioCues && this.soundEnabled()) {
        this.soundscape.cue({ kind: 'flow', strength: 0.3 });
      }
      this.lastPointer = { ...point, at: event.timeStamp };
    }
  }

  onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    this.lastPointer = null;
  }

  onPointerLeave(): void {
    this.cursor.set(null);
  }

  wakeHud(): void {
    if (!this.aquarium()) return;
    this.hudVisible.set(true);
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hudVisible.set(false), 4300);
  }

  async toggleAquarium(): Promise<void> {
    if (this.aquarium()) {
      this.leaveAquarium();
      return;
    }
    this.aquarium.set(true);
    this.interactionEnabled.set(false);
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.wakeHud();
    const stage = this.stage.nativeElement;
    if (stage.requestFullscreen) {
      try {
        await stage.requestFullscreen();
        this.nativeFullscreen = this.aquarium() && document.fullscreenElement === stage;
      } catch {
        this.nativeFullscreen = false;
      }
    }
    this.scheduleResize();
  }

  leaveAquarium(): void {
    if (!this.aquarium()) return;
    if (document.fullscreenElement === this.stage.nativeElement && document.exitFullscreen) {
      void document.exitFullscreen().then(
        () => this.finishAquarium(),
        () => this.finishAquarium(),
      );
    } else {
      this.finishAquarium();
    }
  }

  private finishAquarium(): void {
    if (!this.aquarium()) return;
    this.aquarium.set(false);
    this.interactionEnabled.set(false);
    this.hudVisible.set(true);
    this.nativeFullscreen = false;
    clearTimeout(this.hideTimer);
    if (this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
    this.pointers.clear();
    this.scheduleResize();
  }

  toggleAquariumInteraction(): void {
    this.interactionEnabled.update((previous) => !previous);
    this.wakeHud();
  }
}
