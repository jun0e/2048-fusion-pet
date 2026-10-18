// The summoned pets as drawn (src/kv/roam.js; docs/v2/SPEC.md sections 5 and 7): a fusion pet hops
// out of its tile to tile.summon.{x, y}, acts there and hops back, on the sim's clock; smaller than the
// bosses (proposal W4), drawn behind a foe that stands lower on screen and in front of one higher up,
// each moving its own way, and still under Reduce motion. The mark on a picked tile's pet too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture, TextureSource } from 'pixi.js';
import { GAITS, HOP, createRoamers, gaitAt, homeOf, hopAt } from '../src/kv/roam.js';
import { ROAMER_CELLS, ROAMER_MAX_W, createArt, generatedRoamerFit } from '../src/art/index.js';
import { FUSION_ROSTER } from '../src/art/fusion-roster.js';
import { foeDrawSize } from '../src/art/foe-roster.js';
import { ENEMY_TYPES } from '../src/sim/enemies.js';
import { GRID, V2 } from '../src/config.js';

const U = 35;
const DT = 1 / 60;
const tex = (w, h) => new Texture({ source: new TextureSource({ width: w, height: h }) });

/**
 * A summoned pet on a stand-in stage: tile 7 (at x 1, y 3) is out at (1, 11) acting, unless `phase`
 * says otherwise. `step` advances real and sim time together; `fx` counts its puffs and rings.
 */
function scene({ pure = false, reduced = false, fit = null, size = [200, 210], phase = 'act' } = {}) {
  const stage = { reduced, layers: { enemies: new Container() }, sx: (x) => x * U, sy: (y) => 900 - y * U, view: { U } };
  const art = {
    style: 'sticker',
    roamer: () => tex(...size),
    roamerFit: (cls) => fit ?? { feet: 0.97, height: cls.pure ? ROAMER_CELLS.legend : ROAMER_CELLS.fusion, maxW: 1.4 },
    halo: () => tex(120, 120),
  };
  const fx = {
    bursts: [],
    rings: [],
    burst(x, y) {
      this.bursts.push({ x, y });
    },
    ring(x, y) {
      this.rings.push({ x, y });
    },
  };
  const roam = createRoamers(stage, fx, art, { tx: { shadowTex: () => tex(128, 48), softDot: () => tex(64, 64) } });
  const cls = pure ? { element: 'metal', fusion: 'fire', buffs: {}, pure: true } : { element: 'fire', fusion: 'ice', buffs: {} };
  const tile = { id: 7, x: 1, y: 3, tier: pure ? 12 : 10, cls, summon: { key: 'fire+ice', phase, x: 1, y: 11, t: 0, dur: V2.summon.durS } };
  const run = { tiles: [tile], time: 0, enemies: [], defense: {} };
  const step = (seconds = DT) => {
    for (let i = 0; i < Math.max(1, Math.round(seconds / DT)); i++) {
      run.time += DT;
      roam.sync(run, DT);
    }
  };
  const pet = () => roam.viewOf(7);
  return { stage, roam, run, tile, step, fx, pet };
}

test('a summoned pet hops out of its tile to its spot over the hop, growing from its tile size, and lands with a dust ring', () => {
  const s = scene({ phase: 'out' });
  s.step();
  const v = s.pet();
  assert.ok(v && v.mode === 'out', 'it springs off its tile');
  const home = homeOf(s.tile);
  assert.ok(Math.abs(home.y - (3 - HOP.sill * GRID.cell)) < 1e-9, 'it stands on its tile’s sill');
  assert.ok(Math.hypot(v.x - home.x, v.y - home.y) < 0.2 && v.scale < HOP.tile + 0.05, 'from its tile, at its tile size');
  assert.ok(s.fx.bursts.length >= 1, 'a puff as it springs off');
  let high = 0;
  for (let i = 0; i < Math.round(V2.summon.hopS / DT) - 2; i++) {
    s.step();
    high = Math.max(high, v.lift);
  }
  assert.ok(high > HOP.height * 0.9, `it arcs (${high.toFixed(2)} u high)`);
  s.tile.summon.phase = 'act';
  s.step(0.1);
  assert.equal(v.mode, 'act');
  assert.ok(Math.hypot(v.x - 1, v.y - 11) < 1e-9 && v.lift === 0 && v.scale === 1, 'at its spot, full size');
  assert.ok(s.fx.rings.length >= 1, 'it lands with a dust ring');
  // the hop is on the sim's clock: a paused game holds it
  const p = scene({ phase: 'out' });
  p.step();
  const x0 = p.pet().lift;
  for (let i = 0; i < 30; i++) p.roam.sync(p.run, DT); // frames without sim time
  assert.equal(p.pet().lift, x0, 'paused: it hangs where it was');
});

test('acting, the pet follows the sim: it walks where it moves, a jump is drawn as a hop, and it faces where it goes', () => {
  const s = scene();
  s.step(V2.summon.hopS + 0.1);
  const v = s.pet();
  assert.equal(v.mode, 'act');
  for (let i = 0; i < 20; i++) {
    s.tile.summon.x -= 0.02;
    s.step();
  }
  assert.ok(Math.abs(v.x - s.tile.summon.x) < 1e-9 && v.facing === -1, 'it walks left, facing left');
  assert.ok(v.go > 0.5, 'into its stride');
  s.tile.summon.x = 3; // a hop to another foe
  s.step();
  assert.ok(v.leap && v.x < 2, 'a jump is a hop, not a teleport');
  s.step(HOP.leapS + 0.05);
  assert.ok(Math.abs(v.x - 3) < 1e-9 && !v.leap && v.facing === 1);
  s.tile.summon.facing = -1; // the sim's facing wins
  s.step();
  assert.equal(v.facing, -1);
});

test('it hops back onto its tile, shrinking; when the summon ends it is gone (in a puff if it ended out of turn)', () => {
  const s = scene();
  s.step(V2.summon.hopS + 0.1);
  s.tile.summon.phase = 'back';
  s.step(V2.summon.hopS / 2);
  const v = s.pet();
  assert.equal(v.mode, 'back');
  assert.ok(v.lift > 0.5 && v.scale < 1 && v.scale > HOP.tile, 'on its way home');
  s.step(V2.summon.hopS / 2 + 0.05);
  assert.ok(Math.hypot(v.x - homeOf(s.tile).x, v.y - homeOf(s.tile).y) < 1e-9 && v.scale === HOP.tile, 'on its tile’s sill, where the tile draws it');
  const puffs = s.fx.bursts.length;
  delete s.tile.summon;
  s.step();
  assert.equal(s.pet(), null, 'home: the tile draws it again');
  assert.equal(s.fx.bursts.length, puffs, 'no puff: it landed');
  // ended while it acts: a puff where it stood
  const early = scene();
  early.step(V2.summon.hopS + 0.1);
  const n = early.fx.bursts.length;
  delete early.tile.summon;
  early.step();
  assert.equal(early.pet(), null);
  assert.ok(early.fx.bursts.length > n, 'a puff');
  // its tile left the board (merged, sold, destroyed): gone too
  const lost = scene();
  lost.step(V2.summon.hopS + 0.1);
  lost.run.tiles.length = 0;
  lost.step();
  assert.equal(lost.pet(), null);
  assert.equal(lost.stage.layers.enemies.children.filter((c) => c.children.length === 5).length, 0, 'its view is destroyed');
});

test('a summon that starts acting still hops out first; Reduce motion fades it out of its tile and in at its spot, with no arc', () => {
  const s = scene({ phase: 'act' });
  s.step(V2.summon.hopS / 2);
  assert.ok(s.pet().mode === 'out' && s.pet().lift > 0.5, 'it hops out all the same');
  // the renderer's own hop (no z): out on its sill for the first half, in at its spot (1, 11) for the second
  const r = scene({ reduced: true, phase: 'out' });
  const sill = homeOf(r.tile);
  r.step(V2.summon.hopS / 4);
  const v = r.pet();
  assert.equal(v.lift, 0, 'no arc');
  assert.ok(Math.hypot(v.x - sill.x, v.y - sill.y) < 1e-9 && v.scale === HOP.tile, 'it fades out where it stands');
  assert.ok(v.c.alpha > 0.3 && v.c.alpha < 0.7, `half faded (${v.c.alpha.toFixed(2)})`);
  r.step(V2.summon.hopS / 2);
  assert.ok(Math.hypot(v.x - 1, v.y - 11) < 1e-9 && v.scale === 1, 'then in at its spot');
  assert.ok(v.c.alpha > 0.3 && v.c.alpha < 0.7, `half faded in (${v.c.alpha.toFixed(2)})`);
  r.tile.summon.phase = 'act';
  r.step(V2.summon.hopS);
  assert.equal(v.c.alpha, 1);
  // no cast hop under Reduce motion
  const y0 = v.body.position.y;
  r.roam.onEvent({ type: 'skillFx', fx: 'ring', x: 1, y: 11, r: 2, color: '#ff0000' });
  r.step(0.1);
  assert.equal(v.body.position.y, y0, 'Reduce motion: it does not jump into its cast');
});

test('Reduce motion with the sim’s own hop: the pet never slides through it, and a jump while it acts is a cut', () => {
  const r = scene({ reduced: true, phase: 'out' });
  const tile = r.tile;
  const hop = V2.summon.hopS;
  Object.assign(tile.summon, { t: 0, hop, dur: 2, x: tile.x, y: tile.y, z: 0, x0: tile.x, y0: tile.y, tx: 3, ty: 12, home: { x: tile.x, y: tile.y }, facing: 1, moving: false });
  const sill = homeOf(tile);
  r.step();
  const v = r.pet();
  /** Run the sim's hop to its end; every frame the pet stands at `a` (first half) or `b` (second), fading out then in. */
  const hopsBetween = (a, b, scaleA, scaleB) => {
    let frames = 0;
    while (tile.summon.t < hop) {
      simHop(tile.summon, DT);
      r.step();
      const k = tile.summon.t / hop;
      const at = k < 0.5 ? a : b;
      assert.ok(Math.hypot(v.x - at.x, v.y - at.y) < 1e-9, `k ${k.toFixed(2)}: at (${v.x.toFixed(2)}, ${v.y.toFixed(2)}), not between`);
      assert.equal(v.lift, 0, 'no arc');
      assert.equal(v.scale, k < 0.5 ? scaleA : scaleB);
      assert.ok(Math.abs(v.c.alpha - Math.abs(2 * k - 1)) < 1e-9, `k ${k.toFixed(2)}: alpha ${v.c.alpha.toFixed(2)}`);
      frames++;
    }
    assert.ok(frames > 20);
  };
  hopsBetween(sill, { x: 3, y: 12 }, HOP.tile, 1);
  Object.assign(tile.summon, { phase: 'act', t: 0, x: 3, y: 12, z: 0 });
  r.step();
  assert.ok(v.mode === 'act' && v.c.alpha === 1);
  tile.summon.x = -3; // a jump to another foe
  r.step();
  assert.ok(!v.leap && v.x === -3 && v.lift === 0, 'a cut, not a hop');
  Object.assign(tile.summon, { phase: 'back', t: 0, x0: -3, y0: 12 });
  hopsBetween({ x: -3, y: 12 }, sill, 1, HOP.tile);
  const puffs = r.fx.bursts.length;
  delete tile.summon; // petHome
  r.step();
  assert.equal(r.pet(), null);
  assert.equal(r.fx.bursts.length, puffs, 'home on its sill: no puff');
});

test('when its skill acts from it, the pet throws itself into it: a squash and a little hop', () => {
  const s = scene();
  s.step(V2.summon.hopS + 0.1);
  const v = s.pet();
  const rest = v.body.position.y;
  s.roam.onEvent({ type: 'skillFx', fx: 'slam', x: 1.2, y: 11.1, r: 2, color: '#ff9f1c' });
  s.step(HOP.cast / 2);
  assert.ok(v.body.position.y < rest - 0.1 * U, 'it hops into its cast');
  s.step(HOP.cast);
  assert.ok(Math.abs(v.body.position.y - rest) < 0.06 * U, 'and settles');
  // an effect far from it is not its own
  s.roam.onEvent({ type: 'skillFx', fx: 'burst', x: -3, y: 15, n: 8, color: '#ffffff' });
  s.step(HOP.cast / 2);
  assert.ok(Math.abs(v.body.position.y - rest) < 0.06 * U);
  // by the tile it came from, wherever the effect is
  s.roam.onEvent({ type: 'skillFx', fx: 'beam', tileId: 7, x: -3, y: 9, x1: -3, y1: 16, w: 0.5, color: '#ffffff' });
  s.step(HOP.cast / 2);
  assert.ok(v.body.position.y < rest - 0.1 * U);
});

test('a summoned fusion stands 1.0 cell tall and a pure form 1.15 under its halo: smaller than every boss', () => {
  const bosses = Object.values(ENEMY_TYPES).filter((d) => d.boss).map((d) => foeDrawSize(d) / GRID.cell);
  assert.ok(bosses.length >= 3);
  assert.ok(ROAMER_CELLS.fusion === 1 && ROAMER_CELLS.legend === 1.15);
  assert.ok(ROAMER_CELLS.legend < Math.min(...bosses), `bosses are ${bosses.map((b) => b.toFixed(2)).join(', ')} cells`);
  for (const pure of [false, true]) {
    const s = scene({ pure });
    s.step(V2.summon.hopS + 0.1);
    const body = s.pet().body;
    const cells = (body.texture.height * Math.abs(body.scale.y)) / (GRID.cell * U);
    assert.ok(Math.abs(cells - (pure ? 1.15 : 1)) < 0.06, `${pure ? 'pure' : 'fusion'}: ${cells.toFixed(2)} cells`);
    assert.equal(s.pet().halo.visible, pure, 'a pure form wears its halo');
    if (pure) {
      const kids = s.pet().c.children;
      assert.ok(kids.indexOf(s.pet().halo) < kids.indexOf(body), 'behind it, as on its tile');
    }
  }
  // the code-drawn stand-ins are padded canvases: drawn taller by their padding, so the creature is the same size
  const fit = createArt('sticker').roamerFit({ element: 'fire', fusion: 'ice' });
  assert.ok(Math.abs(fit.height / (1.42 / 1.18) - ROAMER_CELLS.fusion) < 1e-9);
});

test('pets and foes share one layer, drawn by where they stand: the lower one in front', () => {
  const s = scene();
  const layer = s.stage.layers.enemies;
  const foe = (y) => {
    const c = new Container();
    c.position.set(U, s.stage.sy(y));
    layer.addChild(c);
    return c;
  };
  const near = foe(10); // its feet below the pet's (the pet stands at 11)
  const far = foe(12.5);
  s.step(V2.summon.hopS + 0.1);
  const pet = s.pet().c;
  assert.ok(layer.sortableChildren, 'the layer sorts by depth');
  assert.ok(near.zIndex > pet.zIndex, 'a foe lower on screen is drawn over the pet');
  assert.ok(far.zIndex < pet.zIndex, 'a foe higher up is drawn behind it');
  const level = foe(11 + 0.34 - 0.05); // its sim position a little above its feet, which stand just below the pet's
  s.step();
  assert.ok(level.zIndex > pet.zIndex, 'side by side, the foe whose feet are lower is in front');
});

test('a picked tile marks its summoned pet with the pick’s brackets, over every pet and foe; Reduce motion holds them still', () => {
  const s = scene();
  s.step(V2.summon.hopS + 0.1);
  assert.equal(s.roam.mark.visible, false);
  s.roam.highlight(7);
  s.step();
  const m = s.roam.mark;
  assert.ok(m.visible && m.id === 7);
  assert.deepEqual([m.x, m.y], [s.stage.sx(1), s.stage.sy(11)], 'at the pet');
  const [tl, tr, br, bl] = m.corners;
  assert.ok(tl.x < 0 && tr.x > 0 && tl.y < br.y && bl.x === tl.x && br.y === bl.y, 'round its body');
  assert.ok(br.y > 0 && tl.y < -0.9 * GRID.cell * U, 'from its feet to over its head');
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < 120; i++) {
    s.step();
    lo = Math.min(lo, s.roam.mark.corners[1].x);
    hi = Math.max(hi, s.roam.mark.corners[1].x);
  }
  assert.ok(hi - lo > 0.3, 'their gap breathes');
  const foe = new Container(); // a foe lower on screen than the pet: drawn over the pet
  foe.position.set(U, s.stage.sy(9));
  s.stage.layers.enemies.addChild(foe);
  s.step();
  assert.ok(s.roam.mark.z > foe.zIndex && s.roam.mark.z > s.pet().c.zIndex, 'the mark over the foe and the pet');
  s.roam.highlight(null);
  s.step();
  assert.equal(s.roam.mark.visible, false, 'cleared');
  s.roam.highlight(99); // a block with no pet out
  s.step();
  assert.equal(s.roam.mark.visible, false);
  const still = scene({ reduced: true });
  still.step(V2.summon.hopS + 0.1);
  still.roam.highlight(7);
  still.step();
  const x0 = still.roam.mark.corners[1].x;
  still.step(1.5);
  assert.equal(still.roam.mark.corners[1].x, x0, 'still under Reduce motion');
});

test('a generated pet stands 1.0 cell tall and up to 1.6 cells wide, with its roster view and move', () => {
  assert.equal(ROAMER_MAX_W, 1.6);
  const croc = generatedRoamerFit({ element: 'fire', fusion: 'metal' });
  assert.deepEqual(croc, { feet: 0.97, height: 1, maxW: 1.6, view: 'profile', move: 'crawl' });
  assert.deepEqual(generatedRoamerFit({ element: 'metal', fusion: 'fire' }), croc, 'either merge order');
  const pure = generatedRoamerFit({ element: 'ice', fusion: 'poison', buffs: {}, pure: true });
  assert.equal(pure.height, 1.15);
  assert.ok(Math.abs(pure.maxW - 1.15 * 1.6) < 1e-9);
  assert.equal(pure.view, 'front', 'the jellyfish is drawn from the front');
  // a long low animal 2.5× wider than tall is capped by its width: 1.6 cells wide, 0.64 tall
  const s = scene({ fit: croc, size: [500, 200] });
  s.step(V2.summon.hopS + 0.1);
  const body = s.pet().body;
  const cells = (px) => px / (GRID.cell * U);
  assert.ok(Math.abs(cells(500 * Math.abs(body.scale.x)) - 1.6) < 0.08, `width ${cells(500 * Math.abs(body.scale.x)).toFixed(2)} cells`);
  assert.ok(Math.abs(cells(200 * Math.abs(body.scale.y)) - 0.64) < 0.04, `height ${cells(200 * Math.abs(body.scale.y)).toFixed(2)} cells`);
});

test('each pet moves its own way: hoverers ride over a detached shadow, crawlers never lift, leapers hop higher than walkers', () => {
  const peak = (move, moving, view = 'profile') => {
    let lift = 0;
    let lowest = Infinity;
    for (let t = 0; t < 4; t += 0.01) {
      const g = gaitAt(move, t, moving, view);
      lift = Math.max(lift, g.lift);
      lowest = Math.min(lowest, g.lift);
    }
    return { lift, lowest };
  };
  assert.equal(peak('crawl', true).lift, 0, 'a crawler stays on the ground');
  assert.equal(peak('walk', false).lift, 0, 'a walker standing still does not bob');
  assert.ok(peak('walk', true).lift <= 0.121);
  assert.ok(peak('leap', true).lift > 2 * peak('walk', true).lift, 'a leaper hops');
  for (const m of ['hover', 'float', 'swim']) assert.ok(peak(m, false).lowest > 0.15, `${m}: off the ground even when still`);
  assert.ok(gaitAt('swim', 1, false).dx !== 0, 'a swimmer drifts');
  assert.ok([...Array(40)].some((_, i) => gaitAt('hover', i * 0.05, false, 'spread').wide < 0.95), 'wings seen from above beat');
  assert.equal(gaitAt('hover', 0.3, false, 'profile').wide, 1);
  // in the scene: a hovering pet lifts its body and leaves a smaller shadow on the ground
  const at = (move, view = 'profile') => {
    const s = scene({ fit: { feet: 0.97, height: 1, maxW: 1.6, view, move } });
    s.tile.summon.facing = 1; // facing right
    s.step(V2.summon.hopS + 0.2);
    return { body: s.pet().body, shadow: s.pet().shadow };
  };
  const walker = at('walk');
  const hoverer = at('hover');
  assert.ok(hoverer.body.position.y < walker.body.position.y - 0.25 * U, 'the hoverer rides higher');
  assert.ok(hoverer.shadow.width < walker.shadow.width, 'its shadow, left on the ground, is smaller');
  // only a side view turns to face where it goes; a front or top view keeps its light from the upper left
  assert.ok(walker.body.scale.x < 0, 'a profile facing right is flipped');
  assert.ok(at('hover', 'front').body.scale.x > 0, 'a front view is never flipped');
  assert.ok(at('swim', 'spread').body.scale.x > 0, 'nor a top view');
  // Reduce motion: a leaper walks
  const calm = scene({ fit: { feet: 0.97, height: 1, maxW: 1.6, view: 'profile', move: 'leap' }, reduced: true });
  calm.step(V2.summon.hopS + 0.1);
  let high = 0;
  for (let i = 0; i < 120; i++) {
    calm.tile.summon.x += 0.01; // keep it walking
    calm.step();
    high = Math.max(high, -calm.pet().body.position.y);
  }
  assert.ok(high <= 0.121 * U + 1e-6, `under Reduce motion the jackrabbit walks (${(high / U).toFixed(3)} U)`);
  assert.ok(high > 0.05 * U, `but it does walk: it steps (${(high / U).toFixed(3)} U)`);
});

test('a pet eases into its stride and out of it, and never squashes past 5 %', () => {
  // the first frame on the move barely lifts a leaper; a second later it hops at full height
  const s = scene({ fit: { feet: 0.97, height: 1, maxW: 1.6, view: 'profile', move: 'leap' } });
  s.step(V2.summon.hopS + 0.1);
  let first = null;
  let high = 0;
  for (let i = 0; i < 90; i++) {
    s.tile.summon.x += 0.01;
    s.step();
    if (first == null) first = -s.pet().body.position.y;
    high = Math.max(high, -s.pet().body.position.y);
  }
  assert.ok(first < 0.05 * U, `the first moving frame lifts ${(first / U).toFixed(3)} U, not a jump`);
  assert.ok(high > 0.25 * U, `then it hops (${(high / U).toFixed(3)} U)`);
  for (const move of GAITS)
    for (let t = 0; t < 3; t += 0.01) for (const go of [0, 0.5, 1]) assert.ok(Math.abs(gaitAt(move, t, go, 'profile').squash) <= 0.05 + 1e-9, `${move} at ${t}`);
});

test('the hop’s arc: from its tile to its spot, highest half way, a little higher the further it goes', () => {
  const a = hopAt(0, 3, 0, 11, 0);
  const mid = hopAt(0, 3, 0, 11, 0.5);
  const end = hopAt(0, 3, 0, 11, 1);
  assert.deepEqual([a.x, a.y, a.lift], [0, 3, 0]);
  assert.ok(Math.abs(mid.y - 7) < 1e-9 && Math.abs(mid.lift - (HOP.height + HOP.reach * 8)) < 1e-9);
  assert.ok(Math.abs(end.y - 11) < 1e-9 && Math.abs(end.lift) < 1e-9);
  assert.ok(hopAt(0, 0, 0, 1, 0.5).lift < mid.lift);
});

test('every roster move is a gait the pet draws', () => {
  assert.deepEqual(GAITS, ['walk', 'crawl', 'leap', 'hover', 'swim', 'float']);
  for (const [k, r] of Object.entries(FUSION_ROSTER)) assert.ok(GAITS.includes(r.move), `${k}: ${r.move}`);
});

/** One step of a summon as the sim moves it (src/sim/roam.js moveSummon on v2): a line and a sine arc 2.2 high. */
function simHop(s, dt) {
  s.t += dt;
  const k = Math.min(1, s.t / s.hop);
  const tx = s.phase === 'out' ? s.tx : s.home.x;
  const ty = s.phase === 'out' ? s.ty : s.home.y;
  s.x = s.x0 + (tx - s.x0) * k;
  s.y = s.y0 + (ty - s.y0) * k;
  s.z = Math.sin(k * Math.PI) * 2.2;
}

test('a summon that carries its own hop (the sim’s x, y, z) is drawn exactly there, standing on its tile’s sill near home', () => {
  const s = scene({ phase: 'out' });
  const tile = s.tile;
  const hop = V2.summon.hopS;
  Object.assign(tile.summon, { t: 0, hop, dur: 2, x: tile.x, y: tile.y, z: 0, x0: tile.x, y0: tile.y, tx: 3, ty: 12, home: { x: tile.x, y: tile.y }, facing: 1, moving: false });
  const sim = () => {
    simHop(tile.summon, DT);
    s.step();
  };
  s.step();
  const v = s.pet();
  const sill = homeOf(tile);
  assert.ok(Math.hypot(v.x - sill.x, v.y - sill.y) < 0.05, 'it leaves from its tile’s sill, not the sim’s home point');
  for (let i = 0; i < Math.round(hop / DT / 2); i++) sim();
  const k = tile.summon.t / hop;
  assert.ok(Math.abs(v.lift - tile.summon.z) < 1e-9 && v.lift > 2, `its lift is the sim’s z (${v.lift.toFixed(2)})`);
  assert.ok(Math.abs(v.x - (tile.summon.x + (sill.x - tile.x) * (1 - k))) < 1e-9 && Math.abs(v.y - (tile.summon.y + (sill.y - tile.y) * (1 - k))) < 1e-9);
  assert.ok(Math.abs(v.scale - (HOP.tile + (1 - HOP.tile) * k)) < 1e-9, 'it grows as it goes');
  while (tile.summon.t < hop) sim();
  const rings = s.fx.rings.length;
  Object.assign(tile.summon, { phase: 'act', t: 0, x: 3, y: 12, z: 0 });
  s.step();
  assert.equal(v.mode, 'act');
  assert.ok(Math.abs(v.x - 3) < 1e-9 && Math.abs(v.y - 12) < 1e-9 && v.lift === 0 && v.scale === 1);
  assert.equal(s.fx.rings.length, rings + 1, 'it lands with a dust ring');
  // it walks while the sim says it moves, and stands when it does not
  tile.summon.moving = true;
  tile.summon.x -= 0.03;
  s.step(0.3);
  assert.ok(v.go > 0.5, 'into its stride');
  tile.summon.moving = false;
  s.step(0.6);
  assert.ok(v.go < 0.05, 'and out of it');
  // home: the sim hops it back to its home point; it lands on the sill, and the summon ends without a puff
  Object.assign(tile.summon, { phase: 'back', t: 0, x0: tile.summon.x, y0: tile.summon.y });
  while (tile.summon.t < hop) sim(); // the sim's last step before petHome: k = 1
  assert.ok(Math.hypot(v.x - sill.x, v.y - sill.y) < 1e-9 && Math.abs(v.scale - HOP.tile) < 1e-9 && v.lift < 1e-9, 'on its sill, at its tile size');
  const puffs = s.fx.bursts.length;
  delete tile.summon; // petHome
  s.step();
  assert.equal(s.pet(), null);
  assert.equal(s.fx.bursts.length, puffs, 'it landed: no puff');
});

test('v1’s enemy split event, still named summon, is no pet’s', () => {
  const s = scene();
  s.run.tiles[0].summon = undefined;
  s.roam.onEvent({ type: 'summon', id: 3, x: 1, y: 12, count: 3 });
  s.step();
  assert.equal(s.pet(), null);
  assert.equal(s.fx.bursts.length, 0, 'no pet springs off a tile');
});
