import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = path.resolve('dist/wild-life/browser');
const out = path.resolve('reports/bundle.json');

async function visit(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...(await visit(filename)));
    else if (entry.isFile() && /\.(js|css)$/.test(entry.name)) {
      const body = await readFile(filename);
      results.push({
        name: path.relative(root, filename).replaceAll('\\', '/'),
        type: path.extname(filename).slice(1),
        bytes: body.length,
        gzipBytes: gzipSync(body, { level: 9 }).length,
      });
    }
  }
  return results;
}

const assets = (await visit(root)).sort((a, b) => a.name.localeCompare(b.name));
const total = (field) => assets.reduce((sum, asset) => sum + asset[field], 0);
const report = {
  schemaVersion: 1,
  assets,
  totalBytes: total('bytes'),
  totalGzipBytes: total('gzipBytes'),
  javascriptBytes: assets.filter((asset) => asset.type === 'js').reduce((s, a) => s + a.bytes, 0),
  cssBytes: assets.filter((asset) => asset.type === 'css').reduce((s, a) => s + a.bytes, 0),
};
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(report, null, 2) + '\n');
const kb = (v) => (v / 1024).toFixed(1);
const summary = [
  '## WILD LIFE production bundle snapshot',
  '',
  '| Measure | Size |',
  '|:--|--:|',
  `| JavaScript (uncompressed) | ${kb(report.javascriptBytes)} KiB |`,
  `| CSS (uncompressed) | ${kb(report.cssBytes)} KiB |`,
  `| JS + CSS (uncompressed) | ${kb(report.totalBytes)} KiB |`,
  `| JS + CSS (gzip) | ${kb(report.totalGzipBytes)} KiB |`,
  '',
  'Includes all generated JS/CSS (initial + lazy chunks), excluding images/HTML.',
];
console.log(summary.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import('node:fs/promises');
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n');
}
