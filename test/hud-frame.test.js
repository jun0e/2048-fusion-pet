import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meterState, keepGridCells, priceStep, pageBanner, bossHealth } from '../src/ui/hud.js';
import {
  BRAZIER_HOLD,
  CHAPTER_SKINS,
  FRAME_ASSETS,
  FRAME_GEOM,
  RAIL_PX,
  brazierState,
  chapterKeyFor,
  deckRow,
  decorSpots,
  dueByLane,
  hedgeStrips,
  holdBrazier,
  laneTicks,
  laneTones,
  litTicks,
  nextDieAt,
  previewChips,
  skinFor,
} from '../src/art/frame-kit.js';
import { fitU, RAIL_MIN, WORLD } from '../src/render/stage.js';
import { cardWidth, railLayout } from '../src/kv/namecards.js';
import { hasDrawnFallback } from '../src/render/frame-art.js';
import { createRun, swipeCostFor } from '../src/sim/run.js';
import { CHAPTERS, generateWave } from '../src/sim/enemies.js';
import { createRng } from '../src/sim/rng.js';
import { GRID, PHYSICS, laneX } from '../src/config.js';

// CIE L* of a #rrggbb colour (the proposal's value rules are in L*)
function lstar(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const y = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

test('the lintel meter: foes fill down, the boss bar, a hatched wait before the wave', () => {
  assert.deepEqual(meterState({ phase: 'wave', left: 5, total: 20 }).fill, 0.25);
  assert.equal(meterState({ phase: 'wave', left: 5, total: 20 }).label, '5 left');
  assert.equal(meterState({ phase: 'wave', left: 1, total: 4 }).say, '1 foe left');
  const boss = meterState({ phase: 'wave', left: 7, total: 9, boss: 'elfRuler', bossHp: 0.6 });
  assert.equal(boss.mode, 'boss');
  assert.equal(boss.fill, 0.6);
  assert.match(boss.say, /Hive Queen at 60% health, 7 foes left/);
  // the boss is down (no health given): back to the foes left
  assert.equal(meterState({ phase: 'wave', left: 4, total: 9, boss: 'kiteNinja', bossHp: null }).mode, 'foes');
  assert.deepEqual(meterState({ phase: 'prep', timer: 11.2, left: 6 }), { mode: 'incoming', fill: 1, label: 'In 12s', say: 'First wave in 12 seconds' });
  assert.equal(meterState({ phase: 'prep', holding: true }).label, 'Ready?', 'the held opening shows no frozen number');
  assert.equal(meterState({ phase: 'break', timer: 3, boss: 'elfRuler' }).say, 'Boss in 3 seconds');
  assert.equal(meterState({ phase: 'over' }).mode, 'over');
  assert.equal(meterState({ phase: 'wave', left: 3, total: 0 }).fill, 0, 'no total: an empty meter, not NaN');
});

test('the keep grid lights one cell per block alive, from the bottom row up', () => {
  assert.equal(keepGridCells(0).filter(Boolean).length, 0);
  const five = keepGridCells(5);
  assert.deepEqual(five.map((on, i) => (on ? i : -1)).filter((i) => i >= 0), [8, 12, 13, 14, 15]);
  assert.equal(keepGridCells(16).every(Boolean), true);
  assert.equal(keepGridCells(40).filter(Boolean).length, 16, 'never more than the board');
  assert.equal(keepGridCells(-2).filter(Boolean).length, 0);
});

test('the swipe price tick counts down to the next step, as the run prices it', () => {
  for (const swipes of [0, 1, 11, 12, 13, 23, 24, 100]) assert.equal(priceStep(swipes).cost, swipeCostFor(swipes), `cost after ${swipes}`);
  assert.deepEqual(priceStep(0), { cost: 5, next: 6, left: 12, share: 0 });
  assert.equal(priceStep(11).left, 1);
  assert.equal(priceStep(12).left, 12);
  assert.ok(priceStep(6).share > 0.49 && priceStep(6).share < 0.51);
});

test('a banner that does not fit the ribbon turns pages, every page fits, no word is lost', () => {
  const measure = (text, part) => text.length * (part === 'title' ? 9 : 7);
  assert.deepEqual(pageBanner('Wave 3', 'Eternal Forest · 9 foes', 300, measure), [{ title: 'Wave 3', sub: 'Eternal Forest · 9 foes' }]);
  const sub = 'No swipe can move a block until one is destroyed or boss x2s make a pair.';
  const pages = pageBanner('Board locked!', sub, 200, measure);
  assert.equal(pages[0].title, 'Board locked!');
  assert.equal(pages[0].sub, '');
  for (const p of pages.slice(1)) assert.ok(measure(p.sub, 'sub') <= 200, `"${p.sub}" fits`);
  assert.equal(
    pages
      .slice(1)
      .map((p) => p.sub)
      .join(' '),
    sub,
  );
  assert.deepEqual(pageBanner('x4 speed unlocked', '', 50, measure), [{ title: 'x4 speed unlocked', sub: '' }], 'no line: one page');
});

test('the boss health comes from the boss that is alive', () => {
  assert.equal(bossHealth([{ boss: false, hp: 5, maxHp: 5 }]), null);
  assert.equal(bossHealth([{ boss: true, hp: 30, maxHp: 120, dead: false }, { boss: false, hp: 1, maxHp: 1 }]), 0.25);
  assert.equal(bossHealth([{ boss: true, hp: 0, maxHp: 120, dead: true }]), null);
  assert.equal(bossHealth(undefined), null);
});

test('chapter skins: every key and name finds its skin, with every role the frame draws', () => {
  for (const c of CHAPTERS) {
    assert.equal(chapterKeyFor(c.name), c.key);
    assert.equal(chapterKeyFor(c.key), c.key);
    assert.equal(chapterKeyFor(c), c.key);
    assert.equal(skinFor(c.key), CHAPTER_SKINS[c.key]);
  }
  assert.equal(chapterKeyFor('Nowhere'), 'forest');
  assert.equal(skinFor('nope'), CHAPTER_SKINS.forest);
  const hex = /^#[0-9a-f]{6}$/i;
  for (const [key, s] of Object.entries(CHAPTER_SKINS)) {
    for (const role of ['trim', 'hedge', 'lane', 'cobble', 'accent', 'floor', 'pit', 'opening', 'iron', 'banner', 'gold', 'ridgeTone']) assert.match(s[role], hex, `${key}.${role}`);
    for (const role of ['stone', 'flame', 'sky', 'slate']) for (const c of s[role]) assert.match(c, hex, `${key}.${role}`);
    // the generated pieces it names are real FRAME_ASSETS ids (each has a drawn fallback in src/render/frame-art.js)
    for (const id of [s.backdrop, s.ridge, ...s.decor]) assert.ok(FRAME_ASSETS[id], `${key}: ${id}`);
  }
});

test('every generated frame sprite has a drawn stand-in (a backdrop falls back to the sky gradient)', () => {
  for (const [id, a] of Object.entries(FRAME_ASSETS)) {
    if (a.kind === 'backdrop') continue;
    assert.ok(hasDrawnFallback(id), `${id} is drawn in code until the pipeline makes it`);
  }
});

test('the value plan: light lanes with a calm centre, dark hedges and keep floor (L*)', () => {
  for (const [key, s] of Object.entries(CHAPTER_SKINS)) {
    const t = laneTones(s);
    const lane = lstar(t.base);
    assert.ok(lane >= 78 && lane <= 86, `${key} lane L* ${lane.toFixed(1)}`);
    for (const p of [t.patchLight, t.patchDark]) assert.ok(Math.abs(lstar(p) - lane) <= 4, `${key} calm patch within 4 L*: ${lstar(p).toFixed(1)} vs ${lane.toFixed(1)}`);
    assert.ok(lstar(s.hedge) <= 40, `${key} hedge dark`);
    assert.ok(Math.abs(lstar(s.floor) - 27) <= 2, `${key} keep floor L* ≈ 27`);
    // cream text on the HUD's stone: at least 4.5:1
    const lum = (c) => ((lstar(c) + 16) / 116) ** 3;
    assert.ok((lum('#fffaf2') + 0.05) / (lum(s.slate[0]) + 0.05) >= 4.5, `${key} cream on stone`);
  }
});

test('gate chips: the next wave per lane, its most common foe and how many come', () => {
  const wave = {
    boss: 'elfRuler',
    spawns: [
      { type: 'pixie', lane: 0 },
      { type: 'leafSprite', lane: 0 },
      { type: 'leafSprite', lane: 0 },
      { type: 'elfRuler', lane: 2 },
      { type: 'pixie', lane: 2 },
    ],
  };
  assert.deepEqual(previewChips(wave), [
    { lane: 0, type: 'leafSprite', count: 3, boss: false },
    { lane: 2, type: 'elfRuler', count: 1, boss: true },
  ]);
  assert.deepEqual(previewChips({ spawns: [] }), []);
  assert.deepEqual(previewChips(null), []);
  // a real wave: one chip per attacked lane, and the counts add up to the wave
  const real = generateWave(7, createRng(42));
  const chips = previewChips(real);
  assert.deepEqual(
    chips.map((c) => c.lane),
    [...new Set(real.spawns.map((s) => s.lane))].sort((a, b) => a - b),
  );
  assert.equal(
    chips.reduce((n, c) => n + c.count + (c.boss ? 1 : 0), 0),
    real.count,
  );
});

test('braziers: cold, warning (foes coming this way), pressure (a crowd, or the boss)', () => {
  const wave = { phase: 'wave', lanes: [0, 2], perLane: [0, 1, 3, 0], bossLane: null };
  assert.deepEqual([0, 1, 2, 3].map((l) => brazierState(l, wave)), ['cold', 'warning', 'pressure', 'cold']);
  assert.equal(brazierState(1, { ...wave, bossLane: 1 }), 'pressure', 'the boss lane smokes');
  const brk = { phase: 'break', lanes: [1, 3], perLane: [0, 0, 0, 0] };
  assert.deepEqual([0, 1, 2, 3].map((l) => brazierState(l, brk)), ['cold', 'warning', 'cold', 'warning']);
  assert.equal(brazierState(0, { phase: 'over', perLane: [9] }), 'cold');
  assert.equal(brazierState(0, null), 'cold');
});

test('braziers: a lane with foes still due out of its gate stays lit, from the first second of its wave', () => {
  // the wave has just started: nobody is out yet, every lane of the wave is still due
  const start = { phase: 'wave', lanes: [0, 2], perLane: [0, 0, 0, 0], due: [3, 0, 2, 0] };
  assert.deepEqual([0, 1, 2, 3].map((l) => brazierState(l, start)), ['warning', 'cold', 'warning', 'cold']);
  // lane 0's first foe fell and its next one has not spawned yet: still lit
  assert.equal(brazierState(0, { ...start, perLane: [0, 0, 1, 0], due: [2, 0, 1, 0] }), 'warning');
  // a crowd out and more due: smoke
  assert.equal(brazierState(2, { ...start, perLane: [0, 0, 3, 0], due: [0, 0, 1, 0] }), 'pressure');
  // nothing alive and nothing due: cold (the hold keeps it lit a moment longer, below)
  assert.equal(brazierState(0, { ...start, perLane: [0, 0, 0, 0], due: [0, 0, 0, 0] }), 'cold');
  // due spawns only count during a wave
  assert.equal(brazierState(1, { phase: 'break', lanes: [], perLane: [0, 0, 0, 0], due: [0, 4, 0, 0] }), 'cold');
});

test('dueByLane: the spawns the run has not sent yet, by lane, all through a real wave', () => {
  const run = createRun({ seed: 7 });
  assert.deepEqual(dueByLane(run), [0, 0, 0, 0], 'before the wave: nothing is due yet');
  run.nextWave();
  run.step();
  const spawns = run.wave.spawns;
  let checked = 0;
  for (let i = 0; i < 60 * 40 && run.phase === 'wave'; i++) {
    const sent = run.wave.spawns.length - (run.left - run.defense.aliveCount);
    const want = [0, 0, 0, 0];
    for (const sp of spawns.slice(sent)) want[sp.lane] += 1;
    assert.deepEqual(dueByLane(run), want);
    // a lane the wave still sends foes down never reads cold
    const alive = [0, 0, 0, 0];
    for (const e of run.enemies) if (!e.dead && !e.gone) alive[e.lane] += 1;
    for (let l = 0; l < 4; l++) if (want[l] > 0 || alive[l] > 0) assert.notEqual(brazierState(l, { phase: 'wave', lanes: run.wave.lanes, perLane: alive, due: dueByLane(run), bossLane: run.wave.bossLane }), 'cold', `lane ${l} at ${i}`);
    checked += want.reduce((a, b) => a + b, 0) > 0 ? 1 : 0;
    run.step();
  }
  assert.ok(checked > 10, 'the wave was checked while foes were still due');
  // a fake run: the last `left − alive` spawns are due
  const fake = { phase: 'wave', wave: { spawns: [{ lane: 0 }, { lane: 1 }, { lane: 1 }, { lane: 3 }] }, left: 3, defense: { aliveCount: 1 } };
  assert.deepEqual(dueByLane(fake), [0, 1, 0, 1]);
  assert.deepEqual(dueByLane({ ...fake, phase: 'break' }), [0, 0, 0, 0]);
  assert.deepEqual(dueByLane(null), [0, 0, 0, 0]);
});

test('a brazier holds its level for 1.5 s after its lane calms down, and rises at once', () => {
  const dt = PHYSICS.dt;
  let shown = holdBrazier(null, 'warning', dt);
  assert.equal(shown.st, 'warning');
  // the lane's last foe fell: still lit for BRAZIER_HOLD seconds, then cold
  let t = 0;
  while (t < BRAZIER_HOLD - 0.05) {
    shown = holdBrazier(shown, 'cold', dt);
    t += dt;
    assert.equal(shown.st, 'warning', `held at ${t.toFixed(2)} s`);
  }
  for (let i = 0; i < 10; i++) shown = holdBrazier(shown, 'cold', dt);
  assert.equal(shown.st, 'cold', 'cold after the hold');
  // a foe spawns: lit at once; a crowd: smoke at once
  shown = holdBrazier(shown, 'warning', dt);
  assert.equal(shown.st, 'warning');
  shown = holdBrazier(shown, 'pressure', dt);
  assert.equal(shown.st, 'pressure');
  // a kill and a spawn a moment apart never make it blink
  for (const st of ['warning', 'cold', 'cold', 'warning', 'cold', 'warning']) {
    shown = holdBrazier(shown, st, 0.2);
    assert.notEqual(shown.st, 'cold');
  }
  // the crowd thins: the smoke stays a moment, then the plain flame
  shown = holdBrazier({ st: 'pressure', hold: BRAZIER_HOLD }, 'warning', 1);
  assert.equal(shown.st, 'pressure');
  shown = holdBrazier(shown, 'warning', 0.6);
  assert.equal(shown.st, 'warning');
});

test('lane ticks: one per cell up the field; a range lights the ticks it covers', () => {
  assert.deepEqual(laneTicks(), [10, 12, 14, 16]);
  // a lance from the top row (y 7) reaching 4: the lane's first tick, in its own lane
  assert.deepEqual(litTicks({ x: laneX(1), y: 7, shoot: { reach: 4, lanes: 0 } }), [{ lane: 1, y: 10 }]);
  // three lanes wide, reaching the whole field
  const wide = litTicks({ x: laneX(0), y: 1, shoot: { reach: 20, lanes: 1 } });
  assert.deepEqual([...new Set(wide.map((t) => t.lane))], [0, 1]);
  assert.equal(wide.length, 8);
  // a circle around the block
  assert.deepEqual(litTicks({ x: laneX(2), y: 7, shoot: { radius: 3.2 } }), [{ lane: 2, y: 10 }]);
  assert.deepEqual(litTicks({ x: 0, y: 1, shoot: { reach: 2, lanes: 0 } }), [], 'a short reach stays on the board');
  assert.deepEqual(litTicks(null), []);
});

test('the deck slot names the block that brings the next die', () => {
  assert.equal(nextDieAt(0), 64);
  assert.equal(nextDieAt(5), 64);
  assert.equal(nextDieAt(6), 256);
  assert.equal(nextDieAt(8), 512);
  assert.equal(nextDieAt(9), null);
});

test('the deck row: the dice and the next die\'s slot are centred together, between the keep\'s corner towers', () => {
  const { die, gap, slot } = FRAME_GEOM.deck;
  const k = FRAME_GEOM.keep;
  const towerInner = GRID.size + k.pad + k.wall / 2 - k.tower / 2; // the corner towers' inner edge
  for (let n = 1; n <= 5; n++) {
    for (const withSlot of [false, true]) {
      const r = deckRow(n, withSlot);
      const dice = [...Array(n)].map((_, i) => r.x0 + i * (die + gap));
      const end = withSlot ? r.slotX + slot : dice.at(-1) + die / 2;
      assert.ok(Math.abs(dice[0] - die / 2 + end) < 1e-9, `${n} dice${withSlot ? ' and a slot' : ''}: centred`);
      assert.ok(r.left < dice[0] - die / 2 && r.right > end, 'the rail runs past both ends');
      assert.ok(-r.left <= towerInner && r.right <= towerInner, `${n} dice: the rail ${r.left.toFixed(2)}..${r.right.toFixed(2)} clears the corner towers at ±${towerInner.toFixed(2)}`);
      if (withSlot) assert.ok(Math.abs(r.slotX - (dice.at(-1) + die / 2 + gap)) < 1e-9, 'the slot follows the last die');
      else assert.equal(r.slotX, null);
    }
  }
  // the slot holds "at 256" at 12 px on the smallest phone, unscaled: Baloo 2 ExtraBold measures it at
  // 33 px (0.46 em a glyph); with 0.5 em a glyph and its 3 px stroke, inside the slot's 2 px dashes
  const U360 = fitU(360, 640, { top: 106, bottom: 54 });
  assert.ok(slot * U360 - 4 >= 6 * 12 * 0.5 + 3, `slot ${(slot * U360).toFixed(1)} px at U ${U360.toFixed(2)}`);
});

test('hedge decor is placed by hash: the same every build, on the hedges', () => {
  const strips = hedgeStrips();
  assert.equal(strips.length, 5);
  for (const key of Object.keys(CHAPTER_SKINS)) {
    const a = decorSpots(key);
    assert.deepEqual(a, decorSpots(key), 'deterministic');
    assert.ok(a.length >= 5);
    for (const d of a) {
      assert.ok(CHAPTER_SKINS[key].decor.includes(d.id));
      const st = strips[d.strip];
      assert.ok(d.x > st.x0 && d.x < st.x1, 'on its hedge');
      assert.ok(d.y > FRAME_GEOM.parapet.wall && d.y < FRAME_GEOM.gate.sill, 'between the parapet and the gates');
    }
  }
});

// the five phone sizes the proposal checks, with the HUD bands at no safe area (top: top bar,
// lintel and ribbon; bottom: the bottom bar) and with an iPhone's safe areas
const PHONES = [
  [360, 640, 106, 54],
  [375, 667, 104, 54],
  [390, 844, 120, 56],
  [390, 844, 167, 90],
  [412, 915, 120, 56],
  [430, 932, 179, 90],
];

test('the layout keeps the right tower wide enough for the rail: a card never covers lane 4', () => {
  for (const [w, h, top, bottom] of PHONES) {
    const U = fitU(w, h, { top, bottom });
    const sx = (x) => w / 2 + x * U;
    const lane4 = sx(laneX(3) + FRAME_GEOM.laneW / 2);
    const towerIn = sx(FRAME_GEOM.towerIn);
    assert.ok(w - towerIn >= RAIL_MIN - 0.01, `${w}×${h}: ${(w - towerIn).toFixed(1)} px of tower for a ${RAIL_MIN} px rail`);
    assert.ok(towerIn > lane4, `${w}×${h}: the tower starts right of lane 4`);
    assert.ok(U * (WORLD.maxY - WORLD.minY) <= h - top - bottom + 0.01, `${w}×${h}: the world fits between the bands`);
    // the rail itself: 44 px or wider, right of lane 4, four cards from the gate wall to the deck row
    const oy = top + (h - top - bottom) / 2 + ((WORLD.minY + WORLD.maxY) / 2) * U;
    const sy = (y) => oy - y * U;
    const r = railLayout({ vw: w, towerX: towerIn, keepX: sx(4.82), top: sy(FRAME_GEOM.rail.top), parapet: sy(FRAME_GEOM.rail.bottom), floor: sy(FRAME_GEOM.deck.y - FRAME_GEOM.deck.die / 2) });
    assert.ok(r.width >= 44, `${w}×${h}: cards ${r.width} px wide`);
    assert.ok(r.left >= lane4 + 2, `${w}×${h}: rail at ${r.left}, lane 4 ends at ${lane4.toFixed(1)}`);
    assert.ok(r.left + r.width <= w, `${w}×${h}: on screen`);
    assert.ok(r.top + 4 * (r.width + 14) + 3 * 6 <= sy(FRAME_GEOM.deck.y - FRAME_GEOM.deck.die / 2) + 1, `${w}×${h}: four cards fit`);
  }
});

test('fitU reaches the height limit whenever 44 px cards fit the right tower (the card width is chosen after U)', () => {
  const span = WORLD.maxY - WORLD.minY;
  for (const [w, h, top, bottom] of [...PHONES, [412, 915, 120, 56], [400, 860, 120, 56], [420, 900, 120, 56], [768, 1024, 120, 56]]) {
    const byHeight = (h - top - bottom) / span;
    const byWidth = w / (WORLD.maxX - WORLD.minX);
    const room = w / 2 - FRAME_GEOM.towerIn * Math.min(byHeight, byWidth);
    const U = fitU(w, h, { top, bottom });
    if (room >= RAIL_PX.card + 2 * RAIL_PX.margin) assert.ok(Math.abs(U - Math.min(byHeight, byWidth)) < 1e-9, `${w}×${h}: U ${U.toFixed(2)}, the height allows ${byHeight.toFixed(2)}`);
    else assert.ok(U < byHeight, `${w}×${h}: the rail binds`);
  }
  // the review's case: 412 × 915 used to stop at 35.24 for 52 px cards; now it takes the height's 37.23
  const U412 = fitU(412, 915, { top: 120, bottom: 56 });
  assert.ok(Math.abs(U412 - 739 / span) < 1e-9, `412×915: U ${U412.toFixed(2)}`);
  const towerX = 206 + FRAME_GEOM.towerIn * U412;
  const r = railLayout({ vw: 412, towerX, keepX: 206 + 4.82 * U412, top: 0, parapet: 400, floor: 600 });
  assert.ok(r.width >= RAIL_PX.card && r.width < cardWidth(412), `the cards narrow to the tower (${r.width} px)`);
  // a narrow window: the rail binds, and still leaves 44 px cards their room
  const Unarrow = fitU(300, 1000, { top: 100, bottom: 50 });
  assert.ok(300 / 2 - FRAME_GEOM.towerIn * Unarrow >= RAIL_MIN - 1e-9);
});

test('on a tablet or a desktop the rail hangs on the tower, centred on it, not out in the valley', () => {
  for (const [w, h, top, bottom] of [
    [768, 1024, 120, 56],
    [1280, 720, 120, 56],
    [1024, 1366, 120, 56],
  ]) {
    const U = fitU(w, h, { top, bottom });
    const oy = top + (h - top - bottom) / 2 + ((WORLD.minY + WORLD.maxY) / 2) * U;
    const sx = (x) => w / 2 + x * U;
    const sy = (y) => oy - y * U;
    const towerX = sx(FRAME_GEOM.towerIn);
    const towerOut = sx(FRAME_GEOM.towerIn + FRAME_GEOM.towerW);
    assert.ok(towerOut < w, `${w}×${h}: the tower ends before the screen does`);
    const r = railLayout({ vw: w, towerX, towerOut, keepX: sx(4.82), top: sy(FRAME_GEOM.rail.top), parapet: sy(FRAME_GEOM.rail.bottom), floor: sy(FRAME_GEOM.deck.y - FRAME_GEOM.deck.die / 2) });
    assert.ok(r.left >= towerX && r.left + r.width <= towerOut, `${w}×${h}: rail ${r.left}..${r.left + r.width} on the tower ${towerX.toFixed(0)}..${towerOut.toFixed(0)}`);
    const mid = r.left + r.width / 2;
    const towerMid = (towerX + towerOut) / 2;
    if (r.left - towerX > RAIL_PX.margin + 1) assert.ok(Math.abs(mid - towerMid) <= 1, `${w}×${h}: centred on the tower (${mid} vs ${towerMid.toFixed(1)})`);
    assert.ok(r.width >= RAIL_PX.card);
  }
  // a phone: the tower runs off the screen, so the rail centres between its inner edge and the screen's
  const r = railLayout({ vw: 390, towerX: 319, towerOut: 460, keepX: 330, top: 170, parapet: 450, floor: 760 });
  assert.equal(r.left, Math.round(319 + 2 + (390 - 319 - 4 - r.width) / 2));
});
