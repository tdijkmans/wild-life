import { clamp, LivingWorld } from '../../../shared/simulation/living-world';
import type { WorldMetric } from '../../../shared/world-experience/world-protocol';

interface Voice {
  x: number;
  y: number;
  signal: number;
  preference: number;
  phase: number;
  age: number;
  lifespan: number;
  caller: boolean;
  readyAt: number;
  lastCall: number;
}

export class NightChorusWorld extends LivingWorld {
  readonly voices: Voice[] = [];
  pairs = 0;
  mixedPairs = 0;
  missedSignals = 0;
  mixedEncounters = 0;
  private nextRound = 0;
  private readonly nextCallCue = [0, 0];
  readonly pairTraces: { caller: Voice; listener: Voice; time: number }[] = [];

  constructor(seed: number) {
    super(seed);
    for (let i = 0; i < 96; i++) {
      const type = i % 2;
      const signal = this.random.range(0.13, 0.36) + 0.5 * type;
      this.spawn(
        this.random.range(65, 1135),
        this.random.range(135, 600),
        signal,
        clamp(signal + this.random.range(-0.14, 0.14)),
        this.random.range(0.14, 0.34) + 0.33 * type,
        this.random.range(12, 56),
        i % 4 < 2,
      );
    }
  }

  private spawn(
    x: number,
    y: number,
    signal: number,
    preference: number,
    phase: number,
    age: number,
    caller: boolean,
  ): void {
    this.voices.push({
      x,
      y,
      signal,
      preference,
      phase,
      age,
      caller,
      lifespan: this.random.range(135, 210),
      readyAt: 0,
      lastCall: -10,
    });
  }

  influence(kind: string, x: number, y: number, dx: number, dy: number): void {
    if (this.field(kind, x, y, ['warmth', 'shade'], dx, dy))
      this.cue(kind === 'warmth' ? 'shimmer' : 'hush', 0.5, x);
  }

  private active(voice: Voice): boolean {
    const warm = this.fieldAt('warmth', voice.x, voice.y);
    const shade = this.fieldAt('shade', voice.x, voice.y);
    const onset = voice.phase + clamp(shade - warm, -1, 1) * 0.16;
    const phase = this.time / 28 - onset;
    const cycle = phase - Math.floor(phase);
    return voice.age >= 12 && cycle < 0.28;
  }

  step(dt: number): void {
    if (!this.advance(dt)) return;
    for (let i = this.voices.length - 1; i >= 0; i--) {
      this.voices[i].age += dt;
      if (this.voices[i].age > this.voices[i].lifespan) this.voices.splice(i, 1);
    }
    while (this.pairTraces.length && this.pairTraces[0].time < this.time - 5)
      this.pairTraces.shift();
    if (this.time < this.nextRound) return;
    this.nextRound = this.time + 0.23;
    const active = this.voices.filter((voice) => this.active(voice));
    const callers = active.filter((voice) => voice.caller);
    const calling: Voice[] = [];
    const answered = new Set<Voice>();

    for (const caller of callers) {
      const spacing = 0.6 + caller.signal * 0.9;
      if (this.time - caller.lastCall >= spacing) {
        caller.lastCall = this.time;
        calling.push(caller);
      }
    }
    for (const listener of active) {
      if (listener.caller || listener.readyAt > this.time || this.voices.length >= 144) continue;
      const nearby = callers.filter(
        (caller) =>
          caller.readyAt <= this.time &&
          this.time - caller.lastCall < 0.26 &&
          Math.hypot(listener.x - caller.x, listener.y - caller.y) < 150,
      );
      if (!nearby.length) continue;
      const caller = nearby[this.random.integer(0, nearby.length)];
      const mixed = caller.signal < 0.5 !== listener.signal < 0.5;
      if (mixed) this.mixedEncounters++;
      if (Math.abs(caller.signal - listener.preference) > 0.25) {
        this.missedSignals++;
        continue;
      }
      listener.readyAt = this.time + 13;
      caller.readyAt = this.time + 10;
      this.pairs++;
      answered.add(caller);
      this.cue('paired-call', 0.62, caller.x, {
        toX: listener.x,
        pitch: 0.84 + caller.signal * 0.35,
        call: caller.signal >= 0.5 ? 'high-call' : 'low-call',
      });
      if (mixed) this.mixedPairs++;
      this.pairTraces.push({ caller, listener, time: this.time });
      if (this.pairTraces.length > 28) this.pairTraces.shift();
      const blend = (a: number, b: number, range: number): number =>
        clamp((a + b) / 2 + this.random.range(-range, range));
      this.spawn(
        clamp(listener.x + this.random.range(-114, 114), 48, 1152),
        clamp(listener.y + this.random.range(-87, 87), 115, 620),
        blend(caller.signal, listener.signal, 0.04),
        blend(caller.preference, listener.preference, 0.035),
        blend(caller.phase, listener.phase, 0.035),
        0,
        this.random.next() < 0.5,
      );
    }
    for (const caller of calling) {
      const high = Number(caller.signal >= 0.5);
      if (answered.has(caller) || this.time < this.nextCallCue[high]) continue;
      this.cue(high ? 'high-call' : 'low-call', 0.56, caller.x, {
        pitch: 0.84 + caller.signal * 0.35,
      });
      this.nextCallCue[high] = this.time + 0.92;
    }
    this.sample(active.length, this.mixedPairs);
  }

  metrics(): readonly WorldMetric[] {
    return [
      {
        label: 'ACTIVE VOICES',
        value: String(this.voices.filter((voice) => voice.caller && this.active(voice)).length),
        note: 'Calling individuals in the current window',
        tone: 'mint',
      },
      {
        label: 'MIXED PAIRINGS',
        value: String(this.mixedPairs),
        note: this.mixedEncounters + ' mixed call encounters',
        tone: 'coral',
      },
      {
        label: 'UNANSWERED SIGNALS',
        value: String(this.missedSignals),
        note: 'Local encounters outside the listener’s preference',
        tone: 'blue',
      },
      {
        label: 'TOTAL PAIRINGS',
        value: String(this.pairs),
        note: 'Young inherit call, preference, and activity timing',
        tone: 'gold',
      },
    ];
  }
}
