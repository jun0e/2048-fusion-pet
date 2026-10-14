#!/usr/bin/env node
// Key visual for the art style, generated with Gemini image models (polished art, not
// the code-drawn stand-ins). Four pieces, each saved to reports/kv/gen/:
//   kv-repaint   the real game frame repainted in the final art style (layout and
//                numbers kept), using the in-game capture as the reference image
//   kv-lineup    the 8 element animals (+ frost shark), baby and grown forms side by side
//   kv-portraits three soft-vinyl namecard portraits (the second art style)
//   kv-hero      the marketing hero image: the animals around a glowing 2048 board
// Every request goes through the weekly budget guard (stops at 80%) and is logged.
//
//   node tools/gen-kv.mjs --dry      # print prompts and cost, call nothing
//   node tools/gen-kv.mjs            # generate all four (about $0.54 on Pro)
//   node tools/gen-kv.mjs --only=kv-lineup --variants=2
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { costOf, checkBudget, loadLimits, loadLedger, appendLedger, weeklyUsage } from './gemini-budget.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'reports', 'kv', 'gen');
const ledgerFile = join(root, 'tools', '.cache', 'gemini-usage.json');
const limitsFile = join(root, 'tools', 'gemini-budget.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const variants = Number((args.find((a) => a.startsWith('--variants=')) ?? '--variants=1').slice(11)) || 1;
const MODEL = process.env.GEMINI_KV_MODEL ?? 'gemini-3-pro-image'; // the key visual is worth the best model

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const f of [join(root, '.env.local'), join(root, '..', 'merge-ball-td', '.env.local')]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error('No GEMINI_API_KEY: put it in .env.local (git-ignored)');
}

// --- style language (from the style brief; no franchise names on purpose) ------------------------
const STICKER =
  'Polished professional mobile-game character art in a "sticker" style: clean confident shapes, a thick even dark plum outline (#2B1D2E) around every form, ' +
  'a thin cream-white sticker rim outside the outline, flat colour fills with one crisp cel-shade tone and one small highlight, light from the upper left, ' +
  'big expressive eyes, appealing round forms, bright saturated but harmonious colours. Original designs that do not resemble any existing game, anime or toy character.';
const VINYL =
  'Stylized 3D render of a collectible soft-vinyl designer toy: smooth matte materials, large soft colour gradients, gentle ambient occlusion, ' +
  'warm key light from the upper left and a strong rim light in the creature’s own element colour from behind right, no fur strands or texture noise. ' +
  'Original design that does not resemble any existing game, anime or toy character.';
const ANIMALS =
  'Fire: a chubby lizard / baby dragon with stub wings and a spiky back ridge (red-orange, no flame on the tail tip). ' +
  'Wind: a round bird with a feather crest and wide wings (white and mint). ' +
  'Nature: a turtle with a leafy shell (green). ' +
  'Ice: an orca with frosty crystal tips on its fin (black and white with icy cyan accents). ' +
  'Poison: a coiled snake with acid-green diamond markings (purple). ' +
  'Lightning: a unicorn with a zigzag mane and bolt-shaped tail (neon blue body, gold horn). ' +
  'Metal: a lion with a mane of gear-shaped gold plates (gold). ' +
  'Earth: a sturdy ox with big curved horns and rocky plates on its hump (stone grey-brown). ' +
  'Alt Ice: a frost shark with an ice-crystal dorsal fin (pale ice blue).';

const JOBS = [
  {
    key: 'kv-repaint',
    ratio: '9:16',
    refs: ['reports/kv/map-sticker.jpg'],
    prompt:
      'This image is a screenshot of a mobile tower-defense game made with placeholder art. Repaint it as the finished, polished game: keep the exact layout, ' +
      'the 4x4 board, every tile position and its number, the four lanes, the cream rounded HUD panels and their text, the namecard column on the right and the ' +
      'switch on the left. Upgrade every creature, tile, lane and effect to high-end art: ' +
      STICKER +
      ' Babies peek over the bottom edge of their number tiles; the grown creatures on the lanes are full-bodied animals; the namecards on the right show ' +
      'soft-vinyl 3D toy portraits. Deep blue night-sky background with soft stars. Crisp, readable, cohesive, premium casual mobile game look.',
  },
  {
    key: 'kv-lineup',
    ratio: '16:9',
    refs: [],
    prompt:
      'Character line-up sheet for a cute mobile merge-and-defend game: nine element animals in two rows. Top row: each animal as a tiny chubby baby ' +
      '(big head, round body, funny expression). Bottom row: the same animal grown up, cool and powerful, about three heads tall, clearly the same ' +
      'character (same colours, markings and signature feature). Animals, left to right: ' +
      ANIMALS +
      ' ' +
      STICKER +
      ' Flat solid deep-navy background, even spacing, no text, no labels.',
  },
  {
    key: 'kv-portraits',
    ratio: '16:9',
    refs: [],
    prompt:
      'Three square namecard portraits side by side, each a head-and-shoulders bust in three-quarter view on its own rounded square plate with a radial ' +
      'gradient in the creature’s colour and soft light rays behind the head: (1) the ice orca with frosty crystal fin tips, (2) the gold gear-maned lion, ' +
      '(3) the neon-blue unicorn with a gold horn. Confident, charming expressions. ' +
      VINYL +
      ' Cream rounded frame around each portrait. No text.',
  },
  {
    key: 'kv-hero',
    ratio: '16:9',
    refs: [],
    prompt:
      'Key art for a cute-but-epic mobile game: a glowing 4x4 puzzle board of rounded cream tiles with numbers (2, 4, 16, 64, 256, 2048) in the centre, ' +
      'the nine element animals gathered around and on top of it in dynamic poses defending it from a few tiny chibi fantasy heroes approaching on paths ' +
      'from the top. ' +
      ANIMALS +
      ' ' +
      STICKER +
      ' Deep blue night sky with soft stars, warm light from the board, strong silhouettes, clear focal point, room at the top for a logo. No logo, no text other than tile numbers.',
  },
];

function mime(f) {
  return f.endsWith('.png') ? 'image/png' : 'image/jpeg';
}

async function generate(job, key, n) {
  const parts = [{ text: job.prompt }];
  for (const r of job.refs) {
    const f = join(root, r);
    if (!existsSync(f)) throw new Error(`missing reference ${r}`);
    parts.unshift({ inlineData: { mimeType: mime(f), data: readFileSync(f).toString('base64') } });
  }
  const verdict = checkBudget(loadLedger(ledgerFile), loadLimits(limitsFile), costOf(MODEL));
  if (!verdict.ok) throw Object.assign(new Error(`STOP: ${verdict.reason}`), { stop: true });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: job.ratio } } }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 429) {
    const free = /free_tier/.test(json.error?.message ?? '');
    throw Object.assign(new Error(free ? 'STOP: 429, the key is still on the free tier (image quota 0). Enable billing, then create a NEW key.' : `STOP: 429 ${json.error?.message?.slice(0, 200)}`), { stop: true });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${json.error?.message?.slice(0, 200) ?? ''}`);
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error(`no image (${json.candidates?.[0]?.finishReason ?? 'unknown'})`);
  appendLedger(ledgerFile, { t: Date.now(), model: MODEL, usd: costOf(MODEL), key: job.key });
  const ext = part.inlineData.mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const file = join(outDir, `${job.key}${variants > 1 ? `-${n + 1}` : ''}.${ext}`);
  writeFileSync(file, Buffer.from(part.inlineData.data, 'base64'));
  return file;
}

async function main() {
  const jobs = JOBS.filter((j) => !only.length || only.includes(j.key));
  const total = jobs.length * variants * costOf(MODEL);
  const u = weeklyUsage(loadLedger(ledgerFile));
  console.log(`${jobs.length * variants} images on ${MODEL}: ~$${total.toFixed(2)} (this week so far: $${u.usd.toFixed(2)})`);
  if (dry) {
    for (const j of jobs) console.log(`\n[${j.key}] ${j.ratio}${j.refs.length ? ` refs: ${j.refs.join(', ')}` : ''}\n${j.prompt}`);
    return;
  }
  mkdirSync(outDir, { recursive: true });
  const key = apiKey();
  for (const j of jobs) {
    for (let n = 0; n < variants; n++) {
      try {
        const t = Date.now();
        const f = await generate(j, key, n);
        console.log(`saved ${f} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
      } catch (e) {
        console.error(`${j.key}: ${e.message}`);
        if (e.stop) {
          console.error('\n⚠️  GEMINI IMAGE GENERATION STOPPED: nothing more will be requested.');
          process.exitCode = 3;
          return;
        }
      }
    }
  }
  const v = checkBudget(loadLedger(ledgerFile), loadLimits(limitsFile));
  console.log(`weekly Gemini spend now ${Math.round(v.pct * 100)}% of the limit`);
}

main();
