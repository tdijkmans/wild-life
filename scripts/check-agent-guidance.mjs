/**
 * Lightweight integrity check for coding-agent guidance. Ensures that agents
 * are not pointed to deleted files or nonexistent project commands.
 * This cannot prove that prose instructions are semantically correct.
 */
import { readFile } from 'node:fs/promises';

const instructionPaths = [
  'AGENTS.md',
  'CLAUDE.md',
  '.github/copilot-instructions.md',
  'src/app/features/home/AGENTS.md',
  'src/app/features/ecosystem/AGENTS.md',
  'src/app/features/ecosystem/domain/AGENTS.md',
  'src/app/shared/simulation/AGENTS.md',
  'src/app/shared/design-system/AGENTS.md',
  'src/app/simulations/AGENTS.md',
  'e2e/AGENTS.md',
  'src/app/shared/world-experience/AGENTS.md',
  'src/app/features/canopy/AGENTS.md',
  'src/app/features/abyssal-bloom/AGENTS.md',
  'src/app/features/synchrony/AGENTS.md',
  'src/app/features/reef/AGENTS.md',
  'src/app/features/microbial-commons/AGENTS.md',
];

const referencedPaths = [
  'docs/architecture.md',
  'docs/quality-gates.md',
  'docs/experiments.md',
  'docs/biological-regression-tests.md',
  'docs/ecosystem-ui-architecture.md',
  'docs/design-system.md',
  'docs/simulation-catalog.md',
  'src/styles.css',
  'src/app/features/ecosystem/domain/engine.ts',
  'src/app/features/ecosystem/domain/experiment.ts',
  'src/app/features/ecosystem/domain/engine.regression.spec.ts',
  'src/app/features/ecosystem/domain/experiment.spec.ts',
  'src/app/shared/simulation/simulation-runner.ts',
  'src/app/shared/simulation/simulation-runner.spec.ts',
  'src/app/shared/simulation/frame-throttle.spec.ts',
  'src/app/shared/simulation/preview-metrics.ts',
  'src/app/simulations/simulation-catalog.ts',
  'src/app/simulations/simulation-catalog.spec.ts',
  'src/app/features/ecosystem/preview/ecosystem-preview.ts',
  'src/app/features/ecosystem/controllers/aquarium.controller.ts',
  'src/app/features/ecosystem/controllers/world-pointer.controller.ts',
  'e2e/ecosystem.spec.ts',
  'playwright.config.ts',
  'docs/new-worlds.md',
  'src/app/shared/world-experience/world-soundscape.ts',
  'src/app/features/canopy/domain/canopy-world.ts',
  'src/app/features/abyssal-bloom/domain/abyssal-bloom-world.ts',
  'src/app/features/synchrony/domain/synchrony-world.ts',
  'src/app/features/reef/domain/reef-world.ts',
  'src/app/features/microbial-commons/domain/microbial-commons-world.ts',
  'src/app/features/synchrony/rendering/synchrony-renderer.ts',
  'src/app/features/reef/rendering/reef-renderer.ts',
  'src/app/features/microbial-commons/rendering/microbial-commons-renderer.ts',
  'e2e/new-worlds.spec.ts',
  'netlify.toml',
];

const failures = [];
async function read(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    failures.push(`Missing referenced file: ${path}`);
    return '';
  }
}

const contents = await Promise.all(instructionPaths.map((path) => read(path)));
await Promise.all(referencedPaths.map((path) => read(path)));

const [root, claude, copilot, ...scoped] = contents;
if (!root.includes('# WILD LIFE') || !root.includes('npm run test:e2e')) {
  failures.push('Root AGENTS.md no longer contains the project contract and E2E gate');
}
if (claude.trim() !== '@AGENTS.md') {
  failures.push('CLAUDE.md must import the canonical AGENTS.md without duplicating it');
}
if (!copilot.includes('../AGENTS.md')) {
  failures.push('Copilot must point to the canonical root AGENTS.md');
}
for (let i = 0; i < scoped.length; i++) {
  if (!scoped[i].includes('AGENTS.md')) {
    failures.push(`Missing root-instruction reference: ${instructionPaths[i + 3]}`);
  }
}

const pkg = JSON.parse(await read('package.json'));
for (const name of [
  'agent:check',
  'typecheck',
  'lint',
  'format:check',
  'test:ci',
  'build',
  'test:e2e',
  'bundle:report',
  'perf:benchmark',
]) {
  if (!pkg.scripts?.[name]) failures.push(`Missing npm script: ${name}`);
}
const workflow = await read('.github/workflows/ci.yml');
if (!workflow.includes('npm run agent:check')) {
  failures.push('CI must run the agent-instruction integrity check');
}
if (!workflow.includes('npm run test:e2e')) {
  failures.push('CI must run Chromium end-to-end tests');
}

if (failures.length) {
  console.error(
    'Agent guidance integrity failed:\n' + failures.map((item) => `- ${item}`).join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log(
    `Agent guidance OK: ${instructionPaths.length} instruction files and ${referencedPaths.length} referenced files.`,
  );
}
