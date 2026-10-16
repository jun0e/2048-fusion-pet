// The frame's generated pieces (FRAME_ASSETS in src/art/frame-kit.js) and their drawn stand-ins:
// the brazier, the flame, the banner, the lantern, the moss, the mushrooms, the ember crack and the
// ridge strips, in the sticker style (plum ink outline, flat fills, one cel tone), coloured only from
// the chapter skin. The pipeline's sprite replaces its stand-in when it exists (generatedTex), so the
// frame looks finished without them. src/render/frame.js places them.
import { Texture } from 'pixi.js';
import { FRAME_INK, FRAME_CREAM, hash01, skinFor } from '../art/frame-kit.js';
import { tone, mix } from '../art/tokens.js';
import { generatedTex } from './textures.js';

const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (!texCache.has(key)) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.lineJoin = 'round';
    g.lineCap = 'round';
    draw(g, w, h);
    texCache.set(key, Texture.from(c));
  }
  return texCache.get(key);
}

/** The texture for a frame sprite: the generated one when tools/pipeline.mjs has made it, else drawn. */
export function frameTex(id, chapter = 'forest') {
  const gen = generatedTex(id);
  if (gen) return gen;
  const skin = skinFor(chapter);
  const draw = FALLBACK[id] ?? (id.endsWith('.ridge') ? FALLBACK.ridge : null);
  if (!draw) return Texture.EMPTY;
  const [w, h] = draw.size;
  return canvasTex(`${id}:${chapter}`, w, h, (g) => draw(g, skin, w, h, chapter));
}

const ink = (g, w) => {
  g.strokeStyle = FRAME_INK;
  g.lineWidth = w;
  g.stroke();
};

// drawn stand-ins for FRAME_ASSETS (front view, ink outline, one cel tone)
const FALLBACK = {
  'env.brazier': Object.assign(
    (g, s, W, H) => {
      const iron = s.iron;
      // three legs
      g.strokeStyle = FRAME_INK;
      g.lineWidth = 9;
      for (const [x0, x1] of [
        [0.3, 0.2],
        [0.7, 0.8],
        [0.5, 0.5],
      ]) {
        g.beginPath();
        g.moveTo(W * x0, H * 0.55);
        g.lineTo(W * x1, H * 0.95);
        g.stroke();
      }
      g.strokeStyle = iron;
      g.lineWidth = 4;
      for (const [x0, x1] of [
        [0.3, 0.2],
        [0.7, 0.8],
        [0.5, 0.5],
      ]) {
        g.beginPath();
        g.moveTo(W * x0, H * 0.55);
        g.lineTo(W * x1, H * 0.93);
        g.stroke();
      }
      // the bowl
      g.beginPath();
      g.moveTo(W * 0.08, H * 0.28);
      g.lineTo(W * 0.92, H * 0.28);
      g.quadraticCurveTo(W * 0.86, H * 0.66, W * 0.5, H * 0.66);
      g.quadraticCurveTo(W * 0.14, H * 0.66, W * 0.08, H * 0.28);
      g.closePath();
      g.fillStyle = iron;
      g.fill();
      // cel: the lower half of the bowl
      g.save();
      g.clip();
      g.fillStyle = tone(iron, -0.35);
      g.fillRect(0, H * 0.48, W, H);
      g.restore();
      ink(g, 6);
      // the rim, with the coals showing
      g.beginPath();
      g.ellipse(W * 0.5, H * 0.28, W * 0.43, H * 0.09, 0, 0, Math.PI * 2);
      g.fillStyle = tone(iron, 0.3);
      g.fill();
      ink(g, 5);
      g.beginPath();
      g.ellipse(W * 0.5, H * 0.29, W * 0.33, H * 0.05, 0, 0, Math.PI * 2);
      g.fillStyle = FRAME_INK;
      g.fill();
    },
    { size: [128, 96] },
  ),
  'env.flame': Object.assign(
    (g, s, W, H) => {
      const tongue = (cx, top, w, base) => {
        g.beginPath();
        g.moveTo(cx - w, base);
        g.bezierCurveTo(cx - w * 1.15, base - (base - top) * 0.45, cx - w * 0.2, top + (base - top) * 0.3, cx, top);
        g.bezierCurveTo(cx + w * 0.2, top + (base - top) * 0.3, cx + w * 1.15, base - (base - top) * 0.45, cx + w, base);
        g.closePath();
      };
      const base = H * 0.94;
      // three tongues: the outer flame as one shape, then the inner yellow
      g.beginPath();
      tongue(W * 0.5, H * 0.05, W * 0.3, base);
      g.fillStyle = s.flame[0];
      g.fill();
      ink(g, 6);
      for (const [cx, top, w] of [
        [0.27, 0.36, 0.15],
        [0.73, 0.3, 0.15],
      ]) {
        tongue(W * cx, H * top, W * w, base);
        g.fillStyle = s.flame[0];
        g.fill();
        ink(g, 6);
      }
      tongue(W * 0.5, H * 0.08, W * 0.29, base - 2);
      g.fillStyle = s.flame[0];
      g.fill();
      tongue(W * 0.5, H * 0.4, W * 0.17, base - 6);
      g.fillStyle = s.flame[1];
      g.fill();
    },
    { size: [96, 128] },
  ),
  'env.banner': Object.assign(
    (g, s, W, H) => {
      const red = s.banner;
      g.fillStyle = s.trim;
      g.fillRect(W * 0.04, H * 0.02, W * 0.92, H * 0.05); // the pole
      g.strokeStyle = FRAME_INK;
      g.lineWidth = 4;
      g.strokeRect(W * 0.04, H * 0.02, W * 0.92, H * 0.05);
      g.beginPath();
      g.moveTo(W * 0.12, H * 0.07);
      g.lineTo(W * 0.88, H * 0.07);
      g.lineTo(W * 0.88, H * 0.86);
      g.lineTo(W * 0.5, H * 0.74);
      g.lineTo(W * 0.12, H * 0.86);
      g.closePath();
      g.fillStyle = red;
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = tone(red, -0.3);
      g.fillRect(W * 0.66, 0, W, H); // cel: the right fold
      g.fillStyle = s.gold;
      g.fillRect(0, H * 0.7, W, H * 0.06); // the gold band
      g.restore();
      ink(g, 5);
      // the claw emblem
      g.strokeStyle = FRAME_INK;
      g.lineWidth = 5;
      for (const dx of [-0.16, 0, 0.16]) {
        g.beginPath();
        g.moveTo(W * (0.5 + dx), H * 0.26);
        g.quadraticCurveTo(W * (0.5 + dx * 1.6), H * 0.4, W * (0.5 + dx * 0.6), H * 0.52);
        g.stroke();
      }
      // fringe
      g.strokeStyle = s.gold;
      g.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const t = (i + 0.5) / 6;
        const x = W * (0.12 + 0.76 * t);
        const y = H * (0.86 - 0.12 * (1 - Math.abs(t - 0.5) * 2));
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + H * 0.08);
        g.stroke();
      }
    },
    { size: [64, 192] },
  ),
  'env.lantern': Object.assign(
    (g, s, W, H) => {
      g.strokeStyle = FRAME_INK;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(W / 2, 0);
      g.lineTo(W / 2, H * 0.16);
      g.stroke();
      g.beginPath();
      g.ellipse(W / 2, H * 0.52, W * 0.38, H * 0.3, 0, 0, Math.PI * 2);
      g.fillStyle = FRAME_CREAM;
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = tone(s.stone[2], -0.12);
      g.fillRect(W * 0.62, 0, W, H); // cel
      g.restore();
      ink(g, 4);
      g.strokeStyle = tone(s.banner, 0.2);
      g.lineWidth = 2.5;
      for (const k of [-0.5, 0, 0.5]) {
        g.beginPath();
        g.ellipse(W / 2, H * 0.52, W * 0.38 * Math.abs(k || 0.02), H * 0.3, 0, -Math.PI / 2, Math.PI / 2, k < 0);
        g.stroke();
      }
      for (const y of [0.17, 0.78]) {
        g.fillStyle = s.banner;
        g.fillRect(W * 0.32, H * y, W * 0.36, H * 0.07);
        g.strokeStyle = FRAME_INK;
        g.lineWidth = 3;
        g.strokeRect(W * 0.32, H * y, W * 0.36, H * 0.07);
      }
      g.strokeStyle = s.banner;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(W / 2, H * 0.85);
      g.lineTo(W / 2, H * 0.98);
      g.stroke();
    },
    { size: [64, 96] },
  ),
  'env.moss': Object.assign(
    (g, s, W, H) => {
      const green = s.accent;
      g.beginPath();
      g.moveTo(W * 0.06, H * 0.92);
      for (let i = 0; i <= 6; i++) {
        const x = W * (0.06 + (0.88 * i) / 6);
        g.quadraticCurveTo(x - W * 0.07, H * (0.36 + 0.14 * ((i * 7) % 3)), x, H * 0.62);
      }
      g.lineTo(W * 0.94, H * 0.92);
      g.closePath();
      g.fillStyle = green;
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = tone(green, -0.28);
      g.fillRect(0, H * 0.76, W, H);
      g.restore();
      ink(g, 5);
      // two fern fronds
      g.strokeStyle = tone(green, 0.25);
      g.lineWidth = 4;
      for (const [x, dir] of [
        [0.3, -1],
        [0.68, 1],
      ]) {
        g.beginPath();
        g.moveTo(W * x, H * 0.6);
        g.quadraticCurveTo(W * (x + dir * 0.05), H * 0.25, W * (x + dir * 0.16), H * 0.12);
        g.stroke();
      }
    },
    { size: [96, 64] },
  ),
  'env.mushroom': Object.assign(
    (g, s, W, H) => {
      const cap = tone(s.trim, 0.05);
      for (const [x, h, r] of [
        [0.3, 0.55, 0.17],
        [0.62, 0.72, 0.2],
        [0.84, 0.45, 0.12],
      ]) {
        const cx = W * x;
        const top = H * (1 - h);
        g.beginPath();
        g.roundRect(cx - W * 0.04, top + H * 0.12, W * 0.08, H * 0.95 - top - H * 0.12, 3);
        g.fillStyle = FRAME_CREAM;
        g.fill();
        ink(g, 4);
        g.beginPath();
        g.ellipse(cx, top + H * 0.14, W * r, H * r * 0.75, 0, Math.PI, 0);
        g.closePath();
        g.fillStyle = cap;
        g.fill();
        ink(g, 4);
        g.fillStyle = FRAME_CREAM;
        g.beginPath();
        g.arc(cx - W * r * 0.35, top + H * 0.03, W * 0.025, 0, Math.PI * 2);
        g.fill();
      }
    },
    { size: [96, 80] },
  ),
  'env.ember': Object.assign(
    (g, s, W, H) => {
      const pts = [
        [0.06, 0.55],
        [0.24, 0.38],
        [0.38, 0.6],
        [0.55, 0.3],
        [0.7, 0.62],
        [0.94, 0.42],
      ];
      const path = () => {
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(W * x, H * y) : g.moveTo(W * x, H * y)));
      };
      path();
      g.strokeStyle = FRAME_INK;
      g.lineWidth = 12;
      g.stroke();
      path();
      g.strokeStyle = s.accent;
      g.lineWidth = 5;
      g.stroke();
      path();
      g.strokeStyle = s.flame[1];
      g.lineWidth = 1.5;
      g.stroke();
    },
    { size: [96, 64] },
  ),
  // the far treeline / village / peaks: flat silhouettes, no outline (it is far away)
  ridge: Object.assign(
    (g, s, W, H, chapter) => {
      const far = mix(s.ridgeTone, s.sky[1], 0.45);
      const near = s.ridgeTone;
      const row = (color, base, amp, seed, kind) => {
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(0, H);
        let x = -10;
        let i = 0;
        while (x < W + 20) {
          const r = hash01(seed, i++);
          if (kind === 'pine') {
            const w = 26 + r * 22;
            const h = amp * (0.55 + 0.45 * hash01(seed, i + 99));
            g.lineTo(x, H * base);
            for (let k = 0; k < 3; k++) {
              const yk = H * base - h * (k + 1) / 3;
              g.lineTo(x + w * (0.12 + 0.12 * k), yk + h * 0.12);
              g.lineTo(x + w * 0.5, yk);
              g.lineTo(x + w * (0.88 - 0.12 * k), yk + h * 0.12);
            }
            g.lineTo(x + w, H * base);
            x += w * 0.8;
          } else if (kind === 'peak') {
            const w = 60 + r * 70;
            const h = amp * (0.45 + 0.55 * hash01(seed, i + 7));
            g.lineTo(x + w * 0.35, H * base - h * 0.7);
            g.lineTo(x + w * 0.5, H * base - h);
            g.lineTo(x + w * 0.62, H * base - h * 0.78);
            g.lineTo(x + w, H * base - h * 0.2);
            x += w * 0.85;
          } else {
            // fareast: rolling hills with pagoda roofs and round trees
            const w = 48 + r * 40;
            if (r < 0.35) {
              const h = amp * 0.9;
              g.lineTo(x + w * 0.2, H * base);
              g.lineTo(x + w * 0.2, H * base - h * 0.45);
              g.quadraticCurveTo(x + w * 0.05, H * base - h * 0.5, x, H * base - h * 0.62);
              g.quadraticCurveTo(x + w * 0.3, H * base - h * 0.62, x + w * 0.5, H * base - h);
              g.quadraticCurveTo(x + w * 0.7, H * base - h * 0.62, x + w, H * base - h * 0.62);
              g.quadraticCurveTo(x + w * 0.95, H * base - h * 0.5, x + w * 0.8, H * base - h * 0.45);
              g.lineTo(x + w * 0.8, H * base);
            } else {
              const rr = w * 0.3;
              g.lineTo(x + w * 0.2, H * base - amp * 0.2);
              g.arc(x + w * 0.5, H * base - amp * 0.2 - rr * 0.6, rr, Math.PI, 0);
              g.lineTo(x + w, H * base - amp * 0.15);
            }
            x += w;
          }
        }
        g.lineTo(W + 20, H);
        g.closePath();
        g.fill();
      };
      const kind = chapter === 'peaks' ? 'peak' : chapter === 'fareast' ? 'roof' : 'pine';
      row(far, 0.72, H * 0.62, 3, kind);
      row(near, 1.0, H * 0.72, 9, kind);
      if (chapter === 'peaks') {
        // a few thin lava lines on the near peaks (an accent; flat, not glowing)
        g.strokeStyle = s.accent;
        g.globalAlpha = 0.55;
        g.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const x = W * hash01(77, i);
          g.beginPath();
          g.moveTo(x, H * 0.62);
          g.lineTo(x + 8, H * 0.78);
          g.lineTo(x + 2, H * 0.95);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
    },
    { size: [1024, 128] },
  ),
};

/** The FRAME_ASSETS ids that have a drawn stand-in (every ridge strip shares one). */
export const hasDrawnFallback = (id) => !!FALLBACK[id] || id.endsWith('.ridge');
