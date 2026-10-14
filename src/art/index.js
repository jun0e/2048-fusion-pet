// Art provider for the key-visual demo: Pixi textures for each layer, cached per style.
//   tile(t)      → { plate, creature, overlay, crop, egg } for a board block
//   roamer(cls)  → full-body fusion texture (the creature that leaves its den)
//   halo(apex)   → the legendary's apex kit
//   portrait(cls)→ data URL of the soft-vinyl namecard portrait (DOM)
// Styles: 'sticker' (recommended), 'pixel' (comparison), 'classic' (the old blocks).
// Tile layout (style brief): plate, then the creature peeking over the bottom
// sill, then the number up top (dark fill, cream stroke), then a glyph badge.
import { Texture } from 'pixi.js';
import { tierValue } from '../config.js';
import { ELEMENTS, fusionOf } from '../sim/classes.js';
import { INK, CREAM, GOLD, tone } from './tokens.js';
import { drawBadge, glyphPath } from './glyphs.js';
import { makeCanvas, renderCreature, renderPortrait, quantize } from './creatures.js';

const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';
export const TILE_PX = 160; // sticker tile texture (same as the classic BLOCK_PX)
export const PIXEL_TILE = 36; // pixel tile grid
const BABY_CROP = 0.76; // a baby shows its top 76%: it peeks over the tile's bottom edge

/** Display height of the creature, as a fraction of the cell: grows 16 → 128. */
export const cropFor = (tier) => (tier < 4 ? 0.64 : [0.78, 0.84, 0.9, 0.96][Math.min(3, tier - 4)]); // head ≈ 39 → 48% of the tile

const plateColor = (t) => {
  if (t.tier < 4) return '#f2dfc2';
  const fu = fusionOf(t.cls);
  if (fu) return tone(fu.color, 0.18);
  return tone(ELEMENTS[t.cls.element]?.color ?? '#d9d2c5', 0.42);
};

// --- sticker tiles ----------------------------------------------------------------

function stickerPlate(t) {
  const W = TILE_PX;
  const c = makeCanvas(W, W);
  const g = c.getContext('2d');
  const pad = 8;
  const size = W - pad * 2;
  const r = 26;
  const fu = t.tier >= 8 ? fusionOf(t.cls) : null;
  const legend = !!t.cls.ultimate;
  g.fillStyle = 'rgba(25,15,35,0.38)';
  g.beginPath();
  g.roundRect(pad + 2, pad + 7, size, size, r);
  g.fill();
  g.save();
  g.beginPath();
  g.roundRect(pad, pad, size, size, r);
  g.clip();
  const base = plateColor(t);
  g.fillStyle = base;
  g.fillRect(pad, pad, size, size);
  if (fu) {
    // a den: split plate in the fusion colour and its motif parent's colour
    g.fillStyle = tone(ELEMENTS[t.cls.fusion].color, 0.25);
    g.beginPath();
    g.moveTo(pad + size * 0.62, pad + size);
    g.lineTo(pad + size, pad + size * 0.62);
    g.lineTo(pad + size, pad + size);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(43,29,46,0.22)';
    g.beginPath();
    g.ellipse(W / 2, pad + size * 0.86, size * 0.3, size * 0.09, 0, 0, Math.PI * 2);
    g.fill();
  }
  // flat two-tone bevel: a lighter top band, a darker bottom lip
  g.fillStyle = 'rgba(255,255,255,0.34)';
  g.beginPath();
  g.roundRect(pad + 8, pad + 6, size - 16, size * 0.3, r - 10);
  g.fill();
  g.fillStyle = 'rgba(43,29,46,0.16)';
  g.fillRect(pad, pad + size - 12, size, 12);
  g.restore();
  g.lineWidth = legend ? 7 : 5;
  g.strokeStyle = legend ? GOLD : INK;
  g.beginPath();
  g.roundRect(pad, pad, size, size, r);
  g.stroke();
  if (legend) {
    g.lineWidth = 2.5;
    g.strokeStyle = INK;
    g.beginPath();
    g.roundRect(pad - 3, pad - 3, size + 6, size + 6, r + 3);
    g.stroke();
  }
  return c;
}

function numberText(tier) {
  return String(tierValue(tier));
}

function stickerOverlay(t) {
  const W = TILE_PX;
  const c = makeCanvas(W, W);
  const g = c.getContext('2d');
  const text = numberText(t.tier);
  const den = t.tier >= 8 && t.cls.fusion;
  const px = den ? [0, 64, 64, 56, 46][text.length] : [0, 62, 62, 50, 42][text.length];
  const cy = den ? W * 0.5 : W * 0.33;
  g.font = `800 ${px}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  // dark numeral, cream outer stroke: 4.95–13.4:1 on every plate (the brief's contrast fix)
  g.lineWidth = px * 0.26;
  g.strokeStyle = CREAM;
  g.strokeText(text, W / 2, cy);
  g.fillStyle = INK;
  g.fillText(text, W / 2, cy);
  const r = 17;
  if (den) {
    drawBadge(g, t.cls.element, 8 + r + 4, W - 8 - r - 4, r, ELEMENTS[t.cls.element].color, INK);
    drawBadge(g, t.cls.fusion, W - 8 - r - 4, W - 8 - r - 4, r, ELEMENTS[t.cls.fusion].color, INK);
    if (t.cls.ultimate) drawBadge(g, t.cls.ultimate, W / 2, 8 + r + 2, r * 0.9, ELEMENTS[t.cls.ultimate].color, INK);
  } else if (t.tier >= 4 && t.cls.element) {
    drawBadge(g, t.cls.element, W - 8 - r - 2, W - 8 - r - 2, r, ELEMENTS[t.cls.element].color, INK);
  }
  return c;
}

function cropCanvas(src, fromTop, frac) {
  const h = Math.round(fromTop + (src.height - fromTop * 2) * frac);
  const c = makeCanvas(src.width, h);
  c.getContext('2d').drawImage(src, 0, 0);
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
  const legend = !!t.cls.ultimate;
  const fu = t.tier >= 8 ? fusionOf(t.cls) : null;
  pxRect(g, 1, 2, G - 2, G - 2, 'rgba(25,15,35,0.45)');
  pxRect(g, 1, 1, G - 2, G - 2, legend ? GOLD : INK);
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
  const den = t.tier >= 8 && t.cls.fusion;
  pixelNumber(g, numberText(t.tier), G / 2, den ? G * 0.46 : t.tier < 4 ? G * 0.3 : G * 0.25, G - 6);
  if (den) {
    pixelBadge(g, t.cls.element, 8, G - 8);
    pixelBadge(g, t.cls.fusion, G - 8, G - 8);
    if (t.cls.ultimate) pixelBadge(g, t.cls.ultimate, G / 2, 8);
  } else if (t.tier >= 4 && t.cls.element) pixelBadge(g, t.cls.element, G - 8, G - 8);
  return c;
}

/** Just the plate (and optionally its number/badge overlay) of a tile, for the asset page. */
export function plateCanvas(t, style = 'sticker', withOverlay = false) {
  const px = style === 'pixel';
  const plate = px ? pixelPlate(t) : stickerPlate(t);
  if (!withOverlay) return plate;
  const c = makeCanvas(plate.width, plate.height);
  const g = c.getContext('2d');
  g.drawImage(plate, 0, 0);
  g.drawImage(px ? pixelOverlay(t) : stickerOverlay(t), 0, 0);
  return c;
}

/** A whole sticker or pixel tile as one canvas (plate, creature, number, badge): for the guide. */
export function composeTileCanvas(t, style = 'sticker') {
  const px = style === 'pixel';
  const plate = px ? pixelPlate(t) : stickerPlate(t);
  const over = px ? pixelOverlay(t) : stickerOverlay(t);
  const W = plate.width;
  const c = makeCanvas(W, W);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = !px;
  g.drawImage(plate, 0, 0);
  if (t.tier < 8 || !t.cls.fusion) {
    const spec = t.tier < 4 ? { kind: 'egg', tier: Math.max(1, Math.min(3, t.tier)) } : { kind: 'baby', el: t.cls.element, stage: Math.min(3, t.tier - 4) };
    const r = renderCreature(spec, px ? 'pixel' : 'sticker');
    const cr = spec.kind === 'egg' ? r.canvas : cropCanvas(r.canvas, r.pad, BABY_CROP);
    const h = W * cropFor(t.tier);
    const w = (cr.width / cr.height) * h;
    g.drawImage(cr, W / 2 - w / 2, W * 0.93 - h, w, h);
  }
  g.drawImage(over, 0, 0);
  return c;
}

// --- provider -------------------------------------------------------------------------

export function createArt(initial = 'sticker') {
  let style = initial;
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

  function creatureSpec(t) {
    if (t.tier < 4) return { kind: 'egg', tier: Math.max(1, Math.min(3, t.tier)) };
    if (t.tier >= 8 && t.cls.fusion) return null; // the creature is out roaming; the tile is its den
    return { kind: 'baby', el: t.cls.element ?? 'earth', stage: Math.min(3, t.tier - 4) };
  }

  return {
    get style() {
      return style;
    },
    setStyle(s) {
      style = s;
    },
    tile(t) {
      const px = style === 'pixel';
      const els = [t.cls.element, t.cls.fusion, t.cls.ultimate].filter(Boolean).join('+');
      const k = `${style}.${t.tier}.${els}`;
      const plate = texture(`plate.${k}`, () => (px ? pixelPlate(t) : stickerPlate(t)), px);
      const overlay = texture(`over.${k}`, () => (px ? pixelOverlay(t) : stickerOverlay(t)), px);
      const spec = creatureSpec(t);
      let creature = null;
      if (spec) {
        const ck = `cr.${style}.${JSON.stringify(spec)}`;
        creature = texture(
          ck,
          () => {
            const r = renderCreature(spec, px ? 'pixel' : 'sticker');
            return spec.kind === 'egg' ? r.canvas : cropCanvas(r.canvas, r.pad, BABY_CROP);
          },
          px,
        );
      }
      return { plate, overlay, creature, crop: cropFor(t.tier), egg: t.tier < 4 };
    },
    roamer(cls) {
      const px = style === 'pixel';
      const spec = { kind: 'fusion', a: cls.element, b: cls.fusion, legendary: !!cls.ultimate };
      return texture(`roam.${style}.${spec.a}.${spec.b}.${spec.legendary}`, () => renderCreature(spec, px ? 'pixel' : 'sticker').canvas, px);
    },
    halo(apex) {
      const px = style === 'pixel';
      return texture(`halo.${style}.${apex}`, () => renderCreature({ kind: 'halo', apex }, px ? 'pixel' : 'sticker').canvas, px);
    },
    portrait(cls) {
      const k = `${cls.element}.${cls.fusion}.${cls.ultimate ?? ''}`;
      if (!urls.has(k)) urls.set(k, renderPortrait(cls.element, cls.fusion, { legendary: !!cls.ultimate, apex: cls.ultimate ?? null }).toDataURL('image/png'));
      return urls.get(k);
    },
  };
}

