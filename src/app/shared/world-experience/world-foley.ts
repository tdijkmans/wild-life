import type { WorldAudioCue } from './world-protocol';

export type AudibleEvent = Omit<WorldAudioCue, 'id'>;
type CueKind = AudibleEvent['kind'];

type FoleyLayer = readonly [
  source: 'sine' | 'triangle' | 'noise',
  offset: number,
  duration: number,
  attack: number,
  from: number,
  to: number,
  level: number,
  crest?: number,
];

// Tone pitches are ratios of the event's root. Noise pitches are filter frequencies.
const families = {
  bubbles: [
    ['sine', 0, 0.16, 0.009, 0.64, 1.23, 0.76],
    ['sine', 0.074, 0.13, 0.006, 1.11, 1.64, 0.45],
    ['sine', 0.178, 0.115, 0.007, 0.88, 1.3, 0.27],
  ],
  swoosh: [
    ['noise', 0, 0.84, 0.16, 380, 650, 4.6, 1260],
    ['noise', 0.091, 0.62, 0.2, 220, 344, 2.2],
  ],
  rain: [
    ['noise', 0, 0.8, 0.115, 2400, 1100, 3.1],
    ['noise', 0.041, 0.1, 0.007, 2900, 2250, 2.7],
    ['noise', 0.192, 0.075, 0.006, 4200, 3100, 2.3],
    ['noise', 0.31, 0.09, 0.01, 3300, 2100, 2.5],
  ],
  crackle: [
    ['noise', 0, 0.085, 0.007, 2200, 780, 4.1],
    ['noise', 0.037, 0.074, 0.006, 1740, 620, 3.5],
    ['noise', 0.117, 0.125, 0.01, 2470, 900, 2.8],
    ['noise', 0.192, 0.08, 0.007, 1200, 730, 1.8],
  ],
  click: [
    ['noise', 0, 0.055, 0.004, 3200, 1400, 3.5],
    ['sine', 0, 0.085, 0.004, 1.18, 0.74, 0.66],
    ['sine', 0.05, 0.09, 0.005, 1.6, 1.14, 0.27],
  ],
  split: [
    ['sine', 0, 0.225, 0.038, 0.8, 1.18, 0.52],
    ['noise', 0.098, 0.095, 0.006, 2100, 580, 2.9],
    ['sine', 0.158, 0.225, 0.016, 1.12, 0.8, 0.55],
    ['sine', 0.2, 0.2, 0.018, 1.54, 1.21, 0.34],
  ],
  bloom: [
    ['sine', 0, 0.76, 0.11, 0.64, 1.05, 0.58],
    ['sine', 0.17, 0.6, 0.075, 1.51, 1.65, 0.28],
    ['noise', 0.13, 0.52, 0.09, 950, 1600, 1.45],
  ],
  fading: [
    ['noise', 0, 0.76, 0.11, 1780, 290, 3.3],
    ['sine', 0.025, 0.72, 0.08, 1.12, 0.51, 0.5],
  ],
  splash: [
    ['sine', 0, 0.23, 0.01, 1, 0.34, 0.9],
    ['noise', 0, 0.22, 0.014, 2100, 530, 4.3],
    ['sine', 0.129, 0.14, 0.007, 1.37, 2.02, 0.43],
    ['sine', 0.223, 0.14, 0.01, 1.1, 1.63, 0.29],
  ],
  trill: [
    ['triangle', 0, 0.13, 0.013, 0.8, 0.94, 0.54, 1.34],
    ['sine', 0.093, 0.14, 0.016, 1.06, 0.86, 0.64, 1.55],
    ['triangle', 0.21, 0.145, 0.021, 1.12, 0.65, 0.42, 1.69],
    ['noise', 0.085, 0.16, 0.016, 2700, 1700, 1.3],
  ],
  call: [
    ['triangle', 0, 0.31, 0.035, 0.84, 0.71, 0.68, 1.24],
    ['sine', 0.018, 0.27, 0.025, 1.69, 1.39, 0.25, 2.5],
    ['triangle', 0.267, 0.24, 0.026, 0.92, 0.64, 0.36, 1.19],
    ['noise', 0, 0.33, 0.025, 910, 450, 2],
  ],
} as const satisfies Record<string, readonly FoleyLayer[]>;

// Root, time stretch and relative level distinguish events that share a texture.
export const eventSounds: Record<
  CueKind,
  readonly [family: readonly FoleyLayer[], root: number, stretch: number, level: number]
> = {
  rain: [families.rain, 420, 1, 0.62],
  growth: [families.bloom, 360, 1, 0.81],
  rustle: [families.crackle, 250, 1.45, 0.66],
  bubble: [families.bubbles, 320, 1, 0.88],
  shimmer: [families.bloom, 645, 0.68, 0.64],
  bloom: [families.bloom, 440, 1.23, 0.88],
  flow: [families.swoosh, 240, 1, 0.81],
  pulse: [families.click, 350, 1.26, 0.67],
  chorus: [families.trill, 825, 1.48, 0.62],
  hush: [families.fading, 205, 1.35, 0.66],
  reef: [families.bubbles, 380, 1.45, 0.92],
  bleach: [families.fading, 250, 1.3, 0.9],
  graze: [families.crackle, 520, 0.72, 0.61],
  exchange: [families.bubbles, 520, 0.67, 0.75],
  division: [families.split, 460, 1, 0.93],
  'seed-set': [families.click, 690, 1.32, 0.92],
  'low-call': [families.call, 195, 1.13, 0.86],
  'high-call': [families.trill, 590, 0.92, 0.83],
  'hybrid-hatch': [families.bubbles, 560, 1.24, 1],
  'pebble-impact': [families.splash, 148, 1.4, 1],
  'membrane-seal': [families.split, 685, 0.83, 0.8],
  'membrane-rupture': [families.splash, 390, 0.7, 0.86],
  'solute-drop': [families.splash, 470, 0.8, 0.78],
  'pore-crossing': [families.click, 790, 0.8, 0.64],
  apoptosis: [families.fading, 380, 1.53, 0.76],
  'mitotic-phase': [families.click, 620, 0.84, 0.78],
  'hyphal-growth': [families.crackle, 224, 1.8, 0.55],
  'hyphal-fusion': [families.split, 290, 1.37, 0.86],
  'flagellar-mating': [families.trill, 430, 0.91, 0.68],
  'pollen-transfer': [families.click, 920, 0.57, 0.68],
  'paired-call': [families.call, 320, 0.76, 0.77],
  'wing-flutter': [families.swoosh, 330, 0.42, 0.71],
  'hoof-fall': [families.crackle, 260, 1.08, 0.74],
  'food-contact': [families.crackle, 620, 0.55, 0.52],
};

const MIN_EVENT_SPACING = 0.19;
const EVENT_LIFETIME = 1.8;
const MAX_PENDING = 12;

/** Keep different events audible and fold repeated events of the same kind into one accent. */
export class WorldFoleyQueue {
  private readonly pending = new Map<CueKind, { event: AudibleEvent; first: number }>();
  private readonly lastByKind = new Map<CueKind, number>();
  private last = -Infinity;

  add(event: AudibleEvent, now: number): void {
    const previous = this.pending.get(event.kind);
    if (previous && now - previous.first <= EVENT_LIFETIME) {
      if (event.strength > previous.event.strength) previous.event = event;
      return;
    }
    this.pending.delete(event.kind);
    if (this.pending.size >= MAX_PENDING) {
      const oldest = this.pending.keys().next();
      if (!oldest.done) this.pending.delete(oldest.value);
    }
    this.pending.set(event.kind, { event, first: now });
  }

  next(now: number): AudibleEvent | undefined {
    if (now - this.last < MIN_EVENT_SPACING) return;
    for (const [kind, { event, first }] of this.pending) {
      if (now - first > EVENT_LIFETIME) {
        this.pending.delete(kind);
        continue;
      }
      const repeatInterval = kind === 'pore-crossing' || kind === 'pulse' ? 1.35 : 0.85;
      if (now - (this.lastByKind.get(kind) ?? -Infinity) < repeatInterval) continue;
      this.pending.delete(kind);
      this.lastByKind.set(kind, now);
      this.last = now;
      return event;
    }
    return undefined;
  }

  clear(): void {
    this.pending.clear();
    this.lastByKind.clear();
    this.last = -Infinity;
  }
}
