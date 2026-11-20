/** World-neutral interfaces for the shared Aquarium / Laboratory experience. */
export interface WorldMetric {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly tone: 'mint' | 'coral' | 'blue' | 'gold';
}

export type WorldSoundProfile =
  | 'forest'
  | 'abyss'
  | 'sky'
  | 'meadow'
  | 'twilight'
  | 'reef'
  | 'microbial'
  | 'ecosystem'
  | 'neural'
  | 'tissue'
  | 'chromatic'
  | 'islands'
  | 'vascular'
  | 'pollen'
  | 'pond'
  | 'estuary'
  | 'membrane';

export interface WorldAudioCue {
  readonly id: number;
  readonly kind:
    | 'rain'
    | 'growth'
    | 'rustle'
    | 'bubble'
    | 'shimmer'
    | 'bloom'
    | 'flow'
    | 'pulse'
    | 'chorus'
    | 'hush'
    | 'reef'
    | 'bleach'
    | 'graze'
    | 'exchange'
    | 'division'
    | 'seed-set'
    | 'low-call'
    | 'high-call'
    | 'hybrid-hatch'
    | 'pebble-impact'
    | 'membrane-seal'
    | 'membrane-rupture';
  readonly strength: number;
}

export interface WorldHistoryPoint {
  readonly time: number;
  readonly primary: number;
  readonly secondary: number;
}

export interface InteractiveWorld {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly history: readonly WorldHistoryPoint[];
  /** Optional capped, semantic sound events emitted by the deterministic model. */
  readonly audioCues?: readonly WorldAudioCue[];
  step(dtSeconds: number): void;
  influence(kind: string, x: number, y: number, dx: number, dy: number): void;
  metrics(): readonly WorldMetric[];
}

export interface WorldCanvasRenderer {
  resize(): void;
  render(nowMs: number): void;
  setWorld(world: InteractiveWorld): void;
}

export interface WorldTool {
  readonly id: string;
  readonly title: string;
  readonly symbol: string;
  readonly gesture?: 'press';
  readonly description: string;
}

export interface WorldExperienceDefinition {
  readonly number: string;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  readonly theme: 'sky' | 'tundra' | 'forest' | 'abyss' | 'twilight' | 'reef' | 'microbial';
  readonly sceneKicker?: string;
  readonly soundProfile?: WorldSoundProfile;
  readonly seed: number;
  readonly tools: readonly WorldTool[];
  readonly primaryHistoryLabel: string;
  readonly secondaryHistoryLabel: string;
  readonly principles: readonly string[];
  readonly scientificNote: string;
  createWorld(seed: number): InteractiveWorld;
  createRenderer(canvas: HTMLCanvasElement, world: InteractiveWorld): WorldCanvasRenderer;
}
