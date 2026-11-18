# Quality gates

Run the same checks locally before requesting a review:

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test:ci
npm run build
npm run bundle:report
```

The GitHub Actions workflow runs these commands on pull requests and pushes to `main`, using Node 24.

- ESLint uses the Angular 22 flat configuration for TypeScript and templates.
- Prettier is separate from ESLint to prevent formatting rules from obscuring correctness rules.
- `npm run bundle:report` produces `reports/bundle.json` plus a human-readable CI summary of built JS/CSS sizes (raw and gzip).
- Angular already enforces initial and component CSS size budgets in `angular.json`. The snapshot is observational, not a second arbitrary size limit.

The ESLint dependency graph is locked in the committed `package-lock.json`; CI uses only `npm ci` and never mutates dependencies.

CI is a quality gate; to _require_ it before merges, configure the branch ruleset for `main` to require the workflow's check once it is green.
