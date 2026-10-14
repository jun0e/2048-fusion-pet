import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAssetRows } from '../src/art/asset-catalog.js';
import { plan, jobFor, BG_FOR, MODEL_FAST } from '../tools/pipeline-jobs.mjs';
import { classify429 } from '../tools/gemini-errors.mjs';
import { checkBudget, MONTH_MS } from '../tools/gemini-budget.mjs';
import { spriteId, portraitId } from '../src/art/sprite-ids.js';
import { ELEMENT_PALETTES, UNIVERSAL } from '../src/art/palettes.js';
import { FUSIONS } from '../src/sim/classes.js';

const root = '/nonexistent'; // no approved references: the plain prompts
const rows = buildAssetRows();
const core = plan(rows, root, ['P0', 'P1']);
const byId = new Map(core.jobs.map((j) => [j.id, j]));
const hexes = (el) => ELEMENT_PALETTES[el].colors.map((c) => c.hex);

test('P0+P1 plans the 125 core images: eggs, 32 pets, 28 fusions + portraits, 8 halos, 8 badges, 17 foes, background', () => {
  assert.equal(core.jobs.length, 125);
  assert.equal(core.jobs.filter((j) => /^badge\./.test(j.id)).length, 8);
  const count = (re) => core.jobs.filter((j) => re.test(j.id)).length;
  assert.equal(count(/^egg\./), 3);
  assert.equal(count(/^pet\.[a-z]+\.\d+$/), 32);
  assert.equal(count(/^fusion\./), 28);
  assert.equal(count(/^portrait\.[a-z]+\+[a-z]+$/), 28);
  assert.equal(count(/^halo\./), 8);
  assert.equal(count(/^enemy\.[a-zA-Z]+$/), 17);
  assert.ok(byId.has('env.background'));
  for (const key of Object.keys(FUSIONS)) assert.ok(byId.has(`fusion.${key}`), key);
});

test('every reference is a planned dependency (or an approved file), and the order resolves', () => {
  for (const j of core.jobs) {
    for (const r of j.refs) assert.ok(r.includes('/') || j.deps.includes(r), `${j.id} refers to ${r} without depending on it`);
    for (const d of j.deps) assert.ok(byId.has(d), `${j.id} depends on unplanned ${d}`);
  }
  const done = new Set();
  let left = [...core.jobs];
  while (left.length) {
    const ready = left.filter((j) => j.deps.every((d) => done.has(d)));
    assert.ok(ready.length, `cycle among ${left.map((j) => j.id).join(', ')}`);
    for (const j of ready) done.add(j.id);
    left = left.filter((j) => !ready.includes(j));
  }
});

test('a priority slice pulls in what it references: the P0 fusion needs the ice line', () => {
  const p0 = plan(rows, root, ['P0']);
  const ids = p0.jobs.map((j) => j.id);
  for (const id of ['pet.ice.16', 'pet.ice.32', 'pet.ice.64', 'pet.ice.128', 'fusion.fire+ice', 'portrait.fire+ice']) assert.ok(ids.includes(id), id);
  assert.equal(p0.jobs.length, 14);
});

test('stages are edits of the previous stage; fusions see both parents and the golden fusion', () => {
  assert.deepEqual(byId.get('pet.fire.32').refs, ['pet.fire.16']);
  assert.deepEqual(byId.get('pet.fire.128').refs, ['pet.fire.64', 'pet.fire.16'], 'later stages are anchored to the original baby');
  assert.deepEqual(byId.get('fusion.fire+ice').refs, ['pet.fire.128', 'pet.ice.128']);
  assert.deepEqual(byId.get('fusion.wind+metal').refs, ['pet.wind.128', 'pet.metal.128', 'fusion.fire+ice']);
  assert.deepEqual(byId.get('portrait.poison+earth').refs, ['fusion.poison+earth'], 'portraits see only their own fusion');
  assert.deepEqual(byId.get('enemy.ninja').refs, ['enemy.pixie']);
  assert.deepEqual(byId.get('enemy.pixie').refs, []);
});

test('the palette hard limit: babies name their 6 element colours and snap to them', () => {
  for (const el of Object.keys(ELEMENT_PALETTES)) {
    const j = byId.get(`pet.${el}.16`);
    for (const h of hexes(el)) assert.ok(j.prompt.includes(h), `${el} prompt lacks ${h}`);
    assert.equal(j.post.snap, true);
    assert.deepEqual(j.post.palette, [...hexes(el), ...UNIVERSAL.map((c) => c.hex)]);
    assert.equal(j.bg, BG_FOR[el]);
  }
  const fu = byId.get('fusion.fire+nature');
  for (const h of [...hexes('fire'), ...hexes('nature')]) assert.ok(fu.post.palette.includes(h));
  assert.equal(fu.bg, 'magenta', 'nature has greens, so the fusion keys on magenta');
  assert.equal(byId.get('fusion.fire+ice').bg, 'green');
});

test('green-screen only where the palette has no greens', () => {
  for (const [el, bg] of Object.entries(BG_FOR)) {
    const greens = hexes(el).some((h) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      return g > r + 40 && g > b + 20;
    });
    if (greens) assert.equal(bg, 'magenta', el);
  }
});

test('portraits and the background are full-frame; one model by default (fits the AI Pro credit)', () => {
  for (const id of ['portrait.fire+ice', 'env.background']) {
    const j = byId.get(id);
    assert.equal(j.bg, 'none');
    assert.equal(j.post.fit, 'cover');
  }
  assert.equal(byId.get('env.background').aspect, '9:16');
  if (!process.env.GEMINI_BEST_MODEL && !process.env.GEMINI_IMAGE_MODEL) assert.ok(core.jobs.every((j) => j.model === MODEL_FAST));
});

test('code-drawn and hand assets get no Gemini job', () => {
  const row = rows.find((r) => r.id === 'glyph.fire');
  assert.equal(jobFor(row, root), null);
});

test('classify429 tells no-access, daily and per-minute limits apart', () => {
  const v = (quotaId, quotaValue) => ({ error: { message: 'Quota exceeded', details: [{ violations: [{ quotaId, quotaValue }] }, { retryDelay: '41s' }] } });
  assert.equal(classify429({ error: { message: 'Quota exceeded for metric: x, limit: 0, model: y' } }).kind, 'noaccess');
  assert.equal(classify429(v('GenerateRequestsPerDayPerProjectPerModel', '100')).kind, 'daily');
  const m = classify429(v('GenerateRequestsPerMinutePerProjectPerModel', '10'));
  assert.equal(m.kind, 'minute');
  assert.equal(m.retryMs, 41000);
  assert.equal(classify429({ error: { message: 'spend cap reached' } }).kind, 'other');
});

test('monthly limit: stops at 80% of the AI Pro credit over 30 days, even when each week is under', () => {
  const now = Date.UTC(2026, 9, 14);
  const day = 24 * 3600 * 1000;
  const limits = { weeklyLimitUsd: 58.33, monthlyLimitUsd: 10, stopAt: 0.8 };
  const spread = Array.from({ length: 236 }, (_, i) => ({ t: now - (1 + (i % 28)) * day, usd: 0.0336 })); // $7.93 over 4 weeks
  assert.equal(checkBudget(spread, limits, 0.0336, now).ok, true);
  const v = checkBudget([...spread, { t: now - day, usd: 0.0336 }, { t: now - day, usd: 0.0336 }], limits, 0.0336, now);
  assert.equal(v.ok, false);
  assert.match(v.reason, /monthly/);
  const old = spread.map((e) => ({ ...e, t: e.t - MONTH_MS }));
  assert.equal(checkBudget(old, limits, 0.0336, now).ok, true, 'spend older than 30 days drops out');
});

test('game sprite ids match the catalog ids', () => {
  assert.equal(spriteId({ kind: 'egg', tier: 1 }), 'egg.2');
  assert.equal(spriteId({ kind: 'egg', tier: 3 }), 'egg.8');
  assert.equal(spriteId({ kind: 'baby', el: 'metal', stage: 0 }), 'pet.metal.16');
  assert.equal(spriteId({ kind: 'baby', el: 'ice', stage: 3 }), 'pet.ice.128');
  assert.equal(spriteId({ kind: 'fusion', a: 'ice', b: 'fire' }), 'fusion.fire+ice', 'canonical order whatever the merge order');
  assert.equal(spriteId({ kind: 'halo', apex: 'wind' }), 'halo.wind');
  assert.equal(portraitId({ element: 'earth', fusion: 'poison' }), 'portrait.poison+earth');
  const planned = new Set(core.jobs.map((j) => j.id));
  for (const key of Object.keys(FUSIONS)) {
    const [a, b] = key.split('+');
    assert.ok(planned.has(spriteId({ kind: 'fusion', a: b, b: a })));
    assert.ok(planned.has(portraitId({ element: b, fusion: a })));
  }
});

test('the backend chooses the models: sprites use fast, portraits and the background use best', () => {
  const p = plan(rows, root, ['P0', 'P1'], { fast: 'gemini-3.1-flash-image', best: 'gemini-3-pro-image' });
  const m = new Map(p.jobs.map((j) => [j.id, j.model]));
  assert.equal(m.get('pet.fire.16'), 'gemini-3.1-flash-image');
  assert.equal(m.get('fusion.fire+ice'), 'gemini-3.1-flash-image');
  assert.equal(m.get('portrait.fire+ice'), 'gemini-3-pro-image');
  assert.equal(m.get('env.background'), 'gemini-3-pro-image');
});

test('classify429: Vertex shared-capacity exhaustion is retried, not a stop', () => {
  const q = classify429({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Resource exhausted. Please try again later.' } });
  assert.equal(q.kind, 'minute');
  assert.ok(q.retryMs > 0);
});

test("classify429: Vertex's 'Resource has been exhausted (e.g. check quota)' is a retry", () => {
  const q = classify429({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Resource has been exhausted (e.g. check quota).' } });
  assert.equal(q.kind, 'minute');
});
