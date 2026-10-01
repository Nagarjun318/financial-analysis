/**
 * Bundle budget gate (Phase 3).
 *
 * Measures the gzip size of the *initial* JS payload — the module entry
 * referenced by dist/index.html plus its <link rel="modulepreload"> chunks —
 * and fails CI when it exceeds the budget.
 *
 * Usage: node scripts/check-bundle-budget.mjs [--budget-kb=300] [--dist=dist]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);
const distDir = resolve(root, args.dist ?? 'dist');
const budgetKb = Number(args['budget-kb'] ?? process.env.BUNDLE_BUDGET_KB ?? 300);

const htmlPath = join(distDir, 'index.html');
if (!existsSync(htmlPath)) {
  console.error(`check-bundle-budget: ${htmlPath} not found. Run 'npm run build' first.`);
  process.exit(2);
}
const html = readFileSync(htmlPath, 'utf8');

// Vite emits <script type="module" crossorigin src="/base/assets/index-*.js">
// and <link rel="modulepreload" crossorigin href="/base/assets/*.js"> for
// shared initial chunks. Both are part of the initial payload.
const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*>/g)].map((m) => m[1]);
const preloadHrefs = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"[^>]*>/g)].map((m) => m[1]);
const assets = [...new Set([...scriptSrcs, ...preloadHrefs])];

if (assets.length === 0) {
  console.error('check-bundle-budget: no JS assets found in dist/index.html');
  process.exit(2);
}

const stripOrigin = (url) => url.replace(/^https?:\/\/[^/]+/, '').replace(/^\.\//, '');
/** Resolve a URL from index.html to a file under distDir, tolerating the Vite `base` prefix. */
const resolveAsset = (url) => {
  const path = stripOrigin(url).replace(/^\/+/, '');
  const segments = path.split('/');
  // Try progressively stripping leading segments (the `base` prefix) until a file matches.
  for (let i = 0; i < segments.length; i++) {
    const file = join(distDir, ...segments.slice(i));
    if (existsSync(file)) return file;
  }
  return null;
};
let totalGzip = 0;
const rows = [];
for (const url of assets) {
  // dist/index.html sits at dist root; assets are relative to it.
  const file = resolveAsset(url);
  if (!file) {
    console.warn(`check-bundle-budget: asset not found on disk, skipping: ${url}`);
    continue;
  }
  const raw = readFileSync(file);
  const gz = gzipSync(raw).length;
  totalGzip += gz;
  rows.push({ url, kb: raw.length / 1024, gzipKb: gz / 1024 });
}

rows.sort((a, b) => b.gzipKb - a.gzipKb);
console.log('Initial JS payload (gzip):');
for (const r of rows) {
  console.log(`  ${r.gzipKb.toFixed(1).padStart(8)} KB gzip  (${r.kb.toFixed(0)} KB raw)  ${r.url}`);
}
console.log(`  ${(totalGzip / 1024).toFixed(1)} KB gzip total  (budget: ${budgetKb} KB)`);

if (totalGzip / 1024 > budgetKb) {
  console.error(
    `BUNDLE BUDGET EXCEEDED: initial JS is ${(totalGzip / 1024).toFixed(1)} KB gzip, budget is ${budgetKb} KB.\n` +
      'Keep heavy deps (xlsx, recharts, react-markdown) in lazy chunks via dynamic import().'
  );
  process.exit(1);
}
console.log('Bundle budget OK.');
