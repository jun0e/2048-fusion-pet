// Pack the game into ONE self-contained HTML file you can send to anyone:
// builds with Vite into a single JS bundle (no code splitting), then inlines the
// JS and CSS into index.html. The only outside request is the Google Font, which
// falls back to system fonts offline. Open the file straight from disk. The icons
// become data URLs; the web app manifest is dropped (one file cannot be installed).
//
//   npm run pack            # → 2048-siege.html and 2048-siege-kv.html (key-visual demo)
import { build } from 'vite';
import { readFileSync, writeFileSync, rmSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist-single');
const target = join(root, '2048-siege.html');

await build({
  root,
  base: './',
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // inline every asset as a data URL
    cssCodeSplit: false,
    modulePreload: false,
    copyPublicDir: false,
    chunkSizeWarningLimit: 4000, // one big bundle is the point here
    rollupOptions: { output: { codeSplitting: false } },
  },
});

let html = readFileSync(join(outDir, 'index.html'), 'utf8');
const assets = join(outDir, 'assets');
const files = readdirSync(assets);
// <script type="module" crossorigin src="./assets/index-xxxx.js"></script> → inline module
html = html.replace(/<script type="module"[^>]*src="\.\/assets\/([^"]+)"[^>]*><\/script>/g, (_, file) => {
  const js = readFileSync(join(assets, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
// <link rel="stylesheet" crossorigin href="./assets/index-xxxx.css"> → inline style
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/([^"]+)"[^>]*>/g, (_, file) => `<style>${readFileSync(join(assets, file), 'utf8')}</style>`);
// home-screen icons → data URLs; no manifest in a single file
html = html.replace(/<link rel="manifest"[^>]*>\s*/g, '');
html = html.replace(/href="\.\/icons\/([^"]+\.png)"/g, (_, file) => `href="data:image/png;base64,${readFileSync(join(root, 'public', 'icons', file)).toString('base64')}"`);
// one file: nothing to fetch (main.js skips the asset manifest; the sprites, if any, ride along below)
html = html.replace('<script type="module">', '<script>window.__SINGLE_FILE__ = true;</script>\n    <script type="module">');
if (/\.\/assets\//.test(html)) throw new Error(`unresolved asset reference left in the HTML (${files.join(', ')})`);
// the generated sprites (public/assets/manifest.json) ride along as WebP data URLs, so the
// file shows the Gemini art straight from disk; the game reads them from window.__GEN__
const manifestFile = join(root, 'public', 'assets', 'manifest.json');
if (existsSync(manifestFile)) {
  const entries = Object.entries(JSON.parse(readFileSync(manifestFile, 'utf8')).files ?? {});
  const src = entries.map(([, f]) => join(root, 'public', 'assets', f)).filter((f) => existsSync(f));
  // encoding is slow (over half an hour for the full set), so each sprite's WebP is cached by
  // its content and the settings: a pack re-encodes only new or changed sprites
  const WEBP = 'quality=88, method=6';
  const cacheDir = join(root, 'node_modules', '.cache', 'pack-webp');
  mkdirSync(cacheDir, { recursive: true });
  const cacheFile = (f) => join(cacheDir, `${createHash('sha1').update(WEBP).update(readFileSync(f)).digest('hex')}.b64`);
  const data = {};
  const todo = [];
  for (const f of src) {
    const c = cacheFile(f);
    if (existsSync(c)) data[f] = readFileSync(c, 'utf8');
    else todo.push(f);
  }
  if (todo.length) {
    const webp = execFileSync(
      'python3',
      ['-c', `import sys, io, base64, json
from PIL import Image
out = {}
for p in sys.argv[1:]:
    im = Image.open(p)
    b = io.BytesIO()
    im.save(b, 'WEBP', ${WEBP})
    out[p] = base64.b64encode(b.getvalue()).decode()
print(json.dumps(out))`, ...todo],
      { maxBuffer: 1 << 30 },
    );
    for (const [f, b64] of Object.entries(JSON.parse(webp))) {
      data[f] = b64;
      writeFileSync(cacheFile(f), b64);
    }
  }
  const gen = {};
  for (const [key, f] of entries) {
    const p = join(root, 'public', 'assets', f);
    if (data[p]) gen[key] = `data:image/webp;base64,${data[p]}`;
  }
  html = html.replace('<script type="module">', `<script>window.__GEN__ = ${JSON.stringify({ files: gen })};</script>\n    <script type="module">`);
  console.log(`embedded ${Object.keys(gen).length} generated sprites (${(JSON.stringify(gen).length / 1048576).toFixed(1)} MB as WebP)`);
}
writeFileSync(target, html);
// the key-visual demo: the same build, opening straight into ?kv mode
const kvTarget = join(root, '2048-siege-kv.html');
const kvHtml = html
  .replace('<title>2048 Siege</title>', '<title>2048 Siege · key visual</title>')
  .replace('<script type="module">', '<script>window.__KV__ = true;</script>\n    <script type="module">');
writeFileSync(kvTarget, kvHtml);
rmSync(outDir, { recursive: true, force: true });
console.log(`packed ${target} (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`packed ${kvTarget} (${(kvHtml.length / 1024).toFixed(0)} KB)`);
