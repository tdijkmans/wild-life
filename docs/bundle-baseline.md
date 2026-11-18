# Initial production bundle baseline

Measured on 2026-11-18 using Node 24 and the commands `npm run build` and
`npm run bundle:report` (commit `eb58c80c02a1d7739ef745372ec13937c0ca9a30`).

- JavaScript (all initial and lazy chunks): **326.2 KiB**
- CSS output files: **0.3 KiB**
- Total JavaScript and CSS: **326.5 KiB**
- Total JavaScript and CSS, gzip: **99.6 KiB**

This is a measurement, not an additional size gate. It excludes HTML, images,
and externally loaded fonts. Angular component styles can be embedded in
JavaScript chunks, so they are included in the JavaScript total.

Every successful CI run generates a new `reports/bundle.json` artifact and
prints its summary. Compare future runs with this baseline before imposing
stricter bundle budgets. The production budgets in `angular.json` still apply.
