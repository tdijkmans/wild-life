import { SeededRandom } from '../simulation/seeded-random';
import { audioDesign, toolSound } from './world-audio-design';
import { DEFAULT_SOUND_LEVELS, type SoundLevels } from './world-audio-volume';
import { createAudioSpace, createEvolvingTexture } from './world-audio-space';
import { eventSounds, WorldFoleyQueue, type AudibleEvent } from './world-foley';
import type { WorldAudioScene, WorldSoundProfile } from './world-protocol';

export type SoundscapeProfile = WorldSoundProfile;

type Motion = 'breath' | 'tide' | 'flutter' | 'pulse' | 'swarm';

type Palette = readonly [
  root: number,
  wash: number,
  grain: number,
  rate: number,
  width: number,
  motion: Motion,
  room: number,
];
const palettes: Record<SoundscapeProfile, Palette> = {
  forest: [75, 750, 1450, 0.27, 0.65, 'flutter', 1.25],
  abyss: [49, 270, 390, 0.14, 0.52, 'tide', 3.1],
  sky: [83, 1100, 1850, 0.38, 0.8, 'swarm', 1.05],
  meadow: [69, 670, 470, 0.21, 0.48, 'pulse', 1.32],
  twilight: [57, 580, 2000, 0.46, 0.65, 'flutter', 1.59],
  reef: [65, 780, 830, 0.24, 0.55, 'tide', 2.55],
  microbial: [46, 310, 590, 0.32, 0.35, 'swarm', 1.38],
  ecosystem: [55, 430, 690, 0.19, 0.7, 'breath', 1.74],
  neural: [73, 620, 2460, 0.86, 0.71, 'flutter', 1.16],
  tissue: [62, 380, 530, 0.16, 0.4, 'breath', 2.44],
  chromatic: [82, 540, 1090, 0.33, 0.73, 'swarm', 1.82],
  islands: [65, 820, 1330, 0.115, 0.83, 'tide', 2.12],
  vascular: [49, 340, 350, 0.18, 0.48, 'tide', 1.39],
  pollen: [87, 1120, 2360, 0.43, 0.81, 'swarm', 0.9],
  pond: [64, 505, 930, 0.15, 0.68, 'breath', 1.87],
  estuary: [43, 350, 620, 0.12, 0.83, 'tide', 3],
  membrane: [58, 437, 715, 0.26, 0.62, 'breath', 2.16],
  osmotic: [61, 575, 1220, 0.73, 0.9, 'flutter', 1.28],
  mitotic: [78, 460, 520, 0.2, 0.38, 'pulse', 2.05],
  hyphal: [47, 745, 441, 0.29, 0.76, 'tide', 2.66],
  flagellar: [64, 830, 1640, 0.61, 0.73, 'swarm', 1.44],
};

interface SpatialLayer {
  gain: GainNode;
  pan: StereoPannerNode;
}

interface NoiseLayer extends SpatialLayer {
  filter: BiquadFilterNode;
}

interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

export function worldOutputGain(percent: number): number {
  return 1.2 * (clamp(percent, 0, 100) / 100) ** 2;
}

/** Procedural sound, driven by read-only scene observations. */
export class WorldSoundscape {
  private context?: AudioContext;
  private master?: GainNode;
  private ambienceVolume?: GainNode;
  private eventsVolume?: GainNode;
  private ambienceDuck?: GainNode;
  private textureBed?: GainNode;
  private mellowWave?: PeriodicWave;
  private eventBus?: GainNode;
  private scenePan = 0;
  private readonly foley = new WorldFoleyQueue();
  private readonly variation = new SeededRandom(0xc1a761);
  private lastGesture = -Infinity;
  private wash?: BiquadFilterNode;
  private grain?: BiquadFilterNode;
  private textureGain?: GainNode;
  private texturePan?: StereoPannerNode;
  private noise?: AudioBuffer;
  private readonly layers: SpatialLayer[] = [];
  private drag?: NoiseLayer;
  private dampening?: { pan: number; until: number };
  private readonly voices: Voice[] = [];
  private profile: SoundscapeProfile = 'forest';
  private desiredActive = true;
  private mix: SoundLevels = DEFAULT_SOUND_LEVELS;
  private lastModulation = -Infinity;
  private phase = 0;
  private lifecycle: Promise<void> = Promise.resolve();

  get enabled(): boolean {
    return !!this.context;
  }

  setMix(levels: SoundLevels): void {
    this.mix = levels;
    if (!levels.master || !levels.events) this.clearCues();
    this.applyMix();
  }

  private applyMix(): void {
    const now = this.context?.currentTime;
    if (now === undefined) return;
    this.master?.gain.setTargetAtTime(worldOutputGain(this.mix.master), now, 0.07);
    this.ambienceVolume?.gain.setTargetAtTime(clamp(this.mix.ambience / 100) ** 1.35, now, 0.09);
    this.eventsVolume?.gain.setTargetAtTime(clamp(this.mix.events / 100) * 1.1, now, 0.07);
  }

  async start(profile: SoundscapeProfile): Promise<boolean> {
    if (this.context) return true;
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return false;
    try {
      const context = new AudioContext();
      this.context = context;
      this.profile = profile;
      const [root, washHz, grainHz, , width, , room] = palettes[profile];
      const master = context.createGain();
      master.gain.value = 0;
      const peakGuard = context.createDynamicsCompressor();
      peakGuard.threshold.value = -13;
      peakGuard.knee.value = 5;
      peakGuard.ratio.value = 16;
      peakGuard.attack.value = 0.003;
      peakGuard.release.value = 0.28;
      master.connect(peakGuard).connect(context.destination);
      this.master = master;

      const ambienceVolume = context.createGain();
      ambienceVolume.gain.value = 0;
      const ambienceDuck = context.createGain();
      ambienceDuck.connect(ambienceVolume).connect(master);
      this.ambienceDuck = ambienceDuck;
      this.ambienceVolume = ambienceVolume;
      const eventsVolume = context.createGain();
      eventsVolume.gain.value = 0;
      eventsVolume.connect(master);
      this.eventsVolume = eventsVolume;

      const eventBus = context.createGain();
      eventBus.gain.value = 0.72;
      const soften = context.createBiquadFilter();
      soften.type = 'highshelf';
      soften.frequency.value = 1700;
      soften.gain.value = -8;
      eventBus.connect(soften).connect(eventsVolume);
      createAudioSpace(context, soften, eventsVolume, room);
      this.eventBus = eventBus;
      this.mellowWave = context.createPeriodicWave(
        new Float32Array(5),
        new Float32Array([0, 1, 0.19, 0.11, 0.032]),
      );

      this.addVoice(context, ambienceDuck, root, 'sine', 0.032);
      this.addVoice(context, ambienceDuck, root * 1.503, 'sine', 0.013);
      this.addVoice(context, ambienceDuck, root * 3.01, 'sine', 0.007);
      const texture = context.createBufferSource();
      texture.buffer = createEvolvingTexture(context, root, width);
      texture.loop = true;
      const textureBed = context.createGain();
      textureBed.gain.value = 0.42;
      texture.connect(textureBed).connect(ambienceDuck);
      texture.start();
      this.textureBed = textureBed;
      const noise = context.createBuffer(1, Math.round(context.sampleRate * 2), context.sampleRate);
      const random = new SeededRandom(0x51ade3);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = random.next() * 2 - 1;
      this.noise = noise;
      const wind = context.createBufferSource();
      wind.buffer = noise;
      wind.loop = true;
      const wash = context.createBiquadFilter();
      wash.type = 'lowpass';
      wash.frequency.value = washHz;
      wash.Q.value = 0.34;
      const washGain = context.createGain();
      washGain.gain.value = 0.028;
      wind.connect(wash).connect(washGain).connect(ambienceDuck);
      this.wash = wash;
      const grain = context.createBiquadFilter();
      grain.type = 'bandpass';
      grain.frequency.value = grainHz;
      grain.Q.value = 0.76;
      const textureGain = context.createGain();
      textureGain.gain.value = 0.05;
      const texturePan = context.createStereoPanner();
      wind.connect(grain).connect(textureGain).connect(texturePan).connect(ambienceDuck);
      this.grain = grain;
      this.textureGain = textureGain;
      this.texturePan = texturePan;
      const dragFilter = context.createBiquadFilter();
      dragFilter.type = 'bandpass';
      dragFilter.Q.value = 0.56;
      const drag = this.spatialLayer(context, dragFilter, soften, 0);
      wind.connect(dragFilter);
      this.drag = { ...drag, filter: dragFilter };
      this.startLayers(context, wind, ambienceDuck);
      wind.start();

      this.applyMix();
      await context.resume();
      if (this.context !== context) return false;
      if (!this.desiredActive) await context.suspend();
      return true;
    } catch {
      await this.stop();
      return false;
    }
  }

  private startLayers(context: AudioContext, wind: AudioBufferSourceNode, master: GainNode): void {
    for (const [material, frequency, pan, , rhythm] of audioDesign[this.profile].layers) {
      let source: AudioNode;
      if (material === 'tone') {
        const resonance = context.createOscillator();
        resonance.type = 'sine';
        resonance.frequency.value = frequency;
        resonance.start();
        source = resonance;
      } else {
        const band = context.createBiquadFilter();
        band.type = material === 'air' ? 'lowpass' : 'bandpass';
        band.frequency.value = frequency * 0.88;
        band.Q.value = material === 'air' ? 0.32 : 1.45;
        wind.connect(band);
        source = band;
      }
      if (rhythm) {
        const tremolo = context.createGain();
        tremolo.gain.value = 0.72;
        const oscillator = context.createOscillator();
        oscillator.frequency.value = rhythm;
        const depth = context.createGain();
        depth.gain.value = 0.13;
        oscillator.connect(depth).connect(tremolo.gain);
        oscillator.start();
        source.connect(tremolo);
        source = tremolo;
      }
      this.layers.push(this.spatialLayer(context, source, master, pan));
    }
  }

  private spatialLayer(
    context: AudioContext,
    source: AudioNode,
    master: GainNode,
    position: number,
  ): SpatialLayer {
    const gain = context.createGain();
    gain.gain.value = 0;
    const pan = context.createStereoPanner();
    pan.pan.value = position;
    source.connect(gain).connect(pan).connect(master);
    return { gain, pan };
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
    oscillator.connect(gain).connect(destination);
    oscillator.start();
    this.voices.push({ oscillator, gain });
  }

  async setActive(active: boolean): Promise<void> {
    this.desiredActive = active;
    if (!active) this.clearCues();
    const context = this.context;
    if (!context) return;
    // A rapid resume must follow an in-flight pause.
    this.lifecycle = this.lifecycle.then(async () => {
      if (this.context !== context) return;
      try {
        if (this.desiredActive && context.state === 'suspended') await context.resume();
        else if (!this.desiredActive && context.state === 'running') await context.suspend();
      } catch {
        // An audio device may disappear without affecting the world.
      }
    });
    await this.lifecycle;
  }

  cue(event: AudibleEvent): void {
    const now = this.playbackTime();
    if (now !== undefined && clamp(event.strength)) this.foley.add(event, now);
  }

  gesture(event: AudibleEvent, dragging: boolean, tool?: string, speed = 0): void {
    const now = this.playbackTime();
    if (now === undefined) return;
    const design = tool ? toolSound(this.profile, tool) : undefined;
    if (dragging && typeof design !== 'string' && design && this.drag) {
      const { gain, pan, filter } = this.drag;
      const movement = clamp(speed);
      const level = gain.gain;
      this.hold(level, now);
      level.setTargetAtTime(0.025 + movement * 0.155, now, 0.05);
      level.setTargetAtTime(0, now + 0.16, 0.16);
      pan.pan.setTargetAtTime(clamp(event.pan ?? 0, -0.85, 0.85), now, 0.075);
      filter.frequency.setTargetAtTime(design[1] * (0.72 + movement * 0.93), now, 0.06);
      return;
    }
    if (now - this.lastGesture < (dragging ? 0.42 : 0.09)) return;
    this.lastGesture = now;
    const kind = typeof design === 'string' ? design : (design?.[0] ?? event.kind);
    if (kind === 'soften') this.dampening = { pan: event.pan ?? 0, until: now + 2.8 };
    this.play({ ...event, kind }, now);
  }

  endGesture(): void {
    const now = this.context?.currentTime;
    const gain = this.drag?.gain.gain;
    if (!gain || now === undefined) return;
    this.hold(gain, now);
    gain.setTargetAtTime(0, now, 0.105);
  }

  private hold(value: AudioParam, now: number): void {
    if (typeof value.cancelAndHoldAtTime === 'function') value.cancelAndHoldAtTime(now);
    else value.cancelScheduledValues(now);
  }

  flushCues(): void {
    const now = this.playbackTime();
    if (now === undefined) return;
    const event = this.foley.next(now);
    if (event) this.play(event, now);
  }

  clearCues(): void {
    this.foley.clear();
    this.dampening = undefined;
    this.endGesture();
    this.lastGesture = -Infinity;
    const now = this.context?.currentTime;
    const duck = this.ambienceDuck?.gain;
    if (duck && now !== undefined) {
      this.hold(duck, now);
      duck.setTargetAtTime(1, now, 0.16);
    }
  }

  private playbackTime(): number | undefined {
    return this.desiredActive &&
      this.mix.master > 0 &&
      this.mix.events > 0 &&
      this.context?.state === 'running'
      ? this.context.currentTime
      : undefined;
  }

  private play(event: AudibleEvent, now: number): void {
    if (event.kind === 'paired-call' && event.call) {
      this.play(
        { kind: event.call, strength: event.strength, pitch: event.pitch, pan: event.pan },
        now,
      );
      this.play(
        {
          kind: 'paired-call',
          strength: event.strength * 0.84,
          pitch: (event.pitch ?? 1) * 0.94,
          pan: event.panTo,
        },
        now + 0.29,
      );
      return;
    }
    const context = this.context!;
    const bus = this.eventBus!;
    const noise = this.noise!;
    const [layers, root, stretch, level] = eventSounds[event.kind];
    const pitch =
      root *
      Math.sqrt(palettes[this.profile][0] / 70) *
      this.variation.range(0.95, 1.05) *
      clamp(event.pitch ?? 1, 0.55, 1.85);
    const duck = this.ambienceDuck?.gain;
    if (duck && now <= context.currentTime + 0.025) {
      this.hold(duck, now);
      duck.setTargetAtTime(1 - ((clamp(event.strength) * this.mix.events) / 100) * 0.5, now, 0.035);
      duck.setTargetAtTime(1, now + 0.22, 0.35);
    }
    const grain = Math.sqrt(palettes[this.profile][2] / 850) * 0.86;
    const gain = 0.078 * level * clamp(event.strength);
    const spatial = context.createStereoPanner();
    spatial.pan.value = clamp(
      event.pan ?? this.scenePan + this.variation.range(-0.22, 0.22),
      -0.85,
      0.85,
    );
    if (event.panTo !== undefined) {
      spatial.pan.setValueAtTime(spatial.pan.value, now);
      spatial.pan.linearRampToValueAtTime(clamp(event.panTo, -0.85, 0.85), now + 0.28);
    }
    spatial.connect(bus);
    let remaining = layers.length;

    for (const [type, offset, duration, attack, from, to, amplitude, crest] of layers) {
      const at = now + offset * stretch;
      const length = duration * stretch * 1.22;
      const envelope = this.envelope(
        context,
        spatial,
        at,
        length,
        gain * amplitude * (type === 'noise' ? 0.75 : 1),
        Math.min(length * 0.72, attack * stretch + 0.012),
      );
      const ended = (source: AudioScheduledSourceNode) => {
        source.disconnect();
        envelope.disconnect();
        if (--remaining === 0) spatial.disconnect();
      };

      if (type === 'noise') {
        const burst = context.createBufferSource();
        burst.buffer = noise;
        burst.loop = true;
        const tint = context.createBiquadFilter();
        tint.type = 'bandpass';
        tint.Q.value = 0.85;
        this.sweep(tint.frequency, at, length, from, to, grain, crest);
        burst.connect(tint).connect(envelope);
        burst.start(at, this.variation.range(0, noise.duration));
        burst.stop(at + length);
        burst.onended = () => {
          tint.disconnect();
          ended(burst);
        };
      } else {
        const tone = context.createOscillator();
        if (type === 'triangle' && this.mellowWave) tone.setPeriodicWave(this.mellowWave);
        else tone.type = 'sine';
        this.sweep(tone.frequency, at, length, from, to, pitch, crest);
        tone.connect(envelope);
        tone.start(at);
        tone.stop(at + length);
        tone.onended = () => ended(tone);
      }
    }
  }

  private sweep(
    frequency: AudioParam,
    at: number,
    duration: number,
    from: number,
    to: number,
    scale: number,
    crest?: number,
  ): void {
    frequency.setValueAtTime(from * scale, at);
    if (crest) frequency.exponentialRampToValueAtTime(crest * scale, at + duration * 0.23);
    frequency.exponentialRampToValueAtTime(to * scale, at + duration * 0.88);
  }

  private envelope(
    context: AudioContext,
    destination: AudioNode,
    at: number,
    tail: number,
    gain: number,
    attack: number,
  ): GainNode {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.00001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.00001, gain), at + attack);
    envelope.gain.exponentialRampToValueAtTime(0.00001, at + tail);
    envelope.connect(destination);
    return envelope;
  }

  modulate(nowMs: number, scene: WorldAudioScene = { activity: 0, detail: 0 }): void {
    const context = this.context;
    if (!context || context.state !== 'running' || context.currentTime - this.lastModulation < 0.14)
      return;
    const now = context.currentTime;
    const elapsed = Math.min(1, now - this.lastModulation);
    if (this.lastModulation === -Infinity) this.phase = (nowMs * 0.00021) % (2 * Math.PI);
    this.lastModulation = now;
    const [root, washHz, grainHz, rate, width, motion] = palettes[this.profile];
    const activity = clamp(scene.activity);
    const detail = clamp(scene.detail);
    const pan = clamp(scene.pan ?? 0, -1, 1);
    this.scenePan = pan * 0.58;
    audioDesign[this.profile].layers.forEach(([, , position, level], index) => {
      const layer = this.layers[index];
      const input = scene.layers?.[index];
      const stereo = clamp(input?.pan ?? position + pan * 0.38, -0.85, 0.85);
      const damp = this.dampening;
      const reduction = damp
        ? clamp((damp.until - now) / 1.45) * clamp(1 - Math.abs(damp.pan - stereo)) * 0.64
        : 0;
      layer.gain.gain.setTargetAtTime(
        level * (1 - reduction) * clamp(input?.level ?? (index ? detail : 0.55 + activity)),
        now,
        0.41,
      );
      layer.pan.pan.setTargetAtTime(stereo, now, 0.48);
    });
    this.phase += elapsed * rate * (0.75 + activity * 0.91);
    const phase = this.phase;
    const pulse = Math.sin(phase);
    const shape = {
      breath: pulse,
      tide: 0.82 * pulse + 0.18 * Math.cos(phase * 0.48),
      flutter: 0.58 * pulse + 0.42 * Math.sin(phase * 3.2),
      pulse: 2 * Math.max(0, Math.sin(phase * 1.9)) ** 3 - 0.6,
      swarm: 0.64 * Math.sin(phase * 0.87) + 0.36 * Math.cos(phase * 2.2),
    }[motion];
    const swell = shape * (0.12 + activity * 0.08) + Math.sin(phase * 0.63 + 1.7) * 0.085;
    const brightness = Math.sin(phase * 0.86 + 0.7);
    this.textureBed?.gain.setTargetAtTime(0.34 + detail * 0.22 + swell * 0.65, now, 0.9);
    this.wash?.frequency.setTargetAtTime(washHz * (0.74 + swell + 0.53 * activity), now, 0.6);
    this.grain?.frequency.setTargetAtTime(
      grainHz * (0.68 + detail * 0.53 + swell * 0.81),
      now,
      0.45,
    );
    this.textureGain?.gain.setTargetAtTime(
      0.023 + activity * 0.066 + detail * 0.027 + swell * 0.042,
      now,
      0.42,
    );
    this.texturePan?.pan.setTargetAtTime(
      clamp(width * (pulse * 0.39 + pan * 0.67), -0.85, 0.85),
      now,
      0.49,
    );
    const [bed, harmonic, glint] = this.voices;
    bed?.gain.gain.setTargetAtTime(0.033 + swell * 0.026 + activity * 0.009, now, 0.62);
    harmonic?.gain.gain.setTargetAtTime(0.01 + detail * 0.018 + swell * 0.01, now, 0.6);
    glint?.gain.gain.setTargetAtTime(0.006 + activity * (0.011 + brightness * 0.004), now, 0.48);
    glint?.oscillator.frequency.setTargetAtTime(
      root * 3.01 * (1 + 0.009 * brightness + detail * 0.018),
      now,
      0.51,
    );
  }

  async stop(): Promise<void> {
    const context = this.context;
    this.context = undefined;
    this.master = undefined;
    this.ambienceVolume = undefined;
    this.eventsVolume = undefined;
    this.ambienceDuck = undefined;
    this.textureBed = undefined;
    this.mellowWave = undefined;
    this.eventBus = undefined;
    this.scenePan = 0;
    this.wash = undefined;
    this.grain = undefined;
    this.textureGain = undefined;
    this.texturePan = undefined;
    this.noise = undefined;
    this.voices.length = 0;
    this.layers.length = 0;
    this.drag = undefined;
    this.lastModulation = -Infinity;
    this.clearCues();
    if (!context) return;
    try {
      await context.close();
    } catch {
      // Closing is best-effort on an unavailable or already-closed device.
    }
  }
}
