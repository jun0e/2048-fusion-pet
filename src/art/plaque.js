// The board tile's plaque (reports/art/tiles/tile-spec.md, section 2): every tile is a clay plaque
// seated in its flagstone pit, and what was a line on its edge is an object on it: the growth meter
// in the top rail, the egg's straw nest, a den's stone altar (the shrine its pet left, with the paw
// prints of the pet that walked off to the field), a legend's apex badge on the altar inside its
// halo, the pick's corner brackets. Pure geometry, colour and motion rules, testable in Node:
// src/art/index.js draws the static textures from them, src/render/blocks.js the per-frame rules,
// src/render/frame.js the pit, src/kv/roam.js the brackets on a picked den's pet.
// Units: cells (one board square), origin at the cell's centre, y down (screen), unless a name says
// "of the plaque" (its side T = PLAQUE.size).
import { tr } from '../i18n/index.js';
import { ELEMENTS, fusionOf, milestonePieces } from '../sim/classes.js';
import { tierValue } from '../config.js';
import { BLUSH, CREAM, GOLD, INK, luminance, tone } from './tokens.js';
import { hash01 } from './frame-kit.js';

export const PLAQUE = {
  pit: 0.9, // the flagstone pit (frame-kit FRAME_GEOM.pit)
  pitR: 0.12, // its corner radius: the plaque's own, plus the groove
  size: 0.86, // the plaque: a 0.02 groove shows all round
  r: 0.11,
  outline: 0.028, // ink
  band: 0.3, // of the plaque: the flat lighter band at its top (white 0.34)
  lip: 0.085, // of the plaque: the one cel tone along its foot (ink 0.16)
  shadow: { x: 0.02, y: 0.035, alpha: 0.38, liftX: 0.6, liftY: 0.9 }, // cast inside the pit; it grows with the lift
  lift: 0.03, // a picked (or armed) plaque lifts this much on a longer shadow
  numberY: 0.335, // the numeral's centre from the cell's top: every tile, dens too
  numberEm: [0, 0.3875, 0.3875, 0.3125, 0.2625, 0.225], // its size by digit count (62 / 62 / 50 / 42 of 160)
  numberMaxW: 0.8, // the widest a numeral is drawn, its stroke included: inside the outline with a margin
  stroke: 0.26, // em: the cream stroke under the ink numeral
  // the generated badge is drawn 2.35 r wide: 0.32 cell, 15 px on a 360 px phone (T21: 0.25 cell, 12 px, read badly)
  badgeR: 0.135,
  badgeAt: 0.34, // the collar tag, bottom right, on every tile (a den's is split between its two elements)
  apexR: 0.708, // × badgeR: a legend's apex badge, seated on its altar (0.096 cell, as before T21)
  meter: { y: 0.075, w: 0.5, h: 0.045, gap: 0.02, pad: 0.012 }, // of the plaque: the top rail
  eggLift: 0.04, // an egg sits up in its nest
  nest: { y: 0.4, rx: 0.31, ry: 0.085, straw: 0.022 }, // of the plaque (the straw's width in cells)
  // the den's altar, of the plaque: blocks [half-width, top, height] below its centre, the parents'
  // two studs [x, r] on its body, the seat (where the crystal stands, or a legend's apex badge in its
  // halo) and the crystal [w, h]; it rises this much as the pet hops out; its ink line (cells)
  altar: { plinth: [0.235, 0.35, 0.055], body: [0.19, 0.22, 0.135], slab: [0.215, 0.175, 0.05], stud: [0.085, 0.042], seat: 0.075, crystal: [0.17, 0.21], rise: 0.12, ink: 0.02 },
  haloW: 0.42, // of the plaque: a legend's halo, centred on the seat
  legend: { gold: 0.045, hair: 0.014, gap: 0.022 }, // the gold frame and the ink hairline outside it
  charge: 0.028, // the legend's charge: a cream stroke on the plaque's own edge
  // the pick: four corner brackets outside the pit, in the 0.1-cell gap between pits (cream, ink
  // under), red and dashed when armed; their gap breathes in position, never in brightness
  bracket: { offset: 0.045, arm: 0.16, width: 0.04, under: 0.02, breathe: 0.012, hz: 0.7, dash: 0.06, gap: 0.07 },
  wobble: { amp: 0.035, hz: 3 }, // an armed plaque: ±2° at 3 Hz
  nudge: { dist: 0.04, time: 0.18 }, // a refused swipe
  shudder: 0.03, // a hit, at 90 rad/s
  denFloor: 0.25, // the least relative luminance a den plate may have (ink stays ≥ 4.5 : 1 on it)
};

/** The colour roles of the tile (tile-spec 2.5): no one-off colours. */
export const TILE_COLORS = {
  ink: INK,
  cream: CREAM,
  gold: GOLD, // the legend frame, the meter toward 256
  rose: BLUSH, // the meter toward 4096
  straw: ['#d9b86f', '#e2c47c'], // the nest: back, front
  sand: '#D9C7A3', // the lane: spawn dust
  sandChip: '#e6c88a', // a broken block's crumbs
  danger: '#ef6060', // armed brackets (inspect.css armed)
  sweat: '#9fd8ff', // the hit's sweat drop
};

/** Egg plates warm a step per value, like classic 2048 (cream 2 → sand 4 → apricot 8). */
export const EGG_PLATE = ['#f2dfc2', '#f2d3ad', '#f3c597'];
export const eggIndex = (tier) => Math.max(0, Math.min(2, tier - 1));

/** A den: a fusion (256 and up) whose pet has left the tile. */
export const isDen = (t) => t.tier >= 8 && !!t.cls?.fusion;

/** A den plate: tone(fusion, 0.18), lifted in 0.02 steps until its luminance reaches the floor (Nightshade only). */
export function denPlateColor(color) {
  let k = 0.18;
  let c = tone(color, k);
  while (luminance(c) < PLAQUE.denFloor && k < 0.9) {
    k = Math.round((k + 0.02) * 100) / 100;
    c = tone(color, k);
  }
  return c;
}

/** The plate's clay: the egg plates, a den's lifted fusion tint, an element's light tint. */
export function plateColor(t) {
  if (t.tier < 4) return EGG_PLATE[eggIndex(t.tier)];
  if (isDen(t)) return denPlateColor(fusionOf(t.cls).color);
  return tone(ELEMENTS[t.cls?.element]?.color ?? '#d9d2c5', 0.42);
}

/**
 * The growth meter: one segment per merge toward the next milestone, 16 → 256 in gold (the fusion),
 * then 256 → 4096 in rose (the legend). → { lit: 0–3, of: 4, goal: 'fusion' | 'legend', color } or
 * null (an egg: no class yet; a legend: nothing left to reach)
 */
export function meterOf(tier) {
  const lit = milestonePieces(tier);
  if (lit < 0) return null;
  const goal = tier < 8 ? 'fusion' : 'legend';
  return { lit, of: 4, goal, color: goal === 'fusion' ? GOLD : BLUSH };
}

/** The meter's four segments, in cells: [{ x0, x1 }] and their rail's y0 / y1 (the track pads them). */
export function meterSegments() {
  const T = PLAQUE.size;
  const m = PLAQUE.meter;
  const w = m.w * T;
  const gap = m.gap * T;
  const seg = (w - 3 * gap) / 4;
  const y = -T / 2 + m.y * T;
  const segs = [0, 1, 2, 3].map((i) => ({ x0: -w / 2 + i * (seg + gap), x1: -w / 2 + i * (seg + gap) + seg }));
  return { segs, y0: y - (m.h * T) / 2, y1: y + (m.h * T) / 2, pad: m.pad * T, w, h: m.h * T };
}

/** In words, for the inspect card's growth row (null when there is no meter). */
export function growthWords(tier) {
  const m = meterOf(tier);
  if (!m) return null;
  return tr(`grow.${m.goal}`, { lit: m.lit }); // the language's table (src/i18n)
}

export const numberText = (tier) => String(tierValue(tier));
/** The numeral's design size in cells (em), by its digit count. */
export const numberEm = (digits) => PLAQUE.numberEm[Math.max(1, Math.min(PLAQUE.numberEm.length - 1, digits))];
/** The least a tile's numeral is drawn at, in CSS px: the canvas numbers' floor (docs/ux/phone-readability.md). */
export const NUMBER_MIN_PX = 14;

/**
 * Baloo 2 ExtraBold, measured in Chromium (canvas, textBaseline 'middle'): each value's half width
 * and the digits' reach up and down from the baseline's middle, in em. The numeral's box comes from
 * these (the tests keep the altar, the paw prints and the badges clear of it).
 */
export const NUMERAL_EM = {
  half: { 2: 0.226, 4: 0.286, 8: 0.255, 16: 0.4655, 32: 0.495, 64: 0.5675, 128: 0.7325, 256: 0.771, 512: 0.6885, 1024: 1.0415, 2048: 1.13, 4096: 1.1335, 8192: 0.978, 16384: 1.306, 32768: 1.294, 65536: 1.3095 },
  up: 0.452,
  down: 0.191,
};

const numeralHalf = (text) => NUMERAL_EM.half[text] ?? 0.6 * text.length;

/**
 * The numeral on a cell `cellPx` CSS px wide: its size in cells (em), never under NUMBER_MIN_PX
 * (on a 360 × 640 phone a 4-digit numeral would be 12.5 px at its design size), and `squeeze` (≤ 1),
 * the horizontal scale that keeps a long one inside PLAQUE.numberMaxW once the floor has grown it.
 * → { em, squeeze, width } (width: cells, with its stroke, before the squeeze)
 */
export function numberFit(tier, cellPx = Infinity) {
  const text = numberText(tier);
  const em = Math.max(numberEm(text.length), NUMBER_MIN_PX / Math.max(1, cellPx));
  const width = (2 * numeralHalf(text) + PLAQUE.stroke) * em;
  return { em, squeeze: Math.min(1, PLAQUE.numberMaxW / width), width };
}

/**
 * The numeral's box in cells as drawn on a cell `cellPx` CSS px wide (its design size by default),
 * with its cream stroke (or the ink glyphs only). → { x0, x1, y0, y1 }
 */
export function numberBox(tier, { stroke = true, cellPx = Infinity } = {}) {
  const { em, squeeze } = numberFit(tier, cellPx);
  const s = stroke ? PLAQUE.stroke / 2 : 0;
  const half = (numeralHalf(numberText(tier)) + s) * em * squeeze;
  const cy = -0.5 + PLAQUE.numberY;
  return { x0: -half, x1: half, y0: cy - (NUMERAL_EM.up + s) * em, y1: cy + (NUMERAL_EM.down + s) * em };
}

/**
 * Where the glyph badges sit: [{ el, el2?, x, y, r }] in cells. One badge per tile, in the collar spot:
 * an element's own, a den's split between the element it attacks with (el) and its partner (el2). An egg
 * has none; a legend's apex is on its altar.
 */
export function badgeSpots(t) {
  const cls = t.cls ?? {};
  const r = PLAQUE.badgeR;
  const at = PLAQUE.badgeAt;
  if (isDen(t)) {
    const out = [{ el: cls.element, el2: cls.fusion, x: at, y: at, r }];
    if (cls.ultimate) {
      const a = altarParts();
      out.push({ el: cls.ultimate, x: a.seat.x, y: a.seat.y, r: r * PLAQUE.apexR, apex: true });
    }
    return out;
  }
  if (t.tier >= 4 && cls.element) return [{ el: cls.element, x: at, y: at, r }];
  return [];
}

/**
 * The den's altar, in cells: its stone blocks (plinth, body, slab), the parents' two studs on its
 * body, the seat (where the crystal stands, or a legend's apex badge in its halo), the crystal's box
 * and the halo's box.
 */
export function altarParts() {
  const T = PLAQUE.size;
  const A = PLAQUE.altar;
  const block = ([hw, top, h]) => ({ x0: -hw * T, x1: hw * T, y0: top * T, y1: (top + h) * T });
  const body = block(A.body);
  const seat = { x: 0, y: A.seat * T };
  const [cw, ch] = A.crystal;
  const halo = PLAQUE.haloW * T;
  return {
    plinth: block(A.plinth),
    body,
    slab: block(A.slab),
    studs: [-1, 1].map((s) => ({ x: s * A.stud[0] * T, y: (body.y0 + body.y1) / 2, r: A.stud[1] * T })),
    seat,
    crystal: { x0: seat.x - (cw * T) / 2, x1: seat.x + (cw * T) / 2, y0: seat.y - (ch * T) / 2, y1: seat.y + (ch * T) / 2 },
    halo: { x0: -halo / 2, x1: halo / 2, y0: seat.y - halo / 2, y1: seat.y + halo / 2 },
  };
}

/**
 * The "out" mark of a den whose pet roams: three paw prints walking off the altar toward the field
 * (up and to the right), clear of the number, the badges and the altar (test/tiles.test.js). Each:
 * centre (x, y) and radius r in cells, heading `a` (radians: 0 up, clockwise). Hidden while the pet
 * hops out; dropped on a cell under PAW_MIN_PX, where a print would be a dot.
 */
export const PAWS = [
  { x: 0.247, y: 0.126, r: 0.042, a: 0.62 },
  { x: 0.308, y: 0.045, r: 0.039, a: 0.74 },
  { x: 0.366, y: -0.033, r: 0.037, a: 0.62 },
];
export const PAW_MIN_PX = 56;
/** The prints' ink rim (cells), half of it outside their cream. */
export const PAW_INK = 0.026;

/**
 * A paw print of radius 1 heading up, as ellipses { x, y, rx, ry }: the heel pad, then three toes.
 * They reach 0.88 of the print's radius from its centre (pawReach adds the ink rim).
 */
export const PAW_SHAPE = [
  { x: 0, y: 0.3, rx: 0.5, ry: 0.42 },
  { x: -0.5, y: -0.3, rx: 0.2, ry: 0.24 },
  { x: 0, y: -0.58, rx: 0.21, ry: 0.25 },
  { x: 0.5, y: -0.3, rx: 0.2, ry: 0.24 },
];

/** How far a print reaches from its centre, its ink rim included (cells). */
export const pawReach = (p) => 0.88 * p.r + PAW_INK / 2;

/**
 * The plaque's cast shadow inside its pit, in cells: offset down-right by the light, further while
 * the plaque is lifted (`lift` cells), cut to the pit (a rounded rect is close enough to the true
 * intersection). `out` is filled and returned (the renderer reuses one). → { x0, y0, x1, y1, r, alpha }
 */
export function seatShadow(lift = 0, out = {}) {
  const h = PLAQUE.size / 2;
  const edge = PLAQUE.pit / 2;
  const S = PLAQUE.shadow;
  const l = Math.max(0, lift);
  const dx = S.x + l * S.liftX;
  const dy = S.y + l * S.liftY;
  out.x0 = -h + dx;
  out.y0 = -h + dy;
  out.x1 = Math.min(h + dx, edge);
  out.y1 = Math.min(h + dy, edge);
  out.r = PLAQUE.r;
  out.alpha = S.alpha;
  return out;
}

/** How far the brackets stand off the pit (cells): their gap breathes at 0.7 Hz, still under Reduce motion. */
export function bracketOffset(time, reduced = false) {
  const B = PLAQUE.bracket;
  return B.offset + (reduced ? 0 : B.breathe * Math.sin(time * Math.PI * 2 * B.hz));
}

/**
 * One corner bracket as polylines in cells, its corner at the origin and its arms running back
 * toward the tile (-sx along x, -sy along y). Picked: one polyline (round caps). Armed: three
 * butt-ended dashes, the bend itself and one at each arm's end (arm = 1.5 dash + gap), so it still
 * reads as a corner; `ext` lengthens each dash at its free ends (the ink pass: its border).
 */
export function bracketStrokes(sx, sy, armed = false, ext = 0) {
  const { arm, dash } = PLAQUE.bracket;
  const at = (d) => (d <= arm ? [-sx * (arm - d), 0] : [0, -sy * (d - arm)]); // along the L, from the end of its x arm
  if (!armed) return [[at(0), at(arm), at(2 * arm)]];
  return [
    [at(-ext), at(dash + ext)],
    [at(arm - dash / 2 - ext), at(arm), at(arm + dash / 2 + ext)],
    [at(2 * arm - dash - ext), at(2 * arm + ext)],
  ];
}

/** An armed plaque's wobble (radians): ±2° at 3 Hz; none under Reduce motion. */
export const wobbleAt = (time, reduced = false) => (reduced ? 0 : PLAQUE.wobble.amp * Math.sin(time * Math.PI * 2 * PLAQUE.wobble.hz));

/** A hit's shudder (cells along x), `amount` 1 → 0; none under Reduce motion. */
export const shudderAt = (time, id, amount, reduced = false) => (reduced || amount <= 0 ? 0 : Math.sin(time * 90 + id) * PLAQUE.shudder * amount);

/**
 * Was a swipe that moved nothing (run.move → false) refused by the board itself? Then the plaques
 * nudge. Not when the run is over, a die card is open, or the coins fell short (the coin counter
 * already says that one).
 */
export const boardRefused = (run) => !run.over && !run.pendingChoice && run.coins >= run.swipeCost;

/** A refused swipe's nudge (cells along the swipe), `left` 1 → 0 over PLAQUE.nudge.time; none under Reduce motion. */
export const nudgeAt = (left, reduced = false) => (reduced || left <= 0 ? 0 : PLAQUE.nudge.dist * Math.sin(Math.PI * Math.min(1, 1 - left)));

const ease = (k) => 1 - (1 - Math.max(0, Math.min(1, k))) ** 3;

/** A new block (`k` 0 → 1): it drops into its pit from 0.22 cell up, 1.06 → 1; under Reduce motion it fades in place. */
export function appearPose(k, reduced = false, out = {}) {
  const e = ease(k);
  out.dy = reduced ? 0 : -0.22 * (1 - e);
  out.scale = reduced ? 1 : 1 + 0.06 * (1 - e);
  out.alpha = reduced ? e : 1;
  return out;
}

/** The remove reasons as the sim names them (grid.remove), and the spec's names. */
const DEPART = { sold: 'sold', sell: 'sold', destroyed: 'destroyed', broken: 'broken', break: 'broken' };
export const DEPART_TIME = 0.35;

/**
 * A block leaving (`k` 0 → 1 over DEPART_TIME): sold lifts out of the pit (−0.3 cell), shrinks a
 * little and fades; destroyed cracks, drops 0.1 into the pit and fades, chips flying; broken
 * crumbles the same way in sand, without cracks. Under Reduce motion each fades in place, no chips.
 * → { dy, scale, alpha, cracks (their alpha), chips, kind } (`out` is filled and returned)
 */
export function departPose(reason, k, reduced = false, out = {}) {
  const kind = DEPART[reason] ?? 'sold';
  const e = ease(k);
  const moves = !reduced;
  out.kind = kind;
  out.alpha = 1 - e;
  out.cracks = kind === 'destroyed' ? Math.max(0, 1 - k / 0.6) : 0;
  out.chips = moves && kind !== 'sold';
  out.dy = !moves ? 0 : kind === 'sold' ? -0.3 * e : 0.1 * e;
  out.scale = moves && kind === 'sold' ? 1 - 0.15 * e : 1;
  return out;
}

/** The cracks of a destroyed block, polylines in cells from the bite (they are turned toward it). */
export const CRACKS = [
  [
    [-0.1, -0.05],
    [-0.22, -0.2],
    [-0.3, -0.38],
  ],
  [
    [-0.1, -0.05],
    [0.08, 0.12],
    [0.05, 0.28],
    [0.2, 0.38],
  ],
  [
    [-0.1, -0.05],
    [-0.3, 0.05],
    [-0.38, 0.18],
  ],
];

/** The seconds a 16 waits before its n-th blink: 3–6 s, by a hash of its id (the blink lasts BLINK). */
export const blinkGap = (id, n) => 3 + 3 * hash01(id, 100 + n);
export const BLINK = 0.12;

const ROUND_CORNERS = [
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];

/**
 * Walk a rounded rectangle (half side h, corner radius r, centred on the origin) clockwise from its
 * top centre for `frac` of its perimeter, as Pixi Graphics takes it (after a moveTo to the top
 * centre): line(x, y) for the straight runs, arc(cx, cy, r, a0, a1) for the corners. → the length walked
 */
export function walkRoundRect(h, r, frac, line, arc) {
  const s = h - r;
  const q = (Math.PI / 2) * r;
  const per = 8 * s + 4 * q;
  const total = Math.max(0, Math.min(1, frac)) * per;
  let left = total;
  // the top's right half, then each corner and side clockwise, then the top's left half
  for (let i = 0; i < 9 && left > 0; i++) {
    if (i % 2) {
      const c = (i - 1) / 2; // the corners clockwise: top right, bottom right, bottom left, top left
      const a0 = -Math.PI / 2 + c * (Math.PI / 2);
      const d = Math.min(left, q);
      arc(ROUND_CORNERS[c][0] * s, ROUND_CORNERS[c][1] * s, r, a0, a0 + d / r);
      left -= d;
      continue;
    }
    const side = i / 2; // 0 top (right half), 1 right, 2 bottom, 3 left, 4 top (left half)
    const len = side === 0 || side === 4 ? s : 2 * s;
    const d = Math.min(left, len);
    if (side === 0) line(d, -h);
    else if (side === 1) line(h, -s + d);
    else if (side === 2) line(s - d, h);
    else if (side === 3) line(-h, s - d);
    else line(-s + d, -h);
    left -= d;
  }
  return total;
}
