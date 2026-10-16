// Tile state sample sheet (review only: nothing in src/ changes). Served by the dev server at
// /reports/art/tiles/samples.html. Every sample is drawn twice, with the REAL generated sprites
// (public/assets/gen, via /assets/manifest.json):
//   CURRENT   a faithful port of today's tile: src/art/index.js stickerPlate + stickerOverlay
//             (same numbers, drawn at the sheet's resolution instead of the 160 px texture) and
//             the per-frame rules of src/render/blocks.js (glow, milestone border, selection,
//             hit tint, muzzle flash, pop, wind-up poses, leap), with the keep pit of
//             src/render/frame.js drawKeep behind it;
//   PROPOSED  the overhauled plaque (reports/art/tiles/tile-spec.md).
// Only canvas 2D: no Pixi, so the sheet renders the same in headless Chromium (tools/capture.mjs).
import { ELEMENTS, ELEMENT_KEYS, fusionOf, milestonePieces, growthOf, APEX, FUSIONS } from '/src/sim/classes.js';
import { INK, CREAM, GOLD, BLUSH, tone, mix, luminance, contrast, petName } from '/src/art/tokens.js';
import { tierValue } from '/src/config.js';
import { TILE_GLOW, HIT_TINT } from '/src/ux/photosafe.js';
import { CHAPTER_SKINS } from '/src/art/frame-kit.js';
import { petPose, ladderStage, leapAt } from '/src/art/attack-vfx.js';
import { describeTile } from '/src/sim/describe.js';

const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';
const DPR = 2; // every canvas is backed at 2×, like a phone
const CELL = 140; // 2× the 70 px cell of a 390 px phone
const SKIN = CHAPTER_SKINS.forest; // floor #3E3C58, pit #35334E
const TAU = Math.PI * 2;
const ease = (t) => 1 - (1 - t) ** 3;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// --- the sprites -----------------------------------------------------------------------------------
let files = {};
const images = new Map();
async function loadManifest() {
  const res = await fetch('/assets/manifest.json', { cache: 'no-store' });
  files = (await res.json()).files ?? {};
}
/** The generated image for a catalog id (pet.fire.16, badge.ice, …), or null when it does not exist. */
function img(id) {
  if (!files[id]) return null;
  if (!images.has(id)) {
    images.set(
      id,
      new Promise((resolve) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => resolve(null);
        i.src = '/assets/' + files[id];
      }),
    );
  }
  return images.get(id);
}
const loaded = new Map(); // id → HTMLImageElement, once preloaded
async function preload(ids) {
  await Promise.all(ids.map(async (id) => loaded.set(id, await img(id))));
}
const pic = (id) => loaded.get(id) ?? null;

// --- numbers shared with the game (src/art/index.js, src/render/blocks.js, src/render/frame.js) ----
const EGG_PLATE = ['#f2dfc2', '#f2d3ad', '#f3c597']; // index.js: cream 2 → sand 4 → apricot 8
const GEN_EGG_CROP = [0.5, 0.55, 0.6]; // index.js genCropFor: eggs
const GEN_BABY_CROP_H = [0.56, 0.6, 0.64, 0.68]; // index.js genCropFor: 16 → 128
const GEN_BABY_CROP = 0.84; // index.js: a generated baby shows its top 84% (feet hidden by the sill)
const CREATURE_MAX_W = 0.9; // index.js
const eggIndex = (tier) => Math.max(0, Math.min(2, tier - 1));
const genCropFor = (tier) => (tier < 4 ? GEN_EGG_CROP[eggIndex(tier)] : GEN_BABY_CROP_H[Math.min(3, tier - 4)]);
const plateColorCurrent = (t) => {
  if (t.tier < 4) return EGG_PLATE[eggIndex(t.tier)];
  const fu = fusionOf(t.cls);
  if (fu) return tone(fu.color, 0.18);
  return tone(ELEMENTS[t.cls.element]?.color ?? '#d9d2c5', 0.42);
};
const spriteFor = (t, variant = null) => {
  if (t.tier < 4) return `egg.${[2, 4, 8][eggIndex(t.tier)]}`;
  if (t.tier >= 8 && t.cls.fusion) return null; // the pet is out roaming; the tile is its den
  const el = t.cls.element ?? 'earth';
  if (variant) return `pet.${el}.${variant}`;
  return `pet.${el}.${[16, 32, 64, 128][Math.min(3, t.tier - 4)]}`;
};
const classOf = (t) => (t.cls.ultimate ? 'apex' : t.cls.fusion && t.tier >= 8 ? 'fusion' : t.cls.element && t.tier >= 4 ? 'single' : 'plain');

// --- the keep pit (frame.js drawKeep, U = C / 2) ------------------------------------------------------
function drawFloor(g, w, h) {
  g.fillStyle = SKIN.floor;
  g.fillRect(0, 0, w, h);
}
/** The flagstone pit, centred on the origin. `radius` in cells: today 0.07 (pitR = 0.14 U); proposed 0.12. */
function drawPit(g, C, radius = 0.07) {
  const pit = C * 0.9;
  const pitR = radius * C;
  const lip = Math.max(1.5, 0.035 * C);
  const x = -pit / 2;
  const y = -pit / 2;
  g.save();
  g.beginPath();
  g.roundRect(x, y, pit, pit, pitR);
  g.fillStyle = SKIN.pit;
  g.fill();
  g.clip();
  g.fillStyle = tone(SKIN.pit, -0.3);
  g.fillRect(x + pitR, y + 1, pit - pitR * 2, lip); // inner shadow under the top edge
  g.fillRect(x + 1, y + pitR, lip, pit - pitR * 2);
  g.fillStyle = tone(SKIN.floor, 0.16);
  g.fillRect(x + pitR, y + pit - lip - 1, pit - pitR * 2, lip); // the lit lip
  g.restore();
  g.beginPath();
  g.roundRect(x, y, pit, pit, pitR);
  g.lineWidth = 1;
  g.strokeStyle = INK;
  g.stroke();
}

// --- helpers ----------------------------------------------------------------------------------------
function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
/** A multiply-tinted copy of a canvas (Pixi's sprite.tint): rgb × tint, alpha kept. */
function tintedCopy(src, tint) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = tint;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(src, 0, 0);
  return c;
}
/** A white silhouette of a canvas (blocks.js whiteOf): the muzzle flash. */
function whiteCopy(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
const hexOf = (n) => '#' + n.toString(16).padStart(6, '0');
/** blocks.js mixColor on hex strings. */
const mixHex = (a, b, k) => mix(a, b, k);

/** An offscreen canvas `size` CSS px square at DPR, origin at its centre; `draw(g)` fills it. */
function offscreen(size, draw) {
  const c = document.createElement('canvas');
  c.width = Math.round(size * DPR);
  c.height = Math.round(size * DPR);
  const g = c.getContext('2d');
  g.scale(DPR, DPR);
  g.translate(size / 2, size / 2);
  draw(g);
  return c;
}
/** Draw an offscreen canvas (made by `offscreen`) centred at the origin, in CSS px. */
function blit(g, c, alpha = 1, sx = 1, sy = 1, dx = 0, dy = 0) {
  const w = c.width / DPR;
  const h = c.height / DPR;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(dx, dy);
  g.scale(sx, sy);
  g.drawImage(c, -w / 2, -h / 2, w, h);
  g.restore();
}

/** The generated badge, as src/art/glyphs.js drawBadge draws it (2.35 r wide). */
function drawBadge(g, el, cx, cy, r) {
  const im = pic(`badge.${el}`);
  if (!im) {
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.fillStyle = ELEMENTS[el].color;
    g.fill();
    g.lineWidth = Math.max(1.5, r * 0.22);
    g.strokeStyle = INK;
    g.stroke();
    return;
  }
  const s = r * 2.35;
  const k = s / Math.max(im.width, im.height);
  g.drawImage(im, cx - (im.width * k) / 2, cy - (im.height * k) / 2, im.width * k, im.height * k);
}

const numberText = (tier) => String(tierValue(tier));

// --- the creature layer (shared: both looks place the creature the same way) -----------------------------
/**
 * blocks.js: the creature peeks over the sill, anchored (0.5, 1) at y = 0.43 cells below the centre;
 * babies bob (8.4 rad/s for 16–32, 6 for 64–128; 5% / 3.5%), eggs wobble; the attack's wind-up and
 * follow-through come from attack-vfx.js petPose; Pride Pounce leaps with an afterimage from 32.
 */
function drawCreature(g, C, t, st, id, { popS = 1, punch = 0, pop = 0, time = 0, tileId = 1 } = {}) {
  const im = pic(id);
  if (!im) return;
  const egg = t.tier < 4;
  const frameH = egg ? im.height : Math.round(im.height * GEN_BABY_CROP);
  const crop = genCropFor(t.tier);
  const cs = Math.min((C * crop) / frameH, (C * CREATURE_MAX_W) / im.width) * popS;
  const stage = Math.max(0, t.tier - 4);
  const w = egg ? 3 : stage < 2 ? 8.4 : 6;
  const amp = egg ? 0 : stage < 2 ? 0.05 : 0.035;
  const ph = Math.sin(time * w + tileId * 1.7);
  const squash = Math.sin(pop * Math.PI) * 0.22 + punch * 0.08;
  let sx = cs * (1 - amp * 0.6 * ph + squash * 0.5);
  let sy = cs * (1 + amp * ph - squash);
  let x = 0;
  let y = C * 0.43 * popS;
  let rot = egg ? Math.sin(time * (t.tier >= 3 ? 9 : 2.4) + tileId) * (t.tier >= 3 ? 0.06 : 0.03) * (t.tier >= 3 && Math.sin(time * 0.9 + tileId) > 0.4 ? 1 : 0.4) : 0;
  if (!egg && (st.wind || st.follow)) {
    const pose = petPose(ladderStage(t.tier), smooth(st.wind ?? 0), st.follow ?? 0, st.aim ?? { x: 0, y: 1 });
    sx *= pose.sx;
    sy *= pose.sy;
    x += pose.x * C;
    y -= pose.y * C;
    rot += pose.rot;
  }
  if (st.leapK != null) {
    // blocks.js: position += leap.dx * k * U, −(leap.dy * k + lift) * U, U = C / 2
    const L = { k: smooth(st.leapK), lift: Math.sin(Math.min(1, st.leapK) * Math.PI) * 0.7 };
    const U = C / 2;
    const ghosts = st.ghosts ?? 0;
    for (let i = ghosts; i >= 1; i--) {
      const kk = Math.max(0, st.leapK - 0.09 * i);
      const Lg = { k: smooth(kk), lift: Math.sin(Math.min(1, kk) * Math.PI) * 0.7 };
      g.save();
      g.globalAlpha *= 0.5 / i;
      g.translate(x + (st.leapDx ?? 0) * Lg.k * U, y - ((st.leapDy ?? 0) * Lg.k + Lg.lift) * U);
      g.rotate(rot);
      g.scale(sx, sy);
      g.drawImage(whiteCopyImg(im, frameH), -im.width / 2, -frameH, im.width, frameH);
      g.restore();
    }
    x += (st.leapDx ?? 0) * L.k * U;
    y -= ((st.leapDy ?? 0) * L.k + L.lift) * U;
  }
  if (st.creatureDy) y += st.creatureDy * C;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(sx, sy);
  g.drawImage(im, 0, 0, im.width, frameH, -im.width / 2, -frameH, im.width, frameH);
  g.restore();
}
const whiteImgs = new Map();
function whiteCopyImg(im, frameH) {
  const key = im.src + ':' + frameH;
  if (!whiteImgs.has(key)) {
    const c = document.createElement('canvas');
    c.width = im.width;
    c.height = frameH;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, im.width, frameH, 0, 0, im.width, frameH);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    whiteImgs.set(key, c);
  }
  return whiteImgs.get(key);
}

// =====================================================================================================
// CURRENT: src/art/index.js stickerPlate / stickerOverlay + src/render/blocks.js, ported 1:1
// =====================================================================================================
/** stickerPlate (TILE_PX 160 → one cell): the plate texture, origin at the tile centre. */
function currentPlate(g, C, t) {
  const k = C / 160;
  const W = C;
  const pad = 8 * k;
  const size = W - pad * 2;
  const r = 26 * k;
  const fu = t.tier >= 8 ? fusionOf(t.cls) : null;
  const legend = !!t.cls.ultimate;
  g.save();
  g.translate(-W / 2, -W / 2);
  g.fillStyle = 'rgba(25,15,35,0.38)';
  roundRectPath(g, pad + 2 * k, pad + 7 * k, size, size, r);
  g.fill();
  g.save();
  roundRectPath(g, pad, pad, size, size, r);
  g.clip();
  g.fillStyle = plateColorCurrent(t);
  g.fillRect(pad, pad, size, size);
  if (fu) {
    g.fillStyle = tone(ELEMENTS[t.cls.fusion].color, 0.25);
    g.beginPath();
    g.moveTo(pad + size * 0.62, pad + size);
    g.lineTo(pad + size, pad + size * 0.62);
    g.lineTo(pad + size, pad + size);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(43,29,46,0.22)';
    g.beginPath();
    g.ellipse(W / 2, pad + size * 0.86, size * 0.3, size * 0.09, 0, 0, TAU);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.34)';
  roundRectPath(g, pad + 8 * k, pad + 6 * k, size - 16 * k, size * 0.3, r - 10 * k);
  g.fill();
  g.fillStyle = 'rgba(43,29,46,0.16)';
  g.fillRect(pad, pad + size - 12 * k, size, 12 * k);
  g.restore();
  g.lineWidth = (legend ? 7 : 5) * k;
  g.strokeStyle = legend ? GOLD : INK;
  roundRectPath(g, pad, pad, size, size, r);
  g.stroke();
  if (legend) {
    g.lineWidth = 2.5 * k;
    g.strokeStyle = INK;
    roundRectPath(g, pad - 3 * k, pad - 3 * k, size + 6 * k, size + 6 * k, r + 3 * k);
    g.stroke();
  }
  g.restore();
}
/** stickerOverlay: the number (ink, cream stroke) and the glyph badges. */
function currentOverlay(g, C, t, { numberScaleX = 1 } = {}) {
  const k = C / 160;
  const W = C;
  g.save();
  g.translate(-W / 2, -W / 2);
  const text = numberText(t.tier);
  const den = t.tier >= 8 && t.cls.fusion;
  const px = (den ? [0, 64, 64, 56, 46] : [0, 62, 62, 50, 42])[text.length] * k;
  const cy = den ? W * 0.5 : W * 0.33;
  g.save();
  g.translate(W / 2, cy);
  g.scale(numberScaleX, 1);
  g.font = `800 ${px}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = px * 0.26;
  g.strokeStyle = CREAM;
  g.strokeText(text, 0, 0);
  g.fillStyle = INK;
  g.fillText(text, 0, 0);
  g.restore();
  const r = 17 * k;
  if (den) {
    drawBadge(g, t.cls.element, 8 * k + r + 4 * k, W - 8 * k - r - 4 * k, r);
    drawBadge(g, t.cls.fusion, W - 8 * k - r - 4 * k, W - 8 * k - r - 4 * k, r);
    if (t.cls.ultimate) drawBadge(g, t.cls.ultimate, W / 2, 8 * k + r + 2 * k, r * 0.9);
  } else if (t.tier >= 4 && t.cls.element) {
    drawBadge(g, t.cls.element, W - 8 * k - r - 2 * k, W - 8 * k - r - 2 * k, r);
  }
  g.restore();
}
/** blocks.js drawMilestone (U = C / 2): one piece per merge toward the next milestone. */
function currentMilestone(g, C, tier) {
  const lit = milestonePieces(tier);
  if (lit < 0) return;
  const U = C / 2;
  const half = C * 0.43;
  const inset = C * 0.13;
  const w = 0.12 * U;
  const sides = [
    [-half + inset, -half, half - inset, -half],
    [half, -half + inset, half, half - inset],
    [half - inset, half, -half + inset, half],
    [-half, half - inset, -half, -half + inset],
  ];
  const goal = tier < 8 ? '#ffe27a' : '#ffb3ff';
  g.lineCap = 'round';
  sides.forEach(([x0, y0, x1, y1], i) => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.lineWidth = w + 0.07 * U;
    g.strokeStyle = 'rgba(42,28,34,0.85)';
    g.stroke();
    g.lineWidth = w;
    g.strokeStyle = i < lit ? goal : '#ffffff';
    g.globalAlpha = i < lit ? 1 : 0.22;
    g.stroke();
    g.globalAlpha = 1;
  });
}
const currentPlates = new Map();
const currentPlateCanvas = (C, t) => {
  const key = `${C}|${t.tier}|${t.cls.element}|${t.cls.fusion}|${t.cls.ultimate}`;
  if (!currentPlates.has(key)) currentPlates.set(key, offscreen(C * 1.1, (g) => currentPlate(g, C, t)));
  return currentPlates.get(key);
};

/** One tile as blocks.js draws it, origin at the cell's centre. st: the view state (see SAMPLES). */
function drawCurrentTile(g, C, t, st) {
  const U = C / 2;
  const time = st.time ?? 0.8;
  const pop = st.pop ?? 0;
  const punch = st.punch ?? 0;
  const appear = st.appear ?? 1;
  const popS = appear < 1 ? ease(appear) : 1 + Math.sin(pop * Math.PI) * 0.18;
  const shudder = st.shudder ?? 0;
  g.save();
  if (shudder > 0) g.translate(Math.sin(time * 90 + 1) * 0.06 * U * shudder, 0);
  // class glow: a soft dot under the tile (glowLayer), at most TILE_GLOW.glow, × 0.3 with creature art
  const els = t.tier >= 4 ? [t.cls.element, t.cls.fusion, t.cls.ultimate].filter(Boolean) : [];
  if (els.length && !st.noGlow) {
    const col = els[Math.floor(time * 1.5) % els.length];
    const fu = els.length === 2 ? fusionOf(t.cls) : null;
    const tint = fu ? fu.color : ELEMENTS[col].color;
    const big = els.length === 3 ? 1.9 : els.length === 2 ? 1.6 : 1.4;
    const d = C * big * popS * (1 + 0.06 * Math.sin(time * 4 + 1));
    const a = Math.min(TILE_GLOW.glow, (els.length === 3 ? 0.6 : els.length === 2 ? 0.42 : 0.26) * 0.3);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, d / 2);
    gr.addColorStop(0, tint);
    gr.addColorStop(0.35, tint);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.globalAlpha = a;
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, d / 2, 0, TAU);
    g.fill();
    g.restore();
  }
  const ghostK = st.ghost ?? st.remove?.k;
  if (ghostK != null) {
    // a removed block (sold, broken, destroyed): blocks.js ghosts shrink and fade over SLIDE
    const kk = ease(ghostK);
    g.scale(1 - kk, 1 - kk);
    g.globalAlpha *= 1 - kk;
  }
  // body (the plate), tinted by the hit or the heal, scaled by the pop and the punch
  let plate = currentPlateCanvas(C, t);
  const hurt = st.hurt ?? 0;
  const healed = st.healed ?? 0;
  const tint = hurt > 0.02 ? mixHex('#ffffff', '#ff6a6a', hurt) : healed > 0.02 ? mixHex('#ffffff', '#8dff9d', healed * TILE_GLOW.heal) : null;
  if (tint) plate = tintedCopy(plate, tint);
  const s = popS * (1 + punch * 0.07);
  blit(g, plate, 1, s, s * (1 - punch * 0.05));
  // creature (between the plate and the overlay)
  const id = spriteFor(t);
  if (id) drawCreature(g, C, t, st, id, { popS, punch, pop, time });
  // overlay: number + badges (scaled with the body)
  g.save();
  g.scale(s, s * (1 - punch * 0.05));
  currentOverlay(g, C, t, { numberScaleX: st.numberScaleX ?? 1 });
  g.restore();
  // muzzle flash: the plate's white silhouette, normal blend, at most TILE_GLOW.muzzle
  if (punch > 0) blit(g, whiteCopy(currentPlateCanvas(C, t)), punch * TILE_GLOW.muzzle, s, s * (1 - punch * 0.05));
  currentMilestone(g, C, t.tier);
  // ultimate charge ring
  if (t.cls.ultimate && st.charge != null) {
    g.beginPath();
    g.arc(0, 0, C * 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * st.charge);
    g.lineWidth = 0.09 * U;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,226,122,0.95)';
    g.stroke();
  }
  // picked: a pulsing gold frame (size breathes at 1.3 Hz)
  if (st.selected) {
    const half = C * (0.5 + 0.03 * Math.sin(time * 8));
    roundRectPath(g, -half, -half, half * 2, half * 2, 0.36 * U);
    g.lineWidth = 0.12 * U;
    g.strokeStyle = 'rgba(255,211,74,0.95)';
    g.stroke();
    g.lineWidth = 0.04 * U;
    g.strokeStyle = '#ffffff';
    g.stroke();
  }
  g.restore();
}

// =====================================================================================================
// PROPOSED: the clay plaque seated in the flagstone pit (tile-spec.md)
// =====================================================================================================
export const P = {
  tile: 0.86, // the plaque, in cells (the pit is 0.9: a 0.02-cell groove shows all round)
  pitR: 0.12, // the pit's corner radius the plaque is cut to match (ask to the frame owner: pitR = L(0.24))
  r: 0.11, // the plaque's corner radius
  outline: 0.028, // ink
  lip: 0.085, // of the plaque: the one cel tone along its foot
  highlight: 0.3, // of the plaque: the flat lighter band at the top
  meterY: 0.075, // of the plaque, from its top edge: the growth meter's centre
  meterW: 0.5,
  meterH: 0.045,
  numberY: 0.335, // of the cell, from the top: the number's centre (every tile, dens too; the guide's 33%)
  eggLift: 0.04, // of the cell: an egg sits in its nest, a little above the sill
  numberPx: [0, 0.3875, 0.3875, 0.3125, 0.2625], // of the cell, by digit count (index.js: 62 / 62 / 50 / 42 of 160)
  badgeR: 0.10625, // of the cell (17 / 160)
  // the den motifs, of the plaque: blocks [half-width, top, height]; `seat` is where the crystal (a
  // den) or the apex badge inside its halo (a legend) sits; merlon [w, h]; door [half-width, top]
  altar: { plinth: [0.235, 0.35, 0.055], body: [0.19, 0.22, 0.135], slab: [0.215, 0.175, 0.05], seat: 0.075, crystal: [0.17, 0.21] },
  tower: { body: [0.165, 0.14, 0.265], merlon: [0.075, 0.07], door: [0.07, 0.29], seat: 0.205 },
  haloW: 0.42, // of the plaque: a legend's halo stands around the apex badge on its seat
  denFloor: 0.25, // the least relative luminance a den plate may have (ink stays ≥ 4.6:1 on it)
  castShadow: [0.02, 0.035], // the plaque's shadow in the pit (cells)
  bracket: { offset: 0.045, arm: 0.16, width: 0.04, breathe: 0.012 },
};

/** The den plate: tone(fusion, 0.18) as today, lifted (in 0.02 steps) until its luminance reaches the floor. */
export function denPlateColor(color) {
  let k = 0.18;
  let c = tone(color, k);
  while (luminance(c) < P.denFloor && k < 0.9) {
    k += 0.02;
    c = tone(color, k);
  }
  return c;
}
export function plateColorProposed(t) {
  if (t.tier < 4) return EGG_PLATE[eggIndex(t.tier)];
  const fu = fusionOf(t.cls);
  if (fu && t.tier >= 8) return denPlateColor(fu.color);
  return tone(ELEMENTS[t.cls.element]?.color ?? '#d9d2c5', 0.42);
}

function strawStroke(g, x, y, len, angle, w, color) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.lineCap = 'round';
  g.lineWidth = w + 2;
  g.strokeStyle = 'rgba(43,29,46,0.55)';
  g.beginPath();
  g.moveTo(-len / 2, 0);
  g.lineTo(len / 2, 0);
  g.stroke();
  g.lineWidth = w;
  g.strokeStyle = color;
  g.stroke();
  g.restore();
}

/** The static plaque: body, cel tone, outline, meter, nest or den (altar or tower, with a legend's halo). Origin at the cell's centre. */
function proposedPlaque(g, C, t, { motif = 'altar', denK = 1 } = {}) {
  const T = P.tile * C;
  const h = T / 2;
  const r = P.r * C;
  const legend = !!t.cls.ultimate;
  const fu = t.tier >= 8 ? fusionOf(t.cls) : null;
  const base = plateColorProposed(t);
  g.save();
  roundRectPath(g, -h, -h, T, T, r);
  g.clip();
  g.fillStyle = base;
  g.fillRect(-h, -h, T, T);
  if (fu) {
    // the den keeps the corner wedge in its motif parent's tint (the Rev 2 pick)
    g.fillStyle = tone(ELEMENTS[t.cls.fusion].color, 0.25);
    g.beginPath();
    g.moveTo(-h + T * 0.62, h);
    g.lineTo(h, -h + T * 0.62);
    g.lineTo(h, h);
    g.closePath();
    g.fill();
  }
  // the flat lighter band at the top and the one cel tone along the foot (as today)
  g.fillStyle = 'rgba(255,255,255,0.34)';
  roundRectPath(g, -h + 0.05 * T, -h + 0.04 * T, T - 0.1 * T, P.highlight * T, r - 0.05 * T);
  g.fill();
  g.fillStyle = 'rgba(43,29,46,0.16)';
  g.fillRect(-h, h - P.lip * T, T, P.lip * T);
  if (t.tier < 4) {
    // eggs sit in a straw nest (its back half here, its front over the egg): the promise of a pet,
    // and a shape the eye tells apart from a creature and from a den
    g.fillStyle = tone(base, -0.16);
    g.beginPath();
    g.ellipse(0, 0.4 * T, 0.31 * T, 0.085 * T, 0, 0, TAU);
    g.fill();
    for (const [x, y, a] of [
      [-0.26, 0.33, -0.55],
      [0.25, 0.34, 0.5],
      [-0.1, 0.3, 0.2],
      [0.12, 0.31, -0.25],
    ])
      strawStroke(g, x * T, y * T, 0.14 * T, a, 0.022 * C, '#d9b86f');
  }
  g.restore();
  // outline: ink; a legend wears the gold frame with an ink hairline outside it
  roundRectPath(g, -h, -h, T, T, r);
  g.lineWidth = (legend ? 0.045 : P.outline) * C;
  g.strokeStyle = legend ? GOLD : INK;
  g.stroke();
  if (legend) {
    roundRectPath(g, -h - 0.022 * C, -h - 0.022 * C, T + 0.044 * C, T + 0.044 * C, r + 0.022 * C);
    g.lineWidth = 0.014 * C;
    g.strokeStyle = INK;
    g.stroke();
  }
  // the growth meter in the top rail: 4 segments, one per merge toward the next milestone
  const lit = milestonePieces(t.tier);
  if (lit >= 0) {
    const w = P.meterW * T;
    const hh = P.meterH * T;
    const y = -h + P.meterY * T;
    const gap = 0.02 * T;
    const seg = (w - 3 * gap) / 4;
    roundRectPath(g, -w / 2 - 0.012 * T, y - hh / 2 - 0.012 * T, w + 0.024 * T, hh + 0.024 * T, hh);
    g.fillStyle = 'rgba(43,29,46,0.34)';
    g.fill();
    const goal = t.tier < 8 ? GOLD : BLUSH;
    for (let i = 0; i < 4; i++) {
      const x = -w / 2 + i * (seg + gap);
      roundRectPath(g, x, y - hh / 2, seg, hh, hh * 0.35);
      if (i < lit) {
        g.fillStyle = goal;
        g.fill();
        g.fillStyle = 'rgba(255,250,242,0.55)';
        g.fillRect(x + hh * 0.3, y - hh / 2 + 1, seg - hh * 0.6, Math.max(1, hh * 0.22));
      } else {
        g.fillStyle = 'rgba(43,29,46,0.28)';
        g.fill();
      }
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(43,29,46,0.6)';
      g.stroke();
    }
  }
  // the den: the shrine its pet left (an altar by default; `motif` 'tower' for the turret), rising
  // in as the pet hops out (denK 0 → 1); a legend's apex halo stands around the gem (or the tower's top)
  if (fu) drawDen(g, C, T, t, motif, denK);
}

/** The keep's stone (the chapter skin), shared by the frame: a den reads as part of the castle. */
const STONE = { base: SKIN.stone[0], shade: SKIN.stone[1], light: SKIN.stone[2] };

function stoneBlock(g, x, y, w, h, C, { fill = STONE.base } = {}) {
  roundRectPath(g, x, y, w, h, Math.min(h, w) * 0.22);
  g.fillStyle = fill;
  g.fill();
  // one cel tone along the bottom, one light band along the top (the sticker style's two values)
  g.save();
  g.clip();
  g.fillStyle = STONE.shade;
  g.fillRect(x, y + h * 0.66, w, h * 0.34);
  g.fillStyle = STONE.light;
  g.fillRect(x, y, w, h * 0.22);
  g.restore();
  g.lineWidth = 0.02 * C;
  g.strokeStyle = INK;
  g.stroke();
}

function crystalGem(g, C, cx, cy, w, h, color) {
  const outline = () => {
    g.beginPath();
    g.moveTo(cx, cy - h / 2);
    g.lineTo(cx + w / 2, cy - h * 0.12);
    g.lineTo(cx, cy + h / 2);
    g.lineTo(cx - w / 2, cy - h * 0.12);
    g.closePath();
  };
  outline();
  g.fillStyle = tone(color, 0.62); // the crystal: the fusion's colour, light
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = color; // the shaded facet in the fusion's colour
  g.beginPath();
  g.moveTo(cx, cy - h / 2);
  g.lineTo(cx + w / 2, cy - h * 0.12);
  g.lineTo(cx, cy + h / 2);
  g.closePath();
  g.fill();
  g.fillStyle = tone(color, -0.2);
  g.fillRect(cx - w / 2, cy + h * 0.12, w, h);
  g.fillStyle = CREAM; // the glint
  g.beginPath();
  g.moveTo(cx - w * 0.3, cy - h * 0.14);
  g.lineTo(cx - w * 0.06, cy - h * 0.4);
  g.lineTo(cx - w * 0.06, cy - h * 0.12);
  g.closePath();
  g.fill();
  g.restore();
  outline();
  g.lineWidth = 0.02 * C;
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.stroke();
}

/** Where a den's crystal or a legend's apex badge sits, in plaque units below its centre. */
export const denSeat = (motif = 'altar') => (motif === 'tower' ? P.tower.seat : P.altar.seat);

/** The den motif on a fusion's plaque (plaque units: T is its side, origin at its centre). */
function drawDen(g, C, T, t, motif = 'altar', k = 1) {
  const fu = fusionOf(t.cls);
  const legend = !!t.cls.ultimate;
  g.save();
  g.globalAlpha *= k;
  g.translate(0, (1 - ease(k)) * 0.12 * T); // it rises from the floor as the pet hops out
  if (motif === 'tower') {
    const [bw, top, bh] = P.tower.body;
    const [mw, mh] = P.tower.merlon;
    // three merlons on the parapet, the round body, a band in the fusion's colour, an arched door in the opening's dark
    for (const mx of [-bw + mw / 2, 0, bw - mw / 2]) stoneBlock(g, (mx - mw / 2) * T, (top - mh) * T, mw * T, (mh + 0.02) * T, C);
    stoneBlock(g, -bw * T, top * T, 2 * bw * T, bh * T, C);
    g.fillStyle = fu.color;
    g.fillRect(-bw * T + 0.01 * C, (top + 0.03) * T, 2 * bw * T - 0.02 * C, 0.035 * T);
    const [dw, dt] = P.tower.door;
    const bottom = (top + bh) * T;
    g.beginPath();
    g.moveTo(-dw * T, bottom);
    g.lineTo(-dw * T, (dt + dw) * T);
    g.arc(0, (dt + dw) * T, dw * T, Math.PI, 0);
    g.lineTo(dw * T, bottom);
    g.closePath();
    g.fillStyle = SKIN.opening;
    g.fill();
    g.lineWidth = 0.018 * C;
    g.strokeStyle = INK;
    g.stroke();
  } else {
    const { plinth, body, slab, seat, crystal } = P.altar;
    stoneBlock(g, -plinth[0] * T, plinth[1] * T, 2 * plinth[0] * T, plinth[2] * T, C);
    stoneBlock(g, -body[0] * T, body[1] * T, 2 * body[0] * T, body[2] * T, C);
    // the two parents' colours set into the altar's face
    const fy = (body[1] + body[2] * 0.5) * T;
    for (const [sx, el] of [[-1, t.cls.element], [1, t.cls.fusion]]) {
      g.beginPath();
      g.arc(sx * 0.085 * T, fy, 0.042 * T, 0, TAU);
      g.fillStyle = ELEMENTS[el].color;
      g.fill();
      g.lineWidth = 0.014 * C;
      g.strokeStyle = INK;
      g.stroke();
    }
    stoneBlock(g, -slab[0] * T, slab[1] * T, 2 * slab[0] * T, slab[2] * T, C, { fill: STONE.light });
    // a den's crystal: cream, its shaded facet in the fusion's colour (it reads on every plate);
    // a legend seats its apex badge here instead (proposedBadges), inside its halo
    if (!legend) crystalGem(g, C, 0, seat * T, crystal[0] * T, crystal[1] * T, fu.color);
  }
  if (legend) {
    const halo = pic(`halo.${t.cls.ultimate}`);
    if (halo) {
      const w = P.haloW * T;
      const s = w / Math.max(halo.width, halo.height);
      g.drawImage(halo, -(halo.width * s) / 2, denSeat(motif) * T - (halo.height * s) / 2, halo.width * s, halo.height * s);
    }
  }
  g.restore();
}

const proposedPlates = new Map();
const proposedPlaqueCanvas = (C, t, { motif = 'altar', denK = 1 } = {}) => {
  const key = `${C}|${t.tier}|${t.cls.element}|${t.cls.fusion}|${t.cls.ultimate}|${motif}|${denK}`;
  if (!proposedPlates.has(key)) proposedPlates.set(key, offscreen(C * 1.1, (g) => proposedPlaque(g, C, t, { motif, denK })));
  return proposedPlates.get(key);
};

/** The number: Baloo 2 ExtraBold, ink with the cream stroke, centred at 33% on every tile. */
function proposedNumber(g, C, t, { scaleX = 1 } = {}) {
  const text = numberText(t.tier);
  const px = P.numberPx[Math.min(4, text.length)] * C;
  g.save();
  g.translate(0, -C / 2 + P.numberY * C);
  g.scale(scaleX, 1);
  g.font = `800 ${px}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = px * 0.26;
  g.strokeStyle = CREAM;
  g.strokeText(text, 0, 0);
  g.fillStyle = INK;
  g.fillText(text, 0, 0);
  g.restore();
}
/** The glyph badges: where they are today (collar tag bottom-right; dens both corners; apex top centre). */
function proposedBadges(g, C, t, { bump = 0, loser = null, loserK = 0, motif = 'altar' } = {}) {
  const r = P.badgeR * C;
  const den = t.tier >= 8 && t.cls.fusion;
  const corner = C / 2 - 0.05 * C - r;
  g.save();
  if (den) {
    drawBadge(g, t.cls.element, -(corner - 0.025 * C), corner - 0.025 * C, r);
    drawBadge(g, t.cls.fusion, corner - 0.025 * C, corner - 0.025 * C, r);
    // a legend's apex badge sits on its den, inside its halo (at the top it would cover the number)
    if (t.cls.ultimate) drawBadge(g, t.cls.ultimate, 0, denSeat(motif) * P.tile * C, r * 0.9);
  } else if (t.tier >= 4 && t.cls.element) {
    const x = corner - 0.0125 * C;
    if (loser) {
      // a colour override: the loser's badge slides out of the slot and fades
      g.save();
      g.globalAlpha *= 1 - loserK;
      drawBadge(g, loser, x + 0.16 * C * loserK, x - 0.05 * C * loserK, r);
      g.restore();
    }
    g.save();
    g.translate(x, x);
    g.scale(1 + 0.2 * bump, 1 + 0.2 * bump);
    drawBadge(g, t.cls.element, 0, 0, r);
    g.restore();
  }
  g.restore();
}
/** Four corner brackets outside the pit: picked (cream) or armed to sell / break (red, dashed). */
function brackets(g, C, { armed = false, time = 0, reduced = false } = {}) {
  const half = 0.45 * C;
  const o = (P.bracket.offset + (reduced ? 0 : P.bracket.breathe * Math.sin(time * TAU * 0.7))) * C;
  const arm = P.bracket.arm * C;
  const w = P.bracket.width * C;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (armed) g.setLineDash([0.05 * C, 0.035 * C]);
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const cx = sx * (half + o);
    const cy = sy * (half + o);
    g.beginPath();
    g.moveTo(cx - sx * arm, cy);
    g.lineTo(cx, cy);
    g.lineTo(cx, cy - sy * arm);
    g.lineWidth = w + 0.02 * C;
    g.strokeStyle = 'rgba(43,29,46,0.85)';
    g.stroke();
    g.lineWidth = w;
    g.strokeStyle = armed ? '#ef6060' : CREAM;
    g.stroke();
  }
  g.restore();
}
/** The tutorial's coach ring, as hud.css draws it in the DOM (3 px gold + a 4 px halo, 1.2 s pulse). */
function coachRing(g, C, radius) {
  const pad = 6;
  const half = 0.45 * C + pad;
  g.save();
  roundRectPath(g, -half - 3.5, -half - 3.5, half * 2 + 7, half * 2 + 7, radius + 3.5);
  g.lineWidth = 7;
  g.strokeStyle = 'rgba(255,211,74,0.27)';
  g.stroke();
  roundRectPath(g, -half, -half, half * 2, half * 2, radius);
  g.lineWidth = 3;
  g.strokeStyle = '#ffd34a';
  g.stroke();
  g.restore();
}
function chips(g, C, color, n, k, { gravity = 0.35, spread = 0.38, seed = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = ((i + seed) / n) * TAU + 0.4;
    const d = (0.18 + spread * k) * C;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d * 0.7 + gravity * C * k * k;
    g.save();
    g.translate(x, y);
    g.rotate(k * 2 + i);
    roundRectPath(g, -0.04 * C, -0.03 * C, 0.08 * C, 0.06 * C, 0.012 * C);
    g.fillStyle = color;
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = INK;
    g.stroke();
    g.restore();
  }
}
function dust(g, C, k, { y = 0.42, color = '#D9C7A3' } = {}) {
  g.save();
  g.globalAlpha *= 0.5 * (1 - k);
  g.fillStyle = color;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const r = (0.045 + 0.06 * k) * C * (1 - i * 0.18);
      g.beginPath();
      g.arc(sx * (0.36 + 0.12 * k + i * 0.07) * C, (y - 0.04 * i - 0.08 * k) * C, r, 0, TAU);
      g.fill();
    }
  }
  g.restore();
}

/** One tile as the overhaul draws it, origin at the cell's centre. */
function drawProposedTile(g, C, t, st) {
  const T = P.tile * C;
  const h = T / 2;
  const r = P.r * C;
  const time = st.time ?? 0.8;
  const pop = st.pop ?? 0;
  const punch = st.punch ?? 0;
  const appear = st.appear ?? 1;
  const e = ease(appear);
  const popS = appear < 1 ? 1 : 1 + Math.sin(pop * Math.PI) * 0.18;
  const shudder = st.shudder ?? 0;
  const reduced = !!st.reduced;
  const nudge = (st.nudge ?? 0) * C;
  g.save();
  g.translate(nudge, 0);
  if (shudder > 0 && !reduced) g.translate(Math.sin(time * 90 + 1) * 0.03 * C * shudder, 0);
  // where the plaque is: seated (0), lifted when picked, dropping in when spawned, falling when destroyed, lifted out when sold
  let dx = 0;
  let dy = 0;
  let scale = popS * (1 + punch * 0.07);
  let alpha = 1;
  let rot = 0;
  if (appear < 1) {
    dy = -0.22 * C * (1 - e);
    scale *= 1 + 0.06 * (1 - e);
  }
  if (st.selected || st.armed) dy -= 0.03 * C;
  if (st.armed && !reduced) rot = 0.035 * Math.sin(time * TAU * 3);
  if (st.remove) {
    const k = ease(st.remove.k);
    if (st.remove.reason === 'sell') {
      dy -= 0.3 * C * k;
      scale *= 1 - 0.15 * k;
      alpha = 1 - k;
    } else {
      dy += 0.1 * C * k;
      alpha = 1 - k;
    }
  }
  // the cast shadow in the pit: larger while the plaque is lifted
  const lift = Math.max(0, -dy) / C;
  g.save();
  roundRectPath(g, -0.45 * C, -0.45 * C, 0.9 * C, 0.9 * C, P.pitR * C);
  g.clip();
  g.globalAlpha = 0.38 * alpha;
  g.fillStyle = INK;
  g.translate(dx + (P.castShadow[0] + lift * 0.6) * C, (P.castShadow[1] + lift * 0.9) * C);
  g.scale(scale, scale);
  roundRectPath(g, -h, -h, T, T, r);
  g.fill();
  g.restore();
  // rubble left in the pit by a destroyed block (a dark decal: free in the light budget)
  if (st.remove && st.remove.reason === 'destroyed') {
    g.save();
    g.globalAlpha = 0.7 * st.remove.k;
    chips(g, C, tone(SKIN.pit, -0.25), 5, 0.6, { gravity: 0.2, spread: 0.2, seed: 2 });
    g.restore();
  }
  // the plaque (plate, meter, den, halo), tinted by the hit or the heal
  let plaque = proposedPlaqueCanvas(C, t, { motif: st.motif ?? 'altar', denK: st.denK ?? 1 });
  const hurt = st.hurt ?? 0;
  const healed = st.healed ?? 0;
  const tint = hurt > 0.02 ? mixHex('#ffffff', '#ff6a6a', hurt) : healed > 0.02 ? mixHex('#ffffff', '#8dff9d', healed * TILE_GLOW.heal) : null;
  if (tint) plaque = tintedCopy(plaque, tint);
  g.save();
  g.translate(dx, dy);
  g.rotate(rot);
  g.globalAlpha *= alpha;
  blit(g, plaque, 1, scale, scale * (1 - punch * 0.05));
  // cracks: the hit that destroys the block
  if (st.remove && st.remove.reason === 'destroyed' && st.remove.k < 0.6) {
    g.save();
    g.globalAlpha *= 1 - st.remove.k / 0.6;
    g.lineWidth = 0.022 * C;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = INK;
    for (const pts of [
      [
        [-0.1, -0.05],
        [-0.22, -0.2],
        [-0.3, -0.42],
      ],
      [
        [-0.1, -0.05],
        [0.08, 0.12],
        [0.05, 0.3],
        [0.2, 0.42],
      ],
      [
        [-0.1, -0.05],
        [-0.3, 0.05],
        [-0.42, 0.18],
      ],
    ]) {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * C, y * C) : g.moveTo(x * C, y * C)));
      g.stroke();
    }
    g.restore();
  }
  // the creature: blink and scared are the generated expression edits of the 16 stage
  let id = spriteFor(t);
  if (id && t.tier >= 4) {
    if (st.scared && hurt > 0.3) id = spriteFor(t, 'scared');
    else if (st.blink) id = spriteFor(t, 'blink');
  }
  if (id && st.hatchK == null) drawCreature(g, C, t, t.tier < 4 ? { ...st, creatureDy: -P.eggLift } : st, id, { popS, punch, pop, time });
  if (t.tier < 4 && st.hatchK == null) {
    // the nest's front: straw across the egg's base
    for (const [x, y, a] of [
      [-0.2, 0.395, 0.12],
      [0.02, 0.41, -0.08],
      [0.22, 0.39, 0.1],
      [-0.08, 0.4, -0.3],
    ])
      strawStroke(g, x * T, y * T, 0.15 * T, a, 0.022 * C, '#e2c47c');
  }
  if (st.hatchK != null) {
    // 8 + 8: the egg's shell flies off as the hatchling pops up from the sill
    const k = st.hatchK;
    drawCreature(g, C, t, { ...st, creatureDy: 0.16 * (1 - ease(k)) }, spriteFor({ tier: 4, cls: t.cls }), { popS, punch, pop, time });
    g.save();
    g.fillStyle = CREAM;
    g.strokeStyle = INK;
    g.lineWidth = 1.5;
    for (const sx of [-1, 1]) {
      g.save();
      g.translate(sx * (0.2 + 0.22 * k) * C, (0.05 - 0.35 * k + 0.25 * k * k) * C);
      g.rotate(sx * 0.9 * k);
      g.beginPath();
      g.moveTo(-0.08 * C, 0.05 * C);
      g.lineTo(0.08 * C, 0.05 * C);
      g.lineTo(0.04 * C, -0.06 * C);
      g.lineTo(0, 0.0);
      g.lineTo(-0.05 * C, -0.05 * C);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }
    g.restore();
  }
  // number and badges
  g.save();
  g.scale(scale, scale * (1 - punch * 0.05));
  proposedNumber(g, C, t, { scaleX: st.numberScaleX ?? 1 });
  proposedBadges(g, C, t, { bump: punch, loser: st.loser, loserK: st.loserK ?? 0, motif: st.motif ?? 'altar' });
  g.restore();
  // muzzle flash: the plaque's white silhouette at most TILE_GLOW.muzzle (as today)
  if (punch > 0) blit(g, whiteCopy(proposedPlaqueCanvas(C, t, { motif: st.motif ?? 'altar' })), punch * TILE_GLOW.muzzle, scale, scale * (1 - punch * 0.05));
  // a legend's signature charge: the gold frame fills with cream, clockwise from the top
  if (t.cls.ultimate && st.charge != null) {
    const L = T;
    const rr = r;
    const per = 4 * L - 8 * rr + TAU * rr;
    g.save();
    roundRectPath(g, -h, -h, L, L, rr);
    g.setLineDash([per * st.charge, per]);
    g.lineDashOffset = -(L / 2 - rr);
    g.lineWidth = 0.028 * C;
    g.lineCap = 'butt';
    g.strokeStyle = CREAM;
    g.stroke();
    g.restore();
  }
  g.restore();
  // chips flying when a block breaks or is destroyed; a gold puff when it is sold
  if (st.remove) {
    const k = st.remove.k;
    if (st.remove.reason === 'sell') {
      g.save();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        const d = (0.25 + 0.35 * k) * C;
        g.globalAlpha = 1 - k;
        g.fillStyle = i % 2 ? GOLD : CREAM;
        g.beginPath();
        g.arc(Math.cos(a) * d, Math.sin(a) * d * 0.8 - 0.1 * C * k, (0.03 - 0.015 * k) * C, 0, TAU);
        g.fill();
      }
      g.restore();
    } else chips(g, C, st.remove.reason === 'destroyed' ? plateColorProposed(t) : '#e6c88a', 6, k);
  }
  if (appear < 1 && !reduced) dust(g, C, e);
  // Nature's repair: leaves fall on the block (vfx.nature.leaf), with the green tint below the threshold
  if (healed > 0.02) {
    const leaf = pic('vfx.nature.leaf');
    if (leaf) {
      const kk = 1 - healed;
      for (const [x, y0, rot] of [
        [-0.28, -0.55, -0.4],
        [0.08, -0.62, 0.5],
        [0.3, -0.5, 0.1],
      ]) {
        g.save();
        g.translate(x * C, (y0 + 0.5 * kk) * C);
        g.rotate(rot + kk * 1.5);
        const s = (0.14 * C) / Math.max(leaf.width, leaf.height);
        g.drawImage(leaf, (-leaf.width * s) / 2, (-leaf.height * s) / 2, leaf.width * s, leaf.height * s);
        g.restore();
      }
    }
  }
  // picked: cream brackets outside the pit; armed: the same brackets, red and dashed
  if (st.selected || st.armed) brackets(g, C, { armed: !!st.armed, time, reduced });
  // the fusion's pet hopping out of its new den (src/sim/roam.js hatch 0 → 1 over 0.7 s)
  if (st.hopK != null) {
    const pet = pic(`fusion.${[t.cls.element, t.cls.fusion].sort((a, b) => ELEMENT_KEYS.indexOf(a) - ELEMENT_KEYS.indexOf(b)).join('+')}`);
    if (pet) {
      const k = st.hopK;
      const hgt = 1.0 * C;
      const s = hgt / pet.height;
      g.save();
      g.translate(0.2 * C * k, 0.43 * C - (0.55 * k + Math.sin(k * Math.PI) * 0.5) * C);
      g.drawImage(pet, (-pet.width * s) / 2, -pet.height * s * 0.97, pet.width * s, pet.height * s);
      g.restore();
    }
  }
  g.restore();
}

// =====================================================================================================
// the sample list
// =====================================================================================================
const T = (tier, element = null, fusion = null, ultimate = null) => ({ tier, cls: { ...(element && { element }), ...(fusion && { fusion }), ...(ultimate && { ultimate }) } });
const FUSION_NAME = (a, b) => FUSIONS[[a, b].sort((x, y) => ELEMENT_KEYS.indexOf(x) - ELEMENT_KEYS.indexOf(y)).join('+')].name;

/**
 * Every state a tile can be in, from the code. `cur` / `pro` describe what each column shows;
 * `st` is the view state at the keyframe, `anim(t)` the state over time for the Play toggle.
 */
export const GROUPS = [
  {
    id: 'slot',
    title: 'A · The slot and the eggs',
    note: 'Below 16 a block has no element (run.js: cls = {} until it reaches 16): the three dormant tiers are the three eggs. The plate warms a step per value, like classic 2048.',
    samples: [
      { id: 'pit', title: 'Empty pit', src: 'frame.js drawKeep', cur: 'flagstone pit #35334E, 1 px ink groove, inner shadow top/left, lit lip below; corner radius 0.07 cell', pro: 'the same pit, corner radius 0.12 cell so the plaque seats in it without a dark triangle at each corner (one number in frame.js: pitR = L(0.24))', tile: null, st: {} },
      { id: 'egg2', title: 'Egg · 2 (tier 1)', src: 'index.js EGG_PLATE[0], egg.2', cur: 'cream plate #f2dfc2 floating on a drop shadow, egg.2 at 50% of the cell, slow wobble (2.4 rad/s)', pro: 'the same plate seated in the pit (cast shadow inside the groove), the egg in a straw nest; wobble unchanged', tile: T(1), st: { time: 0.4 } },
      { id: 'egg4', title: 'Egg · 4 (tier 2)', src: 'egg.4 (cracked)', cur: 'sand plate #f2d3ad, egg.4 at 55%', pro: 'seated, nest; the crack is the sprite’s', tile: T(2), st: { time: 1.1 } },
      { id: 'egg8', title: 'Egg · 8 (tier 3), hatching', src: 'egg.8; blocks.js: shakes in bursts (9 rad/s × 0.06 rad while sin(0.9 t) > 0.4)', cur: 'apricot plate #f3c597, egg.8 at 60%, mid-shake', pro: 'seated, nest; the shake is kept (motion, not light); the next merge hatches it (section I)', tile: T(3), st: { time: 2.0 }, anim: (t) => ({ time: t }) },
    ],
  },
  {
    id: 'awake',
    title: 'B · Awakened 16 → 128: one tile per element, then the stage motif',
    note: 'A light element tint on the plate (tone(colour, 0.42): the Rev 2 pick), the number on top in ink with a cream stroke, the creature over the sill, the glyph badge. New: the plaque is seated in the pit, and the 4-piece edge border becomes a 4-segment growth meter in the top rail.',
    samples: [
      ...ELEMENT_KEYS.map((el, i) => ({ id: `16-${el}`, title: `16 · ${ELEMENTS[el].name}`, src: `pet.${el}.16, badge.${el}`, cur: i === 0 ? 'plate tone(colour, 0.42) with a drop shadow; 0 of 4 border pieces lit: the unlit pieces read as grey handles on every edge' : null, pro: i === 0 ? 'plaque seated, meter 0 / 4 in the top rail (dark track), badge as the collar tag; class glow unchanged (a whisper under the tile)' : null, tile: T(4, el), st: { time: 0.6 + i * 0.37 } })),
      { id: '32-fire', title: '32 · Fire (stage 2 motif)', src: 'pet.fire.32; milestonePieces = 1', cur: '1 gold piece on the top edge', pro: 'meter 1 / 4 gold', tile: T(5, 'fire'), st: { time: 0.9 } },
      { id: '64-fire', title: '64 · Fire (stage 3)', src: 'pet.fire.64; pieces = 2', cur: 'top + right pieces gold', pro: 'meter 2 / 4', tile: T(6, 'fire'), st: { time: 1.3 } },
      { id: '128-fire', title: '128 · Fire (stage 4, full motif)', src: 'pet.fire.128; pieces = 3; creature 68% of the cell', cur: '3 pieces gold; the creature’s crest meets the number', pro: 'meter 3 / 4: one merge from the fusion', tile: T(7, 'fire'), st: { time: 1.7 } },
      { id: 'override', title: 'Class override (the slider wins)', src: "run.js 'override' event: mover.cls.element overrides the stayer’s", cur: 'nothing on the tile: the HUD announces who took over', pro: 'the loser’s badge slides out of the collar slot and fades (0.3 s), the winner’s badge bumps; same plate rule', tile: T(5, 'ice'), st: { time: 0.5, loser: 'fire', loserK: 0.45 }, anim: (t) => ({ time: t, loser: 'fire', loserK: clamp01((t % 2) / 0.3) }) },
    ],
  },
  {
    id: 'den',
    title: 'C · The fusion den (256 → 2048)',
    note: 'At 256 the pet hops out and roams; the tile is its den. Today a den is an empty plate with two badges and a faint oval. Proposed: the plate stays tone(fusion, 0.18) with the corner wedge (the pick) and gains the shrine the pet left: a stone altar in the keep’s stone with a gem in the fusion’s colour on top and the two parents’ colours on its face (the alternative, a small tower with its den door, is drawn in the last two samples). The number stays at 33% like every other tile, and the second meter run (512 → 2048) shows in rose.',
    samples: [
      { id: 'den256', title: '256 · Frostnova den (fire + ice)', src: 'index.js: tone(fusion, 0.18), wedge tone(partner, 0.25), both badges; pieces = 0 (pink run)', cur: 'number centred at 50%; a faint nest ellipse; the unlit pink-run pieces as grey handles', pro: 'the altar: stone plinth, body with the parents’ two colours, a light slab and the fusion’s gem; number at 33%; meter 0 / 4 (rose track)', tile: T(8, 'fire', 'ice'), st: { time: 0.6 } },
      { id: 'den1024', title: '1024 · Miasma den (poison + wind)', src: 'pieces = 2 (toward 4096)', cur: '2 pink pieces', pro: 'meter 2 / 4 rose', tile: T(10, 'poison', 'wind'), st: { time: 0.9 } },
      { id: 'den2048', title: '2048 · Storm den (lightning + wind)', src: 'pieces = 3', cur: '3 pink pieces; the 4-digit number at 46 / 160', pro: 'meter 3 / 4: one merge from the legend', tile: T(11, 'lightning', 'wind'), st: { time: 1.4 } },
      { id: 'dendark', title: '512 · Nightshade den (poison + nature): the darkest fusion colour', src: 'FUSION_COLORS poison+nature #7a3fa8 → tone 0.18 = #9262b8', cur: 'ink numeral on #9262b8: 3.5 : 1 (under the 4.5 : 1 target; the cream stroke carries it)', pro: 'den plates get a luminance floor (Y ≥ 0.25): tone lifted in 0.02 steps until ink reads ≥ 4.6 : 1 (table below)', tile: T(9, 'poison', 'nature'), st: { time: 0.3 } },
      { id: 'hop', title: '256 · the pet hops out (fusion moment)', src: "run.js 'classed' stage 2 → blocks.js pop; sim/roam.js hatch 0 → 1 over 0.7 s", cur: 'the den pops (scale 1.18); the roamer appears over the field (kv/roam.js)', pro: 'the altar rises from the floor under the pet as it leaves (0.7 s); the plaque pops as today', tile: T(8, 'fire', 'ice'), st: { time: 0.4, pop: 0.6, hopK: 0.55, denK: 0.55 }, tall: 0.9, anim: (t) => { const k = (t % 2.2) / 0.7; return { time: t, pop: clamp01(1 - (t % 2.2) / 0.3), hopK: clamp01(k), denK: clamp01(k) }; } },
      { id: 'den256tower', title: '256 · Frostnova den, the tower alternative', src: 'the same den', cur: 'as above', pro: 'a small stone tower: three merlons, a band in the fusion’s colour, an arched door in the opening’s dark (the den door); taller than the altar, it stops just under the number', tile: T(8, 'fire', 'ice'), st: { time: 0.6, motif: 'tower' } },
    ],
  },
  {
    id: 'legend',
    title: 'D · The legend (4096)',
    note: 'A fusion plus an apex element. The gold frame, the apex badge and the three-colour glow are kept. New: the apex halo kit stands around the altar’s gem (a shrine), and the signature charge fills the gold frame with cream clockwise instead of drawing a ring outside the plate.',
    samples: [
      { id: 'legend', title: '4096 · Tempest Frostnova (fire + ice, apex lightning)', src: 'index.js legend plate: gold 7 px + ink 2.5 px; blocks.js: glow 1.9 cells cycling 3 colours; charge arc r = 0.5 cell', cur: 'gold frame, three badges, charge arc outside the plate corners (65% here)', pro: 'gold frame + ink hairline, halo.lightning standing around the altar’s gem, the frame’s inner edge fills with cream as the signature charges (65%)', tile: T(12, 'fire', 'ice', 'lightning'), st: { time: 0.7, charge: 0.65 }, anim: (t) => ({ time: t, charge: (t % 4) / 4 }) },
      { id: 'legendtower', title: '4096 · Tempest Frostnova, the tower alternative', src: 'the same legend', cur: 'as above', pro: 'the halo crowns the tower’s parapet', tile: T(12, 'fire', 'ice', 'lightning'), st: { time: 0.7, charge: 0.65, motif: 'tower' } },
      { id: 'legend2', title: '4096 · Midas Harvest (metal + nature, apex metal is not allowed: apex fire)', src: 'APEX fire: Sun, period 2 s', cur: 'the same treatment in another colour', pro: 'halo.fire; the charge is a quarter in (period 2 s: the fastest dial)', tile: T(12, 'metal', 'nature', 'fire'), st: { time: 1.9, charge: 0.25 } },
    ],
  },
  {
    id: 'pick',
    title: 'E · Picked, armed, taught, locked',
    note: 'Gold is reserved for legends in the proposal: the pick is a cream bracket set outside the pit, and the plaque lifts 0.03 cell on a longer shadow. Arming the sell / break button (inspect.js) turns the brackets red and dashed. The tutorial’s DOM ring is unchanged except its radius.',
    samples: [
      { id: 'selected', title: 'Picked (range showing, inspect card open)', src: 'blocks.js select(): gold frame 0.12 U + white inner line, size breathing at 1.3 Hz; scenery.js draws the range; inspect.js the card', cur: 'gold pulsing frame around the tile (the same gold as the legend frame)', pro: 'cream brackets outside the pit (double outline: ink under cream), breathing ≤ 0.7 Hz on their gap; the plaque lifts; reduce motion: still', tile: T(6, 'ice'), st: { time: 0.6, selected: true }, anim: (t) => ({ time: t, selected: true }) },
      { id: 'armed', title: 'Sell / break armed (tap again)', src: 'inspect.js: the button arms for 2.5 s (#ef6060); nothing on the tile today', cur: 'the picked frame only', pro: 'brackets turn red and dashed; a 2° wobble at 3 Hz says “about to go” (reduce motion: no wobble)', tile: T(6, 'ice'), st: { time: 0.35, armed: true }, anim: (t) => ({ time: t, armed: true }) },
      { id: 'coach', title: 'Tutorial highlight', src: 'tutorial.js targetRect(tile) → hud.css .coach-ring: 3 px #ffd34a, 14 px radius, 4 px halo, 1.2 s pulse', cur: 'DOM ring around the tile’s rect, 6 px padding', pro: 'the same DOM ring, its radius matched to the pit’s (0.12 cell): no tile change', tile: T(4, 'fire'), st: { time: 0.5, coach: true } },
      { id: 'locked', title: 'Locked board (no swipe can move a block)', src: "run.js 'locked' event → hud.js banner; grid.canMove() false; blocks.js: nothing", cur: 'no tile cue: the banner says it', pro: 'a refused swipe nudges every plaque 0.04 cell in the swipe direction and back (0.18 s); reduce motion: none. The banner stays', tile: T(5, 'earth'), st: { time: 0.5, nudge: 0.04 }, anim: (t) => ({ time: t, nudge: 0.04 * Math.sin(Math.PI * clamp01((t % 1.5) / 0.18)) }) },
    ],
  },
  {
    id: 'siege',
    title: 'F · Under siege: hit, healed, lost, sold, broken',
    note: 'Hidden health stays hidden. The hit keeps today’s photosafe timing (red holds 0.4 s while bites keep coming, then fades over 0.6 s) and adds a shape cue: the baby’s scared edit (pet.*.scared exists for all 8). Nature’s repair drops leaves. A destroyed block cracks and crumbles into its pit instead of shrinking at its centre; a sold one lifts out.',
    samples: [
      { id: 'hit', title: 'Under attack (tileHit)', src: 'blocks.js: body.tint → #ff6a6a (hurt = 1), hold HIT_TINT.hold 0.4 s, decay 1 / 1.6 s; shudder 0.06 U at 90 rad/s', cur: 'the whole plate tinted red, mid-shudder', pro: 'plaque tinted the same way (creature untinted), pet.fire.scared while hurt > 0.3, shudder 0.03 cell; reduce motion: tint only', tile: T(5, 'fire'), st: { time: 0.3, hurt: 1, shudder: 0.8, scared: true }, anim: (t) => { const k = t % 2; const hurt = k < HIT_TINT.hold ? 1 : clamp01(1 - (k - HIT_TINT.hold) * HIT_TINT.decay); return { time: t, hurt, shudder: clamp01(1 - k * 4), scared: true }; } },
      { id: 'hitegg', title: 'Under attack · an egg', src: 'the same tint on EGG_PLATE', cur: 'the cream plate goes salmon', pro: 'the same; the egg has no scared edit (it wobbles harder: 9 rad/s)', tile: T(2), st: { time: 2.1, hurt: 1, shudder: 0.5 } },
      { id: 'heal', title: 'Repaired (tileHeal: Nature’s Bramble Shell, Lifebloom)', src: 'blocks.js: tint toward #8dff9d × TILE_GLOW.heal 0.4; main.js: a green beam + sparkle', cur: 'a faint green tint', pro: 'the same tint (below the threshold) plus three vfx.nature.leaf falling onto the plaque', tile: T(6, 'earth'), st: { time: 0.4, healed: 0.8 }, anim: (t) => ({ time: t, healed: clamp01(1 - (t % 1.6) * 3 * 0.33) }) },
      { id: 'destroyed', title: 'Destroyed (remove · destroyed)', src: "grid.remove(t, 'destroyed') → blocks.js ghost shrinks over 0.11 s; main.js: blast, shake 10, “Block lost!”, red edge pulse", cur: 'the tile shrinking at its centre (k = 0.5)', pro: 'cracks from the bite, then the plaque drops into the pit and fades while six chips fly; rubble stays in the pit 4 s (dark decal: no light)', tile: T(5, 'poison'), st: { time: 0.5, remove: { reason: 'destroyed', k: 0.3 }, hurt: 0.6 }, tall: 0.2, anim: (t) => ({ time: t, hurt: 0.6, remove: { reason: 'destroyed', k: clamp01((t % 1.6) / 0.35) } }) },
      { id: 'sold', title: 'Sold (remove · sell)', src: "run.discard → 'remove' reason sell → ghost shrink + fx.burst gold ×18", cur: 'shrinks at its centre with a gold burst', pro: 'lifts out of the pit (−0.3 cell), shrinks a little, fades; the gold puff is kept', tile: T(6, 'metal'), st: { time: 0.5, remove: { reason: 'sell', k: 0.4 } }, tall: 0.4, anim: (t) => ({ time: t, remove: { reason: 'sell', k: clamp01((t % 1.6) / 0.35) } }) },
      { id: 'broken', title: 'Broken (remove · break: a dormant block, −3 swipes)', src: "'remove' reason break → the same ghost + gold burst", cur: 'the same shrink as a sale', pro: 'crumbles like a destroyed block but in sand chips, no cracks, no red: a choice, not a loss', tile: T(3), st: { time: 0.5, remove: { reason: 'break', k: 0.3 } }, tall: 0.2, anim: (t) => ({ time: t, remove: { reason: 'break', k: clamp01((t % 1.6) / 0.35) } }) },
    ],
  },
  {
    id: 'fire',
    title: 'G · Firing: wind-up per stage, the shot, the follow-through',
    note: 'Unchanged in substance (attack-vfx.js petPose sells the stage): 16 hops, 32–64 crouch, 128 crouches and recoils; the muzzle flash is the plate’s white silhouette at ≤ 12% (below the flash threshold) with a 7% punch. New: the badge bumps 20% on the shot.',
    samples: [
      { id: 'windup16', title: 'Wind-up · 16 (hop, w = 0.5)', src: 'petPose("16"): y 0.07 cell × sin(πw)', cur: 'the hatchling hops before its first ember', pro: 'the same hop', tile: T(4, 'fire'), st: { time: 0.5, wind: 0.5 }, anim: (t) => ({ time: t, wind: (t % 1) < 0.5 ? (t % 1) * 2 : 0 }) },
      { id: 'windup64', title: 'Wind-up · 32–64 (crouch, w = 1)', src: 'petPose("64"): sy 0.86, sx 1.1', cur: 'the baby crouches', pro: 'the same crouch', tile: T(6, 'ice'), st: { time: 0.5, wind: 1 }, anim: (t) => ({ time: t, wind: clamp01((t % 1.2) / 0.12) }) },
      { id: 'shot128', title: 'Shot + follow-through · 128 (recoil, f = 1)', src: "'fire' event → punch 1, follow 1; petPose(\"128\"): kick 0.14 cell away from the aim, rot 0.16; flash alpha TILE_GLOW.muzzle", cur: 'punch (scale 1.07, squash), white silhouette at 12%, the creature recoils', pro: 'the same, and the badge bumps 20% for 0.1 s', tile: T(7, 'lightning'), st: { time: 0.5, punch: 1, follow: 1, aim: { x: 0, y: 1 } }, anim: (t) => { const k = t % 1.4; return { time: t, punch: clamp01(1 - k * 9), follow: clamp01(1 - k / 0.22), aim: { x: 0, y: 1 } }; } },
      { id: 'pounce', title: 'Pride Pounce · the cub leaps (32+, with afterimage)', src: "'fire' pattern pounce → blocks.js leap (attack-vfx leapAt); createAfterimage ghosts from 32", cur: 'the cub mid-leap toward its prey up the lane, two white ghosts behind it', pro: 'unchanged (the leap is the attack ladder’s)', tile: T(5, 'metal'), st: { time: 0.5, leapK: 0.3, leapDx: 0.6, leapDy: 2.4, ghosts: 2 }, tall: 0.8, anim: (t) => ({ time: t, leapK: (t % 1.2) < 0.5 ? (t % 1.2) / 0.5 : 0, leapDx: 0.6, leapDy: 2.4, ghosts: 2 }) },
      { id: 'legendfire', title: 'A den or a legend fires', src: 'the roamer does it (kv/roam.js: lunge; halo dial); the tile only charges', cur: 'nothing on the tile', pro: 'nothing on the tile either: the charge frame (D) is the only tile-side cue', tile: T(8, 'wind', 'nature'), st: { time: 1.2 } },
    ],
  },
  {
    id: 'pops',
    title: 'H · Pops: spawn, merge, hatch, promote, slide',
    note: 'Today every arrival is a scale-up at the cell’s centre. Proposed: a new block drops into its pit (0.22 cell, 0.12 s) with a sand puff; the merge pop is kept (1.18 peak, creature squash 22%); a boss x2 flips the number like a card; the hatch throws the shell.',
    samples: [
      { id: 'spawn', title: 'Spawn pop (a new block after the swipe)', src: 'blocks.js: appear 0 → 1 over 0.12 s (cubic ease-out) after SLIDE × 0.9', cur: 'scale 0 → 1 at the centre (appear = 0.2: scale 0.49)', pro: 'drops into the pit from 0.22 cell up, scale 1.06 → 1, two sand puffs at the groove; reduce motion: fade in place', tile: T(1), st: { time: 0.5, appear: 0.2 }, anim: (t) => ({ time: t, appear: clamp01((t % 1.5) / 0.12) }) },
      { id: 'merge', title: 'Merge pop (pop = 0.5: the peak)', src: 'blocks.js: popS = 1 + 0.18 sin(π pop), decays ×4 /s; creature squash 0.22 sin(π pop)', cur: 'scale 1.18, creature squashed', pro: 'unchanged, plus the new meter segment lights (a 0.05-cell segment: no flash)', tile: T(6, 'nature'), st: { time: 0.5, pop: 0.5 }, anim: (t) => ({ time: t, pop: clamp01(1 - (t % 1.2) * 4) }) },
      { id: 'hatch', title: 'Hatch: 8 + 8 → 16 (classed, stage 1)', src: "run.js 'classed' stage 1 → blocks.js pop; hud announces “Awakened”", cur: 'the 16 pops in with its creature already in place', pro: 'two shell halves fly off; the hatchling pops up from the sill (0.16 cell over 0.25 s) with the pop', tile: T(4, 'poison'), st: { time: 0.5, pop: 0.55, hatchK: 0.45 }, tall: 0.3, anim: (t) => ({ time: t, pop: clamp01(1 - (t % 1.6) * 4), hatchK: clamp01((t % 1.6) / 0.3) }) },
      { id: 'promote', title: 'Boss x2 (promote)', src: "grid.promote → 'promote' event → blocks.js pop", cur: 'a pop with the new number', pro: 'the number flips like a card (scale.x cos πk over 0.3 s) with the pop; the meter gains its segment', tile: T(6, 'wind'), st: { time: 0.5, pop: 0.4, numberScaleX: 0.42 }, anim: (t) => { const k = (t % 1.6) / 0.3; return { time: t, pop: clamp01(1 - (t % 1.6) * 4), numberScaleX: k < 1 ? Math.abs(Math.cos(Math.PI * k)) : 1 }; } },
      { id: 'slide', title: 'Sliding between cells (0.11 s) and the merge ghosts', src: 'blocks.js SLIDE 0.11 cubic ease-out; merge parents slide into the target, then are dropped', cur: 'the tile mid-slide (drawn as is)', pro: 'unchanged: the plaque slides on the floor, its pit is drawn empty behind it', tile: T(3), st: { time: 0.5, nudge: -0.35 }, anim: (t) => ({ time: t, nudge: -0.5 * (1 - ease(clamp01((t % 1) / 0.11))) }) },
    ],
  },
  {
    id: 'idle',
    title: 'I · Idle and reduced motion',
    note: 'Babies bob (5% at 16–32, 3.5% at 64–128); the generated blink edit (pet.*.blink) exists for all 8 but is unused today. Reduce motion (stage.reduced) turns off the wind-up poses, the leap and the screen shake; it does not stop the shudder today.',
    samples: [
      { id: 'bob', title: 'Idle bob (16: 8.4 rad/s, 5%)', src: 'blocks.js creature scale ∝ sin(time · w + id · 1.7)', cur: 'the bob at its stretch', pro: 'unchanged', tile: T(4, 'wind'), st: { time: 1.87 }, anim: (t) => ({ time: t }) },
      { id: 'blink', title: 'Idle blink (new: pet.<el>.blink, 120 ms every 3–6 s)', src: 'asset-catalog.js: “eyes-closed edit for the idle blink” (P2, generated)', cur: 'no blink today', pro: 'the blink edit swapped in for 120 ms; no light, no motion: free', tile: T(4, 'wind'), st: { time: 1.87, blink: true }, anim: (t) => ({ time: t, blink: (t % 3.6) < 0.12 }) },
      { id: 'reduced', title: 'Reduce motion', src: 'stage.reduced: no poses, no leap, no shake; blocks.js still shudders on a hit', cur: 'a hit: tint + shudder', pro: 'a hit: tint and the scared face, no shudder, no drop-in, no wobble, no nudge; the brackets hold still', tile: T(5, 'fire'), st: { time: 0.3, hurt: 1, scared: true, reduced: true } },
    ],
  },
];

/** The true-size strips: the proposed plaque at a 390-px phone (cell 70) and the smallest phone (cell 48). */
const STRIP = [T(1), T(4, 'fire'), T(6, 'ice'), T(7, 'poison'), T(8, 'fire', 'ice'), T(10, 'poison', 'wind'), T(12, 'fire', 'ice', 'lightning')];
const STRIP_ST = [{ time: 0.4 }, { time: 0.6 }, { time: 1.3 }, { time: 1.7 }, { time: 0.6 }, { time: 0.9 }, { time: 0.7, charge: 0.65 }];

// =====================================================================================================
// the page
// =====================================================================================================
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * DPR);
  c.height = Math.round(h * DPR);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  return c;
}
/** Draw one sample cell: the keep floor, the pit, the tile. look = 'current' | 'proposed'. */
function renderCell(canvas, look, C, tile, st, { tall = 0 } = {}) {
  const w = C * 1.2;
  const h = C * (1.2 + tall);
  const g = canvas.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawFloor(g, w, h);
  g.translate(w / 2, h - C * 0.6);
  drawPit(g, C, look === 'proposed' ? P.pitR : 0.07);
  if (tile) {
    if (look === 'proposed') drawProposedTile(g, C, tile, st);
    else drawCurrentTile(g, C, tile, st);
  }
  if (st.coach) coachRing(g, C, look === 'proposed' ? P.pitR * C : 14);
}

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const live = []; // { canvases, sample } for the Play toggle

function buildSamples(root) {
  let n = 0;
  for (const group of GROUPS) {
    const sec = el('section', 'group');
    sec.id = group.id;
    sec.appendChild(el('h2', null, esc(group.title)));
    sec.appendChild(el('p', 'note', esc(group.note)));
    const grid = el('div', 'grid');
    for (const s of group.samples) {
      n += 1;
      const card = el('article', 'sample');
      card.id = `s-${s.id}`;
      const pair = el('div', 'pair');
      const C = CELL;
      const cvs = {};
      for (const look of ['current', 'proposed']) {
        const cell = el('div', 'cell');
        const c = makeCanvas(C * 1.2, C * (1.2 + (s.tall ?? 0)));
        renderCell(c, look, C, s.tile, s.st, { tall: s.tall ?? 0 });
        cvs[look] = c;
        cell.appendChild(c);
        cell.appendChild(el('span', 'tag', look === 'current' ? 'current' : 'proposed'));
        pair.appendChild(cell);
      }
      card.appendChild(pair);
      const cap = el('div', 'cap');
      cap.appendChild(el('h3', null, `<b>${n}</b> ${esc(s.title)}`));
      cap.appendChild(el('p', 'src', esc(s.src)));
      if (s.cur) cap.appendChild(el('p', 'cur', `<i>now</i> ${esc(s.cur)}`));
      if (s.pro) cap.appendChild(el('p', 'pro', `<i>proposed</i> ${esc(s.pro)}`));
      card.appendChild(cap);
      grid.appendChild(card);
      if (s.anim) live.push({ cvs, s });
    }
    sec.appendChild(grid);
    root.appendChild(sec);
  }
  return n;
}

function buildStrips(root) {
  const sec = el('section', 'group');
  sec.id = 'truesize';
  sec.appendChild(el('h2', null, 'J · True size: a 390 px phone (cell 70 px) and the smallest phone (cell 48 px)'));
  sec.appendChild(el('p', 'note', 'The same tiles at the sizes the game draws them (2× backing, like a retina phone). Read the meter, the altar and the badge at 48 px: they must still tell apart at a glance.'));
  for (const C of [70, 48]) {
    for (const look of ['current', 'proposed']) {
      const row = el('div', 'strip');
      row.appendChild(el('span', 'striplabel', `${look} · cell ${C} px`));
      STRIP.forEach((t, i) => {
        const c = makeCanvas(C * 1.2, C * 1.2);
        renderCell(c, look, C, t, STRIP_ST[i]);
        row.appendChild(c);
      });
      const sel = makeCanvas(C * 1.2, C * 1.2);
      renderCell(sel, look, C, T(6, 'ice'), { time: 0.6, selected: true });
      row.appendChild(sel);
      sec.appendChild(row);
    }
  }
  root.appendChild(sec);
}

/** Contrast of the number and of the plate on every plate the game can draw. */
export function contrastTable() {
  const rows = [];
  const add = (name, current, proposed, kind) => {
    rows.push({
      name,
      kind,
      current,
      proposed,
      inkCur: contrast(INK, current),
      inkPro: contrast(INK, proposed),
      creamCur: contrast(CREAM, current),
      creamPro: contrast(CREAM, proposed),
      floorCur: contrast(current, SKIN.floor),
      floorPro: contrast(proposed, SKIN.floor),
      pitPro: contrast(proposed, SKIN.pit),
    });
  };
  EGG_PLATE.forEach((c, i) => add(`egg ${[2, 4, 8][i]}`, c, c, 'egg'));
  for (const el of ELEMENT_KEYS) {
    const c = tone(ELEMENTS[el].color, 0.42);
    add(`${ELEMENTS[el].name} 16–128`, c, c, 'element');
  }
  for (const [key, f] of Object.entries(FUSIONS)) add(`${f.name} den (${key})`, tone(f.color, 0.18), denPlateColor(f.color), 'fusion');
  return rows;
}
function buildContrast(root) {
  const rows = contrastTable();
  const sec = el('section', 'group');
  sec.id = 'contrast';
  sec.appendChild(el('h2', null, 'K · Measured contrast (WCAG relative luminance, src/art/tokens.js contrast)'));
  const worst = rows.reduce((a, r) => (r.inkPro < a.inkPro ? r : a), rows[0]);
  const worstCur = rows.reduce((a, r) => (r.inkCur < a.inkCur ? r : a), rows[0]);
  const under = rows.filter((r) => r.inkCur < 4.5).map((r) => r.name);
  sec.appendChild(
    el(
      'p',
      'note',
      `Ink numeral on the plate: today ${worstCur.inkCur.toFixed(2)} : 1 at worst (${esc(worstCur.name)}); ${under.length} of ${rows.length} plates are under 4.5 : 1 today (${esc(under.join(', '))}). Proposed: ${worst.inkPro.toFixed(2)} : 1 at worst (${esc(worst.name)}) with the den luminance floor Y ≥ ${P.denFloor}. Every plate stands ≥ ${Math.min(...rows.map((r) => r.floorPro)).toFixed(1)} : 1 off the keep floor #3E3C58.`,
    ),
  );
  const table = el('table', 'contrast');
  table.innerHTML = `<thead><tr><th>plate</th><th>today</th><th>proposed</th><th>ink on plate<br>today → proposed</th><th>cream stroke on plate<br>today → proposed</th><th>plate on keep floor<br>today → proposed</th></tr></thead>`;
  const body = el('tbody');
  for (const r of rows) {
    const flag = (v) => (v < 4.5 ? ' class="low"' : '');
    body.innerHTML += `<tr><td>${esc(r.name)}</td><td><i class="sw" style="background:${r.current}"></i>${r.current}</td><td><i class="sw" style="background:${r.proposed}"></i>${r.proposed}</td><td${flag(r.inkCur)}>${r.inkCur.toFixed(2)} → <b${flag(r.inkPro)}>${r.inkPro.toFixed(2)}</b></td><td>${r.creamCur.toFixed(2)} → ${r.creamPro.toFixed(2)}</td><td>${r.floorCur.toFixed(2)} → ${r.floorPro.toFixed(2)}</td></tr>`;
  }
  table.appendChild(body);
  sec.appendChild(table);
  root.appendChild(sec);
  return rows;
}

/** The tapped-block card (src/ui/inspect.js markup, src/ui/inspect.css): today, and with the plaque as its picture. */
function buildInspect(root) {
  const sec = el('section', 'group');
  sec.id = 'inspect';
  sec.appendChild(el('h2', null, 'L · The inspect card (tap a block)'));
  sec.appendChild(el('p', 'note', 'Today the card’s picture is the raw sprite on a tinted disc. Proposed: the card shows the tile itself (the plaque renderer at 2×) so the board and the card agree, adds the growth row (merges to the next milestone, the same meter), and arming Sell / Break arms the tile’s brackets too (one shared state).'));
  const wrap = el('div', 'inspectpair');
  const tile = { id: 1, tier: 6, cls: { element: 'fire' } };
  const info = describeTile(tile, petName);
  const chips = info.elements.map((k) => `<span class="inspect-chip" style="--c:${ELEMENTS[k].color}"><img alt="" src="/assets/${files[`badge.${k}`]}" />${esc(ELEMENTS[k].name)}</span>`).join('');
  const body = `
      <p class="inspect-desc">${esc(info.desc)}</p>
      ${info.stats.length ? `<dl class="inspect-stats">${info.stats.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>` : ''}
      ${info.effects.length ? `<ul class="inspect-fx">${info.effects.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${info.next ? `<p class="inspect-next">${esc(info.next)}</p>` : ''}`;
  const act = (armed) => `<div class="inspect-act"><button class="inspect-sell is-sell${armed ? ' armed' : ''}">${armed ? 'Tap again to sell' : 'Sell'} <b><span class="inspect-coin"></span>+5</b></button><span class="inspect-note">A turret sells for the price of one swipe.</span></div>`;
  for (const look of ['current', 'proposed']) {
    const col = el('div', 'inspectcol');
    col.appendChild(el('span', 'tag', look));
    const card = el('div', 'inspect');
    card.style.setProperty('--c', info.colors[0]);
    if (look === 'current') {
      card.innerHTML = `<button class="inspect-x" aria-label="Close">×</button><div class="inspect-head"><div class="inspect-pic"><img alt="" src="/assets/${files['pet.fire.64']}" /></div><div class="inspect-titles"><h3>${esc(info.title)}</h3><div class="inspect-sub">${chips}<span class="inspect-value">${info.value}</span></div></div></div>${body}${act(false)}`;
    } else {
      const lit = milestonePieces(tile.tier);
      const meter = `<div class="inspect-grow"><span class="inspect-meter">${[0, 1, 2, 3].map((i) => `<i class="${i < lit ? 'lit' : ''}"></i>`).join('')}</span><span>${lit} of 4 merges to the fusion at 256</span></div>`;
      card.innerHTML = `<button class="inspect-x" aria-label="Close">×</button><div class="inspect-head"><div class="inspect-pic inspect-pic-tile"></div><div class="inspect-titles"><h3>${esc(info.title)}</h3><div class="inspect-sub">${chips}<span class="inspect-value">${info.value}</span></div>${meter}</div></div>${body}${act(true)}`;
      const c = makeCanvas(72, 72);
      const g = c.getContext('2d');
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawFloor(g, 72, 72);
      g.translate(36, 36);
      const C = 60;
      drawPit(g, C, P.pitR);
      drawProposedTile(g, C, tile, { time: 1.3 });
      card.querySelector('.inspect-pic-tile').appendChild(c);
    }
    col.appendChild(card);
    wrap.appendChild(col);
  }
  sec.appendChild(wrap);
  root.appendChild(sec);
}

async function waitForFonts() {
  if (!document.fonts?.load) return;
  const t = new Promise((r) => setTimeout(r, 2500));
  await Promise.race([Promise.all([document.fonts.load('800 64px "Baloo 2"'), document.fonts.load('700 16px "Nunito"')]), t]);
}

export async function main() {
  const root = document.getElementById('sheet');
  await waitForFonts();
  await loadManifest();
  const ids = new Set(['vfx.nature.leaf']);
  for (const el of ELEMENT_KEYS) {
    for (const v of [16, 32, 64, 128, 'blink', 'scared']) ids.add(`pet.${el}.${v}`);
    ids.add(`badge.${el}`);
    ids.add(`halo.${el}`);
  }
  for (const e of [2, 4, 8]) ids.add(`egg.${e}`);
  for (const k of Object.keys(FUSIONS)) ids.add(`fusion.${k}`);
  await preload([...ids]);
  const n = buildSamples(root);
  buildStrips(root);
  const rows = buildContrast(root);
  buildInspect(root);
  document.getElementById('count').textContent = `${n} states`;
  window.__tileContrast = rows;
  window.__tileSamples = GROUPS.flatMap((g) => g.samples.map((s) => ({ group: g.id, id: s.id, title: s.title })));
  // the Play toggle: the animated samples replay their motion
  const play = document.getElementById('play');
  let raf = 0;
  const t0 = performance.now();
  const tick = () => {
    const t = (performance.now() - t0) / 1000;
    for (const { cvs, s } of live) {
      const st = { ...s.st, ...s.anim(t) };
      for (const look of ['current', 'proposed']) renderCell(cvs[look], look, CELL, s.tile, st, { tall: s.tall ?? 0 });
    }
    raf = requestAnimationFrame(tick);
  };
  play?.addEventListener('change', () => {
    if (play.checked) raf = requestAnimationFrame(tick);
    else {
      cancelAnimationFrame(raf);
      for (const { cvs, s } of live) for (const look of ['current', 'proposed']) renderCell(cvs[look], look, CELL, s.tile, s.st, { tall: s.tall ?? 0 });
    }
  });
  window.__samplesReady = true;
}

main().catch((e) => {
  document.getElementById('sheet').innerHTML = `<pre class="err">${esc(e.stack ?? e)}</pre>`;
  window.__samplesError = String(e);
});
