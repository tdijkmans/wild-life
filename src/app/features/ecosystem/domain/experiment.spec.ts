import { WorldEngine } from './engine';
import {
  EXPERIMENT_STEP_SECONDS,
  ExperimentSession,
  experimentChecksum,
  parseExperiment,
  type ExperimentDocument,
} from './experiment';

function advance(session: ExperimentSession, ticks: number): void {
  for (let i = 0; i < ticks; i++) session.step(EXPERIMENT_STEP_SECONDS);
}

function sampleRun(): ExperimentSession {
  const session = new ExperimentSession({ seed: 20261118, prey: 40, predators: 5 });
  advance(session, 23);
  session.world.bloom(300, 200, 15);
  session.world.flow(450, 280, 20, -14);
  advance(session, 27);
  session.world.climate(500, 320, 'heat');
  session.world.climate(320, 410, 'cold');
  advance(session, 150);
  session.world.bloom(650, 500, 6);
  return session;
}

describe('ExperimentSession deterministic replay', () => {
  it('records interventions on exact fixed ticks in original order', () => {
    const session = sampleRun();
    expect(session.ticks).toBe(200);
    expect(session.interventions.map(({ tick, kind }) => ({ tick, kind }))).toEqual([
      { tick: 23, kind: 'bloom' },
      { tick: 23, kind: 'current' },
      { tick: 50, kind: 'heat' },
      { tick: 50, kind: 'cold' },
      { tick: 200, kind: 'bloom' },
    ]);
  });

  it('restores the entire biological world exactly, including events after final tick', async () => {
    const original = sampleRun();
    const document = original.export();
    const restored = await ExperimentSession.replay(document);
    expect(experimentChecksum(restored.world)).toBe(document.checksum);
    expect(restored.world.organisms).toEqual(original.world.organisms);
    expect(restored.world.food).toEqual(original.world.food);
    expect(restored.world.history).toEqual(original.world.history);
    expect(restored.world.events).toEqual(original.world.events);
    expect(restored.export()).toEqual(document);
  });

  it('retains action history and allows continued recording after replay', async () => {
    const restored = await ExperimentSession.replay(sampleRun().export());
    restored.world.bloom(250, 290, 3);
    advance(restored, 5);
    const document = restored.export();
    expect(document.interventions.at(-1)?.tick).toBe(200);
    expect(document.ticks).toBe(205);
    const again = await ExperimentSession.replay(document);
    expect(again.export()).toEqual(document);
  });

  it('verifies a zero-step experiment and an empty environment', async () => {
    const session = new ExperimentSession({ seed: 0, prey: 0, predators: 0 });
    session.world.bloom(600, 360, 5);
    const restored = await ExperimentSession.replay(session.export());
    expect(restored.world.food).toEqual(session.world.food);
    expect(restored.ticks).toBe(0);
  });

  it('supports cooperative async replay and progress reporting', async () => {
    const session = new ExperimentSession({ seed: 42, prey: 5, predators: 1 });
    advance(session, 482);
    let yielded = 0;
    const progress: number[] = [];
    await ExperimentSession.replay(
      session.export(),
      async () => {
        yielded++;
      },
      (fraction) => progress.push(fraction),
    );
    expect(yielded).toBe(2);
    expect(progress.at(-1)).toBe(1);
    expect(progress.every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it('rejects a tampered intervention or final state checksum', async () => {
    const document = sampleRun().export();
    const altered = structuredClone(document);
    (altered.interventions[0] as { x: number }).x = 10;
    await expect(ExperimentSession.replay(altered)).rejects.toThrow('verification failed');
    await expect(
      ExperimentSession.replay({ ...document, checksum: '00000000' }),
    ).rejects.toThrow('verification failed');
  });

  it('rejects incompatible versions, engine models, or timestep', () => {
    const document = sampleRun().export();
    for (const altered of [
      { ...document, version: 2 },
      { ...document, model: 'future-model' },
      { ...document, timestep: 0.1 },
      { ...document, format: 'untrusted' },
    ]) {
      expect(() => parseExperiment(altered)).toThrow();
    }
  });

  it('rejects invalid counts, timestamps and unsorted recorded actions', () => {
    const document = sampleRun().export();
    expect(() => new ExperimentSession({ seed: NaN, prey: 10, predators: 2 })).toThrow();
    expect(() => new ExperimentSession({ seed: 1, prey: 9999, predators: 1 })).toThrow();
    expect(() => parseExperiment({ ...document, ticks: Infinity })).toThrow();
    expect(() => parseExperiment({ ...document, ticks: 1_000_001 })).toThrow();
    expect(() =>
      parseExperiment({ ...document, interventions: [...document.interventions].reverse() }),
    ).toThrow('chronologically ordered');
  });

  it('rejects invalid coordinates, impossible tool payloads and oversized event arrays', () => {
    const document = sampleRun().export();
    const replaceFirst = (event: object): ExperimentDocument => ({
      ...document,
      interventions: [{ ...document.interventions[0], ...event }],
    });
    for (const invalid of [
      { x: Infinity },
      { x: NaN },
      { amount: 0 },
      { amount: 999999 },
      { tick: -1 },
      { tick: document.ticks + 1 },
      { kind: 'unknown' },
    ]) {
      expect(() => parseExperiment(replaceFirst(invalid))).toThrow();
    }
    expect(() =>
      parseExperiment({
        ...document,
        interventions: Array.from({ length: 20_001 }, () => document.interventions[0]),
      }),
    ).toThrow('too many');
  });

  it('guards the runner interface against variable integration timesteps', () => {
    const session = new ExperimentSession({ seed: 4, prey: 1, predators: 1 });
    expect(() => session.step(0.2)).toThrow(RangeError);
    expect(() => session.step(Number.NaN)).toThrow(RangeError);
    expect(session.ticks).toBe(0);
  });

  it('does not change engine behavior without recording and is side-effect free to inspect', () => {
    const baseline = new WorldEngine(1337, 8, 2);
    const session = new ExperimentSession({ seed: 1337, prey: 8, predators: 2 });
    for (let tick = 0; tick < 180; tick++) {
      if (tick === 20) {
        baseline.bloom(400, 300, 10);
        session.world.bloom(400, 300, 10);
      }
      baseline.step(EXPERIMENT_STEP_SECONDS);
      session.step(EXPERIMENT_STEP_SECONDS);
    }
    expect(session.world.organisms).toEqual(baseline.organisms);
    expect(session.world.food).toEqual(baseline.food);
    expect(session.world.stats()).toEqual(baseline.stats());
    const before = session.world.stats();
    session.export();
    expect(session.world.stats()).toEqual(before);
  });
});
