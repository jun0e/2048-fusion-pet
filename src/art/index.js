// Art provider for the game and the key-visual demo: Pixi textures for each layer, cached per style.
//   tile(t)      → { plate, motif, overlay, badges, creature, crop, maxW, egg, nestFront, faces, plaque, halo } for a board block
//   number(tier, px), badge(el), paws() → the sticker tile's numeral, glyph badges and a den's paw prints
//   roamer(cls)  → full-body fusion texture (a summoned pet on the field)
//   halo(el)     → an element's halo kit (a pure form wears its main element's)
//   portrait(cls)→ data URL of the soft-vinyl namecard portrait (DOM)
//   tileCanvas(t, px) → the whole tile in its pit as one canvas (the inspect card's picture)
// Styles: 'sticker' (recommended), 'pixel' (comparison), 'classic' (the old blocks).
// Sticker style uses the Gemini sprites from tools/pipeline.mjs wherever they exist
// (egg.*, pet.<el>.<value>, fusion.<a+b>, halo.<el>, portrait.<a+b>), and the
// code-drawn stand-ins for anything not generated yet.
// The sticker tile (reports/art/tiles/tile-spec.md; geometry and colours in ./plaque.js) is a clay
// plaque seated in its flagstone pit: the plate with the growth meter in its top rail (a plain
// block's is dressed stone, an egg's has its straw nest), a den's stone altar in the chapter's stone
// as its own texture so it can rise as a summoned pet hops out, then the creature peeking over the
// sill (an egg in its element's colours, a single's baby, a fusion pet; a pure form's halo behind
// it), then the glyph badges and the numeral (ink, cream stroke) at 33.5 % on every tile.
import { Rectangle, Texture } from 'pixi.js';
import { ELEMENTS, fusionKey, fusionOf } from '../sim/classes.js';
import { INK, CREAM, GOLD, tone } from './tokens.js';
import { drawBadge, glyphPath } from './glyphs.js';
import { makeCanvas, renderCreature, renderPortrait, quantize } from './creatures.js';
import { generatedTex, generatedUrl } from '../render/textures.js';
import { spriteId, portraitId } from './sprite-ids.js';
import { FUSION_ROSTER } from './fusion-roster.js';
import { skinFor } from './frame-kit.js';
import { PAWS, PAW_INK, PAW_SHAPE, PEBBLE_TAG, PLAQUE, STONE, TILE_COLORS, altarParts, badgeSpots, eggIndex, isDen, isEgg, isFusion, isPlain, isPure, meterOf, meterSegments, numberEm, numberFit, numberText, plateColor, seatShadow } from './plaque.js';

const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';
export const TILE_PX = 160; // sticker tile texture (same as the classic BLOCK_PX)
export const PIXEL_TILE = 36; // pixel tile grid
const BABY_CROP = 0.76; // a baby shows its top 76%: it peeks over the tile's bottom edge
const GEN_BABY_CROP = 0.84; // generated babies are trimmed to the body: hide just the feet
export const CREATURE_MAX_W = 0.9; // a creature never gets wider than 90% of its cell
/**
 * How tall a summoned pet stands on the field, in cells (proposal W4): a fusion 1.0, a pure form
 * (`legend`) 1.15 under its halo, so pets read smaller than the bosses (1.24–1.37 cells) and never
 * hide the fight. The code-drawn canvases carry padding around the creature: they are drawn this much taller.
 */
export const ROAMER_CELLS = { fusion: 1.0, legend: 1.15 };
const ROAMER_PAD = { fusion: 1.42 / 1.18, legend: 1.62 / 1.32 };
/**
 * The widest a generated roaming pet may get, in its own heights. By their contracts the long pets
 * (the platypus, the locust, the toad, the walrus) are 1.5–1.6× wider than tall and keep their full
 * 1.0 cell; only the crocodile (2.2×) is capped, standing about 0.72 cell tall.
 */
export const ROAMER_MAX_W = 1.6;
/**
 * How a generated fusion stands: `feet` = anchor y (share of its height), `height` = display
 * height in cells (ROAMER_CELLS), `maxW` = widest it may get, in cells; its roster `view` (only a
 * profile is flipped) and `move` (how it roams: src/kv/roam.js gaitAt).
 */
export function generatedRoamerFit(cls) {
  const k = cls.pure ? ROAMER_CELLS.legend : ROAMER_CELLS.fusion;
  const r = FUSION_ROSTER[fusionKey(cls.element, cls.fusion)];
  return { feet: 0.97, height: k, maxW: k * ROAMER_MAX_W, view: r?.view ?? 'profile', move: r?.move ?? 'walk' };
}


/** Display height of the creature, as a fraction of the cell: grows 16 → 128. */
// eggs (2 → 4 → 8) grow a little too, so the three read apart at a glance
const EGG_CROP = [0.58, 0.64, 0.7];
const GEN_EGG_CROP = [0.5, 0.55, 0.6];
export const cropFor = (tier) => (tier < 4 ? EGG_CROP[eggIndex(tier)] : [0.78, 0.84, 0.9, 0.96][Math.min(3, tier - 4)]); // head ≈ 39 → 48% of the tile
/** The same for generated sprites, which are trimmed to the body (no canvas padding): head ≈ 39 → 48%. */
export const genCropFor = (tier) => (tier < 4 ? GEN_EGG_CROP[eggIndex(tier)] : [0.56, 0.6, 0.64, 0.68][Math.min(3, tier - 4)]);

// --- sticker tiles: the clay plaque seated in its pit (src/art/plaque.js) ----------------------------
// Every drawing takes W, the pixels per cell, and draws a cell-sized canvas centred like the tile
// (the plate, the motif, the paws and the nest's front all overlay one another exactly).

const TAU = Math.PI * 2;
const INK_A = (a) => `rgba(43,29,46,${a})`;

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

/** A cell-sized canvas whose origin is the cell's centre. */
function cellCanvas(W, draw) {
  const c = makeCanvas(W, W);
  const g = c.getContext('2d');
  g.translate(W / 2, W / 2);
  draw(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

/** A straw of the egg's nest: an ink-edged stroke. */
function straw(g, x, y, len, angle, w, inkW, color) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-len / 2, 0);
  g.lineTo(len / 2, 0);
  g.lineWidth = w + inkW;
  g.strokeStyle = INK_A(0.55);
  g.stroke();
  g.lineWidth = w;
  g.strokeStyle = color;
  g.stroke();
  g.restore();
}

/**
 * The plaque: the clay plate (a fusion's corner wedge in its partner's tint), the flat lighter band at
 * its top and the one cel tone along its foot, a plain block's dressed stone (a mortar line and
 * flecks, and from 16 on its pebble tag), an egg's nest (its back half), the ink outline (a pure
 * form: the gold frame with an ink hairline outside it) and the growth meter in the top rail.
 * No drop shadow: the plaque is seated, and blocks.js casts its shadow inside the pit.
 */
function stickerPlate(t, W = TILE_PX) {
  return cellCanvas(W, (g) => {
    const T = PLAQUE.size * W;
    const h = T / 2;
    const r = PLAQUE.r * W;
    const pure = isPure(t);
    const base = plateColor(t);
    g.save();
    rrect(g, -h, -h, T, T, r);
    g.clip();
    g.fillStyle = base;
    g.fillRect(-h, -h, T, T);
    if (isFusion(t)) {
      g.fillStyle = tone(ELEMENTS[t.cls.fusion].color, 0.25);
      g.beginPath();
      g.moveTo(-h + T * 0.62, h);
      g.lineTo(h, -h + T * 0.62);
      g.lineTo(h, h);
      g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.34)';
    rrect(g, -h + 0.05 * T, -h + 0.04 * T, 0.9 * T, PLAQUE.band * T, r - 0.05 * T);
    g.fill();
    g.fillStyle = INK_A(0.16);
    g.fillRect(-h, h - PLAQUE.lip * T, T, PLAQUE.lip * T);
    if (isPlain(t)) dressedStone(g, base, W, t.tier >= 4);
    else if (isEgg(t)) {
      // the egg's straw nest, its back half (the front is drawn over the egg: nestFrontCanvas)
      const N = PLAQUE.nest;
      g.fillStyle = tone(base, -0.16);
      g.beginPath();
      g.ellipse(0, N.y * T, N.rx * T, N.ry * T, 0, 0, TAU);
      g.fill();
      for (const [x, y, a] of NEST_BACK) straw(g, x * T, y * T, 0.14 * T, a, N.straw * W, 0.0125 * W, TILE_COLORS.straw[0]);
    }
    g.restore();
    rrect(g, -h, -h, T, T, r);
    g.lineWidth = (pure ? PLAQUE.pure.gold : PLAQUE.outline) * W;
    g.strokeStyle = pure ? GOLD : INK;
    g.stroke();
    if (pure) {
      const o = PLAQUE.pure.gap * W;
      rrect(g, -h - o, -h - o, T + 2 * o, T + 2 * o, r + o);
      g.lineWidth = PLAQUE.pure.hair * W;
      g.strokeStyle = INK;
      g.stroke();
    }
    drawMeter(g, t.tier, W, t.cls);
  });
}

/**
 * A plain block's dressed stone, below its numeral: one mortar line with a joint down from it, a few
 * darker flecks, and from 16 on (it shoots pebbles) its pebble tag in the collar spot.
 */
function dressedStone(g, base, W, shoots) {
  const m = STONE.mortar;
  g.lineCap = 'round';
  g.strokeStyle = tone(base, -0.2);
  g.lineWidth = m.w * W;
  g.beginPath();
  g.moveTo(m.x0 * W, m.y * W);
  g.lineTo(m.x1 * W, m.y * W);
  g.moveTo(m.jx * W, m.y * W);
  g.lineTo(m.jx * W, m.jy1 * W);
  g.stroke();
  g.strokeStyle = 'rgba(255,250,242,0.5)'; // the light catches the mortar's lower lip
  g.lineWidth = m.w * W * 0.6;
  g.beginPath();
  g.moveTo(m.x0 * W, (m.y + m.w) * W);
  g.lineTo(m.x1 * W, (m.y + m.w) * W);
  g.stroke();
  g.fillStyle = tone(base, -0.28);
  for (const f of STONE.flecks) {
    g.beginPath();
    g.arc(f.x * W, f.y * W, f.r * W, 0, TAU);
    g.fill();
  }
  if (!shoots) return;
  for (const p of PEBBLE_TAG) {
    g.beginPath();
    g.ellipse(p.x * W, p.y * W, p.rx * W, p.ry * W, 0, 0, TAU);
    g.fillStyle = tone(base, -0.38);
    g.fill();
    g.lineWidth = 0.014 * W;
    g.strokeStyle = INK;
    g.stroke();
    g.beginPath(); // one cream glint on its upper left
    g.ellipse((p.x - p.rx * 0.35) * W, (p.y - p.ry * 0.4) * W, p.rx * 0.32 * W, p.ry * 0.22 * W, -0.4, 0, TAU);
    g.fillStyle = 'rgba(255,250,242,0.7)';
    g.fill();
  }
}
const NEST_BACK = [
  [-0.26, 0.33, -0.55],
  [0.25, 0.34, 0.5],
  [-0.1, 0.3, 0.2],
  [0.12, 0.31, -0.25],
];
const NEST_FRONT = [
  [-0.2, 0.395, 0.12],
  [0.02, 0.41, -0.08],
  [0.22, 0.39, 0.1],
  [-0.08, 0.4, -0.3],
];

/** The growth meter in the top rail: a dark track, one segment per merge, lit gold toward the summon and rose toward the pure form. */
function drawMeter(g, tier, W, cls) {
  const m = meterOf(tier, cls);
  if (!m) return;
  const { segs, y0, y1, pad, h } = meterSegments();
  rrect(g, (segs[0].x0 - pad) * W, (y0 - pad) * W, (segs[3].x1 - segs[0].x0 + 2 * pad) * W, (y1 - y0 + 2 * pad) * W, h * W);
  g.fillStyle = INK_A(0.34);
  g.fill();
  segs.forEach((s, i) => {
    rrect(g, s.x0 * W, y0 * W, (s.x1 - s.x0) * W, (y1 - y0) * W, h * 0.35 * W);
    if (i < m.lit) {
      g.fillStyle = m.color;
      g.fill();
      g.fillStyle = 'rgba(255,250,242,0.55)'; // one cream glint along its top
      g.fillRect((s.x0 + h * 0.3) * W, y0 * W + 1, (s.x1 - s.x0 - h * 0.6) * W, Math.max(1, h * 0.22 * W));
    } else {
      g.fillStyle = INK_A(0.28);
      g.fill();
    }
    g.lineWidth = Math.max(1, W / 160);
    g.strokeStyle = INK_A(0.6);
    g.stroke();
  });
}

/** The egg nest's front: straw across the egg's base, drawn over the egg. */
function nestFrontCanvas(W = TILE_PX) {
  return cellCanvas(W, (g) => {
    const T = PLAQUE.size * W;
    for (const [x, y, a] of NEST_FRONT) straw(g, x * T, y * T, 0.15 * T, a, PLAQUE.nest.straw * W, 0.0125 * W, TILE_COLORS.straw[1]);
  });
}

/** A block of the keep's stone: its fill, one cel tone along its lower third, a light band on its top fifth, an ink line. */
function stoneBlock(g, b, W, stone, fill) {
  const x = b.x0 * W;
  const y = b.y0 * W;
  const w = (b.x1 - b.x0) * W;
  const h = (b.y1 - b.y0) * W;
  rrect(g, x, y, w, h, Math.min(w, h) * 0.22);
  g.fillStyle = fill;
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = stone[1];
  g.fillRect(x, y + h * 0.66, w, h * 0.34);
  g.fillStyle = stone[2];
  g.fillRect(x, y, w, h * 0.22);
  g.restore();
  g.lineWidth = PLAQUE.altar.ink * W;
  g.strokeStyle = INK;
  g.stroke();
}

/** The den's crystal: the fusion's colour light, its right facet the colour itself, the lower facets shaded, a cream glint. */
function crystal(g, b, W, color) {
  const cx = ((b.x0 + b.x1) / 2) * W;
  const cy = ((b.y0 + b.y1) / 2) * W;
  const w = (b.x1 - b.x0) * W;
  const h = (b.y1 - b.y0) * W;
  const outline = () => {
    g.beginPath();
    g.moveTo(cx, cy - h / 2);
    g.lineTo(cx + w / 2, cy - h * 0.12);
    g.lineTo(cx, cy + h / 2);
    g.lineTo(cx - w / 2, cy - h * 0.12);
    g.closePath();
  };
  outline();
  g.fillStyle = tone(color, 0.62);
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx, cy - h / 2);
  g.lineTo(cx + w / 2, cy - h * 0.12);
  g.lineTo(cx, cy + h / 2);
  g.closePath();
  g.fill();
  g.fillStyle = tone(color, -0.2);
  g.fillRect(cx - w / 2, cy + h * 0.12, w, h);
  g.fillStyle = CREAM;
  g.beginPath();
  g.moveTo(cx - w * 0.3, cy - h * 0.14);
  g.lineTo(cx - w * 0.06, cy - h * 0.4);
  g.lineTo(cx - w * 0.06, cy - h * 0.12);
  g.closePath();
  g.fill();
  g.restore();
  outline();
  g.lineWidth = PLAQUE.altar.ink * W;
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.stroke();
}

/** An element's halo kit as a drawable image: the generated halo.<el>, else the code-drawn one. */
function haloImage(el) {
  return generatedTex(`halo.${el}`)?.source?.resource ?? renderCreature({ kind: 'halo', apex: el }, 'sticker').canvas;
}

/**
 * The den's motif: the altar its summoned pet hopped out of, in the chapter's stone (plinth, a body
 * carrying the parents' two colours, a light slab) with the fusion's crystal on its seat (a single's in
 * its element's colour). Its own texture, so it can rise as the pet hops out.
 */
function stickerMotif(t, W = TILE_PX, skinKey = 'forest') {
  return cellCanvas(W, (g) => {
    const stone = skinFor(skinKey).stone;
    const a = altarParts();
    const el = t.cls.element;
    const partner = t.cls.fusion ?? el;
    stoneBlock(g, a.plinth, W, stone, stone[0]);
    stoneBlock(g, a.body, W, stone, stone[0]);
    for (const [s, k] of [
      [a.studs[0], el],
      [a.studs[1], partner],
    ]) {
      g.beginPath();
      g.arc(s.x * W, s.y * W, s.r * W, 0, TAU);
      g.fillStyle = ELEMENTS[k].color;
      g.fill();
      g.lineWidth = 0.014 * W;
      g.strokeStyle = INK;
      g.stroke();
    }
    stoneBlock(g, a.slab, W, stone, stone[2]);
    crystal(g, a.crystal, W, fusionOf(t.cls)?.color ?? ELEMENTS[el].color);
  });
}

/** A den's "out" mark: the paw prints of its pet, walking off the altar toward the field (PAWS). */
function pawsCanvas(W = TILE_PX) {
  return cellCanvas(W, (g) => {
    for (const p of PAWS) {
      g.save();
      g.translate(p.x * W, p.y * W);
      g.rotate(p.a);
      const s = p.r * W;
      g.scale(s, s);
      const shape = () => {
        g.beginPath();
        for (const e of PAW_SHAPE) {
          g.moveTo(e.x + e.rx, e.y);
          g.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, TAU);
        }
      };
      shape();
      g.lineJoin = 'round';
      g.lineWidth = (PAW_INK * W) / s; // the ink rim, half of it under the cream
      g.strokeStyle = INK;
      g.stroke();
      shape();
      g.fillStyle = CREAM;
      g.fill();
      g.restore();
    }
  });
}

/** The glyph badge (a fusion's split between its two elements), drawn into a cell-sized context. */
function drawBadges(g, t, W) {
  for (const b of badgeSpots(t)) {
    if (b.el2) drawSplitBadge(g, b.el, b.el2, b.x * W, b.y * W, b.r * W);
    else drawBadge(g, b.el, b.x * W, b.y * W, b.r * W, ELEMENTS[b.el].color, INK);
  }
}

// the badge's panel inside its rims (plum, cream, plum), as a share of the badge's width (measured on the generated badges)
const BADGE_PANEL = { inset: 0.115, r: 0.2 };

/**
 * A den's badge (T21): one badge split between the element it attacks with (left) and its partner
 * (right). Each half shows its own badge's panel and symbol, scaled to fit the half; the rims are the
 * first badge's, and a plum seam parts the halves. As wide as one badge: 2.35 r.
 */
function drawSplitBadge(g, a, b, cx, cy, r) {
  const s = r * 2.35;
  const p = s * (1 - 2 * BADGE_PANEL.inset); // the panel's side
  const panel = () => {
    g.beginPath();
    g.roundRect(cx - p / 2, cy - p / 2, p, p, s * BADGE_PANEL.r);
  };
  drawBadge(g, a, cx, cy, r, ELEMENTS[a].color, INK); // the rims (and a panel under the halves)
  for (const [el, side] of [
    [a, -1],
    [b, 1],
  ]) {
    g.save();
    panel();
    g.clip();
    g.beginPath();
    g.rect(side < 0 ? cx - p / 2 : cx, cy - p / 2, p / 2, p);
    g.clip();
    drawBadge(g, el, cx + (side * p) / 4, cy, r * 0.7, ELEMENTS[el].color, INK);
    g.restore();
  }
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(cx, cy - p / 2);
  g.lineTo(cx, cy + p / 2);
  g.stroke();
  g.restore();
}

/** The numeral: Baloo 2 ExtraBold, ink with the cream stroke, its middle at (x, y); `size` in cells (its design size by default). */
function drawNumber(g, tier, x, y, W, size = null) {
  const text = numberText(tier);
  const em = (size ?? numberEm(text.length)) * W;
  g.save();
  g.font = `800 ${em}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = em * PLAQUE.stroke;
  g.strokeStyle = CREAM;
  g.strokeText(text, x, y);
  g.fillStyle = INK;
  g.fillText(text, x, y);
  g.restore();
}

/**
 * The numeral alone, at `W` pixels per cell and `size` cells tall (numberFit: never under its 14 px
 * floor): wide enough for its glyphs and stroke, 0.5 cell tall, the text's middle at its centre.
 */
function numberCanvas(tier, W, size = null) {
  const em = size ?? numberEm(numberText(tier).length);
  const c = makeCanvas(Math.ceil(Math.max(0.9, numberFit(tier).width * (em / numberEm(numberText(tier).length)) + 0.05) * W), Math.ceil(W * 0.5));
  drawNumber(c.getContext('2d'), tier, c.width / 2, c.height / 2, W, em);
  return c;
}

/** A glyph badge on its own, drawn 2.35 r wide like the generated one (the stand-in when none is); with `el2`, a den's split badge. */
function badgeCanvas(el, r = 40, el2 = null) {
  const s = Math.ceil(r * 2.35);
  const c = makeCanvas(s, s);
  if (el2) drawSplitBadge(c.getContext('2d'), el, el2, s / 2, s / 2, r);
  else drawBadge(c.getContext('2d'), el, s / 2, s / 2, r, ELEMENTS[el].color, INK);
  return c;
}

/**
 * The tile's small sprites, the same in every style (src/render/blocks.js): a chip (white with an
 * ink rim, tinted to the plate, the sand or the pit's dark), an egg's two shell halves, the hit's
 * sweat drop. Built once, in the browser.
 */
const decor = new Map();
export function tileDecor(kind) {
  if (!decor.has(kind)) decor.set(kind, Texture.from(DECOR_DRAW[kind]()));
  return decor.get(kind);
}
const DECOR_DRAW = {
  chip: () => {
    const c = makeCanvas(36, 28);
    const g = c.getContext('2d');
    rrect(g, 3, 3, 30, 22, 6);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = INK;
    g.stroke();
    return c;
  },
  shellL: () => shellCanvas(1),
  shellR: () => shellCanvas(-1),
  sweat: () => {
    const c = makeCanvas(34, 46);
    const g = c.getContext('2d');
    const drop = () => {
      g.beginPath();
      g.moveTo(17, 4);
      g.bezierCurveTo(23, 16, 30, 22, 30, 30);
      g.arc(17, 30, 13, 0, Math.PI);
      g.bezierCurveTo(4, 22, 11, 16, 17, 4);
      g.closePath();
    };
    drop();
    g.fillStyle = TILE_COLORS.sweat;
    g.fill();
    g.lineWidth = 3;
    g.lineJoin = 'round';
    g.strokeStyle = INK;
    g.stroke();
    g.fillStyle = CREAM;
    g.beginPath();
    g.ellipse(12.5, 29, 3, 5, -0.3, 0, TAU);
    g.fill();
    return c;
  },
};
/** Half an egg's shell (side 1: the left half; -1: the right), cream with an ink rim and a jagged edge. */
function shellCanvas(side) {
  const c = makeCanvas(48, 40);
  const g = c.getContext('2d');
  g.translate(24, 20);
  g.scale(side, 1);
  g.beginPath();
  g.moveTo(-18, -2);
  g.quadraticCurveTo(-17, 16, 4, 16);
  g.lineTo(6, 6);
  g.lineTo(0, 1);
  g.lineTo(5, -6);
  g.lineTo(-2, -10);
  g.quadraticCurveTo(-16, -14, -18, -2);
  g.closePath();
  g.fillStyle = CREAM;
  g.fill();
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.stroke();
  return c;
}

function cropCanvas(src, fromTop, frac) {
  const h = Math.round(fromTop + (src.height - fromTop * 2) * frac);
  const c = makeCanvas(src.width, h);
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

// --- elemental eggs: the egg art in its element's colours ----------------------------------------
// The egg art (generated egg.2/4/8 and the code-drawn stand-in share its colours) is recoloured once
// per element: its ink and its cream rim, eye whites and shine stay; its shell, the shell's shade and
// its spots take a ramp of the element's colour, by their luma (gamma-encoded, 0–1). A fusion egg
// wears its main element above a zig-zag ink seam and its second element below it.

/** The ramp's stops: [luma of the egg art's own colour, tone() of the element colour it becomes]. */
export const EGG_RAMP = [
  [0.3, -0.5], // the darkest shading over the ink's edge
  [0.75, -0.05], // the spots (#e6b98a)
  [0.815, 0.2], // the shell's shade (#e8cda6)
  [0.947, 0.55], // the shell (#fff0da)
];
/** Luma kept as it is: the ink below dark[0] (blended to dark[1]), the cream rim and the whites from light[1] (blended from light[0]). */
export const EGG_KEEP = { dark: [0.2, 0.3], light: [0.962, 0.976] };
/** The fusion egg's seam: at this share of the egg's height, a zig-zag `amp` of it high, `teeth` across, `w` of it thick. */
export const EGG_SEAM = { y: 0.62, amp: 0.035, teeth: 5, w: 0.014 };

const rgbOf = (hexColor) => {
  const n = parseInt(hexColor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** An element colour's egg ramp: [[luma, r, g, b]] at EGG_RAMP's stops. */
export const eggRamp = (color) => EGG_RAMP.map(([l, k]) => [l, ...rgbOf(tone(color, k))]);

/** How much of a texel of luma `l` stays as it was (1: ink, rim and whites; 0: recoloured). */
export function eggKeep(l) {
  const [d0, d1] = EGG_KEEP.dark;
  const [l0, l1] = EGG_KEEP.light;
  if (l <= d0 || l >= l1) return 1;
  if (l < d1) return 1 - (l - d0) / (d1 - d0);
  if (l > l0) return (l - l0) / (l1 - l0);
  return 0;
}

/** The fusion egg's seam height (px) at column x of an egg w × h. */
export const eggSeamY = (x, w, h) => h * EGG_SEAM.y + (Math.abs(((x * EGG_SEAM.teeth) / w) % 1 - 0.5) * 4 - 1) * EGG_SEAM.amp * h;

/**
 * Recolour an egg's RGBA texels in place (w × h): `ramp` its colour (eggRamp), `ramp2` a fusion egg's
 * second colour below its seam (or null). Pure: test/tiles.test.js runs it in Node.
 */
export function recolorEgg(data, w, h, ramp, ramp2 = null) {
  const ink = rgbOf(INK);
  const seamHalf = Math.max(0.75, (EGG_SEAM.w * h) / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0) continue;
      const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const keep = eggKeep(l);
      if (keep >= 1) continue;
      let to;
      if (ramp2) {
        const sy = eggSeamY(x, w, h);
        to = Math.abs(y + 0.5 - sy) <= seamHalf ? ink : rampAt(y + 0.5 > sy ? ramp2 : ramp, l);
      } else to = rampAt(ramp, l);
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(to[c] + (data[i + c] - to[c]) * keep);
    }
  }
  return data;
}

function rampAt(ramp, l) {
  if (l <= ramp[0][0]) return ramp[0].slice(1);
  for (let i = 1; i < ramp.length; i++) {
    const [l1, ...c1] = ramp[i];
    if (l <= l1) {
      const [l0, ...c0] = ramp[i - 1];
      const k = (l - l0) / (l1 - l0);
      return c0.map((v, j) => v + (c1[j] - v) * k);
    }
  }
  return ramp[ramp.length - 1].slice(1);
}

const tintedEggs = new WeakMap(); // source image → its recoloured eggs, by element (the inspect card asks again and again)
/**
 * An egg image (a canvas or a loaded sprite) in its element's colours (`el2`: a fusion egg's second
 * element, below its seam), at most `maxH` px tall: the tile draws an egg about 0.5 cell tall.
 */
export function tintedEgg(src, el, el2 = null, maxH = 192) {
  const key = `${el}|${el2 ?? ''}|${maxH}`;
  let made = tintedEggs.get(src);
  if (!made) tintedEggs.set(src, (made = new Map()));
  if (!made.has(key)) made.set(key, recolorCanvas(src, el, el2, maxH));
  return made.get(key);
}

function recolorCanvas(src, el, el2, maxH) {
  const k = Math.min(1, maxH / Math.max(1, src.height));
  const w = Math.max(1, Math.round(src.width * k));
  const h = Math.max(1, Math.round(src.height * k));
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0, w, h);
  const img = g.getImageData(0, 0, w, h);
  recolorEgg(img.data, w, h, eggRamp(ELEMENTS[el].color), el2 ? eggRamp(ELEMENTS[el2].color) : null);
  g.putImageData(img, 0, 0);
  return c;
}

// --- pixel tiles --------------------------------------------------------------------

const DIGITS_5x7 = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};
const DIGITS_3x5 = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

/** Pixel number: plum digits with a 1 px cream outline, centred on (cx, cy). */
function pixelNumber(g, text, cx, cy, maxW) {
  // single digits (eggs) get the 5×7 face; bigger numbers the chunky 3×5, so the
  // number keeps to the top third and the creature stays visible
  let font = text.length === 1 ? DIGITS_5x7 : DIGITS_3x5;
  let s = 2;
  const width = (f, sc) => text.length * (f[0][0].length * sc) + (text.length - 1) * sc;
  if (width(font, s) > maxW) s = 1;
  const cw = font[0][0].length;
  const ch = font[0].length;
  const W = width(font, s);
  const x0 = Math.round(cx - W / 2);
  const y0 = Math.round(cy - (ch * s) / 2);
  const on = [];
  [...text].forEach((d, i) => {
    font[d].forEach((row, y) => [...row].forEach((b, x) => b === '1' && on.push([x0 + i * (cw + 1) * s + x * s, y0 + y * s])));
  });
  g.fillStyle = CREAM;
  for (const [x, y] of on) g.fillRect(x - 1, y - 1, s + 2, s + 2);
  g.fillStyle = INK;
  for (const [x, y] of on) g.fillRect(x, y, s, s);
}

/** A rounded rectangle on whole pixels (corner insets 3, 2, 1). */
function pxRect(g, x, y, w, h, color, inset = [3, 1, 1]) {
  g.fillStyle = color;
  for (let r = 0; r < h; r++) {
    const k = r < inset.length ? inset[r] : h - 1 - r < inset.length ? inset[h - 1 - r] : 0;
    g.fillRect(x + k, y + r, w - k * 2, 1);
  }
}

function pixelPlate(t) {
  const G = PIXEL_TILE;
  const c = makeCanvas(G, G);
  const g = c.getContext('2d');
  const pure = isPure(t);
  const fu = isFusion(t) ? fusionOf(t.cls) : null;
  pxRect(g, 1, 2, G - 2, G - 2, 'rgba(25,15,35,0.45)');
  pxRect(g, 1, 1, G - 2, G - 2, pure ? GOLD : INK);
  const base = plateColor(t);
  pxRect(g, 2, 2, G - 4, G - 4, base, [2, 1]);
  if (fu) {
    g.fillStyle = tone(ELEMENTS[t.cls.fusion].color, 0.25);
    for (let y = 0; y < G - 4; y++) {
      const x0 = Math.max(2, G - 4 - (y - Math.floor(G * 0.55)) - 2);
      if (y > G * 0.55) g.fillRect(x0 + 2, y + 2, G - 4 - x0, 1);
    }
  }
  g.fillStyle = tone(base, 0.35);
  g.fillRect(5, 3, G - 10, 2);
  g.fillStyle = tone(base, -0.18);
  g.fillRect(3, G - 5, G - 6, 2);
  if (isPlain(t)) {
    // dressed stone: a mortar course and its joint, two flecks; from 16 a pebble tag
    g.fillStyle = tone(base, -0.22);
    g.fillRect(5, Math.round(G * 0.64), G - 10, 1);
    g.fillRect(Math.round(G * 0.56), Math.round(G * 0.64), 1, Math.round(G * 0.2));
    g.fillRect(9, Math.round(G * 0.76), 1, 1);
    g.fillRect(G - 11, Math.round(G * 0.55), 1, 1);
    if (t.tier >= 4) {
      pxRect(g, G - 12, G - 10, 5, 4, INK, [1]);
      pxRect(g, G - 11, G - 9, 3, 2, tone(base, -0.4), [0]);
      pxRect(g, G - 8, G - 12, 4, 4, INK, [1]);
      pxRect(g, G - 7, G - 11, 2, 2, tone(base, -0.4), [0]);
    }
  }
  return c;
}

function pixelBadge(g, el, cx, cy) {
  const s = 9;
  const b = makeCanvas(s, s);
  const x = b.getContext('2d');
  x.fillStyle = ELEMENTS[el].color;
  x.beginPath();
  x.arc(s / 2, s / 2, s / 2 - 0.5, 0, Math.PI * 2);
  x.fill();
  x.save();
  x.translate(1.6, 1.6);
  x.scale(s - 3.2, s - 3.2);
  x.fillStyle = '#ffffff';
  x.fill(glyphPath(el), 'evenodd');
  x.restore();
  quantize(b, [ELEMENTS[el].color, '#ffffff']);
  g.drawImage(b, Math.round(cx - s / 2) - 1, Math.round(cy - s / 2) - 1);
}

function pixelOverlay(t) {
  const G = PIXEL_TILE;
  const c = makeCanvas(G, G);
  const g = c.getContext('2d');
  // the numeral sits high over a creature; with none on the tile (a plain block, a den) it sits lower
  const bare = isPlain(t) || isDen(t);
  pixelNumber(g, numberText(t.tier), G / 2, bare ? G * 0.38 : t.tier < 4 ? G * 0.3 : G * 0.25, G - 6);
  if (isFusion(t)) {
    pixelBadge(g, t.cls.element, 8, G - 8);
    pixelBadge(g, t.cls.fusion, G - 8, G - 8);
  } else if (t.cls.element) pixelBadge(g, t.cls.element, G - 8, G - 8);
  return c;
}

/** Just the plate (and optionally its number and badges) of a tile, for the asset page. */
export function plateCanvas(t, style = 'sticker', withOverlay = false) {
  if (style === 'pixel') {
    const plate = pixelPlate(t);
    if (!withOverlay) return plate;
    const c = makeCanvas(plate.width, plate.height);
    const g = c.getContext('2d');
    g.drawImage(plate, 0, 0);
    g.drawImage(pixelOverlay(t), 0, 0);
    return c;
  }
  const c = stickerPlate(t);
  if (!withOverlay && !isDen(t)) return c;
  const g = c.getContext('2d');
  if (isDen(t)) g.drawImage(stickerMotif(t), 0, 0);
  if (withOverlay) {
    g.save();
    g.translate(TILE_PX / 2, TILE_PX / 2);
    drawBadges(g, t, TILE_PX);
    drawNumber(g, t.tier, 0, (PLAQUE.numberY - 0.5) * TILE_PX, TILE_PX);
    g.restore();
  }
  return c;
}

/**
 * What stands on a tile: an elemental egg (in its element's colours: el, a fusion egg's el2), a
 * single's baby (its 16–128 stages; it keeps its 128 look beyond), a fusion pet (`legendary`: its
 * pure form's gold trim), or nothing (a plain block; a den, whose pet is summoned out on the field).
 */
export function creatureSpecOf(t) {
  const cls = t.cls ?? {};
  if (!cls.element || isDen(t)) return null;
  if (t.tier < 4) return { kind: 'egg', tier: Math.max(1, Math.min(3, t.tier)), el: cls.element, el2: cls.fusion ?? null };
  if (cls.fusion) return { kind: 'fusion', a: cls.element, b: cls.fusion, legendary: !!cls.pure };
  return { kind: 'baby', el: cls.element, stage: Math.min(3, t.tier - 4) };
}

/** The keep's floor and a flagstone pit behind a tile (src/render/frame.js drawKeep, at one cell = W px), with the plaque's cast shadow in it. */
function drawPit(g, W, skinKey) {
  const skin = skinFor(skinKey);
  g.fillStyle = skin.floor;
  g.fillRect(-W / 2, -W / 2, W, W);
  const pit = PLAQUE.pit * W;
  const r = PLAQUE.pitR * W;
  const lip = Math.max(1.5, 0.035 * W);
  const x = -pit / 2;
  g.save();
  rrect(g, x, x, pit, pit, r);
  g.fillStyle = skin.pit;
  g.fill();
  g.clip();
  g.fillStyle = tone(skin.pit, -0.3);
  g.fillRect(x + r, x + 1, pit - 2 * r, lip);
  g.fillRect(x + 1, x + r, lip, pit - 2 * r);
  g.fillStyle = tone(skin.floor, 0.16);
  g.fillRect(x + r, x + pit - lip - 1, pit - 2 * r, lip);
  const sh = seatShadow(0);
  rrect(g, sh.x0 * W, sh.y0 * W, (sh.x1 - sh.x0) * W, (sh.y1 - sh.y0) * W, sh.r * W);
  g.fillStyle = INK_A(sh.alpha);
  g.fill();
  g.restore();
  rrect(g, x, x, pit, pit, r);
  g.lineWidth = Math.max(1, W / 70);
  g.strokeStyle = INK;
  g.stroke();
}

/** A pure form's halo behind its pet (its main element's halo kit), into a cell-sized context centred on the cell. */
function drawTileHalo(g, el, W) {
  const img = haloImage(el);
  const w = PLAQUE.halo.w * W;
  const s = w / Math.max(img.width, img.height);
  g.drawImage(img, (-img.width * s) / 2, PLAQUE.halo.y * W - (img.height * s) / 2, img.width * s, img.height * s);
}

/**
 * A whole tile as one canvas, `px` pixels square (its cell; TILE_PX by default): for the guide, the
 * asset page and the inspect card's picture. The sticker tile: the plaque, a den's altar (with `out`,
 * the paw prints of its summoned pet), a pure form's halo, the creature (the generated sprite once
 * loaded, else the code-drawn one; an egg in its element's colours), an egg's nest, the badges and
 * the numeral; with `pit`, the keep's floor and the flagstone pit behind it in the chapter `skin`'s colours.
 */
export function composeTileCanvas(t, style = 'sticker', { px: size = null, pit = false, skin = 'forest', out = false } = {}) {
  if (style === 'pixel') {
    const plate = pixelPlate(t);
    const N = plate.width;
    const c = makeCanvas(N, N);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(plate, 0, 0);
    const spec = creatureSpecOf(t);
    if (spec) {
      const r = renderCreature(spec, 'pixel');
      const cr = spec.kind === 'egg' ? tintedEgg(r.canvas, spec.el, spec.el2) : cropCanvas(r.canvas, r.pad, BABY_CROP);
      const h = N * cropFor(t.tier);
      const w = (cr.width / cr.height) * h;
      g.drawImage(cr, N / 2 - w / 2, N * 0.93 - h, w, h);
    }
    g.drawImage(pixelOverlay(t), 0, 0);
    if (!size) return c;
    const out2 = makeCanvas(size, size);
    const g2 = out2.getContext('2d');
    g2.imageSmoothingEnabled = false;
    g2.drawImage(c, 0, 0, size, size);
    return out2;
  }
  const W = size ?? TILE_PX;
  const c = makeCanvas(W, W);
  const g = c.getContext('2d');
  g.translate(W / 2, W / 2);
  if (pit) drawPit(g, W, skin);
  g.drawImage(stickerPlate(t, W), -W / 2, -W / 2);
  if (isDen(t)) {
    g.drawImage(stickerMotif(t, W, skin), -W / 2, -W / 2);
    if (out) g.drawImage(pawsCanvas(W), -W / 2, -W / 2);
  }
  const spec = creatureSpecOf(t);
  if (spec) {
    const egg = spec.kind === 'egg';
    const foot = (0.43 - (egg ? PLAQUE.eggLift : 0)) * W; // the creature peeks over the sill; an egg sits up in its nest
    if (isPure(t)) drawTileHalo(g, t.cls.element, W);
    const genImg = generatedTex(spriteId(spec))?.source?.resource;
    if (genImg) {
      const img = egg ? tintedEgg(genImg, spec.el, spec.el2) : genImg;
      const fh = egg ? img.height : Math.round(img.height * GEN_BABY_CROP);
      const s = Math.min((W * genCropFor(t.tier)) / fh, (W * CREATURE_MAX_W) / img.width);
      g.drawImage(img, 0, 0, img.width, fh, (-img.width * s) / 2, foot - fh * s, img.width * s, fh * s);
    } else {
      const r = renderCreature(spec, 'sticker');
      const cr = egg ? tintedEgg(r.canvas, spec.el, spec.el2) : cropCanvas(r.canvas, r.pad, BABY_CROP);
      const h = W * cropFor(t.tier);
      const w = (cr.width / cr.height) * h;
      g.drawImage(cr, -w / 2, foot - h, w, h);
    }
    if (egg) g.drawImage(nestFrontCanvas(W), -W / 2, -W / 2);
  }
  drawBadges(g, t, W);
  drawNumber(g, t.tier, 0, (PLAQUE.numberY - 0.5) * W, W);
  return c;
}

// --- provider -------------------------------------------------------------------------

export function createArt(initial = 'sticker') {
  let style = initial;
  let skin = 'forest'; // the chapter skin: a den's altar is in the keep's own stone
  const cache = new Map();
  const urls = new Map();

  function texture(key, make, nearest) {
    if (!cache.has(key)) {
      const tx = Texture.from(make());
      if (nearest) tx.source.scaleMode = 'nearest';
      cache.set(key, tx);
    }
    return cache.get(key);
  }

  /** The generated sprite for a spec, in sticker style only (pixel keeps its own art). */
  function gen(spec) {
    if (style !== 'sticker') return null;
    const id = spriteId(spec);
    return id ? generatedTex(id) : null;
  }

  /** An element's halo kit: the generated halo.<el>, else the code-drawn one. */
  function haloTex(el) {
    const px = style === 'pixel';
    return gen({ kind: 'halo', apex: el }) ?? texture(`halo.${style}.${el}`, () => renderCreature({ kind: 'halo', apex: el }, px ? 'pixel' : 'sticker').canvas, px);
  }

  /**
   * A 16's generated expression edit (blink, scared), cropped like its base, or null. The edits
   * are of the 16 stage only (asset-catalog: pet.<el>.blink / .scared), so 32–128 keep their own
   * sprite: swapping in the 16's face would drop their stage motif for the moment it shows.
   */
  function face(el, kind) {
    const k = `face.${el}.${kind}`;
    if (!cache.has(k)) {
      const f = generatedTex(`pet.${el}.${kind}`);
      cache.set(k, f ? new Texture({ source: f.source, frame: new Rectangle(0, 0, f.width, Math.round(f.height * GEN_BABY_CROP)) }) : null);
    }
    return cache.get(k);
  }

  return {
    get style() {
      return style;
    },
    setStyle(s) {
      style = s;
    },
    /** The chapter skin ('forest' | 'fareast' | 'peaks'): a den's altar is drawn in its stone. */
    get skin() {
      return skin;
    },
    setSkin(k) {
      skin = k;
    },
    /**
     * A board block's layers (sticker and pixel; blocks.js draws the classic blocks itself). The
     * sticker tile (`plaque`): the plate, a den's `motif` (its altar, while its pet is summoned out),
     * the glyph `badges` as spots (blocks.js draws badge(el) there), the `creature` (an egg in its
     * element's colours, a baby, a fusion pet), an egg's `nestFront`, a 16's `faces` (blink, scared), a
     * pure form's `halo` (blocks.js turns it behind the pet); its numeral comes from number(). The
     * pixel tile keeps its `overlay`.
     */
    tile(t) {
      const px = style === 'pixel';
      const els = [t.cls.element, t.cls.fusion].filter(Boolean).join('+');
      const pure = isPure(t);
      const den = isDen(t);
      const k = `${style}.${t.tier}.${els}${pure ? '.pure' : ''}`;
      const plate = texture(`plate.${k}`, () => (px ? pixelPlate(t) : stickerPlate(t)), px);
      const overlay = px ? texture(`over.${k}${den ? '.den' : ''}`, () => pixelOverlay(t), px) : null;
      const motif = !px && den ? texture(`motif.${els}.${skin}`, () => stickerMotif(t, TILE_PX, skin)) : null;
      const spec = creatureSpecOf(t);
      let creature = null;
      let maxW = Infinity; // code-drawn canvases carry side padding: their height rules
      let crop = cropFor(t.tier);
      let faces = null;
      if (spec) {
        const g = gen(spec);
        if (g) {
          maxW = CREATURE_MAX_W;
          crop = genCropFor(t.tier);
        }
        const ck = `cr.${style}.${JSON.stringify(spec)}${g ? '.gen' : ''}`;
        if (spec.kind === 'egg') {
          // an egg in its element's colours (a fusion egg in both): the generated egg, else the code-drawn one
          creature = texture(ck, () => tintedEgg(g?.source?.resource ?? renderCreature(spec, px ? 'pixel' : 'sticker').canvas, spec.el, spec.el2), px);
        } else if (g) {
          // a baby or a fusion pet peeks over the sill: crop its feet off
          if (!cache.has(ck)) cache.set(ck, new Texture({ source: g.source, frame: new Rectangle(0, 0, g.width, Math.round(g.height * GEN_BABY_CROP)) }));
          creature = cache.get(ck);
          if (spec.kind === 'baby' && spec.stage === 0) faces = { blink: face(spec.el, 'blink'), scared: face(spec.el, 'scared') };
        } else {
          creature = texture(
            ck,
            () => {
              const r = renderCreature(spec, px ? 'pixel' : 'sticker');
              return cropCanvas(r.canvas, r.pad, BABY_CROP);
            },
            px,
          );
        }
      }
      const egg = spec?.kind === 'egg';
      return {
        plate,
        overlay,
        motif,
        creature,
        crop,
        maxW,
        egg,
        plaque: !px,
        badges: px ? null : badgeSpots(t),
        nestFront: !px && egg ? texture('nest.front', () => nestFrontCanvas()) : null,
        faces,
        halo: pure && !den ? haloTex(t.cls.element) : null,
      };
    },
    /**
     * The sticker tile's numeral, drawn at `px` pixels per cell (blocks.js asks for its size on screen,
     * so it stays crisp) and `size` cells tall (numberFit: its design size, or its 14 px floor).
     */
    number(tier, px, size = null) {
      const em = size ?? numberEm(numberText(tier).length);
      return texture(`num.${tier}.${px}.${em.toFixed(4)}`, () => numberCanvas(tier, px, em));
    },
    /** A glyph badge: the generated badge.<el>, else the code-drawn one (2.35 r wide, like the generated); with `el2`, a fusion's split badge. */
    badge(el, el2 = null) {
      if (el2) return texture(`badge.${el}|${el2}`, () => badgeCanvas(el, 82, el2)); // 192 px, the generated badges' size
      return generatedTex(`badge.${el}`) ?? texture(`badge.${el}`, () => badgeCanvas(el));
    },
    /** A den's paw prints, the "out" mark of its summoned pet (cell-sized, over the plate). */
    paws() {
      return texture('paws', () => pawsCanvas());
    },
    /** The whole tile in its pit, `px` pixels square, in this style and chapter skin (the inspect card's picture). */
    tileCanvas(t, px) {
      return composeTileCanvas(t, style, { px, pit: true, skin, out: isDen(t) });
    },
    /** A summoned pet's full body (a pure form's code-drawn stand-in wears its gold trim); a single (never summoned by the rules) its grown baby. */
    roamer(cls) {
      const px = style === 'pixel';
      const spec = cls.fusion ? { kind: 'fusion', a: cls.element, b: cls.fusion, legendary: !!cls.pure } : { kind: 'baby', el: cls.element, stage: 3 };
      return gen(spec) ?? texture(`roam.${style}.${JSON.stringify(spec)}`, () => renderCreature(spec, px ? 'pixel' : 'sticker').canvas, px);
    },
    /**
     * How to stand a roamer texture: `feet` = anchor y (share of its height), `height` =
     * display height of the texture in cells, `maxW` = widest it may get, in cells; a generated
     * pet also brings its roster `view` and `move` (generatedRoamerFit). Code-drawn canvases carry
     * padding (and flip and walk like the old pets); generated sprites are trimmed to the creature.
     * The creature itself stands ROAMER_CELLS tall (a pure form: `legend`): smaller than a boss, so
     * it never hides the fight.
     */
    roamerFit(cls) {
      const legend = !!cls.pure;
      const k = legend ? ROAMER_CELLS.legend : ROAMER_CELLS.fusion;
      if (!cls.fusion) return { feet: gen({ kind: 'baby', el: cls.element, stage: 3 }) ? 0.97 : 0.89, height: k * 0.9, maxW: k * ROAMER_MAX_W, view: 'front', move: 'leap' };
      if (gen({ kind: 'fusion', a: cls.element, b: cls.fusion })) return generatedRoamerFit(cls);
      return { feet: 0.89, height: k * (legend ? ROAMER_PAD.legend : ROAMER_PAD.fusion), maxW: Infinity };
    },
    /** An element's halo kit (a pure form wears its main element's): the generated halo.<el>, else the code-drawn one. */
    halo: haloTex,
    /** A fusion pet's namecard portrait (a pure form's ascended edit, when made). */
    portrait(cls) {
      const k = `${cls.element}.${cls.fusion}.${cls.pure ? 'pure' : ''}`;
      if (style === 'sticker') {
        const id = portraitId(cls);
        const url = (cls.pure && generatedUrl(`${id}.ascended`)) || generatedUrl(id);
        if (url) return url;
      }
      if (!urls.has(k)) urls.set(k, renderPortrait(cls.element, cls.fusion, { legendary: !!cls.pure, apex: cls.pure ? cls.element : null }).toDataURL('image/png'));
      return urls.get(k);
    },
  };
}
