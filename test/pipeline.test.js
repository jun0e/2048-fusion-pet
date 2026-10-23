import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAssetRows } from '../src/art/asset-catalog.js';
import { plan, jobFor, BG_FOR, MODEL_FAST, HERO_RIM, PET_BAND, PET_GROUNDS, petSticker, petValues, BABIES_LINE, BABY_VIEW, ASCENDED_GOLD, ASCENDED_PLATE, portraitPlate, tint, bossPlate, toInk } from '../tools/pipeline-jobs.mjs';
import { ENEMY_TYPES } from '../src/sim/enemies.js';
import { imagesFor } from '../tools/pick.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { classify429 } from '../tools/gemini-errors.mjs';
import { checkBudget, MONTH_MS } from '../tools/gemini-budget.mjs';
import { spriteId, portraitId } from '../src/art/sprite-ids.js';
import { ELEMENT_PALETTES, UNIVERSAL } from '../src/art/palettes.js';
import { FUSIONS } from '../src/sim/classes.js';
import { FOE_ROSTER } from '../src/art/foe-roster.js';
import { FUSION_ROSTER } from '../src/art/fusion-roster.js';
import { VFX_IDS, VFX_PIECES } from '../src/art/attack-vfx.js';
import { CHAPTER_GROUNDS, FRAME_ASSETS } from '../src/art/frame-kit.js';
import { commitManifest, gateSpec, onlyMatcher, readManifest, sidecarCurrent, withLock } from '../tools/pipeline.mjs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = '/nonexistent'; // no approved references: the plain prompts
const rows = buildAssetRows();
const core = plan(rows, root, ['P0', 'P1']);
const byId = new Map(core.jobs.map((j) => [j.id, j]));
const hexes = (el) => ELEMENT_PALETTES[el].colors.map((c) => c.hex);

test('P0+P1 plans the 168 core images: eggs, 32 pets, 28 fusions + portraits, 8 halos, 8 badges, 17 foes, 30 attack sprites, 13 frame pieces, background', () => {
  assert.equal(core.jobs.length, 168);
  assert.equal(core.jobs.filter((j) => j.id in FRAME_ASSETS).length, Object.keys(FRAME_ASSETS).length);
  assert.equal(core.jobs.filter((j) => /^vfx\./.test(j.id)).length, VFX_IDS.length);
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

test('a priority slice pulls in what it references: the P0 portrait needs its fusion, the halo the hero fusion', () => {
  const p0 = plan(rows, root, ['P0']);
  const ids = p0.jobs.map((j) => j.id);
  for (const id of ['fusion.fire+ice', 'portrait.fire+ice', 'halo.ice']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('pet.ice.128'), 'a fusion no longer needs its parents’ sprites');
  for (const j of p0.jobs) for (const d of j.deps) assert.ok(ids.includes(d), `${j.id} → ${d}`);
});

test('stages are edits of the previous stage; a fusion is its grown sprite redrawn in the babies’ line-up, with no parent images', () => {
  assert.deepEqual(byId.get('pet.fire.32').refs, ['pet.fire.16']);
  assert.deepEqual(byId.get('pet.fire.128').refs, ['pet.fire.64', 'pet.fire.16'], 'later stages are anchored to the original baby');
  assert.deepEqual(byId.get('fusion.fire+ice').refs, [BABIES_LINE, 'tools/refs/fusions/grown/fire+ice.png']);
  assert.deepEqual(byId.get('fusion.wind+metal').refs, [BABIES_LINE, 'tools/refs/fusions/grown/wind+metal.png']);
  for (const k of Object.keys(FUSIONS)) {
    assert.deepEqual(byId.get(`fusion.${k}`).deps, [], `${k}: nothing to wait for`);
    assert.ok(existsSync(new URL(`../tools/refs/fusions/grown/${k}.png`, import.meta.url)), `${k}: its grown sprite is frozen as a reference`);
  }
  assert.ok(existsSync(new URL(`../${BABIES_LINE}`, import.meta.url)), 'the babies’ line-up');
  assert.deepEqual(byId.get('portrait.poison+earth').refs, [], 'a portrait is no new image');
  assert.equal(byId.get('portrait.poison+earth').from, 'fusion.poison+earth', 'it is its own fusion’s raw on a plate');
  assert.deepEqual(byId.get('portrait.poison+earth').deps, ['fusion.poison+earth']);
});

test('fusions: one animal each, redrawn as a baby in the babies’ style, its parents in words and its palette snapped', () => {
  for (const [k, r] of Object.entries(FUSION_ROSTER)) {
    const j = byId.get(`fusion.${k}`);
    const [a, b] = FUSIONS[k].parts;
    assert.ok(j.prompt.includes(r.desc) && j.prompt.includes(`a baby ${r.animal}`), `${k}: its animal, as a baby`);
    assert.match(j.prompt, /huge head, a tiny chubby body/, `${k}: the babies’ proportions`);
    assert.match(j.prompt, /Flat 2D sticker art, not a 3D render/, `${k}: 2D`);
    assert.ok(j.prompt.includes(r.name), `${k}: its name`);
    assert.ok(j.prompt.includes(r.from[a]) && j.prompt.includes(r.from[b]), `${k}: both parents, in words`);
    assert.ok(j.prompt.includes(petValues(r)), `${k}: its value rule`);
    assert.ok(j.prompt.includes(BABY_VIEW[r.view]), `${k}: drawn in the view the field moves it in`);
    for (const h of r.pal) assert.ok(j.prompt.includes(h), `${k}: ${h} in the colour rule`);
    assert.ok(j.prompt.includes('cream rim') && !j.post.stripRim, `${k}: keeps the heroes' cream rim`);
    assert.deepEqual(j.post.palette, [...r.pal, ...UNIVERSAL.map((c) => c.hex)]);
    assert.equal(j.post.snap, true);
    assert.equal(j.post.size, 320);
    assert.equal(j.bg, r.bg);
    assert.equal(j.pick, undefined, `${k}: no silhouette gates (a baby’s head is not a grown body plan)`);
    assert.ok(j.prompt.includes(petSticker(r)), `${k}: the sticker line${r.prop ? ' with its prop' : ''}`);
  }
  assert.deepEqual(PET_GROUNDS, { lane: '#D9C7A3', hedge: '#4A5A52', 'fareast.hedge': '#3F5A48', 'peaks.lane': '#CFC9BF', 'peaks.hedge': '#4A4A52' }, 'every lane and hedge, where pets roam (not the keep floor)');
  assert.equal(HERO_RIM, 0.02);
  assert.equal(PET_BAND, 0.035);
  // a prop is drawn: the mole's molehill is no ground
  assert.match(byId.get('fusion.fire+earth').prompt, /no ground except its molehill, which is part of the sticker/);
  assert.match(byId.get('fusion.poison+nature').prompt, /no ground except its branch/);
  assert.match(byId.get('fusion.fire+ice').prompt, /no frame, no ground, no cast shadow\./, 'the others keep the plain rule');
  // the value rule names zones the view shows
  assert.match(petValues(FUSION_ROSTER['fire+wind']), /large light zone in #D8FAF0 \(the four wings\) covers at least a third of the creature, so it reads on dark hedges/);
  assert.match(petValues(FUSION_ROSTER['fire+poison']), /light zone in #FF9E3D \(the belly and the throat\)/, 'where its record puts it');
  assert.match(petValues(FUSION_ROSTER['ice+poison']), /\(the top of the bell and its scalloped rim\)/, 'a jellyfish has no chest');
  assert.match(petValues(FUSION_ROSTER['wind+nature']), /large markings in the darker #8A5A33/, 'a pale pet gets dark markings');
  assert.match(petValues(FUSION_ROSTER['poison+nature']), /large light zone in #CDEFA2/, 'a dark pet gets a light zone');
  assert.ok(!petValues(FUSION_ROSTER['poison+nature']).includes('highlight in #CDEFA2'));
  assert.match(petValues(FUSION_ROSTER['fire+ice']), /cel-shade tone in #456ac2 over at least a third/);
  const view = (k) => byId.get(`fusion.${k}`).prompt;
  assert.match(view('fire+ice'), /three-quarter side view facing left/, 'a profile pet faces left: the field flips it');
  assert.match(view('fire+poison'), /straight front view/);
  assert.match(view('wind+nature'), /its wings spread wide and evenly on both sides/, 'a spread pet keeps its wings out (the field beats them)');
  assert.match(view('lightning+poison'), /three-quarter side view facing left/, 'the platypus is a profile');
});

test('an approved design ships as drawn: Sparkfrost is Trailer C’s narwhal, no new image', () => {
  const real = fileURLToPath(new URL('..', import.meta.url));
  const all = plan(rows, real, ['P0', 'P1', 'P2']);
  const by = new Map(all.jobs.map((j) => [j.id, j]));
  const narwhal = by.get('fusion.ice+lightning');
  assert.equal(narwhal.model, null);
  assert.equal(narwhal.approved, 'tools/refs/fusions/approved/ice+lightning.png');
  assert.ok(existsSync(join(real, narwhal.approved)));
  assert.equal(narwhal.bg, 'none', 'it comes keyed');
  assert.equal(narwhal.post.palette, undefined, 'its own colours, unsnapped');
  assert.deepEqual(imagesFor(narwhal), { first: 0, most: 0 });
  assert.equal(FUSION_ROSTER['ice+lightning'].view, 'profile', 'drawn side-on, so the field flips it');
  assert.equal(by.get('portrait.ice+lightning').post.palette, undefined);
  assert.equal(by.get('portrait.ice+lightning').bg, 'none');
  assert.equal(by.get('portrait.ice+lightning.ascended').bg, 'green', 'its edit comes back on a key colour');
  assert.ok(by.get('fusion.fire+ice').model, 'the others are drawn');
});

test('foes fill their own silhouette contract, styled by their chapter golden, three candidates each', () => {
  for (const [k, r] of Object.entries(FOE_ROSTER)) {
    const j = byId.get(`enemy.${k}`);
    assert.equal(j.refs[0], `tools/refs/foes/sil-${r.animal}.png`, `${k}: image 1 is its contract`);
    assert.ok(existsSync(new URL(`../${j.refs[0]}`, import.meta.url)), `${k}: the contract file exists`);
    assert.equal(j.pick.n, 3);
    assert.equal(j.pick.contract, j.refs[0]);
    assert.equal(j.pick.others.length, 16, `${k}: checked against every other foe`);
    assert.ok(j.prompt.includes(r.pose) && j.prompt.includes(r.accent), `${k}: the pose and accent are in the prompt`);
    for (const h of r.pal) assert.ok(j.prompt.includes(h), `${k}: ${h} is in the colour rule`);
    assert.equal(j.post.size, r.boss ? 768 : 512);
    assert.equal(j.post.stripRim, true, `${k}: no cream rim (the heroes' cue)`);
    assert.equal(j.pick.chapters[0], r.chapter, `${k}: its own chapter first`);
    for (const [name, hex] of Object.entries(CHAPTER_GROUNDS[r.chapter])) assert.equal(j.pick.grounds[name], hex, `${k}: reads on its chapter's ${name}`);
    for (const o of j.pick.others) assert.ok(o.chapters.length >= 1, `${k}: ${o.id} says where it marches`);
    assert.equal(j.pick.animal, r.animal);
    assert.equal(j.pick.pose, r.pose, 'the strict round can name its features');
  }
  const moth = byId.get('enemy.pixie').pick;
  assert.deepEqual(moth.chapters, ['forest', 'fareast'], 'the moth marches in two chapters');
  assert.equal(moth.grounds['fareast.hedge'], CHAPTER_GROUNDS.fareast.hedge, 'and must read on both hedges');
  assert.ok(byId.get('enemy.ninja').pick.others.find((o) => o.id === 'enemy.pixie').chapters.includes('fareast'), 'the fox is held apart from the moth');
  assert.deepEqual(byId.get('enemy.pixie').refs.slice(1), ['tools/refs/foes/render-ref.png'], 'the forest golden starts from the frozen render');
  assert.ok(existsSync(new URL('../tools/refs/foes/render-ref.png', import.meta.url)));
  assert.deepEqual(byId.get('enemy.pixie').deps, []);
  assert.deepEqual(byId.get('enemy.ninja').refs.slice(1), ['enemy.pixie'], 'a chapter golden follows the forest golden');
  assert.deepEqual(byId.get('enemy.villager').refs.slice(1), ['enemy.pixie']);
  assert.deepEqual(byId.get('enemy.kiteNinja').deps, ['enemy.ninja'], 'every other foe follows its chapter golden');
  assert.deepEqual(byId.get('enemy.redDragon').deps, ['enemy.villager']);
  assert.equal(new Set(Object.values(FOE_ROSTER).map((r) => r.animal)).size, 17, 'seventeen different animals');
});

test('gateSpec: a pet has no marching chapter, its allies are the listed sprites made so far; a foe keeps its chapters and its ally prefix', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mb-gatespec-'));
  try {
    for (const f of ['enemy.pixie', 'enemy.pixie.portrait', 'pet.fire.128', 'pet.fire.16', 'fusion.fire+lightning']) writeFileSync(join(dir, `${f}.png`), '');
    // the pets' gates (the grown pass, kept for a gated redraw): a pet job as that pass planned it
    const others = Object.keys(FUSION_ROSTER).filter((k) => k !== 'fire+ice').map((k) => ({ id: `fusion.${k}`, sil: `tools/refs/fusions/sil-${k}.png` }));
    const allies = [...Object.keys(FOE_ROSTER).map((k) => `enemy.${k}`), ...Object.keys(ELEMENT_PALETTES).map((el) => `pet.${el}.128`)];
    const pet = { id: 'fusion.fire+ice', pick: { n: 3, side: 'pet', contract: 'tools/refs/fusions/sil-fire+ice.png', view: 'profile', grounds: PET_GROUNDS, band: PET_BAND, rim: HERO_RIM, others, allies } };
    const spec = gateSpec(pet, { meta: {} }, ['c.png'], dir);
    assert.deepEqual(spec.chapters, []);
    assert.ok(!('chapter' in spec));
    assert.equal(spec.band, PET_BAND);
    assert.deepEqual(spec.allies.map((a) => a.id).sort(), ['enemy.pixie', 'pet.fire.128'], 'listed ids only: no portrait, no other stage');
    assert.equal(spec.rim, HERO_RIM);
    assert.equal(spec.allies.find((a) => a.id === 'pet.fire.128').rim, HERO_RIM, 'a base pet’s rim is stripped');
    assert.ok(!('rim' in spec.allies.find((a) => a.id === 'enemy.pixie')), 'a foe has no rim');
    assert.equal(spec.allies.find((a) => a.id === 'enemy.pixie').path, join(dir, 'enemy.pixie.png'));
    assert.equal(spec.others.length, 27);
    for (const o of spec.others) assert.deepEqual(o.chapters, []);
    assert.equal(spec.others.find((o) => o.id === 'fusion.fire+lightning').mask, 'dark', 'an old sprite with no gate is not a stand-in');
    const made = gateSpec(pet, { meta: { 'fusion.fire+lightning': { gate: {} } } }, [], dir);
    assert.equal(made.others.find((o) => o.id === 'fusion.fire+lightning').mask, 'alpha', 'a pet made under its contract stands in for its sketch');
    assert.equal(made.others.find((o) => o.id === 'fusion.fire+lightning').rim, HERO_RIM, 'with its rim stripped');
    const foe = gateSpec(byId.get('enemy.pixie'), { meta: {} }, [], dir);
    assert.deepEqual(foe.chapters, ['forest', 'fareast']);
    assert.equal(foe.chapter, 'forest');
    assert.ok(!('band' in foe) && !('rim' in foe), 'the foes keep the 1 % outline band and have no rim');
    assert.deepEqual(foe.allies, [{ id: 'fusion.fire+lightning', path: join(dir, 'fusion.fire+lightning.png'), rim: HERO_RIM }], 'a foe’s allies: every fusion sprite, rim stripped');
    for (const o of foe.others) assert.ok(o.chapters.length >= 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a cached pick is reused only for the ask it answered (a roster edit makes it stale)', () => {
  assert.equal(sidecarCurrent({ base: 'abc' }, 'abc'), true);
  assert.equal(sidecarCurrent({ base: 'abc' }, 'def'), false, 'the words changed since the pick: generate again');
  assert.equal(sidecarCurrent({ candidates: {} }, 'def'), true, 'a sidecar from before the record (the foes) counts as current');
  assert.equal(sidecarCurrent(null, 'def'), true);
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
  for (const h of FUSION_ROSTER['fire+nature'].pal) assert.ok(fu.post.palette.includes(h));
  assert.equal(fu.bg, 'magenta', 'its palette has greens, so the fusion keys on magenta');
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

test('the background is full-frame; portraits are 2D: the pet’s own sticker on a flat plate; one model by default', () => {
  const bg = byId.get('env.background');
  assert.equal(bg.bg, 'none');
  assert.equal(bg.post.fit, 'cover');
  assert.equal(bg.aspect, '9:16');
  const all = new Map(plan(rows, root, ['P0', 'P1', 'P2']).jobs.map((j) => [j.id, j]));
  for (const [k, r] of Object.entries(FUSION_ROSTER)) {
    const p = all.get(`portrait.${k}`);
    assert.equal(p.model, null, `${k}: no new image`);
    assert.deepEqual(imagesFor(p), { first: 0, most: 0 });
    assert.equal(p.from, `fusion.${k}`);
    assert.equal(p.bg, all.get(`fusion.${k}`).bg, `${k}: keyed as its fusion’s raw is`);
    assert.deepEqual(p.post, { fit: 'plate', size: 512, plate: portraitPlate(FUSIONS[k].color), palette: [...r.pal, ...UNIVERSAL.map((c) => c.hex)], snap: true });
    const asc = all.get(`portrait.${k}.ascended`);
    assert.deepEqual(asc.refs, [BABIES_LINE, `fusion.${k}`], `${k}: an edit of its own sticker`);
    assert.deepEqual(asc.deps, [`fusion.${k}`]);
    assert.match(asc.prompt, /golden halo ring/);
    assert.match(asc.prompt, /exactly the same design, face, colours, proportions, pose and view/);
    for (const h of r.pal) assert.ok(asc.prompt.includes(h), `${k}: its own colours named (${h})`);
    assert.deepEqual(asc.post.plate, ASCENDED_PLATE);
    assert.deepEqual(asc.post.palette, [...r.pal, ...ASCENDED_GOLD, ...UNIVERSAL.map((c) => c.hex)], `${k}: its colours and the halo’s gold`);
  }
  assert.deepEqual(portraitPlate('#456ac2'), [tint('#456ac2', 0.45), tint('#456ac2', 0.78)]);
  assert.equal(tint('#000000', 0.5), '#808080');
  assert.equal(tint('#FF8000', 1), '#FFFFFF');
  if (!process.env.GEMINI_BEST_MODEL && !process.env.GEMINI_IMAGE_MODEL) assert.ok(core.jobs.filter((j) => j.model).every((j) => j.model === MODEL_FAST));
});

test('no avatar is 3D: a boss’s intro bust is a 2D half-body sticker of the boss on a dark flat plate', () => {
  const all = plan(rows, root, ['P0', 'P1', 'P2']);
  const busts = all.jobs.filter((j) => /^enemy\.[a-zA-Z]+\.portrait$/.test(j.id));
  assert.deepEqual(busts.map((j) => j.id).sort(), ['enemy.dragonRider.portrait', 'enemy.elfRuler.portrait', 'enemy.kiteNinja.portrait']);
  for (const j of busts) {
    const type = j.id.split('.')[1];
    const r = FOE_ROSTER[type];
    assert.deepEqual(j.refs, [`enemy.${type}`], `${type}: drawn from its own sprite`);
    assert.match(j.prompt, /half-body portrait sticker/);
    assert.match(j.prompt, /Flat 2D sticker art, not a 3D render/);
    assert.match(j.prompt, /cute but clearly a boss, never scary/);
    assert.match(j.prompt, /no cream rim/, `${type}: the foes’ style`);
    for (const h of r.pal) assert.ok(j.prompt.includes(h), `${type}: its own palette (${h})`);
    assert.equal(j.bg, r.bg);
    assert.equal(j.post.fit, 'plate');
    assert.equal(j.post.stripRim, true);
    const accent = r.accent.match(/#[0-9A-Fa-f]{6}/)[0];
    assert.deepEqual(j.post.plate, bossPlate(ENEMY_TYPES[type].color, accent), `${type}: dark plate in its colour, a disc in its accent`);
  }
  assert.ok(!all.jobs.some((j) => /3D render of|soft-vinyl/i.test(j.prompt ?? '')), 'no job asks for a 3D render');
  assert.equal(toInk('#FFFFFF', 1), '#2B1D2E');
  assert.equal(toInk('#2B1D2E', 0.5), '#2B1D2E');
});

test('post.py --fit plate: the sticker centred on a flat, opaque square plate', { skip: spawnSync('python3', ['-c', 'import PIL, numpy']).status === 0 ? false : 'needs python3 with Pillow and NumPy' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'plate-'));
  try {
    const src = join(dir, 'in.png');
    const out = join(dir, 'out.png');
    // a dark disc on pure green: keyed, trimmed and centred on the plate
    execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
im = Image.new('RGB', (400, 300), (0, 255, 0))
ImageDraw.Draw(im).ellipse((40, 60, 200, 220), fill=(43, 29, 46))
im.save('${src}')`]);
    const qa = JSON.parse(execFileSync('python3', ['tools/post.py', src, out, '--bg', 'green', '--size', '128', '--fit', 'plate', '--plate', '#99ADDD,#D6DEF2,#FFE07A'], { encoding: 'utf8' }).trim().split('\n').pop());
    assert.equal(qa.ok, true);
    assert.deepEqual(qa.size, [128, 128]);
    const px = JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import json
im = Image.open('${out}').convert('RGBA')
print(json.dumps([im.getpixel((64, 64)), im.getpixel((1, 64)), [p[3] for p in im.getdata()].count(255) == 128 * 128]))`], { encoding: 'utf8' }));
    assert.deepEqual(px[0].slice(0, 3), [43, 29, 46], 'the subject in the middle');
    assert.ok([[0x99, 0xad, 0xdd], [0xff, 0xe0, 0x7a]].some((c) => c.every((v, i) => Math.abs(v - px[1][i]) <= 1)), 'flat plate or ray colour at the edge');
    assert.equal(px[2], true, 'opaque: no keying left for the card');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
  assert.equal(m.get('fusion.fire+ice'), 'gemini-3-pro-image', 'the fusion pets and the foes use best');
  assert.equal(m.get('portrait.fire+ice'), null, 'a portrait is made from its fusion, no image');
  assert.equal(new Map(plan(rows, root, ['P2'], { fast: 'gemini-3.1-flash-image', best: 'gemini-3-pro-image' }).jobs.map((j) => [j.id, j.model])).get('portrait.fire+ice.ascended'), 'gemini-3.1-flash-image', 'the halo edit: fast');
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

test('attack sprites: one job per piece, never a glow; bodies are cream-white for the tint, decals lie flat', () => {
  for (const id of VFX_IDS) {
    const j = byId.get(id);
    const [, el, piece] = id.split('.');
    const v = VFX_PIECES[el][piece];
    assert.ok(j, `${id} is planned`);
    assert.ok(/NO glow/.test(j.prompt), `${id}: no glow`);
    assert.equal(j.post.fit, 'trim');
    if (v.tint) assert.ok(j.prompt.includes('only cream-white') && !j.prompt.includes('HARD COLOUR RULE'), `${id}: tintable`);
    else assert.ok(j.prompt.includes('HARD COLOUR RULE'), `${id}: full colour in its palette`);
    if (v.kind === 'decal') assert.ok(j.prompt.includes('Seen from directly above'), `${id}: a ground decal`);
    assert.equal(j.bg, v.bg ?? BG_FOR[el]);
  }
  assert.equal(byId.get('vfx.nature.blossom').bg, 'green', 'the pink blossom does not key on magenta');
  assert.match(byId.get('vfx.nature.blossom').prompt, /pure green #00FF00/);
});

test('--only takes ids and globs', () => {
  const m = onlyMatcher(['enemy.*', 'vfx.fire.tongue']);
  assert.ok(m('enemy.pixie') && m('enemy.elfRuler.portrait') && m('vfx.fire.tongue'));
  assert.ok(!m('vfx.fire.ember') && !m('xenemy.pixie') && !m('fusion.fire+ice'));
  assert.ok(onlyMatcher(['fusion.fire+ice'])('fusion.fire+ice'), 'a literal + is not a regex');
});

test('a manifest write merges into the file on disk and replaces it atomically', () => {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
  try {
    const file = join(dir, 'manifest.json');
    assert.deepEqual(readManifest(file), { files: {}, meta: {} }, 'no file yet: empty');
    commitManifest(file, { 'enemy.a': { file: 'gen/enemy.a.png', meta: { qa: { ok: true } } } }, 'T1');
    // another process writes its own entry meanwhile (as the older pipeline did: the whole file)
    const theirs = JSON.parse(readFileSync(file, 'utf8'));
    theirs.files['vfx.b'] = 'gen/vfx.b.png';
    theirs.meta['vfx.b'] = { qa: { ok: true } };
    writeFileSync(file, JSON.stringify(theirs));
    const m = commitManifest(file, { 'enemy.a': { meta: { qa: { ok: false }, gate: { pass: false } } } }, 'T2');
    assert.equal(m.files['vfx.b'], 'gen/vfx.b.png', "the other process's entry survives");
    assert.deepEqual(m.meta['enemy.a'], { qa: { ok: false }, gate: { pass: false } }, 'this job: its meta replaced');
    assert.equal(m.files['enemy.a'], 'gen/enemy.a.png');
    assert.equal(m.generatedAt, 'T2');
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), m, 'what is on disk is what was merged');
    assert.deepEqual(readdirSync(dir), ['manifest.json'], 'no temp file left behind');
    writeFileSync(file, '{"files": {');
    assert.throws(() => readManifest(file, { tries: 2 }), /does not parse/, 'a broken manifest stops the run rather than being replaced');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('withLock: one holder at a time, released even when the work throws; a crashed holder’s stale lock is taken over', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lock-test-'));
  try {
    const lock = join(dir, 'manifest.json.lock');
    assert.equal(withLock(lock, () => existsSync(lock)), true, 'held while the work runs');
    assert.equal(existsSync(lock), false, 'released after');
    assert.throws(() => withLock(lock, () => { throw new Error('boom'); }), /boom/);
    assert.equal(existsSync(lock), false, 'released when the work throws');
    mkdirSync(lock);
    const old = new Date(Date.now() - 60000);
    utimesSync(lock, old, old);
    assert.equal(withLock(lock, () => 'taken over'), 'taken over', 'a lock older than 30 s belongs to a crashed process');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the six reviewed gate misses are accepted (reported, not a failed run); every other foe must pass', () => {
  const accepted = Object.keys(FOE_ROSTER).filter((k) => byId.get(`enemy.${k}`).pick.accepted);
  assert.deepEqual(accepted.sort(), ['armoredSoldier', 'elfRuler', 'hoodedFlier', 'kiteMinion', 'leafSprite', 'ninja']);
  for (const k of accepted) {
    const a = byId.get(`enemy.${k}`).pick.accepted;
    const gates = Object.keys(a.margins);
    assert.ok(gates.length > 0 && gates.every((g) => ['contract', 'twin', 'twinChapter', 'ally', 'ground'].includes(g)), `${k}: the gates it may miss`);
    assert.ok(Object.values(a.margins).every((v) => v < 0 && v > -0.1), `${k}: each reviewed margin`);
    assert.match(a.why, /2026-10-16/, `${k}: the reason is dated`);
  }
});
