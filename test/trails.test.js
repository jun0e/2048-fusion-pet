import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture } from 'pixi.js';
import { GHOST, RIBBON_POINTS, TRAIL_CAPS, createAfterimage, createSlots, createTrails } from '../src/render/trails.js';
import { allowed, bookPlan } from '../src/render/attacks.js';
import { DECAL } from '../src/ux/photosafe.js';

// a stage without a renderer: the trails only need its layers, its mapping and U
const fakeStage = () => ({ layers: Object.fromEntries(['path', 'shots', 'fx'].map((k) => [k, new Container()])), sx: (x) => x * 35, sy: (y) => 600 - y * 35, view: { U: 35 } });
const allChildren = (c) => c.children.flatMap((k) => [k, ...allChildren(k)]);

test('slots: a fixed pool, built lazily; the oldest is recycled only when asked', () => {
  let built = 0;
  const slots = createSlots(3, (i) => ({ i, n: ++built }));
  assert.ok(slots.take('a') && slots.take('b') && slots.take('c'));
  assert.equal(slots.take('d'), null, 'full: no slot');
  assert.equal(slots.take('a'), slots.get('a'), 'a key keeps its slot');
  const d = slots.take('d', { steal: true });
  assert.ok(d, 'stealing recycles one');
  assert.equal(slots.get('a'), null, 'the oldest went');
  assert.equal(slots.size, 3);
  assert.equal(built, 3, 'never more than the cap');
  slots.release('b');
  assert.equal(slots.size, 2);
  assert.ok(slots.take('e'));
  assert.equal(built, 3, 'a released slot is reused');
  slots.clear();
  assert.equal(slots.size, 0);
});

test('trails: 24 shots, 16 ribbons, 48 decals at most; pieces and decals end on time; nothing additive', () => {
  const stage = fakeStage();
  const trails = createTrails(stage, { bandTex: () => Texture.WHITE });
  let attached = 0;
  for (let i = 0; i < 40; i++) if (trails.attach(i)) attached += 1;
  assert.equal(attached, TRAIL_CAPS.shots, 'at most 24 shots carry a trail');
  trails.detach(3);
  assert.ok(trails.attach(99), 'a landed shot frees its slot');
  for (let i = 0; i < 25; i++) trails.ribbon(`r${i}`, 'wind', 0xbff7e6, { width: 0.35 });
  assert.equal(trails.counts.ribbons, TRAIL_CAPS.ribbons, 'at most 16 ribbons: the newest take the oldest');
  assert.equal(trails.ribbon('late', 'wind', 0xffffff, { steal: false }), null, 'a shot’s ribbon never steals one');
  for (let i = 0; i < 70; i++) trails.decal(Texture.WHITE, i * 0.1, 10, { w: 1 });
  for (let i = 0; i < 300; i++) trails.piece(Texture.WHITE, 0, 10, { w: 0.5, life: 0.3 });
  trails.update(1 / 60);
  assert.equal(trails.counts.decals, TRAIL_CAPS.decals);
  assert.equal(trails.counts.pieces, TRAIL_CAPS.pieces);
  trails.update(0.35);
  assert.equal(trails.counts.pieces, 0, 'pieces end with their life');
  assert.equal(trails.counts.decals, TRAIL_CAPS.decals, 'decals hold');
  for (let t = 0; t < DECAL.rise + DECAL.hold + DECAL.fall; t += 0.1) trails.update(0.1);
  assert.equal(trails.counts.decals, 0, 'then fade away');
  for (const layer of Object.values(stage.layers)) for (const c of allChildren(layer)) assert.notEqual(c.blendMode, 'add', 'normal blend only');
  trails.reset();
  assert.deepEqual(trails.counts, { shots: 0, ribbons: 0, decals: 0, pieces: 0 });
});

test('a ribbon tapers from its head and its band scrolls; it batches (a small mesh)', () => {
  const stage = fakeStage();
  const trails = createTrails(stage, { bandTex: () => Texture.WHITE });
  const r = trails.ribbon('gust', 'wind', 0xbff7e6, { width: 0.4, taper: 0.25, speed: -2 });
  for (let i = 0; i < RIBBON_POINTS; i++) {
    r.xs[i] = 1;
    r.ys[i] = 10 - i * 0.4; // the head first
  }
  r.n = RIBBON_POINTS;
  trails.update(0.1);
  const pos = r.rope.geometry.getBuffer('aPosition').data;
  const uv = r.rope.geometry.getBuffer('aUV').data;
  const width = (i) => Math.hypot(pos[i * 4] - pos[i * 4 + 2], pos[i * 4 + 1] - pos[i * 4 + 3]);
  assert.ok(Math.abs(width(0) - 0.4 * 35) < 1e-3, `head ${width(0)} px`);
  assert.ok(Math.abs(width(RIBBON_POINTS - 1) - 0.4 * 35 * 0.25) < 1e-3, 'the tail is a quarter of it');
  for (let i = 1; i < RIBBON_POINTS; i++) assert.ok(width(i) < width(i - 1));
  const u0 = uv[0];
  trails.update(0.1);
  assert.ok(Math.abs(uv[0] - (u0 - 0.2)) < 1e-6, 'the band scrolls');
  assert.ok(r.rope.batched, 'a rope batches with the sprites');
});

test('an afterimage: ghosts 80 ms apart behind a moving body, at 60/30/15%', () => {
  const layer = new Container();
  const ghosts = createAfterimage(layer, 3);
  for (let i = 0; i <= 30; i++) ghosts.push(1 / 60, i * 10, 0, 1, 1, 0); // 600 px/s to the right
  ghosts.draw(3, Texture.WHITE, 0xffffff);
  const shown = layer.children.filter((c) => c.visible);
  assert.equal(shown.length, 3);
  shown.forEach((g, k) => {
    assert.ok(Math.abs(g.x - (300 - 600 * GHOST.gap * (k + 1))) < 1e-6, `ghost ${k} at ${g.x}`);
    assert.equal(g.alpha, GHOST.alphas[k]);
  });
  ghosts.draw(1, Texture.WHITE);
  assert.equal(layer.children.filter((c) => c.visible).length, 1);
  ghosts.clear();
  assert.equal(layer.children.filter((c) => c.visible).length, 0);
});

test('an attack books its plan: whole pieces all or nothing, the rest by share; fewer bits when short', () => {
  const asked = [];
  const fx = {
    flashAll: (lit, life) => (asked.push(['all', lit, life]), lit < 1),
    flashShare: (lit, life, min) => (asked.push(['share', lit, life, min]), lit > 2 ? 0.5 : 1),
  };
  const plan = { items: [{ key: 'glint', lit: 0.1, life: 0.4, all: true }, { key: 'big', lit: 3, life: 0.3, min: 0.25 }, { key: 'embers', lit: 0.5, life: 0.4 }, { key: 'huge', lit: 5, life: 0.2, all: true }] };
  const got = bookPlan(fx, plan);
  assert.deepEqual(got, { glint: 1, big: 0.5, embers: 1, huge: 0 });
  assert.deepEqual(asked.map((a) => a[0]), ['all', 'share', 'share', 'all']);
  assert.equal(asked[1][3], 0.25, 'its minimum share goes to the budget');
  assert.equal(allowed(6, 0.5), 3);
  assert.equal(allowed(3, 0), 0);
  assert.deepEqual(bookPlan(fx, null), {});
});

test('a decal laid with a delay stays hidden until then, then rises; a piece shows only in its window', () => {
  const stage = fakeStage();
  const trails = createTrails(stage, { bandTex: () => Texture.WHITE });
  trails.decal(Texture.WHITE, 0, 10, { w: 1, delay: 0.3 });
  trails.piece(Texture.WHITE, 0, 10, { w: 1, delay: 0.2, life: 0.1 });
  const decal = trails.layers.decal.children[0];
  const piece = trails.layers.piece.children[0];
  trails.update(0.1);
  assert.equal(decal.visible, false, 'the crater waits for the meteor to land');
  assert.equal(piece.visible, false);
  trails.update(0.15);
  assert.equal(piece.visible, true, 'the piece shows after its delay');
  assert.equal(decal.visible, false);
  trails.update(0.1);
  assert.equal(decal.visible, true, 'then the decal rises');
  assert.ok(decal.alpha > 0 && decal.alpha < DECAL.alpha, 'fading in');
  assert.equal(trails.counts.pieces, 0, 'and the piece is over');
});

test('a shot’s apex ribbon is released with its shot, but never once another owner has taken it', () => {
  const stage = fakeStage();
  const trails = createTrails(stage, { bandTex: () => Texture.WHITE });
  const slot = trails.attach(1);
  assert.ok(trails.shotRibbon(slot, 'shot1', 'ice', 0xffffff, { width: 0.2 }));
  // 16 gusts come: the oldest ribbon, the shot's, goes to the newest
  for (let i = 0; i < TRAIL_CAPS.ribbons; i++) trails.ribbon(`gust${i}`, 'wind', 0xffffff);
  assert.equal(trails.counts.ribbons, TRAIL_CAPS.ribbons);
  assert.notEqual(slot.ribbon.key, 'shot1', 'the shot’s ribbon went to a gust');
  trails.detach(1);
  assert.equal(trails.counts.ribbons, TRAIL_CAPS.ribbons, 'landing does not take the gust’s ribbon away');
  // a full house: a shot never steals one
  const slot2 = trails.attach(2);
  assert.equal(trails.shotRibbon(slot2, 'shot2', 'ice', 0xffffff, { width: 0.2 }), null);
  trails.detach(2);
  assert.equal(trails.counts.ribbons, TRAIL_CAPS.ribbons);
});

test('a ribbon keeps the vertices trails writes: Pixi never rebuilds them, even when its band changes height', () => {
  const stage = fakeStage();
  let tall = false;
  const trails = createTrails(stage, { bandTex: () => (tall ? Texture.EMPTY : Texture.WHITE) });
  const r = trails.ribbon('a', 'wind', 0xffffff, { width: 0.4 });
  assert.equal(r.rope.onRender, null);
  tall = true;
  trails.ribbon('a', 'fire', 0xffffff, { width: 0.4 }); // the same key: re-styled
  assert.equal(r.rope.onRender, null);
});
