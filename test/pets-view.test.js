// The roaming pets as drawn (src/kv/roam.js; proposal W4): smaller than the bosses, drawn behind a
// foe that stands lower on screen and in front of one higher up, and still under Reduce motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture, TextureSource } from 'pixi.js';
import { GAITS, createRoamers, gaitAt } from '../src/kv/roam.js';
import { ROAMER_CELLS, ROAMER_MAX_W, createArt, generatedRoamerFit } from '../src/art/index.js';
import { FUSION_ROSTER } from '../src/art/fusion-roster.js';
import { foeDrawSize } from '../src/art/foe-roster.js';
import { ENEMY_TYPES } from '../src/sim/enemies.js';
import { GRID } from '../src/config.js';

const U = 35;
const tex = (w, h) => new Texture({ source: new TextureSource({ width: w, height: h }) });

function scene({ legend = false, reduced = false, fit = null, size = [200, 210] } = {}) {
  const stage = { reduced, layers: { enemies: new Container() }, sx: (x) => x * U, sy: (y) => 900 - y * U, view: { U } };
  const art = {
    style: 'sticker',
    roamer: () => tex(...size),
    roamerFit: (cls) => fit ?? { feet: 0.97, height: cls.ultimate ? ROAMER_CELLS.legend : ROAMER_CELLS.fusion, maxW: 1.4 },
    halo: () => tex(120, 120),
  };
  const fx = { burst() {}, ring() {} };
  const roam = createRoamers(stage, fx, art, { tx: { shadowTex: () => tex(128, 48), softDot: () => tex(64, 64) } });
  const tile = { id: 7, x: 0, y: 4, tier: legend ? 12 : 8, cls: legend ? { element: 'metal', fusion: 'fire', ultimate: 'nature' } : { element: 'fire', fusion: 'ice' }, roam: { x: 1, y: 11, facing: 1, moving: false, hatch: 1 } };
  const run = { tiles: [tile], time: 0, defense: { cooldownLeft: () => 5 } };
  return { stage, roam, run, tile };
}

test('a roaming fusion stands 1.0 cell tall and a legend 1.15: smaller than every boss', () => {
  const bosses = Object.values(ENEMY_TYPES).filter((d) => d.boss).map((d) => foeDrawSize(d) / GRID.cell);
  assert.ok(bosses.length >= 3);
  assert.ok(ROAMER_CELLS.fusion === 1 && ROAMER_CELLS.legend === 1.15);
  assert.ok(ROAMER_CELLS.legend < Math.min(...bosses), `bosses are ${bosses.map((b) => b.toFixed(2)).join(', ')} cells`);
  for (const legend of [false, true]) {
    const { roam, run, stage } = scene({ legend });
    roam.sync(run, 1 / 60);
    const pet = stage.layers.enemies.children.find((c) => c.children.length === 5);
    const body = pet.children[4];
    const cells = (body.texture.height * Math.abs(body.scale.y)) / (GRID.cell * U);
    assert.ok(Math.abs(cells - (legend ? 1.15 : 1)) < 0.06, `${legend ? 'legend' : 'fusion'}: ${cells.toFixed(2)} cells`);
  }
  // the code-drawn stand-ins are padded canvases: drawn taller by their padding, so the creature is the same size
  const fit = createArt('sticker').roamerFit({ element: 'fire', fusion: 'ice' });
  assert.ok(Math.abs(fit.height / (1.42 / 1.18) - ROAMER_CELLS.fusion) < 1e-9);
});

test('pets and foes share one layer, drawn by where they stand: the lower one in front', () => {
  const { roam, run, stage } = scene();
  const layer = stage.layers.enemies;
  const foe = (y) => {
    const c = new Container();
    c.position.set(U, stage.sy(y));
    layer.addChild(c);
    return c;
  };
  const near = foe(10); // its feet below the pet's (the pet stands at 11)
  const far = foe(12.5);
  roam.sync(run, 1 / 60);
  const pet = layer.children.find((c) => c.children.length === 5);
  assert.ok(layer.sortableChildren, 'the layer sorts by depth');
  assert.ok(near.zIndex > pet.zIndex, 'a foe lower on screen is drawn over the pet');
  assert.ok(far.zIndex < pet.zIndex, 'a foe higher up is drawn behind it');
  const level = foe(11 + 0.34 - 0.05); // its sim position a little above its feet, which stand just below the pet's
  roam.sync(run, 1 / 60);
  assert.ok(level.zIndex > pet.zIndex, 'side by side, the foe whose feet are lower is in front');
});

test('Reduce motion: a pet that fires does not lunge, nor does a legend’s halo swell', () => {
  for (const legend of [false, true]) {
    const pose = (reduced, fire) => {
      const { roam, run, stage, tile } = scene({ legend, reduced });
      roam.sync(run, 1 / 60);
      if (fire) roam.onEvent({ type: 'fire', id: tile.id, pattern: 'cone', target: { x: tile.roam.x, y: tile.roam.y + 3 } });
      roam.sync(run, 1 / 60);
      const pet = stage.layers.enemies.children.find((c) => c.children.length === 5);
      return { y: pet.children[4].position.y, halo: pet.children[3].scale.x };
    };
    const still = pose(true, false);
    const fired = pose(true, true);
    assert.equal(fired.y, still.y, `${legend ? 'legend' : 'fusion'}: no lunge under Reduce motion`);
    assert.equal(fired.halo, still.halo, 'no halo swell');
    const moving = pose(false, true);
    if (legend) assert.ok(moving.halo > pose(false, false).halo, 'with motion, the halo swells as it fires');
    else assert.notEqual(moving.y, pose(false, false).y, 'with motion, the fusion lunges at its target');
  }
});

test('a generated pet stands 1.0 cell tall and up to 1.6 cells wide, with its roster view and move', () => {
  assert.equal(ROAMER_MAX_W, 1.6);
  const croc = generatedRoamerFit({ element: 'fire', fusion: 'metal' });
  assert.deepEqual(croc, { feet: 0.97, height: 1, maxW: 1.6, view: 'profile', move: 'crawl' });
  assert.deepEqual(generatedRoamerFit({ element: 'metal', fusion: 'fire' }), croc, 'either merge order');
  const legend = generatedRoamerFit({ element: 'ice', fusion: 'poison', ultimate: 'wind' });
  assert.equal(legend.height, 1.15);
  assert.ok(Math.abs(legend.maxW - 1.15 * 1.6) < 1e-9);
  assert.equal(legend.view, 'front', 'the jellyfish is drawn from the front');
  // a long low animal 2.5× wider than tall is capped by its width: 1.6 cells wide, 0.64 tall
  const { roam, run, stage } = scene({ fit: croc, size: [500, 200] });
  roam.sync(run, 1 / 60);
  const body = stage.layers.enemies.children.find((c) => c.children.length === 5).children[4];
  const cells = (px) => px / (GRID.cell * U);
  assert.ok(Math.abs(cells(500 * Math.abs(body.scale.x)) - 1.6) < 0.08, `width ${cells(500 * Math.abs(body.scale.x)).toFixed(2)} cells`);
  assert.ok(Math.abs(cells(200 * Math.abs(body.scale.y)) - 0.64) < 0.04, `height ${cells(200 * Math.abs(body.scale.y)).toFixed(2)} cells`);
});

test('each pet roams its own way: hoverers ride over a detached shadow, crawlers never lift, leapers hop higher than walkers', () => {
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
  const at = (move, view = 'profile', reduced = false) => {
    const { roam, run, stage } = scene({ fit: { feet: 0.97, height: 1, maxW: 1.6, view, move }, reduced });
    run.tiles[0].roam.facing = 1; // walking right
    roam.sync(run, 1 / 60);
    const pet = stage.layers.enemies.children.find((c) => c.children.length === 5);
    return { body: pet.children[4], shadow: pet.children[0] };
  };
  const walker = at('walk');
  const hoverer = at('hover');
  assert.ok(hoverer.body.position.y < walker.body.position.y - 0.25 * U, 'the hoverer rides higher');
  assert.ok(hoverer.shadow.width < walker.shadow.width, 'its shadow, left on the ground, is smaller');
  // only a side view turns to face where it goes; a front or top view keeps its light from the upper left
  assert.ok(walker.body.scale.x < 0, 'a profile walking right is flipped');
  assert.ok(at('hover', 'front').body.scale.x > 0, 'a front view is never flipped');
  assert.ok(at('swim', 'spread').body.scale.x > 0, 'nor a top view');
  // Reduce motion: a leaper walks
  const calm = scene({ fit: { feet: 0.97, height: 1, maxW: 1.6, view: 'profile', move: 'leap' }, reduced: true });
  calm.run.tiles[0].roam.moving = true;
  let high = 0;
  for (let i = 0; i < 120; i++) {
    calm.roam.sync(calm.run, 1 / 60);
    calm.run.tiles[0].roam.x += 0.01; // keep it walking
    const body = calm.stage.layers.enemies.children.find((c) => c.children.length === 5).children[4];
    high = Math.max(high, -body.position.y);
  }
  assert.ok(high <= 0.121 * U + 1e-6, `under Reduce motion the jackrabbit walks (${(high / U).toFixed(3)} U)`);
  assert.ok(high > 0.05 * U, `but it does walk: it steps (${(high / U).toFixed(3)} U)`);
});

test('a pet eases into its stride and out of it, and never squashes past 5 %', () => {
  // the first frame on the move barely lifts a leaper; a second later it hops at full height
  const { roam, run, stage } = scene({ fit: { feet: 0.97, height: 1, maxW: 1.6, view: 'profile', move: 'leap' } });
  const body = () => stage.layers.enemies.children.find((c) => c.children.length === 5).children[4];
  roam.sync(run, 1 / 60);
  run.tiles[0].roam.moving = true;
  let first = null;
  let high = 0;
  for (let i = 0; i < 90; i++) {
    run.tiles[0].roam.x += 0.01;
    roam.sync(run, 1 / 60);
    if (first == null) first = -body().position.y;
    high = Math.max(high, -body().position.y);
  }
  assert.ok(first < 0.05 * U, `the first moving frame lifts ${(first / U).toFixed(3)} U, not a jump`);
  assert.ok(high > 0.25 * U, `then it hops (${(high / U).toFixed(3)} U)`);
  for (const move of GAITS)
    for (let t = 0; t < 3; t += 0.01) for (const go of [0, 0.5, 1]) assert.ok(Math.abs(gaitAt(move, t, go, 'profile').squash) <= 0.05 + 1e-9, `${move} at ${t}`);
});

test('every roster move is a gait the roamer draws', () => {
  assert.deepEqual(GAITS, ['walk', 'crawl', 'leap', 'hover', 'swim', 'float']);
  for (const [k, r] of Object.entries(FUSION_ROSTER)) assert.ok(GAITS.includes(r.move), `${k}: ${r.move}`);
});
