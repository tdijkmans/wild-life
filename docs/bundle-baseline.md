# Initial production bundle baseline

Measured by GitHub Actions on **2026-11-18** for commit `eb58c80c02a1d7739ef745372ec13937c0ca9a30` using Node 24 and `npm run build && npm run bundle:report`.

| Asset group | Uncompressed |
| :-- | --: |
| JavaScript (all initial + lazy chunks) | **326.2 KiB** |
| CSS output files | **0.3 KiB** |
| Total JavaScript + CSS | **326.5 KiB** |
| Total JavaScript + CSS, gzip | **99.6 KiB** |

This is a **measurement**, not a size gate. It excludes HTML, images, and externally loaded fonts. Angular component styles can be embedded into JavaScript chunks; they are included in the JavaScript total, not the separate CSS figure.

Every successful CI run generates an updated `reports/bundle.json` artifact and prints its summary. Compare future runs to this baseline before imposing stricter per-entrypoint budgets. The existing production size limits in `angular.json` still apply.
