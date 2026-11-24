import type { CueKind } from './world-foley';
import type { WorldSoundProfile } from './world-protocol';

type Bed = 'abyss' | 'shallows' | 'open-air' | 'undergrowth';
type Clip = 'wing-rush' | 'wing-flutter' | 'pebble' | 'splash' | 'bubble' | 'brush';

export type FieldAsset = Bed | Clip;

// Source, playback speed, filter ceiling and relative gain.
export const fieldBeds: Record<WorldSoundProfile, readonly [Bed, number, number, number]> = {
  forest: ['undergrowth', 0.93, 1250, 0.85],
  abyss: ['abyss', 0.89, 560, 1.1],
  sky: ['open-air', 1, 1500, 0.67],
  meadow: ['undergrowth', 0.78, 950, 0.78],
  twilight: ['undergrowth', 0.69, 740, 0.58],
  reef: ['shallows', 1.08, 1120, 0.87],
  microbial: ['abyss', 1.17, 740, 0.65],
  ecosystem: ['open-air', 0.92, 1150, 0.89],
  neural: ['open-air', 0.59, 610, 0.55],
  tissue: ['abyss', 0.78, 580, 0.71],
  chromatic: ['shallows', 0.84, 1000, 0.69],
  islands: ['open-air', 0.86, 1400, 0.84],
  vascular: ['abyss', 1.03, 520, 0.74],
  pollen: ['undergrowth', 1.05, 1400, 0.7],
  pond: ['undergrowth', 0.88, 850, 0.74],
  estuary: ['shallows', 0.86, 910, 0.82],
  membrane: ['shallows', 0.72, 790, 0.56],
  osmotic: ['shallows', 1, 790, 0.65],
  mitotic: ['abyss', 0.94, 635, 0.67],
  hyphal: ['undergrowth', 0.68, 825, 0.72],
  flagellar: ['shallows', 1.13, 1100, 0.72],
};

const tactileSounds: Partial<Record<CueKind, readonly [Clip, number, number]>> = {
  wingbeat: ['wing-rush', 0.92, 0.8],
  'wing-flutter': ['wing-flutter', 0.97, 0.77],
  'pebble-impact': ['splash', 0.86, 1.05],
  'membrane-release': ['pebble', 1.24, 0.6],
  'membrane-rupture': ['pebble', 0.7, 0.8],
  'membrane-seal': ['bubble', 0.82, 0.52],
  bubble: ['bubble', 1, 0.59],
  'hybrid-hatch': ['bubble', 1.16, 0.58],
  'solute-drop': ['splash', 1.28, 0.54],
  'water-transit': ['bubble', 0.92, 0.43],
  leaf: ['brush', 0.92, 0.63],
  rustle: ['brush', 0.82, 0.56],
  'food-contact': ['brush', 1.21, 0.44],
};

export function fieldCue(kind: CueKind) {
  return tactileSounds[kind];
}

export function fieldAssets(profile: WorldSoundProfile): readonly FieldAsset[] {
  const [bed] = fieldBeds[profile];
  const accents: readonly FieldAsset[] =
    profile === 'sky'
      ? ['wing-rush', 'wing-flutter']
      : bed === 'abyss' || bed === 'shallows'
        ? ['bubble', 'pebble', 'splash']
        : ['brush'];
  return [bed, ...accents];
}

export async function decodeFieldAsset(
  context: AudioContext,
  name: FieldAsset,
  signal: AbortSignal,
): Promise<AudioBuffer | undefined> {
  try {
    const url = new URL('audio/field/' + name + '.mp3', document.baseURI);
    const response = await fetch(url, { signal });
    if (response.ok && !signal.aborted) {
      return await context.decodeAudioData(await response.arrayBuffer());
    }
  } catch {
    // Keep the local fallback playable if an asset is unavailable or playback has ended.
  }
  return undefined;
}
