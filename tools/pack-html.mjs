// Pack the game into ONE self-contained HTML file you can send to anyone:
// builds with Vite into a single JS bundle (no code splitting), then inlines the
// JS and CSS into index.html. The only outside request is the Google Font, which
// falls back to system fonts offline. Open the file straight from disk.
//
//   npm run pack            # → 2048-siege.html and 2048-siege-kv.html (key-visual demo)
import { build } from 'vite';
import { readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
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
if (/\.\/assets\//.test(html)) throw new Error(`unresolved asset reference left in the HTML (${files.join(', ')})`);
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
