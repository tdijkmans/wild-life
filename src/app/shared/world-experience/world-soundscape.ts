import { SeededRandom } from '../simulation/seeded-random';
import type { WorldAudioCue } from './world-protocol';

export type SoundscapeProfile =
  'forest' | 'abyss' | 'sky' | 'meadow' | 'twilight' | 'reef' | 'microbial';

interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

const palettes: Record<
  SoundscapeProfile,
  {
    root: number;
    overtone: number;
    windCutoff: number;
    noiseLevel: number;
  }
> = {
  forest: { root: 75, overtone: 151, windCutoff: 750, noiseLevel: 0.025 },
  abyss: { root: 49, overtone: 96, windCutoff: 270, noiseLevel: 0.027 },
  sky: { root: 83, overtone: 157, windCutoff: 1100, noiseLevel: 0.018 },
  meadow: { root: 69, overtone: 138, windCutoff: 670, noiseLevel: 0.021 },
  twilight: { root: 57, overtone: 114, windCutoff: 580, noiseLevel: 0.016 },
  reef: { root: 65, overtone: 125, windCutoff: 780, noiseLevel: 0.022 },
  microbial: { root: 46, overtone: 109, windCutoff: 310, noiseLevel: 0.012 },
};

/**
 * Original, procedural Web Audio ambience and short event cues.
 *
 * No AudioContext or sound is created until the user explicitly presses Sound.
 * The engine's seeded randomness is unaffected; all sound generation is
 * presentation-only. Disposal closes every audio node with the page.
 */
export class WorldSoundscape {
  private context?: AudioContext;
  private master?: GainNode;
  private filter?: BiquadFilterNode;
  private noise?: AudioBufferSourceNode;
  private readonly voices: Voice[] = [];
  private profile: SoundscapeProfile = 'forest';
  private desiredActive = true;
  private lastCueTime = -Infinity;

  get enabled(): boolean {
    return !!this.context;
  }

  async start(profile: SoundscapeProfile): Promise<boolean> {
    if (this.context) return true;
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return false;
    const context = new AudioContext();
    this.context = context;
    this.profile = profile;
    try {
      const palette = palettes[profile];
      const master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      this.master = master;
      // Multiple quiet layers, not a melody or recorded wildlife calls.
      this.addVoice(context, master, palette.root, 'sine', 0.021);
      this.addVoice(context, master, palette.overtone, 'sine', 0.005);
      const noiseBuffer = context.createBuffer(
        1,
        Math.round(context.sampleRate * 2),
        context.sampleRate,
      );
      const channel = noiseBuffer.getChannelData(0);
      const random = new SeededRandom(0x51ade3);
      for (let i = 0; i < channel.length; i++) channel[i] = random.next() * 2 - 1;
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = palette.windCutoff;
      filter.Q.value = 0.25;
      const noiseGain = context.createGain();
      noiseGain.gain.value = palette.noiseLevel;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start();
      this.noise = noise;
      this.filter = filter;
      master.gain.setTargetAtTime(0.26, context.currentTime, 0.48);
      await context.resume();
      if (!this.desiredActive) await context.suspend();
      return true;
    } catch {
      await this.stop();
      return false;
    }
  }

  private addVoice(
    context: AudioContext,
    destination: GainNode,
    frequency: number,
    type: OscillatorType,
    volume: number,
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();
    this.voices.push({ oscillator, gain });
  }

  /**
   * Sound follows simulation lifecycle. Pausing or hiding the page suspends
   * audio instead of accumulating inaudible events in the background.
   */
  async setActive(active: boolean): Promise<void> {
    if (this.desiredActive === active) return;
    this.desiredActive = active;
    const context = this.context;
    if (!context) return;
    try {
      if (active && context.state === 'suspended') await context.resume();
      else if (!active && context.state === 'running') await context.suspend();
    } catch {
      // An audio device may disappear without affecting the world itself.
    }
  }

  /** A single, gentle synthesized accent. Never changes world state. */
  cue(event: Pick<WorldAudioCue, 'kind' | 'strength'>): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== 'running') return;
    if (context.currentTime - this.lastCueTime < 0.42) return;
    this.lastCueTime = context.currentTime;

    const frequencies: Record<WorldAudioCue['kind'], [number, number]> = {
      rain: [610, 370],
      growth: [430, 630],
      rustle: [230, 170],
      bubble: [170, 350],
      shimmer: [490, 690],
      bloom: [340, 530],
      flow: [260, 210],
      pulse: [290, 380],
      chorus: [355, 445],
      hush: [175, 128],
      reef: [270, 365],
      bleach: [235, 180],
      graze: [550, 415],
      exchange: [440, 570],
      division: [660, 505],
    };
    const [start, end] = frequencies[event.kind];
    const oscillator = context.createOscillator();
    oscillator.type = ['rustle', 'flow', 'graze', 'division'].includes(event.kind)
      ? 'triangle'
      : 'sine';
    oscillator.frequency.setValueAtTime(start, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(30, end),
      context.currentTime + 0.32,
    );
    const envelope = context.createGain();
    const volume = Math.max(0.001, Math.min(0.023, 0.016 * event.strength));
    envelope.gain.setValueAtTime(0.00001, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.035);
    envelope.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.47);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.49);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  /** Slow environmental timbre drift; physics never reads these values. */
  modulate(nowMs: number): void {
    const context = this.context;
    if (!context || !this.filter || context.state !== 'running') return;
    const cutoff = palettes[this.profile].windCutoff;
    const modulation = 0.84 + 0.14 * Math.sin(nowMs * 0.00021);
    this.filter.frequency.setTargetAtTime(cutoff * modulation, context.currentTime, 0.3);
  }

  async stop(): Promise<void> {
    const context = this.context;
    this.context = undefined;
    this.master = undefined;
    this.filter = undefined;
    this.noise = undefined;
    this.voices.length = 0;
    this.lastCueTime = -Infinity;
    if (!context) return;
    try {
      await context.close();
    } catch {
      // Closing is best-effort on an unavailable or already-closed device.
    }
  }
}
