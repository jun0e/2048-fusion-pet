// The board tiles of the overhaul (reports/art/tiles/tile-spec.md): the plaque's geometry and colour
// rules (src/art/plaque.js) and the per-frame rules that draw it (src/render/blocks.js, through
// stand-in textures and a recording light budget). The v2 looks (plain stone, elemental eggs, dens
// while a pet is summoned out, pure forms, the skills' marks) are in test/tile-looks.test.js; the
// mark on a picked tile's summoned pet in test/pets-view.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUSIONS } from '../src/sim/classes.js';
import { createRun } from '../src/sim/run.js';
import { V2, cellX, cellY } from '../src/config.js';
import { INK, contrast, luminance, tone } from '../src/art/tokens.js';
import {
  BLINK,
  NUMBER_MIN_PX,
  PAWS,
  PAW_MIN_PX,
  pawReach,
  PLAQUE,
  altarParts,
  appearPose,
  badgeSpots,
  blinkGap,
  bracketOffset,
  boardRefused,
  bracketStrokes,
  denPlateColor,
  departPose,
  growthWords,
  isDen,
  meterOf,
  meterSegments,
  numberBox,
  numberEm,
  numberFit,
  plateColor,
  walkRoundRect,
} from '../src/art/plaque.js';
import { range, scene } from './helpers/board-scene.js';

const EPS = 1e-9;
const H = PLAQUE.size / 2; // the plaque's half side (cells)
const inner = H - PLAQUE.outline / 2; // inside its ink outline
/** Overlap of two boxes { x0, x1, y0, y1 } (cells). */
const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** The distance from a point to a box (0 inside it). */
const toBox = (x, y, b) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
/** Is the point (x, y) with radius r inside the plaque's rounded inner edge? */
function insidePlaque(x, y, r = 0) {
  const k = PLAQUE.r - PLAQUE.outline / 2; // the inner corner radius
  const cx = Math.max(Math.abs(x) - (inner - k), 0);
  const cy = Math.max(Math.abs(y) - (inner - k), 0);
  return Math.hypot(cx, cy) + r <= k + EPS && Math.abs(x) + r <= inner + EPS && Math.abs(y) + r <= inner + EPS;
}
const DEN_TIERS = [10, 11, 12, 13];
/** A den: a fusion pet's tile while its pet is summoned out (tile.summon); a pure one with `pure`. */
const den = (tier, element = 'fire', fusion = 'ice', pure = false) => ({ tier, cls: { element, fusion, buffs: {}, ...(pure && { pure }) }, summon: { phase: 'act', x: 0, y: 12 } });

// --- the plaque's rules ----------------------------------------------------------------------------

test('den plates: the luminance floor lifts only the two darkest fusions (Frostnova, Nightshade), and the ink numeral reads ≥ 4.5 : 1 on all 28', () => {
  const fusions = Object.entries(FUSIONS);
  assert.equal(fusions.length, 28);
  const lifted = [];
  for (const [key, f] of fusions) {
    const c = denPlateColor(f.color);
    assert.ok(luminance(c) >= PLAQUE.denFloor - EPS, `${key}: Y ${luminance(c).toFixed(3)}`);
    assert.ok(contrast(INK, c) >= 4.5, `${key}: ink ${contrast(INK, c).toFixed(2)} : 1 on ${c}`);
    if (c !== tone(f.color, 0.18)) lifted.push([key, c]);
    const [a, b] = key.split('+');
    assert.equal(plateColor({ tier: 9, cls: { element: b, fusion: a } }), c, `${key}: either parent order`);
  }
  assert.deepEqual(lifted, [['fire+ice', '#6a88ce'], ['poison+nature', '#a279c2']], 'the floor touches no other fusion (Frostnova since its deep cobalt, T34)');
});

test('the growth meter: a fusion pet fills gold toward its summon at 1024, any pet rose toward the pure form at 4096; none on plain blocks, eggs and pure forms', () => {
  const single = { element: 'fire' };
  const fusion = { element: 'fire', fusion: 'ice', buffs: {} };
  assert.equal(V2.summonTier, 10);
  assert.equal(V2.pureTier, 12);
  for (const tier of [1, 4, 9, 13]) assert.equal(meterOf(tier, {}), null, `a plain ${2 ** tier}`);
  for (const tier of [1, 2, 3]) assert.equal(meterOf(tier, single), null, `an egg ${2 ** tier}`);
  assert.equal(meterOf(12, { ...single, pure: true }), null, 'a pure form: nothing left to reach');
  assert.equal(meterOf(12, single), null);
  // a fusion pet: the last four merges before its summon (64 → 512), then toward the pure form
  [4, 5, 6, 7, 8, 9].forEach((tier) => assert.deepEqual([meterOf(tier, fusion).lit, meterOf(tier, fusion).goal], [Math.max(0, tier - 6), 'summon'], `${2 ** tier}`));
  [10, 11].forEach((tier) => assert.deepEqual([meterOf(tier, fusion).lit, meterOf(tier, fusion).goal], [tier - 8, 'pure']));
  // a single: toward the pure form all the way (lit over its last four merges: 512 → 2048)
  [4, 8, 9, 10, 11].forEach((tier) => assert.deepEqual([meterOf(tier, single).lit, meterOf(tier, single).goal], [Math.max(0, tier - 8), 'pure']));
  assert.deepEqual(meterOf(9), meterOf(9, single), 'a tier alone counts as a single pet');
  assert.notEqual(meterOf(6, fusion).color, meterOf(9, single).color, 'gold and rose');
  // the words come from the language's table once it has them; until then no growth row
  assert.equal(growthWords(2, single), null);
  const w = growthWords(9, fusion);
  assert.ok(w === null || /3/.test(w), `${w}`);
  // four equal segments, centred in the top rail, inside the plaque
  const m = meterSegments();
  const widths = m.segs.map((s) => s.x1 - s.x0);
  assert.ok(widths.every((w) => Math.abs(w - widths[0]) < EPS));
  assert.ok(Math.abs(m.segs[3].x1 - m.segs[0].x0 - PLAQUE.meter.w * PLAQUE.size) < EPS);
  assert.ok(Math.abs(m.segs[0].x0 + m.segs[3].x1) < EPS, 'centred');
  assert.ok(m.y0 - m.pad > -inner && m.y1 + m.pad < 0, 'in the top rail, inside the outline');
});

test('the numeral: never under 14 px, below the meter, inside the plaque and clear of a den’s crystal, at every phone size', () => {
  assert.deepEqual([1, 2, 3, 4].map(numberEm), [0.3875, 0.3875, 0.3125, 0.2625], 'its design size by digit count');
  const m = meterSegments();
  const crystal = altarParts().crystal;
  const SMALLEST = 47.56; // a 360 × 640 phone's cell (U 23.78)
  for (const cellPx of [SMALLEST, 51, 58.3, 66, 70, 100, 160]) {
    for (let tier = 1; tier <= 16; tier++) {
      const v = 2 ** tier;
      const fit = numberFit(tier, cellPx);
      const glyphs = numberBox(tier, { stroke: false, cellPx });
      const box = numberBox(tier, { cellPx });
      assert.ok(fit.em * cellPx >= NUMBER_MIN_PX - 1e-9, `${v} at ${cellPx} px: ${(fit.em * cellPx).toFixed(1)} px`);
      assert.ok(glyphs.y0 > m.y1, `${v} at ${cellPx} px: its glyphs clear the meter`);
      assert.ok(box.x1 - box.x0 <= PLAQUE.numberMaxW + 1e-9 && box.x0 > -inner && box.y0 > -inner, `${v} at ${cellPx} px: inside the plaque`);
      assert.ok(glyphs.y0 < -0.5 + PLAQUE.numberY && glyphs.y1 > -0.5 + PLAQUE.numberY, `${v}: its middle is at 33.5 %`);
      if (tier >= 4) assert.ok(box.y1 < crystal.y0, `${v} at ${cellPx} px: clear of a den’s crystal`);
    }
  }
  // the floor only grows what its design size would draw under 14 px, and only a 5-digit numeral is squeezed
  assert.ok(Math.abs(numberFit(12, SMALLEST).em * SMALLEST - NUMBER_MIN_PX) < 1e-9, '4096 on the smallest phone: 14 px, not 12.5');
  assert.equal(numberFit(12, SMALLEST).squeeze, 1);
  assert.ok(numberFit(14, SMALLEST).squeeze < 1, '16384 on the smallest phone: squeezed to stay inside');
  for (let tier = 1; tier <= 13; tier++) assert.equal(numberFit(tier, 70).em, numberEm(String(2 ** tier).length), `${2 ** tier} at 70 px: its design size`);
});

test('the corner brackets stay in the 0.1-cell gap between pits at any breath; Reduce motion holds them still', () => {
  const B = PLAQUE.bracket;
  const half = (B.width + B.under) / 2; // the ink under the cream
  for (let t = 0; t < 3; t += 0.01) {
    const c = PLAQUE.pit / 2 + bracketOffset(t);
    assert.ok(c - half >= PLAQUE.pit / 2 - EPS, `t ${t.toFixed(2)}: clear of its own pit`);
    assert.ok(c + half <= 1 - PLAQUE.pit / 2 + EPS, `t ${t.toFixed(2)}: clear of the next pit`);
    assert.equal(bracketOffset(t, true), B.offset);
  }
  // breathing ≤ 0.7 Hz, by position only
  assert.ok(B.hz <= 0.7 && B.breathe > 0);
  // solid: one L, its arms 0.16 each; armed: the bend and one dash at each arm's end, the arms filled exactly
  const len = (line) => line.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0);
  const solid = bracketStrokes(1, 1);
  assert.equal(solid.length, 1);
  assert.ok(Math.abs(len(solid[0]) - 2 * B.arm) < EPS);
  const dashed = bracketStrokes(1, 1, true);
  assert.equal(dashed.length, 3);
  assert.ok(Math.abs(B.arm - (1.5 * B.dash + B.gap)) < EPS, 'the dash pattern fits the arm');
  assert.ok(dashed.some((line) => line.length === 3 && line[1][0] === 0 && line[1][1] === 0), 'one dash runs round the corner');
  assert.ok(dashed.every((line) => Math.abs(len(line) - B.dash) < EPS));
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    for (const line of bracketStrokes(sx, sy)) for (const [x, y] of line) assert.ok(x * sx <= EPS && y * sy <= EPS, 'the arms run back toward the tile');
});

test('the altar and its crystal stay clear of the numeral and the badges, inside the plaque', () => {
  const a = altarParts();
  const blocks = [a.plinth, a.body, a.slab, a.crystal];
  for (const t of [...DEN_TIERS.map((tier) => den(tier)), den(12, 'fire', 'ice', true), den(13, 'metal', 'nature', true)]) {
    assert.ok(isDen(t));
    const num = numberBox(t.tier);
    for (const b of blocks) {
      assert.ok(!overlaps(b, num), `${2 ** t.tier}: an altar block clears the numeral`);
      for (const p of [
        [b.x0, b.y0],
        [b.x1, b.y1],
      ])
        assert.ok(insidePlaque(p[0], p[1]), 'inside the plaque');
    }
    for (const s of badgeSpots(t)) {
      for (const b of blocks) assert.ok(toBox(s.x, s.y, b) > s.r, `${2 ** t.tier}: the altar clears the ${s.el} badge`);
      assert.ok(!overlaps({ x0: s.x - s.r, x1: s.x + s.r, y0: s.y - s.r, y1: s.y + s.r }, num), 'the badges clear the numeral');
    }
  }
  // the parents' studs sit on the altar's body
  for (const s of a.studs) assert.ok(s.x - s.r > a.body.x0 && s.x + s.r < a.body.x1 && s.y - s.r > a.body.y0 && s.y + s.r < a.body.y1);
});

test('a den’s paw prints lead off the altar up and to the right, clear of the numeral, the badges and the altar', () => {
  const a = altarParts();
  for (const t of [...DEN_TIERS.map((tier) => den(tier)), den(12, 'fire', 'ice', true), den(13, 'fire', 'ice', true), den(14, 'fire', 'ice', true)]) {
    // the prints show from PAW_MIN_PX up, where a long numeral may be at its 14 px floor
    const num = numberBox(t.tier, { cellPx: PAW_MIN_PX });
    const spots = badgeSpots(t);
    for (const p of PAWS) {
      const reach = pawReach(p); // with its ink rim
      assert.ok(toBox(p.x, p.y, num) > reach, `${2 ** t.tier}: a print clears the numeral`);
      for (const s of spots) assert.ok(Math.hypot(p.x - s.x, p.y - s.y) > reach + s.r, 'a print clears the badges');
      for (const b of [a.plinth, a.body, a.slab, a.crystal]) assert.ok(toBox(p.x, p.y, b) > reach, 'a print clears the altar');
      assert.ok(insidePlaque(p.x, p.y, reach), 'inside the plaque');
    }
  }
  // they walk off toward the field: up (y falls) and to the right, starting by the altar
  for (let i = 1; i < PAWS.length; i++) assert.ok(PAWS[i].y < PAWS[i - 1].y && PAWS[i].x > PAWS[i - 1].x);
  assert.ok(PAWS[0].x - pawReach(PAWS[0]) < a.plinth.x1 + 0.1);
  for (const p of PAWS) assert.ok(pawReach(p) > p.r * 0.88 && pawReach(p) < p.r * 1.3);
  assert.ok(PAW_MIN_PX > 48, 'dropped on the smallest phone (a 48 px cell)');
});

test('arrivals and departures: a spawn drops in, sold lifts out, destroyed and broken drop in; all fade in place under Reduce motion', () => {
  // a spawn drops in from 0.22 cell; under Reduce motion it fades in place
  assert.ok(Math.abs(appearPose(0).dy + 0.22) < EPS && appearPose(1).dy === 0 && appearPose(0).alpha === 1);
  assert.deepEqual(appearPose(0.5, true), { dy: 0, scale: 1, alpha: appearPose(0.5, true).alpha });
  assert.ok(appearPose(0, true).alpha === 0);
  // sold lifts out, destroyed and broken drop in; only destroyed cracks; Reduce motion: in place, no chips
  assert.ok(departPose('sold', 1).dy < 0 && departPose('sold', 1).scale < 1 && departPose('sold', 1).alpha === 0);
  assert.ok(departPose('destroyed', 1).dy > 0 && departPose('destroyed', 0).cracks === 1 && departPose('destroyed', 0.5).chips);
  assert.ok(departPose('broken', 1).dy > 0 && departPose('broken', 0).cracks === 0);
  for (const reason of ['sold', 'destroyed', 'broken']) {
    const d = departPose(reason, 0.6, true);
    assert.ok(d.dy === 0 && d.scale === 1 && !d.chips && d.alpha < 1, `${reason} under Reduce motion`);
  }
});

test('a summon’s charge walks the plaque’s edge clockwise from the top centre', () => {
  const per = 8 * (H - PLAQUE.r) + 2 * Math.PI * PLAQUE.r;
  for (const f of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
    let at = [0, -H];
    let walked = 0;
    const line = (x, y) => {
      walked += Math.hypot(x - at[0], y - at[1]);
      at = [x, y];
    };
    const arc = (cx, cy, r, a0, a1) => {
      walked += r * (a1 - a0);
      at = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    };
    assert.ok(Math.abs(walkRoundRect(H, PLAQUE.r, f, line, arc) - f * per) < 1e-9);
    assert.ok(Math.abs(walked - f * per) < 1e-9, `${f}: drawn as far as asked`);
    if (f === 0.25) assert.ok(at[0] > H - 1e-9, 'a quarter in: down the right side');
    if (f === 1) assert.ok(Math.hypot(at[0], at[1] + H) < 1e-9, 'full: back at the top centre');
  }
});

test('a 16 blinks for 0.12 s every 3 to 6 s, at its own beat', () => {
  const gaps = [];
  for (let id = 1; id < 40; id++) for (let n = 0; n < 5; n++) gaps.push(blinkGap(id, n));
  assert.ok(gaps.every((g) => g >= 3 && g <= 6));
  assert.ok(new Set(gaps.map((g) => g.toFixed(2))).size > 40, 'not in step');
  assert.equal(BLINK, 0.12);
});

// --- the per-frame rules: blocks.js with stand-in textures ------------------------------------------

const U = 35; // a 70 px cell (the scene's default)

test('a picked block lifts on a longer shadow inside cream brackets; armed, they turn red and dashed and the plaque wobbles', () => {
  const s = scene();
  s.add(1, 6, 1, 1, { element: 'ice' });
  s.add(2, 5, 2, 1, { element: 'fire' });
  s.step(0.2);
  const v = s.blocks.viewOf(1);
  assert.equal(s.blocks.pick.visible, false);
  const seat0 = v.seat.position.y;
  s.blocks.select(1);
  s.step(0.5);
  assert.ok(Math.abs(v.p.position.y + PLAQUE.lift * s.cell) < 0.01, `lifted ${PLAQUE.lift} cell (${v.p.position.y.toFixed(2)} px)`);
  assert.ok(v.seat.position.y > seat0, 'its shadow falls further');
  assert.equal(s.blocks.viewOf(2).p.position.y, 0, 'the others stay seated');
  const pick = s.blocks.pick;
  assert.ok(pick.visible && pick.armed === false);
  assert.deepEqual([pick.x, pick.y], [v.c.position.x, v.c.position.y], 'round the picked block’s pit');
  const r = range(s, 2, () => s.blocks.pick.corners[2].x / s.cell);
  assert.ok(r.lo >= PLAQUE.pit / 2 + PLAQUE.bracket.offset - PLAQUE.bracket.breathe - 1e-6 && r.hi <= PLAQUE.pit / 2 + PLAQUE.bracket.offset + PLAQUE.bracket.breathe + 1e-6 && r.hi - r.lo > 0.01, 'their gap breathes');
  assert.equal(v.p.rotation, 0);
  s.blocks.arm(1, true);
  s.step();
  assert.equal(s.blocks.pick.armed, true);
  const w = range(s, 1, () => v.p.rotation);
  assert.ok(w.hi > 0.02 && w.lo < -0.02 && Math.max(w.hi, -w.lo) <= PLAQUE.wobble.amp + 1e-9, 'a ±2° wobble');
  s.blocks.arm(1, false);
  s.step();
  assert.equal(s.blocks.pick.armed, false);
  assert.equal(v.p.rotation, 0);
  s.blocks.select(null);
  s.step(0.5);
  assert.equal(s.blocks.pick.visible, false);
  assert.ok(Math.abs(v.p.position.y) < 0.01, 'seated again');
});

test('a refused swipe nudges every plaque that way and back', () => {
  const s = scene();
  s.add(1, 4, 0, 0, { element: 'wind' });
  s.add(2, 1, 3, 3);
  s.step(0.2);
  s.blocks.nudge('left');
  const x = range(s, PLAQUE.nudge.time + 0.05, () => s.blocks.viewOf(2).p.position.x);
  assert.ok(Math.abs(x.lo + PLAQUE.nudge.dist * s.cell) < 0.2, `${x.lo.toFixed(2)} px: 0.04 cell`);
  assert.equal(s.blocks.viewOf(1).p.position.x, 0, 'and back');
  s.blocks.nudge('up');
  const y = range(s, 0.1, () => s.blocks.viewOf(1).p.position.y);
  assert.ok(y.lo < -0.5, 'up the screen');
});

test('Reduce motion: no shudder, no nudge, no wobble, no drop-in (a fade); the brackets hold still', () => {
  const moving = scene();
  const still = scene({ reduced: true });
  for (const s of [moving, still]) {
    s.add(1, 5, 1, 1, { element: 'fire' });
    s.step(0.2);
    s.blocks.onEvent({ type: 'tileHit', id: 1, x: cellX(1), y: cellY(1), from: { x: cellX(1), y: cellY(1) + 2 } });
  }
  assert.ok(range(moving, 0.2, () => Math.abs(moving.blocks.viewOf(1).p.position.x)).hi > 0.3, 'a hit shudders');
  assert.equal(range(still, 0.2, () => Math.abs(still.blocks.viewOf(1).p.position.x)).hi, 0, 'not under Reduce motion');
  assert.notEqual(still.blocks.viewOf(1).body.tint, 0xffffff, 'the tint still says it');
  still.blocks.nudge('right');
  assert.equal(range(still, 0.3, () => Math.abs(still.blocks.viewOf(1).p.position.x)).hi, 0, 'no nudge');
  still.blocks.select(1);
  still.blocks.arm(1, true);
  still.step(0.5);
  assert.equal(range(still, 1, () => Math.abs(still.blocks.viewOf(1).p.rotation)).hi, 0, 'no wobble');
  const c = range(still, 2, () => still.blocks.pick.corners[0].x);
  assert.equal(c.hi, c.lo, 'the brackets hold still');
  assert.ok(Math.abs(still.blocks.viewOf(1).p.position.y + PLAQUE.lift * still.cell) < 0.01, 'the lift is kept');
  // a new block: drops in from above, or fades in place
  for (const s of [moving, still]) {
    s.run.grid.moves = 1;
    s.step();
    s.add(9, 1, 3, 3, {}, { bornAt: 1 });
    s.step(0.12);
  }
  const drop = moving.blocks.viewOf(9);
  const fade = still.blocks.viewOf(9);
  assert.ok(drop.p.position.y < 0 && drop.p.alpha === 1, 'it drops into its pit');
  assert.ok(fade.p.position.y === 0 && fade.p.alpha < 1, 'it fades in place');
  assert.ok(moving.parts.some((p) => p.o.color === 0xd9c7a3) && !still.parts.some((p) => p.o.color === 0xd9c7a3), 'sand puffs only with motion');
});

test('a hit scares a 16 (its scared face) and puts a sweat drop on a 32; a 16 blinks', () => {
  const s = scene();
  s.add(1, 4, 0, 0, { element: 'fire' });
  s.add(2, 5, 1, 0, { element: 'ice' });
  s.step(0.1);
  const a = s.blocks.viewOf(1);
  const b = s.blocks.viewOf(2);
  const base = a.creature.texture;
  for (const id of [1, 2]) s.blocks.onEvent({ type: 'tileHit', id, x: 0, y: 0, from: { x: 1, y: 1 } });
  s.step();
  assert.equal(a.creature.texture, s.faces.scared);
  assert.ok(b.sweat.visible && !a.sweat.visible, 'a 32 sweats; the 16 has its own face');
  assert.notEqual(b.creature.texture, s.faces.scared, 'a 32 keeps its own sprite');
  s.step(2);
  assert.ok(a.creature.texture !== s.faces.scared && !b.sweat.visible, 'calm again');
  // the blink: 0.12 s every 3–6 s, the 16 only
  let blinks = 0;
  let last = null;
  for (let i = 0; i < 60 * 14; i++) {
    s.step();
    const now = a.creature.texture === s.faces.blink;
    if (now && last === false) blinks += 1;
    last = now;
  }
  assert.ok(blinks >= 2 && blinks <= 5, `${blinks} blinks in 14 s`);
  assert.ok(a.creature.texture === base || a.creature.texture === s.faces.blink);
});

test('departures: sold lifts out of the pit, destroyed cracks and drops leaving rubble, broken crumbles; bits book their light', () => {
  const s = scene();
  s.add(1, 6, 0, 0, { element: 'metal' });
  s.add(2, 5, 1, 0, { element: 'poison' });
  s.add(3, 2, 2, 0);
  s.step(0.1);
  const views = [1, 2, 3].map((id) => s.blocks.viewOf(id));
  s.run.tiles.length = 0;
  s.blocks.onEvent({ type: 'remove', id: 1, tier: 6, x: cellX(0), y: cellY(0), reason: 'sold', cls: { element: 'metal' } });
  s.blocks.onEvent({ type: 'remove', id: 2, tier: 5, x: cellX(1), y: cellY(1), reason: 'destroyed', cls: { element: 'poison' } });
  s.blocks.onEvent({ type: 'remove', id: 3, tier: 2, x: cellX(2), y: cellY(0), reason: 'broken', cls: {} });
  s.step(0.15);
  assert.ok(views[0].p.position.y < 0 && views[0].p.scale.x < 1, 'sold: lifts out and shrinks');
  assert.ok(views[1].p.position.y > 0 && views[1].cracks && views[1].cracks.alpha > 0, 'destroyed: cracked, dropping');
  assert.ok(views[2].p.position.y > 0 && !views[2].cracks, 'broken: no cracks');
  assert.equal(s.parts.filter((p) => p.o.size === 0.16).length, 12, 'six chips each from the destroyed and the broken');
  assert.ok(s.books.length >= 3, 'the chips and the cracks book their light first');
  const none = scene({ grant: false });
  none.add(1, 5, 0, 0, { element: 'fire' });
  none.step(0.1);
  none.run.tiles.length = 0;
  none.blocks.onEvent({ type: 'remove', id: 1, tier: 5, x: 0, y: 0, reason: 'destroyed', cls: { element: 'fire' } });
  none.blocks.onEvent({ type: 'tileHeal', id: 1, x: 0, y: 0 });
  assert.equal(none.parts.length, 0, 'refused by the light budget: no bits');
});

test('a merge lights the meter’s new segment with a cream wipe; a boss x2 flips the numeral, or cross-fades it under Reduce motion', () => {
  for (const reduced of [false, true]) {
    const s = scene({ reduced });
    const t = s.add(1, 6, 0, 0, { element: 'fire', fusion: 'ice', buffs: {} }); // a fusion pet: 64 → 128 lights its summon meter's first segment
    s.step(0.1);
    const v = s.blocks.viewOf(1);
    const before = v.number.texture;
    t.tier = 7;
    s.blocks.onEvent({ type: 'promote', id: 1, tier: 7, by: 1, x: 0, y: 0 });
    s.step(0.05);
    if (reduced) {
      assert.ok(v.numberOld.visible && v.numberOld.texture === before && v.number.alpha < 1, 'cross-fades');
      assert.equal(v.wipe.visible, false, 'no wipe');
    } else {
      assert.ok(v.number.texture === before && Math.abs(v.number.scale.x) < Math.abs(v.number.scale.y), 'the old numeral turns away');
      assert.ok(v.wipe.visible, 'the new segment lights');
    }
    s.step(0.4);
    assert.ok(v.number.texture !== before && v.number.alpha === 1 && !v.numberOld.visible);
  }
});

test('seated, the plaque’s shadow fills only the right and bottom grooves of its pit; lifted, more of it shows under the plaque', () => {
  const s = scene();
  s.add(1, 6, 1, 1, { element: 'ice' });
  s.step(0.2);
  const v = s.blocks.viewOf(1);
  // the shadow's box and the plaque's, in cells from the pit's centre
  const shadow = () => {
    const w = v.seat.scale.x * PLAQUE.size;
    const h = v.seat.scale.y * PLAQUE.size;
    const cx = (v.seat.position.x - v.c.position.x) / s.cell;
    const cy = (v.seat.position.y - v.c.position.y) / s.cell;
    return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
  };
  const plaque = () => {
    const dy = v.p.position.y / s.cell;
    return { x0: -H, x1: H, y0: -H + dy, y1: H + dy };
  };
  const seated = shadow();
  const p0 = plaque();
  const groove = PLAQUE.pit / 2 - H; // 0.02 cell
  assert.ok(seated.x1 - p0.x1 > groove * 0.9 && seated.y1 - p0.y1 > groove * 0.5, 'dark in the right and bottom grooves');
  assert.ok(seated.x0 > p0.x0 && seated.y0 > p0.y0, 'none in the left and top grooves');
  assert.ok(seated.x1 <= PLAQUE.pit / 2 + 1e-6 && seated.y1 <= PLAQUE.pit / 2 + 1e-6, 'never over the pit’s lip');
  s.blocks.select(1);
  s.step(0.5);
  const lifted = shadow();
  const p1 = plaque();
  assert.ok(p1.y1 < p0.y1, 'the plaque is lifted');
  assert.ok(lifted.y1 - p1.y1 > seated.y1 - p0.y1 + 0.02, 'a longer strip of shadow shows under it');
  assert.ok(lifted.x1 <= PLAQUE.pit / 2 + 1e-6 && lifted.y1 <= PLAQUE.pit / 2 + 1e-6, 'still inside the pit');
});

test('a swipe that moves nothing nudges the plaques only when the board refused it: not short of coins, with a card open or once the run is over', () => {
  const run = createRun({ seed: 3, empty: true });
  run.spawnDebug(1, 0, 0);
  run.spawnDebug(2, 0, 1); // two blocks against the left wall, nothing to merge
  run.step();
  assert.equal(run.move('left'), false, 'a left swipe moves nothing');
  assert.equal(boardRefused(run), true, 'the board refused it: nudge');
  assert.equal(run.move('right'), true, 'a swipe that moves is no refusal');
  // the rule itself, on the run's state
  const at = (o) => boardRefused({ over: false, pendingChoice: null, coins: 9, swipeCost: 2, ...o });
  assert.equal(at({}), true);
  assert.equal(at({ coins: 1 }), false, 'short of coins: the coin counter says so, no nudge');
  assert.equal(at({ pendingChoice: { kind: 'die' } }), false, 'a card open: no nudge');
  assert.equal(at({ over: true }), false, 'the run is over: no nudge');
});

test('on the smallest phone a 4-digit numeral is drawn at 14 px and a 5-digit one squeezed inside its plaque', () => {
  const s = scene({ u: 23.78 }); // a 360 × 640 phone
  s.add(1, 12, 0, 0, { element: 'fire', fusion: 'ice', buffs: {}, pure: true });
  s.add(2, 14, 1, 0, { element: 'fire', fusion: 'ice', buffs: {}, pure: true });
  s.step(0.1);
  const asked = (tier) => s.numbers.find((n) => n.tier === tier);
  assert.ok(Math.abs(asked(12).size * s.cell - NUMBER_MIN_PX) < 1e-9, `4096 asked at ${(asked(12).size * s.cell).toFixed(1)} px`);
  assert.ok(Math.abs(asked(14).size * s.cell - NUMBER_MIN_PX) < 1e-9, '16384 at 14 px too');
  const a = s.blocks.viewOf(1);
  const b = s.blocks.viewOf(2);
  assert.equal(a.numSqueeze, 1, '4096 fits as it is');
  assert.ok(b.numSqueeze < 1 && b.number.scale.x < b.number.scale.y, 'the 5-digit one is squeezed across');
  // on a 390 × 844 phone the same numerals keep their design size
  const big = scene({ u: 29.17 });
  big.add(1, 12, 0, 0, { element: 'fire', fusion: 'ice', buffs: {}, pure: true });
  big.step(0.1);
  assert.equal(big.numbers.find((n) => n.tier === 12).size, numberEm(4));
});
