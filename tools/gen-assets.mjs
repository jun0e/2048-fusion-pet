#!/usr/bin/env node
// Generate game sprites with the Gemini image API, key out their backgrounds,
// and write public/assets/*.png plus public/assets/manifest.json (read by the game).
//
//   node tools/gen-assets.mjs                 # generate what is missing
//   node tools/gen-assets.mjs --force         # regenerate everything
//   node tools/gen-assets.mjs --only=enemy.pixie,proj.fire
//   node tools/gen-assets.mjs --rekey         # redo background removal from cached raws
//   node tools/gen-assets.mjs --status        # weekly Gemini spend so far
//   node tools/gen-assets.mjs --probe         # one tiny image: is the key on a paid tier?
//
// Budget: every image is logged (tools/.cache/gemini-usage.json) and generation warns
// and stops at 80% of the weekly limit in tools/gemini-budget.json (see gemini-budget.mjs).
// A 429 stops the run instead of quietly falling through to another model (that mixed
// model styles inside one set). The key is read from GEMINI_API_KEY (env) or
// .env.local (git-ignored). Never commit it.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from './assets.config.mjs';
import { costOf, checkBudget, loadLimits, loadLedger, appendLedger, weeklyUsage } from './gemini-budget.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets');
const rawDir = join(root, 'tools', '.cache', 'raw');
const ledgerFile = join(root, 'tools', '.cache', 'gemini-usage.json');
const limitsFile = join(root, 'tools', 'gemini-budget.json');
const alertFile = join(root, 'tools', '.cache', 'GEMINI-BUDGET-STOP.txt');
mkdirSync(outDir, { recursive: true });
mkdirSync(rawDir, { recursive: true });

const args = process.argv.slice(2);
const force = args.includes('--force');
const rekey = args.includes('--rekey');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
// Nano Banana 2.1 first (the recommended default); Pro only when asked for per run.
const MODELS = (process.env.GEMINI_IMAGE_MODEL ?? 'gemini-nano-banana-2.1').split(',');

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const f = join(root, '.env.local');
  if (existsSync(f)) {
    const m = readFileSync(f, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error('No GEMINI_API_KEY in the environment or .env.local');
}

const BG_HEX = { green: '#00FF00', magenta: '#FF00FF' };

class StopError extends Error {}

let stopped = null; // set once: every worker stops
function stop(reason, budget = false) {
  if (stopped) return;
  stopped = reason;
  const hint = budget ? 'Raise the limit in tools/gemini-budget.json, or wait for the 7-day window, to continue.' : 'Nothing was charged for the failed request.';
  const msg = `\n⚠️  GEMINI IMAGE GENERATION STOPPED\n   ${reason}\n   ${hint}\n`;
  console.error(msg);
  mkdirSync(dirname(alertFile), { recursive: true });
  writeFileSync(alertFile, `${new Date().toISOString()}\n${reason}\n`);
}

function guard(model) {
  const verdict = checkBudget(loadLedger(ledgerFile), loadLimits(limitsFile), costOf(model));
  if (!verdict.ok) {
    stop(verdict.reason, true);
    throw new StopError(verdict.reason);
  }
  return verdict;
}

async function generate(asset, key) {
  const prompt = `${asset.prompt} Background: a perfectly flat, uniform, solid ${asset.bg} (${BG_HEX[asset.bg]}) colour filling the whole image, with no gradient, texture or vignette.`;
  const errors = [];
  for (const model of MODELS) {
    for (const withConfig of [true, false]) {
      if (stopped) throw new StopError(stopped);
      guard(model);
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], ...(withConfig ? { imageConfig: { aspectRatio: '1:1' } } : {}) },
      };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) {
        // quota or spend cap: stop everything rather than switch models mid-set
        const free = /free_tier/.test(json.error?.message ?? '');
        stop(free ? `${model}: 429, the key is on the free tier (image quota 0). Enable billing, then create a NEW key.` : `${model}: 429 ${json.error?.message?.slice(0, 200) ?? ''}`);
        throw new StopError(stopped);
      }
      if (!res.ok) {
        const err = `${model}: HTTP ${res.status} ${json.error?.message?.slice(0, 160) ?? ''}`;
        if (res.status === 400 && withConfig) continue; // retry without imageConfig
        errors.push(err);
        if (res.status === 404) break; // model not available: try the next one
        throw new Error(errors.join(' | '));
      }
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (part) {
        appendLedger(ledgerFile, { t: Date.now(), model, usd: costOf(model), key: asset.key });
        const v = checkBudget(loadLedger(ledgerFile), loadLimits(limitsFile));
        if (v.pct >= 0.6) console.warn(`   budget: ${Math.round(v.pct * 100)}% of the weekly limit used`);
        return { model, data: Buffer.from(part.inlineData.data, 'base64') };
      }
      errors.push(`${model}: no image in response (${json.candidates?.[0]?.finishReason ?? 'unknown'})`);
      break;
    }
  }
  throw new Error(errors.join(' | '));
}

function key(asset) {
  const raw = join(rawDir, asset.file);
  const out = join(outDir, asset.file);
  execFileSync('python3', [join(root, 'tools', 'chroma.py'), raw, out, asset.bg, String(asset.size)], { stdio: 'pipe' });
}

function status() {
  const limits = loadLimits(limitsFile);
  const u = weeklyUsage(loadLedger(ledgerFile));
  const v = checkBudget(loadLedger(ledgerFile), limits);
  console.log(`weekly Gemini spend: $${u.usd.toFixed(2)} over ${u.images} images (${Math.round(v.pct * 100)}% of $${limits.weeklyLimitUsd}; stops at ${Math.round(limits.stopAt * 100)}%)`);
}

async function probe() {
  const asset = { key: 'probe', prompt: 'A small cute round orange creature sticker with a thick dark outline, flat colours.', bg: 'green' };
  try {
    const { model } = await generate(asset, apiKey());
    console.log(`probe ok: ${model} generated an image, so the key has paid image access`);
  } catch (e) {
    console.error(`probe failed: ${e.message}`);
    process.exitCode = 1;
  }
  status();
}

async function main() {
  if (args.includes('--status')) return status();
  if (args.includes('--probe')) return probe();
  const manifestPath = join(outDir, 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { files: {} };
  const todo = ASSETS.filter((a) => (only.length ? only.includes(a.key) : true));
  const k = rekey ? null : apiKey();
  if (!rekey) status();
  let ok = 0;
  let failed = 0;
  // small concurrency keeps us well under rate limits
  const queue = [...todo];
  async function worker() {
    for (let a = queue.shift(); a && !stopped; a = queue.shift()) {
      const raw = join(rawDir, a.file);
      try {
        if (!rekey && (force || !existsSync(raw))) {
          const t = Date.now();
          const { model, data } = await generate(a, k);
          writeFileSync(raw, data);
          console.log(`generated ${a.key} with ${model} in ${((Date.now() - t) / 1000).toFixed(1)}s`);
        }
        if (existsSync(raw)) {
          key(a);
          manifest.files[a.key] = a.file;
          ok += 1;
        }
      } catch (e) {
        if (e instanceof StopError) break;
        failed += 1;
        console.error(`FAILED ${a.key}: ${e.message}`);
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`done: ${ok} ok, ${failed} failed → ${manifestPath}`);
  if (!rekey) status();
  if (failed) process.exitCode = 1;
  if (stopped) process.exitCode = 3;
}

main();
