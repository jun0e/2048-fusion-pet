// The siege frame (proposal 4.2), in the sticker style: plum ink outline, flat fills, one cel tone,
// colours only from the chapter skin (src/art/frame-kit.js). Three depth layers:
//   far        the chapter's painted backdrop (env.<ch>.backdrop, else env.background, else a gradient),
//              softened once per chapter to its largest shapes and colour mood (FAR)
//   mid        the ridge strip along the top of the field (env.<ch>.ridge, else drawn), in one flat tone
//   foreground the frame: towers, the gate wall with an arch per lane, lanes and hedges, the parapet with
//              its braziers, the keep with its flagstone pits, the deck rail
// What has no part in the fight is quiet: the far layers are soft and dim, the stonework is a few
// large stones with faint joints, the hedges are flat with one calm scalloped edge, the cobble bands
// are low in contrast, and the chapter decor is one faint prop on each outer hedge. What the fight
// reads stays crisp: the lanes and their ticks, the gates, the braziers, the keep and its pits.
// v2.1 (docs/v2/SPEC-v2.1.md section 1): the board grows from 4×4 to 5×5 and 6×6 in one footprint, so
// the frame has two kinds of parts. The static ones (the sky, the hedges, the keep's floor and ring, the
// gate wall, the parapet, the towers, the deck) are Graphics built once per resize or chapter. The parts
// sized by the board (a strip per lane, a pit per cell, the arches, the merlons, the ticks, the gates and
// the braziers) are built for the board's size too, as shares of its cell (frame-kit CELL_SHARE), and
// placed by transform, so the grow moment (frame-kit GROW) only moves them: the keep's grid zooms out, a
// new column of pits slides in under the keep's right wall and a new row under the parapet (clipped to the
// floor), and each new lane slides in from behind the right tower while the old ones close up to the
// left. A board of another size seen without a grow event (a restored run, a new run) is rebuilt at once.
// Per frame only the gates (iris, portcullis), the braziers (flame, smoke) and the parallax offset
// change, by transform and alpha (and, while the board grows, the sized parts' places). Nothing is
// additive. The generated env.* sprites and their drawn stand-ins are in src/render/frame-art.js.
import { Container, FillGradient, Graphics, GraphicsContext, Sprite, Text } from 'pixi.js';
import { BOARD_HALF, BOARD_SPAN, DESIGN_CELL, GRID, GRID_TOP } from '../config.js';
import { CELL_SHARE, DECOR, FRAME_GEOM as G, FRAME_INK, FRAME_CREAM, GROW, brazierState, cellXAt, cellYAt, deckRow, decorSpots, growEase, growPos, hash01, hedgeTones, holdBrazier, laneFit, laneTicks, laneTones, skinFor } from '../art/frame-kit.js';
import { mix, tone } from '../art/tokens.js';
import { PLAQUE } from '../art/plaque.js';
import { DOT } from '../ux/photosafe.js';
import { enemyTex, portalTex, softDot } from './textures.js';
import { num, tr } from '../i18n/index.js';
import { farTex, frameTex, ridgeTex } from './frame-art.js';

const hex = (c) => parseInt(String(c).replace('#', ''), 16);
const INK = hex(FRAME_INK);
const CREAM = hex(FRAME_CREAM);
const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';
/** No text in the canvas is smaller than this (CSS px): the HUD's label floor (docs/ux/phone-readability.md). */
const MIN_TEXT = 14;
/** What a brazier's flame lights as it comes on (world units², booked with fx each time it lights). */
const FLAME_LIT = 0.15;
/** The stonework has no part in the fight: courses and stones this long (world units), joints this faint. */
const STONE = { course: 1, length: 1.6, joint: 0.22 };
/**
 * The grow moment's dust: `n` soft puffs along the keep's right wall and its parapet as the new column and
 * row push in from under them (booked in the light budget; none under Reduce motion), `size` world units
 * growing by `grow`, at `alpha`, for `life` s.
 */
export const GROW_DUST = { n: 10, size: 0.3, grow: 0.25, alpha: 0.45, life: 0.55 };
/** A gate's iris, the next wave's chip and the brazier of a lane sliding in show this far (world units) in from the right tower's edge. */
const EMERGE = 0.3;

/** The textures and the text the frame draws with (tests pass stand-ins: Node has no canvas). */
const FRAME_TEXTURES = { portalTex, enemyTex, farTex, frameTex, ridgeTex, softDot, gradient: (skin) => skyGradient(skin), text: (style) => new Text({ text: '', style }) };

// --- the static frame, one part per step ------------------------------------------------------------
// Each step draws from a pen: this build's world→screen helpers, the outline widths and the skin.

function penFor(stage, view, skin, chapter) {
  const U = view.U;
  const ow = Math.max(1.25, 0.055 * U); // the ink outline
  const [stone, shade, light] = skin.stone.map(hex);
  return { U, w: view.w, h: view.h, X: stage.sx, Y: stage.sy, L: (u) => u * U, ow, thin: Math.max(1, ow * 0.6), stone, shade, light, skin, chapter };
}

/** The far layer's stand-in: the skin's sky, top to bottom (local to the shape, so one per chapter). */
function skyGradient(skin) {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: skin.sky.map((c, i) => ({ offset: i / (skin.sky.length - 1), color: c })),
  });
}

/** Far and mid: the softened painting (or the gradient), and the flat ridge strip, its foot hidden behind the gate wall. */
function drawSky(p, { bgG, bgArt, ridge }, grad, tx) {
  const { w, h, L, Y, chapter, skin } = p;
  bgG.clear().rect(0, 0, w, h).fill(grad ?? hex(skin.sky[1]));
  const art = tx.farTex(chapter);
  bgArt.visible = !!art;
  if (art) {
    bgArt.texture = art;
    bgArt.scale.set(Math.max(w / art.width, h / art.height)); // cover the screen; the linear filter draws it up soft
    bgArt.position.set(w / 2, h / 2);
  }
  const rt = tx.ridgeTex(chapter);
  ridge.texture = rt;
  const rw = w + 24;
  ridge.width = rw;
  ridge.height = Math.min(L(1.7), (rw * rt.height) / Math.max(1, rt.width));
  ridge.position.set(w / 2, Y(G.gate.wallTop - 0.25));
}

/** Where the lanes' ground runs on screen: tucked under the gate wall and under the parapet. */
const groundTop = (p) => p.Y(G.gate.sill + 0.12);
const groundBottom = (p) => p.Y(G.parapet.wall - 0.12);

/**
 * A hedge strip's one calm scalloped edge, lit from the upper left, at screen x `x`: the lane drawn next to
 * it (or the tower) covers each scallop's outer half. `r`: a scallop's half-width (px).
 */
function scallops(p, g, x, r) {
  const top = groundTop(p);
  const bottom = groundBottom(p);
  const bumps = Math.max(3, Math.round((bottom - top) / p.L(0.4)));
  for (let i = 0; i < bumps; i++) g.ellipse(x, top + ((i + 0.5) / bumps) * (bottom - top), r, (bottom - top) / bumps / 2);
  g.fill(hex(hedgeTones(p.skin).scallop));
}

/**
 * The hedges: a flat dark ground for the foes from tower to tower, under the lanes (a strip per lane,
 * drawLane, brings the scallops of the hedge to its right); the outer left one's scallops at the left tower.
 */
function drawHedges(p, g) {
  const { X, L, ow, skin } = p;
  const top = groundTop(p);
  const bottom = groundBottom(p);
  const x0 = X(-G.towerIn);
  const x1 = X(G.towerIn);
  g.rect(x0, top, x1 - x0, bottom - top).fill(hex(hedgeTones(skin).base));
  scallops(p, g, x0, L(CELL_SHARE.scallop * GRID.cell));
  g.rect(x0, top, x1 - x0, bottom - top).stroke({ width: ow, color: INK });
}

/**
 * One lane, `w` world units wide, drawn round its centre (x 0; its container stands on the lane): the
 * scalloped edge of the hedge to its right (the lane covers their inner half), a calm centre (light sand
 * with a few large, low-contrast patches, ≤ 4 L* from the lane), the cobble bands in the outer 20% each
 * side (large setts a few L* darker than their grout, with no outline, so the cell ticks stay the strongest
 * marks on the lane) and its ink edges.
 */
function drawLane(p, g, lane, w, cell) {
  const { L, ow, skin } = p;
  const tones = laneTones(skin);
  const top = groundTop(p);
  const bottom = groundBottom(p);
  const half = w / 2;
  const calmW = w * G.calm;
  const bandW = (w - calmW) / 2;
  scallops(p, g, L(half), L(CELL_SHARE.scallop * cell));
  const x0 = L(-half);
  const lw = L(w);
  g.rect(x0, top, lw, bottom - top).fill(hex(tones.base));
  for (let i = 0; i < 7; i++) {
    const py = top + (bottom - top) * ((i + 0.15 + 0.7 * hash01(lane, 70 + i)) / 7);
    const px = L((hash01(lane, 80 + i) - 0.5) * calmW * 0.6);
    g.ellipse(px, py, L(calmW * (0.28 + 0.12 * hash01(lane, 90 + i))), L(0.32 + 0.3 * hash01(lane, 95 + i))).fill(hex(i % 2 ? tones.patchLight : tones.patchDark));
  }
  for (const side of [-1, 1]) {
    const bx = side < 0 ? L(-half) : L(half - bandW);
    const bw = L(bandW);
    g.rect(bx, top, bw, bottom - top).fill(hex(tones.grout));
    const rows = Math.max(3, Math.round((bottom - top) / L(0.62)));
    const rowH = (bottom - top) / rows;
    const sw = bw * 0.7;
    for (let i = 0; i < rows; i++) g.roundRect(bx + (bw - sw) / 2, top + i * rowH + rowH * 0.12, sw, rowH * 0.76, sw * 0.45);
    g.fill(hex(tones.cobble));
  }
  // the lane's edges meet the hedges with an ink line
  g.moveTo(x0, top).lineTo(x0, bottom).moveTo(x0 + lw, top).lineTo(x0 + lw, bottom).stroke({ width: ow, color: INK });
}

/** A tick per cell at both edges of each lane (reach is counted in cells): lanes at world x `xs`, `w` wide, on a board of `cell`. */
function drawTicks(p, g, xs, w, cell) {
  const { X, Y, ow } = p;
  const half = w / 2;
  const inner = half - (w - w * G.calm) / 2 - 0.04 * cell; // past the cobble band
  const ticks = laneTicks(cell);
  for (const cx of xs) {
    for (const ty of ticks) {
      const yy = Y(ty);
      for (const side of [-1, 1]) g.moveTo(X(cx + side * half), yy).lineTo(X(cx + side * inner), yy);
    }
  }
  if (xs.length && ticks.length) g.stroke({ width: Math.max(1.5, ow), color: INK, alpha: 0.7, cap: 'round' });
}

/** Chapter props on the outer hedges, placed by hash: small and faint, in the hedge's tint (DECOR). */
function drawDecor(p, decor, tx) {
  const { X, Y, L, chapter, skin } = p;
  decor.removeChildren().forEach((c) => c.destroy());
  const tint = hex(mix(skin.hedge, FRAME_CREAM, DECOR.tint));
  for (const spot of decorSpots(chapter)) {
    const sp = new Sprite(tx.frameTex(spot.id, chapter));
    const t = sp.texture;
    const hang = spot.id === 'env.lantern';
    sp.anchor.set(0.5, hang ? 0 : 0.5);
    const box = L(spot.s);
    sp.scale.set(Math.min(box / Math.max(1, t.width), (box * (hang ? 1.5 : 1)) / Math.max(1, t.height)));
    sp.position.set(X(spot.x), Y(spot.y + (hang ? 0.2 : 0)));
    if (spot.id === 'env.ember') sp.rotation = (hash01(spot.strip, Math.round(spot.y * 10)) - 0.5) * 1.6 + Math.PI / 2;
    sp.tint = tint;
    sp.alpha = DECOR.alpha;
    decor.addChild(sp);
  }
}

/** The joints drawn since the last fill or stroke: faint and thin, one stroke for the whole set. */
const joints = (p, wg) => wg.stroke({ width: p.thin, color: INK, alpha: STONE.joint });

/** The keep's dark floor: the board's footprint plus its pad (the same at every board size). */
function floorRect(p) {
  const { X, Y, L } = p;
  const pad = G.keep.pad;
  return { x: X(-BOARD_HALF - pad), y: Y(GRID_TOP + pad), w: L(BOARD_SPAN + pad * 2), h: L(GRID_TOP + pad * 2) };
}

function drawFloor(p, g) {
  const f = floorRect(p);
  g.rect(f.x, f.y, f.w, f.h).fill(hex(p.skin.floor));
}

/**
 * One flagstone pit, sunken, with a 1 px ink groove, centred on the origin, for a board of `cell`
 * (one shared context: every pit's Graphics draws it at its own place, scaled while the board grows).
 */
function drawPit(p, ctx, cell) {
  const { L, skin } = p;
  const pit = L(cell * G.pit);
  const pitR = L(cell * PLAQUE.pitR); // the plaque's corner and its groove: it seats without a dark triangle (src/art/plaque.js)
  const lip = Math.max(1.5, L(0.035 * cell));
  const x = -pit / 2;
  const y = -pit / 2;
  ctx.clear();
  ctx.roundRect(x, y, pit, pit, pitR).fill(hex(skin.pit));
  ctx.rect(x + pitR, y + 1, pit - pitR * 2, lip).fill(hex(tone(skin.pit, -0.3))); // inner shadow under the top edge
  ctx.rect(x + 1, y + pitR, lip, pit - pitR * 2).fill(hex(tone(skin.pit, -0.3)));
  ctx.rect(x + pitR, y + pit - lip - 1, pit - pitR * 2, lip).fill(hex(tone(skin.floor, 0.16))); // the lit lip
  ctx.roundRect(x, y, pit, pit, pitR).stroke({ width: 1, color: INK });
}

/** The keep's stone ring (side walls and the bottom wall: a few large stones with faint joints) and the floor's ink edge. */
function drawKeepRing(p, wg) {
  const { X, Y, L, ow } = p;
  const pad = G.keep.pad;
  const wallW = L(G.keep.wall);
  const ringY0 = Y(G.parapet.base);
  const ringY1 = Y(-pad - G.keep.wall);
  for (const side of [-1, 1]) {
    const x = side < 0 ? X(-BOARD_HALF - pad - G.keep.wall) : X(BOARD_HALF + pad);
    wg.rect(x, ringY0, wallW, ringY1 - ringY0).fill(p.stone);
    const n = Math.max(2, Math.round((ringY1 - ringY0) / L(STONE.length)));
    for (let i = 1; i < n; i++) wg.moveTo(x, ringY0 + ((ringY1 - ringY0) * i) / n).lineTo(x + wallW, ringY0 + ((ringY1 - ringY0) * i) / n);
    joints(p, wg);
    wg.rect(x, ringY0, wallW, ringY1 - ringY0).stroke({ width: ow, color: INK });
  }
  const x0 = X(-BOARD_HALF - pad - G.keep.wall);
  const x1 = X(BOARD_HALF + pad + G.keep.wall);
  const y = Y(-pad);
  wg.rect(x0, y, x1 - x0, wallW).fill(p.stone);
  wg.rect(x0, y + wallW * 0.74, x1 - x0, wallW * 0.26).fill(p.shade); // one cel along its foot
  const n = Math.max(2, Math.round((x1 - x0) / L(STONE.length)));
  for (let i = 1; i < n; i++) wg.moveTo(x0 + ((x1 - x0) * i) / n, y).lineTo(x0 + ((x1 - x0) * i) / n, y + wallW);
  joints(p, wg);
  wg.rect(x0, y, x1 - x0, wallW).stroke({ width: ow, color: INK });
  const f = floorRect(p);
  wg.rect(f.x, f.y, f.w, f.h).stroke({ width: ow, color: INK });
}

/** The field towers, left and right, from the parapet up past the gate wall; the rail hangs on the right one. */
function drawTowers(p, wg) {
  const { w, X, Y, L, ow, thin, stone, shade, light, skin } = p;
  const course = L(STONE.course);
  const step = L(STONE.length);
  for (const side of [-1, 1]) {
    const xin = X(side * G.towerIn);
    // to the screen's edge on a phone; a towerW-wide tower on a wider screen, the valley beyond it
    const far = X(side * (G.towerIn + G.towerW));
    const xout = side < 0 ? Math.max(-ow * 2, far) : Math.min(w + ow * 2, far);
    const x0 = Math.min(xin, xout);
    const x1 = Math.max(xin, xout);
    const shaftTop = Y(G.towerTop - 0.6);
    const base = Y(G.parapet.base - 0.32);
    wg.rect(x0, shaftTop, x1 - x0, base - shaftTop).fill(stone);
    // a few large stones: a faint joint along each course, and between its stones, offset course by course
    let row = 0;
    for (let y = base; y > shaftTop + 1; y -= course, row++) {
      const yt = Math.max(shaftTop, y - course);
      if (yt > shaftTop) wg.moveTo(x0, yt).lineTo(x1, yt);
      for (let k = (row % 2) * 0.5 + 0.5; k * step < x1 - x0; k += 1) wg.moveTo(xin + side * k * step, yt).lineTo(xin + side * k * step, y);
    }
    joints(p, wg);
    // one cel tone on the inner face: the right tower faces the light, the left one turns from it
    const faceW = L(0.13);
    wg.rect(side < 0 ? xin - faceW : xin, shaftTop, faceW, base - shaftTop).fill(side < 0 ? shade : light);
    // plinth and corbelled cap
    const plinth = L(0.38);
    wg.rect(side < 0 ? x0 : xin - L(0.08), base - plinth, x1 - x0 + L(0.08), plinth).fill(shade).stroke({ width: ow, color: INK });
    const capY = Y(G.towerTop - 0.4);
    wg.rect(side < 0 ? x0 : xin - L(0.1), capY, x1 - x0 + L(0.1), L(0.2)).fill(light).stroke({ width: ow, color: INK });
    // crenellations along the top, from the inner edge outward
    const mW = L(0.44);
    const gap = L(0.3);
    for (let k = 0; k * (mW + gap) < x1 - x0 + mW; k++) {
      const mx = side < 0 ? xin + L(0.1) - mW - k * (mW + gap) : xin - L(0.1) + k * (mW + gap);
      wg.rect(mx, Y(G.towerTop), mW, capY - Y(G.towerTop)).fill(stone).stroke({ width: ow, color: INK });
      wg.rect(mx, Y(G.towerTop), mW, L(0.07)).fill(light);
    }
    // the outline of the shaft's edges, and a slit window up high
    wg.moveTo(xin, shaftTop).lineTo(xin, base - plinth).moveTo(xout, shaftTop).lineTo(xout, base - plinth).stroke({ width: ow, color: INK });
    const winX = xin + side * Math.min(L(0.75), (x1 - x0) * 0.45);
    const winY = Y(G.gate.wallTop - 0.2);
    wg.roundRect(winX - L(0.08), winY, L(0.16), L(0.66), L(0.08)).fill(hex(skin.opening)).stroke({ width: ow, color: INK });
    wg.rect(winX - L(0.14), winY + L(0.66), L(0.28), L(0.08)).fill(light).stroke({ width: thin, color: INK });
  }
}

/** A gate arch's outer radius (opening and stone ring) on a board of `cell`. */
const archOut = (cell) => (CELL_SHARE.gateR + CELL_SHARE.gateRing) * cell;

/** The arches' stone backs, rising above the gate wall's top (drawn before the wall): lanes at world x `xs`. */
function drawArchBacks(p, g, xs, cell) {
  const { X, Y, L, stone } = p;
  const ro = L(archOut(cell));
  const cy = Y(G.gate.y);
  const wb = Y(G.gate.sill);
  for (const x of xs) {
    const cx = X(x);
    g.moveTo(cx - ro, wb).lineTo(cx - ro, cy).arc(cx, cy, ro, Math.PI, 0).lineTo(cx + ro, wb).closePath().fill(stone);
  }
}

/** The gate wall across the top of the field (the arches carry the detail): one faint course joint, a cel along its foot, the coping. */
function drawGateWall(p, wg) {
  const { X, Y, L, stone, shade, light } = p;
  const x0 = X(-G.towerIn);
  const x1 = X(G.towerIn);
  const wt = Y(G.gate.wallTop);
  const wb = Y(G.gate.sill);
  wg.rect(x0, wt, x1 - x0, wb - wt).fill(stone);
  wg.moveTo(x0, (wt + wb) / 2).lineTo(x1, (wt + wb) / 2);
  joints(p, wg);
  wg.rect(x0, wb - (wb - wt) * 0.12, x1 - x0, (wb - wt) * 0.12).fill(shade);
  wg.rect(x0, wt, x1 - x0, L(0.08)).fill(light); // the coping
}

/** Each lane's arch over the wall: the voussoir ring (lighter stones, radial joints, a keystone), the gate house's outline, the dark opening. */
function drawArches(p, wg, xs, cell) {
  const { X, Y, L, ow, thin, stone, light, skin } = p;
  const ri = L(CELL_SHARE.gateR * cell);
  const ro = L(archOut(cell));
  const cy = Y(G.gate.y);
  const wt = Y(G.gate.wallTop);
  const wb = Y(G.gate.sill);
  const kw = L(0.065 * cell);
  for (const x of xs) {
    const cx = X(x);
    wg.moveTo(cx - ro, cy).arc(cx, cy, ro, Math.PI, 0).lineTo(cx + ri, cy).arc(cx, cy, ri, 0, Math.PI, true).closePath().fill(light);
    for (let k = 1; k < 7; k++) {
      const a = Math.PI + (Math.PI * k) / 7;
      wg.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri).lineTo(cx + Math.cos(a) * ro, cy + Math.sin(a) * ro).stroke({ width: thin, color: INK, alpha: 0.7 });
    }
    wg.moveTo(cx - kw, cy - ri).lineTo(cx - kw * 1.5, cy - ro - L(0.02 * cell)).lineTo(cx + kw * 1.5, cy - ro - L(0.02 * cell)).lineTo(cx + kw, cy - ri).closePath().fill(stone).stroke({ width: thin, color: INK });
    wg.moveTo(cx - ro, wt).lineTo(cx - ro, cy).arc(cx, cy, ro, Math.PI, 0).lineTo(cx + ro, wt).stroke({ width: ow, color: INK });
    wg.moveTo(cx - ri, wb).lineTo(cx - ri, cy).arc(cx, cy, ri, Math.PI, 0).lineTo(cx + ri, wb).closePath().fill(hex(skin.opening)).stroke({ width: ow, color: INK });
  }
}

/** The gate wall's top and bottom ink lines, over its arches. */
function drawGateLines(p, wg) {
  const { X, Y, ow } = p;
  const x0 = X(-G.towerIn);
  const x1 = X(G.towerIn);
  wg.moveTo(x0, Y(G.gate.wallTop)).lineTo(x1, Y(G.gate.wallTop)).moveTo(x0, Y(G.gate.sill)).lineTo(x1, Y(G.gate.sill)).stroke({ width: ow, color: INK });
}

/** The parapet where the lanes meet the keep: the wall, one cel along its foot, its coping and outline. */
function drawParapet(p, wg) {
  const { X, Y, L, ow, stone, shade, light } = p;
  const x0 = X(-BOARD_HALF - G.keep.pad - G.keep.wall);
  const x1 = X(BOARD_HALF + G.keep.pad + G.keep.wall);
  const y0 = Y(G.parapet.wall);
  const y1 = Y(G.parapet.base);
  wg.rect(x0, y0, x1 - x0, y1 - y0).fill(stone);
  wg.rect(x0, y1 - (y1 - y0) * 0.26, x1 - x0, (y1 - y0) * 0.26).fill(shade); // one cel along its foot
  wg.rect(x0, y0, x1 - x0, L(0.07)).fill(light);
  wg.rect(x0, y0, x1 - x0, y1 - y0).stroke({ width: ow, color: INK });
}

/**
 * The parapet's parts by column: a faint joint between each pair of columns (under the gaps between the
 * merlons: a few large stones), and a merlon per column. Columns at world x `xs`, on a board of `cell`.
 */
function drawMerlons(p, wg, xs, cell) {
  const { X, Y, L, ow, stone, shade, light } = p;
  const y0 = Y(G.parapet.wall);
  const y1 = Y(G.parapet.base);
  for (let c = 1; c < xs.length; c++) {
    const x = X((xs[c - 1] + xs[c]) / 2);
    wg.moveTo(x, y0 + L(0.07)).lineTo(x, y1);
  }
  if (xs.length > 1) joints(p, wg);
  const mw = L(CELL_SHARE.merlon * cell);
  const my = Y(G.parapet.merlon);
  for (const xc of xs) {
    const mx = X(xc) - mw / 2;
    wg.rect(mx, my, mw, y0 - my).fill(stone);
    wg.rect(mx, my, mw, L(0.07)).fill(light);
    wg.rect(mx, y0 - (y0 - my) * 0.3, mw, (y0 - my) * 0.3).fill(shade);
    wg.rect(mx, my, mw, y0 - my).stroke({ width: ow, color: INK });
  }
}

/** The keep's corner towers, over the ring and the parapet's ends. */
function drawKeepTowers(p, wg) {
  const { X, Y, L, ow, stone, shade, light } = p;
  const ct = L(G.keep.tower);
  for (const [cxw, cyw] of [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ]) {
    const x = X(cxw * (BOARD_HALF + G.keep.pad + G.keep.wall / 2)) - ct / 2;
    const yc = cyw > 0 ? G.parapet.base + 0.2 : -G.keep.pad - G.keep.wall / 2;
    const y = Y(yc) - ct / 2;
    wg.roundRect(x, y, ct, ct, L(0.08)).fill(stone);
    wg.rect(x, y + ct * 0.72, ct, ct * 0.28).fill(shade);
    wg.rect(x, y, ct, L(0.08)).fill(light);
    wg.roundRect(x, y, ct, ct, L(0.08)).stroke({ width: ow, color: INK });
    if (cyw > 0) {
      // two merlons on the top towers
      const mw = ct * 0.32;
      for (const mx of [x, x + ct - mw]) wg.rect(mx, y - L(0.2), mw, L(0.2)).fill(light).stroke({ width: ow, color: INK });
    }
  }
}

/**
 * The gates' moving parts, placed on lanes at world x `xs` (a board of `cell`): the iris, the portcullis
 * bars (rolled up by scale.y, drawn from the arch's crown down) and the boss gate's banners.
 */
function placeGates(p, gates, xs, cell, bannerTex) {
  const { X, Y, L, skin } = p;
  const ri = L(CELL_SHARE.gateR * cell);
  const cy = Y(G.gate.y);
  const sill = Y(G.gate.sill);
  const fit = laneFit(cell);
  for (let lane = 0; lane < gates.length; lane++) {
    const gt = gates[lane];
    const cx = X(xs[lane]);
    gt.iris.position.set(cx, cy);
    const bars = gt.bars.clear();
    bars.position.set(cx, cy - ri);
    const span = sill - (cy - ri);
    const step = ri / 2.6;
    const bar = (x0, y0, x1, y1) => {
      bars.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: Math.max(2.5, L(0.035 * cell)), color: INK });
      bars.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: Math.max(1, L(0.015 * cell)), color: hex(skin.iron) });
    };
    for (let x = -ri + step * 0.6; x < ri - step * 0.3; x += step) bar(x, ri - Math.sqrt(Math.max(0, ri * ri - x * x)) + 1, x, span - 1);
    for (const fy of [0.45, 0.78]) {
      const y = span * fy;
      const half = Math.sqrt(Math.max(0, ri * ri - Math.max(0, ri - y) ** 2));
      bar(-half + 1, y, half - 1, y);
    }
    gt.banners.children.forEach((b, i) => {
      b.texture = bannerTex;
      b.scale.set(L(1.05 * fit) / Math.max(1, bannerTex.height));
      b.position.set(cx + (i ? 1 : -1) * L(CELL_SHARE.gateR * cell + CELL_SHARE.gateRing * cell * 0.5), Y(G.gate.wallTop + 0.42));
    });
  }
}

/** The braziers on the merlons (columns at world x `xs`): the bowl, the flame above it, and a thin dark smoke column (pressure). */
function placeBraziers(p, braziers, xs, cell, bowlT, flameT) {
  const { X, Y, L } = p;
  const fit = laneFit(cell);
  for (let c = 0; c < braziers.length; c++) {
    const b = braziers[c];
    const x = X(xs[c]);
    const y = Y(G.parapet.merlon);
    b.bowl.texture = bowlT;
    b.bowl.scale.set(L(0.62 * fit) / Math.max(1, bowlT.width));
    b.bowl.position.set(x, y + L(0.04));
    b.flame.texture = flameT;
    b.size = L(0.6 * fit) / Math.max(1, flameT.height);
    b.flame.position.set(x, y - b.bowl.height * 0.62);
    if (b.smokeFit !== fit || b.smokeU !== p.U) {
      b.smokeFit = fit;
      b.smokeU = p.U;
      const s = b.smoke.clear();
      for (let i = 0; i < 5; i++) {
        const k = i / 4;
        s.circle(Math.sin(i * 1.7) * L(0.07 * fit), -k * L(1.1 * fit), L((0.07 + 0.05 * k) * fit)).fill({ color: INK, alpha: 0.5 - 0.3 * k });
      }
    }
    b.smoke.position.set(x, y - b.bowl.height * 0.62 - L(0.5 * fit));
  }
}

/**
 * The deck rail (timber) behind the dice, with a dashed slot for the next die and the block value
 * that brings it ("at 256", 12 px or more). The dice and the slot are centred together (deckRow).
 */
function drawDeck(p, g, text, deck) {
  const { X, Y, L, U, ow, skin } = p;
  g.clear();
  text.visible = false;
  if (!deck.dice) return;
  const { die, y } = G.deck;
  const row = deckRow(deck.dice, !!deck.nextAt);
  const trim = skin.trim;
  const top = Y(y + die / 2 + 0.14);
  const len = L(row.right - row.left);
  g.roundRect(X(row.left), top, len, L(die + 0.28), L(0.16)).fill(hex(trim));
  g.rect(X(row.left) + L(0.1), Y(y + 0.02), len - L(0.2), L(0.05)).fill(hex(tone(trim, -0.22)));
  g.rect(X(row.left) + L(0.1), top + L(0.06), len - L(0.2), L(0.06)).fill(hex(tone(trim, 0.2)));
  g.roundRect(X(row.left), top, len, L(die + 0.28), L(0.16)).stroke({ width: ow, color: INK });
  for (const xn of [row.left + 0.16, row.right - 0.16]) g.circle(X(xn), Y(y), L(0.05)).fill(INK);
  if (!deck.nextAt) return;
  // the dashed slot: where the next die will go, and the block that brings it
  const sx0 = X(row.slotX);
  const sy0 = Y(y + die / 2);
  const sw = L(G.deck.slot);
  const sh = L(die);
  g.roundRect(sx0, sy0, sw, sh, L(0.16)).fill({ color: INK, alpha: 0.35 });
  const dash = Math.max(3, L(0.12));
  const edge = (xa, ya, xb, yb) => {
    const n = Math.hypot(xb - xa, yb - ya);
    for (let d = 0; d < n; d += dash * 2) {
      const e = Math.min(n, d + dash);
      g.moveTo(xa + ((xb - xa) * d) / n, ya + ((yb - ya) * d) / n).lineTo(xa + ((xb - xa) * e) / n, ya + ((yb - ya) * e) / n);
    }
  };
  const inset = L(0.08);
  edge(sx0 + inset, sy0, sx0 + sw - inset, sy0);
  edge(sx0 + sw, sy0 + inset, sx0 + sw, sy0 + sh - inset);
  edge(sx0 + sw - inset, sy0 + sh, sx0 + inset, sy0 + sh);
  edge(sx0, sy0 + sh - inset, sx0, sy0 + inset);
  g.stroke({ width: Math.max(1.5, L(0.05)), color: CREAM, cap: 'round' });
  const fontPx = Math.max(MIN_TEXT, Math.round(0.36 * U));
  text.text = tr('deck.at', { n: num(deck.nextAt) });
  text.style.fontSize = fontPx;
  text.style.stroke = { color: INK, width: Math.max(3, fontPx * 0.24), join: 'round' };
  // the slot is wide enough for "at 512" at 14 px on a 360 px phone; only a smaller window squeezes it
  text.scale.set(Math.min(1, (sw - 4) / Math.max(1, text.width / text.scale.x)));
  text.position.set(sx0 + sw / 2, sy0 + sh / 2);
  text.visible = true;
}

/** Tell the DOM HUD where the frame is: the towers' inner edges (the ribbon fits between them, the rail hangs on the right one), the gate top and the parapet. */
function publishFrame(p) {
  const css = globalThis.document?.documentElement?.style;
  if (!css) return;
  const { X, Y, U } = p;
  css.setProperty('--tower-l', `${Math.round(X(-G.towerIn))}px`);
  css.setProperty('--tower-r', `${Math.round(X(G.towerIn))}px`);
  css.setProperty('--gate-top', `${Math.round(Y(G.rail.top))}px`);
  css.setProperty('--parapet-y', `${Math.round(Y(G.parapet.wall))}px`);
  css.setProperty('--u', `${U.toFixed(2)}px`);
}

// --- the frame ------------------------------------------------------------------------------------

/**
 * @param stage  the stage (src/render/stage.js)
 * @param fx     optional: the effects module, whose light budget a brazier books each time it lights (and the grow moment its dust)
 * @param tx     the textures and the text it draws with (tests pass stand-ins)
 */
export function createFrame(stage, { fx = null, tx = FRAME_TEXTURES } = {}) {
  const { layers } = stage;
  let chapter = 'forest';
  let skin = skinFor(chapter);

  // far + mid (bg layer)
  const sky = { bgG: new Graphics(), bgArt: new Sprite(), ridge: new Sprite() };
  sky.bgArt.anchor.set(0.5);
  sky.ridge.anchor.set(0.5, 1);
  layers.bg.addChild(sky.bgG, sky.bgArt, sky.ridge);
  let grad = null; // the sky's gradient: one per chapter (it is local to the shape, so a resize keeps it)
  let gradFor = '';

  // ground (path layer, under foes, puddles and decals): the hedges and their decor, a strip per lane
  // over them (a lane sliding in passes over a prop), the lanes' ticks
  const groundG = new Graphics();
  const decor = new Container();
  const laneLayer = new Container();
  const ticksG = new Graphics();
  layers.path.addChild(groundG, decor, laneLayer, ticksG);

  // walls (board layer, under the tiles and the deck dice), back to front: the keep's floor, its pits
  // (clipped to the floor while the board grows), its ring; the arches' backs, the gate wall, the arches;
  // the parapet and its merlons; the towers in front of what slides in from behind them
  const floorG = new Graphics();
  const pitLayer = new Container();
  const pitMask = new Graphics();
  pitMask.visible = false;
  const pitCtx = new GraphicsContext(); // one pit, shared by every pit (drawn per build)
  const ringG = new Graphics();
  const archBackG = new Graphics();
  const gateWallG = new Graphics();
  const archG = new Graphics();
  const gateLinesG = new Graphics();
  const parapetG = new Graphics();
  const merlonG = new Graphics();
  const towerG = new Graphics();
  const deckG = new Graphics();
  const deckText = tx.text({ fontFamily: FONT, fontWeight: '800', fontSize: 24, fill: CREAM, stroke: { color: INK, width: 5, join: 'round' } });
  deckText.anchor.set(0.5);
  const gateLayer = new Container();
  const fireLayer = new Container();
  layers.board.addChild(floorG, pitLayer, pitMask, ringG, archBackG, gateWallG, archG, gateLinesG, parapetG, merlonG, towerG, deckG, deckText, gateLayer, fireLayer);

  const lanes = []; // { c, g }: a lane's strip in its container (moved and stretched while the board grows)
  const gates = [];
  const braziers = [];
  const pits = []; // a Graphics per cell (row-major), each drawing pitCtx
  /** The board as built (its side) and as drawn now (the drawn cell, the lanes' and the pits' world places). */
  const built = { size: 0, cell: 0, xs: [], pitXs: [], pitYs: [], bannerTex: null, bowlT: null, flameT: null };
  let grow = null; // the grow moment: { from, to, t }

  function makeGate() {
    const iris = new Sprite(tx.portalTex());
    iris.anchor.set(0.5);
    const bars = new Graphics(); // the portcullis, rolled up as the gate opens
    const chip = new Container(); // the next wave's chip, at the gate (it moves with its lane)
    const banners = new Container();
    for (let i = 0; i < 2; i++) {
      const b = new Sprite();
      b.anchor.set(0.5, 0);
      banners.addChild(b);
    }
    gateLayer.addChild(iris, bars, chip, banners);
    return { iris, bars, chip, banners, open: 0, irisA: 0.2, chipA: 0, want: false, seen: 1 };
  }
  function makeBrazier() {
    const smoke = new Graphics();
    const bowl = new Sprite();
    bowl.anchor.set(0.5, 1);
    const flame = new Sprite();
    flame.anchor.set(0.5, 1);
    flame.visible = false;
    fireLayer.addChild(smoke, bowl, flame);
    return { smoke, bowl, flame, lit: 0, smokeA: 0, want: false, shown: null, size: 0, seen: 1 };
  }

  /** Lanes, gates, braziers and pits for a board `n` × `n`. */
  function ensure(n) {
    while (lanes.length < n) {
      const c = new Container();
      const g = new Graphics();
      c.addChild(g);
      laneLayer.addChild(c);
      lanes.push({ c, g });
    }
    while (lanes.length > n) lanes.pop().c.destroy({ children: true });
    while (gates.length < n) gates.push(makeGate());
    while (gates.length > n) {
      const gt = gates.pop();
      for (const o of [gt.iris, gt.bars, gt.chip, gt.banners]) o.destroy({ children: true });
    }
    while (braziers.length < n) braziers.push(makeBrazier());
    while (braziers.length > n) {
      const b = braziers.pop();
      for (const o of [b.smoke, b.bowl, b.flame]) o.destroy();
    }
    while (pits.length < n * n) {
      const g = new Graphics(pitCtx);
      pitLayer.addChild(g);
      pits.push(g);
    }
    while (pits.length > n * n) pits.pop().destroy();
  }

  let preview = []; // [{ lane, type, count, boss }]
  let resized = false; // the next buildChips follows a rebuild: old chips go at once
  let previewKey = '';
  let deck = { dice: 0, nextAt: null };
  // a font (a language's own letters) that arrives after the first frame: the deck text is drawn
  // again with it (a canvas text is drawn once, with the fonts loaded then)
  globalThis.document?.fonts?.addEventListener?.('loadingdone', () => {
    deckText.text = '';
    drawDeck(penFor(stage, stage.view, skin, chapter), deckG, deckText, deck);
  });
  let time = 0;

  // --- static build: once per resize, chapter or board size ---
  function build(view) {
    const p = penFor(stage, view, skin, chapter);
    if (gradFor !== chapter) {
      sky.bgG.clear(); // let go of the old gradient before it is destroyed
      grad?.destroy?.();
      grad = tx.gradient(skin);
      gradFor = chapter;
    }
    built.size = GRID.size;
    built.cell = GRID.cell;
    ensure(built.size);
    drawSky(p, sky, grad, tx);
    drawHedges(p, groundG.clear());
    drawDecor(p, decor, tx);
    const w = CELL_SHARE.lane * built.cell;
    lanes.forEach((ln, l) => drawLane(p, ln.g.clear(), l, w, built.cell));
    drawFloor(p, floorG.clear());
    drawPit(p, pitCtx, built.cell);
    const f = floorRect(p);
    pitMask.clear().rect(f.x, f.y, f.w, f.h).fill({ color: 0xffffff });
    drawKeepRing(p, ringG.clear());
    drawGateWall(p, gateWallG.clear());
    drawGateLines(p, gateLinesG.clear());
    drawParapet(p, parapetG.clear());
    const tg = towerG.clear();
    drawTowers(p, tg);
    drawKeepTowers(p, tg);
    built.bannerTex = tx.frameTex('env.banner', chapter);
    built.bowlT = tx.frameTex('env.brazier', chapter);
    built.flameT = tx.frameTex('env.flame', chapter);
    for (const b of braziers) b.smokeFit = null; // its smoke again, for this U
    resized = true;
    place(p);
    buildChips();
    drawDeck(p, deckG, deckText, deck);
    publishFrame(p);
  }

  /**
   * The parts sized by the board, where they are drawn now: on the built board, or easing to it while it
   * grows (the drawn cell between the old board's and the new one's; new lanes and pits sliding in from
   * out of sight: frame-kit growPos).
   */
  function place(p = penFor(stage, stage.view, skin, chapter)) {
    const { X, Y } = p;
    const n = built.size;
    const c1 = built.cell;
    const g = grow;
    const k = g ? growEase(g.t / GROW.time) : 1;
    const c0 = g ? BOARD_SPAN / g.from : c1;
    const cell = c0 + (c1 - c0) * k;
    built.drawn = cell;
    // a lane (its strip, ticks, arch, merlon, gate and brazier) slides in from behind the right tower
    const laneHide = { hide: G.towerIn, half: archOut(c0) };
    built.xs = Array.from({ length: n }, (_, l) => (g ? growPos(l, g.from, n, k, cellXAt, laneHide) : cellXAt(l, c1)));
    const w = CELL_SHARE.lane * cell;
    const sx = w / (CELL_SHARE.lane * c1);
    lanes.forEach((ln, l) => {
      ln.c.position.set(X(built.xs[l]), 0);
      ln.c.scale.set(sx, 1);
    });
    drawTicks(p, ticksG.clear(), built.xs, w, cell);
    drawArchBacks(p, archBackG.clear(), built.xs, cell);
    drawArches(p, archG.clear(), built.xs, cell);
    drawMerlons(p, merlonG.clear(), built.xs, cell);
    // a new column of pits slides in under the keep's right wall, a new row under the parapet (clipped to the floor)
    const pitHalf = (G.pit * c0) / 2;
    const colHide = { hide: BOARD_HALF + G.keep.pad, half: pitHalf };
    const rowHide = { hide: GRID_TOP + G.keep.pad, half: pitHalf };
    built.pitXs = Array.from({ length: n }, (_, c) => (g ? growPos(c, g.from, n, k, cellXAt, colHide) : cellXAt(c, c1)));
    built.pitYs = Array.from({ length: n }, (_, r) => (g ? growPos(r, g.from, n, k, cellYAt, rowHide) : cellYAt(r, c1)));
    const ps = cell / c1;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const pg = pits[r * n + c];
        pg.position.set(X(built.pitXs[c]), Y(built.pitYs[r]));
        pg.scale.set(ps);
      }
    }
    // the floor clips the pits only while new ones slide in (a mask is drawn only while it masks)
    pitMask.visible = !!g;
    pitLayer.mask = g ? pitMask : null;
    placeGates(p, gates, built.xs, cell, built.bannerTex);
    placeBraziers(p, braziers, built.xs, cell, built.bowlT, built.flameT);
    // the gates' pieces and the braziers stand over the towers: a lane sliding in shows them only once
    // they are clear of the right tower (they fade in as they come out from behind it)
    const ri = CELL_SHARE.gateR * cell;
    for (let l = 0; l < n; l++) {
      const gt = gates[l];
      gt.seen = g ? Math.max(0, Math.min(1, (G.towerIn - (built.xs[l] + ri)) / EMERGE)) : 1;
      gt.chip.position.set(X(built.xs[l]), Y(G.gate.y - 0.05));
      gt.chip.scale.set(laneFit(cell) / laneFit(c1));
      const b = braziers[l];
      b.seen = g ? Math.max(0, Math.min(1, (G.towerIn - (built.xs[l] + 0.31 * laneFit(cell))) / EMERGE)) : 1;
    }
  }

  // the next wave's chips in the open gates: a foe on a cream token, and how many come this way (drawn
  // round the gate, whose chip container stands on its lane)
  function buildChips() {
    const U = stage.view.U;
    const px = Math.max(MIN_TEXT, Math.round(0.42 * U));
    const fit = laneFit(built.cell);
    const clear = (gt) => gt.chip.removeChildren().forEach((c) => c.destroy());
    // a gate that keeps no chip lets its old one fade out (update); a resize drops it at once
    for (const gt of gates) {
      gt.want = false;
      if (resized) clear(gt);
    }
    resized = false;
    for (const p of preview) {
      const gt = gates[p.lane];
      if (!gt || !p.type) continue;
      clear(gt);
      gt.want = true;
      const r = (p.boss ? 0.52 : 0.44) * U * fit;
      const token = new Graphics().circle(0, 0, r).fill(CREAM).stroke({ width: Math.max(1.25, 0.055 * U), color: INK });
      if (p.boss) token.circle(0, 0, r - Math.max(2, 0.06 * U)).stroke({ width: Math.max(1.5, 0.05 * U), color: hex(skin.banner) });
      const foe = new Sprite(tx.enemyTex(p.type));
      foe.anchor.set(0.5);
      const t = foe.texture;
      foe.scale.set(Math.min((r * 1.7) / Math.max(1, t.width), (r * 1.6) / Math.max(1, t.height)));
      gt.chip.addChild(token, foe);
      if (p.count > 0) {
        const label = new Text({ text: `${p.boss ? '+' : '×'}${p.count}`, style: { fontFamily: FONT, fontWeight: '800', fontSize: px, fill: CREAM, stroke: { color: INK, width: Math.max(3, px * 0.28), join: 'round' } } });
        label.anchor.set(0.5);
        label.position.set(r * 0.78, r * 0.72);
        gt.chip.addChild(label);
      }
    }
  }

  /** The grow moment's dust: soft puffs along the keep's right wall and its parapet, as the new column and row push in from under them. */
  function dust() {
    if (!fx?.particle || stage.reduced) return;
    const D = GROW_DUST;
    if (!fx.flashAll(D.n * DOT.share * (D.size + D.grow) ** 2, D.life)) return;
    const color = hex(mix(skin.stone[0], skin.lane, 0.5));
    const half = Math.floor(D.n / 2);
    for (let i = 0; i < half; i++) fx.particle(tx.softDot(), BOARD_HALF + G.keep.pad + G.keep.wall / 2, 1 + (i * (GRID_TOP - 2)) / Math.max(1, half - 1), { vx: 0.6, vy: 0.15, life: D.life, size: D.size, grow: D.grow, alpha: D.alpha, color, drag: 2 });
    for (let i = 0; i < D.n - half; i++) fx.particle(tx.softDot(), -BOARD_HALF + 1 + (i * (BOARD_SPAN - 2)) / Math.max(1, D.n - half - 1), G.parapet.base + 0.2, { vx: 0.1, vy: 0.6, life: D.life, size: D.size, grow: D.grow, alpha: D.alpha, color, drag: 2 });
  }

  stage.onResize(build);

  return {
    /** The chapter skin ('forest' | 'fareast' | 'peaks'): the static frame is rebuilt when it changes. */
    setChapter(key) {
      if (!key || key === chapter) return;
      chapter = key;
      skin = skinFor(key);
      build(stage.view);
    },
    get chapter() {
      return chapter;
    },
    /**
     * The board grew ({ type: 'grow', size, from }: always in a break): the frame is rebuilt at its new size
     * and eases there from the old one over GROW.time (under Reduce motion it is there at once; the stage
     * cross-fades instead).
     */
    grow(e) {
      const from = e?.from ?? built.size;
      grow = !stage.reduced && from > 0 && GRID.size > from ? { from, to: GRID.size, t: 0 } : null;
      build(stage.view);
      if (grow) dust();
    },
    /** Is the grow moment playing? */
    get growing() {
      return !!grow;
    },
    /**
     * The board as drawn now (world units; for tests and checks): its size, the drawn cell, the lanes'
     * centres and width, the pits' centres and size, each arch's radii.
     */
    get layout() {
      const cell = built.drawn ?? built.cell;
      return {
        size: built.size,
        cell,
        lanes: built.xs.map((x) => ({ x, w: CELL_SHARE.lane * cell })),
        pits: built.pitYs.flatMap((y) => built.pitXs.map((x) => ({ x, y, size: G.pit * cell }))),
        arches: built.xs.map((x) => ({ x, r: CELL_SHARE.gateR * cell, out: archOut(cell) })),
        merlons: built.xs.map((x) => ({ x, w: CELL_SHARE.merlon * cell })),
        gates: gates.map((gt) => ({ x: (gt.iris.position.x - stage.view.ox) / stage.view.U, seen: gt.seen })),
        braziers: braziers.map((b) => ({ x: (b.bowl.position.x - stage.view.ox) / stage.view.U, seen: b.seen })),
        ticks: laneTicks(cell),
        clipped: pitLayer.mask === pitMask,
      };
    },
    /** The next wave's chips for the open gates ([{ lane, type, count, boss }], previewChips); null or [] hides them. */
    setPreview(list) {
      const next = list ?? [];
      const key = next.map((p) => `${p.lane}:${p.type}:${p.count}:${p.boss ? 1 : 0}`).join('|');
      if (key === previewKey) return;
      previewKey = key;
      preview = next;
      buildChips();
    },
    /** The deck rail: how many dice, and the block value that brings the next one (null: none left). */
    setDeck({ dice = 0, nextAt = null } = {}) {
      if (dice === deck.dice && nextAt === deck.nextAt) return;
      deck = { dice, nextAt };
      drawDeck(penFor(stage, stage.view, skin, chapter), deckG, deckText, deck);
    },
    /** Per frame. state = { lanes, bossLane, phase, perLane, due } (brazierState) */
    update(dt, state = null) {
      time += dt;
      // a board of another size than the one built, with no grow moment (a restored run, a new run): at once
      if (!grow && built.size !== GRID.size) build(stage.view);
      if (grow) {
        grow.t += dt;
        if (grow.t >= GROW.time) {
          grow = null;
          if (!stage.reduced) stage.shake?.(2); // the keep settles at its new size
        }
        place();
      }
      const U = stage.view.U;
      const reduced = stage.reduced;
      const lanesOn = state?.lanes ?? [];
      const ri = CELL_SHARE.gateR * (built.drawn ?? built.cell);
      // the far layer stays put when the screen shakes, the ridge moves a fifth as much
      const root = layers.bg.parent;
      if (root) {
        layers.bg.position.set(-root.position.x, -root.position.y);
        sky.ridge.pivot.set(-root.position.x * 0.2, -root.position.y * 0.2);
      }
      for (let lane = 0; lane < gates.length; lane++) {
        const gt = gates[lane];
        const active = lanesOn.includes(lane);
        const boss = state?.bossLane === lane && state?.bossLane != null;
        gt.open += ((active ? 1 : 0) - gt.open) * Math.min(1, dt * 5);
        // the iris grows as its gate opens, capped at the arch's inner radius
        const size = Math.min(2 * ri, ((0.92 + 0.24 * gt.open) * (built.drawn ?? built.cell)) / DESIGN_CELL) * U;
        gt.iris.width = gt.iris.height = size;
        gt.iris.rotation = reduced ? 0 : time * (0.35 + 1.1 * gt.open) * (lane % 2 ? -1 : 1);
        // the chips fade in and out, and the iris eases behind them: no step when a wave starts
        gt.chipA += ((gt.want ? 1 : 0) - gt.chipA) * Math.min(1, dt * 6);
        if (!gt.want && gt.chipA < 0.02 && gt.chip.children.length) gt.chip.removeChildren().forEach((c) => c.destroy());
        gt.chip.alpha = gt.chipA * gt.seen;
        gt.chip.visible = gt.chip.children.length > 0 && gt.chip.alpha > 0.01;
        gt.irisA += ((gt.want ? 0.35 : 0.2 + 0.8 * gt.open) - gt.irisA) * Math.min(1, dt * 5);
        gt.iris.alpha = gt.irisA * gt.seen;
        gt.iris.tint = boss ? 0xff8a8a : 0xffffff;
        gt.bars.scale.y = Math.max(0.02, 1 - gt.open);
        gt.bars.visible = gt.open < 0.98 && gt.seen > 0;
        gt.bars.alpha = gt.seen;
        gt.banners.visible = boss && gt.seen > 0;
        gt.banners.alpha = gt.seen;
      }
      for (let c = 0; c < braziers.length; c++) {
        const b = braziers[c];
        // the lane's state, held for a moment after it calms down: no blink with each kill and spawn
        b.shown = holdBrazier(b.shown, brazierState(c, state), dt);
        let want = b.shown.st !== 'cold';
        // each time a brazier lights, even while its last flame still fades, it books the flame in the
        // light budget first (photosafe); while the budget is full it stays dark and asks again next frame
        if (want && !b.want && fx && !fx.flashAll(FLAME_LIT, 0.4)) want = false;
        b.want = want;
        b.lit += ((want ? 1 : 0) - b.lit) * Math.min(1, dt * 5);
        b.smokeA += ((want && b.shown.st === 'pressure' ? 1 : 0) - b.smokeA) * Math.min(1, dt * 2);
        // a slow 2 s breath, never a flicker; Reduce motion holds it steady
        const breathe = reduced ? 0 : Math.sin(time * Math.PI + c * 0.9);
        const grown = b.size * (0.55 + 0.45 * b.lit);
        b.bowl.alpha = b.seen;
        b.bowl.visible = b.seen > 0;
        b.flame.visible = b.lit > 0.02 && b.seen > 0;
        b.flame.alpha = Math.min(1, b.lit * 1.2) * b.seen;
        b.flame.scale.set(grown * (1 + 0.04 * breathe), grown * (1 + 0.09 * breathe));
        b.smoke.visible = b.smokeA > 0.02 && b.seen > 0;
        b.smoke.alpha = b.smokeA * 0.8 * b.seen;
        b.smoke.pivot.y = reduced ? 0 : Math.sin(time * 0.8 + c) * 0.06 * U;
      }
    },
  };
}
