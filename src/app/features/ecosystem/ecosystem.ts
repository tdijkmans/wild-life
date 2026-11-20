import { WorldSoundscape } from '../../shared/world-experience/world-soundscape';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { WorldEngine, Organism, WorldStats, HistorySample, WorldEvent } from './domain/engine';
import { ExperimentSession, parseExperiment, type ExperimentDocument } from './domain/experiment';
import { WorldRenderer } from './rendering/renderer';
import { drawChart, drawTinyChart } from './rendering/charts';
import { SimulationRunner } from '../../shared/simulation/simulation-runner';
import { DsLiveIndicatorComponent } from '../../shared/design-system/live-indicator/live-indicator';
import { DsButtonComponent } from '../../shared/design-system/button/button';
import { EcosystemTimelineCardComponent } from './components/ecosystem-timeline-card/ecosystem-timeline-card';
import { EcosystemInsightsPanelComponent } from './components/ecosystem-insights-panel/ecosystem-insights-panel';
import {
  AquariumController,
  type DisplayPreset,
} from '../../shared/world-experience/aquarium.controller';
import { AquariumControlsComponent } from '../../shared/world-experience/aquarium-controls';
import { WorldPointerController, type Tool } from './controllers/world-pointer.controller';

@Component({
  selector: 'app-ecosystem',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    DsLiveIndicatorComponent,
    DsButtonComponent,
    EcosystemTimelineCardComponent,
    EcosystemInsightsPanelComponent,
    AquariumControlsComponent,
  ],
  templateUrl: './ecosystem.html',
  styleUrl: './ecosystem.css',
})
export class EcosystemComponent implements AfterViewInit, OnDestroy {
  @ViewChild('worldFrame', { static: true }) worldFrame!: ElementRef<HTMLElement>;
  @ViewChild('worldCanvas', { static: true }) worldCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('aquariumChart') aquariumChart?: ElementRef<HTMLCanvasElement>;
  private popChart?: HTMLCanvasElement;
  private preySpark?: HTMLCanvasElement;
  private predatorSpark?: HTMLCanvasElement;

  private experiment = new ExperimentSession({ seed: 20261116, prey: 210, predators: 18 });
  private world: WorldEngine = this.experiment.world;
  private renderer!: WorldRenderer;
  private resizeObserver?: ResizeObserver;
  private readonly runner = new SimulationRunner(this.experiment, {
    maxFrameSeconds: 0.065,
    maxStepsPerFrame: 18,
    maxAccumulatedSeconds: 0.28,
    isActive: () => !document.hidden,
    onFrame: ({ nowMs, deltaSeconds }) => this.onSimulationFrame(nowMs, deltaSeconds),
  });
  private statsTimer = 0;
  private lastHistorySample?: HistorySample;
  private lastEvent?: WorldEvent;
  readonly stats = signal<WorldStats>(this.world.stats());
  readonly history = signal<HistorySample[]>([...this.world.history]);
  readonly events = signal<WorldEvent[]>([...this.world.events]);
  readonly selected = signal<Organism | null>(null);
  readonly seed = signal(this.world.seed);
  readonly configuredSeed = signal(this.world.seed);
  readonly configuredPrey = signal(210);
  readonly configuredPredators = signal(18);
  readonly experimentBusy = signal(false);
  readonly experimentProgress = signal(0);
  readonly experimentStatus = signal('');
  readonly comparison = signal<{ previous: WorldStats; restored: WorldStats } | null>(null);
  readonly experimentTicks = signal(0);
  private destroyed = false;
  private readonly soundscape = new WorldSoundscape();
  readonly soundEnabled = signal(false);
  readonly soundBusy = signal(false);
  private heardBirths = 0;
  private heardKills = 0;
  private heardInterventions = 0;
  private readonly soundVisibility = () => {
    void this.soundscape.setActive(!document.hidden && !this.paused() && !this.experimentBusy());
  };
  async toggleSound(): Promise<void> {
    if (this.soundBusy()) return;
    this.soundBusy.set(true);
    try {
      if (this.soundEnabled()) {
        this.soundEnabled.set(false);
        await this.soundscape.stop();
      } else {
        this.resetSoundEvents();
        const started = await this.soundscape.start('ecosystem');
        if (this.destroyed) {
          await this.soundscape.stop();
          return;
        }
        this.soundEnabled.set(started);
        this.soundVisibility();
        if (!started) this.experimentStatus.set('Sound is unavailable on this device.');
      }
    } finally {
      this.soundBusy.set(false);
    }
  }
  private resetSoundEvents(): void {
    this.heardBirths = this.world.births;
    this.heardKills = this.world.kills;
    this.heardInterventions = this.experiment.interventions.length;
  }
  private updateSound(now: number): void {
    if (this.soundEnabled() && !this.paused() && !this.experimentBusy()) {
      const actions = this.experiment.interventions;
      if (actions.length > this.heardInterventions) {
        const kind = actions.at(-1)!.kind;
        this.soundscape.cue({
          kind:
            kind === 'bloom'
              ? 'bloom'
              : kind === 'current'
                ? 'flow'
                : kind === 'heat'
                  ? 'shimmer'
                  : 'hush',
          strength: 0.35,
        });
      } else if (this.world.kills > this.heardKills)
        this.soundscape.cue({ kind: 'rustle', strength: 0.28 });
      else if (this.world.births > this.heardBirths)
        this.soundscape.cue({ kind: 'growth', strength: 0.3 });
      this.soundscape.modulate(now);
    }
    this.resetSoundEvents();
  }
  readonly mode = signal<Tool>('bloom');
  readonly chartMode = signal<'population' | 'traits'>('population');
  readonly paused = signal(false);
  readonly speed = signal(1);
  readonly showGuide = signal(false);
  readonly interaction = signal('Leave a little life behind.');
  readonly zoomLevel = signal(1);
  private readonly aquarium = new AquariumController(
    {
      onEnter: () => {
        this.showGuide.set(false);
        this.closeInspector();
      },
      onExit: () => this.pointerController.reset(),
      onInteractionDisabled: () => {
        this.pointerController.reset();
        this.closeInspector();
      },
      onResize: () => this.onResize(),
      onDisplayChanged: () => requestAnimationFrame(() => this.paintCharts()),
    },
    [
      { id: 'population', title: 'Populations', subtitle: 'Grazers and hunters', glance: true },
      { id: 'evolution', title: 'Evolution', subtitle: 'Genes and generation' },
      { id: 'timeline', title: 'Live graph', subtitle: 'Population history' },
      { id: 'journal', title: 'Field journal', subtitle: 'Recent events' },
    ],
  );
  readonly aquariumMode = this.aquarium.active;
  readonly aquariumSettingsOpen = this.aquarium.settingsOpen;
  readonly aquariumIdle = this.aquarium.idle;
  readonly aquariumInteract = this.aquarium.interactionEnabled;
  readonly aquariumPreset = this.aquarium.preset;
  readonly aquariumCards = this.aquarium.cards;
  readonly aquariumCardOptions = this.aquarium.cardOptions;

  readonly tools: {
    id: Tool;
    icon: string;
    name: string;
    shortcut: string;
    description: string;
    color: string;
  }[] = [
    {
      id: 'bloom',
      icon: '✳',
      name: 'Grow',
      shortcut: '1',
      description: 'Plant a bloom of food',
      color: 'mint',
    },
    {
      id: 'current',
      icon: '↝',
      name: 'Flow',
      shortcut: '2',
      description: 'Sculpt the current',
      color: 'blue',
    },
    {
      id: 'heat',
      icon: '☀',
      name: 'Warm',
      shortcut: '3',
      description: 'Create a warm pocket',
      color: 'coral',
    },
    {
      id: 'cold',
      icon: '❄',
      name: 'Cool',
      shortcut: '4',
      description: 'Create a cool pocket',
      color: 'blue',
    },
    {
      id: 'inspect',
      icon: '◎',
      name: 'Inspect',
      shortcut: '5',
      description: 'Read an organism’s DNA',
      color: 'white',
    },
  ];

  readonly aquariumTools = this.tools.map(({ id, name, icon, description }) => ({
    id,
    title: name,
    symbol: icon,
    description,
  }));

  selectAquariumTool(id: string): void {
    const tool = this.tools.find((option) => option.id === id);
    if (tool) this.setMode(tool.id);
  }

  private readonly pointerController = new WorldPointerController({
    getWorld: () => this.world,
    getViewport: () => this.renderer,
    getTool: () => this.mode(),
    isPaused: () => this.paused(),
    canInteract: () => !this.aquariumMode() || this.aquariumInteract(),
    onInspect: (organism) => this.selected.set(organism),
    onZoom: (zoom) => this.zoomLevel.set(zoom),
    onDismissGuide: () => this.showGuide.set(false),
  });

  private readonly keyHandler = (event: KeyboardEvent) => {
    if (this.experimentBusy()) return;
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (event.key.toLowerCase() === 'm' && !event.repeat) {
      event.preventDefault();
      void this.toggleSound();
      return;
    }
    if (event.key.toLowerCase() === 'f' && !event.repeat) {
      event.preventDefault();
      void this.toggleAquarium();
      return;
    }
    if (event.key === 'Escape' && this.aquariumMode() && !this.aquarium.usingNativeFullscreen) {
      this.exitAquarium();
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      this.togglePause();
    } else {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < this.tools.length) this.setMode(this.tools[index].id);
    }
  };

  ngAfterViewInit() {
    this.renderer = new WorldRenderer(this.worldCanvas.nativeElement, this.world);
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.worldCanvas.nativeElement);
    window.addEventListener('keydown', this.keyHandler);
    document.addEventListener('visibilitychange', this.soundVisibility);
    this.aquarium.attach(this.worldFrame.nativeElement);
    this.onResize();
    this.runner.start();
  }
  ngOnDestroy() {
    this.destroyed = true;
    document.removeEventListener('visibilitychange', this.soundVisibility);
    void this.soundscape.stop();
    this.runner.stop();
    this.resizeObserver?.disconnect();
    window.removeEventListener('keydown', this.keyHandler);
    this.aquarium.dispose();
    this.pointerController.reset();
  }

  private onSimulationFrame(now: number, delta: number): void {
    this.renderer.render(now);
    this.updateSound(now);
    this.statsTimer += delta;
    if (this.statsTimer > 0.22) {
      this.statsTimer = 0;
      this.updateUi();
    }
    this.pointerController.tick(delta);
  }
  private updateUi() {
    this.experimentTicks.set(this.experiment.ticks);
    this.stats.set(this.world.stats());
    // Engine history is sampled roughly every 1.1 s, not on every UI refresh.
    // Redrawing the charts every 220 ms repeats the same expensive Canvas work.
    const latestSample = this.world.history.at(-1);
    if (this.lastHistorySample !== latestSample) {
      this.lastHistorySample = latestSample;
      this.history.set([...this.world.history]);
      this.paintCharts();
    }
    const latestEvent = this.world.events[0];
    if (this.lastEvent !== latestEvent) {
      this.lastEvent = latestEvent;
      this.events.set([...this.world.events]);
    }
    this.selected.set(this.world.getSelected());
  }
  private onResize() {
    if (!this.renderer) return;
    this.renderer.resize();
    this.paintCharts();
  }
  private paintCharts() {
    if (!this.popChart) return;
    drawChart(this.popChart, this.world.history, this.chartMode());
    if (this.aquariumMode() && this.aquariumCards()['timeline'] && this.aquariumChart)
      drawChart(this.aquariumChart.nativeElement, this.world.history, 'population');
    if (this.preySpark) drawTinyChart(this.preySpark, this.world.history, 'prey');
    if (this.predatorSpark) drawTinyChart(this.predatorSpark, this.world.history, 'predators');
  }
  onTimelineChartCanvasReady(canvas: HTMLCanvasElement) {
    this.popChart = canvas;
    this.resizeObserver?.observe(canvas);
    this.paintCharts();
  }
  onInsightsSparkCanvasesReady(canvases: { prey: HTMLCanvasElement; predator: HTMLCanvasElement }) {
    this.preySpark = canvases.prey;
    this.predatorSpark = canvases.predator;
    this.resizeObserver?.observe(canvases.prey);
    this.resizeObserver?.observe(canvases.predator);
    this.paintCharts();
  }

  setMode(value: Tool) {
    this.mode.set(value);
    this.selected.set(null);
    this.world.selectedId = null;
    const labels: Record<Tool, string> = {
      bloom: 'Tap or drag to grow new food.',
      current: 'Drag to redirect the current.',
      heat: 'Touch to create a warm pocket.',
      cold: 'Touch to create a cool pocket.',
      inspect: 'Tap an organism to inspect its genes.',
    };
    this.interaction.set(labels[value]);
  }
  setChartMode(value: 'population' | 'traits') {
    this.chartMode.set(value);
    this.paintCharts();
  }
  togglePause() {
    this.runner.setPaused(!this.runner.isPaused);
    this.paused.set(this.runner.isPaused);
    this.soundVisibility();
  }
  cycleSpeed() {
    const current = this.runner.playbackSpeed;
    this.runner.setSpeed(current === 1 ? 2 : current === 2 ? 4 : 1);
    this.speed.set(this.runner.playbackSpeed);
  }
  private installExperiment(session: ExperimentSession, pause = false): void {
    this.experiment = session;
    this.world = session.world;
    this.resetSoundEvents();
    this.renderer.setWorld(this.world);
    this.runner.setWorld(this.experiment);
    this.runner.setPaused(pause);
    this.seed.set(this.world.seed);
    this.configuredSeed.set(session.config.seed);
    this.configuredPrey.set(session.config.prey);
    this.configuredPredators.set(session.config.predators);
    this.selected.set(null);
    this.paused.set(pause);
    this.soundVisibility();
    this.statsTimer = 0;
    this.lastHistorySample = undefined;
    this.lastEvent = undefined;
    this.renderer.zoom = 1;
    this.zoomLevel.set(1);
    this.pointerController.reset();
    this.world.selectedId = null;
    this.updateUi();
  }

  newWorld(): void {
    if (this.experimentBusy()) return;
    this.installExperiment(
      new ExperimentSession({
        seed: Math.floor(Math.random() * 0xffffffff),
        prey: this.configuredPrey(),
        predators: this.configuredPredators(),
      }),
    );
    this.experimentStatus.set('');
    this.comparison.set(null);
    this.interaction.set('An entirely new evolutionary story starts.');
  }

  setExperimentInput(field: 'seed' | 'prey' | 'predators', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (field === 'seed') this.configuredSeed.set(value);
    else if (field === 'prey') this.configuredPrey.set(value);
    else this.configuredPredators.set(value);
  }

  startConfiguredExperiment(): void {
    if (this.experimentBusy()) return;
    try {
      const session = new ExperimentSession({
        seed: this.configuredSeed(),
        prey: this.configuredPrey(),
        predators: this.configuredPredators(),
      });
      this.installExperiment(session);
      this.comparison.set(null);
      this.experimentStatus.set('New deterministic experiment started.');
    } catch (error) {
      this.experimentStatus.set(error instanceof Error ? error.message : 'Invalid configuration');
    }
  }

  saveExperiment(): void {
    if (this.experimentBusy()) return;
    try {
      const experimentDocument = this.experiment.export();
      const blob = new Blob([JSON.stringify(experimentDocument, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `wild-life-seed-${experimentDocument.config.seed}-tick-${experimentDocument.ticks}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.experimentStatus.set('Experiment exported with verification checksum.');
    } catch (error) {
      this.experimentStatus.set(error instanceof Error ? error.message : 'Export failed');
    }
  }

  async loadExperimentFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.experimentBusy()) return;
    if (file.size > 3_000_000) {
      this.experimentStatus.set('Experiment file exceeds the 3 MB limit.');
      return;
    }
    try {
      await this.restoreExperiment(JSON.parse(await file.text()));
    } catch (error) {
      this.experimentStatus.set(error instanceof Error ? error.message : 'Invalid experiment file');
    }
  }

  async replayExperiment(): Promise<void> {
    if (this.experimentBusy()) return;
    await this.restoreExperiment(this.experiment.export());
  }

  private async restoreExperiment(input: unknown): Promise<void> {
    if (this.experimentBusy()) return;
    const wasPaused = this.runner.isPaused;
    this.experimentBusy.set(true);
    this.experimentProgress.set(0);
    this.runner.setPaused(true);
    this.paused.set(true);
    this.soundVisibility();
    let succeeded = false;

    try {
      const document: ExperimentDocument = parseExperiment(input);
      const previous = { ...this.world.stats() };
      const session = await ExperimentSession.replay(
        document,
        () =>
          new Promise<void>((resolve, reject) => {
            if (this.destroyed) reject(new Error('Replay interrupted'));
            else setTimeout(resolve, 0);
          }),
        (fraction) => this.experimentProgress.set(Math.round(fraction * 100)),
      );
      if (this.destroyed) return;
      this.installExperiment(session, true);
      this.comparison.set({ previous, restored: { ...this.world.stats() } });
      this.experimentStatus.set(
        `Replay verified: ${document.ticks} ticks, ${document.interventions.length} interventions.`,
      );
      succeeded = true;
    } catch (error) {
      if (!this.destroyed) {
        this.experimentStatus.set(error instanceof Error ? error.message : 'Replay failed');
      }
    } finally {
      if (!succeeded && !this.destroyed) {
        this.runner.setPaused(wasPaused);
        this.paused.set(wasPaused);
      }
      if (!this.destroyed) {
        this.experimentBusy.set(false);
        this.soundVisibility();
      }
    }
  }
  closeInspector() {
    this.world.selectedId = null;
    this.selected.set(null);
  }
  toggleGuide() {
    this.showGuide.update((p) => !p);
  }

  toggleAquarium(): Promise<void> {
    return this.aquarium.toggle();
  }
  exitAquarium(): void {
    this.aquarium.exit();
  }
  wakeAquarium(): void {
    this.aquarium.wake();
  }
  toggleAquariumSettings(): void {
    this.aquarium.toggleSettings();
  }
  setAquariumPreset(preset: DisplayPreset): void {
    this.aquarium.setPreset(preset);
  }
  toggleAquariumCard(card: string): void {
    this.aquarium.toggleCard(card);
  }
  toggleAquariumInteraction(): void {
    this.aquarium.toggleInteraction();
  }
  onWheel(event: WheelEvent): void {
    this.pointerController.onWheel(event);
  }
  onPointerDown(event: PointerEvent): void {
    this.pointerController.onPointerDown(event);
  }
  onPointerMove(event: PointerEvent): void {
    this.pointerController.onPointerMove(event);
  }
  onPointerUp(event: PointerEvent): void {
    this.pointerController.onPointerUp(event);
  }
  onPointerLeave(): void {
    this.pointerController.onPointerLeave();
  }
  formatGeneration(n: number) {
    return Number.isFinite(n) ? n.toFixed(1) : '—';
  }
  percent(n: number) {
    return Math.round(n * 100);
  }
  get currentTool() {
    return this.tools.find((t) => t.id === this.mode())!;
  }
}
