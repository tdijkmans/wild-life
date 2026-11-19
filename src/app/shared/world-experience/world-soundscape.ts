import { SeededRandom } from '../simulation/seeded-random';
import type { WorldAudioCue, WorldSoundProfile } from './world-protocol';

export type SoundscapeProfile = WorldSoundProfile;

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
  ecosystem: { root: 55, overtone: 110, windCutoff: 430, noiseLevel: 0.016 },
  neural: { root: 73.4, overtone: 146.8, windCutoff: 620, noiseLevel: 0.009 },
  tissue: { root: 61.7, overtone: 123.4, windCutoff: 380, noiseLevel: 0.013 },
  chromatic: { root: 82.4, overtone: 164.8, windCutoff: 540, noiseLevel: 0.011 },
  islands: { root: 65.4, overtone: 130.8, windCutoff: 820, noiseLevel: 0.018 },
  vascular: { root: 48.9, overtone: 97.8, windCutoff: 340, noiseLevel: 0.012 },
  pollen: { root: 87, overtone: 139, windCutoff: 1120, noiseLevel: 0.024 },
  pond: { root: 64, overtone: 99, windCutoff: 505, noiseLevel: 0.023 },
  estuary: { root: 43, overtone: 86, windCutoff: 350, noiseLevel: 0.033 },
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
  private eventBus?: GainNode;
  private filter?: BiquadFilterNode;
  private noise?: AudioBufferSourceNode;
  private readonly voices: Voice[] = [];
  private profile: SoundscapeProfile = 'forest';
  private desiredActive = true;
  private lastCueTime = -Infinity;
  private lifecycle: Promise<void> = Promise.resolve();

  get enabled(): boolean {
    return !!this.context;
  }

  async start(profile: SoundscapeProfile): Promise<boolean> {
    if (this.context) return true;
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return false;
    try {
      const context = new AudioContext();
      this.context = context;
      this.profile = profile;
      const palette = palettes[profile];
      const master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      this.master = master;
      // A dark, diffuse tail softens event accents without echoing every action.
      const eventBus = context.createGain();
      eventBus.gain.value = 0.65;
      const tone = context.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 1400;
      eventBus.connect(tone);
      tone.connect(master);
      const reverb = context.createConvolver();
      const impulse = context.createBuffer(
        2,
        Math.round(context.sampleRate * 2.8),
        context.sampleRate,
      );
      const spaceRandom = new SeededRandom(0x7ab19);
      for (let ch = 0; ch < 2; ch++) {
        const samples = impulse.getChannelData(ch);
        for (let i = 0; i < samples.length; i++)
          samples[i] = (spaceRandom.next() * 2 - 1) * Math.pow(1 - i / samples.length, 3.5) * 0.3;
      }
      reverb.buffer = impulse;
      const wet = context.createGain();
      wet.gain.value = 0.32;
      tone.connect(reverb);
      reverb.connect(wet);
      wet.connect(master);
      this.eventBus = eventBus;
      // Multiple quiet layers, not a melody or recorded wildlife calls.
      this.addVoice(context, master, palette.root, 'sine', 0.021);
      this.addVoice(context, master, palette.overtone, 'sine', 0.005);
      this.addVoice(context, master, palette.root * 1.502, 'sine', 0.003);
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
      if (this.context !== context) return false;
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
    this.desiredActive = active;
    const context = this.context;
    if (!context) return;
    // Serialize device transitions: a rapid resume must follow an in-flight pause.
    this.lifecycle = this.lifecycle.then(async () => {
      if (this.context !== context) return;
      try {
        if (this.desiredActive && context.state === 'suspended') await context.resume();
        else if (!this.desiredActive && context.state === 'running') await context.suspend();
      } catch {
        // An audio device may disappear without affecting the world itself.
      }
    });
    await this.lifecycle;
  }

  /** A single, gentle synthesized accent. Never changes world state. */
  cue(event: Pick<WorldAudioCue, 'kind' | 'strength'>): void {
    const context = this.context;
    const master = this.eventBus;
    if (!context || !master || context.state !== 'running') return;
    if (context.currentTime - this.lastCueTime < 1.1) return;
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
      'seed-set': [720, 860],
      'low-call': [285, 220],
      'high-call': [525, 430],
      'hybrid-hatch': [790, 465],
    };
    const [start, end] = frequencies[event.kind];
    const call = event.kind === 'low-call' || event.kind === 'high-call';
    const high = event.kind === 'high-call';
    const count = call ? (high ? 3 : 2) : 1;
    const spacing = high ? 0.17 : 0.34;
    const duration = call ? (high ? 0.13 : 0.28) : 1.6;
    const volume = Math.max(0.001, Math.min(0.016, 0.012 * event.strength));
    const pitch = palettes[this.profile].root / 100;
    const type =
      call || ['rustle', 'flow', 'graze', 'division'].includes(event.kind) ? 'triangle' : 'sine';
    for (let i = 0; i < count; i++) {
      this.playAccent(
        context,
        master,
        context.currentTime + i * spacing,
        start * pitch,
        end * pitch,
        volume,
        duration,
        type,
      );
    }
  }

  private playAccent(
    context: AudioContext,
    destination: GainNode,
    at: number,
    start: number,
    end: number,
    volume: number,
    duration: number,
    type: OscillatorType,
  ): void {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, end), at + duration * 0.56);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.00001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.15, duration * 0.26));
    envelope.gain.exponentialRampToValueAtTime(0.00001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
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
    this.eventBus = undefined;
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
