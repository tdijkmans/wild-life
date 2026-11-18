/**
 * Informational, reproducible engine CPU throughput measurement.
 * Not an absolute performance gate: hosted CI hardware is variable.
 */
import { performance } from 'node:perf_hooks';
import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/app/features/ecosystem/domain/engine.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { WorldEngine } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
);
const iterations = 600;
const seeds = [101, 202, 303, 404, 505];
const durations = [];

function run(seed) {
  const world = new WorldEngine(seed, 120, 12);
  const before = performance.now();
  for (let i = 0; i < iterations; i++) world.step(1 / 60);
  return performance.now() - before;
}
// Warm up the JIT before measuring.
run(42);
for (const seed of seeds) durations.push(run(seed));
durations.sort((a, b) => a - b);
const medianMs = durations[Math.floor(durations.length / 2)];
const benchmark = {
  iterations,
  seeds,
  medianMs: Number(medianMs.toFixed(2)),
  stepsPerSecond: Math.round((iterations * 1000) / medianMs),
  minMs: Number(durations[0].toFixed(2)),
  maxMs: Number(durations.at(-1).toFixed(2)),
};
await mkdir('reports', { recursive: true });
await writeFile('reports/performance.json', JSON.stringify(benchmark, null, 2) + '\n');
const summary = [
  '## Engine CPU benchmark (informational)',
  '',
  '| Metric | Value |',
  '|:--|--:|',
  `| Steps per run | ${iterations} |`,
  `| Median time | ${benchmark.medianMs} ms |`,
  `| Median engine throughput | ${benchmark.stepsPerSecond} steps/s |`,
  '',
  'Five seeded runs on shared CI hardware. This measures the model engine only,',
  'not Canvas paint time or browser frame rate; compare trends, not individual runs.',
  '',
].join('\n');
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
