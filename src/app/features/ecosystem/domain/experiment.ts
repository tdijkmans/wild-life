import { WorldEngine, type WorldIntervention, type WorldStats } from './engine';

export const EXPERIMENT_STEP_SECONDS = 1 / 60;
export const EXPERIMENT_MODEL = 'predator-prey-v1';
const MAX_STEPS = 1_000_000;
const MAX_INTERVENTIONS = 20_000;
const MAX_POSITION = 100_000;

export interface ExperimentConfig {
  readonly seed: number;
  readonly prey: number;
  readonly predators: number;
}

export type RecordedIntervention = WorldIntervention & { readonly tick: number };

export interface ExperimentDocument {
  readonly format: 'wild-life-experiment';
  readonly version: 1;
  readonly model: typeof EXPERIMENT_MODEL;
  readonly config: ExperimentConfig;
  readonly timestep: typeof EXPERIMENT_STEP_SECONDS;
  readonly ticks: number;
  readonly interventions: readonly RecordedIntervention[];
  readonly result: WorldStats;
  readonly checksum: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function finiteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_POSITION;
}

export function validateExperimentConfig(config: ExperimentConfig): ExperimentConfig {
  if (
    !isIntegerInRange(config.seed, 0, 0xffffffff) ||
    !isIntegerInRange(config.prey, 0, 720) ||
    !isIntegerInRange(config.predators, 0, 120)
  ) {
    throw new Error('Invalid experiment seed or initial populations');
  }
  return { seed: config.seed, prey: config.prey, predators: config.predators };
}

function parseIntervention(raw: unknown, maxTick: number): RecordedIntervention {
  if (!isRecord(raw) || !isIntegerInRange(raw.tick, 0, maxTick)) {
    throw new Error('Invalid intervention tick');
  }
  const { kind, tick, x, y } = raw;
  if (!finiteCoordinate(x) || !finiteCoordinate(y)) {
    throw new Error('Invalid intervention coordinates');
  }
  if (kind === 'bloom') {
    if (!isIntegerInRange(raw.amount, 1, 780)) throw new Error('Invalid food quantity');
    return { kind, tick, x, y, amount: raw.amount };
  }
  if (kind === 'current') {
    if (!finiteCoordinate(raw.dx) || !finiteCoordinate(raw.dy) || Math.hypot(raw.dx, raw.dy) < 1) {
      throw new Error('Invalid flow vector');
    }
    return { kind, tick, x, y, dx: raw.dx, dy: raw.dy };
  }
  if (kind === 'heat' || kind === 'cold') return { kind, tick, x, y };
  throw new Error('Unknown intervention type');
}

export function parseExperiment(value: unknown): ExperimentDocument {
  if (!isRecord(value) || value.format !== 'wild-life-experiment' || value.version !== 1) {
    throw new Error('Unsupported experiment file format');
  }
  if (value.model !== EXPERIMENT_MODEL || value.timestep !== EXPERIMENT_STEP_SECONDS) {
    throw new Error('Experiment model or timestep is incompatible');
  }
  if (!isRecord(value.config)) throw new Error('Missing experiment configuration');
  const config = validateExperimentConfig(value.config as unknown as ExperimentConfig);
  if (!isIntegerInRange(value.ticks, 0, MAX_STEPS)) throw new Error('Invalid experiment duration');
  if (!Array.isArray(value.interventions) || value.interventions.length > MAX_INTERVENTIONS) {
    throw new Error('Experiment contains too many interventions');
  }
  const actions: RecordedIntervention[] = [];
  for (const raw of value.interventions) {
    const action = parseIntervention(raw, value.ticks);
    if (actions.length && action.tick < actions[actions.length - 1].tick) {
      throw new Error('Experiment interventions must be chronologically ordered');
    }
    actions.push(action);
  }
  if (!isRecord(value.result) || typeof value.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(value.checksum)) {
    throw new Error('Missing experiment verification data');
  }
  const numeric = Object.values(value.result);
  if (numeric.length !== 13 || numeric.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    throw new Error('Invalid experiment result');
  }
  return {
    format: 'wild-life-experiment',
    version: 1,
    model: EXPERIMENT_MODEL,
    config,
    timestep: EXPERIMENT_STEP_SECONDS,
    ticks: value.ticks,
    interventions: actions,
    result: value.result as unknown as WorldStats,
    checksum: value.checksum,
  };
}

/** Stable 32-bit verification of the entire biological state, not only visible counters. */
export function experimentChecksum(world: WorldEngine): string {
  const serialized = JSON.stringify({
    elapsed: world.elapsed,
    organisms: world.organisms,
    food: world.food,
    patches: world.patches,
    flashes: world.flashes,
    history: world.history,
    events: world.events,
    births: world.births,
    deaths: world.deaths,
    kills: world.kills,
    maxPopulation: world.maxPopulation,
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function applyIntervention(world: WorldEngine, event: RecordedIntervention): void {
  switch (event.kind) {
    case 'bloom':
      world.bloom(event.x, event.y, event.amount);
      break;
    case 'current':
      world.flow(event.x, event.y, event.dx, event.dy);
      break;
    case 'heat':
    case 'cold':
      world.climate(event.x, event.y, event.kind);
      break;
  }
}

/**
 * Wraps the deterministic engine without coupling it to rendering or Angular.
 * Input events are stamped with the **next fixed simulation tick**, not wall-clock time.
 */
export class ExperimentSession {
  readonly world: WorldEngine;
  readonly config: ExperimentConfig;
  readonly interventions: RecordedIntervention[] = [];
  ticks = 0;

  constructor(config: ExperimentConfig, record = true) {
    this.config = validateExperimentConfig(config);
    this.world = new WorldEngine(this.config.seed, this.config.prey, this.config.predators);
    if (record) this.enableRecording();
  }

  private enableRecording(): void {
    this.world.onIntervention = (event) => {
      if (this.interventions.length >= MAX_INTERVENTIONS) {
        throw new Error('Experiment recording limit reached: save and start a new run');
      }
      this.interventions.push({ ...event, tick: this.ticks });
    };
  }

  step(seconds: number): void {
    if (!Number.isFinite(seconds) || Math.abs(seconds - EXPERIMENT_STEP_SECONDS) > 1e-10) {
      throw new RangeError('ExperimentSession requires fixed 60 Hz simulation ticks');
    }
    if (this.ticks >= MAX_STEPS) throw new RangeError('Experiment duration limit reached');
    this.world.step(seconds);
    this.ticks++;
  }

  export(): ExperimentDocument {
    return {
      format: 'wild-life-experiment',
      version: 1,
      model: EXPERIMENT_MODEL,
      config: { ...this.config },
      timestep: EXPERIMENT_STEP_SECONDS,
      ticks: this.ticks,
      interventions: this.interventions.map((event) => ({ ...event })),
      result: { ...this.world.stats() },
      checksum: experimentChecksum(this.world),
    };
  }

  /**
   * Reconstruct and verify every state transition. Optional yielding keeps
   * long browser replays responsive without compromising event ordering.
   */
  static async replay(
    input: unknown,
    yieldControl: () => Promise<void> = async () => {},
    onProgress?: (fraction: number) => void,
  ): Promise<ExperimentSession> {
    const document = parseExperiment(input);
    const session = new ExperimentSession(document.config, false);
    let eventIndex = 0;

    for (let tick = 0; tick <= document.ticks; tick++) {
      while (
        eventIndex < document.interventions.length &&
        document.interventions[eventIndex].tick === tick
      ) {
        applyIntervention(session.world, document.interventions[eventIndex++]);
      }
      if (tick < document.ticks) session.step(EXPERIMENT_STEP_SECONDS);
      if (tick > 0 && tick % 240 === 0) {
        onProgress?.(tick / Math.max(1, document.ticks));
        await yieldControl();
      }
    }

    if (experimentChecksum(session.world) !== document.checksum) {
      throw new Error('Replay verification failed: the reconstructed world differs');
    }
    const actual = session.world.stats();
    for (const key of Object.keys(actual) as (keyof WorldStats)[]) {
      if (actual[key] !== document.result[key]) {
        throw new Error('Replay verification failed: experiment statistics differ');
      }
    }
    session.interventions.push(...document.interventions.map((event) => ({ ...event })));
    session.enableRecording();
    onProgress?.(1);
    return session;
  }
}
