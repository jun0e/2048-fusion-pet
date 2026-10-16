// The roaming pets as drawn (src/kv/roam.js; proposal W4): smaller than the bosses, drawn behind a
// foe that stands lower on screen and in front of one higher up, and still under Reduce motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture, TextureSource } from 'pixi.js';
import { createRoamers } from '../src/kv/roam.js';
import { ROAMER_CELLS, createArt } from '../src/art/index.js';
import { foeDrawSize } from '../src/art/foe-roster.js';
import { ENEMY_TYPES } from '../src/sim/enemies.js';
import { GRID } from '../src/config.js';

const U = 35;
const tex = (w, h) => new Texture({ source: new TextureSource({ width: w, height: h }) });

function scene({ legend = false, reduced = false } = {}) {
  const stage = { reduced, layers: { enemies: new Container() }, sx: (x) => x * U, sy: (y) => 900 - y * U, view: { U } };
  const art = {
    style: 'sticker',
    roamer: () => tex(200, 210),
    roamerFit: (cls) => ({ feet: 0.97, height: cls.ultimate ? ROAMER_CELLS.legend : ROAMER_CELLS.fusion, maxW: 1.4 }),
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
