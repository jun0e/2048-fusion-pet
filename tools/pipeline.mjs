#!/usr/bin/env node
// The whole asset pipeline, end to end and unattended:
//   plan (catalog → jobs) → generate with Gemini, passing references → post-process
//   (key, trim, palette hard limit) → QA (retry once if it fails) → public/assets/gen/
//   + public/assets/manifest.json (the game loads them at start) → contact sheet.
// Resumable (a current output is kept; a raw already paid for that still answers its job is
// re-posted, not drawn again), dependency-ordered (a stage waits for the one it is drawn from, and a
// job made from one redrawn in the run is made again after it), and guarded by the weekly Gemini
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
//   node tools/pipeline.mjs --repost --adopt --only=…   # re-post raws checked by eye, recorded as drawn for today's ask (ids, no globs)
// --only takes ids or globs (--only=enemy.*,vfx.fire.*).
//
// Gated jobs (the foes, job.pick): n candidates are made, post-processed and scored by
// tools/silhouette-check.py, and tools/pick.mjs keeps the best inside the gates; one strict round
// follows only when none is inside them. Each job's candidate raws, their prompt hash and their
// scores are kept in a sidecar (cache/cand/<id>.gate.json), so a resumed run reuses what it paid
// for. A foe that ships outside its gates is stored with pass: false and its margins, warned
// about, marked on the contact sheet, and the run exits with code 2 (1: a job failed, 3: stopped).
// A --repost of a gated job scores what now ships again, with today's gates.
//
// Several pipeline processes may run at once: every manifest write re-reads the file, changes
// only its own job's entries and replaces the file atomically (commitManifest).
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, copyFileSync, readdirSync, renameSync, rmSync, statSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssetRows } from '../src/art/asset-catalog.js';
import { plan, MODEL_FAST, HERO_RIM, SHIPPED } from './pipeline-jobs.mjs';
import { PRICES, costOf, checkBudget, loadLimits, loadLedger, appendLedger, weeklyUsage } from './gemini-budget.mjs';
import { classify429 } from './gemini-errors.mjs';
import { postJson } from './curl-post.mjs';
import { failingGates, gateBrief, imagesFor, insideTolerance, needsStrict, rankCandidates, strictText, acceptedMiss } from './pick.mjs';
import { adoptRefusal, drawPlan, followers, isPostOnly, isReady, isSourceOf, isStale, rawRefusal, sourceOf as sourceIn, toMake } from './pipeline-state.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mock = args.includes('--mock');
const cache = join(root, 'tools', '.cache', 'pipeline');
const rawDir = join(cache, mock ? 'mock-raw' : 'raw');
const assetsDir = join(root, 'public', 'assets', ...(mock ? ['_mock'] : []));
const outDir = join(assetsDir, 'gen');
const candDir = join(cache, mock ? 'mock-cand' : 'cand'); // candidates of gated jobs (the foes)
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
const adoptRaws = args.includes('--adopt'); // with --repost and --only (ids): the raws given were checked by eye and answer today's ask
const priorities = arg('priority', 'P0,P1').split(',');
const only = arg('only').split(',').filter(Boolean);
const CONCURRENCY = Number(arg('concurrency', '2')) || 2;

/** A test for --only: each entry an id or a glob (`*` matches any run of characters). */
export function onlyMatcher(list) {
  const res = list.map((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`));
  return (id) => res.some((re) => re.test(id));
}

const log = (o) => appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');
const rawOf = (id) => join(rawDir, `${id}.png`);
const outOf = (id) => join(outDir, `${id}.png`);
/** Every job in the catalog by id (main sets it): sources and references follow `from` and `approved` through it. */
let jobsById = new Map();
/** The manifest this run sees (main sets it, and every commit updates it): what shipped for each id, and its record. */
let book = { files: {}, meta: {} };
/** The image a job is post-processed from (tools/pipeline-state.mjs sourceOf): never the raw cache for a post-only job. */
const sourceOf = (job) => sourceIn(job, { byId: jobsById, root, rawOf, outOf });
/** What shipped for the job called `id`: its approved design, else its output in public/assets/gen (committed). */
const shippedOf = (id) => (jobsById.get(id)?.approved ? join(root, jobsById.get(id).approved) : outOf(id));
/** Whether what `job` needs of its dependency `d` exists: a model's input (refFile: the drawing that shipped, as its raw or its output), anything else what shipped. */
const available = (job, d) => existsSync(!isPostOnly(job) && job.refs.includes(d) ? refFile(d) : shippedOf(d));
/** A raw's record (beside it, written when it lands): the ask it was drawn for, when, and by which model. */
const rawAskOf = (id) => `${rawOf(id)}.ask.json`;
function readRawAsk(id) {
  try {
    return JSON.parse(readFileSync(rawAskOf(id), 'utf8'));
  } catch {
    return null;
  }
}
/**
 * Record a raw (atomically: a torn record would read as none, and a paid raw be drawn again). `ask` is
 * taken before the request, from what was sent: a reference may change while the model draws.
 */
const writeRawAsk = (job, { ask, at = new Date().toISOString(), model = job.model }) => writeJsonAtomic(rawAskOf(job.id), { ask, at, model }, 0);
/** What a job's raw was drawn for: its record, or for a gated job picked before records, its sidecar's (`base`, its first round's ask). */
function rawRecord(job) {
  const rec = readRawAsk(job.id);
  if (rec || !job.pick) return rec;
  const side = readSidecar(job.id);
  return side.base ? { ask: side.base, at: side.updated, model: job.model } : null;
}
/** A job's cached raw as the bookkeeping sees it (tools/pipeline-state.mjs): its record, its file's time, and when it was drawn. */
function rawInfo(job) {
  const mtime = new Date(statSync(rawOf(job.id)).mtimeMs).toISOString();
  const record = rawRecord(job);
  return { mtime, record, at: record?.at ?? mtime };
}

/** Last value of NAME in the environment or .env.local (later lines win, so a re-pasted key replaces the old one). */
function envValue(name) {
  if (process.env[name]) return process.env[name].trim();
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
    models: { fast: 'gemini-3.1-flash-image', best: 'gemini-3-pro-image' }, // no budget caps: the best surfaces get Pro
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
  const fast = process.env.GEMINI_IMAGE_MODEL || b.models.fast; // || : an empty setting is no model
  return { name, ...b, models: { fast, best: process.env.GEMINI_BEST_MODEL || b.models.best || fast } };
}

function apiKey(backend) {
  const k = envValue(backend.keyName);
  if (!k) throw new Error(`No ${backend.keyName} (env or .env.local)`);
  return k;
}

const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Write JSON to a temp file beside `file`, then rename it over `file`: a reader sees the old file or the new one, never half. */
function writeJsonAtomic(file, obj, indent = 2) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, indent));
  renameSync(tmp, file);
}

/**
 * The manifest on disk as { files, meta, … }; a missing file is an empty one. A file caught half
 * written (an older pipeline wrote it in place) is read again, up to `tries` times 50 ms apart; one
 * that never parses stops the run rather than being replaced.
 */
export function readManifest(file, { tries: most = 40 } = {}) {
  for (let tries = 1; ; tries++) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') return { files: {}, meta: {} };
      throw e;
    }
    try {
      const m = JSON.parse(text);
      m.files ??= {};
      m.meta ??= {};
      return m;
    } catch (e) {
      if (tries >= most) throw new Error(`${file} does not parse (${e.message}); left as it is`);
      pause(50);
    }
  }
}

/**
 * Merge entries into the manifest on disk: re-read it (another pipeline process may have written
 * since), change only these ids' files[id] and meta[id] and generatedAt, and write it atomically.
 * entries: { id: { file, meta } }. → the merged manifest
 */
export function commitManifest(file, entries, at = new Date().toISOString()) {
  return withLock(`${file}.lock`, () => {
    const m = readManifest(file);
    for (const [id, { file: path, meta }] of Object.entries(entries)) {
      if (path) m.files[id] = path;
      if (meta) m.meta[id] = meta;
    }
    m.generatedAt = at;
    writeJsonAtomic(file, m);
    return m;
  });
}

/**
 * Run fn holding an exclusive lock (a directory: mkdir is atomic), so two pipeline processes never
 * read-merge-write the manifest at once. Waits up to 10 s; a lock older than 30 s is a crashed
 * process's and is taken over.
 */
export function withLock(lock, fn) {
  for (let waited = 0; ; waited += 50) {
    try {
      mkdirSync(lock);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let st;
      try {
        st = statSync(lock);
      } catch {
        continue; // released between the two calls
      }
      if (Date.now() - st.mtimeMs > 30000) {
        // move the stale lock aside, then check it is the one judged stale (same inode): a waiter that
        // lost the race to another's takeover puts that fresh lock back instead of deleting it
        const stale = `${lock}.stale.${process.pid}.${Date.now()}`;
        try {
          renameSync(lock, stale);
          if (statSync(stale).ino === st.ino) rmSync(stale, { recursive: true, force: true });
          else renameSync(stale, lock);
        } catch {
          /* another process took it over first */
        }
      }
      else if (waited >= 10000) throw new Error(`${lock} is held by another process`);
      else pause(50);
    }
  }
  try {
    return fn();
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}

/** Remove temp manifests a crashed writer left behind (writeJsonAtomic's, older than a minute). */
function sweepTemps(file) {
  const dir = dirname(file);
  const base = file.slice(dir.length + 1);
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    if (!f.startsWith(`${base}.`) || !f.endsWith('.tmp')) continue;
    try {
      if (Date.now() - statSync(join(dir, f)).mtimeMs > 60000) rmSync(join(dir, f), { force: true });
    } catch {
      /* gone already */
    }
  }
}

/**
 * A reference's file, as the model gets it: a path in the repo; `shipped:<id>`, an asset as it shipped
 * (its output in this run's assets folder); or an asset by its id: its raw (full size, on its key
 * colour) when that is the drawing that shipped, else its output (the ask hashes what shipped, so the
 * two must be one drawing); an approved design, its own file.
 */
function refFile(ref) {
  if (ref.startsWith(SHIPPED)) return shippedOf(ref.slice(SHIPPED.length));
  if (ref.includes('/')) return join(root, ref);
  const dep = jobsById.get(ref);
  if (dep?.approved) return join(root, dep.approved);
  return dep && existsSync(rawOf(ref)) && isSourceOf(rawInfo(dep), book.meta?.[ref]) ? rawOf(ref) : outOf(ref);
}

class Stop extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pauseUntil = 0; // a rate limit pauses every job, not just the one that hit it
let lastProgress = Date.now(); // last finished image; a 429 that outlasts GIVE_UP_MS stops the run
const GIVE_UP_MS = 15 * 60 * 1000;

function mockRaw(job) {
  execFileSync('python3', [join(root, 'tools', 'mock_raw.py'), job.id, rawOf(job.id), '--bg', job.bg ?? 'none', '--aspect', job.aspect]);
  return readFileSync(rawOf(job.id));
}

async function callGemini(job, key, backend) {
  const parts = [];
  const files = job.refs.map(refFile);
  files.forEach((f, i) => {
    if (!existsSync(f)) throw new Error(`missing reference ${job.refs[i]}`);
    if (!mock) parts.push({ inlineData: { mimeType: f.endsWith('.jpg') ? 'image/jpeg' : 'image/png', data: readFileSync(f).toString('base64') } });
  });
  log({ id: job.id, sent: files.map((f) => relative(root, f)) }); // one image asked for, and which file stood for each reference
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
    lastProgress = Date.now(); // a finished image, even a candidate that loses, is progress
    return Buffer.from(part.inlineData.data, 'base64');
  }
  throw new Error('gave up after retries');
}

function postProcess(job, src = rawOf(job.id), dst = outOf(job.id)) {
  const p = job.post;
  const a = [join(root, 'tools', 'post.py'), src, dst, '--bg', job.bg ?? 'none', '--size', String(p.size), '--fit', p.fit];
  if (p.plate) a.push('--plate', p.plate.join(','));
  if (p.palette) a.push('--palette', p.palette.join(','));
  if (p.snap) a.push('--snap');
  if (p.stripRim) a.push('--strip-rim');
  const outStr = execFileSync('python3', a, { encoding: 'utf8' });
  return JSON.parse(outStr.trim().split('\n').pop());
}

/** A hero sprite (a base pet, a fusion) carries the cream sticker rim, which is not its silhouette. */
const isHero = (id) => id.startsWith('pet.') || id.startsWith('fusion.');

/**
 * A gated job's spec for tools/silhouette-check.py: a sprite already made under its contract stands
 * in for its sketch. `pick.allies` is an id prefix ('fusion.': every sprite it starts) or a list of
 * ids (the ones made so far); with no chapter (the pets) the marching-chapter pool is empty. A pet's
 * rim (`pick.rim`) is stripped from it and from the pets made so far, and every hero ally's from it.
 */
export function gateSpec(job, manifest, candidates, dir = outDir) {
  const p = job.pick;
  const file = (id) => join(dir, `${id}.png`);
  const made = (id) => manifest.meta?.[id]?.gate && existsSync(file(id));
  const chaptersOf = (o) => o.chapters ?? (o.chapter ? [o.chapter] : []);
  const allyIds = typeof p.allies === 'string'
    ? readdirSync(dir).filter((f) => f.startsWith(p.allies) && f.endsWith('.png')).map((f) => f.slice(0, -4))
    : (p.allies ?? []).filter((id) => existsSync(file(id)));
  return {
    contract: join(root, p.contract),
    view: p.view,
    ...(p.chapter ? { chapter: p.chapter } : {}),
    chapters: chaptersOf(p),
    grounds: p.grounds,
    ...(p.band ? { band: p.band } : {}),
    ...(p.rim ? { rim: p.rim } : {}),
    others: p.others.map((o) => ({
      id: o.id,
      chapters: chaptersOf(o),
      ...(made(o.id) ? { path: file(o.id), mask: 'alpha', ...(p.rim ? { rim: p.rim } : {}) } : { path: join(root, o.sil), mask: 'dark' }),
    })),
    allies: allyIds.map((id) => ({ id, path: file(id), ...(isHero(id) ? { rim: HERO_RIM } : {}) })),
    candidates,
  };
}

/**
 * Score files with tools/silhouette-check.py: one result per file, in order (a file it could not
 * score has `error`). Scored together; if the script itself fails, each file is scored on its own,
 * so one bad candidate never costs the others their scores.
 */
function runGate(job, manifest, files) {
  const call = (list) => JSON.parse(execFileSync('python3', [join(root, 'tools', 'silhouette-check.py')], { input: JSON.stringify(gateSpec(job, manifest, list)), encoding: 'utf8' })).results;
  try {
    return call(files);
  } catch (e) {
    if (files.length < 2) return [{ path: files[0], error: e.message.split('\n')[0] }];
    return files.map((f) => {
      try {
        return call([f])[0];
      } catch (e1) {
        return { path: f, error: e1.message.split('\n')[0] };
      }
    });
  }
}

/** Where a gated job's candidates are recorded: each one's prompt hash, QA and scores, and the pick. */
const sidecarOf = (id) => join(candDir, `${id}.gate.json`);
function readSidecar(id) {
  try {
    const s = JSON.parse(readFileSync(sidecarOf(id), 'utf8'));
    return { ...s, candidates: s.candidates ?? {} };
  } catch {
    return { id, candidates: {} };
  }
}

/**
 * What a job is asked: its aspect, key colour, prompt, and the references' bytes as they shipped (a
 * path's committed file, an asset's shipped output; never the raw cache, which differs in every
 * checkout: a model sent an asset's raw gets it only when it is the drawing that shipped, refFile).
 * Not the model: which model a job gets depends on the key a checkout has (Vertex or AI Studio), and
 * every checkout must agree on what is current (the model is in meta.model and the raw's record). A
 * stored candidate or a cached raw is used only for the same ask. A reference whose pixels change
 * (a redraw, a re-post with other post args) changes the ask of every job drawn from it.
 */
function askHash(ask) {
  const h = createHash('sha256').update(JSON.stringify({ aspect: ask.aspect, bg: ask.bg ?? 'none', prompt: ask.prompt, refs: ask.refs }));
  for (const r of ask.refs) {
    const f = r.startsWith(SHIPPED) ? shippedOf(r.slice(SHIPPED.length)) : r.includes('/') ? join(root, r) : shippedOf(r);
    h.update(existsSync(f) ? readFileSync(f) : `missing:${r}`); // a missing reference, said so: the job cannot run as it is
  }
  return h.digest('hex').slice(0, 20);
}

const firstLine = (e) => String(e?.message ?? e).split('\n')[0];

/** What a post-only job's output answers: its post-processing and its source's bytes, committed (a new drawing makes it stale). */
function postHash(job) {
  const h = createHash('sha256').update(JSON.stringify({ post: job.post, bg: job.bg ?? 'none', from: job.from ?? job.approved }));
  const f = sourceOf(job);
  if (existsSync(f)) h.update(readFileSync(f));
  return h.digest('hex').slice(0, 20);
}
/** The hash a job's output is recorded under (meta.ask): its ask, or for a post-only job its source and post. */
const jobHash = (job) => (isPostOnly(job) ? postHash(job) : askHash(job));
/** A generated job's post-processing (with its key colour): a change re-posts its output, from its raw when that answers the ask. */
const postKey = (job) => createHash('sha256').update(JSON.stringify({ post: job.post, bg: job.bg ?? 'none' })).digest('hex').slice(0, 20);
/** Whether a job's shipped output is missing or stale (tools/pipeline-state.mjs isStale). */
const needed = (job, manifest) => !existsSync(outOf(job.id)) || isStale(job, manifest.meta?.[job.id], jobHash(job), isPostOnly(job) ? null : postKey(job));

/** When each of a job's references was drawn (their outputs' `at`): a raw with no record drawn before one of them is outdated. */
const refsAt = (job, manifest) => job.deps.map((d) => manifest.meta?.[d]?.at).filter(Boolean);
/** Why a generated job's cached raw may not be re-posted in place of a new drawing (tools/pipeline-state.mjs rawRefusal), or null. */
const reuseRefusal = (job, manifest) => (existsSync(rawOf(job.id)) ? rawRefusal(job, rawInfo(job), manifest.meta?.[job.id], askHash(job), refsAt(job, manifest)) : 'no raw');
/** Whether a generated job is only re-posted, no image: its cached raw (a gated job's, its pick) answers its ask. */
const reusable = (job, manifest) => !!job.model && !force && !reuseRefusal(job, manifest);
/**
 * Whether an output with no ask (a legacy asset's) is older than a reference drawn again since (a later
 * stage of a redrawn baby). Not stale: nothing says what it answers, so it is kept until forced, and
 * only a run that draws it again (it is missing, or made from a job in the run) never re-posts it.
 */
const outdated = (job, manifest) => !manifest.meta?.[job.id]?.ask && job.deps.some((d) => manifest.meta?.[d]?.at > manifest.meta?.[job.id]?.at);
/**
 * Warn about the outputs made from one this run changed (`from`), outside it (`inRun`), whatever their
 * priority: the stale ones (their ask changed: an ascended edit of a redrawn pet), and the older legacy ones.
 */
function warnDownstream(from, inRun, manifest) {
  const after = [...jobsById.values()].filter((j) => !inRun.has(j.id) && j.deps.some((d) => from.has(d)) && existsSync(outOf(j.id)));
  const stale = after.filter((j) => needed(j, manifest)).map((j) => j.id);
  const older = after.filter((j) => !needed(j, manifest) && outdated(j, manifest)).map((j) => j.id);
  if (stale.length) console.warn(`⚠️  stale now (a reference changed): ${stale.join(', ')}; run --priority=P0,P1,P2 --only=${stale.join(',')}`);
  if (older.length) console.warn(`⚠️  drawn before a reference that changed, and kept (they record no ask): ${older.join(', ')}; to draw them again: --priority=P0,P1,P2 --force --only=${older.join(',')}`);
}

/**
 * An output's manifest entry. A generated output takes what its raw was drawn for, when, and by which
 * model from the raw's record (`rec`; a raw with none, an older pipeline's, answers no ask known, so
 * none is recorded, and the output keeps its date and model), and records its post-processing. A
 * post-only output answers its source and post, and is dated by when its pixels last changed.
 */
function outputMeta(job, { qa, prev, rec = null, changed = true, gate = null }) {
  const now = new Date().toISOString();
  if (isPostOnly(job)) return { qa, model: null, at: changed || !prev?.at ? now : prev.at, ask: postHash(job) };
  return { qa, model: rec?.model ?? prev?.model ?? job.model, at: rec?.at ?? prev?.at ?? now, ...(rec?.ask ? { ask: rec.ask } : {}), post: postKey(job), ...(gate ? { gate } : {}) };
}
/** Whether a new output differs from the shipped one, byte for byte (post.py is deterministic): a post-only output is dated by its last change. */
const pixelsChanged = (next, out) => !existsSync(out) || !readFileSync(next).equals(readFileSync(out));

/**
 * Make `pick.n` candidates of a gated job, post-process and score each (contract, twin, ally,
 * figure-ground), and put the best raw in place (tools/pick.mjs: inside the gates first, then by
 * score); one strict round, built from the gates the first round missed, follows only when none is
 * inside them. A side view drawn facing right is mirrored, so the renderer's flip stays right.
 * Every paid raw is recorded in the job's sidecar with its prompt hash as soon as it lands, and a
 * resumed run (not --force, not a retry) reuses the ones made for the same ask. A candidate whose
 * post-processing or scoring fails is logged and skipped; the others still count.
 * → the winner's scores (tools/pick.mjs gateBrief)
 */
async function pickCandidate(job, key, backend, manifest, { fresh = false } = {}) {
  const { pick } = job;
  mkdirSync(candDir, { recursive: true });
  const side = readSidecar(job.id);
  const save = () => writeJsonAtomic(sidecarOf(job.id), { ...side, id: job.id, updated: new Date().toISOString() }, 1);
  const scored = [];
  let strict = '';
  const base = askHash(job); // the ask the pick answers, taken before anything is drawn (a reference may change meanwhile)
  for (let round = 0; round < 2; round++) {
    const ask = round ? { ...job, prompt: strict + job.prompt } : job;
    const hash = round ? askHash(ask) : base;
    const made = [];
    for (let k = 1; k <= pick.n; k++) {
      const n = round * pick.n + k;
      const raw = join(candDir, `${job.id}~${n}.raw.png`);
      const out = join(candDir, `${job.id}~${n}.png`);
      const before = side.candidates[n];
      if (!fresh && !force && before?.hash === hash && before.made && existsSync(raw)) {
        console.log(`  ${job.id} #${n}: reusing the candidate made ${before.made}`);
        side.candidates[n] = { hash, round, made: before.made }; // scored again below: no results from an earlier run
      } else {
        try {
          writeFileSync(raw, await callGemini(ask, key, backend));
        } catch (e) {
          if (e instanceof Stop) throw e;
          log({ id: job.id, candidate: n, error: e.message });
          console.log(`  ${job.id} #${n}: ${e.message}`);
          continue;
        }
        side.candidates[n] = { hash, round, made: new Date().toISOString() };
        save(); // the paid raw is on record before anything else can fail
      }
      try {
        const qa = postProcess(job, raw, out);
        side.candidates[n] = { ...side.candidates[n], qa };
        if (qa.ok) made.push({ n, raw, out });
        else log({ id: job.id, candidate: n, qa });
      } catch (e) {
        side.candidates[n] = { ...side.candidates[n], postError: firstLine(e) };
        log({ id: job.id, candidate: n, postError: e.message });
        console.log(`  ${job.id} #${n}: post-processing failed (${firstLine(e)}); its raw is kept`);
      }
    }
    if (made.length) {
      const res = runGate(job, manifest, made.map((c) => c.out));
      made.forEach((c, i) => {
        const r = res[i] ?? { error: 'no result' };
        if (r.error) {
          side.candidates[c.n] = { ...side.candidates[c.n], gateError: r.error };
          log({ id: job.id, candidate: c.n, gateError: r.error });
          console.log(`  ${job.id} #${c.n}: the gate could not score it (${r.error})`);
          return;
        }
        const one = { ...c, ...r };
        scored.push(one);
        side.candidates[c.n] = { ...side.candidates[c.n], gate: gateBrief(one) };
      });
    }
    save();
    if (!needsStrict(scored)) break;
    if (round === 0) {
      strict = strictText(scored, pick);
      const b = rankCandidates(scored)[0];
      const missed = [...new Set(scored.flatMap((c) => failingGates(c.margins)))];
      console.log(`  ${job.id}: no candidate inside the gates${b ? ` (the best misses by ${(-b.worst).toFixed(2)})` : ''}; one strict round${missed.length ? ` for ${missed.join(', ')}` : ''}`);
    }
  }
  const b = rankCandidates(scored)[0];
  if (!b) throw new Error('no usable candidate');
  if (b.mirror) execFileSync('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).transpose(Image.FLIP_LEFT_RIGHT).save(sys.argv[2])', b.raw, rawOf(job.id)]);
  else copyFileSync(b.raw, rawOf(job.id));
  writeRawAsk(job, { ask: base });
  side.picked = b.n;
  side.base = base; // the ask it answers (before any strict lead): a changed ask makes the pick stale
  save();
  log({ id: job.id, picked: b.n, candidates: scored.map(gateBrief) });
  return gateBrief(b);
}

/**
 * Score what a gated job ships now (a reused raw, a repost) with today's gates. Keeps the number
 * of the candidate it was picked as; if it cannot be scored, the old scores stay.
 */
function rescore(job, manifest) {
  const prev = manifest.meta?.[job.id]?.gate ?? null;
  const [r] = runGate(job, manifest, [outOf(job.id)]);
  if (!r || r.error) {
    log({ id: job.id, gateError: r?.error ?? 'no result' });
    console.log(`  ${job.id}: the gate could not score it (${r?.error ?? 'no result'}); its old scores are kept`);
    return prev;
  }
  if (r.mirror) console.warn(`⚠️  ${job.id} faces right: its raw should be mirrored (the renderer flips profiles assuming they face left)`);
  return { ...gateBrief({ ...r, n: prev?.n ?? null }), rescored: new Date().toISOString() };
}

/** A gate's verdict in words: its failing margins, worst first. */
const gateMisses = (g) => (g?.margins ? failingGates(g.margins).map((k) => `${k} ${g.margins[k]}`).join(', ') : `worst ${g?.worst}`);

function writeSheet(jobs, manifest) {
  const red = jobs.filter((j) => j.pick && manifest.meta?.[j.id]?.gate && !insideTolerance(manifest.meta[j.id].gate));
  const cards = jobs
    .map((j) => {
      const done = existsSync(outOf(j.id));
      const qa = manifest.meta?.[j.id]?.qa;
      const gate = j.pick ? manifest.meta?.[j.id]?.gate : null;
      const out = gate && !insideTolerance(gate);
      const verdict = !gate ? '' : out ? `<em>GATES ✗ ${gateMisses(gate)}</em>` : gate.pass ? ' · gates ✓' : ' · gates ✓ (within 0.03)';
      // a hero whose cream rim measured 0 px was compared with its rim on: worth a look
      const rim = j.pick?.rim && gate?.rimPx === 0 ? '<em>rim measured 0 px</em>' : '';
      return `<figure class="${[done ? '' : 'miss', out ? 'gate' : ''].join(' ').trim()}">${done ? `<img src="../../public/assets/${mock ? '_mock/' : ''}gen/${j.id}.png" onerror="this.onerror=null;this.src='/assets/${mock ? '_mock/' : ''}gen/${j.id}.png'" loading="lazy">` : '<div class="todo">not yet</div>'}<figcaption><b>${j.id}</b><span>${qa ? `cov ${qa.coverage}${qa.in_palette != null ? ` · palette ${Math.round(qa.in_palette * 100)}%` : ''}${qa.ok ? '' : ' · CHECK'}` : ''}${verdict}${rim}</span></figcaption></figure>`;
    })
    .join('');
  writeFileSync(
    sheetFile,
    `<!doctype html><meta charset="utf-8"><title>Pipeline sheet</title><style>body{margin:0;background:#17203f;color:#fffaf2;font:600 13px Nunito,system-ui,sans-serif;padding:18px}h1{font:800 24px 'Baloo 2',sans-serif}h1 small{font-size:15px;color:#ff9a9a}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}figure{margin:0;background:#1f2a55;border-radius:12px;padding:8px;background-image:repeating-conic-gradient(#2a3566 0% 25%,#253060 0% 50%);background-size:14px 14px}figure img{width:100%;height:130px;object-fit:contain}figcaption b{display:block;font-size:11px}figcaption span{color:#c9d3ff;font-size:11px}figcaption em{display:block;font-style:normal;color:#ff9a9a}.gate{outline:3px solid #ef5a5a;outline-offset:-3px}.miss{opacity:.45}.todo{height:130px;display:grid;place-items:center;color:#93a0d6}</style><h1>Asset pipeline: ${jobs.filter((j) => existsSync(outOf(j.id))).length} / ${jobs.length} done${red.length ? ` <small>· ${red.length} outside their gates (red)</small>` : ''}</h1><div class="g">${cards}</div>`,
  );
}

/** The foes shipped outside their gates in this run, for the warning and the exit code. */
const outside = new Set();
/** Warn when a gated job ships outside its gates (tools/pick.mjs tolerance): the coordinator decides re-picks. */
function warnGate(job, gate) {
  if (!gate || insideTolerance(gate)) return;
  if (acceptedMiss(gate, job.pick.accepted)) {
    // the reviewed miss (src/art/foe-roster.js gateAccepted): still reported, not a failed run
    console.warn(`⚠️  ${job.id} ships outside its gates (${gateMisses(gate)}, worst ${gate.worst}); accepted: ${job.pick.accepted.why}`);
    return;
  }
  outside.add(job.id);
  console.warn(`⚠️  ${job.id} ships OUTSIDE its gates: ${gateMisses(gate)} (worst ${gate.worst}); stored with pass: false, marked on the sheet`);
}

async function main() {
  if (adoptRaws && (!repost || !only.length || only.some((p) => p.includes('*')))) {
    console.error("--adopt records raws as drawn for today's ask: only with --repost and --only naming each id (no globs), on raws checked by eye");
    process.exitCode = 1;
    return;
  }
  const backend = pickBackend();
  const rows = buildAssetRows(PRICES[backend.models.fast] ?? PRICES[MODEL_FAST]);
  const { jobs: planned, skipped, all } = plan(rows, root, priorities, backend.models);
  jobsById = all;
  const wanted = onlyMatcher(only);
  let jobs = only.length ? planned.filter((j) => wanted(j.id)) : planned;
  // a job made from one in this run follows it (free), whatever its priority: a portrait never keeps an older drawing
  const follow = followers(jobs, [...all.values()]);
  jobs = [...jobs, ...follow];
  sweepTemps(manifestFile);
  const manifest = readManifest(manifestFile);
  book = manifest;
  /** Take the merged manifest a commit returns, so this run also sees what other processes wrote. */
  const syncManifest = (m) => Object.assign(manifest, m);

  if (args.includes('--status')) {
    const done = jobs.filter((j) => !needed(j, manifest)).length; // a stale output is not done
    const u = weeklyUsage(loadLedger(ledgerFile));
    console.log(`${done}/${jobs.length} assets done; weekly Gemini spend $${u.usd.toFixed(2)} (${u.images} images)`);
    return;
  }

  // missing or stale outputs, and every job in the run made from one of them (tools/pipeline-state.mjs toMake)
  const todo = force ? jobs : toMake(jobs, (j) => needed(j, manifest));
  const along = repost ? follow : follow.filter((j) => todo.includes(j));
  if (along.length) console.log(`also ${repost ? 're-posting' : 'making'} ${along.map((j) => j.id).join(', ')}: made from a job in this run`);
  const jobIds = new Set(planned.map((j) => j.id));
  const byCode = rows.filter((r) => priorities.includes(r.priority) && !r.method.startsWith('Gemini') && !jobIds.has(r.id)).reduce((n, r) => n + r.count, 0);
  const inCode = `plus ${byCode} assets drawn in code (glyphs, plates, effects, UI)${skipped.length ? `; no job yet for ${skipped.join(', ')}` : ''}`;
  if (!mock) console.log(`backend: ${backend.label}${envValue(backend.keyName) ? '' : ` (no ${backend.keyName} yet)`}`);
  if (repost) console.log(`plan: ${jobs.length} assets (${priorities.join('+')}), each re-posted from its source: no images; ${inCode}`);
  else {
    // a job whose raw answers it is re-posted, no image; one made from an output that changes draws
    // (tools/pipeline-state.mjs drawPlan). A gated job makes n candidates, and up to n more if it needs
    // its strict round (tools/pick.mjs imagesFor).
    const { sure, maybe } = drawPlan(todo, { reusable: (j) => reusable(j, manifest), stale: (j) => existsSync(outOf(j.id)) && needed(j, manifest) });
    const images = sure.reduce((n, j) => n + imagesFor(j).first, 0);
    const cost = sure.reduce((s, j) => s + costOf(j.model) * imagesFor(j).first, 0);
    const most = [...sure, ...maybe].reduce((n, j) => n + imagesFor(j).most, 0);
    const costMost = [...sure, ...maybe].reduce((s, j) => s + costOf(j.model) * imagesFor(j).most, 0);
    const byModel = sure.reduce((m, j) => ((m[j.model] = (m[j.model] ?? 0) + imagesFor(j).first), m), {});
    const gated = sure.filter((j) => j.pick).length;
    const ifs = [gated ? 'every gated job needs its strict round' : '', maybe.length ? `a re-post in the run changes what ${maybe.length} more are drawn from` : ''].filter(Boolean);
    console.log(
      `plan: ${jobs.length} assets (${priorities.join('+')}), ${todo.length} to make: ${images} images, ~$${cost.toFixed(2)} for one pass` +
        `${images ? ` (${Object.entries(byModel).map(([k, v]) => `${v} × ${k}`).join(', ')}${gated ? `, counting the candidates of ${gated} gated jobs` : ''})` : ''}` +
        `${most > images ? `; up to ${most} images, ~$${costMost.toFixed(2)}, if ${ifs.join(' and ')}` : ''}; ${inCode}`,
    );
  }
  if (dry) {
    writeFileSync(join(cache, 'plan.json'), JSON.stringify(todo, null, 1));
    const order = [];
    // a dependency made in this run counts once its wave is done; any other must be on disk (a raw,
    // an approved file, a shipped output), as the scheduler asks
    const willMake = new Set(todo.map((j) => j.id));
    const done = new Set();
    let left = [...todo];
    while (left.length) {
      const ready = left.filter((j) => j.deps.every((d) => (willMake.has(d) ? done.has(d) : available(j, d))));
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
    writeSheet(planned, manifest); // the sheet shows every planned asset, whatever --only picked
    return;
  }

  if (repost) {
    // post-process every source first, then score the gated ones on what now ships (the other foes
    // are their twins, so all of them are re-made before any is scored); each job's entry is merged
    // into the manifest on disk on its own
    const done = new Map();
    const refused = [];
    let broken = 0;
    let rejected = 0;
    for (const j of jobs.filter((j) => existsSync(sourceOf(j)))) {
      // a generated job re-posts only a raw that answers it (tools/pipeline-state.mjs rawRefusal): an
      // older raw (a grown sprite, a 3D render, another checkout's) would ship under today's ask.
      // --adopt first records the raws given as drawn for today's ask (checked by eye), never one from
      // before the job's recipe
      if (!isPostOnly(j)) {
        if (adoptRaws) {
          const raw = rawInfo(j);
          const no = adoptRefusal(j, raw);
          if (no) {
            refused.push(j.id);
            console.log(`  ${j.id}: ${no}: not re-posted`);
            continue;
          }
          const at = raw.record?.at && raw.record.at < raw.mtime ? raw.record.at : raw.mtime;
          writeRawAsk(j, { ask: askHash(j), at, model: raw.record?.model ?? manifest.meta?.[j.id]?.model ?? j.model });
        }
        const no = rawRefusal(j, rawInfo(j), manifest.meta?.[j.id], askHash(j), refsAt(j, manifest));
        if (no) {
          refused.push(j.id);
          console.log(`  ${j.id}: ${no}: not re-posted (draw it again, or --adopt it once checked by eye)`);
          continue;
        }
      }
      try {
        // a failed QA keeps the shipped file: the new output goes beside it and moves in only when it passes
        const next = `${outOf(j.id)}.repost.png`;
        const qa = postProcess(j, sourceOf(j), next);
        if (!qa.ok) {
          rmSync(next, { force: true });
          rejected += 1;
          console.log(`  ${j.id}: QA failed on repost (${JSON.stringify(qa)}); the shipped file is kept`);
          continue;
        }
        const changed = pixelsChanged(next, outOf(j.id));
        renameSync(next, outOf(j.id));
        done.set(j.id, { qa, changed });
      } catch (e) {
        broken += 1;
        log({ id: j.id, repost: true, postError: e.message });
        console.log(`  ${j.id}: post-processing failed (${firstLine(e)})`);
      }
    }
    for (const j of jobs.filter((j) => done.has(j.id))) {
      const { qa, changed } = done.get(j.id);
      const gate = j.pick ? rescore(j, manifest) : null; // a job without gates keeps no verdict
      // a post-only job's ask is taken after every re-post: its source, a fusion, comes earlier in the run
      const meta = outputMeta(j, { qa, prev: manifest.meta[j.id], rec: isPostOnly(j) ? null : rawRecord(j), changed, gate });
      syncManifest(commitManifest(manifestFile, { [j.id]: { file: `gen/${j.id}.png`, meta } }));
      if (!qa.ok) console.log(`  ${j.id}: QA flagged ${JSON.stringify(qa)}`);
      if (j.pick) warnGate(j, gate);
    }
    writeSheet(planned, manifest); // the sheet shows every planned asset, whatever --only picked
    // what this re-post changed the pixels of, and what was made from them (a job refused here included)
    warnDownstream(new Set([...done].filter(([, v]) => v.changed).map(([id]) => id)), new Set(done.keys()), manifest);
    console.log(`re-post-processed ${done.size} sources${refused.length ? `; ${refused.length} raws not re-posted (why above)` : ''}${broken ? `, ${broken} failed` : ''}${outside.size ? `; ${outside.size} gated jobs ship outside their gates: ${[...outside].join(', ')}` : ''}`);
    if (rejected) console.warn(`⚠️  ${rejected} reposts failed QA and kept their shipped file`);
    process.exitCode = broken || rejected ? 1 : outside.size ? 2 : 0;
    return;
  }

  const key = mock ? null : apiKey(backend);
  // every job made from one to make is in todo already (toMake): a job waits for its references in it
  const state = new Map(jobs.map((j) => [j.id, todo.includes(j) ? 'todo' : 'done']));
  let stopped = null;
  let made = 0;
  let failed = 0;
  const remade = new Set(); // made in this run

  /** Ship a job's output: its manifest entry (outputMeta) merged into the manifest on disk. */
  function accept(job, meta, t) {
    lastProgress = Date.now();
    syncManifest(commitManifest(manifestFile, { [job.id]: { file: `gen/${job.id}.png`, meta } }));
    state.set(job.id, 'done');
    remade.add(job.id);
    made += 1;
    const { qa } = meta;
    console.log(`✓ ${job.id} (${((Date.now() - t) / 1000).toFixed(0)} s${qa.in_palette != null ? `, palette ${Math.round(qa.in_palette * 100)}% before snap` : ''}${qa.ok ? '' : ', QA flagged'})`);
  }

  async function runJob(job) {
    state.set(job.id, 'running');
    if (isPostOnly(job)) {
      // no new image: an approved design (its committed file) or a job made from another's source (a
      // portrait from its fusion's), post-processed only; the result moves in only when it passes QA
      const t = Date.now();
      const next = `${outOf(job.id)}.next.png`;
      try {
        const src = sourceOf(job);
        if (!existsSync(src)) throw new Error(`no source (${src})`);
        const qa = postProcess(job, src, next);
        log({ id: job.id, from: job.from ?? job.approved, qa });
        if (!qa.ok) throw new Error(`QA failed (${JSON.stringify(qa)}); the shipped file is kept`);
        const changed = pixelsChanged(next, outOf(job.id));
        renameSync(next, outOf(job.id));
        accept(job, outputMeta(job, { qa, prev: manifest.meta[job.id], changed }), t);
      } catch (e) {
        rmSync(next, { force: true });
        log({ id: job.id, postError: e.message });
        console.log(`  ${job.id}: ${firstLine(e)}`);
        state.set(job.id, 'failed');
        failed += 1;
      }
      return;
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t = Date.now();
      // paid for already: post-process only, when the raw answers this ask (a gated job: its pick's ask)
      const reuse = attempt === 1 && reusable(job, manifest);
      let picked = null;
      try {
        if (!reuse && job.pick) picked = await pickCandidate(job, key, backend, manifest, { fresh: attempt > 1 });
        else if (!reuse) {
          const ask = askHash(job); // taken before the request: a reference may change while the model draws
          writeFileSync(rawOf(job.id), await callGemini(job, key, backend));
          writeRawAsk(job, { ask });
        }
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
      if (job.pick && !picked) picked = rescore(job, manifest); // a reused raw: scored as it ships, with today's gates
      // a gate only for a gated job: a job that lost its gates (the fusions under the baby recipe) drops its old verdict
      const gate = job.pick ? (picked ?? manifest.meta[job.id]?.gate) : null;
      accept(job, outputMeta(job, { qa, prev: manifest.meta[job.id], rec: rawRecord(job), gate }), t);
      if (job.pick) warnGate(job, gate);
      return;
    }
    state.set(job.id, 'failed');
    failed += 1;
  }

  // dependency-ordered scheduler with a small pool
  const running = new Set();
  for (;;) {
    if (stopped) break;
    const ready = jobs.filter((j) => state.get(j.id) === 'todo' && isReady(j, state, (d) => available(j, d)));
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
  syncManifest(readManifest(manifestFile)); // the sheet shows what every process made
  writeSheet(planned, manifest); // the sheet shows every planned asset, whatever --only picked
  const left = jobs.filter((j) => state.get(j.id) !== 'done').map((j) => j.id);
  // never started: a reference on disk neither as its output nor as an approved file
  const stalled = stopped ? [] : jobs.filter((j) => state.get(j.id) === 'todo').map((j) => j.id);
  if (stalled.length) console.warn(`⚠️  never ready: ${stalled.join(', ')} (a reference is missing: ${[...new Set(jobs.filter((j) => stalled.includes(j.id)).flatMap((j) => j.deps.filter((d) => !available(j, d))))].join(', ')})`);
  warnDownstream(remade, new Set(state.keys()), manifest);
  const u = weeklyUsage(loadLedger(ledgerFile));
  console.log(`\n${made} made, ${failed} failed, ${left.length} not done; weekly spend $${u.usd.toFixed(2)}; sheet: ${sheetFile}`);
  if (outside.size) console.warn(`⚠️  ${outside.size} gated jobs shipped OUTSIDE their gates: ${[...outside].join(', ')} (exit code 2)`);
  if (stopped) {
    writeFileSync(alertFile, `${new Date().toISOString()}\n${stopped}\n`);
    console.log(`\n⚠️  GEMINI IMAGE GENERATION STOPPED: ${stopped}\n   Finished assets are kept; run the same command again to resume.`);
    process.exitCode = 3;
  } else if (failed || stalled.length) process.exitCode = 1;
  else if (outside.size) process.exitCode = 2;
}

// run as a script; imported (tests), it only offers its helpers
// (real paths: a symlinked path to this script still runs it; an argv[1] that is no file is not this script)
function isMain() {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}
if (process.argv[1] && isMain()) main();

