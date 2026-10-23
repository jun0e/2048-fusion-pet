// Render thumbnail.html to PNG: 1280 × 720 and 2560 × 1440. node render.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(`${process.env.HOME}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core`);
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
for (const scale of [1, 2]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
  await page.goto(pathToFileURL(join(here, 'thumbnail.html')).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = join(here, scale === 1 ? '2048-fusion-pet-thumbnail.png' : '2048-fusion-pet-thumbnail@2x.png');
  await page.locator('#thumb').screenshot({ path: out });
  console.log('wrote', out, await page.evaluate(() => document.fonts.check('800 40px "Baloo 2"')));
  await page.close();
}
await browser.close();
