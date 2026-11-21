import type { CueKind } from './world-foley';
import type { WorldSoundProfile } from './world-protocol';

type Layer = readonly [
  material: 'air' | 'grain' | 'tone',
  frequency: number,
  pan: number,
  level: number,
  modulationHz?: number,
];
type ToolSound = CueKind | readonly [attack: CueKind, dragHz: number];

/**
 * Noise and resonant layers are synthesized locally, with optional amplitude modulation
 * for wingbeats, ripples and swimming strokes. Scene observations drive each layer.
 */
export const audioDesign = {
  ecosystem: {
    layers: [
      ['air', 790, 0, 0.05],
      ['grain', 1900, 0, 0.065, 2.1],
      ['grain', 265, 0, 0.072, 0.7],
    ],
    tools: {
      bloom: 'scatter',
      current: ['leaf', 540],
      heat: 'airy',
      cold: 'descend',
      inspect: 'select',
    },
  },
  sky: {
    layers: [
      ['air', 1600, 0, 0.062],
      ['grain', 875, 0, 0.145, 3.2],
    ],
    tools: { wind: ['flow', 840], thermal: ['thermal', 960], calm: 'soften' },
  },
  meadow: {
    layers: [
      ['air', 680, 0, 0.07],
      ['grain', 285, 0, 0.16, 2.35],
      ['grain', 1420, 0, 0.08, 1.1],
    ],
    tools: { pasture: 'leaf', scent: 'soften', breeze: ['leaf', 920] },
  },
  forest: {
    layers: [
      ['air', 950, 0, 0.1],
      ['grain', 2300, 0, 0.125, 1.8],
      ['tone', 164, 0, 0.014, 8],
    ],
    tools: { rain: 'rain', sunlight: 'airy', wildflowers: 'scatter' },
  },
  abyss: {
    layers: [
      ['air', 390, 0, 0.16, 0.16],
      ['tone', 220, 0, 0.025, 0.6],
      ['grain', 595, 0, 0.063, 2.2],
    ],
    tools: { current: ['flow', 305], upwelling: 'bubble', light: 'shimmer' },
  },
  twilight: {
    layers: [
      ['air', 850, 0, 0.035],
      ['grain', 2080, 0, 0.082, 5.4],
    ],
    tools: { warmth: 'pulse', breeze: ['flow', 910], shade: 'soften' },
  },
  reef: {
    layers: [
      ['air', 590, 0, 0.095, 0.3],
      ['grain', 1950, 0, 0.127, 5],
      ['grain', 680, 0, 0.069, 1.1],
    ],
    tools: { cool: 'descend', nutrients: 'fizz', current: ['flow', 450] },
  },
  microbial: {
    layers: [
      ['grain', 1050, 0, 0.115, 5.2],
      ['grain', 415, 0, 0.09, 1.65],
    ],
    tools: { nutrients: 'dose', oxygen: 'fizz', buffer: 'soften' },
  },
  neural: {
    layers: [
      ['grain', 2260, 0, 0.118, 7.5],
      ['tone', 203, 0, 0.022, 1.8],
    ],
    tools: { stimulus: 'nerve-spike', nourish: 'airy', quiet: 'soften' },
  },
  tissue: {
    layers: [
      ['tone', 144, -0.34, 0.025, 0.23],
      ['tone', 181, 0.34, 0.025, 0.31],
      ['air', 520, 0, 0.075],
    ],
    tools: { growth: 'swell', inhibit: 'descend', renew: 'airy' },
  },
  chromatic: {
    layers: [
      ['tone', 151, -0.58, 0.021, 0.32],
      ['tone', 201, -0.19, 0.021, 0.51],
      ['tone', 231, 0.19, 0.02, 0.27],
      ['tone', 288, 0.58, 0.017, 0.64],
      ['grain', 1350, 0, 0.088, 2.8],
    ],
    tools: { nutrients: 'fizz', mix: ['flow', 690], haven: 'soften' },
  },
  islands: {
    layers: [
      ['air', 770, 0, 0.12, 0.24],
      ['grain', 530, -0.64, 0.11, 0.51],
      ['grain', 1150, 0.64, 0.1, 0.41],
      ['tone', 159, 0, 0.025, 0.28],
    ],
    tools: { bridge: 'passage-open', isolate: 'passage-close', rain: 'rain' },
  },
  vascular: {
    layers: [
      ['air', 530, 0, 0.16],
      ['tone', 191, 0, 0.018],
    ],
    tools: { demand: 'swell', oxygen: 'airy', rest: 'soften' },
  },
  pollen: {
    layers: [
      ['air', 1050, 0, 0.042],
      ['tone', 193, 0, 0.026, 12],
      ['grain', 1900, 0, 0.05, 3.3],
    ],
    tools: { sunlight: 'airy', rain: 'rain' },
  },
  pond: {
    layers: [
      ['air', 680, 0, 0.06],
      ['grain', 1050, 0, 0.062, 0.67],
    ],
    tools: { warmth: 'airy', shade: 'soften' },
  },
  estuary: {
    layers: [
      ['air', 430, 0, 0.11, 0.16],
      ['grain', 575, -0.36, 0.1, 1.8],
      ['grain', 1170, 0.36, 0.09, 2.25],
      ['grain', 790, 0, 0.09, 2],
    ],
    tools: { current: ['flow', 360], shelter: ['soften', 530] },
  },
  membrane: {
    layers: [
      ['air', 635, 0, 0.14, 0.65],
      ['tone', 152, 0, 0.019, 0.9],
    ],
    tools: { swirl: ['flow', 440], pebble: 'membrane-release' },
  },
  osmotic: {
    layers: [
      ['air', 540, -0.65, 0.11],
      ['air', 710, 0.65, 0.11],
      ['tone', 306, 0, 0.015],
    ],
    tools: { stir: ['fiber', 780], solute: 'dose' },
  },
  mitotic: {
    layers: [
      ['air', 525, 0, 0.09],
      ['tone', 153, 0, 0.027, 0.36],
    ],
    tools: { focus: 'select', nutrients: 'fizz', shade: 'soften' },
  },
  hyphal: {
    layers: [
      ['air', 420, 0, 0.085],
      ['grain', 620, 0, 0.15, 0.62],
      ['grain', 1870, 0, 0.061, 2],
    ],
    tools: { food: 'scatter', mist: 'rain' },
  },
  flagellar: {
    layers: [
      ['grain', 1600, -0.4, 0.12, 5],
      ['grain', 990, 0.4, 0.135, 8],
      ['tone', 124, 0, 0.034, 2.1],
    ],
    tools: { food: 'bubble', eddy: ['flow', 550] },
  },
} as const satisfies Record<
  WorldSoundProfile,
  { layers: readonly Layer[]; tools: Readonly<Record<string, ToolSound>> }
>;

export function toolSound(profile: WorldSoundProfile, tool: string): ToolSound | undefined {
  const tools: Readonly<Record<string, ToolSound>> = audioDesign[profile].tools;
  return Object.hasOwn(tools, tool) ? tools[tool] : undefined;
}
