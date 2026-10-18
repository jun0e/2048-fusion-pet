// v2's board looks (docs/v2/SPEC.md sections 1 and 7): plain blocks are stone number blocks, elemental
// eggs sit in their nests in their element's colours (a fusion egg in both), single and fusion pets
// stay on their tiles at any value from 16 and a tile shows its empty den only while its pet is
// summoned out, a pure form wears its halo and an aura ring, a fusion pet's summon charge fills its
// frame, and the skills' marks show on blocks. The rules (src/art/plaque.js, src/art/index.js) and
// the per-frame drawing (src/render/blocks.js, on test/helpers/board-scene.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, ELEMENT_KEYS, FUSIONS } from '../src/sim/classes.js';
import { V2 } from '../src/config.js';
import { INK, contrast, luminance } from '../src/art/tokens.js';
import { PEBBLE_TAG, PLAQUE, STONE, badgeSpots, isDen, isEgg, isFusion, isPet, isPlain, isPure, numberBox, plateColor, stonePlate } from '../src/art/plaque.js';
import { EGG_KEEP, EGG_SEAM, creatureSpecOf, eggKeep, eggRamp, eggSeamY, recolorEgg } from '../src/art/index.js';
import { BLOCK_MARKS } from '../src/render/blocks.js';
import { range, scene } from './helpers/board-scene.js';

const EPS = 1e-9;
const inner = PLAQUE.size / 2 - PLAQUE.outline / 2;
/** Is the ellipse or circle (x, y, rx, ry) inside the plaque's rounded inner edge? */
function inside(x, y, rx, ry = rx) {
  const k = PLAQUE.r - PLAQUE.outline / 2;
  const cx = Math.max(Math.abs(x) + rx - (inner - k), 0);
  const cy = Math.max(Math.abs(y) + ry - (inner - k), 0);
  return Math.hypot(cx, cy) <= k + EPS && Math.abs(x) + rx <= inner + EPS && Math.abs(y) + ry <= inner + EPS;
}
const fusion = (element, fusion2, more = {}) => ({ element, fusion: fusion2, buffs: {}, ...more });

// --- what a block is, and its plate ------------------------------------------------------------------

test('every block is one of the SPEC’s kinds: plain at any value, an egg below 16, a pet from 16, a fusion, a pure form, a den while its pet is out', () => {
  const kinds = (t) => ['plain', 'egg', 'pet', 'fusion', 'pure', 'den'].filter((k, i) => [isPlain, isEgg, isPet, isFusion, isPure, isDen][i](t));
  assert.deepEqual(kinds({ tier: 1, cls: {} }), ['plain']);
  assert.deepEqual(kinds({ tier: 11, cls: {} }), ['plain'], 'a plain block never gains an element');
  assert.deepEqual(kinds({ tier: 2, cls: { element: 'fire' } }), ['egg']);
  assert.deepEqual(kinds({ tier: 3, cls: fusion('fire', 'ice') }), ['egg', 'fusion'], 'a fusion egg');
  assert.deepEqual(kinds({ tier: 4, cls: { element: 'fire' } }), ['pet']);
  assert.deepEqual(kinds({ tier: 4, cls: fusion('fire', 'ice') }), ['pet', 'fusion'], 'a fusion pet at 16');
  assert.deepEqual(kinds({ tier: 12, cls: fusion('fire', 'ice', { pure: true }) }), ['pet', 'fusion', 'pure']);
  assert.deepEqual(kinds({ tier: 10, cls: fusion('fire', 'ice'), summon: { phase: 'act' } }), ['pet', 'fusion', 'den'], 'its pet is out');
  assert.deepEqual(kinds({ tier: 10, cls: fusion('fire', 'ice') }), ['pet', 'fusion'], 'home: no den');
});

test('plates: stone for plain blocks (a step darker per value), an element’s light tint for eggs, its colour for pets; ink reads ≥ 4.5 : 1 on every one', () => {
  const lums = [];
  for (let tier = 1; tier <= 16; tier++) {
    const c = plateColor({ tier, cls: {} });
    assert.equal(c, stonePlate(tier));
    assert.ok(contrast(INK, c) >= 4.5, `stone ${2 ** tier}: ${contrast(INK, c).toFixed(2)}`);
    lums.push(luminance(c));
  }
  for (let i = 1; i < lums.length; i++) assert.ok(lums[i] <= lums[i - 1] + EPS, 'darker (or the same) per value');
  assert.ok(lums[0] - lums[10] > 0.15, 'a 2048 reads apart from a 2');
  for (const el of ELEMENT_KEYS) {
    const pet = plateColor({ tier: 5, cls: { element: el } });
    for (const tier of [1, 2, 3]) {
      const egg = plateColor({ tier, cls: { element: el } });
      assert.ok(contrast(INK, egg) >= 4.5, `${el} egg ${2 ** tier}`);
      assert.ok(luminance(egg) > luminance(pet), `${el}: an egg’s plate is lighter than its pet’s`);
    }
  }
  for (const key of Object.keys(FUSIONS)) {
    const [a, b] = key.split('+');
    for (const tier of [1, 2, 3, 4, 10]) assert.ok(contrast(INK, plateColor({ tier, cls: fusion(a, b) })) >= 4.5, `${key} at ${2 ** tier}`);
  }
});

test('a plain block’s dressed stone stays inside the plaque and below its numeral; from 16 its pebble tag sits in the collar spot', () => {
  const m = STONE.mortar;
  for (const tier of [1, 4, 8, 11, 13, 16]) {
    for (const cellPx of [47.56, 70, 160]) {
      const num = numberBox(tier, { cellPx });
      assert.ok(m.y - m.w > num.y1, `${2 ** tier} at ${cellPx} px: the mortar clears the numeral`);
      for (const f of STONE.flecks) assert.ok(f.y - f.r > num.y1, `${2 ** tier}: a fleck clears the numeral`);
      for (const p of PEBBLE_TAG) assert.ok(p.y - p.ry > num.y1, `${2 ** tier}: a pebble clears the numeral`);
    }
  }
  assert.ok(inside(0, m.y, m.x1, m.w) && inside(m.jx, (m.y + m.jy1) / 2, m.w, (m.jy1 - m.y) / 2), 'the mortar and its joint');
  for (const f of STONE.flecks) assert.ok(inside(f.x, f.y, f.r), `fleck at ${f.x}, ${f.y}`);
  for (const p of PEBBLE_TAG) assert.ok(inside(p.x, p.y, p.rx + 0.007, p.ry + 0.007), `pebble at ${p.x}, ${p.y} with its ink`);
  const tag = PEBBLE_TAG.reduce((s, p) => ({ x: s.x + p.x / 3, y: s.y + p.y / 3 }), { x: 0, y: 0 });
  assert.ok(Math.hypot(tag.x - PLAQUE.badgeAt, tag.y - PLAQUE.badgeAt) < 0.06, 'where a pet wears its badge');
  assert.deepEqual(badgeSpots({ tier: 6, cls: {} }), [], 'and no element badge');
});

// --- what stands on a tile ---------------------------------------------------------------------------

test('what stands on a tile: nothing on a plain block or a den, an egg in its colours, a baby, a fusion pet at any value from 16', () => {
  for (let tier = 1; tier <= 14; tier++) assert.equal(creatureSpecOf({ tier, cls: {} }), null, `a plain ${2 ** tier}`);
  assert.deepEqual(creatureSpecOf({ tier: 2, cls: { element: 'ice' } }), { kind: 'egg', tier: 2, el: 'ice', el2: null });
  assert.deepEqual(creatureSpecOf({ tier: 3, cls: fusion('poison', 'wind') }), { kind: 'egg', tier: 3, el: 'poison', el2: 'wind' }, 'a fusion egg: both colours');
  assert.deepEqual(creatureSpecOf({ tier: 5, cls: { element: 'metal' } }), { kind: 'baby', el: 'metal', stage: 1 });
  assert.deepEqual(creatureSpecOf({ tier: 11, cls: { element: 'metal' } }), { kind: 'baby', el: 'metal', stage: 3 }, 'a big single keeps its 128 look');
  assert.deepEqual(creatureSpecOf({ tier: 4, cls: fusion('fire', 'ice') }), { kind: 'fusion', a: 'fire', b: 'ice', legendary: false }, 'a fusion pet at 16, on its tile');
  assert.deepEqual(creatureSpecOf({ tier: 12, cls: fusion('fire', 'ice', { pure: true }) }), { kind: 'fusion', a: 'fire', b: 'ice', legendary: true });
  assert.equal(creatureSpecOf({ tier: 10, cls: fusion('fire', 'ice'), summon: { phase: 'out' } }), null, 'its pet is out on the field');
});

/** The egg art's own colours (generated and code-drawn alike), as texels. */
const EGG = { shell: [255, 240, 218], shade: [232, 205, 166], spot: [230, 185, 138], rim: [255, 250, 242], white: [255, 255, 255], ink: [43, 29, 46] };
const texels = (rows) => new Uint8ClampedArray(rows.flatMap((c) => [...c, 255]));
const hueOf = ([r, g, b]) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx === mn) return null;
  const h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn);
  return ((h * 60) + 360) % 360;
};
const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test('an egg takes its element’s colours: the shell light, its shade and spots deeper; the ink, the cream rim and the whites stay', () => {
  assert.equal(eggKeep(0.1), 1);
  assert.equal(eggKeep(0.99), 1);
  assert.equal(eggKeep(0.8), 0);
  assert.ok(eggKeep((EGG_KEEP.dark[0] + EGG_KEEP.dark[1]) / 2) > 0 && eggKeep((EGG_KEEP.light[0] + EGG_KEEP.light[1]) / 2) < 1, 'blended at the edges');
  for (const el of ELEMENT_KEYS) {
    const d = texels([EGG.shell, EGG.shade, EGG.spot, EGG.rim, EGG.white, EGG.ink]);
    recolorEgg(d, 6, 1, eggRamp(ELEMENTS[el].color));
    const at = (i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
    assert.deepEqual([at(3), at(4), at(5)], [EGG.rim, EGG.white, EGG.ink], `${el}: rim, whites and ink kept`);
    const L = (c) => luminance(`#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`);
    assert.ok(L(at(0)) > L(at(1)) && L(at(1)) > L(at(2)), `${el}: shell lighter than its shade, the shade than its spots`);
    const want = hueOf(ELEMENTS[el].color.match(/\w\w/g).map((h) => parseInt(h, 16)));
    const got = hueOf(at(2));
    assert.ok(want == null || hueGap(want, got) < 12, `${el}: its spots in its hue (${want?.toFixed(0)}° vs ${got?.toFixed(0)}°)`);
    assert.notDeepEqual(at(0), EGG.shell, `${el}: the shell is recoloured`);
  }
  // a transparent texel stays as it is
  const clear = new Uint8ClampedArray([10, 20, 30, 0]);
  recolorEgg(clear, 1, 1, eggRamp('#f2662d'));
  assert.deepEqual([...clear], [10, 20, 30, 0]);
});

test('a fusion egg wears its main element above a zig-zag ink seam and its second below it', () => {
  const w = 40;
  const h = 50;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) d.set([...EGG.shell, 255], i * 4);
  const A = eggRamp(ELEMENTS.fire.color);
  const B = eggRamp(ELEMENTS.ice.color);
  recolorEgg(d, w, h, A, B);
  const at = (x, y) => [...d.slice((y * w + x) * 4, (y * w + x) * 4 + 3)];
  const fire = texels([EGG.shell]);
  recolorEgg(fire, 1, 1, A);
  const ice = texels([EGG.shell]);
  recolorEgg(ice, 1, 1, B);
  assert.deepEqual(at(20, 5), [...fire.slice(0, 3)], 'the top in the main element');
  assert.deepEqual(at(20, 45), [...ice.slice(0, 3)], 'the bottom in the second');
  // the seam: ink where it runs, a zig-zag within EGG_SEAM.amp of its height
  let inkCols = 0;
  const ys = [];
  for (let x = 0; x < w; x++) {
    const col = [...Array(h).keys()].filter((y) => at(x, y).join() === EGG.ink.join());
    if (col.length) {
      inkCols += 1;
      ys.push(col.reduce((s, y) => s + y, 0) / col.length);
    }
    const sy = eggSeamY(x, w, h);
    assert.ok(Math.abs(sy - h * EGG_SEAM.y) <= EGG_SEAM.amp * h + EPS);
  }
  assert.equal(inkCols, w, 'the seam runs across the whole egg');
  assert.ok(Math.max(...ys) - Math.min(...ys) > EGG_SEAM.amp * h, 'it zig-zags');
});

// --- the board, frame by frame -------------------------------------------------------------------

test('on the board: a plain block is bare stone; an egg sits in its nest with its badge; single and fusion pets stand on their tiles', () => {
  const s = scene();
  s.add(1, 3, 0, 0, {});
  s.add(2, 6, 1, 0, {});
  s.add(3, 2, 2, 0, { element: 'nature' });
  s.add(4, 3, 3, 0, fusion('fire', 'ice'));
  s.add(5, 5, 0, 1, { element: 'wind' });
  s.add(6, 4, 1, 1, fusion('metal', 'earth'));
  s.add(7, 9, 2, 1, fusion('lightning', 'poison'));
  s.step(0.2);
  const v = (id) => s.blocks.viewOf(id);
  for (const id of [1, 2]) {
    assert.ok(!v(id).creature.visible && !v(id).nest.visible && !v(id).badgeA.visible, `plain ${id}: bare stone`);
    assert.ok(!v(id).glow.visible && !v(id).halo.visible && !v(id).motif.visible);
  }
  for (const id of [3, 4]) assert.ok(v(id).creature.visible && v(id).egg && v(id).nest.visible && v(id).badgeA.visible, `egg ${id}: in its nest, with its badge`);
  assert.ok(!v(3).glow.visible, 'an egg has no class glow');
  for (const id of [5, 6, 7]) {
    assert.ok(v(id).creature.visible && !v(id).egg && !v(id).motif.visible && !v(id).paws.visible, `pet ${id}: on its tile, no den`);
    assert.ok(v(id).badgeA.visible && !v(id).badgeB.visible && v(id).glow.visible);
  }
  // an egg wobbles in its nest; a pet bobs
  const wob = range(s, 1, () => v(4).creature.rotation);
  assert.ok(wob.hi > 0.01 && wob.lo < -0.01, 'the 8 shakes');
  // a plain block shoots from its tile too
  s.blocks.onEvent({ type: 'fire', id: 2, x: 0, y: 0, colors: ['#d9d2c5'], target: { x: 0, y: 12 } });
  s.step();
  assert.ok(v(2).punch > 0);
});

test('a summoned pet leaves its den: the altar rises over the hop, its paw prints lead off it, they fade as it hops back, and it pops back onto its tile', () => {
  for (const reduced of [false, true]) {
    const s = scene({ reduced });
    const t = s.add(1, 10, 1, 0, fusion('fire', 'ice'));
    s.step(0.2);
    const v = s.blocks.viewOf(1);
    assert.ok(v.creature.visible && !v.motif.visible, 'home: the pet on its tile');
    t.summon = { key: 'fire+ice', phase: 'out', x: 1, y: 11, t: 0, dur: V2.summon.durS };
    s.step();
    assert.ok(!v.creature.visible && v.motif.visible, 'out: the empty den');
    assert.ok(v.motif.alpha < 0.2, `the altar starts down (${v.motif.alpha.toFixed(2)})`);
    if (!reduced) assert.ok(v.motif.position.y > 0, 'rising from below');
    s.step(V2.summon.hopS / 2);
    assert.ok(v.motif.alpha > 0.35 && v.motif.alpha < 0.75, `half way (${v.motif.alpha.toFixed(2)})`);
    t.summon.phase = 'act';
    s.step(V2.summon.hopS / 2 + 0.4);
    assert.ok(v.motif.alpha === 1 && v.motif.position.y === 0, 'up');
    assert.ok(v.paws.visible && v.paws.alpha === 1, 'its prints lead off the altar');
    assert.equal(v.charge.visible, false, 'no charge while it is out');
    t.summon.phase = 'back';
    s.step(0.4);
    assert.ok(!v.paws.visible, 'the prints fade as it hops back');
    delete t.summon;
    s.step();
    assert.ok(v.creature.visible && !v.motif.visible, 'it lands back on its tile');
    assert.ok(v.pop > 0.5, 'with a pop');
  }
  // on the smallest phone (a 48 px cell) the prints would be dots: dropped
  const small = scene({ u: 23.78 });
  small.add(1, 10, 0, 0, fusion('poison', 'nature'), { summon: { phase: 'act', x: 0, y: 12 } });
  small.step(1);
  assert.ok(small.blocks.viewOf(1).motif.visible && !small.blocks.viewOf(1).paws.visible);
});

test('a pure form wears its halo behind it, turning slowly, and a soft aura ring in its element’s colour; Reduce motion holds both still', () => {
  const s = scene();
  s.add(1, 12, 1, 1, { element: 'nature', pure: true });
  s.add(2, 12, 2, 1, fusion('fire', 'ice', { pure: true }));
  s.add(3, 11, 3, 1, fusion('fire', 'ice'));
  s.step(0.2);
  const v = s.blocks.viewOf(1);
  assert.ok(v.halo.visible && v.halo.texture === s.halo);
  const kids = v.p.children;
  assert.ok(kids.indexOf(v.halo) < kids.indexOf(v.creature), 'behind its pet');
  assert.ok(Math.abs(v.halo.width / s.cell - PLAQUE.halo.w) < 0.02 || Math.abs(Math.max(v.halo.width, v.halo.height) / s.cell - PLAQUE.halo.w) < 0.02, `${(v.halo.width / s.cell).toFixed(2)} cell wide`);
  const r0 = v.halo.rotation;
  s.step(1);
  assert.ok(Math.abs(v.halo.rotation - r0 - PLAQUE.halo.turn * Math.PI * 2) < 0.01, 'it turns at its pace');
  assert.ok(v.aura.visible && v.aura.tint === parseInt(ELEMENTS.nature.color.slice(1), 16), 'the aura in its main element’s colour');
  assert.ok(s.blocks.viewOf(2).aura.tint === parseInt(ELEMENTS.fire.color.slice(1), 16), 'a pure fusion: its main element’s');
  const a = range(s, 1 / PLAQUE.aura.hz, () => v.aura.alpha);
  assert.ok(a.hi <= PLAQUE.aura.alpha + EPS && a.hi - a.lo > 0.03, 'it breathes, below TILE_GLOW');
  assert.ok(!s.blocks.viewOf(3).halo.visible && !s.blocks.viewOf(3).aura.visible, 'not pure: neither');
  const still = scene({ reduced: true });
  still.add(1, 12, 1, 1, { element: 'nature', pure: true });
  still.step(0.2);
  const w = still.blocks.viewOf(1);
  const r1 = w.halo.rotation;
  const b = range(still, 1, () => w.aura.alpha);
  assert.ok(w.halo.rotation === r1 && b.hi === b.lo, 'Reduce motion: still');
  // a pure pet out on the field takes its halo with it
  const out = scene();
  out.add(1, 12, 1, 1, fusion('fire', 'ice', { pure: true }), { summon: { phase: 'act', x: 0, y: 12 } });
  out.step(0.2);
  assert.ok(!out.blocks.viewOf(1).halo.visible && out.blocks.viewOf(1).motif.visible);
});

test('a fusion pet’s summon charge fills its frame from 1024, in steps shared by every pet; full, it breathes; none below 1024 or for a single', () => {
  const s = scene();
  let charge = 0;
  s.run.defense.skillCharge = () => charge;
  s.add(1, 10, 0, 0, fusion('fire', 'ice'));
  s.add(2, 11, 1, 0, fusion('metal', 'nature'));
  s.add(3, 9, 2, 0, fusion('fire', 'ice'));
  s.add(4, 11, 3, 0, { element: 'fire' });
  charge = 0.6;
  s.step();
  const [a, b, c, d] = [1, 2, 3, 4].map((id) => s.blocks.viewOf(id));
  assert.ok(a.charge.visible && a.charge.context === b.charge.context, 'one shared step');
  assert.ok(!c.charge.visible && !d.charge.visible, 'not at 512, not a single');
  const part = a.charge.context;
  s.run.skillCharge = (id) => (id === 1 ? 1 : 0.6); // the run's own reading wins (docs/v2/SPEC.md section 5)
  s.step();
  assert.ok(a.charge.context !== part && b.charge.context === part, 'full');
  const breath = range(s, 1 / BLOCK_MARKS.hz, () => a.charge.alpha);
  assert.ok(breath.lo < 0.8 && breath.hi > 0.95 && b.charge.alpha === 1, 'a ready pet breathes; a charging one holds');
  const still = scene({ reduced: true });
  still.run.skillCharge = () => 1;
  still.add(1, 10, 0, 0, fusion('fire', 'ice'));
  assert.equal(range(still, 1, () => still.blocks.viewOf(1).charge.alpha).lo, 1, 'Reduce motion: no breath');
});

test('the skills’ marks: rime armour coats a block in ice, pollen sparkles on it, a sprout marks a block Moss Spring saved; each fades in and out', () => {
  const s = scene();
  const t = s.add(1, 6, 1, 1, { element: 'fire' });
  s.step(0.2);
  const v = s.blocks.viewOf(1);
  assert.ok(!v.rime.visible && !v.pollen.visible && !v.sprout.visible);
  t.guardT = 5;
  t.boostT = 5;
  t.saved = true;
  s.step(BLOCK_MARKS.fade / 2);
  assert.ok(v.rime.visible && v.rime.alpha > 0.3 && v.rime.alpha < 0.7, `fading in (${v.rime.alpha.toFixed(2)})`);
  s.step(BLOCK_MARKS.fade);
  assert.ok(v.rime.alpha === 1 && v.pollen.alpha === 1 && v.sprout.alpha === 1);
  const kids = v.p.children;
  assert.ok(kids.indexOf(v.rime) > kids.indexOf(v.creature) && kids.indexOf(v.rime) < kids.indexOf(v.number), 'the coat over the pet, under the numeral');
  const motes = s.parts.filter((p) => p.o.color === 0xffe066);
  assert.ok(motes.length >= 1, 'pollen motes rise');
  s.books.length = 0;
  s.parts.length = 0;
  s.step(1);
  const lit = s.books.filter((b) => b.life === 0.9);
  assert.ok(lit.length >= 2 && s.parts.filter((p) => p.o.color === 0xffe066).length === lit.length, 'each mote books its light');
  t.guardT = 0;
  t.boostT = 0;
  s.step(BLOCK_MARKS.fade + 0.05);
  assert.ok(!v.rime.visible && !v.pollen.visible && v.sprout.visible, 'the coat and the pollen fade; the save stays marked');
  // Reduce motion: no motes, the marks still show
  const still = scene({ reduced: true });
  still.add(1, 6, 1, 1, { element: 'fire' }, { boostT: 5 });
  still.step(1);
  assert.ok(still.blocks.viewOf(1).pollen.visible && !still.parts.some((p) => p.o.color === 0xffe066));
});

test('a fusion fed a single pops with sparks of the element it gained; an elemental egg lands with a glint of its colour; both book their light', () => {
  const s = scene();
  s.add(1, 7, 1, 1, fusion('fire', 'ice'));
  s.step(0.2);
  s.blocks.onEvent({ type: 'buffed', tileId: 1, gain: { lightning: 1 }, buffs: { lightning: 1 }, x: 0, y: 0, tier: 7 });
  s.step();
  assert.ok(s.blocks.viewOf(1).pop > 0.5);
  const blue = parseInt(ELEMENTS.lightning.color.slice(1), 16);
  assert.equal(s.parts.filter((p) => p.o.color === blue).length, 5, 'five sparks');
  const none = scene({ grant: false });
  none.add(1, 7, 1, 1, fusion('fire', 'ice'));
  none.step(0.2);
  none.blocks.onEvent({ type: 'buffed', tileId: 1, gain: { lightning: 1 }, x: 0, y: 0 });
  assert.equal(none.parts.length, 0, 'refused by the light budget: no sparks');
  // a new elemental egg drops in with a glint; a plain block with sand puffs only
  const e = scene();
  e.run.grid.moves = 1;
  e.step();
  e.add(9, 2, 3, 3, { element: 'poison' }, { bornAt: 1 });
  e.add(8, 1, 0, 3, {}, { bornAt: 1 });
  e.step(0.3);
  const purple = parseInt(ELEMENTS.poison.color.slice(1), 16);
  assert.equal(e.parts.filter((p) => p.o.color === purple).length, 3, 'the egg’s glint');
  assert.equal(e.parts.filter((p) => p.o.color === 0xd9c7a3).length, 4, 'two sand puffs each');
});
