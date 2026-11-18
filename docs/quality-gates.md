# Quality gates

The source of truth for automated verification is
`.github/workflows/ci.yml`. Keep these commands and the agent contract
in sync when changing the toolchain.

```bash
npm ci
npm run agent:check
npm run typecheck
npm run lint
npm run format:check
npm run test:ci
npm run build
npm run bundle:report
npm run perf:benchmark
```

For navigation, Canvas, interactions, mobile layouts or experiment file
changes also run:

```bash
npx playwright install chromium
npm run test:e2e
```

- **Agent guidance integrity** verifies required `AGENTS.md`/tool entry
  points, referenced core files and quality-script names. It does not
  interpret the intent or correctness of prose instructions.
- **TypeScript / ESLint / Prettier:** TypeScript and Angular template
  typing, architectural import guards, formatting. ESLint uses the
  Angular 22 flat config. Prettier is deliberately separate.
- **Unit + regression:** Vitest via Angular's `ng test --watch=false`,
  including deterministic domain and runner tests.
- **Browser E2E:** pinned Playwright Chromium tests verify actual
  navigation, Aquarium, user interactions, seeded export/import,
  verified replay, invalid inputs and a mobile viewport. Failure
  screenshots/traces are retained as CI artifacts.
- **Bundle report:** `reports/bundle.json` records all built JS/CSS,
  initial and lazy, without a second arbitrary size threshold.
  Angular's budgets in `angular.json` remain authoritative.
- **Engine CPU benchmark:** `reports/performance.json` is an
  informational seeded CPU measurement on variable CI hardware.
  It is not a browser FPS/energy guarantee.

CI uses Node 24, read-only GitHub contents permissions and `npm ci`
from the committed `package-lock.json`. Do not let CI mutate or
commit dependencies or formatting. For local formatting, run
`npx prettier --write <changed-file>` and check the full repo afterward.

Configure a GitHub branch ruleset requiring the quality and Chromium
checks to **enforce** green CI before merges; merely running the workflow
does not enforce a merge restriction.
