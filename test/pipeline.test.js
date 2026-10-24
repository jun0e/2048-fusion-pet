import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAssetRows } from '../src/art/asset-catalog.js';
import { plan, jobFor, BG_FOR, MODEL_FAST, HERO_RIM, PET_BAND, PET_GROUNDS, petSticker, petValues, BABIES_LINE, BABY_SINCE, BABY_VIEW, CHIBI, ASCENDED_GOLD, ASCENDED_PLATE, PORTRAIT_PX, portraitPlate, tint, bossPlate, toInk } from '../tools/pipeline-jobs.mjs';
import { adoptRefusal, differs, drawPlan, followers, isPostOnly, isReady, isSourceOf, isStale, rawRefusal, SOURCE_WINDOW_MS, sourceOf, toMake } from '../tools/pipeline-state.mjs';
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
import { commitManifest, gateSpec, onlyMatcher, readManifest, withLock } from '../tools/pipeline.mjs';
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
    for (const r of j.refs) assert.ok(r.includes('/') || j.deps.includes(r.replace(/^shipped:/, '')), `${j.id} refers to ${r} without depending on it`);
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
  assert.equal(byId.get('portrait.poison+earth').from, 'fusion.poison+earth', 'it is its own fusion’s shipped sprite on a plate');
  assert.deepEqual(byId.get('portrait.poison+earth').deps, ['fusion.poison+earth']);
});

test('fusions: one animal each, redrawn as a baby in the babies’ style, its parents in words and its palette snapped', () => {
  for (const [k, r] of Object.entries(FUSION_ROSTER)) {
    const j = byId.get(`fusion.${k}`);
    assert.equal(j.since, BABY_SINCE, `${k}: an output from before the baby recipe is stale`);
    if (r.approved) continue; // the approved narwhal: its own test
    const [a, b] = FUSIONS[k].parts;
    assert.ok(j.prompt.includes(r.desc) && j.prompt.includes(`a baby ${r.animal}`), `${k}: its animal, as a baby`);
    assert.match(j.prompt, /huge head, a tiny chubby body/, `${k}: the babies’ proportions`);
    assert.ok(j.prompt.includes(CHIBI), `${k}: said outright`);
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
  assert.match(view('fire+ice'), /It faces LEFT: a three-quarter side view, its head toward the left edge/, 'a profile pet faces left: the field flips it');
  assert.ok(!view('fire+ice').includes('like the babies in image 1'), 'not "like the babies": the line-up faces every way');
  assert.match(view('fire+poison'), /straight front view/);
  assert.match(view('wind+nature'), /its wings spread wide and evenly on both sides/, 'a spread pet keeps its wings out (the field beats them)');
  assert.match(view('lightning+poison'), /It faces LEFT/, 'the platypus is a profile');
});

test('an approved design ships as drawn: Sparkfrost is Trailer C’s narwhal, no new image', () => {
  const all = plan(rows, root, ['P0', 'P1', 'P2']);
  const by = new Map(all.jobs.map((j) => [j.id, j]));
  const narwhal = by.get('fusion.ice+lightning');
  const real = fileURLToPath(new URL('..', import.meta.url));
  assert.equal(narwhal.model, null);
  assert.equal(narwhal.approved, 'tools/refs/fusions/approved/ice+lightning.png');
  assert.ok(existsSync(join(real, narwhal.approved)));
  assert.equal(narwhal.bg, 'none', 'it comes keyed');
  assert.equal(narwhal.post.palette, undefined, 'its own colours, unsnapped');
  assert.deepEqual(imagesFor(narwhal), { first: 0, most: 0 });
  assert.equal(FUSION_ROSTER['ice+lightning'].view, 'profile', 'drawn side-on, so the field flips it');
  assert.equal(by.get('portrait.ice+lightning').post.palette, undefined);
  assert.equal(by.get('portrait.ice+lightning').bg, 'none', 'made from what shipped: keyed already');
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
    assert.equal(p.bg, 'none', `${k}: made from its shipped sprite, keyed already`);
    const snapped = (palette) => (r.approved ? {} : { palette, snap: true });
    assert.deepEqual(p.post, { fit: 'plate', size: PORTRAIT_PX, plate: portraitPlate(FUSIONS[k].color), ...snapped([...r.pal, ...UNIVERSAL.map((c) => c.hex)]) });
    assert.equal(p.since, BABY_SINCE);
    const asc = all.get(`portrait.${k}.ascended`);
    assert.deepEqual(asc.refs, [BABIES_LINE, `shipped:fusion.${k}`], `${k}: an edit of its own sticker, as it shipped`);
    assert.deepEqual(asc.deps, [`fusion.${k}`]);
    assert.match(asc.prompt, /golden halo ring/);
    assert.match(asc.prompt, /exactly the same design, face, colours, proportions, pose and view/);
    if (!r.approved) for (const h of r.pal) assert.ok(asc.prompt.includes(h), `${k}: its own colours named (${h})`);
    assert.deepEqual(asc.post.plate, ASCENDED_PLATE);
    assert.deepEqual(asc.post.palette, r.approved ? undefined : [...r.pal, ...ASCENDED_GOLD, ...UNIVERSAL.map((c) => c.hex)], `${k}: its colours and the halo’s gold`);
    assert.equal(asc.since, BABY_SINCE);
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
    assert.deepEqual(j.refs, [`shipped:enemy.${type}`], `${type}: drawn from its own sprite as it shipped (never an older checkout's raw)`);
    assert.deepEqual(j.deps, [`enemy.${type}`]);
    assert.match(j.prompt, /half-body portrait sticker/);
    assert.match(j.prompt, /A BUST: only its head and shoulders/);
    assert.match(j.prompt, /exactly one head/);
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

const POST = fileURLToPath(new URL('../tools/post.py', import.meta.url));
const hasPil = spawnSync('python3', ['-c', 'import PIL, numpy']).status === 0;
/** Draw a test image with PIL: `code` runs with `im` (RGBA 400 × 300, filled with `fill`) and `D` (its ImageDraw), then it is saved to `path`. */
function drawPng(path, code, fill = '(0, 255, 0, 255)') {
  execFileSync('python3', ['-c', `import sys\nfrom PIL import Image, ImageDraw\nim = Image.new('RGBA', (400, 300), ${fill})\nD = ImageDraw.Draw(im)\n${code}\nim.save(sys.argv[1])`, path]);
}
const post = (args) => JSON.parse(execFileSync('python3', [POST, ...args], { encoding: 'utf8' }).trim().split('\n').pop());
const pixels = (path, points) =>
  JSON.parse(execFileSync('python3', ['-c', 'import sys, json\nfrom PIL import Image\nim = Image.open(sys.argv[1]).convert("RGBA")\npts = json.loads(sys.argv[2])\nprint(json.dumps({"px": [im.getpixel(tuple(p)) for p in pts], "opaque": im.getchannel("A").getextrema()[0] == 255}))', path, JSON.stringify(points)], { encoding: 'utf8' }));

test('post.py --fit plate: the sticker centred on a flat, opaque square plate', { skip: hasPil ? false : 'needs python3 with Pillow and NumPy' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'plate-'));
  try {
    const src = join(dir, 'in.png');
    const out = join(dir, 'out.png');
    drawPng(src, 'D.ellipse((40, 120, 200, 180), fill=(43, 29, 46, 255))'); // a wide dark oval on pure green
    const qa = post([src, out, '--bg', 'green', '--size', '128', '--fit', 'plate', '--plate', '#99ADDD,#D6DEF2,#FFE07A']);
    assert.equal(qa.ok, true);
    assert.deepEqual(qa.size, [128, 128]);
    // 16 rays from straight up, every other one lit: the middle of the first (78.75° above level, right of
    // up), the middle of the gap after it, a point of the disc above the oval, and the oval itself
    const { px, opaque } = pixels(out, [[76, 3], [98, 12], [64, 24], [64, 64]]);
    const flat = (p, hex) => [1, 3, 5].every((i, k) => Math.abs(parseInt(hex.slice(i, i + 2), 16) - p[k]) <= 1);
    assert.ok(flat(px[0], '#FFE07A'), `a ray (${px[0]})`);
    assert.ok(flat(px[1], '#99ADDD'), `the plate between the rays (${px[1]})`);
    assert.ok(flat(px[2], '#D6DEF2'), `the disc behind the subject (${px[2]})`);
    assert.deepEqual(px[3].slice(0, 3), [43, 29, 46], 'the subject in the middle');
    assert.ok(opaque, 'opaque: no keying left for the card');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('post.py fails a cut-out from an opaque source with no key colour (a stale raw would ship its background)', { skip: hasPil ? false : 'needs python3 with Pillow and NumPy' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'opaque-'));
  try {
    const src = join(dir, 'in.png');
    drawPng(src, 'D.ellipse((40, 60, 200, 220), fill=(43, 29, 46, 255))');
    const qa = post([src, join(dir, 'out.png'), '--bg', 'none', '--size', '128', '--fit', 'trim']);
    assert.equal(qa.opaque, true);
    assert.equal(qa.ok, false);
    const keyed = post([src, join(dir, 'out2.png'), '--bg', 'green', '--size', '128', '--fit', 'trim']);
    assert.equal(keyed.ok, true, 'the same image keyed is fine');
    assert.equal(post([src, join(dir, 'out3.png'), '--bg', 'none', '--size', '128', '--fit', 'cover']).ok, true, 'a full-frame image is opaque by design');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pipeline state: post-only jobs, their sources, stale outputs, readiness, followers', () => {
  const raw = (id) => `/raw/${id}.png`;
  const all = plan(rows, root, ['P0', 'P1', 'P2']);
  const byId = all.all;
  const narwhal = byId.get('fusion.ice+lightning');
  assert.ok(isPostOnly(narwhal) && isPostOnly(byId.get('portrait.fire+ice')));
  assert.ok(!isPostOnly(byId.get('fusion.fire+ice')) && !isPostOnly(byId.get('portrait.fire+ice.ascended')));
  const ctx = { byId, root: '/repo', rawOf: raw, outOf: (id) => `/out/${id}.png` };
  assert.equal(sourceOf(narwhal, ctx), '/repo/tools/refs/fusions/approved/ice+lightning.png', 'an approved design is its committed file, never the raw cache');
  assert.equal(sourceOf(byId.get('portrait.ice+lightning'), ctx), '/repo/tools/refs/fusions/approved/ice+lightning.png', 'its portrait follows it there');
  assert.equal(sourceOf(byId.get('portrait.fire+ice'), ctx), '/out/fusion.fire+ice.png', 'a portrait is made from its fusion’s shipped sprite (committed), never a raw');
  assert.equal(sourceOf(byId.get('fusion.fire+ice'), ctx), '/raw/fusion.fire+ice.png', 'a generated job is posted from its raw');
  // stale: another ask, or made before the recipe began; a legacy output with no record counts only without a recipe date
  const job = { since: '2026-10-23' };
  assert.equal(isStale(job, { ask: 'a', at: '2026-10-23T05:00:00Z' }, 'a'), false);
  assert.equal(isStale(job, { ask: 'a', at: '2026-10-23T05:00:00Z' }, 'b'), true, 'asked otherwise');
  assert.equal(isStale(job, { at: '2026-10-16T05:00:00Z' }, 'a'), true, 'a grown sprite or a 3D portrait');
  assert.equal(isStale(job, { at: '2026-10-23T05:00:00Z' }, 'a'), true, 'under a recipe, an output must say what it was made for');
  assert.equal(isStale(job, undefined, 'a'), true);
  assert.equal(isStale({}, undefined, 'a'), false, 'a legacy output with no recipe date is current');
  assert.equal(isStale({}, { ask: 'x' }, 'a'), true);
  // a generated output post-processed otherwise (a new size): stale, re-posted from a raw that still answers
  assert.equal(isStale(job, { ask: 'a', post: 'p', at: '2026-10-23T05:00:00Z' }, 'a', 'p'), false);
  assert.equal(isStale(job, { ask: 'a', post: 'p', at: '2026-10-23T05:00:00Z' }, 'a', 'q'), true, 'its post-processing changed');
  assert.equal(isStale(job, { ask: 'a', at: '2026-10-23T05:00:00Z' }, 'a', 'q'), false, 'an output from before the post record');
  // a shipped file that is not the one its entry records (changed outside the pipeline, a merge): not stale, it differs
  assert.equal(differs({ sha: 's' }, 's'), false);
  assert.equal(differs({ sha: 's' }, 't'), true, 'another file');
  assert.equal(differs({}, 't'), false, 'an entry from before the file hash');
  // ready: deps done in this run (or current at its start), or outside it, with what it needs on disk
  const p = byId.get('portrait.fire+ice');
  assert.equal(isReady(p, new Map([['fusion.fire+ice', 'todo']]), () => true), false, 'its fusion is still to make in this run');
  assert.equal(isReady(p, new Map([['fusion.fire+ice', 'done']]), () => true), true);
  assert.equal(isReady(p, new Map(), (d) => d === 'fusion.fire+ice'), true, 'outside the run: its source exists');
  assert.equal(isReady(p, new Map(), () => false), false);
  // followers: a fusion in the run brings its base portrait (free), whatever its priority; not its ascended edit (an image)
  const f = followers([byId.get('fusion.fire+ice')], [...byId.values()]).map((j) => j.id);
  assert.deepEqual(f, ['portrait.fire+ice']);
  assert.deepEqual(followers([byId.get('fusion.fire+ice')], all.jobs.filter((j) => j.priority !== 'P0')).map((j) => j.id), [], 'it looks only among the jobs given: the pipeline gives it every job, so a follower of another priority still follows');
  // toMake: every job in the run made from one to make, directly or not, is made too (each follows its reference)
  const run = ['fusion.fire+ice', 'portrait.fire+ice', 'portrait.fire+ice.ascended', 'fusion.wind+metal', 'portrait.wind+metal'].map((id) => byId.get(id));
  assert.deepEqual(toMake(run, (j) => j.id === 'fusion.fire+ice').map((j) => j.id), ['fusion.fire+ice', 'portrait.fire+ice', 'portrait.fire+ice.ascended']);
  assert.deepEqual(toMake(run, () => false), []);
  const stages = ['pet.fire.16', 'pet.fire.32', 'pet.fire.64', 'pet.fire.128'].map((id) => byId.get(id));
  assert.deepEqual(toMake(stages, (j) => j.id === 'pet.fire.16').map((j) => j.id), stages.map((j) => j.id), 'a redrawn baby brings every later stage');
  // drawPlan: what a run draws for sure, and what it may, as the run decides it at each job's turn
  const [fu, po, asc] = run;
  const kitJob = byId.get('halo.fire'); // a legacy job made from fusion.fire+ice (for its style)
  const ids = (l) => l.map((j) => j.id);
  const planOf = (todo, { needed = () => false, reusable = () => true, stale = () => false, legacy = [] } = {}) => {
    const p = drawPlan(todo, { needed, reusable, stale, tracked: (j) => !legacy.includes(j) });
    return [ids(p.sure), ids(p.maybe)];
  };
  assert.deepEqual(planOf([fu, po, asc], { needed: (j) => j === fu, reusable: (j) => j !== fu, stale: (j) => j === fu }), [['fusion.fire+ice', 'portrait.fire+ice.ascended'], []], 'a redrawn pet: its halo edit is drawn again too');
  assert.deepEqual(planOf([fu, po, asc], { needed: (j) => j === fu, stale: (j) => j === fu }), [['portrait.fire+ice.ascended'], []], 'a pet re-posted with other post args: new pixels, so its halo edit is drawn again');
  assert.deepEqual(planOf([fu, po, asc], { needed: () => true, reusable: (j) => j === fu }), [[], ['portrait.fire+ice.ascended']], 'a lost pet re-posted from its raw may come back as it was: its halo edit, stale while the pet is missing, may stay');
  assert.deepEqual(planOf([fu, po, asc, kitJob], { needed: (j) => j === fu, reusable: (j) => j !== fu && j !== kitJob, stale: (j) => j === fu, legacy: [kitJob] }), [['fusion.fire+ice', 'portrait.fire+ice.ascended'], []], 'a legacy output made from a redrawn pet is kept, not drawn');
  assert.deepEqual(planOf([fu, kitJob], { needed: () => true, reusable: (j) => j !== kitJob, legacy: [kitJob] }), [['halo.fire'], []], 'a lost legacy output with no raw to stand for it is drawn');
  const kit = { id: 'kit', deps: ['portrait.fire+ice'], model: 'm' }; // a drawing made from a post-only output
  assert.deepEqual(planOf([fu, po, kit], { needed: (j) => j === fu, reusable: (j) => j !== fu, stale: (j) => j === fu }), [['fusion.fire+ice', 'kit'], []], 'a change passes through a post-only output');
  // its own part of the ask changed: drawn for sure, whatever its references do
  const lostPet = { needed: () => true, reusable: (j) => j === fu };
  assert.deepEqual(ids(drawPlan([fu, po, asc], { ...lostPet, stale: () => false, tracked: () => true, ownChanged: (j) => j === asc }).sure), ['portrait.fire+ice.ascended'], 'its prompt changed while the pet is lost (its ask hashes the pet as missing)');
  assert.deepEqual(planOf([fu, po, kit], { needed: () => true, reusable: (j) => j === fu, stale: (j) => j === po }), [['kit'], []], 'stale with every reference on disk, one of them maybe re-posted: it stays stale, so it draws');
  // what the run makes: for sure, maybe, or keeps
  const fates = drawPlan([fu, po, asc, kitJob], { needed: (j) => j === fu, reusable: (j) => j !== kitJob, stale: () => false, tracked: (j) => j !== kitJob }).fates;
  assert.deepEqual([fu, po, asc, kitJob].map((j) => fates.get(j.id).make), ['yes', 'maybe', 'maybe', 'no'], 'a lost pet re-posted: its portrait and halo edit may be made, the legacy kit is kept');
  // a held output (its shipped file is not the one its entry records) is kept as it ships, whatever its references do
  const heldPlan = drawPlan([fu, po, asc], { needed: (j) => j === fu, reusable: (j) => j !== fu, stale: (j) => j === fu, tracked: () => true, held: (j) => j === asc });
  assert.deepEqual([ids(heldPlan.sure), heldPlan.fates.get(asc.id).make], [['fusion.fire+ice'], 'no']);
  // a raw is the drawing that shipped: by its record (its ask and its time), or with none (an older pipeline's) by its time
  const at = '2026-10-16T05:00:00.000Z';
  const later = (ms) => new Date(Date.parse(at) + ms).toISOString();
  assert.equal(isSourceOf({ at, record: { ask: 'h', at } }, { ask: 'h', at }), true);
  assert.equal(isSourceOf({ at, record: { ask: 'h', at } }, { ask: 'x', at }), false);
  assert.equal(isSourceOf({ at: later(1000), record: { ask: 'h', at: later(1000) } }, { ask: 'h', at }), false, 'a later drawing for the same ask, which never shipped');
  assert.equal(isSourceOf({ at, record: { ask: 'h', at } }, { at }), false, 'a recorded raw is not the source of an output that records nothing');
  assert.equal(isSourceOf({ at, record: null }, { ask: 'h', at }), false);
  assert.equal(isSourceOf({ at, record: null }, { at: later(30e3) }), true, 'its own raw: written seconds before the output was stamped');
  assert.equal(isSourceOf({ at, record: null }, { at: later(46 * 3600e3) }), false, 'another checkout’s older drawing');
  assert.equal(isSourceOf({ at: later(SOURCE_WINDOW_MS + 1), record: null }, { at }), false, 'a later drawing that never shipped');
  assert.equal(isSourceOf({ at, record: null }, undefined), true, 'nothing on record to say otherwise');
  assert.equal(isSourceOf({ at, record: { ask: 'h', at } }, { ask: 'h', at, sha: 's' }, 's'), true);
  assert.equal(isSourceOf({ at, record: { ask: 'h', at } }, { ask: 'h', at, sha: 's' }, 't'), false, 'the shipped file is not the one its entry records: its raw is not what ships');
  // rawRefusal: whether a cached raw may stand for its job today (re-posted, not drawn)
  const legacy = {};
  const baby = { since: BABY_SINCE };
  const fresh = '2026-10-23T05:00:00.000Z';
  assert.equal(rawRefusal(baby, { at: fresh, record: { ask: 'h', at: fresh } }, { ask: 'h', at: fresh }, 'h'), null);
  assert.match(rawRefusal(baby, { at: fresh, record: { ask: 'old', at: fresh } }, { ask: 'old', at: fresh }, 'h'), /drawn for another ask/);
  assert.match(rawRefusal(baby, { at, record: { ask: 'h', at } }, { ask: 'h', at }, 'h'), /drawn before its recipe \(2026-10-16\)/, 'a recipe date moved past it: drawn again');
  assert.match(rawRefusal(baby, { at, record: null }, undefined, 'h'), /recipe dates its drawings/, 'a grown raw or a 3D render never ships under the baby recipe');
  assert.match(rawRefusal(legacy, { at, record: null }, { ask: 'old', at }, 'h'), /output records what it answers/, 'a prompt edit: an unrecorded raw is drawn again, never labelled with the new ask');
  assert.equal(rawRefusal(legacy, { at, record: null }, { at: later(30e3) }, 'h'), null, 'a legacy asset’s own raw, as before');
  assert.match(rawRefusal(legacy, { at, record: null }, { at: later(46 * 3600e3) }, 'h'), /not the drawing that shipped \(drawn 2026-10-16, the shipped one 2026-10-18\)/);
  // --adopt: never a raw from before its recipe, by the earlier of its record's time and its file's
  assert.match(adoptRefusal(baby, { mtime: '2026-10-16T05:00:00.000Z', record: null }), /from before the recipe \(2026-10-16\)/);
  assert.equal(adoptRefusal(baby, { mtime: '2026-10-23T05:00:00.000Z', record: null }), null);
  assert.match(adoptRefusal(baby, { mtime: '2026-10-24T05:00:00.000Z', record: { ask: 'h', at: '2026-10-16T05:00:00.000Z' } }), /from before the recipe/, 'a copied cache: new file times, an old record');
  assert.equal(adoptRefusal(legacy, { mtime: '2026-10-01T05:00:00.000Z', record: null }), null, 'no recipe date: any raw checked by eye');
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
  assert.equal(m.get('fusion.fire+ice'), 'gemini-3.1-flash-image', 'the baby pets: fast, their proportions said outright');
  assert.equal(m.get('enemy.pixie'), 'gemini-3-pro-image', 'the foes use best');
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
