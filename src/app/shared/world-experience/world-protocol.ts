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
  | 'membrane'
  | 'osmotic'
  | 'mitotic'
  | 'hyphal'
  | 'flagellar';

/** Bounded audio-only observations supplied by each world. */
export interface WorldAudioScene {
  readonly activity: number;
  readonly detail: number;
  /** Activity and position of each soundscape layer, in the profile's layer order. */
  readonly layers?: readonly { readonly level: number; readonly pan?: number }[];
  readonly pan?: number;
}

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
    | 'membrane-rupture'
    | 'solute-drop'
    | 'pore-crossing'
    | 'apoptosis'
    | 'mitotic-phase'
    | 'hyphal-growth'
    | 'hyphal-fusion'
    | 'flagellar-mating'
    | 'pollen-transfer'
    | 'paired-call'
    | 'wing-flutter'
    | 'hoof-fall'
    | 'food-contact'
    | 'alarm'
    | 'calf'
    | 'wood'
    | 'leaf'
    | 'wingbeat'
    | 'thermal'
    | 'soften'
    | 'scatter'
    | 'dose'
    | 'fizz'
    | 'airy'
    | 'swell'
    | 'descend'
    | 'select'
    | 'fiber'
    | 'tack'
    | 'snap'
    | 'water-transit'
    | 'tracer-transit'
    | 'flow-settle'
    | 'prophase'
    | 'metaphase'
    | 'anaphase'
    | 'telophase'
    | 'pinch'
    | 'circuit-join'
    | 'circuit-release'
    | 'nerve-spike'
    | 'fate-commit'
    | 'seed-delivery'
    | 'cross-pollen'
    | 'footsteps'
    | 'membrane-release'
    | 'passage-open'
    | 'passage-close'
    | 'migration'
    | 'septum'
    | 'propulsor-change';
  readonly strength: number;
  /** Relative musical pitch and optional destination for travelling cues. */
  readonly pitch?: number;
  readonly panTo?: number;
  readonly call?: 'low-call' | 'high-call';
  /** Optional horizontal location normalized to the stereo field, from -1 to 1. */
  readonly pan?: number;
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
  readonly soundScene?: (world: InteractiveWorld) => WorldAudioScene;
  readonly seed: number;
  readonly tools: readonly WorldTool[];
  readonly primaryHistoryLabel: string;
  readonly secondaryHistoryLabel: string;
  readonly principles: readonly string[];
  readonly scientificNote: string;
  createWorld(seed: number): InteractiveWorld;
  createRenderer(canvas: HTMLCanvasElement, world: InteractiveWorld): WorldCanvasRenderer;
}
