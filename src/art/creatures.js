// Code-drawn creatures for the key-visual demo, in the three looks the art-style
// report recommends (reports/Art style for 2048 Siege pets.md):
//   sticker: flat fills, one hard cel tone, plum ink lines, a thick plum outline
//            plus a cream sticker rim (map tiles and roaming fusions)
//   pixel:   the same designs rasterised onto a small grid, quantised to the
//            creature's palette with a 1 px plum outline (the comparison map)
//   vinyl:   soft-vinyl "designer toy" shading: gradients, an element rim light,
//            glossy eyes, on a painted plate (namecard portraits)
// One design per creature, drawn three ways, so every layer reads as the same pet.
// Everything is drawn in a 100 × 100 unit box (feet near y = 95) and scaled.
// These are stand-ins until the Gemini pipeline can generate the real set.

import { INK, CREAM, GOLD, BLUSH, BODY, tone, mix, fusionPalette } from './tokens.js';
import { glyphPath } from './glyphs.js';
import { FUSIONS, fusionKey } from '../sim/classes.js';

const TAU = Math.PI * 2;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// motif palettes: the element's own colours for crests and tails
export const MOTIF = {
  fire: { base: '#ff7a3d', shade: '#e2502a', light: '#ffe08a', core: '#ffd23f' },
  ice: { base: '#aee7ff', shade: '#6cc3f0', light: '#ffffff', core: '#ffffff' },
  lightning: { base: '#ffe14d', shade: '#f2b51c', light: '#fff7c9', core: '#ffffff' },
  poison: { base: '#c08cff', shade: '#9a5ae4', light: '#f1e4ff', core: '#c8ff5a' },
  earth: { base: '#b9a48c', shade: '#8a7663', light: '#ece2d3', core: '#7f9a4f' },
  wind: { base: '#d8fbef', shade: '#97dcc6', light: '#ffffff', core: '#7fd6ff' },
  metal: { base: '#aeb9ca', shade: '#76839a', light: '#eef2f7', core: '#ffcf4a' },
  nature: { base: '#5fd36f', shade: '#33a04c', light: '#d6f7c4', core: '#ff8fb1' },
};

// --- drawing kit -------------------------------------------------------------

export function kit(g, mode) {
  const sticker = mode === 'sticker';
  const vinyl = mode === 'vinyl';
  const inkW = sticker ? 2.3 : 0;

  function fill(p, pal, box, { shade = true, ink = true, alpha = 1 } = {}) {
    g.save();
    g.globalAlpha = alpha;
    if (vinyl) {
      const [x, y, w, h] = box;
      const m = Math.max(w, h);
      const gr = g.createRadialGradient(x + w * 0.32, y + h * 0.26, m * 0.03, x + w * 0.55, y + h * 0.58, m * 0.8);
      gr.addColorStop(0, pal.light);
      gr.addColorStop(0.42, pal.base);
      gr.addColorStop(1, pal.shade);
      g.fillStyle = gr;
      g.fill(p);
    } else {
      g.fillStyle = pal.base;
      g.fill(p);
      if (shade) {
        const o = Math.max(1, Math.min(box[2], box[3]) * 0.12);
        g.save();
        g.clip(p);
        g.fillStyle = pal.shade;
        g.fill(p);
        g.translate(-o * 0.75, -o);
        g.fillStyle = pal.base;
        g.fill(p);
        g.restore();
      }
    }
    if (ink && inkW) {
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.lineWidth = inkW;
      g.strokeStyle = INK;
      g.stroke(p);
    }
    g.restore();
  }

  function shine(x, y, rx, ry, pal, a = 1) {
    g.save();
    if (vinyl) {
      const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      gr.addColorStop(0, `rgba(255,255,255,${0.55 * a})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, y, rx * 1.4, ry * 1.4, -0.5, 0, TAU);
      g.fill();
    } else {
      g.globalAlpha = 0.9 * a;
      g.fillStyle = pal.light;
      g.beginPath();
      g.ellipse(x, y, rx, ry, -0.5, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  function line(pts, w = 2, color = INK, close = false) {
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.lineWidth = sticker ? w : w * 1.15;
    g.strokeStyle = color;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (close) g.closePath();
    g.stroke();
    g.restore();
  }

  function eyes(cx, cy, gap, r, { almond = 0, brow = 0, browUp = false, look = 0, iris = '#4b3c78' } = {}) {
    for (const side of [-1, 1]) {
      const x = cx + side * gap + look;
      g.save();
      g.translate(x, cy);
      g.rotate(almond * side * -0.32);
      const rx = r * (0.84 + almond * 0.32);
      const ry = r * (1 - almond * 0.4);
      const p = new Path2D();
      p.ellipse(0, 0, rx, ry, 0, 0, TAU);
      if (vinyl) {
        const gr = g.createRadialGradient(0, ry * 0.35, 0, 0, 0, Math.max(rx, ry));
        gr.addColorStop(0, iris);
        gr.addColorStop(0.75, INK);
        gr.addColorStop(1, INK);
        g.fillStyle = gr;
      } else g.fillStyle = INK;
      g.fill(p);
      if (almond > 0.3) {
        // a heavier upper lid makes the gaze read as confident
        g.fillStyle = INK;
        g.beginPath();
        g.ellipse(0, -ry * 0.55, rx * 1.12, ry * 0.5, 0, Math.PI, TAU);
        g.fill();
      }
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(-rx * 0.3, -ry * 0.32, r * 0.36, r * 0.36 * (1 - almond * 0.35), 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.arc(rx * 0.34, ry * 0.38, r * 0.15, 0, TAU);
      g.fill();
      g.restore();
      if (brow > 0) {
        const y0 = cy - r * 1.45;
        // fierce brows slope down toward the nose; serene ones arch up
        const inner = browUp ? y0 - r * 0.25 : y0 + r * 0.45 * brow;
        const outer = browUp ? y0 + r * 0.1 : y0 - r * 0.2 * brow;
        g.save();
        g.globalAlpha = Math.min(1, 0.45 + brow * 0.55);
        line(
          [
            [x + side * r * 1.05, outer],
            [x - side * r * 0.55, inner],
          ],
          1.4 + brow * 1.2,
        );
        g.restore();
      }
    }
  }

  function mouth(cx, cy, w, kind) {
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = sticker ? 2 : 2.2;
    g.strokeStyle = INK;
    g.beginPath();
    if (kind === 'open') {
      g.moveTo(cx - w * 0.5, cy - w * 0.1);
      g.quadraticCurveTo(cx, cy + w * 1.05, cx + w * 0.5, cy - w * 0.1);
      g.closePath();
      g.fillStyle = INK;
      g.fill();
      g.fillStyle = '#ff7f8f';
      g.beginPath();
      g.ellipse(cx, cy + w * 0.42, w * 0.28, w * 0.16, 0, 0, TAU);
      g.fill();
    } else if (kind === 'smirk') {
      g.moveTo(cx - w * 0.55, cy);
      g.quadraticCurveTo(cx - w * 0.05, cy + w * 0.42, cx + w * 0.6, cy - w * 0.2);
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(cx + w * 0.05, cy + w * 0.18);
      g.lineTo(cx + w * 0.28, cy + w * 0.12);
      g.lineTo(cx + w * 0.2, cy + w * 0.48);
      g.closePath();
      g.fill();
      if (sticker) {
        g.lineWidth = 1;
        g.stroke();
      }
    } else if (kind === 'calm') {
      g.moveTo(cx - w * 0.35, cy);
      g.quadraticCurveTo(cx, cy + w * 0.22, cx + w * 0.35, cy);
      g.stroke();
    } else {
      // smile: the little "w" cat mouth reads funnier than a plain arc
      g.moveTo(cx - w * 0.55, cy - w * 0.05);
      g.quadraticCurveTo(cx - w * 0.28, cy + w * 0.4, cx, cy);
      g.quadraticCurveTo(cx + w * 0.28, cy + w * 0.4, cx + w * 0.55, cy - w * 0.05);
      g.stroke();
    }
    g.restore();
  }

  function blush(cx, cy, gap, a = 0.55) {
    g.save();
    for (const side of [-1, 1]) {
      const x = cx + side * gap;
      if (vinyl) {
        const gr = g.createRadialGradient(x, cy, 0, x, cy, 6);
        gr.addColorStop(0, 'rgba(255,128,150,0.55)');
        gr.addColorStop(1, 'rgba(255,128,150,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.ellipse(x, cy, 7, 4.6, 0, 0, TAU);
        g.fill();
      } else {
        g.globalAlpha = a;
        g.fillStyle = BLUSH;
        g.beginPath();
        g.ellipse(x, cy, 4.6, 2.8, 0, 0, TAU);
        g.fill();
        g.globalAlpha = 1;
      }
    }
    g.restore();
  }

  return { g, mode, sticker, vinyl, pixel: mode === 'pixel', fill, shine, line, eyes, mouth, blush };
}

// --- shared parts ------------------------------------------------------------

const P = () => new Path2D();

export function flamePath(w, h) {
  const p = P();
  p.moveTo(0, -h);
  p.bezierCurveTo(w * 0.42, -h * 0.62, w * 0.78, -h * 0.3, w * 0.55, 0);
  p.bezierCurveTo(w * 0.32, h * 0.2, -w * 0.32, h * 0.2, -w * 0.55, 0);
  p.bezierCurveTo(-w * 0.78, -h * 0.3, -w * 0.18, -h * 0.5, 0, -h);
  p.closePath();
  return p;
}

export function shardPath(w, h) {
  const p = P();
  p.moveTo(0, -h);
  p.lineTo(w * 0.5, -h * 0.7);
  p.lineTo(w * 0.5, -h * 0.08);
  p.lineTo(0, h * 0.1);
  p.lineTo(-w * 0.5, -h * 0.08);
  p.lineTo(-w * 0.5, -h * 0.7);
  p.closePath();
  return p;
}

export function zigPath(w, h) {
  const p = P();
  p.moveTo(-w * 0.45, 0);
  p.lineTo(-w * 0.1, -h * 0.48);
  p.lineTo(-w * 0.5, -h * 0.44);
  p.lineTo(w * 0.12, -h);
  p.lineTo(w * 0.02, -h * 0.56);
  p.lineTo(w * 0.48, -h * 0.6);
  p.lineTo(w * 0.32, 0);
  p.closePath();
  return p;
}

export function rockPath(w, h) {
  const p = P();
  p.moveTo(-w * 0.5, 0);
  p.lineTo(-w * 0.56, -h * 0.58);
  p.lineTo(-w * 0.14, -h);
  p.lineTo(w * 0.42, -h * 0.9);
  p.lineTo(w * 0.56, -h * 0.32);
  p.lineTo(w * 0.46, 0);
  p.closePath();
  return p;
}

export function leafPath(w, h) {
  const p = P();
  p.moveTo(0, 0);
  p.bezierCurveTo(w * 0.62, -h * 0.28, w * 0.44, -h * 0.86, 0, -h);
  p.bezierCurveTo(-w * 0.44, -h * 0.86, -w * 0.62, -h * 0.28, 0, 0);
  p.closePath();
  return p;
}

export function puffPath(r) {
  const p = P();
  p.arc(-r * 0.6, 0, r * 0.62, 0, TAU);
  p.moveTo(r * 1.2, 0);
  p.arc(r * 0.6, 0, r * 0.62, 0, TAU);
  p.moveTo(r * 0.75, -r * 0.45);
  p.arc(0, -r * 0.45, r * 0.75, 0, TAU);
  return p;
}

export function gearPath(r, teeth = 7) {
  const p = P();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = ((i - 0.5) / (teeth * 2)) * TAU;
    const a1 = ((i + 0.5) / (teeth * 2)) * TAU;
    const rr = i % 2 ? r * 0.74 : r;
    if (i === 0) p.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    else p.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    p.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  p.closePath();
  return p;
}

const LAYOUT = [
  [[0, 1, 0]],
  [
    [-5, 0.82, -0.28],
    [5, 1, 0.22],
  ],
  [
    [-8.5, 0.78, -0.4],
    [0, 1.12, 0],
    [8.5, 0.84, 0.38],
  ],
  [
    [-12, 0.68, -0.55],
    [-4, 1.02, -0.14],
    [4.5, 1.16, 0.12],
    [12, 0.74, 0.52],
  ],
];

/** One element's signature motif, n pieces (1–4), standing on (ax, ay). */
export function motif(k, el, n, ax, ay, s = 1, { pal = MOTIF[el] } = {}) {
  const { g } = k;
  const pieces = LAYOUT[Math.max(0, Math.min(3, n - 1))];
  const at = (dx, rot, fn) => {
    g.save();
    g.translate(ax + dx * s, ay + Math.abs(dx) * 0.18 * s);
    g.rotate(rot);
    fn();
    g.restore();
  };
  switch (el) {
    case 'fire':
      for (const [dx, hk, rot] of pieces) {
        at(dx, rot, () => {
          const w = 10.5 * s;
          const h = 17 * s * hk;
          k.fill(flamePath(w, h), pal, [-w / 2, -h, w, h]);
          if (!k.pixel || s > 0.9) k.fill(flamePath(w * 0.48, h * 0.5), { base: pal.core, shade: pal.core, light: '#fff6c8' }, [-w / 4, -h / 2, w / 2, h / 2], { shade: false, ink: false });
        });
      }
      break;
    case 'ice':
      for (const [dx, hk, rot] of pieces) {
        at(dx, rot * 1.15, () => {
          const w = 8 * s;
          const h = 17 * s * hk;
          k.fill(shardPath(w, h), pal, [-w / 2, -h, w, h]);
          k.line(
            [
              [0, -h * 0.92],
              [0, -h * 0.05],
            ],
            1.1 * s,
            '#ffffff',
          );
        });
      }
      break;
    case 'lightning': {
      // a forelock bolt, then zigzag ears that grow
      const ears = n >= 2;
      const lock = n !== 2;
      if (ears) {
        const big = n >= 4 ? 1.25 : n === 3 ? 1.05 : 0.9;
        for (const side of [-1, 1]) {
          at(side * 11, side * 0.55, () => {
            const w = 11 * s * big;
            const h = 17 * s * big;
            g.save();
            g.scale(side, 1);
            k.fill(zigPath(w, h), pal, [-w / 2, -h, w, h]);
            g.restore();
          });
        }
      }
      if (lock) at(0, 0.1, () => k.fill(zigPath(9 * s, 13 * s), pal, [-4.5 * s, -13 * s, 9 * s, 13 * s]));
      break;
    }
    case 'poison': {
      const spots = [
        [0, -9, 4.2],
        [-7, -15, 3],
        [6, -18, 3.4],
        [1, -25, 2.4],
      ].slice(0, n);
      for (const [dx, dy, r] of spots) {
        const p = P();
        p.arc(ax + dx * s, ay + dy * s, r * s, 0, TAU);
        k.fill(p, pal, [ax + (dx - r) * s, ay + (dy - r) * s, 2 * r * s, 2 * r * s], { shade: false });
        k.shine(ax + (dx - r * 0.35) * s, ay + (dy - r * 0.35) * s, r * 0.32 * s, r * 0.25 * s, pal);
      }
      if (n >= 3) {
        // a droopy goo curl on the crown
        const p = P();
        p.moveTo(ax - 4 * s, ay + 1 * s);
        p.bezierCurveTo(ax - 9 * s, ay - 6 * s, ax - 1 * s, ay - 9 * s, ax + 3 * s, ay - 4 * s);
        p.bezierCurveTo(ax + 4 * s, ay - 1 * s, ax + 2 * s, ay + 2 * s, ax - 4 * s, ay + 1 * s);
        k.fill(p, { base: BODY.poison.base, shade: BODY.poison.shade, light: BODY.poison.light }, [ax - 9 * s, ay - 9 * s, 13 * s, 11 * s]);
      }
      break;
    }
    case 'earth':
      for (const [dx, hk, rot] of pieces) {
        at(dx, rot * 0.5, () => {
          const w = 11 * s;
          const h = 10 * s * hk;
          k.fill(rockPath(w, h), pal, [-w / 2, -h, w, h]);
        });
      }
      if (n >= 3) {
        const p = P();
        p.ellipse(ax - 2 * s, ay - 2 * s, 4.5 * s, 2.4 * s, 0, 0, TAU);
        k.fill(p, { base: '#86b05a', shade: '#5f8a3e', light: '#c6e59c' }, [ax - 6 * s, ay - 4 * s, 9 * s, 5 * s], { shade: false });
      }
      break;
    case 'wind':
      for (const [dx, hk, rot] of pieces) {
        at(dx, rot * 0.6, () => {
          const r = 5.2 * s * hk;
          g.save();
          g.translate(0, -r * 0.8);
          k.fill(puffPath(r), pal, [-r * 1.3, -r * 1.3, r * 2.6, r * 2]);
          k.line(
            [
              [-r * 0.5, -r * 0.2],
              [-r * 0.1, -r * 0.62],
              [r * 0.35, -r * 0.42],
              [r * 0.22, -r * 0.05],
              [-r * 0.05, -r * 0.18],
            ],
            1.3 * s,
            '#6fc7e8',
          );
          g.restore();
        });
      }
      break;
    case 'metal': {
      // antenna: a ball, then a bolt head, then a gear; rivets join at 2+
      const h = (n >= 3 ? 13 : 10) * s;
      k.line(
        [
          [ax, ay + 1],
          [ax, ay - h],
        ],
        2.6 * s,
        k.sticker ? INK : pal.shade,
      );
      k.line(
        [
          [ax, ay + 1],
          [ax, ay - h],
        ],
        1.2 * s,
        pal.light,
      );
      const top = ay - h;
      if (n >= 3) {
        const r = (n >= 4 ? 7.4 : 6) * s;
        g.save();
        g.translate(ax, top - r * 0.6);
        k.fill(gearPath(r), { base: GOLD, shade: '#d49b1f', light: '#fff1b8' }, [-r, -r, 2 * r, 2 * r]);
        const hole = P();
        hole.arc(0, 0, r * 0.32, 0, TAU);
        k.fill(hole, pal, [-r * 0.32, -r * 0.32, r * 0.64, r * 0.64], { shade: false });
        g.restore();
      } else {
        const p = P();
        if (n === 2) {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            const x = ax + Math.cos(a) * 4.4 * s;
            const y = top - 3 * s + Math.sin(a) * 4.4 * s;
            i ? p.lineTo(x, y) : p.moveTo(x, y);
          }
          p.closePath();
        } else p.arc(ax, top - 2.6 * s, 3.6 * s, 0, TAU);
        k.fill(p, { base: GOLD, shade: '#d49b1f', light: '#fff1b8' }, [ax - 4 * s, top - 7 * s, 8 * s, 8 * s]);
      }
      if (n >= 4) {
        for (const side of [-1, 1]) {
          at(side * 12, side * 0.7, () => {
            const p = P();
            p.roundRect(-3 * s, -9 * s, 6 * s, 9 * s, 2 * s);
            k.fill(p, pal, [-3 * s, -9 * s, 6 * s, 9 * s]);
          });
        }
      }
      break;
    }
    case 'nature': {
      const leaves = LAYOUT[Math.max(0, Math.min(3, (n >= 4 ? 3 : n) - 1))];
      k.line(
        [
          [ax, ay + 1],
          [ax, ay - 5 * s],
        ],
        2 * s,
        k.sticker ? INK : pal.shade,
      );
      for (const [dx, hk, rot] of leaves) {
        at(dx * 0.75, rot * 1.6, () => {
          const w = 9 * s;
          const h = 14 * s * hk;
          g.save();
          g.translate(0, -3 * s);
          k.fill(leafPath(w, h), pal, [-w / 2, -h, w, h]);
          k.line(
            [
              [0, -h * 0.1],
              [0, -h * 0.82],
            ],
            1 * s,
            pal.light,
          );
          g.restore();
        });
      }
      if (n >= 4) {
        // the sprout blooms
        g.save();
        g.translate(ax, ay - 17 * s);
        for (let i = 0; i < 5; i++) {
          g.save();
          g.rotate((i / 5) * TAU);
          const p = P();
          p.ellipse(0, -3.4 * s, 2.6 * s, 3.6 * s, 0, 0, TAU);
          k.fill(p, { base: pal.core, shade: '#e86d93', light: '#ffd3e0' }, [-2.6 * s, -7 * s, 5.2 * s, 7.2 * s], { shade: false });
          g.restore();
        }
        const c = P();
        c.arc(0, 0, 2.2 * s, 0, TAU);
        k.fill(c, { base: GOLD, shade: GOLD, light: '#fff' }, [-2.2 * s, -2.2 * s, 4.4 * s, 4.4 * s], { shade: false });
        g.restore();
      }
      break;
    }
  }
}

// --- babies (16 → 128) ----------------------------------------------------------

function babyBody(el) {
  const p = P();
  switch (el) {
    case 'fire':
      p.moveTo(50, 31);
      p.bezierCurveTo(62, 39, 82, 52, 82, 68);
      p.bezierCurveTo(82, 85, 68, 93, 50, 93);
      p.bezierCurveTo(32, 93, 18, 85, 18, 68);
      p.bezierCurveTo(18, 52, 38, 39, 50, 31);
      break;
    case 'ice':
      p.moveTo(50, 35);
      p.lineTo(69, 39);
      p.lineTo(82, 56);
      p.lineTo(81, 79);
      p.lineTo(67, 93);
      p.lineTo(33, 93);
      p.lineTo(19, 79);
      p.lineTo(18, 56);
      p.lineTo(31, 39);
      p.closePath();
      break;
    case 'earth':
      p.roundRect(18, 38, 64, 55, [17, 17, 13, 13]);
      break;
    case 'metal':
      p.roundRect(19, 36, 62, 57, 24);
      break;
    case 'poison':
      p.moveTo(50, 35);
      p.bezierCurveTo(70, 35, 82, 51, 82, 67);
      p.lineTo(82, 82);
      p.quadraticCurveTo(80, 92, 73, 89);
      p.quadraticCurveTo(68, 98, 62, 89);
      p.quadraticCurveTo(52, 94, 45, 90);
      p.quadraticCurveTo(38, 99, 32, 89);
      p.quadraticCurveTo(20, 92, 18, 82);
      p.lineTo(18, 67);
      p.bezierCurveTo(18, 51, 30, 35, 50, 35);
      break;
    default:
      p.moveTo(50, 34);
      p.bezierCurveTo(70, 34, 82, 51, 82, 66);
      p.bezierCurveTo(82, 84, 68, 93, 50, 93);
      p.bezierCurveTo(32, 93, 18, 84, 18, 66);
      p.bezierCurveTo(18, 51, 30, 34, 50, 34);
  }
  return p;
}

const MOTIF_ANCHOR = { fire: [50, 33], ice: [50, 37], earth: [50, 39], metal: [50, 37], poison: [50, 36] };

/** A baby pet: stage 0–3 = 16, 32, 64, 128. One motif piece per stage. */
export function drawBaby(k, el, stage) {
  const { g } = k;
  const pal = BODY[el];
  const n = stage + 1;
  // behind the body: tails and feet
  if (el === 'fire' && n >= 4) {
    g.save();
    g.translate(82, 84);
    g.rotate(1.05);
    k.fill(flamePath(9, 15), MOTIF.fire, [-4.5, -15, 9, 15]);
    g.restore();
  }
  if (el === 'wind' && n >= 2) {
    const p = P();
    p.moveTo(76, 80);
    p.bezierCurveTo(92, 82, 96, 66, 88, 60);
    p.bezierCurveTo(84, 57, 79, 61, 82, 65);
    p.bezierCurveTo(86, 70, 82, 76, 74, 74);
    p.closePath();
    k.fill(p, MOTIF.wind, [74, 57, 22, 25]);
  }
  if (el === 'nature' && n >= 4) {
    const p = P();
    p.moveTo(76, 84);
    p.bezierCurveTo(92, 86, 94, 72, 88, 68);
    p.bezierCurveTo(86, 74, 84, 78, 74, 78);
    p.closePath();
    k.fill(p, MOTIF.nature, [74, 68, 20, 18]);
    g.save();
    g.translate(89, 68);
    g.rotate(0.6);
    k.fill(leafPath(7, 10), MOTIF.nature, [-3.5, -10, 7, 10]);
    g.restore();
  }
  for (const fx of [37, 63]) {
    const f = P();
    f.ellipse(fx, 93, 8, 4.6, 0, 0, TAU);
    k.fill(f, { base: pal.shade, shade: tone(pal.shade, -0.2), light: pal.base }, [fx - 8, 89, 16, 9], { shade: false });
  }
  // body
  const body = babyBody(el);
  k.fill(body, pal, [18, 32, 64, 62]);
  // belly
  const belly = P();
  belly.ellipse(50, 79, 15.5, 10.5, 0, 0, TAU);
  k.fill(belly, { base: pal.light, shade: tone(pal.light, -0.08), light: '#ffffff' }, [34, 68, 31, 21], { shade: false, ink: false, alpha: k.vinyl ? 0.8 : 1 });
  // element body marks
  if (el === 'metal') {
    k.line(
      [
        [22, 60],
        [78, 60],
      ],
      1.4,
      k.sticker ? INK : pal.shade,
    );
    if (n >= 2)
      for (const [x, y] of [
        [25, 66],
        [75, 66],
        [25, 80],
        [75, 80],
      ]) {
        const r = P();
        r.arc(x, y, 1.9, 0, TAU);
        k.fill(r, { base: pal.light, shade: pal.light, light: '#fff' }, [x - 2, y - 2, 4, 4], { shade: false });
      }
  }
  if (el === 'ice') {
    const f = P();
    f.moveTo(50, 37);
    f.lineTo(66, 41);
    f.lineTo(56, 52);
    f.closePath();
    k.fill(f, { base: '#e6f8ff', shade: '#e6f8ff', light: '#fff' }, [50, 37, 16, 15], { shade: false, ink: false, alpha: 0.85 });
  }
  if (el === 'earth' && n >= 2) {
    k.line(
      [
        [26, 48],
        [32, 53],
        [30, 58],
      ],
      1.4,
      k.sticker ? INK : pal.shade,
    );
  }
  // little arms
  for (const side of [-1, 1]) {
    const a = P();
    a.ellipse(50 + side * 31, 73, 5, 7.2, side * 0.5, 0, TAU);
    k.fill(a, pal, [50 + side * 31 - 5, 66, 10, 14]);
  }
  k.shine(31, 48, 6, 3.6, pal, 0.85);
  // face: babies are all head, eyes big and round; brows creep in at 64
  const [ax, ay] = MOTIF_ANCHOR[el] ?? [50, 35];
  motif(k, el, n, ax, ay + 1, 1);
  k.eyes(50, 59, 12.5, 7.6, { almond: stage === 3 ? 0.2 : 0, brow: stage >= 2 ? (stage - 1) * 0.32 : 0 });
  k.blush(50, 68.5, 22.5);
  k.mouth(50, 69.5, 7.5, ['open', 'smile', 'open', 'smile'][stage]);
  // one "uncool" softener per element (Sugimori's rule): it keeps babies funny
  if (el === 'fire') for (const [x, y] of [[36, 72], [33, 69], [39, 69]]) k.fill(dot(x, y, 1), { base: '#9c3b1d', shade: '#9c3b1d', light: '#fff' }, [x, y, 1, 1], { shade: false, ink: false });
  if (el === 'ice') {
    const d = P();
    d.moveTo(50, 64.5);
    d.quadraticCurveTo(53, 70, 50, 72);
    d.quadraticCurveTo(47, 70, 50, 64.5);
    k.fill(d, { base: '#d9f4ff', shade: '#d9f4ff', light: '#fff' }, [47, 64, 6, 8], { shade: false });
  }
  if (el === 'lightning' && n >= 3) {
    for (const side of [-1, 1])
      k.line(
        [
          [50 + side * 32, 54],
          [50 + side * 35, 58],
          [50 + side * 32, 61],
          [50 + side * 35, 64],
        ],
        1.4,
        '#ff9f1c',
      );
  }
  if (el === 'metal') k.fill(dot(64, 74, 1.6), { base: '#c96f3b', shade: '#c96f3b', light: '#fff' }, [62, 72, 3, 3], { shade: false, ink: false });
  if (el === 'nature' && n === 1) k.fill(dot(70, 47, 1.4), { base: '#ffffff', shade: '#ffffff', light: '#fff' }, [69, 46, 2, 2], { shade: false, ink: false });
}

function dot(x, y, r) {
  const p = P();
  p.arc(x, y, r, 0, TAU);
  return p;
}

// --- eggs (2, 4, 8) -------------------------------------------------------------

export function drawEgg(k, tier) {
  const pal = { base: '#fff0da', shade: '#e8cda6', light: '#ffffff' };
  const p = P();
  p.moveTo(50, 20);
  p.bezierCurveTo(69, 20, 81, 51, 81, 68);
  p.bezierCurveTo(81, 86, 67, 96, 50, 96);
  p.bezierCurveTo(33, 96, 19, 86, 19, 68);
  p.bezierCurveTo(19, 51, 31, 20, 50, 20);
  k.fill(p, pal, [19, 20, 62, 76]);
  for (const [x, y, r] of [
    [38, 46, 3],
    [62, 56, 2.4],
    [44, 78, 2.2],
    [66, 80, 3.2],
    [56, 34, 2],
  ])
    k.fill(dot(x, y, r), { base: '#e6b98a', shade: '#e6b98a', light: '#fff' }, [x - r, y - r, 2 * r, 2 * r], { shade: false, ink: false });
  k.shine(38, 36, 6, 9, pal, 0.9);
  if (tier >= 2) {
    k.line(
      [
        [58, 26],
        [54, 34],
        [61, 39],
        [56, 47],
      ],
      2,
    );
  }
  if (tier >= 3) {
    // the crack opens: two eyes peek out
    const gap = P();
    gap.moveTo(24, 60);
    gap.lineTo(33, 54);
    gap.lineTo(41, 61);
    gap.lineTo(50, 53);
    gap.lineTo(59, 61);
    gap.lineTo(67, 54);
    gap.lineTo(76, 60);
    gap.lineTo(76, 66);
    gap.lineTo(67, 61);
    gap.lineTo(59, 68);
    gap.lineTo(50, 60);
    gap.lineTo(41, 68);
    gap.lineTo(33, 61);
    gap.lineTo(24, 66);
    gap.closePath();
    k.fill(gap, { base: INK, shade: INK, light: INK }, [24, 53, 52, 15], { shade: false, ink: false });
    for (const x of [41, 59]) {
      k.g.fillStyle = '#ffffff';
      k.g.beginPath();
      k.g.arc(x - 0.6, 61.4, 1.6, 0, TAU);
      k.g.fill();
    }
  }
}

// --- fusions (256+) -------------------------------------------------------------

function headPath(a) {
  const p = P();
  switch (a) {
    case 'fire':
      p.moveTo(50, 12);
      p.bezierCurveTo(60, 18, 70, 26, 70, 35);
      p.bezierCurveTo(70, 46, 61, 52, 50, 52);
      p.bezierCurveTo(39, 52, 30, 46, 30, 35);
      p.bezierCurveTo(30, 26, 40, 18, 50, 12);
      break;
    case 'ice':
      p.moveTo(50, 14);
      p.lineTo(64, 18);
      p.lineTo(71, 32);
      p.lineTo(66, 47);
      p.lineTo(50, 53);
      p.lineTo(34, 47);
      p.lineTo(29, 32);
      p.lineTo(36, 18);
      p.closePath();
      break;
    case 'earth':
      p.roundRect(29, 15, 42, 37, 12);
      break;
    case 'metal':
      p.roundRect(30, 14, 40, 38, [16, 16, 11, 11]);
      break;
    default:
      p.ellipse(50, 33, 20.5, 19, 0, 0, TAU);
  }
  return p;
}

function torsoPath(a) {
  const p = P();
  switch (a) {
    case 'fire':
      p.moveTo(40, 49);
      p.quadraticCurveTo(50, 44, 60, 49);
      p.lineTo(66, 75);
      p.quadraticCurveTo(50, 84, 34, 75);
      p.closePath();
      break;
    case 'ice':
      p.moveTo(40, 48);
      p.lineTo(60, 48);
      p.lineTo(67, 62);
      p.lineTo(62, 79);
      p.lineTo(38, 79);
      p.lineTo(33, 62);
      p.closePath();
      break;
    case 'earth':
      p.roundRect(30, 46, 40, 34, 9);
      break;
    case 'metal':
      p.roundRect(35, 46, 30, 33, 8);
      break;
    case 'wind':
      p.ellipse(50, 63, 11.5, 15.5, 0, 0, TAU);
      break;
    case 'poison':
      p.moveTo(38, 50);
      p.quadraticCurveTo(50, 44, 62, 50);
      p.lineTo(65, 74);
      p.quadraticCurveTo(64, 80, 59, 78);
      p.quadraticCurveTo(55, 85, 50, 79);
      p.quadraticCurveTo(45, 85, 41, 78);
      p.quadraticCurveTo(36, 80, 35, 74);
      p.closePath();
      break;
    case 'lightning':
      p.roundRect(39, 47, 22, 31, 10);
      break;
    default:
      p.ellipse(50, 63, 15, 16, 0, 0, TAU);
  }
  return p;
}

/**
 * Fusion proportions (style brief, growth-arc table): the head is drawn in a 41-unit
 * box and scaled about the neck so it is ~35% of the standing height; the body is
 * lifted so the legs are ~37%. Feet stay at y ≈ 95.
 */
export const FUSION_PROPORTIONS = { lift: 8, headScale: 0.68, neckY: 52 };

/**
 * A fusion: body and silhouette from parent A, head crest and tail motif from
 * parent B, the fusion's own colour dominant (the slot rule from the report).
 * Legendary adds gold trim and a serene face; its halo is a separate sprite.
 */
export function drawFusion(k, a, b, { legendary = false } = {}) {
  const { g } = k;
  const pal = fusionPalette(a, b);
  const pa = BODY[a];
  const mb = MOTIF[b];
  const { lift, headScale, neckY } = FUSION_PROPORTIONS;
  // tail (behind): curves out to the right, tipped with B's motif
  {
    g.save();
    g.translate(0, -lift);
    const t = P();
    t.moveTo(58, 72);
    t.bezierCurveTo(70, 80, 84, 74, 86, 60);
    t.bezierCurveTo(86, 56, 83, 55, 81, 59);
    t.bezierCurveTo(78, 68, 68, 71, 60, 66);
    t.closePath();
    k.fill(t, pal, [58, 55, 28, 25]);
    g.save();
    g.translate(84, 58);
    g.rotate(0.35);
    motif(k, b, 1, 0, 0, 0.82, { pal: mb });
    g.restore();
    g.restore();
  }
  // wind bodies carry swoosh wings; others none
  if (a === 'wind') {
    g.save();
    g.translate(0, -lift);
    for (const side of [-1, 1]) {
      const w = P();
      w.moveTo(50 + side * 6, 54);
      w.bezierCurveTo(50 + side * 22, 40, 50 + side * 32, 46, 50 + side * 30, 56);
      w.bezierCurveTo(50 + side * 24, 54, 50 + side * 20, 60, 50 + side * 8, 62);
      w.closePath();
      k.fill(w, { base: pal.light, shade: pal.base, light: '#ffffff' }, [50 + Math.min(side * 6, side * 32), 40, 26, 22]);
    }
    g.restore();
  }
  // legs: long enough to read as grown-up (limbs ~37% of height, style brief)
  const legW = a === 'earth' ? 10 : a === 'wind' || a === 'lightning' ? 6.5 : 8;
  for (const side of [-1, 1]) {
    const x = 50 + side * (a === 'earth' ? 10 : 7.5) - legW / 2;
    const l = P();
    const top = 74 - lift;
    if (a === 'poison') l.roundRect(x - 1, top + 2, legW + 2, 94 - top - 2, [4, 4, 7, 7]);
    else l.roundRect(x, top, legW, 94 - top, [3, 3, 5, 5]);
    k.fill(l, pal, [x, top, legW, 94 - top]);
    const f = P();
    f.ellipse(x + legW / 2 + side * 1.5, 94, legW * 0.8, 3.6, 0, 0, TAU);
    k.fill(f, { base: pal.shade, shade: tone(pal.shade, -0.2), light: pal.base }, [x - 2, 90, legW + 4, 8], { shade: false });
  }
  // torso, marks and arms sit higher on the longer legs
  g.save();
  g.translate(0, -lift);
  const torso = torsoPath(a);
  k.fill(torso, pal, [32, 45, 36, 36]);
  // A's body marks in A's colour
  const mark = { base: mix(pal.light, pa.base, 0.35), shade: mix(pal.light, pa.base, 0.55), light: '#ffffff' };
  if (a === 'metal' || a === 'ice') {
    const c = P();
    c.roundRect(42, 55, 16, 15, 4);
    k.fill(c, mark, [42, 55, 16, 15]);
    if (a === 'metal')
      for (const [x, y] of [
        [44.5, 57.5],
        [55.5, 57.5],
        [44.5, 67.5],
        [55.5, 67.5],
      ])
        k.fill(dot(x, y, 1.3), { base: '#ffffff', shade: '#fff', light: '#fff' }, [x - 1, y - 1, 2, 2], { shade: false, ink: false });
  } else {
    const belly = P();
    belly.ellipse(50, 66, 8.5, 10, 0, 0, TAU);
    k.fill(belly, mark, [41, 56, 17, 20], { shade: false });
  }
  if (a === 'fire') {
    g.save();
    g.translate(50, 69);
    k.fill(flamePath(7, 10), { base: pa.base, shade: pa.shade, light: '#ffe08a' }, [-3.5, -10, 7, 10], { ink: false });
    g.restore();
  }
  if (a === 'lightning') {
    // zigzag mane collar
    const m = P();
    const pts = 10;
    for (let i = 0; i <= pts; i++) {
      const ang = Math.PI * (1.05 + (i / pts) * 0.9);
      const r = i % 2 ? 12 : 17;
      const x = 50 + Math.cos(ang) * r * 1.2;
      const y = 51 - Math.sin(ang) * r * 0.55;
      i ? m.lineTo(x, y) : m.moveTo(x, y);
    }
    m.closePath();
    k.fill(m, { base: BODY.lightning.base, shade: BODY.lightning.shade, light: '#fff' }, [30, 44, 40, 14]);
  }
  if (a === 'nature') {
    for (let i = 0; i < 5; i++) {
      g.save();
      g.translate(50 + (i - 2) * 6.5, 51 + Math.abs(i - 2) * 1.5);
      g.rotate((i - 2) * 0.45 + Math.PI);
      k.fill(leafPath(7, 10), MOTIF.nature, [-3.5, -10, 7, 10]);
      g.restore();
    }
  }
  if (a === 'earth') {
    for (const side of [-1, 1]) {
      g.save();
      g.translate(50 + side * 19, 50);
      g.rotate(side * 0.4);
      k.fill(rockPath(12, 9), MOTIF.earth, [-6, -9, 12, 9]);
      g.restore();
    }
  }
  if (legendary) {
    // gold trim: a chest emblem, the "prestige" accent
    const e = P();
    e.moveTo(50, 53);
    e.lineTo(55, 59);
    e.lineTo(50, 65);
    e.lineTo(45, 59);
    e.closePath();
    k.fill(e, { base: GOLD, shade: '#d49b1f', light: '#fff4c2' }, [45, 53, 10, 12]);
  }
  // arms, angled out (confident stance)
  for (const side of [-1, 1]) {
    const arm = P();
    arm.moveTo(50 + side * 12, 51);
    arm.quadraticCurveTo(50 + side * 22, 56, 50 + side * 21, 66);
    arm.quadraticCurveTo(50 + side * 18, 69, 50 + side * 16, 65);
    arm.quadraticCurveTo(50 + side * 16, 59, 50 + side * 10, 56);
    arm.closePath();
    k.fill(arm, pal, [50 + Math.min(side * 10, side * 22), 51, 12, 18]);
  }
  // head (shadow on the torso first: grounding for the vinyl look)
  if (k.vinyl) {
    const gr = g.createRadialGradient(50, 50, 2, 50, 50, 18);
    gr.addColorStop(0, 'rgba(30,15,40,0.35)');
    gr.addColorStop(1, 'rgba(30,15,40,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(50, 51, 18, 7, 0, 0, TAU);
    g.fill();
  }
  g.restore();
  // head: drawn at full size, then scaled about the neck to ~35% of the height
  g.save();
  g.translate(50, neckY - lift);
  g.scale(headScale, headScale);
  g.translate(-50, -neckY);
  // ears from A, for the round-headed bodies
  if (a === 'wind' || a === 'poison' || a === 'nature' || a === 'lightning') {
    for (const side of [-1, 1]) {
      g.save();
      g.translate(50 + side * 15, 20);
      g.rotate(side * 0.55);
      const ear = a === 'lightning' ? zigPath(10, 15) : a === 'nature' ? leafPath(9, 14) : flamePath(9, 13);
      g.save();
      g.scale(side, 1);
      k.fill(ear, a === 'nature' ? MOTIF.nature : pal, [-5, -15, 10, 15]);
      g.restore();
      g.restore();
    }
  }
  const head = headPath(a);
  k.fill(head, pal, [29, 12, 42, 41]);
  k.shine(39, 24, 5, 3, pal, 0.8);
  // crest from B
  const crestY = a === 'fire' ? 18 : a === 'ice' ? 17 : 15;
  motif(k, b, 3, 50, crestY, 1.05, { pal: mb });
  // face: almond eyes tilted up, fierce brows and a smirk; legendary is serene
  const look = -2.5; // three-quarter view, facing left (the sprite flips to face its walk)
  if (legendary) {
    k.eyes(50, 34, 8.8, 4.8, { almond: 0.65, brow: 0.6, browUp: true, look, iris: tone(pal.base, -0.2) });
    k.mouth(48, 43.5, 6, 'calm');
  } else {
    k.eyes(50, 34, 8.8, 5, { almond: 0.72, brow: 1, look, iris: tone(pal.base, -0.25) });
    k.mouth(47.5, 43, 7.5, 'smirk');
  }
  // vestige of the baby: the blush stays, fainter
  k.blush(48, 40.5, 14.5, 0.3);
  g.restore();
}

/** Apex halo kit for a legendary: a gold ring carrying 6 pieces of the apex element. */
export function drawHalo(k, apex) {
  const { g } = k;
  const ring = P();
  ring.arc(50, 50, 40, 0, TAU);
  ring.arc(50, 50, 34, 0, TAU, true);
  k.fill(ring, { base: GOLD, shade: '#d49b1f', light: '#fff4c2' }, [10, 10, 80, 80]);
  if (apex === 'ice') {
    // Timestop: clock ticks on the ring
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      k.line(
        [
          [50 + Math.cos(a) * 35, 50 + Math.sin(a) * 35],
          [50 + Math.cos(a) * 39, 50 + Math.sin(a) * 39],
        ],
        i % 3 ? 1 : 2,
      );
    }
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 2;
    g.save();
    g.translate(50 + Math.cos(a) * 37, 50 + Math.sin(a) * 37);
    g.rotate(a + Math.PI / 2);
    motif(k, apex, 1, 0, 3, 0.62);
    g.restore();
  }
}

// --- renderers ------------------------------------------------------------------

/** Dilate a drawing's silhouette: cream rim, then plum outline, then the art. */
export function stickerize(src, inkPx, rimPx) {
  const out = makeCanvas(src.width, src.height);
  const o = out.getContext('2d');
  const sil = (color) => {
    const c = makeCanvas(src.width, src.height);
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  };
  const stamp = (c, r) => {
    const steps = 28;
    for (const rr of [r, r * 0.6]) for (let i = 0; i < steps; i++) o.drawImage(c, Math.cos((i / steps) * TAU) * rr, Math.sin((i / steps) * TAU) * rr);
  };
  stamp(sil(CREAM), inkPx + rimPx);
  stamp(sil(INK), inkPx);
  o.drawImage(src, 0, 0);
  return out;
}

const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Snap a small drawing to whole pixels: hard alpha, palette colours, 1 px plum outline. */
export function quantize(c, palette, { outline = true } = {}) {
  const x = c.getContext('2d');
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const pal = [...new Set(palette)].map(hexRgb);
  const W = c.width;
  const H = c.height;
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = d[i * 4 + 3];
    if (a < 110) {
      d[i * 4 + 3] = 0;
      continue;
    }
    // un-premultiply edge pixels before matching
    const k = 255 / a;
    const r = d[i * 4] * (a < 255 ? Math.min(k, 1.6) : 1);
    const gg = d[i * 4 + 1] * (a < 255 ? Math.min(k, 1.6) : 1);
    const b = d[i * 4 + 2] * (a < 255 ? Math.min(k, 1.6) : 1);
    let best = pal[0];
    let bd = Infinity;
    for (const p of pal) {
      const dd = (p[0] - r) ** 2 * 0.3 + (p[1] - gg) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11;
      if (dd < bd) {
        bd = dd;
        best = p;
      }
    }
    d[i * 4] = best[0];
    d[i * 4 + 1] = best[1];
    d[i * 4 + 2] = best[2];
    d[i * 4 + 3] = 255;
    solid[i] = 1;
  }
  if (outline) {
    const ink = hexRgb(INK);
    for (let y = 0; y < H; y++) {
      for (let xx = 0; xx < W; xx++) {
        const i = y * W + xx;
        if (solid[i]) continue;
        const n = (xx > 0 && solid[i - 1]) || (xx < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W]);
        if (n) {
          d[i * 4] = ink[0];
          d[i * 4 + 1] = ink[1];
          d[i * 4 + 2] = ink[2];
          d[i * 4 + 3] = 255;
        }
      }
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

/** Colours a creature may use in pixel form. */
function paletteFor(spec) {
  const base = [INK, '#ffffff', BLUSH, '#ff7f8f', GOLD, '#d49b1f'];
  const add = (p) => p && base.push(p.base, p.shade, p.light, p.core ?? p.base);
  if (spec.kind === 'egg') base.push('#fff0da', '#e8cda6', '#e6b98a');
  if (spec.kind === 'baby') {
    add(BODY[spec.el]);
    add(MOTIF[spec.el]);
    if (spec.el === 'earth') base.push('#86b05a', '#5f8a3e');
    if (spec.el === 'nature') base.push('#e86d93', '#ffd3e0');
  }
  if (spec.kind === 'fusion') {
    const pal = fusionPalette(spec.a, spec.b);
    add(pal);
    add(MOTIF[spec.b]);
    add(MOTIF[spec.a]);
    base.push(mix(pal.light, BODY[spec.a].base, 0.35), mix(pal.light, BODY[spec.a].base, 0.55), BODY[spec.a].base, BODY[spec.a].shade);
    if (spec.a === 'lightning') add(BODY.lightning);
  }
  if (spec.kind === 'halo') add(MOTIF[spec.apex]);
  return base;
}

function drawSpec(k, spec) {
  if (spec.kind === 'baby') drawBaby(k, spec.el, spec.stage);
  else if (spec.kind === 'egg') drawEgg(k, spec.tier);
  else if (spec.kind === 'fusion') drawFusion(k, spec.a, spec.b, spec);
  else if (spec.kind === 'halo') drawHalo(k, spec.apex);
}

/**
 * Render a creature spec in a style. Returns a canvas with a margin around the
 * 100-unit box: { canvas, unit (px per unit), pad (px) }.
 * spec: { kind: 'baby', el, stage } | { kind: 'egg', tier } | { kind: 'fusion', a, b, legendary } | { kind: 'halo', apex }
 */
export function renderCreature(spec, style, size = null) {
  if (style === 'pixel') {
    const G = size ?? (spec.kind === 'fusion' || spec.kind === 'halo' ? 40 : spec.kind === 'egg' ? 22 : 30);
    const pad = 1;
    const c = makeCanvas(G + pad * 2, G + pad * 2);
    const g = c.getContext('2d');
    g.translate(pad, pad);
    g.scale(G / 100, G / 100);
    drawSpec(kit(g, 'pixel'), spec);
    quantize(c, paletteFor(spec));
    return { canvas: c, unit: G / 100, pad };
  }
  const unit = size ?? (spec.kind === 'fusion' || spec.kind === 'halo' ? 2.6 : 2.4);
  const padU = 8;
  const W = (100 + padU * 2) * unit;
  const c = makeCanvas(W, W);
  const g = c.getContext('2d');
  g.translate(padU * unit, padU * unit);
  g.scale(unit, unit);
  drawSpec(kit(g, style === 'vinyl' ? 'vinyl' : 'sticker'), spec);
  if (style === 'vinyl') return { canvas: c, unit, pad: padU * unit };
  return { canvas: stickerize(c, 3 * unit, 2.2 * unit), unit, pad: padU * unit };
}

/** Add an element rim light from behind-right (the creature's own aura, not a stray light). */
function rimLight(src, color, px) {
  const W = src.width;
  const H = src.height;
  const rim = makeCanvas(W, H);
  const r = rim.getContext('2d');
  r.drawImage(src, 0, 0);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = color;
  r.fillRect(0, 0, W, H);
  r.globalCompositeOperation = 'destination-out';
  r.drawImage(src, -px, px * 0.6);
  const out = makeCanvas(W, H);
  const o = out.getContext('2d');
  o.drawImage(src, 0, 0);
  o.globalCompositeOperation = 'source-atop';
  o.globalAlpha = 0.9;
  o.shadowColor = color;
  o.shadowBlur = px * 1.6;
  o.drawImage(rim, 0, 0);
  o.drawImage(rim, 0, 0);
  return out;
}

/**
 * Namecard portrait: the fusion as a soft-vinyl toy, head-and-shoulders crop,
 * three-quarter view, warm key light from upper left, element rim light, on a
 * radial plate in the fusion colour (painted in, so nothing needs keying).
 */
export function renderPortrait(a, b, { legendary = false, apex = null, size = 256 } = {}) {
  const f = FUSIONS[fusionKey(a, b)];
  const unit = (size / 100) * 1.95;
  const cw = size;
  const creature = makeCanvas(cw, cw);
  const g = creature.getContext('2d');
  // frame head and shoulders: the head (unit-space y ≈ 15–44) fills ~55% of the height
  g.translate(cw * 0.5 - 50 * unit, cw * 0.56 - 33 * unit);
  g.scale(unit, unit);
  drawFusion(kit(g, 'vinyl'), a, b, { legendary });
  const lit = rimLight(creature, tone(f.color, 0.45), size * 0.018);

  const out = makeCanvas(size, size);
  const o = out.getContext('2d');
  const bg = o.createRadialGradient(size * 0.42, size * 0.38, size * 0.05, size * 0.5, size * 0.5, size * 0.75);
  bg.addColorStop(0, tone(f.color, 0.55));
  bg.addColorStop(0.55, f.color);
  bg.addColorStop(1, tone(f.color, -0.45));
  o.fillStyle = bg;
  o.fillRect(0, 0, size, size);
  // soft rays behind the head
  o.save();
  o.globalAlpha = legendary ? 0.32 : 0.14;
  o.translate(size * 0.5, size * 0.4);
  for (let i = 0; i < 12; i++) {
    o.rotate(TAU / 12);
    o.fillStyle = '#ffffff';
    o.beginPath();
    o.moveTo(0, 0);
    o.lineTo(size * 0.09, -size);
    o.lineTo(-size * 0.09, -size);
    o.closePath();
    o.fill();
  }
  o.restore();
  if (legendary) {
    // backlight halo in the apex colour
    const h = o.createRadialGradient(size * 0.5, size * 0.36, size * 0.1, size * 0.5, size * 0.36, size * 0.45);
    h.addColorStop(0, 'rgba(255,240,190,0.9)');
    h.addColorStop(0.5, 'rgba(255,207,74,0.35)');
    h.addColorStop(1, 'rgba(255,207,74,0)');
    o.fillStyle = h;
    o.fillRect(0, 0, size, size);
    if (apex) {
      const halo = makeCanvas(size, size);
      const hg = halo.getContext('2d');
      hg.translate(size * 0.5 - size * 0.42, size * 0.33 - size * 0.42);
      hg.scale((size * 0.84) / 100, (size * 0.84) / 100);
      drawHalo(kit(hg, 'vinyl'), apex);
      o.globalAlpha = 0.85;
      o.drawImage(halo, 0, 0);
      o.globalAlpha = 1;
    }
  }
  // contact shadow under the bust
  const sh = o.createRadialGradient(size * 0.5, size * 1.02, 0, size * 0.5, size * 1.02, size * 0.5);
  sh.addColorStop(0, 'rgba(20,10,30,0.45)');
  sh.addColorStop(1, 'rgba(20,10,30,0)');
  o.fillStyle = sh;
  o.fillRect(0, 0, size, size);
  o.drawImage(lit, 0, 0);
  return out;
}
