// v2.1's board views at 4×4, 5×5 and 6×6 (docs/v2/SPEC-v2.1.md sections 1, 5 and 6): the frame's keep,
// pits, lanes, arches, merlons and braziers match the board's size and stay inside the footprint; the grow
// moment eases the frame and the tiles from the old board to the new one (at once under Reduce motion); a
// board of another size seen without a grow event is rebuilt at once; the keep card's highlight shows and
// clears; foes, pets and skill pieces follow the lanes; a foe's resist shields and their blinks. On
// stand-ins: Node has no canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container, Texture, TextureSource } from 'pixi.js';
import { BOARD_HALF, BOARD_SPAN, DESIGN_CELL, FIELD, GRID, GRID_TOP, cellX, cellY, laneX, setBoardSize } from '../src/config.js';
import { CELL_SHARE, FRAME_GEOM, GROW, cellXAt, cellYAt, growEase, growPos, hedgeStrips, laneFit, laneOf, laneTicks, litTicks } from '../src/art/frame-kit.js';
import { GROW_DUST, createFrame } from '../src/render/frame.js';
import { perLaneOf } from '../src/render/scenery.js';
import { HIGHLIGHT } from '../src/render/blocks.js';
import { RESIST, createBlinkGate, createFoes, fanLayout, resistMarks } from '../src/render/foes.js';
import { FOE_SIZE_FLOOR, foeDrawSize } from '../src/art/foe-roster.js';
import { fieldCell, homeScale, HOP } from '../src/kv/roam.js';
import { laneHalf, wallLit, zoneArea } from '../src/render/skillfx.js';
import { ENEMY_TYPES } from '../src/sim/enemies.js';
import { PLAQUE } from '../src/art/plaque.js';
import { scene } from './helpers/board-scene.js';

const SIZES = [4, 5, 6];
const DT = 1 / 60;
const EPS = 1e-9;
const tex = (w, h) => new Texture({ source: new TextureSource({ width: w, height: h }) });

/** Run `fn` on a board `n` × `n` (the global a run sets), then back to the size before (calls nest). */
function onBoard(n, fn) {
  const was = GRID.size;
  setBoardSize(n);
  try {
    return fn();
  } finally {
    setBoardSize(was);
  }
}

/** The frame on a stand-in stage: `step` advances it; `books` collects what it booked. */
function frameScene({ reduced = false, grant = true, U = 30 } = {}) {
  const layers = Object.fromEntries(['bg', 'path', 'board'].map((k) => [k, new Container()]));
  const root = new Container();
  root.addChild(layers.bg);
  const shakes = [];
  const stage = { layers, reduced, view: { U, ox: 300, oy: 900, w: 600, h: 1000 }, sx: (x) => 300 + x * U, sy: (y) => 900 - y * U, onResize(fn) { fn(this.view); }, shake: (px) => shakes.push(px) };
  const books = [];
  const parts = [];
  const fx = {
    grant,
    flashAll(lit, life) {
      books.push({ lit, life });
      return this.grant;
    },
    particle(t, x, y, o) {
      parts.push({ x, y, o });
      return {};
    },
  };
  const text = () => Object.assign(new Container(), { text: '', style: {}, anchor: { set() {} } });
  const tx = { portalTex: () => tex(128, 128), enemyTex: () => tex(128, 128), farTex: () => null, frameTex: () => tex(64, 64), ridgeTex: () => tex(256, 32), softDot: () => tex(64, 64), gradient: () => null, text };
  const frame = createFrame(stage, { fx, tx });
  const step = (seconds = DT) => {
    for (let i = 0; i < Math.max(1, Math.round(seconds / DT)); i++) frame.update(DT, null);
  };
  return { frame, stage, step, books, parts, shakes };
}

/** The board's own geometry at size n: the lanes, pits and arches a frame built for it must show. */
function expectBoard(layout, n, what = '') {
  const cell = BOARD_SPAN / n;
  assert.equal(layout.size, n, `${what}: the size`);
  assert.ok(Math.abs(layout.cell - cell) < EPS, `${what}: the cell`);
  assert.equal(layout.lanes.length, n, `${what}: a lane per column`);
  assert.equal(layout.pits.length, n * n, `${what}: a pit per cell`);
  assert.equal(layout.arches.length, n);
  assert.equal(layout.merlons.length, n);
  assert.equal(layout.gates.length, n);
  assert.equal(layout.braziers.length, n);
  layout.lanes.forEach((l, i) => assert.ok(Math.abs(l.x - cellXAt(i, cell)) < EPS, `${what}: lane ${i} on its column`));
  layout.pits.forEach((p, i) => {
    assert.ok(Math.abs(p.x - cellXAt(i % n, cell)) < EPS && Math.abs(p.y - cellYAt(Math.floor(i / n), cell)) < EPS, `${what}: pit ${i} on its cell`);
  });
}

// --- the geometry -----------------------------------------------------------------------------------

test('the frame’s parts sized by the board keep their 4×4 values and shrink with its cell', () => {
  assert.equal(FRAME_GEOM.laneW, 1.45);
  assert.equal(FRAME_GEOM.gate.r, 0.58);
  assert.equal(FRAME_GEOM.gate.ring, 0.32);
  assert.equal(FRAME_GEOM.parapet.w, 0.84);
  assert.equal(laneFit(), 1, 'what stands in a lane: as drawn on the 4×4 board');
  for (const n of SIZES) {
    onBoard(n, () => {
      const cell = BOARD_SPAN / n;
      assert.ok(Math.abs(GRID.cell - cell) < EPS);
      assert.ok(Math.abs(FRAME_GEOM.laneW - CELL_SHARE.lane * cell) < EPS);
      assert.ok(FRAME_GEOM.laneW < cell, `${n}×${n}: a lane is narrower than its column, a hedge between each two`);
      assert.ok(2 * (FRAME_GEOM.gate.r + FRAME_GEOM.gate.ring) < cell, `${n}×${n}: the arches never touch`);
      assert.ok(FRAME_GEOM.parapet.w < cell, `${n}×${n}: a merlon per column, apart`);
      assert.ok(Math.abs(laneFit() - (1 + cell / DESIGN_CELL) / 2) < EPS);
    });
  }
  assert.ok(Math.abs(onBoard(5, () => laneFit()) - 0.9) < EPS);
  assert.ok(Math.abs(onBoard(6, () => laneFit()) - 5 / 6) < EPS);
});

test('the hedges and the lanes fill the field from tower to tower at every size, a lane per column', () => {
  for (const n of SIZES) {
    onBoard(n, () => {
      const strips = hedgeStrips();
      assert.equal(strips.length, n + 1, `${n}×${n}: a hedge between each two lanes and one outside each outer lane`);
      assert.equal(strips[0].x0, -FRAME_GEOM.towerIn);
      assert.equal(strips.at(-1).x1, FRAME_GEOM.towerIn);
      for (const st of strips) assert.ok(st.x1 > st.x0 + 0.1, `${n}×${n}: every hedge has room (${st.x0.toFixed(2)}..${st.x1.toFixed(2)})`);
      for (let l = 0; l < n; l++) {
        assert.equal(laneX(l), cellX(l));
        assert.equal(laneOf(laneX(l)), l);
        assert.ok(Math.abs(strips[l].x1 + FRAME_GEOM.laneW / 2 - laneX(l)) < EPS, 'the lane fills the gap between its hedges');
      }
    });
  }
});

test('lane ticks: one per board cell up the field at every size, and a range lights the ones it covers', () => {
  assert.deepEqual(laneTicks(), [10, 12, 14, 16]);
  for (const n of [5, 6]) {
    onBoard(n, () => {
      const ticks = laneTicks();
      const cell = BOARD_SPAN / n;
      ticks.forEach((y, k) => assert.ok(Math.abs(y - (GRID_TOP + (k + 1) * cell)) < EPS));
      assert.ok(ticks.at(-1) < FRAME_GEOM.gate.sill && ticks.at(-1) + cell >= FRAME_GEOM.gate.sill, `${n}×${n}: up to the gates`);
      // a lance from the top row of the last lane, reaching 6: its own lane's ticks within 6
      const lit = litTicks({ x: laneX(n - 1), y: cellY(n - 1), shoot: { reach: 6, lanes: 0 } });
      assert.ok(lit.length > 0 && lit.every((t) => t.lane === n - 1 && t.y <= cellY(n - 1) + 6 + EPS));
    });
  }
  assert.equal(onBoard(5, () => laneTicks().length), 5);
  assert.equal(onBoard(6, () => laneTicks().length), 6);
});

test('the grow moment’s rule: old pieces ride the eased cell, new ones slide in from out of sight', () => {
  assert.equal(growEase(0), 0);
  assert.equal(growEase(1), 1);
  assert.equal(growEase(0.5), 0.5);
  let last = -1;
  for (let t = 0; t <= 1 + EPS; t += 0.05) {
    const k = growEase(t);
    assert.ok(k >= last - EPS, 'it never goes back');
    last = k;
  }
  for (const [from, to] of [
    [4, 5],
    [5, 6],
  ]) {
    const hide = FRAME_GEOM.towerIn;
    const half = 0.9;
    for (let i = 0; i < to; i++) {
      const start = growPos(i, from, to, 0, cellXAt, { hide, half });
      const end = growPos(i, from, to, 1, cellXAt, { hide, half });
      assert.ok(Math.abs(end - cellXAt(i, BOARD_SPAN / to)) < EPS, `${from}→${to}: piece ${i} ends on the new board`);
      if (i < from) assert.ok(Math.abs(start - cellXAt(i, BOARD_SPAN / from)) < EPS, `${from}→${to}: piece ${i} starts on the old board`);
      else assert.ok(start - half >= hide - EPS, `${from}→${to}: the new piece starts out of sight`);
      // pieces never pass each other on the way
      if (i > 0) for (let k = 0; k <= 1 + EPS; k += 0.1) assert.ok(growPos(i, from, to, k, cellXAt, { hide, half }) > growPos(i - 1, from, to, k, cellXAt, { hide, half }));
    }
  }
});

// --- the frame --------------------------------------------------------------------------------------

test('the frame at 4×4, 5×5 and 6×6: a lane, an arch, a merlon, a gate and a brazier per column, a pit per cell, inside the footprint', () => {
  for (const n of SIZES) {
    onBoard(n, () => {
      const { frame } = frameScene();
      const L = frame.layout;
      expectBoard(L, n, `${n}×${n}`);
      const cell = BOARD_SPAN / n;
      // the keep: the pits inside the board's footprint, apart from each other
      for (const p of L.pits) {
        assert.ok(p.x - p.size / 2 > -BOARD_HALF && p.x + p.size / 2 < BOARD_HALF, `${n}×${n}: a pit inside the keep, across`);
        assert.ok(p.y - p.size / 2 > 0 && p.y + p.size / 2 < GRID_TOP, `${n}×${n}: a pit inside the keep, up and down`);
        assert.ok(Math.abs(p.size - PLAQUE.pit * cell) < EPS, 'a pit is a tile’s size');
      }
      // the field: lanes and arches inside the towers, never overlapping
      L.lanes.forEach((l, i) => {
        assert.ok(l.x - l.w / 2 > -FRAME_GEOM.towerIn && l.x + l.w / 2 < FRAME_GEOM.towerIn, `${n}×${n}: lane ${i} between the towers`);
        if (i) assert.ok(L.lanes[i - 1].x + L.lanes[i - 1].w / 2 < l.x - l.w / 2, 'a hedge between two lanes');
      });
      L.arches.forEach((a, i) => {
        assert.ok(a.x - a.out > -FRAME_GEOM.towerIn && a.x + a.out < FRAME_GEOM.towerIn, `${n}×${n}: arch ${i} in the gate wall`);
        if (i) assert.ok(L.arches[i - 1].x + L.arches[i - 1].out < a.x - a.out, 'two arches never touch');
      });
      L.merlons.forEach((m, i) => i && assert.ok(L.merlons[i - 1].x + L.merlons[i - 1].w / 2 < m.x - m.w / 2, 'merlons apart'));
      // the gates' pieces and the braziers stand on their lanes, all on show
      L.gates.forEach((g, i) => assert.ok(Math.abs(g.x - laneX(i)) < 1e-6 && g.seen === 1));
      L.braziers.forEach((b, i) => assert.ok(Math.abs(b.x - laneX(i)) < 1e-6 && b.seen === 1));
      assert.equal(L.ticks.length, laneTicks().length);
      assert.equal(L.clipped, false, 'no clip at rest');
    });
  }
});

test('grow: the frame is rebuilt at the new size and eases there; new lanes slide in from behind the right tower, new pits under the walls', () => {
  setBoardSize(4);
  try {
    const sc = frameScene();
    const { frame } = sc;
    expectBoard(frame.layout, 4, 'before');
    setBoardSize(5);
    frame.grow({ type: 'grow', size: 5, from: 4 });
    assert.equal(frame.growing, true);
    let L = frame.layout;
    assert.equal(L.size, 5, 'built for the new board at once');
    assert.ok(Math.abs(L.cell - 2) < EPS, 'drawn on the old cell at the start');
    L.lanes.slice(0, 4).forEach((l, i) => assert.ok(Math.abs(l.x - cellXAt(i, 2)) < EPS, `lane ${i} where it was`));
    assert.ok(L.arches[4].x - L.arches[4].out >= FRAME_GEOM.towerIn - EPS, 'the new lane (and its arch) is behind the right tower');
    assert.equal(L.gates[4].seen, 0, 'its gate’s pieces wait until it comes out');
    assert.equal(L.braziers[4].seen, 0);
    assert.equal(L.clipped, true, 'the pits are clipped to the floor while new ones slide in');
    const newPits = L.pits.filter((_, i) => i % 5 === 4 || Math.floor(i / 5) === 4);
    for (const p of newPits) assert.ok(p.x - p.size / 2 >= BOARD_HALF + FRAME_GEOM.keep.pad - EPS || p.y - p.size / 2 >= GRID_TOP + FRAME_GEOM.keep.pad - EPS, 'a new pit starts under the walls');
    assert.ok(sc.books.some((b) => Math.abs(b.lit - GROW_DUST.n * 0.647 * (GROW_DUST.size + GROW_DUST.grow) ** 2) < 1e-9), 'the dust along the walls is booked');
    assert.equal(sc.parts.length, GROW_DUST.n);
    // half way: between the boards
    sc.step(GROW.time / 2);
    L = frame.layout;
    assert.ok(L.cell < 2 && L.cell > 1.6, `half way: the cell ${L.cell.toFixed(3)}`);
    assert.ok(L.lanes[4].x < cellXAt(4, 2) && L.lanes[4].x > cellXAt(4, 1.6), 'the new lane on its way in');
    // the end: just as a 5×5 frame built from scratch
    sc.step(GROW.time / 2 + 0.05);
    assert.equal(frame.growing, false);
    L = frame.layout;
    expectBoard(L, 5, 'after');
    assert.equal(L.clipped, false);
    assert.ok(L.gates.every((g) => g.seen === 1) && L.braziers.every((b) => b.seen === 1), 'every gate and brazier on show');
    assert.deepEqual(sc.shakes, [2], 'the keep settles with a small shake');
    const fresh = onBoard(5, () => frameScene().frame.layout);
    assert.deepEqual(JSON.parse(JSON.stringify(L)), JSON.parse(JSON.stringify(fresh)), 'the same as a frame built at 5×5');
    // and on to 6×6
    setBoardSize(6);
    frame.grow({ type: 'grow', size: 6, from: 5 });
    sc.step(GROW.time + 0.05);
    expectBoard(frame.layout, 6, '6×6');
  } finally {
    setBoardSize(4);
  }
});

test('two grows at once (two levels in one step): one moment from the board drawn to the run’s size; a grow mid-moment carries on', () => {
  setBoardSize(4);
  try {
    const sc = frameScene();
    setBoardSize(6); // the run has grown twice before its events are drawn
    sc.frame.grow({ type: 'grow', size: 5, from: 4 });
    sc.frame.grow({ type: 'grow', size: 6, from: 5 });
    let L = sc.frame.layout;
    assert.ok(Math.abs(L.cell - 2) < EPS, 'it starts from the 4×4 board on screen');
    L.lanes.slice(0, 4).forEach((l, i) => assert.ok(Math.abs(l.x - cellXAt(i, 2)) < EPS));
    assert.equal(sc.parts.length, GROW_DUST.n, 'one puff of dust');
    sc.step(GROW.time + 0.05);
    expectBoard(sc.frame.layout, 6, 'then 6×6');
    // a grow while one plays: from the cell drawn now, with no jump
    setBoardSize(4);
    const b = frameScene();
    setBoardSize(5);
    b.frame.grow({ type: 'grow', size: 5, from: 4 });
    b.step(GROW.time / 2);
    const before = b.frame.layout;
    setBoardSize(6);
    b.frame.grow({ type: 'grow', size: 6, from: 5 });
    L = b.frame.layout;
    assert.ok(Math.abs(L.cell - before.cell) < EPS, 'the same cell as a moment ago');
    before.lanes.slice(0, 4).forEach((l, i) => assert.ok(Math.abs(L.lanes[i].x - l.x) < 0.06, `lane ${i} stays put`));
    b.step(GROW.time + 0.05);
    expectBoard(b.frame.layout, 6, 'and ends at 6×6');
  } finally {
    setBoardSize(4);
  }
});

test('grow under Reduce motion: the frame is at its new size at once (the stage cross-fades), with no dust', () => {
  setBoardSize(4);
  try {
    const sc = frameScene({ reduced: true });
    setBoardSize(6);
    sc.frame.grow({ type: 'grow', size: 6, from: 4 });
    assert.equal(sc.frame.growing, false);
    expectBoard(sc.frame.layout, 6, 'at once');
    assert.equal(sc.parts.length, 0, 'no dust');
    assert.equal(sc.shakes.length, 0);
  } finally {
    setBoardSize(4);
  }
});

test('a board of another size seen without a grow event (a restored run, a new run) is rebuilt at once', () => {
  setBoardSize(4);
  try {
    const sc = frameScene();
    setBoardSize(6);
    sc.step();
    expectBoard(sc.frame.layout, 6, 'restored at 6×6');
    assert.equal(sc.frame.growing, false, 'no grow moment');
    setBoardSize(4);
    sc.step();
    expectBoard(sc.frame.layout, 4, 'a new run');
    assert.equal(sc.parts.length, 0);
  } finally {
    setBoardSize(4);
  }
});

test('the braziers count the foes of every lane of the board, 4, 5 or 6', () => {
  for (const n of SIZES) {
    onBoard(n, () => {
      const foes = Array.from({ length: n }, (_, l) => ({ lane: l })).concat([{ lane: n - 1 }, { lane: 0, dead: true }]);
      const per = perLaneOf(foes);
      assert.equal(per.length, n);
      assert.equal(per[n - 1], 2, 'the last lane counts too');
      assert.equal(per[0], 1, 'a dead foe does not');
    });
  }
});

// --- the tiles --------------------------------------------------------------------------------------

/** A board-scene with two tiles on a 4×4 board, then grown to `to` (the sim's tiles keep their columns and rows). */
function grownTiles(to, { reduced = false } = {}) {
  setBoardSize(4);
  const s = scene({ reduced });
  const a = s.add(1, 5, 3, 3, { element: 'fire' });
  const b = s.add(2, 3, 0, 0);
  s.step(0.4);
  const at = (id) => ({ x: s.blocks.viewOf(id).c.position.x, y: s.blocks.viewOf(id).c.position.y }); // (a Pixi point's x and y are getters)
  const before = { a: at(1), b: at(2) };
  setBoardSize(to);
  for (const t of [a, b]) {
    t.x = cellX(t.col);
    t.y = cellY(t.row);
  }
  s.blocks.onEvent({ type: 'grow', size: to, from: 4 });
  return { s, a, b, before };
}

test('grow: every tile eases from its old place and size to its new one over GROW.time, on the keep’s eased cell', () => {
  try {
    const { s, before } = grownTiles(6);
    s.step();
    const v = s.blocks.viewOf(1);
    assert.equal(s.blocks.growing, true);
    assert.ok(Math.abs(v.c.position.x - before.a.x) < 0.5 && Math.abs(v.c.position.y - before.a.y) < 0.5, 'it starts where it was');
    assert.ok(Math.abs(v.c.scale.x - 2 / (8 / 6)) < 0.01, 'and as big as it was (its view scaled up to the old cell)');
    const at = (id) => ({ x: 200 + cellX(s.run.tiles.find((t) => t.id === id).col) * 35, y: 700 - cellY(s.run.tiles.find((t) => t.id === id).row) * 35 });
    s.step(GROW.time / 2);
    const mid = v.c.position.x;
    assert.ok(mid < before.a.x && mid > at(1).x, 'half way between');
    s.step(GROW.time / 2 + 0.05);
    assert.equal(s.blocks.growing, false);
    for (const id of [1, 2]) {
      const w = s.blocks.viewOf(id);
      assert.ok(Math.abs(w.c.position.x - at(id).x) < EPS && Math.abs(w.c.position.y - at(id).y) < EPS, `tile ${id} on its new cell`);
      assert.equal(w.c.scale.x, 1);
    }
  } finally {
    setBoardSize(4);
  }
});

test('two grows at once: the tiles ease once, from the 4×4 board to the 6×6 one', () => {
  try {
    setBoardSize(4);
    const s = scene();
    const a = s.add(1, 5, 3, 3, { element: 'fire' });
    s.step(0.3);
    const x0 = s.blocks.viewOf(1).c.position.x;
    setBoardSize(6);
    a.x = cellX(a.col);
    a.y = cellY(a.row);
    s.blocks.onEvent({ type: 'grow', size: 5, from: 4 });
    s.blocks.onEvent({ type: 'grow', size: 6, from: 5 });
    s.step();
    const v = s.blocks.viewOf(1);
    assert.ok(Math.abs(v.c.position.x - x0) < 0.5, 'it starts where it was');
    assert.ok(Math.abs(v.c.scale.x - 1.5) < 0.01, 'and as big');
    s.step(GROW.time + 0.05);
    assert.ok(Math.abs(v.c.position.x - (200 + cellX(3) * 35)) < EPS && v.c.scale.x === 1, 'then on its 6×6 cell');
  } finally {
    setBoardSize(4);
  }
});

test('grow under Reduce motion: the tiles are at their new places at once', () => {
  try {
    const { s } = grownTiles(5, { reduced: true });
    s.step();
    assert.equal(s.blocks.growing, false);
    const v = s.blocks.viewOf(1);
    assert.ok(Math.abs(v.c.position.x - (200 + cellX(3) * 35)) < EPS);
    assert.equal(v.c.scale.x, 1);
  } finally {
    setBoardSize(4);
  }
});

test('on a bigger board every bit a block throws is sized for its smaller cell, and books its smaller light', () => {
  const drop = (n) =>
    onBoard(n, () => {
      const s = scene();
      s.run.grid.moves = 1;
      s.step();
      s.add(5, 1, 0, 0, {}, { bornAt: 1 });
      s.run.grid.moves = 1;
      s.step(0.3);
      return { book: s.books[0]?.lit, size: s.parts[0]?.o.size };
    });
  const four = drop(4);
  const six = drop(6);
  const k = 8 / 6 / DESIGN_CELL;
  assert.ok(four.book > 0 && four.size > 0, 'a new block drops in with its sand puffs (booked)');
  assert.ok(Math.abs(six.size - four.size * k) < EPS, 'a puff is sized for the cell');
  assert.ok(Math.abs(six.book - four.book * k * k) < EPS, 'and books its smaller light');
});

test('the keep card’s highlight: a gold outline and pointer on the merged pet’s tile, booked as it fades in, gone when the card closes', () => {
  const s = scene();
  s.add(7, 8, 2, 1, { element: 'fire', fusion: 'ice', buffs: {} });
  s.add(8, 3, 0, 0);
  s.step(0.3);
  const booked = s.books.length;
  s.blocks.highlight(7);
  s.step();
  let h = s.blocks.highlighted;
  assert.equal(h.id, 7);
  assert.equal(h.visible, true);
  assert.equal(s.books.length, booked + 1, 'it books its outline and pointer');
  assert.ok(Math.abs(s.books.at(-1).lit - HIGHLIGHT.lit * GRID.cell * GRID.cell) < EPS && s.books.at(-1).life === HIGHLIGHT.fade);
  const v = s.blocks.viewOf(7);
  assert.equal(h.x, v.c.position.x, 'on its tile');
  assert.equal(h.y, v.c.position.y);
  assert.ok(h.pointerY < -(PLAQUE.pit / 2) * s.cell, 'its pointer over the tile');
  s.step(HIGHLIGHT.fade + 0.05);
  h = s.blocks.highlighted;
  assert.equal(h.k, 1, 'faded in');
  assert.ok(h.glow > 0 && h.glow <= 0.22, 'a soft glow under the flash thresholds (TILE_GLOW.glow)');
  assert.ok(v.lift > PLAQUE.lift * 0.9, 'its plaque lifts as a picked one does');
  assert.equal(s.books.length, booked + 1, 'booked once');
  // it breathes in position only, and holds still under Reduce motion
  const rings = new Set();
  for (let i = 0; i < 40; i++) {
    s.step();
    rings.add(s.blocks.highlighted.ring.toFixed(4));
  }
  assert.ok(rings.size > 3, 'its outline breathes');
  s.stage.reduced = true;
  const still = new Set();
  for (let i = 0; i < 20; i++) {
    s.step();
    still.add(`${s.blocks.highlighted.ring}|${s.blocks.highlighted.pointerY}`);
  }
  assert.equal(still.size, 1, 'still under Reduce motion');
  s.stage.reduced = false;
  // the card closes
  s.blocks.highlight(null);
  s.step(HIGHLIGHT.fade + 0.05);
  h = s.blocks.highlighted;
  assert.equal(h.visible, false);
  assert.equal(h.id, null);
  assert.ok(v.lift < 0.005, 'the plaque settles');
});

test('a highlight moving to another tile fades out on the first, then books and fades in on the second', () => {
  const s = scene();
  s.add(7, 8, 2, 1, { element: 'fire', fusion: 'ice', buffs: {} });
  s.add(9, 8, 0, 3, { element: 'earth', fusion: 'metal', buffs: {} });
  s.step(0.3);
  s.blocks.highlight(7);
  s.step(HIGHLIGHT.fade + 0.05);
  const on7 = s.blocks.highlighted;
  const booked = s.books.length;
  s.blocks.highlight(9);
  s.step(HIGHLIGHT.fade / 2);
  let h = s.blocks.highlighted;
  assert.ok(h.k < 1 && h.x === on7.x && h.y === on7.y, 'still on the first tile, fading out');
  s.step(HIGHLIGHT.fade + 0.05);
  h = s.blocks.highlighted;
  const v9 = s.blocks.viewOf(9);
  assert.ok(h.visible && h.x === v9.c.position.x && h.y === v9.c.position.y, 'then on the second');
  assert.equal(s.books.length, booked + 1, 'booked again for the second');
});

test('the highlight waits for room in the light budget, and shows nothing for a tile that is not on the board', () => {
  const s = scene({ grant: false });
  s.add(7, 8, 2, 1, { element: 'fire', fusion: 'ice', buffs: {} });
  s.step(0.3);
  s.blocks.highlight(7);
  s.step(0.2);
  assert.equal(s.blocks.highlighted.visible, false, 'refused: it waits');
  s.fx.grant = true;
  s.step();
  assert.equal(s.blocks.highlighted.visible, true, 'then shows');
  s.blocks.highlight(-2); // a mock choice's tile
  s.step(HIGHLIGHT.fade + 0.05);
  assert.equal(s.blocks.highlighted.visible, false);
});

// --- foes, pets and skills ----------------------------------------------------------------------------

test('foes are drawn at their lane’s fit, so they never crowd the narrower lanes; a crowd fans out within its lane', () => {
  const floor = FOE_SIZE_FLOOR * 2.5;
  assert.equal(foeDrawSize(ENEMY_TYPES.pixie), floor);
  for (const n of [5, 6]) {
    onBoard(n, () => {
      const fit = laneFit();
      for (const d of Object.values(ENEMY_TYPES)) {
        assert.ok(Math.abs(foeDrawSize(d) - onBoard(4, () => foeDrawSize(d)) * fit) < EPS, `${n}×${n}: ${d.name ?? 'a foe'} scaled by the lane`);
        if (!d.boss) assert.ok(foeDrawSize(d) <= GRID.cell + EPS, `${n}×${n}: a foe fits its lane’s spacing (${foeDrawSize(d).toFixed(2)} ≤ ${GRID.cell.toFixed(2)})`);
      }
      const crowd = [0, 1, 2].map((i) => ({ id: i, x: laneX(1), y: 12 }));
      const lay = fanLayout(crowd);
      const spread = Math.max(...[...lay.values()].map((p) => Math.abs(p.dx)));
      assert.ok(spread + floor * fit * 0.5 < GRID.cell, `${n}×${n}: the fan stays in its lane`);
    });
  }
});

test('a summoned pet is sized as the foes are on the field, and as its tile’s creature at home', () => {
  assert.equal(fieldCell(), DESIGN_CELL);
  assert.equal(homeScale(), HOP.tile);
  for (const n of [5, 6]) {
    onBoard(n, () => {
      assert.ok(Math.abs(fieldCell() - DESIGN_CELL * laneFit()) < EPS, `${n}×${n}: its field size follows the lane, as a boss’s does`);
      assert.ok(Math.abs(homeScale() * fieldCell() - HOP.tile * GRID.cell) < EPS, `${n}×${n}: at home it is as big as on a tile`);
    });
  }
});

test('the skills’ lane pieces follow the board: a sandstorm’s columns and a glacier’s blocks at 6 lanes', () => {
  onBoard(6, () => {
    assert.ok(Math.abs(laneHalf() - GRID.cell * 0.48) < EPS);
    const storm = zoneArea({ r: Infinity, lanes: [4, 5] });
    assert.ok(Math.abs(storm.cx - (laneX(4) + laneX(5)) / 2) < EPS);
    assert.ok(storm.cx + storm.hx < FRAME_GEOM.towerIn, 'inside the field');
    assert.ok(wallLit({ lanes: [0, 1] }) < onBoard(4, () => wallLit({ lanes: [0, 1] })), 'a narrower block books less');
  });
  assert.equal(FIELD.lanes, 4);
});

/** Foes on a stand-in stage: one foe with `resist`; `step` syncs it; fx records what it books and rings. */
function foeScene({ resist = { fire: 0.5 }, reduced = false } = {}) {
  const U = 30;
  const stage = { reduced, layers: { enemies: new Container() }, view: { U, ox: 300, oy: 900, top: 0 }, sx: (x) => 300 + x * U, sy: (y) => 900 - y * U };
  const fx = {
    grant: true,
    alls: [],
    rings: [],
    burst() {},
    particle() {},
    number() {},
    flashAll(lit, life) {
      this.alls.push({ lit, life });
      return this.grant;
    },
    ring(x, y, color) {
      this.rings.push({ x, y, color });
    },
  };
  const named = (el) => Object.assign(tex(64, 64), { el });
  const tx = { enemyTex: () => tex(128, 128), resistTex: named, shadowTex: () => tex(64, 32), shieldTex: () => tex(64, 64), softDot: () => tex(64, 64), statusTex: () => tex(64, 64), hasGenerated: () => false };
  const foes = createFoes(stage, fx, { tx });
  const e = { id: 1, type: 'pixie', def: ENEMY_TYPES.pixie, x: laneX(1), y: 12, lane: 1, hp: 50, maxHp: 100, boss: false, resist, burn: { stacks: 0 }, poison: { stacks: 0 }, dot: { burn: 0, poison: 0 }, chillT: 0, freezeT: 0, stunT: 0, rootT: 0, lootT: 0, flash: 0, dirX: 0, dirY: -1 };
  const step = (seconds = DT) => {
    for (let i = 0; i < Math.max(1, Math.round(seconds / DT)); i++) foes.sync([e], DT);
  };
  step();
  return { foes, fx, e, step, view: () => foes.viewOf(1), stage };
}

test('a foe that resists wears a shield per element (the strongest first, two at most) at its health bar’s left end', () => {
  assert.deepEqual(resistMarks({}), []);
  assert.deepEqual(resistMarks({ resist: null }), []);
  assert.deepEqual(resistMarks({ resist: { fire: 0.3, ice: 0.5, wind: 0.1, nope: 1, earth: 0 } }), ['ice', 'fire'], 'by share, known elements only, two at most');
  const sc = foeScene({ resist: { nature: 0.4, fire: 0.5 } });
  const v = sc.view();
  const shown = v.resists.filter((s) => s.visible);
  assert.deepEqual(shown.map((s) => s.texture.el), ['fire', 'nature']);
  const barLeft = v.barX - v.barW / 2;
  assert.ok(shown[0].position.x < barLeft + shown[0].height && shown[0].position.x > barLeft - shown[0].height, 'the strongest at the bar’s end');
  assert.ok(shown[1].position.x < shown[0].position.x - shown[0].height * 0.5, 'the next further out');
  for (const s of shown) {
    assert.equal(s.position.y, v.barBg.position.y, 'level with the bar');
    assert.ok(s.height >= RESIST.minPx - EPS, 'never under its px floor');
  }
  // its resistances go: so do its shields
  sc.e.resist = null;
  sc.step();
  assert.equal(v.resists.filter((s) => s.visible).length, 0);
});

test('a resisted hit blinks its shield: a booked pop with a ring of its colour, at most a few a second over the field, none under Reduce motion', () => {
  const sc = foeScene({ resist: { fire: 0.5 } });
  const v = sc.view();
  const h0 = v.resists[0].scale.x;
  sc.foes.onEvent({ type: 'resisted', id: 1, x: sc.e.x, y: sc.e.y, element: 'fire' });
  assert.equal(sc.fx.alls.length, 1, 'the pop books its light');
  assert.equal(sc.fx.rings.length, 1, 'a ring of its colour (fx.ring books its own)');
  sc.step(RESIST.blink / 2);
  assert.ok(v.resists[0].scale.x > h0 * 1.2, 'it pops');
  sc.step(RESIST.blink);
  assert.ok(Math.abs(v.resists[0].scale.x - h0) < 1e-9, 'and settles');
  // another element, or another foe: nothing
  sc.foes.onEvent({ type: 'resisted', id: 1, element: 'ice' });
  sc.foes.onEvent({ type: 'resisted', id: 99, element: 'fire' });
  assert.equal(sc.fx.alls.length, 1);
  // the field's gate: RESIST.perSecond a second
  const gate = createBlinkGate(3);
  assert.deepEqual([0, 0.1, 0.2, 0.3, 0.9, 1.05].map((t) => gate.take(t)), [true, true, true, false, false, true]);
  // refused by the light budget: no blink
  const busy = foeScene({ resist: { fire: 0.5 } });
  busy.fx.grant = false;
  busy.foes.onEvent({ type: 'resisted', id: 1, element: 'fire' });
  busy.step(RESIST.blink / 2);
  assert.ok(Math.abs(busy.view().resists[0].scale.x - h0) < 1e-9, 'no room, no pop');
  assert.equal(busy.fx.rings.length, 0);
  // Reduce motion: the shield holds still
  const calm = foeScene({ resist: { fire: 0.5 }, reduced: true });
  calm.foes.onEvent({ type: 'resisted', id: 1, element: 'fire' });
  calm.step(RESIST.blink / 2);
  assert.equal(calm.fx.alls.length, 0);
  assert.ok(Math.abs(calm.view().resists[0].scale.x - h0) < 1e-9);
});

test('on a 6×6 board a foe’s health bar is as wide as the foe is drawn', () => {
  const four = foeScene().view().barW;
  const six = onBoard(6, () => foeScene().view().barW);
  assert.ok(Math.abs(six - four * (5 / 6)) < 1e-9);
});
