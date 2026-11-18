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

**Lockfile bootstrap:** In the first CI run, the workflow resolves the newly added ESLint dependencies and uploads `npm-lockfile-candidate`. Commit that generated `package-lock.json`, then remove the temporary `npm install --package-lock-only` step so every future CI job uses `npm ci` on the committed lockfile only.

CI is a quality gate; to *require* it before merges, configure the branch ruleset for `main` to require the workflow's check once it is green.
