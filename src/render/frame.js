// The siege frame (proposal 4.2), in the sticker style: plum ink outline, flat fills, one cel tone,
// colours only from the chapter skin (src/art/frame-kit.js). Three depth layers:
//   far        the chapter's painted backdrop (env.<ch>.backdrop, else env.background, else a gradient)
//   mid        the ridge strip along the top of the field (env.<ch>.ridge, else a drawn silhouette)
//   foreground the frame: towers, the gate wall with four arches, lanes and hedges, the parapet with
//              its braziers, the keep with its flagstone pits, the deck rail
// The static parts are Graphics built once per resize or chapter, one step per part (drawSky …
// publishFrame). Per frame only the gates (iris, portcullis), the braziers (flame, smoke) and the
// parallax offset change, by transform and alpha. Nothing is additive. The generated env.* sprites
// and their drawn stand-ins are in src/render/frame-art.js.
import { Container, FillGradient, Graphics, Sprite, Text } from 'pixi.js';
import { FIELD, GRID, cellX, cellY, laneX } from '../config.js';
import { FRAME_GEOM as G, FRAME_INK, FRAME_CREAM, brazierState, deckRow, decorSpots, hash01, hedgeStrips, holdBrazier, laneTicks, laneTones, skinFor } from '../art/frame-kit.js';
import { tone } from '../art/tokens.js';
import { enemyTex, generatedTex, portalTex } from './textures.js';
import { frameTex } from './frame-art.js';

const hex = (c) => parseInt(String(c).replace('#', ''), 16);
const INK = hex(FRAME_INK);
const CREAM = hex(FRAME_CREAM);
const HALF = G.laneW / 2;
const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';
/** No text in the canvas is smaller than this (CSS px), as in the DOM HUD. */
const MIN_TEXT = 12;
/** What a brazier's flame lights as it comes on (world units², booked with fx each time it lights). */
const FLAME_LIT = 0.15;

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

/** Far and mid: the painting (or the gradient and a few stars), and the ridge strip, its foot hidden behind the gate wall. */
function drawSky(p, { bgG, bgArt, bgDim, ridge }, grad) {
  const { w, h, L, Y, skin, chapter } = p;
  bgG.clear().rect(0, 0, w, h).fill(grad);
  for (let i = 0; i < 60; i++) bgG.circle(hash01(i, 1) * w, hash01(i, 2) * h * 0.7, 1 + hash01(i, 3) * 1.6).fill({ color: CREAM, alpha: 0.05 + hash01(i, 4) * 0.05 });
  const art = generatedTex(skin.backdrop) ?? generatedTex('env.background');
  bgArt.visible = bgDim.visible = !!art;
  if (art) {
    bgArt.texture = art;
    bgArt.scale.set(Math.max(w / art.width, h / art.height)); // cover the screen
    bgArt.position.set(w / 2, h / 2);
    bgDim.clear().rect(0, 0, w, h).fill({ color: hex(skin.sky[2]), alpha: 0.3 });
  }
  const rt = frameTex(skin.ridge, chapter);
  ridge.texture = rt;
  const rw = w + 24;
  ridge.width = rw;
  ridge.height = Math.min(L(1.7), (rw * rt.height) / Math.max(1, rt.width));
  ridge.position.set(w / 2, Y(G.gate.wallTop - 0.25));
}

/** The ground: hedges between the lanes, the lanes (a calm centre, cobbled bands) and a tick per cell. */
function drawGround(p, g) {
  const { X, Y, L, ow, thin, skin } = p;
  const tones = laneTones(skin);
  const top = Y(G.gate.sill + 0.12); // tucked under the gate wall
  const bottom = Y(G.parapet.wall - 0.12); // and under the parapet
  const hedge = hex(skin.hedge);
  const hedgeDark = hex(tone(skin.hedge, -0.22));
  const hedgeLight = hex(tone(skin.hedge, 0.14));
  for (const [k, st] of hedgeStrips().entries()) {
    const x0 = X(st.x0);
    const x1 = X(st.x1);
    g.rect(x0, top, x1 - x0, bottom - top).fill(hedge);
    // leaf clumps (dark) and a lit scallop edge on each side (one cel tone each way)
    const n = Math.max(3, Math.round((bottom - top) / L(0.42)));
    for (let i = 0; i < n; i++) {
      const cy = top + ((i + 0.5) / n) * (bottom - top);
      const r = (x1 - x0) * (0.22 + 0.12 * hash01(k, i));
      g.circle(x0 + (x1 - x0) * (0.3 + 0.4 * hash01(k + 9, i)), cy, r).fill(hedgeDark);
      g.circle(x0 + (x1 - x0) * 0.18, cy + L(0.12), (x1 - x0) * 0.16).fill(hedgeLight);
    }
    g.rect(x0, top, x1 - x0, bottom - top).stroke({ width: ow, color: INK });
  }
  const calmW = G.laneW * G.calm;
  const bandW = (G.laneW - calmW) / 2;
  for (let lane = 0; lane < FIELD.lanes; lane++) {
    const cx = laneX(lane);
    const x0 = X(cx - HALF);
    const lw = L(G.laneW);
    // the calm centre: light sand with a few large, low-contrast patches (≤ 4 L* from the lane)
    g.rect(x0, top, lw, bottom - top).fill(hex(tones.base));
    for (let i = 0; i < 7; i++) {
      const py = top + (bottom - top) * ((i + 0.15 + 0.7 * hash01(lane, 70 + i)) / 7);
      const px = X(cx + (hash01(lane, 80 + i) - 0.5) * calmW * 0.6);
      g.ellipse(px, py, L(calmW * (0.28 + 0.12 * hash01(lane, 90 + i))), L(0.32 + 0.3 * hash01(lane, 95 + i))).fill(hex(i % 2 ? tones.patchLight : tones.patchDark));
    }
    // the cobble bands: outlined stones only in the outer 20% each side
    for (const side of [-1, 1]) {
      const bx = side < 0 ? X(cx - HALF) : X(cx + HALF - bandW);
      g.rect(bx, top, L(bandW), bottom - top).fill(hex(tones.grout));
      const rows = Math.round((bottom - top) / L(0.34));
      const rowH = (bottom - top) / rows;
      for (let i = 0; i < rows; i++) {
        const jitter = hash01(lane * 2 + (side > 0 ? 1 : 0), i);
        const sw = L(bandW) * (0.72 + 0.16 * jitter);
        const sx0 = bx + (L(bandW) - sw) / 2 + side * L(0.02) * (jitter - 0.5);
        g.roundRect(sx0, top + i * rowH + rowH * 0.1, sw, rowH * 0.8, Math.min(sw, rowH) * 0.32)
          .fill(hex(i % 3 === 1 ? tones.cobbleLight : tones.cobble))
          .stroke({ width: thin, color: hex(tones.cobbleLine) });
      }
    }
    // a tick per cell at both edges (reach is counted in cells)
    for (const ty of laneTicks()) {
      const yy = Y(ty);
      for (const side of [-1, 1]) {
        const xe = X(cx + side * HALF);
        const xi = X(cx + side * (HALF - bandW - 0.08));
        g.moveTo(xe, yy).lineTo(xi, yy).stroke({ width: Math.max(1.5, ow), color: INK, alpha: 0.7, cap: 'round' });
      }
    }
    // the lane's edges meet the hedges with an ink line
    g.moveTo(x0, top).lineTo(x0, bottom).moveTo(x0 + lw, top).lineTo(x0 + lw, bottom).stroke({ width: ow, color: INK });
  }
}

/** Chapter props on the hedges, placed by hash. */
function drawDecor(p, decor) {
  const { X, Y, L, chapter } = p;
  decor.removeChildren().forEach((c) => c.destroy());
  for (const spot of decorSpots(chapter)) {
    const sp = new Sprite(frameTex(spot.id, chapter));
    const t = sp.texture;
    const hang = spot.id === 'env.lantern';
    sp.anchor.set(0.5, hang ? 0 : 0.5);
    const box = L(spot.s);
    sp.scale.set(Math.min(box / Math.max(1, t.width), (box * (hang ? 1.5 : 1)) / Math.max(1, t.height)));
    sp.position.set(X(spot.x), Y(spot.y + (hang ? 0.2 : 0)));
    if (spot.id === 'env.ember') sp.rotation = (hash01(spot.strip, Math.round(spot.y * 10)) - 0.5) * 1.6 + Math.PI / 2;
    decor.addChild(sp);
  }
}

/** A laid stone: a flat face, one cel tone along its foot, a thin ink line. */
function stoneBlock(p, wg, x, y, bw, bh, { fill = p.stone, cel = true } = {}) {
  wg.rect(x, y, bw, bh).fill(fill);
  if (cel) wg.rect(x, y + bh * 0.74, bw, bh * 0.26).fill(p.shade);
  wg.rect(x, y, bw, bh).stroke({ width: p.thin, color: INK, alpha: 0.85 });
}

/** The keep: a dark floor, the flagstone pits (sunken, a 1 px ink groove), and its stone ring. */
function drawKeep(p, wg) {
  const { X, Y, L, ow, skin } = p;
  const kx0 = X(-GRID.size - G.keep.pad);
  const ky0 = Y(GRID.size * GRID.cell + G.keep.pad);
  const kw = L((GRID.size + G.keep.pad) * 2);
  const kh = L(GRID.size * GRID.cell + G.keep.pad * 2);
  wg.rect(kx0, ky0, kw, kh).fill(hex(skin.floor));
  const pit = L(GRID.cell * G.pit);
  const pitR = L(0.14);
  const lip = Math.max(1.5, L(0.07));
  for (let r = 0; r < GRID.size; r++) {
    for (let c = 0; c < GRID.size; c++) {
      const px = X(cellX(c)) - pit / 2;
      const py = Y(cellY(r)) - pit / 2;
      wg.roundRect(px, py, pit, pit, pitR).fill(hex(skin.pit));
      wg.rect(px + pitR, py + 1, pit - pitR * 2, lip).fill(hex(tone(skin.pit, -0.3))); // inner shadow under the top edge
      wg.rect(px + 1, py + pitR, lip, pit - pitR * 2).fill(hex(tone(skin.pit, -0.3)));
      wg.rect(px + pitR, py + pit - lip - 1, pit - pitR * 2, lip).fill(hex(tone(skin.floor, 0.16))); // the lit lip
      wg.roundRect(px, py, pit, pit, pitR).stroke({ width: 1, color: INK });
    }
  }
  // the ring: side walls and the bottom wall
  const wallW = L(G.keep.wall);
  const ringY0 = Y(G.parapet.base);
  const ringY1 = Y(-G.keep.pad - G.keep.wall);
  for (const side of [-1, 1]) {
    const x = side < 0 ? X(-GRID.size - G.keep.pad - G.keep.wall) : X(GRID.size + G.keep.pad);
    const n = Math.max(4, Math.round((ringY1 - ringY0) / L(0.62)));
    for (let i = 0; i < n; i++) stoneBlock(p, wg, x, ringY0 + ((ringY1 - ringY0) * i) / n, wallW, (ringY1 - ringY0) / n, { cel: false });
    wg.rect(x, ringY0, wallW, ringY1 - ringY0).stroke({ width: ow, color: INK });
  }
  const x0 = X(-GRID.size - G.keep.pad - G.keep.wall);
  const x1 = X(GRID.size + G.keep.pad + G.keep.wall);
  const y = Y(-G.keep.pad);
  const n = Math.round((x1 - x0) / L(0.7));
  for (let i = 0; i < n; i++) stoneBlock(p, wg, x0 + ((x1 - x0) * i) / n, y, (x1 - x0) / n, wallW);
  wg.rect(x0, y, x1 - x0, wallW).stroke({ width: ow, color: INK });
  wg.rect(kx0, ky0, kw, kh).stroke({ width: ow, color: INK });
}

/** The field towers, left and right, from the parapet up past the gate wall; the rail hangs on the right one. */
function drawTowers(p, wg) {
  const { w, X, Y, L, ow, thin, stone, shade, light, skin } = p;
  const course = L(0.5);
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
    let row = 0;
    for (let y = base; y > shaftTop + 1; y -= course, row++) {
      const yt = Math.max(shaftTop, y - course);
      wg.rect(x0, y - (y - yt) * 0.24, x1 - x0, (y - yt) * 0.24).fill(shade);
      wg.moveTo(x0, yt).lineTo(x1, yt).stroke({ width: thin, color: INK, alpha: 0.5 });
      const step = L(0.74);
      const k0 = (row % 2) * 0.5 + 0.5;
      // a few stones a shade lighter, by hash: the wall reads as laid stone, not a grid
      for (let k = k0 - 1, i = 0; k * step < x1 - x0; k += 1, i++) {
        if (hash01(row * 7 + (side > 0 ? 3 : 0), i) > 0.16) continue;
        const xa = xin + side * Math.max(0, k * step);
        const xb = xin + side * Math.min(x1 - x0, (k + 1) * step);
        wg.rect(Math.min(xa, xb), yt, Math.abs(xb - xa), (y - yt) * 0.76).fill(light);
      }
      for (let k = k0; k * step < x1 - x0; k += 1) {
        const xj = xin + side * k * step;
        wg.moveTo(xj, yt).lineTo(xj, y).stroke({ width: thin, color: INK, alpha: 0.5 });
      }
    }
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

/** The gate wall across the top of the field: four arches with dark openings. */
function drawGateWall(p, wg) {
  const { X, Y, L, ow, thin, stone, shade, light, skin } = p;
  const x0 = X(-G.towerIn);
  const x1 = X(G.towerIn);
  const wt = Y(G.gate.wallTop);
  const wb = Y(G.gate.sill);
  // the arches' stone backs first (they rise above the wall's top)
  const ro = L(G.gate.r + G.gate.ring);
  const ri = L(G.gate.r);
  const cy = Y(G.gate.y);
  for (let lane = 0; lane < FIELD.lanes; lane++) {
    const cx = X(laneX(lane));
    wg.moveTo(cx - ro, wb).lineTo(cx - ro, cy).arc(cx, cy, ro, Math.PI, 0).lineTo(cx + ro, wb).closePath().fill(stone);
  }
  wg.rect(x0, wt, x1 - x0, wb - wt).fill(stone);
  const courses = 3;
  for (let i = 1; i <= courses; i++) {
    const y = wt + ((wb - wt) * i) / (courses + 0.001);
    wg.rect(x0, y - ((wb - wt) / courses) * 0.22, x1 - x0, ((wb - wt) / courses) * 0.22).fill(shade);
    if (i < courses) wg.moveTo(x0, y).lineTo(x1, y).stroke({ width: thin, color: INK, alpha: 0.5 });
  }
  wg.rect(x0, wt, x1 - x0, L(0.08)).fill(light); // the coping
  for (let lane = 0; lane < FIELD.lanes; lane++) {
    const cx = X(laneX(lane));
    // the voussoir ring: lighter stones with radial joints and a keystone
    wg.moveTo(cx - ro, cy).arc(cx, cy, ro, Math.PI, 0).lineTo(cx + ri, cy).arc(cx, cy, ri, 0, Math.PI, true).closePath().fill(light);
    for (let k = 1; k < 7; k++) {
      const a = Math.PI + (Math.PI * k) / 7;
      wg.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri).lineTo(cx + Math.cos(a) * ro, cy + Math.sin(a) * ro).stroke({ width: thin, color: INK, alpha: 0.7 });
    }
    const kw = L(0.13);
    wg.moveTo(cx - kw, cy - ri).lineTo(cx - kw * 1.5, cy - ro - L(0.04)).lineTo(cx + kw * 1.5, cy - ro - L(0.04)).lineTo(cx + kw, cy - ri).closePath().fill(stone).stroke({ width: thin, color: INK });
    // the outline of the gate house
    wg.moveTo(cx - ro, wt).lineTo(cx - ro, cy).arc(cx, cy, ro, Math.PI, 0).lineTo(cx + ro, wt).stroke({ width: ow, color: INK });
    // the dark opening
    wg.moveTo(cx - ri, wb).lineTo(cx - ri, cy).arc(cx, cy, ri, Math.PI, 0).lineTo(cx + ri, wb).closePath().fill(hex(skin.opening)).stroke({ width: ow, color: INK });
  }
  wg.moveTo(x0, wt).lineTo(x1, wt).moveTo(x0, wb).lineTo(x1, wb).stroke({ width: ow, color: INK });
}

/** The parapet where the lanes meet the keep: the wall, and a merlon per column. */
function drawParapet(p, wg) {
  const { X, Y, L, ow, stone, shade, light } = p;
  const x0 = X(-GRID.size - G.keep.pad - G.keep.wall);
  const x1 = X(GRID.size + G.keep.pad + G.keep.wall);
  const y0 = Y(G.parapet.wall);
  const y1 = Y(G.parapet.base);
  const n = Math.round((x1 - x0) / L(0.66));
  for (let i = 0; i < n; i++) stoneBlock(p, wg, x0 + ((x1 - x0) * i) / n, y0, (x1 - x0) / n, y1 - y0);
  wg.rect(x0, y0, x1 - x0, L(0.07)).fill(light);
  wg.rect(x0, y0, x1 - x0, y1 - y0).stroke({ width: ow, color: INK });
  for (let c = 0; c < GRID.size; c++) {
    const mx = X(cellX(c) - G.parapet.w / 2);
    const my = Y(G.parapet.merlon);
    const mw = L(G.parapet.w);
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
    const x = X(cxw * (GRID.size + G.keep.pad + G.keep.wall / 2)) - ct / 2;
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

/** The gates' moving parts, placed: the iris, the portcullis bars (rolled up by scale.y) and the boss gate's banners. */
function placeGates(p, gates) {
  const { X, Y, L, skin, chapter } = p;
  const ri = L(G.gate.r);
  const cy = Y(G.gate.y);
  const sill = Y(G.gate.sill);
  const bt = frameTex('env.banner', chapter);
  for (let lane = 0; lane < FIELD.lanes; lane++) {
    const gt = gates[lane];
    const cx = X(laneX(lane));
    gt.iris.position.set(cx, cy);
    // the portcullis: drawn from the arch's crown down, so scale.y rolls it up into the arch
    const bars = gt.bars.clear();
    bars.position.set(cx, cy - ri);
    const span = sill - (cy - ri);
    const step = ri / 2.6;
    const bar = (x0, y0, x1, y1) => {
      bars.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: Math.max(2.5, L(0.07)), color: INK });
      bars.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: Math.max(1, L(0.03)), color: hex(skin.iron) });
    };
    for (let x = -ri + step * 0.6; x < ri - step * 0.3; x += step) bar(x, ri - Math.sqrt(Math.max(0, ri * ri - x * x)) + 1, x, span - 1);
    for (const fy of [0.45, 0.78]) {
      const y = span * fy;
      const half = Math.sqrt(Math.max(0, ri * ri - Math.max(0, ri - y) ** 2));
      bar(-half + 1, y, half - 1, y);
    }
    gt.banners.removeChildren().forEach((c) => c.destroy());
    for (const side of [-1, 1]) {
      const b = new Sprite(bt);
      b.anchor.set(0.5, 0);
      b.scale.set(L(1.05) / Math.max(1, bt.height));
      b.position.set(cx + side * L(G.gate.r + G.gate.ring * 0.5), Y(G.gate.wallTop + 0.42));
      gt.banners.addChild(b);
    }
  }
}

/** The braziers on the merlons: the bowl, the flame above it, and a thin dark smoke column (pressure). */
function placeBraziers(p, braziers) {
  const { X, Y, L, chapter } = p;
  const bowlT = frameTex('env.brazier', chapter);
  const flameT = frameTex('env.flame', chapter);
  for (let c = 0; c < braziers.length; c++) {
    const b = braziers[c];
    const x = X(cellX(c));
    const y = Y(G.parapet.merlon);
    b.bowl.texture = bowlT;
    b.bowl.scale.set(L(0.62) / Math.max(1, bowlT.width));
    b.bowl.position.set(x, y + L(0.04));
    b.flame.texture = flameT;
    b.size = L(0.6) / Math.max(1, flameT.height);
    b.flame.position.set(x, y - b.bowl.height * 0.62);
    const s = b.smoke.clear();
    s.position.set(x, y - b.bowl.height * 0.62 - L(0.5));
    for (let i = 0; i < 5; i++) {
      const k = i / 4;
      s.circle(Math.sin(i * 1.7) * L(0.07), -k * L(1.1), L(0.07 + 0.05 * k)).fill({ color: INK, alpha: 0.5 - 0.3 * k });
    }
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
  text.text = `at ${deck.nextAt.toLocaleString()}`;
  text.style.fontSize = fontPx;
  text.style.stroke = { color: INK, width: Math.max(3, fontPx * 0.24), join: 'round' };
  // the slot is wide enough for "at 512" at 12 px on a 360 px phone; only a smaller window squeezes it
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
 * @param fx     optional: the effects module, whose light budget a brazier books each time it lights
 */
export function createFrame(stage, { fx = null } = {}) {
  const { layers } = stage;
  let chapter = 'forest';
  let skin = skinFor(chapter);

  // far + mid (bg layer)
  const sky = { bgG: new Graphics(), bgArt: new Sprite(), bgDim: new Graphics(), ridge: new Sprite() };
  sky.bgArt.anchor.set(0.5);
  sky.ridge.anchor.set(0.5, 1);
  layers.bg.addChild(sky.bgG, sky.bgArt, sky.bgDim, sky.ridge);
  let grad = null; // the sky's gradient: one per chapter (it is local to the shape, so a resize keeps it)
  let gradFor = '';

  // ground: lanes, hedges, decor (path layer, under foes, puddles and decals)
  const groundG = new Graphics();
  const decor = new Container();
  layers.path.addChild(groundG, decor);

  // walls: towers, gate wall, parapet, keep (board layer, under the tiles and the deck dice)
  const wallG = new Graphics();
  const deckG = new Graphics();
  const deckText = new Text({ text: '', style: { fontFamily: FONT, fontWeight: '800', fontSize: 24, fill: CREAM, stroke: { color: INK, width: 5, join: 'round' } } });
  deckText.anchor.set(0.5);
  const gateLayer = new Container();
  const fireLayer = new Container();
  layers.board.addChild(wallG, deckG, deckText, gateLayer, fireLayer);

  const gates = [];
  for (let lane = 0; lane < FIELD.lanes; lane++) {
    const iris = new Sprite(portalTex());
    iris.anchor.set(0.5);
    const bars = new Graphics(); // the portcullis, rolled up as the gate opens
    const chip = new Container();
    const banners = new Container();
    gateLayer.addChild(iris, bars, chip, banners);
    gates.push({ iris, bars, chip, banners, open: 0, irisA: 0.2, chipA: 0, want: false });
  }
  const braziers = [];
  for (let c = 0; c < GRID.size; c++) {
    const smoke = new Graphics();
    const bowl = new Sprite();
    bowl.anchor.set(0.5, 1);
    const flame = new Sprite();
    flame.anchor.set(0.5, 1);
    flame.visible = false;
    fireLayer.addChild(smoke, bowl, flame);
    braziers.push({ smoke, bowl, flame, lit: 0, smokeA: 0, want: false, shown: null, size: 0 });
  }

  let preview = []; // [{ lane, type, count, boss }]
  let resized = false; // the next buildChips follows a rebuild: old chips go at once
  let previewKey = '';
  let deck = { dice: 0, nextAt: null };
  let time = 0;

  // --- static build: once per resize or chapter ---
  function build(view) {
    const p = penFor(stage, view, skin, chapter);
    if (gradFor !== chapter) {
      sky.bgG.clear(); // let go of the old gradient before it is destroyed
      grad?.destroy();
      grad = skyGradient(skin);
      gradFor = chapter;
    }
    drawSky(p, sky, grad);
    drawGround(p, groundG.clear());
    drawDecor(p, decor);
    const wg = wallG.clear();
    drawKeep(p, wg);
    drawTowers(p, wg);
    drawGateWall(p, wg);
    drawParapet(p, wg);
    drawKeepTowers(p, wg);
    placeGates(p, gates);
    resized = true;
    buildChips();
    placeBraziers(p, braziers);
    drawDeck(p, deckG, deckText, deck);
    publishFrame(p);
  }

  // the next wave's chips in the open gates: a foe on a cream token, and how many come this way
  function buildChips() {
    const U = stage.view.U;
    const X = stage.sx;
    const Y = stage.sy;
    const px = Math.max(MIN_TEXT, Math.round(0.42 * U));
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
      const cx = X(laneX(p.lane));
      const cy = Y(G.gate.y - 0.05);
      const r = (p.boss ? 0.52 : 0.44) * U;
      const token = new Graphics().circle(0, 0, r).fill(CREAM).stroke({ width: Math.max(1.25, 0.055 * U), color: INK });
      if (p.boss) token.circle(0, 0, r - Math.max(2, 0.06 * U)).stroke({ width: Math.max(1.5, 0.05 * U), color: hex(skin.banner) });
      token.position.set(cx, cy);
      const foe = new Sprite(enemyTex(p.type));
      foe.anchor.set(0.5);
      const t = foe.texture;
      foe.scale.set(Math.min((r * 1.7) / Math.max(1, t.width), (r * 1.6) / Math.max(1, t.height)));
      foe.position.set(cx, cy);
      gt.chip.addChild(token, foe);
      if (p.count > 0) {
        const label = new Text({ text: `${p.boss ? '+' : '×'}${p.count}`, style: { fontFamily: FONT, fontWeight: '800', fontSize: px, fill: CREAM, stroke: { color: INK, width: Math.max(3, px * 0.28), join: 'round' } } });
        label.anchor.set(0.5);
        label.position.set(cx + r * 0.78, cy + r * 0.72);
        gt.chip.addChild(label);
      }
    }
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
      const U = stage.view.U;
      const reduced = stage.reduced;
      const lanes = state?.lanes ?? [];
      // the far layer stays put when the screen shakes, the ridge moves a fifth as much
      const root = layers.bg.parent;
      if (root) {
        layers.bg.position.set(-root.position.x, -root.position.y);
        sky.ridge.pivot.set(-root.position.x * 0.2, -root.position.y * 0.2);
      }
      for (let lane = 0; lane < FIELD.lanes; lane++) {
        const gt = gates[lane];
        const active = lanes.includes(lane);
        const boss = state?.bossLane === lane && state?.bossLane != null;
        gt.open += ((active ? 1 : 0) - gt.open) * Math.min(1, dt * 5);
        const size = Math.min(2 * G.gate.r, 0.92 + 0.24 * gt.open) * U; // capped at the arch's inner radius
        gt.iris.width = gt.iris.height = size;
        gt.iris.rotation = reduced ? 0 : time * (0.35 + 1.1 * gt.open) * (lane % 2 ? -1 : 1);
        // the chips fade in and out, and the iris eases behind them: no step when a wave starts
        gt.chipA += ((gt.want ? 1 : 0) - gt.chipA) * Math.min(1, dt * 6);
        if (!gt.want && gt.chipA < 0.02 && gt.chip.children.length) gt.chip.removeChildren().forEach((c) => c.destroy());
        gt.chip.alpha = gt.chipA;
        gt.chip.visible = gt.chip.children.length > 0 && gt.chipA > 0.01;
        gt.irisA += ((gt.want ? 0.35 : 0.2 + 0.8 * gt.open) - gt.irisA) * Math.min(1, dt * 5);
        gt.iris.alpha = gt.irisA;
        gt.iris.tint = boss ? 0xff8a8a : 0xffffff;
        gt.bars.scale.y = Math.max(0.02, 1 - gt.open);
        gt.bars.visible = gt.open < 0.98;
        gt.banners.visible = boss;
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
        const grow = b.size * (0.55 + 0.45 * b.lit);
        b.flame.visible = b.lit > 0.02;
        b.flame.alpha = Math.min(1, b.lit * 1.2);
        b.flame.scale.set(grow * (1 + 0.04 * breathe), grow * (1 + 0.09 * breathe));
        b.smoke.visible = b.smokeA > 0.02;
        b.smoke.alpha = b.smokeA * 0.8;
        b.smoke.pivot.y = reduced ? 0 : Math.sin(time * 0.8 + c) * 0.06 * U;
      }
    },
  };
}
