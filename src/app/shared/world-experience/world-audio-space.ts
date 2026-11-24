import { SeededRandom } from '../simulation/seeded-random';

export function createAudioSpace(
  context: BaseAudioContext,
  input: AudioNode,
  output: AudioNode,
  room: number,
): void {
  const reverb = context.createConvolver();
  const duration = 1.1 + room * 1.15;
  const impulse = context.createBuffer(
    2,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const random = new SeededRandom(0x7ab19);
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const samples = impulse.getChannelData(channel);
    let softened = 0;
    for (let i = 0; i < samples.length; i++) {
      softened += (random.next() * 2 - 1 - softened) * 0.19;
      const seconds = i / context.sampleRate;
      const diffusion = Math.min(1, seconds / 0.035);
      samples[i] = softened * diffusion * (1 - seconds / duration) ** 2.8;
    }
  }
  reverb.buffer = impulse;
  const wet = context.createGain();
  wet.gain.value = 0.56;
  input.connect(reverb).connect(wet).connect(output);

  // Two slowly moving, filtered reflections create width and pitch drift.
  for (const [seconds, position, rate] of [
    [0.124, -0.75, 0.096],
    [0.213, 0.75, 0.071],
  ]) {
    const delay = context.createDelay(0.4);
    delay.delayTime.value = seconds;
    const drift = context.createOscillator();
    drift.frequency.value = rate;
    const depth = context.createGain();
    depth.gain.value = 0.008;
    drift.connect(depth).connect(delay.delayTime);
    drift.start();
    const color = context.createBiquadFilter();
    color.type = 'lowpass';
    color.frequency.value = 1650;
    color.Q.value = 0.2;
    const pan = context.createStereoPanner();
    pan.pan.value = position;
    const level = context.createGain();
    level.gain.value = 0.18;
    input.connect(delay).connect(color).connect(pan).connect(level).connect(output);
  }
}

/** A seamless loop of overlapping, windowed resonances. Profile parameters tune its color. */
export function createEvolvingTexture(
  context: BaseAudioContext,
  root: number,
  width: number,
): AudioBuffer {
  const seconds = 12;
  const sampleRate = 12_000;
  const buffer = context.createBuffer(2, seconds * sampleRate, sampleRate);
  const random = new SeededRandom(0x490dd5);
  const partials = [2, 2.99, 4.02, 5.97, 8.01];
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let grain = 0; grain < 32; grain++) {
    const start = Math.floor(random.range(0, buffer.length));
    const length = Math.round(random.range(0.65, 2.6) * sampleRate);
    const frequency = root * partials[grain % partials.length] * random.range(0.98, 1.02);
    const phase = random.range(0, Math.PI * 2);
    const drift = random.range(-0.09, 0.09);
    const level = random.range(0.042, 0.1);
    const pan = random.range(-width, width);
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      const shape = Math.sin(Math.PI * progress) ** 2;
      const angle =
        phase + Math.PI * 2 * frequency * (i / sampleRate) * (1 + drift * progress * progress);
      const sample = shape * level * (Math.sin(angle) + 0.21 * Math.sin(angle * 1.997));
      const index = (start + i) % buffer.length;
      left[index] += sample * Math.sqrt((1 - pan) / 2);
      right[index] += sample * Math.sqrt((1 + pan) / 2);
    }
  }
  return buffer;
}
