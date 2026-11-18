/** World-neutral interfaces for the shared Aquarium / Laboratory experience. */
export interface WorldMetric {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly tone: 'mint' | 'coral' | 'blue' | 'gold';
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
  readonly description: string;
}

export interface WorldExperienceDefinition {
  readonly number: string;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  readonly theme: 'sky' | 'tundra';
  readonly seed: number;
  readonly tools: readonly WorldTool[];
  readonly primaryHistoryLabel: string;
  readonly secondaryHistoryLabel: string;
  readonly principles: readonly string[];
  readonly scientificNote: string;
  createWorld(seed: number): InteractiveWorld;
  createRenderer(canvas: HTMLCanvasElement, world: InteractiveWorld): WorldCanvasRenderer;
}
