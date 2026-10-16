// Export the tile sample sheet with headless Chromium (playwright-core from the npx cache, as the
// UI capture tool does). The dev server must be up on :5177 (or URL=…).
//   node reports/art/tiles/tools/capture.mjs                 # samples.png (full sheet, dpr 1) + contrast.json
//   SECTION=den node reports/art/tiles/tools/capture.mjs     # sections/den.png (one group, dpr 2)
//   SECTION=all node reports/art/tiles/tools/capture.mjs     # every group at dpr 2
// Before a capture the sheet is frozen: every canvas becomes an <img> of its own pixels, so Chromium
// composites a plain tall page instead of re-rasterising a hundred 2×-backed canvases (which times
// out under swiftshader). The full sheet is taken at dpr 1 because at dpr 2 it is taller than the
// 16k device px Chromium can capture; the per-section clips are the 2× view.
import { createRequire } from 'node:module';
import { writeFileSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(`${process.env.HOME}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..');
const base = process.env.URL ?? 'http://localhost:5177';
const section = process.env.SECTION ?? '';
const url = `${base}/reports/art/tiles/samples.html`;

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

/** A loaded, frozen sheet at `dpr`: → { page, ctx, errors } */
async function open(dpr) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__samplesReady || window.__samplesError, null, { timeout: 90000 });
  const err = await page.evaluate(() => window.__samplesError ?? null);
  if (err) throw new Error(`sheet failed: ${err}`);
  await page.evaluate(async () => {
    for (const c of document.querySelectorAll('canvas')) {
      const i = new Image();
      i.src = c.toDataURL('image/png');
      i.style.width = c.style.width;
      i.style.height = c.style.height;
      i.className = c.className;
      c.replaceWith(i);
    }
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(300);
  return { page, ctx, errors };
}

const sizeOf = (page) => page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));

if (section) {
  const { page, ctx, errors } = await open(2);
  mkdirSync(join(OUT, 'sections'), { recursive: true });
  const ids = section === 'all' ? await page.evaluate(() => [...document.querySelectorAll('section.group')].map((s) => s.id)) : [section];
  for (const id of ids) {
    const box = await page.evaluate((id) => {
      const r = document.getElementById(id)?.getBoundingClientRect();
      return r ? { x: r.left, y: r.top + scrollY, width: r.width, height: r.height } : null;
    }, id);
    if (!box) throw new Error(`no section #${id}`);
    const file = join(OUT, 'sections', `${id}.png`);
    await page.screenshot({ path: file, clip: box, fullPage: true, animations: 'disabled', timeout: 180000 });
    console.log(`sections/${id}.png ${Math.round(box.width)}×${Math.round(box.height)} css px at dpr 2, ${(statSync(file).size / 1e6).toFixed(2)} MB`);
  }
  if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
  await ctx.close();
} else {
  const { page, ctx, errors } = await open(1);
  const size = await sizeOf(page);
  const contrast = await page.evaluate(() => window.__tileContrast ?? []);
  const samples = await page.evaluate(() => window.__tileSamples ?? []);
  // the whole sheet is taller than one capture surface under swiftshader (≈ 8k px): take it in
  // clip slices and stitch them with Pillow (/usr/bin/python3, the pipeline's interpreter)
  const file = join(OUT, 'samples.png');
  const tmp = join(process.env.TMPDIR ?? '/tmp', `tile-sheet-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const step = 1600;
  const slices = [];
  for (let y = 0; y < size.h; y += step) {
    const h = Math.min(step, size.h - y);
    const f = join(tmp, `slice-${String(slices.length).padStart(2, '0')}.png`);
    await page.screenshot({ path: f, clip: { x: 0, y, width: size.w, height: h }, fullPage: true, animations: 'disabled', timeout: 180000 });
    slices.push(f);
  }
  const { execFileSync } = await import('node:child_process');
  execFileSync('/usr/bin/python3', ['-c', 'import sys\nfrom PIL import Image\nout=sys.argv[1]; files=sys.argv[2:]\nims=[Image.open(f) for f in files]\nw=max(i.width for i in ims); h=sum(i.height for i in ims)\nsheet=Image.new("RGB",(w,h),(23,20,39)); y=0\nfor i in ims:\n  sheet.paste(i,(0,y)); y+=i.height\nsheet.save(out, optimize=True)\nprint(w,h)', file, ...slices], { stdio: ['ignore', 'inherit', 'inherit'] });
  writeFileSync(join(OUT, 'contrast.json'), JSON.stringify({ generatedAt: new Date().toISOString(), rows: contrast }, null, 1));
  console.log(`samples.png ${size.w}×${size.h} css px at dpr 1 from ${slices.length} slices, ${(statSync(file).size / 1e6).toFixed(1)} MB; ${samples.length} samples; ${contrast.length} contrast rows → contrast.json`);
  if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
  await ctx.close();
}
await browser.close();
