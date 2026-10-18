// The board's blocks (src/render/blocks.js) on a stand-in stage, light budget and art provider, for
// test/tiles.test.js and test/tile-looks.test.js. The provider answers as the real one does
// (src/art/index.js): what stands on a tile is creatureSpecOf's (nothing on a plain block or a den), a
// den brings its altar, a pure form its halo.
import { Container, Texture, TextureSource } from 'pixi.js';
import { GRID, cellX, cellY } from '../../src/config.js';
import { badgeSpots, isDen, isPure } from '../../src/art/plaque.js';
import { createBlocks } from '../../src/render/blocks.js';
import { creatureSpecOf } from '../../src/art/index.js';

export const tex = (w, h) => new Texture({ source: new TextureSource({ width: w, height: h }) });
const U = 35; // a 70 px cell

/**
 * blocks.js on a stand-in stage, light budget and art provider. The provider answers as the real one
 * does (src/art/index.js): what stands on a tile is creatureSpecOf's (nothing on a plain block or a
 * den), a den brings its altar, a pure form its halo. `step` advances real and sim time together.
 */
export function scene({ reduced = false, u = U, grant = true } = {}) {
  const stage = { reduced, layers: { tiles: new Container(), shots: new Container() }, view: { U: u, ox: 200, oy: 700 }, sx: (x) => 200 + x * u, sy: (y) => 700 - y * u };
  const books = [];
  const parts = [];
  const bursts = [];
  const numbers = []; // the numerals asked of the art: tier, px per cell, size (cells)
  const fx = {
    flashAll(lit, life) {
      books.push({ lit, life });
      return grant;
    },
    particle(t, x, y, o = {}) {
      parts.push({ t, x, y, o });
      return {};
    },
    burst(x, y, colors, n) {
      bursts.push({ x, y, colors, n });
    },
  };
  const faces = { blink: tex(320, 232), scared: tex(320, 232) };
  const halo = tex(300, 300);
  const plates = new Map();
  const art = {
    style: 'sticker',
    skin: 'forest',
    setSkin(k) {
      this.skin = k;
    },
    tile(t) {
      const k = `${t.tier}.${t.cls.element}.${t.cls.fusion}.${!!t.cls.pure}`;
      if (!plates.has(k)) plates.set(k, tex(160, 160));
      const spec = creatureSpecOf(t);
      const den = isDen(t);
      return {
        plate: plates.get(k),
        motif: den ? tex(160, 160) : null,
        overlay: null,
        creature: spec ? tex(320, 232) : null,
        crop: 0.6,
        maxW: 0.9,
        egg: spec?.kind === 'egg',
        plaque: true,
        badges: badgeSpots(t),
        nestFront: spec?.kind === 'egg' ? tex(160, 160) : null,
        faces: spec?.kind === 'baby' && spec.stage === 0 ? faces : null,
        halo: isPure(t) && !den ? halo : null,
      };
    },
    number(tier, px, size) {
      numbers.push({ tier, px, size });
      return tex(128, 64);
    },
    badge: () => tex(192, 192),
    paws: () => tex(160, 160),
  };
  const tx = { softDot: () => tex(64, 64), sparkTex: () => tex(64, 64), blockTex: () => tex(160, 160), vfxTex: () => tex(40, 40), auraTex: () => tex(128, 128), decor: () => tex(36, 28) };
  const blocks = createBlocks(stage, fx, { art, tx });
  const run = { tiles: [], grid: { moves: 0 }, time: 0, defense: { cooldownLeft: () => 5, skillCharge: () => 0 }, wave: { chapter: { key: 'forest' } } };
  const add = (id, tier, col, row, cls = {}, more = {}) => {
    const t = { id, tier, col, row, fromCol: col, fromRow: row, x: cellX(col), y: cellY(row), cls, bornAt: -1, ...more };
    run.tiles.push(t);
    return t;
  };
  const step = (seconds = 1 / 60) => {
    for (let i = 0; i < Math.max(1, Math.round(seconds * 60)); i++) {
      run.time += 1 / 60;
      blocks.sync(run, 1 / 60);
    }
  };
  return { blocks, run, stage, art, add, step, books, parts, bursts, faces, halo, numbers, cell: GRID.cell * u };
}

/** The extremes of a view field over `seconds` of frames. */
export function range(s, seconds, read) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    s.step();
    const v = read();
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return { lo, hi };
}

