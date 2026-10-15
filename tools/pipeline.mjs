#!/usr/bin/env node
// The whole asset pipeline, end to end and unattended:
//   plan (catalog → jobs) → generate with Gemini, passing references → post-process
//   (key, trim, palette hard limit) → QA (retry once if it fails) → public/assets/gen/
//   + public/assets/manifest.json (the game loads them at start) → contact sheet.
// Resumable (finished assets are skipped), dependency-ordered (a stage edit waits for
// the previous stage, a fusion for both parents), and guarded by the weekly Gemini
// budget (stops at 80%, see tools/gemini-budget.mjs). A 429 quota error stops the run.
//
// Two backends, picked by which key is in .env.local (or the environment):
//   VERTEX_API_KEY  Vertex AI / Gemini Enterprise Agent Platform in express mode (global
//                   endpoint, no project). Free 90-day tier for new Google Cloud users, or
//                   billed to a Cloud billing account, where the Google AI Pro $10/month
//                   credit applies. Default model gemini-3.1-flash-image (Nano Banana 2).
//   GEMINI_API_KEY  Gemini Developer API (an AI Studio key, prepaid billing; the AI Pro credit
//                   does not apply there). Default model gemini-nano-banana-2.1.
// VERTEX_API_KEY wins when both exist; --backend=gemini|vertex forces one.
// GEMINI_IMAGE_MODEL / GEMINI_BEST_MODEL override the models.
//
//   node tools/pipeline.mjs --dry              # the plan, prompts and cost; calls nothing
//   node tools/pipeline.mjs                    # P0 + P1: everything the game needs
//   node tools/pipeline.mjs --priority=P0      # the vertical slice only (+ its references)
//   node tools/pipeline.mjs --priority=P0,P1,P2 --only=pet.fire.16,egg.2 --force
//   node tools/pipeline.mjs --repost           # redo post-processing from cached raws (no API calls)
//   node tools/pipeline.mjs --mock             # labelled placeholders instead of Gemini, written to
//                                              # public/assets/_mock/ (free end-to-end test; view with
//                                              # index.html?kv&manifest=assets/_mock/manifest.json)
//   node tools/pipeline.mjs --status
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssetRows } from '../src/art/asset-catalog.js';
import { plan, MODEL_FAST } from './pipeline-jobs.mjs';
import { PRICES, costOf, checkBudget, loadLimits, loadLedger, appendLedger, weeklyUsage } from './gemini-budget.mjs';
import { classify429 } from './gemini-errors.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mock = args.includes('--mock');
const cache = join(root, 'tools', '.cache', 'pipeline');
const rawDir = join(cache, mock ? 'mock-raw' : 'raw');
const assetsDir = join(root, 'public', 'assets', ...(mock ? ['_mock'] : []));
const outDir = join(assetsDir, 'gen');
const manifestFile = join(assetsDir, 'manifest.json');
const ledgerFile = join(root, 'tools', '.cache', 'gemini-usage.json');
const limitsFile = join(root, 'tools', 'gemini-budget.json');
const logFile = join(cache, mock ? 'mock-log.jsonl' : 'log.jsonl');
const sheetFile = join(root, 'reports', 'kv', mock ? 'pipeline-sheet-mock.html' : 'pipeline-sheet.html');
const alertFile = join(root, 'tools', '.cache', 'GEMINI-BUDGET-STOP.txt');
for (const d of [rawDir, outDir, dirname(sheetFile)]) mkdirSync(d, { recursive: true });

const arg = (k, d = '') => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const dry = args.includes('--dry');
const force = args.includes('--force');
const repost = args.includes('--repost');
const priorities = arg('priority', 'P0,P1').split(',');
const only = arg('only').split(',').filter(Boolean);
const CONCURRENCY = Number(arg('concurrency', '2')) || 2;

const log = (o) => appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');
const rawOf = (id) => join(rawDir, `${id}.png`);
const outOf = (id) => join(outDir, `${id}.png`);

/** Last value of NAME in the environment or .env.local (later lines win, so a re-pasted key replaces the old one). */
function envValue(name) {
  if (process.env[name]) return process.env[name];
  for (const f of [join(root, '.env.local'), join(root, '..', 'merge-ball-td', '.env.local')]) {
    if (!existsSync(f)) continue;
    const all = [...readFileSync(f, 'utf8').matchAll(new RegExp(`^${name}=(.+)$`, 'gm'))];
    if (all.length) return all[all.length - 1][1].trim();
  }
  return null;
}

const BACKENDS = {
  vertex: {
    keyName: 'VERTEX_API_KEY',
    label: 'Vertex AI express mode',
    models: { fast: 'gemini-3.1-flash-image' },
    url: (model) => `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`,
  },
  gemini: {
    keyName: 'GEMINI_API_KEY',
    label: 'Gemini Developer API (AI Studio key)',
    models: { fast: 'gemini-nano-banana-2.1' },
    url: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  },
};

function pickBackend() {
  const forced = arg('backend');
  const name = forced || (envValue('VERTEX_API_KEY') ? 'vertex' : 'gemini');
  const b = BACKENDS[name];
  if (!b) throw new Error(`unknown --backend=${name} (vertex or gemini)`);
  const fast = process.env.GEMINI_IMAGE_MODEL ?? b.models.fast;
  return { name, ...b, models: { fast, best: process.env.GEMINI_BEST_MODEL ?? fast } };
}

function apiKey(backend) {
  const k = envValue(backend.keyName);
  if (!k) throw new Error(`No ${backend.keyName} (env or .env.local)`);
  return k;
}

function loadManifest() {
  try {
    return JSON.parse(readFileSync(manifestFile, 'utf8'));
  } catch {
    return { files: {} };
  }
}

/** A reference is an asset id (its raw image) or a file path inside the repo. */
function refFile(ref) {
  if (ref.includes('/')) return join(root, ref);
  return rawOf(ref);
}

class Stop extends Error {}

const execFileP = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pauseUntil = 0; // a rate limit pauses every job, not just the one that hit it
let lastProgress = Date.now(); // last finished image; a 429 that outlasts GIVE_UP_MS stops the run
const GIVE_UP_MS = 15 * 60 * 1000;
/**
 * POST JSON through curl (HTTP/2). Node's built-in fetch stalls on Vertex image calls (no
 * response headers for 5 minutes), while curl gets the same image back in ~45 s. The key
 * goes in a private headers file, not on the command line.
 */
async function postJson(url, key, body) {
  const dir = mkdtempSync(join(tmpdir(), 'mb-pipeline-'));
  try {
    const bodyFile = join(dir, 'body.json');
    const outFile = join(dir, 'out.json');
    const hdrFile = join(dir, 'headers.txt');
    writeFileSync(bodyFile, JSON.stringify(body));
    writeFileSync(hdrFile, `x-goog-api-key: ${key}\ncontent-type: application/json\n`, { mode: 0o600 });
    let stdout;
    try {
      ({ stdout } = await execFileP('curl', ['-s', '--http2', '-m', '300', '-X', 'POST', url, '-H', `@${hdrFile}`, '--data-binary', `@${bodyFile}`, '-o', outFile, '-w', '%{http_code}']));
    } catch (e) {
      throw new Error(`network: curl exit ${e.code}${e.code === 28 ? ' (timed out after 300 s)' : ''}`);
    }
    let json = {};
    try {
      json = JSON.parse(readFileSync(outFile, 'utf8'));
    } catch {
      /* empty or non-JSON body */
    }
    return { status: Number(stdout.trim()) || 0, json };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function mockRaw(job) {
  execFileSync('python3', [join(root, 'tools', 'mock_raw.py'), job.id, rawOf(job.id), '--bg', job.bg ?? 'none', '--aspect', job.aspect]);
  return readFileSync(rawOf(job.id));
}

async function callGemini(job, key, backend) {
  const parts = [];
  for (const ref of job.refs) {
    const f = refFile(ref);
    if (!existsSync(f)) throw new Error(`missing reference ${ref}`);
    if (!mock) parts.push({ inlineData: { mimeType: f.endsWith('.jpg') ? 'image/jpeg' : 'image/png', data: readFileSync(f).toString('base64') } });
  }
  if (mock) return mockRaw(job); // references were still checked: the dependency order is exercised
  parts.push({ text: job.prompt });
  const verdict = checkBudget(loadLedger(ledgerFile), loadLimits(limitsFile), costOf(job.model));
  if (!verdict.ok) throw new Stop(`budget: ${verdict.reason}`);
  let withConfig = true;
  let modalities = ['IMAGE'];
  let limited = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    if (Date.now() < pauseUntil) await sleep(pauseUntil - Date.now());
    const generationConfig = { responseModalities: modalities, ...(withConfig ? { imageConfig: { aspectRatio: job.aspect } } : {}) };
    const { status, json } = await postJson(backend.url(job.model), key, { contents: [{ role: 'user', parts }], generationConfig });
    const res = { status, ok: status >= 200 && status < 300 };
    const msg = json.error?.message ?? '';
    if (res.status === 429) {
      const q = classify429(json);
      if (q.kind === 'noaccess')
        throw new Stop(
          backend.name === 'gemini'
            ? `${job.model}: 429, this AI Studio key has no image quota (free tier). Either save a Vertex express-mode key as VERTEX_API_KEY (free 90-day tier, or the AI Pro credit), or add prepaid billing in AI Studio and create a NEW key.`
            : `${job.model}: 429, no image quota on this Vertex key. Link a billing account in express mode (the AI Pro credit applies there).`,
        );
      if (q.kind === 'daily') throw new Stop(`${job.model}: 429, the daily quota is used up. Run the same command tomorrow to resume.`);
      if (q.kind === 'minute') {
        if (Date.now() - lastProgress > GIVE_UP_MS)
          throw new Stop(`${job.model}: still rate-limited after ${GIVE_UP_MS / 60000} minutes without a finished image (${msg.slice(0, 120)}). This looks like a quota cap: on the express-mode free tier, link a billing account to lift it.`);
        const wait = Math.min(120000, q.retryMs * 2 ** limited); // 20 s, 40 s, 80 s, then 2 min
        limited += 1;
        pauseUntil = Math.max(pauseUntil, Date.now() + wait);
        log({ id: job.id, rateLimited: true, waitS: wait / 1000, detail: json.error?.details ?? null });
        console.log(`  ${job.id}: rate limited, all jobs pause ${Math.round(wait / 1000)} s`);
        continue;
      }
      throw new Stop(`${job.model}: 429 ${msg.slice(0, 220)}`); // a spend cap or an unknown quota
    }
    if (res.status >= 500 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }
    if (res.status === 400 && withConfig && /imageConfig|aspect/i.test(msg)) {
      withConfig = false; // an older model without imageConfig: retry plain
      continue;
    }
    if (res.status === 400 && modalities.length === 1 && /modalit/i.test(msg)) {
      modalities = ['TEXT', 'IMAGE']; // some endpoints want text allowed alongside the image
      continue;
    }
    if (res.status === 404) throw new Stop(`${job.model}: not available on ${backend.label} (HTTP 404). Set GEMINI_IMAGE_MODEL to one it offers, e.g. gemini-3.1-flash-image or gemini-2.5-flash-image.`);
    if (res.status === 401 || res.status === 403 || /API key not valid|API_KEY_INVALID|API keys are not supported/i.test(msg))
      throw new Stop(`${job.model}: HTTP ${res.status} ${msg.slice(0, 160)} (check ${backend.keyName} in .env.local: a ${backend.name === 'vertex' ? 'Vertex express-mode' : 'AI Studio'} key)`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${msg.slice(0, 200)}`);
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error(`no image (${json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason ?? 'unknown'})`);
    appendLedger(ledgerFile, { t: Date.now(), model: job.model, usd: costOf(job.model), key: job.id, backend: backend.name });
    const v = checkBudget(loadLedger(ledgerFile), loadLimits(limitsFile));
    if (v.pct >= 0.6) console.warn(`   budget: ${Math.round(v.pct * 100)}% of the nearest limit used (weekly or 30-day; stops at 80%)`);
    return Buffer.from(part.inlineData.data, 'base64');
  }
  throw new Error('gave up after retries');
}

function postProcess(job) {
  const p = job.post;
  const a = [join(root, 'tools', 'post.py'), rawOf(job.id), outOf(job.id), '--bg', job.bg ?? 'none', '--size', String(p.size), '--fit', p.fit];
  if (p.palette) a.push('--palette', p.palette.join(','));
  if (p.snap) a.push('--snap');
  const outStr = execFileSync('python3', a, { encoding: 'utf8' });
  return JSON.parse(outStr.trim().split('\n').pop());
}

function writeSheet(jobs, manifest) {
  const cards = jobs
    .map((j) => {
      const done = existsSync(outOf(j.id));
      const qa = manifest.meta?.[j.id]?.qa;
      return `<figure class="${done ? '' : 'miss'}">${done ? `<img src="../../public/assets/${mock ? '_mock/' : ''}gen/${j.id}.png" onerror="this.onerror=null;this.src='/assets/${mock ? '_mock/' : ''}gen/${j.id}.png'" loading="lazy">` : '<div class="todo">not yet</div>'}<figcaption><b>${j.id}</b><span>${qa ? `cov ${qa.coverage}${qa.in_palette != null ? ` · palette ${Math.round(qa.in_palette * 100)}%` : ''}${qa.ok ? '' : ' · CHECK'}` : ''}</span></figcaption></figure>`;
    })
    .join('');
  writeFileSync(
    sheetFile,
    `<!doctype html><meta charset="utf-8"><title>Pipeline sheet</title><style>body{margin:0;background:#17203f;color:#fffaf2;font:600 13px Nunito,system-ui,sans-serif;padding:18px}h1{font:800 24px 'Baloo 2',sans-serif}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}figure{margin:0;background:#1f2a55;border-radius:12px;padding:8px;background-image:repeating-conic-gradient(#2a3566 0% 25%,#253060 0% 50%);background-size:14px 14px}figure img{width:100%;height:130px;object-fit:contain}figcaption b{display:block;font-size:11px}figcaption span{color:#c9d3ff;font-size:11px}.miss{opacity:.45}.todo{height:130px;display:grid;place-items:center;color:#93a0d6}</style><h1>Asset pipeline: ${jobs.filter((j) => existsSync(outOf(j.id))).length} / ${jobs.length} done</h1><div class="g">${cards}</div>`,
  );
}

async function main() {
  const backend = pickBackend();
  const rows = buildAssetRows(PRICES[backend.models.fast] ?? PRICES[MODEL_FAST]);
  const { jobs: planned, skipped } = plan(rows, root, priorities, backend.models);
  let jobs = only.length ? planned.filter((j) => only.includes(j.id)) : planned;
  const manifest = loadManifest();
  manifest.files ??= {};
  manifest.meta ??= {};

  if (args.includes('--status')) {
    const done = jobs.filter((j) => existsSync(outOf(j.id))).length;
    const u = weeklyUsage(loadLedger(ledgerFile));
    console.log(`${done}/${jobs.length} assets done; weekly Gemini spend $${u.usd.toFixed(2)} (${u.images} images)`);
    return;
  }

  const todo = jobs.filter((j) => force || !existsSync(outOf(j.id)));
  const jobIds = new Set(planned.map((j) => j.id));
  const byCode = rows.filter((r) => priorities.includes(r.priority) && !r.method.startsWith('Gemini') && !jobIds.has(r.id)).reduce((n, r) => n + r.count, 0);
  const cost = todo.reduce((s, j) => s + costOf(j.model), 0);
  const byModel = todo.reduce((m, j) => ((m[j.model] = (m[j.model] ?? 0) + 1), m), {});
  if (!mock) console.log(`backend: ${backend.label}${envValue(backend.keyName) ? '' : ` (no ${backend.keyName} yet)`}`);
  console.log(`plan: ${jobs.length} assets (${priorities.join('+')}), ${todo.length} to make, ~$${cost.toFixed(2)} for one pass (${Object.entries(byModel).map(([k, v]) => `${v} × ${k}`).join(', ')}); plus ${byCode} assets drawn in code (glyphs, plates, effects, UI)${skipped.length ? `; no job yet for ${skipped.join(', ')}` : ''}`);
  if (dry) {
    writeFileSync(join(cache, 'plan.json'), JSON.stringify(todo, null, 1));
    const order = [];
    const done = new Set(jobs.filter((j) => !todo.includes(j)).map((j) => j.id));
    let left = [...todo];
    while (left.length) {
      const ready = left.filter((j) => j.deps.every((d) => done.has(d)));
      if (!ready.length) {
        console.log(`unresolvable: ${left.map((j) => j.id).join(', ')}`);
        break;
      }
      order.push(ready.map((j) => j.id));
      for (const j of ready) done.add(j.id);
      left = left.filter((j) => !ready.includes(j));
    }
    order.forEach((wave, i) => console.log(`wave ${i + 1}: ${wave.length} → ${wave.slice(0, 6).join(', ')}${wave.length > 6 ? ', …' : ''}`));
    console.log(`prompts written to ${join(cache, 'plan.json')}`);
    writeSheet(jobs, manifest);
    return;
  }

  if (repost) {
    let n = 0;
    for (const j of jobs.filter((j) => existsSync(rawOf(j.id)))) {
      const qa = postProcess(j);
      manifest.files[j.id] = `gen/${j.id}.png`;
      manifest.meta[j.id] = { ...manifest.meta[j.id], qa };
      n += 1;
      if (!qa.ok) console.log(`  ${j.id}: QA flagged ${JSON.stringify(qa)}`);
    }
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    writeSheet(jobs, manifest);
    console.log(`re-post-processed ${n} cached raws`);
    return;
  }

  const key = mock ? null : apiKey(backend);
  const state = new Map(jobs.map((j) => [j.id, existsSync(outOf(j.id)) && !force ? 'done' : 'todo']));
  let stopped = null;
  let made = 0;
  let failed = 0;

  function accept(job, qa, t) {
    lastProgress = Date.now();
    manifest.files[job.id] = `gen/${job.id}.png`;
    manifest.meta[job.id] = { qa, model: job.model, at: new Date().toISOString() };
    manifest.generatedAt = new Date().toISOString();
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    state.set(job.id, 'done');
    made += 1;
    console.log(`✓ ${job.id} (${((Date.now() - t) / 1000).toFixed(0)} s${qa.in_palette != null ? `, palette ${Math.round(qa.in_palette * 100)}% before snap` : ''}${qa.ok ? '' : ', QA flagged'})`);
  }

  async function runJob(job) {
    state.set(job.id, 'running');
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t = Date.now();
      const reuse = attempt === 1 && !force && existsSync(rawOf(job.id)); // paid for already: post-process only
      try {
        if (!reuse) writeFileSync(rawOf(job.id), await callGemini(job, key, backend));
      } catch (e) {
        if (e instanceof Stop) {
          stopped = e.message;
          state.set(job.id, 'todo');
          return;
        }
        log({ id: job.id, attempt, error: e.message });
        console.log(`  ${job.id}: ${e.message}${attempt < 2 ? ', retrying' : ''}`);
        continue;
      }
      let qa;
      try {
        qa = postProcess(job);
      } catch (e) {
        log({ id: job.id, attempt, postError: e.message });
        console.log(`  ${job.id}: post-processing failed (${e.message.split('\n')[0]}); raw kept, fix and run --repost`);
        break;
      }
      log({ id: job.id, attempt, reused: reuse, model: job.model, secs: (Date.now() - t) / 1000, qa });
      if (!qa.ok && attempt < 2) {
        console.log(`  ${job.id}: QA failed (coverage ${qa.coverage}, fringe ${qa.fringe}), ${reuse ? 'generating fresh' : 'retrying'}`);
        continue;
      }
      accept(job, qa, t);
      return;
    }
    state.set(job.id, 'failed');
    failed += 1;
  }

  // dependency-ordered scheduler with a small pool
  const running = new Set();
  for (;;) {
    if (stopped) break;
    const ready = jobs.filter((j) => state.get(j.id) === 'todo' && j.deps.every((d) => state.get(d) === 'done' || (!state.has(d) && existsSync(rawOf(d)))));
    const blocked = jobs.filter((j) => state.get(j.id) === 'todo' && j.deps.some((d) => state.get(d) === 'failed'));
    for (const j of blocked) state.set(j.id, 'failed');
    while (ready.length && running.size < CONCURRENCY) {
      const j = ready.shift();
      const p = runJob(j).finally(() => running.delete(p));
      running.add(p);
    }
    if (!running.size) break;
    await Promise.race(running);
  }
  await Promise.all(running);
  writeSheet(jobs, manifest);
  const left = jobs.filter((j) => state.get(j.id) !== 'done').map((j) => j.id);
  const u = weeklyUsage(loadLedger(ledgerFile));
  console.log(`\n${made} made, ${failed} failed, ${left.length} not done; weekly spend $${u.usd.toFixed(2)}; sheet: ${sheetFile}`);
  if (stopped) {
    writeFileSync(alertFile, `${new Date().toISOString()}\n${stopped}\n`);
    console.log(`\n⚠️  GEMINI IMAGE GENERATION STOPPED: ${stopped}\n   Finished assets are kept; run the same command again to resume.`);
    process.exitCode = 3;
  } else if (failed) process.exitCode = 1;
}

main();

