// The stickers the readable feedback (src/render/feedback.js) draws with, code-drawn in the attack
// sprites' style (src/render/vfx-fallback.js): a thick plum outline, a flat fill and one cel tone, no
// glow. White pieces are tinted by the renderer (the impact star, the shards, the bubbles); the heal plus,
// the leaf and the stun star are full colour. A status pop is a pill in its status's colour with an icon
// and its word (src/i18n: fx.status.<kind>), one texture per status and language, made when first shown.
// The drawings take a 2D context, so a test can run them on a recording stand-in.
import { Texture } from 'pixi.js';
import { tr } from '../i18n/index.js';

export const INK = '#2b1d2a';
const cache = new Map();

function canvasTex(key, w, h, draw) {
  if (!cache.has(key)) {
    const c = globalThis.document?.createElement('canvas');
    if (!c) return Texture.WHITE; // no DOM (a test without stand-ins): a plain quad
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    cache.set(key, Texture.from(c));
  }
  return cache.get(key);
}

/** A path of straight segments through `pts` ([[x, y]…]), closed. */
function poly(g, pts) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

/** Outline under the fill (twice the width), so the sticker keeps one clean outer edge. */
function sticker(g, path, fill, { ink = INK, width = 6, cel = null, celPath = null } = {}) {
  path();
  g.lineJoin = 'round';
  g.lineWidth = width * 2;
  g.strokeStyle = ink;
  g.stroke();
  path();
  g.fillStyle = fill;
  g.fill();
  if (cel && celPath) {
    g.save();
    path();
    g.clip();
    celPath();
    g.fillStyle = cel;
    g.fill();
    g.restore();
  }
}

// --- the drawings (pure: a 2D context in, strokes and fills out) ---------------------------------

/** A chunky green plus: the heal mark. */
export function drawPlus(g, s = 64) {
  const a = s * 0.16; // half the arm's width
  const r = s * 0.36; // half the arm's length
  const c = s / 2;
  const path = () => {
    poly(g, [
      [c - a, c - r], [c + a, c - r], [c + a, c - a], [c + r, c - a], [c + r, c + a], [c + a, c + a],
      [c + a, c + r], [c - a, c + r], [c - a, c + a], [c - r, c + a], [c - r, c - a], [c - a, c - a],
    ]);
  };
  sticker(g, path, '#52d36b', { width: s * 0.07, cel: '#a8f5a0', celPath: () => poly(g, [[c - a, c - r], [c + a * 0.2, c - r], [c + a * 0.2, c - a * 0.2], [c - r, c - a * 0.2], [c - r, c - a], [c - a, c - a]]) });
}

/** The impact frame's comic star: eight points, white with a grey cel (tinted by the element). */
export function drawStar(g, s = 128) {
  const c = s / 2;
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 ? 0.2 : i % 4 ? 0.38 : 0.47) * s;
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  sticker(g, () => poly(g, pts), '#ffffff', { width: s * 0.035, cel: '#d8d8d8', celPath: () => poly(g, pts.map(([x, y]) => [c + (x - c) * 0.45 + s * 0.05, c + (y - c) * 0.45 + s * 0.05])) });
}

/** A shard: a long thin kite, white with a grey cel (ice tints it blue, earth brown, metal gold). */
export function drawShard(g, w = 32, h = 64) {
  const pts = [[w / 2, h * 0.04], [w * 0.92, h * 0.42], [w / 2, h * 0.96], [w * 0.08, h * 0.42]];
  sticker(g, () => poly(g, pts), '#ffffff', { width: w * 0.08, cel: '#cfcfcf', celPath: () => poly(g, [[w / 2, h * 0.04], [w * 0.92, h * 0.42], [w / 2, h * 0.96]]) });
}

/** A leaf, full colour: Nature's hits flutter them. */
export function drawLeaf(g, w = 48, h = 32) {
  const path = () => {
    g.beginPath();
    g.moveTo(w * 0.06, h / 2);
    g.quadraticCurveTo(w * 0.45, -h * 0.15, w * 0.94, h / 2);
    g.quadraticCurveTo(w * 0.45, h * 1.15, w * 0.06, h / 2);
    g.closePath();
  };
  sticker(g, path, '#7cd15a', { width: w * 0.05, cel: '#4fa83a', celPath: () => g.rect(0, h / 2, w, h / 2) });
  g.strokeStyle = INK;
  g.lineWidth = w * 0.04;
  g.beginPath();
  g.moveTo(w * 0.14, h / 2);
  g.lineTo(w * 0.8, h / 2);
  g.stroke();
}

/** A bubble, white rim and a shine (tinted: Poison's are violet and green). */
export function drawBubble(g, s = 32) {
  const c = s / 2;
  sticker(g, () => {
    g.beginPath();
    g.arc(c, c, s * 0.36, 0, Math.PI * 2);
  }, '#ffffff', { width: s * 0.07, cel: '#d6d6d6', celPath: () => g.rect(0, c, s, s) });
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(c - s * 0.12, c - s * 0.12, s * 0.08, 0, Math.PI * 2);
  g.fill();
}

/** A small yellow five-point star: what circles a stunned foe's head. */
export function drawStunStar(g, s = 32) {
  const c = s / 2;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 ? 0.2 : 0.44) * s;
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  sticker(g, () => poly(g, pts), '#ffd84a', { width: s * 0.06, cel: '#f0a020', celPath: () => g.rect(0, c, s, s) });
}

/** The status pops' looks: the pill's colour and its icon (a few strokes, white on the pill). */
export const STATUS_LOOK = {
  frozen: { color: '#5fb8f0', icon: 'cube' },
  stun: { color: '#f0b429', icon: 'star' },
  root: { color: '#4fa83a', icon: 'leaf' },
  sleep: { color: '#8f86d8', icon: 'zz' },
  fear: { color: '#c86fc0', icon: 'bang' },
  blind: { color: '#8d7f6a', icon: 'eye' },
  melt: { color: '#e8762d', icon: 'drip' },
  burn: { color: '#f0642d', icon: 'flame' },
  poison: { color: '#9a5ae0', icon: 'drop' },
  bleed: { color: '#d8433a', icon: 'drop' },
  weak: { color: '#8a7fa6', icon: 'down' },
  slow: { color: '#5aa8e8', icon: 'flake' },
};

/** A status's icon, white, in a box of `s` px centred on (x, y). */
export function drawStatusIcon(g, kind, x, y, s) {
  const icon = STATUS_LOOK[kind]?.icon;
  g.save();
  g.translate(x, y);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.lineWidth = s * 0.14;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const h = s / 2;
  g.beginPath();
  if (icon === 'flame') {
    g.moveTo(0, -h);
    g.quadraticCurveTo(h, -h * 0.1, h * 0.6, h * 0.55);
    g.quadraticCurveTo(0, h * 1.05, -h * 0.6, h * 0.55);
    g.quadraticCurveTo(-h, -h * 0.1, 0, -h);
    g.fill();
  } else if (icon === 'drop' || icon === 'drip') {
    g.moveTo(0, -h);
    g.quadraticCurveTo(h * 0.85, h * 0.1, 0, h * 0.95);
    g.quadraticCurveTo(-h * 0.85, h * 0.1, 0, -h);
    g.fill();
  } else if (icon === 'flake') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      g.moveTo(-Math.cos(a) * h, -Math.sin(a) * h);
      g.lineTo(Math.cos(a) * h, Math.sin(a) * h);
    }
    g.stroke();
  } else if (icon === 'cube') {
    g.rect(-h * 0.75, -h * 0.75, h * 1.5, h * 1.5);
    g.stroke();
    g.beginPath();
    g.moveTo(-h * 0.35, -h * 0.35);
    g.lineTo(h * 0.05, -h * 0.35);
    g.stroke();
  } else if (icon === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = (i % 2 ? 0.42 : 1) * h;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  } else if (icon === 'leaf') {
    g.moveTo(-h, h * 0.6);
    g.quadraticCurveTo(-h * 0.6, -h, h, -h * 0.7);
    g.quadraticCurveTo(h * 0.6, h, -h, h * 0.6);
    g.fill();
  } else if (icon === 'zz') {
    g.moveTo(-h * 0.8, -h * 0.6);
    g.lineTo(h * 0.2, -h * 0.6);
    g.lineTo(-h * 0.8, h * 0.6);
    g.lineTo(h * 0.2, h * 0.6);
    g.moveTo(h * 0.3, -h);
    g.lineTo(h, -h);
    g.lineTo(h * 0.3, -h * 0.3);
    g.lineTo(h, -h * 0.3);
    g.stroke();
  } else if (icon === 'bang') {
    for (const dx of [-h * 0.35, h * 0.35]) {
      g.moveTo(dx, -h);
      g.lineTo(dx, h * 0.25);
      g.moveTo(dx, h * 0.8);
      g.lineTo(dx, h * 0.82);
    }
    g.stroke();
  } else if (icon === 'eye') {
    g.moveTo(-h, 0);
    g.quadraticCurveTo(0, -h, h, 0);
    g.quadraticCurveTo(0, h, -h, 0);
    g.stroke();
    g.beginPath();
    g.moveTo(-h, h);
    g.lineTo(h, -h);
    g.stroke();
  } else {
    // 'down': an arrow pointing down (weakened)
    g.moveTo(0, -h);
    g.lineTo(0, h * 0.7);
    g.moveTo(-h * 0.6, h * 0.1);
    g.lineTo(0, h * 0.8);
    g.lineTo(h * 0.6, h * 0.1);
    g.stroke();
  }
  g.restore();
}

/** The pill's px sizes; `aspect`: its widest (width over height). A longer word is drawn condensed to fit. */
export const PILL = { h: 46, font: 28, pad: 12, icon: 26, gap: 6, aspect: 4.6 };

/** A pill's width (px) for a word `tw` px wide, and how much the word is condensed to keep within PILL.aspect. */
export function pillFit(tw) {
  const room = PILL.pad * 2 + PILL.icon + PILL.gap + 8; // the pill without its word
  const w = Math.min(Math.ceil(room + tw), Math.floor(PILL.h * PILL.aspect));
  return { w, squeeze: Math.min(1, (w - room) / Math.max(1, tw)) };
}

/** A status pop's pill: its colour, an icon and its word, with an ink outline; → its width in px. */
export function drawPill(g, kind, word, measure = (t) => t.length * PILL.font * 0.62) {
  const look = STATUS_LOOK[kind] ?? STATUS_LOOK.weak;
  const { w, squeeze } = pillFit(measure(word));
  const h = PILL.h;
  const r = h / 2 - 3;
  sticker(g, () => {
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, r);
  }, look.color, { width: 3 });
  drawStatusIcon(g, kind, 4 + PILL.pad + PILL.icon / 2, h / 2, PILL.icon);
  g.font = `800 ${PILL.font}px "Baloo 2", Nunito, system-ui, sans-serif`;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.save();
  g.translate(4 + PILL.pad + PILL.icon + PILL.gap, h / 2 + 1);
  if (squeeze < 1) g.scale(squeeze, 1); // a long word (ĐÓNG BĂNG) condensed, not a wider pill
  g.strokeText(word, 0, 0);
  g.fillStyle = '#ffffff';
  g.fillText(word, 0, 0);
  g.restore();
  return w;
}

/** A status pop's word in the language shown (src/i18n fx.status.<kind>). */
export const statusWord = (kind) => tr(`fx.status.${kind}`);

/** The textures, made once (a test passes stand-ins). */
export const FEEDBACK_TEXTURES = {
  plus: () => canvasTex('fb.plus', 64, 64, (g) => drawPlus(g, 64)),
  star: () => canvasTex('fb.star', 128, 128, (g) => drawStar(g, 128)),
  shard: () => canvasTex('fb.shard', 32, 64, (g) => drawShard(g, 32, 64)),
  leaf: () => canvasTex('fb.leaf', 48, 32, (g) => drawLeaf(g, 48, 32)),
  bubble: () => canvasTex('fb.bubble', 32, 32, (g) => drawBubble(g, 32)),
  stunStar: () => canvasTex('fb.stunStar', 32, 32, (g) => drawStunStar(g, 32)),
  pill: (kind) => {
    const word = statusWord(kind);
    const key = `fb.pill.${kind}.${word}`;
    if (!cache.has(key)) {
      // measure first, then draw the pill at its own width
      const probe = globalThis.document?.createElement('canvas')?.getContext('2d');
      if (!probe) return Texture.WHITE;
      probe.font = `800 ${PILL.font}px "Baloo 2", Nunito, system-ui, sans-serif`;
      const measure = (t) => probe.measureText(t).width;
      return canvasTex(key, pillFit(measure(word)).w, PILL.h, (g) => drawPill(g, kind, word, measure));
    }
    return cache.get(key);
  },
};
