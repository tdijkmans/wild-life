# WILD LIFE — coding-agent contract

This is the canonical, repository-wide guidance for AI coding agents. Read this
file before editing and apply the nearest nested `AGENTS.md` for the files you
touch. Keep tool-specific entry points short: update **this** contract, not
multiple independent copies.

## Mission and workflow

- WILD LIFE is a gallery of interactive, evolving, biology-inspired worlds.
  Protect scientific reproducibility, interactive behavior and visual quality.
- Inspect the actual code, tests and relevant docs before changing a feature.
  Treat source code, lockfile and CI as authoritative if documentation differs;
  fix stale documentation in the same change.
- Make the smallest cohesive change that fulfills the request. Do not silently
  replace implementation with a plan or remove behavior just to pass tests.
- Preserve user-facing behavior, URLs, accessibility, keyboard/touch controls and
  responsive layouts unless the task explicitly changes them.
- Use focused feature branches and pull requests; **never merge or publish a
  new public deployment without explicit authorization**.
- Report what changed, tests actually run, measurable results, unresolved risks
  and any validation you could not perform. Never call an unrun test "passed".

## Toolchain and style

- Angular **22** standalone components, TypeScript **6**, Node **24**, npm.
  Install with `npm ci` from the committed `package-lock.json`.
- Use existing Angular signals, `input()`, `computed()`, template control flow
  and lazy component imports where appropriate. Avoid introducing a second
  state-management framework, global store or dependency without a concrete need.
- Keep TypeScript types explicit at module boundaries; validate untrusted input.
  Honor `tsconfig.json` strict settings (including index-signature access).
- Follow `.prettierrc` (2-space indent, single quotes, 100-column preference)
  and `eslint.config.cjs`. Format changed files with Prettier, not handwaving.
- Component selectors use `app-` for feature UI and `ds-` for shared UI.
  Place a component's `.ts`, `.html`, `.css` and `.spec.ts` together.

## Module ownership: do not bypass these boundaries

| Area | Owns | Must not do |
| --- | --- | --- |
| `src/app/features/<world>/domain/` | Pure deterministic model, events and experiment rules | Import Angular, DOM, Canvas, other feature UI |
| `src/app/features/<world>/rendering/` | Canvas drawing and charts | Own biological updates or Angular route state |
| `src/app/features/<world>/controllers/` | Feature-specific input and fullscreen lifecycle | Import its route component or become a global singleton |
| `src/app/features/<world>/` route page | Compose runner, controls, charts and presentation | Duplicate the simulation scheduler or domain logic |
| `src/app/features/home/` | Catalogue-driven home layout and featured display | Import a world engine, renderer or preview directly |
| `src/app/simulations/` | One registration per world, lazy routes and preview loaders | Duplicate routes or eager-load a feature |
| `src/app/shared/simulation/` | Framework-independent scheduling and preview contracts | Depend on any particular ecosystem or feature |
| `src/app/shared/design-system/` | Reused accessible UI components | Carry feature-specific behavior |

Refer to `docs/architecture.md`, `docs/simulation-catalog.md` and
`docs/ecosystem-ui-architecture.md` for the detailed boundaries.

## Non-negotiable simulation guarantees

- Keep model stepping separate from drawing. A world should evolve by explicit
  fixed-duration steps, never by frame rate, viewport size or `Date.now()`.
- Preserve seeded pseudorandom behavior. Avoid `Math.random()` or ambient
  randomness inside a seeded run; do not replace the domain PRNG casually.
- `ExperimentSession` uses exactly **1/60 s** steps and records interventions
  by **tick and original order**. Changing ecological equations, random-number
  consumption, intervention effects or serialization may break old exports.
- If old experiments become incompatible, deliberately update the model/version
  contract and test failure behavior. Never silently weaken replay checksum
  verification to get a green suite.
- Keep capacity and finite-number safeguards; maintain gene bounds, population
  accounting, history limits and stable input handling. The ecological tests
  check **software invariants**, not biological realism.

Read `docs/experiments.md` and `docs/biological-regression-tests.md`
before changing the domain.

## UX, performance and lifecycle

- Reuse `src/styles.css` design tokens and `ds-*` primitives, while leaving
  artistic world-specific Canvas/CSS effects inside the feature.
- Prefer semantic links for navigation and accessible buttons for actions.
  Preserve focus states, labelled controls and reduced-motion behavior.
- Clean up RAF handles, subscriptions, observers, global event listeners and
  timers when a component/controller is destroyed.
- Keep visual throttling (homepage preview up to 30 fps) distinct from
  biological stepping (normally 60 fixed steps/s). Suspend offscreen/hidden
  previews; do not invent CPU/FPS improvement percentages.

## Required verification

From the repository root, run:

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test:ci
npm run build
```

For UI, navigation, Canvas, import/export or interactive changes also run:

```bash
npx playwright install chromium
npm run test:e2e
```

When performance or bundle size changes, inspect `npm run bundle:report`
and `npm run perf:benchmark`. These are observational measurements, not
fixed FPS guarantees. CI runs the checks in `.github/workflows/ci.yml`.
Keep tests near the affected code; write behavior/invariant tests rather
than brittle implementation snapshots. Never weaken a failing test or
silently skip checks to make a PR green.

## Final change checklist

- Imports follow feature boundaries; the catalogue remains the sole world
  registration point.
- Tests cover the changed behavior, replay determinism where relevant, and
  failure cases for external inputs.
- Documentation and nested agent instructions are updated if conventions
  or paths changed.
- Production build, unit tests and appropriate Chromium tests are reported
  with actual outcomes; remaining limitations are explicit.
