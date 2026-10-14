// Procedural 2D art, drawn once into canvases and turned into Pixi textures.
// Generated sprites (public/assets, see tools/gen-assets.mjs) replace these
// per key when present: enemy.<type>, proj.<element>, bg.
//
// Projectile shapes are drawn mostly white so they can be tinted per element
// (a fireball tinted ice-blue is the Blue Flame fusion's projectile).

import { Assets, Texture } from 'pixi.js';
import { TIER_COLORS, tierValue } from '../config.js';
import { ELEMENTS, fusionOf } from '../sim/classes.js';
import { ENEMY_TYPES } from '../sim/enemies.js';

const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';
const cache = new Map();
const generated = new Map(); // key → Texture loaded from public/assets

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  return c;
}

function tex(key, w, h, draw) {
  if (generated.has(key)) return generated.get(key);
  if (!cache.has(key)) cache.set(key, Texture.from(canvas(w, h, draw)));
  return cache.get(key);
}

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

/** Lighten a #rrggbb colour toward white by `amt` (0..1), keeping the hex form. */
const lightenHex = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v + (255 - v) * amt);
  return '#' + [16, 8, 0].map((sh) => f((n >> sh) & 255).toString(16).padStart(2, '0')).join('');
};

// --- generated asset loading ---------------------------------------------------

/** Load public/assets/manifest.json (written by tools/gen-assets.mjs) if it exists. */
export async function loadGeneratedAssets() {
  try {
    const res = await fetch('assets/manifest.json', { cache: 'no-store' });
    if (!res.ok) return 0;
    const manifest = await res.json();
    const entries = Object.entries(manifest.files ?? {});
    await Promise.all(
      entries.map(async ([key, file]) => {
        try {
          generated.set(key, await Assets.load(`assets/${file}`));
        } catch {
          /* missing file: keep the procedural version */
        }
      }),
    );
    return generated.size;
  } catch {
    return 0;
  }
}
export const hasGenerated = (key) => generated.has(key);

// --- basics ----------------------------------------------------------------------

export const softDot = () =>
  tex('soft', 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });

export const ringTex = () =>
  tex('ring', 128, 128, (g) => {
    g.strokeStyle = 'white';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.stroke();
  });

export const sparkTex = () =>
  tex('spark', 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 7 : 30;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  });

/** Gold coin: rim, face, embossed star and a shine. */
export const coinTex = () =>
  tex('coin', 64, 64, (g) => {
    g.fillStyle = '#a8660f';
    g.beginPath();
    g.arc(32, 34, 28, 0, Math.PI * 2);
    g.fill();
    const face = g.createRadialGradient(26, 24, 2, 32, 32, 28);
    face.addColorStop(0, '#fff3a8');
    face.addColorStop(0.5, '#ffd34a');
    face.addColorStop(1, '#e89a16');
    g.fillStyle = face;
    g.beginPath();
    g.arc(32, 31, 27, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#c47a10';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(32, 31, 19, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#d98a12';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 ? 5 : 11;
      g.lineTo(32 + Math.cos(a) * r, 31 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.ellipse(22, 18, 7, 3.5, -0.6, 0, Math.PI * 2);
    g.fill();
  });

export const shadowTex = () =>
  tex('shadow', 128, 48, (g) => {
    const gr = g.createRadialGradient(64, 24, 0, 64, 24, 60);
    gr.addColorStop(0, 'rgba(20,10,40,0.45)');
    gr.addColorStop(1, 'rgba(20,10,40,0)');
    g.fillStyle = gr;
    g.scale(1, 0.4);
    g.beginPath();
    g.arc(64, 60, 60, 0, Math.PI * 2);
    g.fill();
  });

// --- element & status icons ---------------------------------------------------------

function drawIcon(g, kind, s, color) {
  // s = icon size; drawn centred at (s/2, s/2)
  const c = s / 2;
  g.save();
  g.translate(c, c);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const outline = 'rgba(40,24,30,0.85)';
  switch (kind) {
    case 'fire':
    case 'burn': {
      const path = () => {
        g.beginPath();
        g.moveTo(0, s * 0.42);
        g.bezierCurveTo(-s * 0.36, s * 0.38, -s * 0.38, s * 0.02, -s * 0.16, -s * 0.18);
        g.bezierCurveTo(-s * 0.12, -s * 0.02, -s * 0.04, 0, -s * 0.02, -s * 0.06);
        g.bezierCurveTo(-s * 0.06, -s * 0.26, s * 0.06, -s * 0.36, s * 0.1, -s * 0.44);
        g.bezierCurveTo(s * 0.16, -s * 0.24, s * 0.4, -s * 0.06, s * 0.34, s * 0.16);
        g.bezierCurveTo(s * 0.3, s * 0.36, s * 0.14, s * 0.42, 0, s * 0.42);
      };
      path();
      g.fillStyle = color ?? '#ff7a3d';
      g.strokeStyle = outline;
      g.lineWidth = s * 0.07;
      g.stroke();
      g.fill();
      g.beginPath();
      g.ellipse(0, s * 0.2, s * 0.13, s * 0.18, 0, 0, Math.PI * 2);
      g.fillStyle = '#ffe28a';
      g.fill();
      break;
    }
    case 'ice':
    case 'chill': {
      g.strokeStyle = outline;
      g.lineWidth = s * 0.16;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < 3; i++) {
          g.save();
          g.rotate((i * Math.PI) / 3);
          g.beginPath();
          g.moveTo(0, -s * 0.4);
          g.lineTo(0, s * 0.4);
          g.moveTo(-s * 0.12, -s * 0.3);
          g.lineTo(0, -s * 0.2);
          g.lineTo(s * 0.12, -s * 0.3);
          g.moveTo(-s * 0.12, s * 0.3);
          g.lineTo(0, s * 0.2);
          g.lineTo(s * 0.12, s * 0.3);
          g.stroke();
          g.restore();
        }
        g.strokeStyle = color ?? '#bfeaff';
        g.lineWidth = s * 0.07;
      }
      break;
    }
    case 'freeze': {
      g.fillStyle = 'rgba(190,235,255,0.95)';
      g.strokeStyle = outline;
      g.lineWidth = s * 0.07;
      g.beginPath();
      g.roundRect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72, s * 0.12);
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = s * 0.06;
      g.beginPath();
      g.moveTo(-s * 0.2, -s * 0.1);
      g.lineTo(-s * 0.05, -s * 0.24);
      g.moveTo(-s * 0.2, s * 0.06);
      g.lineTo(s * 0.12, -s * 0.24);
      g.stroke();
      break;
    }
    case 'lightning': {
      g.beginPath();
      g.moveTo(s * 0.08, -s * 0.44);
      g.lineTo(-s * 0.26, s * 0.06);
      g.lineTo(-s * 0.02, s * 0.06);
      g.lineTo(-s * 0.1, s * 0.44);
      g.lineTo(s * 0.28, -s * 0.08);
      g.lineTo(s * 0.04, -s * 0.08);
      g.closePath();
      g.fillStyle = color ?? '#ffe14d';
      g.strokeStyle = outline;
      g.lineWidth = s * 0.07;
      g.stroke();
      g.fill();
      break;
    }
    case 'poison': {
      g.beginPath();
      g.moveTo(0, -s * 0.42);
      g.bezierCurveTo(s * 0.12, -s * 0.2, s * 0.34, 0, s * 0.3, s * 0.16);
      g.arc(0, s * 0.16, s * 0.3, 0, Math.PI, false);
      g.bezierCurveTo(-s * 0.34, 0, -s * 0.12, -s * 0.2, 0, -s * 0.42);
      g.fillStyle = color ?? '#b46cff';
      g.strokeStyle = outline;
      g.lineWidth = s * 0.07;
      g.stroke();
      g.fill();
      g.fillStyle = 'rgba(50,20,70,0.75)';
      g.beginPath();
      g.arc(-s * 0.09, s * 0.14, s * 0.06, 0, Math.PI * 2);
      g.arc(s * 0.09, s * 0.14, s * 0.06, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'earth': {
      g.beginPath();
      const pts = [
        [-0.36, 0.2],
        [-0.3, -0.16],
        [-0.06, -0.36],
        [0.26, -0.26],
        [0.38, 0.06],
        [0.2, 0.34],
        [-0.16, 0.36],
      ];
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
      g.closePath();
      g.fillStyle = color ?? '#c79a62';
      g.strokeStyle = outline;
      g.lineWidth = s * 0.07;
      g.stroke();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.ellipse(-s * 0.08, -s * 0.12, s * 0.12, s * 0.07, -0.5, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'wind': {
      g.strokeStyle = outline;
      g.lineWidth = s * 0.17;
      for (let pass = 0; pass < 2; pass++) {
        g.beginPath();
        g.moveTo(-s * 0.4, -s * 0.12);
        g.lineTo(s * 0.12, -s * 0.12);
        g.arc(s * 0.12, -s * 0.24, s * 0.12, Math.PI / 2, -Math.PI * 0.9, true);
        g.moveTo(-s * 0.4, s * 0.06);
        g.lineTo(s * 0.24, s * 0.06);
        g.arc(s * 0.24, s * 0.2, s * 0.14, -Math.PI / 2, Math.PI * 0.85);
        g.moveTo(-s * 0.3, s * 0.24);
        g.lineTo(-s * 0.02, s * 0.24);
        g.stroke();
        g.strokeStyle = color ?? '#bff7e6';
        g.lineWidth = s * 0.08;
      }
      break;
    }
    case 'metal': {
      // a steel gear
      const teeth = 8;
      g.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a0 = (i / (teeth * 2)) * Math.PI * 2;
        const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
        const r = i % 2 ? s * 0.3 : s * 0.4;
        g.arc(0, 0, r, a0, a1);
      }
      g.closePath();
      g.fillStyle = color ?? '#c9d3df';
      g.strokeStyle = outline;
      g.lineWidth = s * 0.07;
      g.stroke();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.arc(-s * 0.08, -s * 0.1, s * 0.12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(40,24,30,0.85)';
      g.beginPath();
      g.arc(0, 0, s * 0.11, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'nature': {
      // a leaf with a vein
      g.beginPath();
      g.moveTo(-s * 0.36, s * 0.36);
      g.bezierCurveTo(-s * 0.4, -s * 0.1, -s * 0.05, -s * 0.38, s * 0.38, -s * 0.38);
      g.bezierCurveTo(s * 0.38, s * 0.05, s * 0.1, s * 0.4, -s * 0.36, s * 0.36);
      g.closePath();
      g.fillStyle = color ?? '#4cd964';
      g.strokeStyle = outline;
      g.lineWidth = s * 0.07;
      g.stroke();
      g.fill();
      g.strokeStyle = 'rgba(20,70,30,0.75)';
      g.lineWidth = s * 0.05;
      g.beginPath();
      g.moveTo(-s * 0.3, s * 0.3);
      g.lineTo(s * 0.22, -s * 0.22);
      g.stroke();
      break;
    }
    case 'loot': {
      // a gold coin (Metal's mark)
      g.beginPath();
      g.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      g.fillStyle = '#ffd34a';
      g.strokeStyle = '#a8660f';
      g.lineWidth = s * 0.08;
      g.stroke();
      g.fill();
      g.fillStyle = '#d98a12';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? s * 0.08 : s * 0.2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      break;
    }
    default:
      break;
  }
  g.restore();
}

export const iconTex = (kind) => tex(`icon.${kind}`, 64, 64, (g) => drawIcon(g, kind, 64, ELEMENTS[kind]?.color));

/** Round badge with an icon, for statuses shown over enemies. */
export const statusTex = (kind) =>
  tex(`status.${kind}`, 64, 64, (g) => {
    const bg = { burn: '#5a2412', poison: '#3a1d5a', chill: '#173a55', freeze: '#1d5f86', slow: '#173a55', loot: '#5a3b0c' }[kind] ?? '#333';
    g.fillStyle = bg;
    g.beginPath();
    g.arc(32, 32, 29, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 4;
    g.stroke();
    g.save();
    g.translate(8, 8);
    drawIcon(g, kind, 48);
    g.restore();
  });

// --- projectiles (white-ish shapes, tinted at runtime) -------------------------------

// Bold silhouettes with a dark outline and a white body: the body takes the
// element tint at runtime, the outline stays dark, so shots read on sand and grass.
const OUT = 'rgba(28,18,32,0.95)';
export const projTex = (shape) => {
  const genKey = `proj.${shape}`;
  if (generated.has(genKey)) return generated.get(genKey);
  return tex(`projshape2.${shape}`, 112, 112, (g) => {
    g.translate(56, 56);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = OUT;
    g.lineWidth = 6;
    const body = (x0, x1) => {
      const gr = g.createLinearGradient(x0, -20, x1, 20);
      gr.addColorStop(0, '#d6d6d6');
      gr.addColorStop(1, '#ffffff');
      return gr;
    };
    switch (shape) {
      case 'fire': {
        // teardrop flame pointing right (+x = direction of travel), white-hot core
        g.fillStyle = body(-40, 36);
        g.beginPath();
        g.moveTo(38, 0);
        g.bezierCurveTo(34, -26, -12, -28, -44, -6);
        g.bezierCurveTo(-30, -2, -30, 2, -44, 8);
        g.bezierCurveTo(-12, 28, 34, 26, 38, 0);
        g.closePath();
        g.stroke();
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(16, 0, 12, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'ice': {
        // a long crystal lance
        g.fillStyle = body(-44, 44);
        g.beginPath();
        g.moveTo(46, 0);
        g.lineTo(8, -13);
        g.lineTo(-44, 0);
        g.lineTo(8, 13);
        g.closePath();
        g.stroke();
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.95)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(38, 0);
        g.lineTo(-34, 0);
        g.stroke();
        break;
      }
      case 'poison': {
        // a dart: point, round body, tail fins, a drip behind
        g.fillStyle = body(-36, 40);
        g.beginPath();
        g.moveTo(42, 0);
        g.lineTo(16, -9);
        g.lineTo(-18, -9);
        g.lineTo(-34, -20);
        g.lineTo(-28, 0);
        g.lineTo(-34, 20);
        g.lineTo(-18, 9);
        g.lineTo(16, 9);
        g.closePath();
        g.stroke();
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(-44, 10, 5, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        break;
      }
      case 'earth': {
        g.fillStyle = body(-30, 30);
        g.beginPath();
        [
          [-28, 12],
          [-22, -18],
          [2, -30],
          [28, -18],
          [32, 10],
          [12, 28],
          [-14, 28],
        ].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.stroke();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.ellipse(-6, -10, 11, 6, -0.5, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'wind': {
        // a wide crescent blade, cutting edge forward (+x)
        g.fillStyle = body(-20, 40);
        g.beginPath();
        g.arc(-10, 0, 44, -1.15, 1.15);
        g.arc(-26, 0, 38, 0.95, -0.95, true);
        g.closePath();
        g.stroke();
        g.fill();
        break;
      }
      case 'metal': {
        // a four-point steel star (spins in flight)
        g.fillStyle = body(-30, 30);
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = i % 2 ? 11 : 34;
          g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.closePath();
        g.stroke();
        g.fill();
        g.fillStyle = OUT;
        g.beginPath();
        g.arc(0, 0, 5, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'nature': {
        // a leaf-shaped seed pointing right
        g.fillStyle = body(-30, 30);
        g.beginPath();
        g.moveTo(-32, 0);
        g.bezierCurveTo(-14, -26, 16, -24, 36, 0);
        g.bezierCurveTo(16, 24, -14, 26, -32, 0);
        g.closePath();
        g.stroke();
        g.fill();
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-26, 0);
        g.lineTo(28, 0);
        g.stroke();
        break;
      }
      case 'meteor': {
        g.fillStyle = body(-20, 34);
        g.beginPath();
        g.arc(8, 0, 28, 0, Math.PI * 2);
        g.stroke();
        g.fill();
        break;
      }
      default: {
        // pebble
        g.fillStyle = body(-16, 16);
        g.beginPath();
        g.arc(0, 0, 17, 0, Math.PI * 2);
        g.stroke();
        g.fill();
      }
    }
  });
};

// --- explosions: 8-frame sprite animations played at the point of contact -------------

const BOOM_FRAMES = 8;
const BOOM_PX = 128;
const rnd = (i, j) => hash01i(i * 131 + j * 7919);
function hash01i(n) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function drawBoom(g, kind, f) {
  const u = f / (BOOM_FRAMES - 1); // 0..1 through the animation
  const fade = 1 - Math.max(0, (u - 0.45) / 0.55); // holds, then fades
  g.translate(BOOM_PX / 2, BOOM_PX / 2);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const blob = (x, y, r, color, a = 1) => {
    g.globalAlpha = a;
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  };
  switch (kind) {
    case 'fire': {
      const r = 14 + 40 * Math.sqrt(u);
      if (u > 0.35) for (let i = 0; i < 6; i++) blob(Math.cos(i) * r * 0.55, Math.sin(i * 1.7) * r * 0.5, r * 0.42, '#5a4a52', 0.5 * fade); // smoke
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.3, '#ffe27a');
      gr.addColorStop(0.7, '#ff7a3d');
      gr.addColorStop(1, 'rgba(214,60,30,0)');
      g.globalAlpha = fade;
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      for (let i = 0; i < 10; i++) {
        const a = rnd(i, 1) * Math.PI * 2;
        const d = (16 + 44 * rnd(i, 2)) * u;
        blob(Math.cos(a) * d, Math.sin(a) * d - 6 * u, 3 * (1 - u) + 1, '#ffd36b', fade);
      }
      break;
    }
    case 'ice': {
      g.globalAlpha = fade;
      g.strokeStyle = '#cdeeff';
      g.lineWidth = 5 * (1 - u) + 1;
      g.beginPath();
      g.arc(0, 0, 10 + 44 * u, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
      if (u < 0.3) blob(0, 0, 22 * (1 - u * 2), '#ffffff', 0.9);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + rnd(i, 3) * 0.4;
        const d = 8 + 46 * Math.sqrt(u);
        const len = 13 * (1 - u * 0.6);
        g.save();
        g.translate(Math.cos(a) * d, Math.sin(a) * d);
        g.rotate(a);
        g.globalAlpha = fade;
        g.fillStyle = i % 2 ? '#7fd4ff' : '#e6f7ff';
        g.strokeStyle = '#2f6f9a';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(len, 0);
        g.lineTo(0, -len * 0.35);
        g.lineTo(-len * 0.6, 0);
        g.lineTo(0, len * 0.35);
        g.closePath();
        g.fill();
        g.stroke();
        g.restore();
      }
      g.globalAlpha = 1;
      break;
    }
    case 'lightning': {
      const flick = f % 2 ? 0.7 : 1;
      const R = 18 + 34 * u;
      g.globalAlpha = fade * flick;
      g.fillStyle = '#fff1a8';
      g.strokeStyle = '#c99a00';
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r = i % 2 ? R * 0.38 : R * (0.75 + 0.35 * rnd(i, f));
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.stroke();
      blob(0, 0, 10 * (1 - u) + 3, '#ffffff', fade);
      g.strokeStyle = '#ffe14d';
      g.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        const a = rnd(i, 9) * Math.PI * 2;
        const d0 = R * 0.9;
        const d1 = R * 1.25;
        g.beginPath();
        g.moveTo(Math.cos(a) * d0, Math.sin(a) * d0);
        g.lineTo(Math.cos(a + 0.2) * (d0 + d1) / 2, Math.sin(a + 0.2) * (d0 + d1) / 2);
        g.lineTo(Math.cos(a) * d1, Math.sin(a) * d1);
        g.stroke();
      }
      g.globalAlpha = 1;
      break;
    }
    case 'poison': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        const d = 6 + 18 * u;
        blob(Math.cos(a) * d, Math.sin(a) * d, 12 + 14 * u, i % 2 ? '#b46cff' : '#8446d4', 0.75 * fade);
      }
      blob(0, 0, 14 + 10 * u, '#d9b8ff', 0.8 * fade);
      for (let i = 0; i < 7; i++) {
        const x = (rnd(i, 4) - 0.5) * 60;
        const y = 20 - 60 * u * (0.5 + rnd(i, 5));
        g.globalAlpha = fade;
        g.strokeStyle = '#efe0ff';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, 3 + 3 * rnd(i, 6), 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
      break;
    }
    case 'earth': {
      g.globalAlpha = fade * 0.9;
      g.strokeStyle = '#e3c39a';
      g.lineWidth = 6 * (1 - u) + 1;
      g.beginPath();
      g.ellipse(0, 8, 14 + 48 * u, (14 + 48 * u) * 0.55, 0, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
      blob(0, 4, 14 + 26 * Math.sqrt(u), '#a98458', 0.75 * fade);
      blob(-8, -2, 10 + 18 * Math.sqrt(u), '#c9a57a', 0.7 * fade);
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI * (0.1 + 0.8 * rnd(i, 7)); // mostly upward
        const d = (18 + 40 * rnd(i, 8)) * u;
        const x = Math.cos(a) * d * 1.3;
        const y = Math.sin(a) * d + 60 * u * u; // falls back down
        const r = 5 + 4 * rnd(i, 9);
        g.save();
        g.translate(x, y);
        g.rotate(u * 6 + i);
        g.globalAlpha = fade;
        g.fillStyle = i % 2 ? '#c79a62' : '#8f6532';
        g.strokeStyle = OUT;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(r, 0);
        g.lineTo(r * 0.2, -r);
        g.lineTo(-r, -r * 0.3);
        g.lineTo(-r * 0.4, r * 0.9);
        g.closePath();
        g.fill();
        g.stroke();
        g.restore();
      }
      g.globalAlpha = 1;
      break;
    }
    case 'wind': {
      g.globalAlpha = fade;
      g.strokeStyle = '#bff7e6';
      g.lineWidth = 6 * (1 - u) + 2;
      for (let k = 0; k < 3; k++) {
        const r = 10 + 34 * u + k * 6;
        const a0 = u * 5 + (k * Math.PI * 2) / 3;
        g.beginPath();
        g.arc(0, 0, r, a0, a0 + 2.2);
        g.stroke();
      }
      g.strokeStyle = '#22a37f';
      g.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const r = 6 + 30 * u + k * 6;
        const a0 = u * 5 + (k * Math.PI * 2) / 3 + 0.4;
        g.beginPath();
        g.arc(0, 0, r, a0, a0 + 1.6);
        g.stroke();
      }
      g.globalAlpha = 1;
      break;
    }
    case 'metal': {
      const s = (1 - u) * 1.2 + 0.2;
      g.globalAlpha = fade;
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#6f7d8f';
      g.lineWidth = 2.5;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const r = (i % 2 ? 7 : 40) * s;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.stroke();
      g.strokeStyle = '#e8edf3';
      g.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        const a = rnd(i, 11) * Math.PI * 2;
        const d0 = 10 + 30 * u;
        const d1 = d0 + 14 * (1 - u) + 4;
        g.beginPath();
        g.moveTo(Math.cos(a) * d0, Math.sin(a) * d0);
        g.lineTo(Math.cos(a) * d1, Math.sin(a) * d1);
        g.stroke();
      }
      if (u > 0.3) {
        g.fillStyle = '#ffd34a';
        g.strokeStyle = '#a8660f';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(14, -16 - 20 * u, 6, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.globalAlpha = 1;
      break;
    }
    case 'nature': {
      blob(0, 0, 10 * (1 - u) + 4, '#fffbd0', fade);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + u * 1.5;
        const d = 6 + 40 * Math.sqrt(u);
        g.save();
        g.translate(Math.cos(a) * d, Math.sin(a) * d);
        g.rotate(a + u * 3);
        g.globalAlpha = fade;
        g.fillStyle = i % 3 === 0 ? '#ff9ccf' : '#4cd964';
        g.strokeStyle = '#1f7a3a';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.restore();
      }
      g.globalAlpha = 1;
      break;
    }
    default: {
      // plain: a small dust puff
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const d = 4 + 16 * u;
        blob(Math.cos(a) * d, Math.sin(a) * d, 8 + 8 * u, '#e9dcc0', 0.8 * fade);
      }
      blob(0, 0, 10, '#ffffff', 0.6 * fade);
    }
  }
}

/** The 8 frames of an explosion (cached per kind). */
export function boomFrames(kind) {
  const out = [];
  for (let f = 0; f < BOOM_FRAMES; f++) out.push(tex(`boom.${kind}.${f}`, BOOM_PX, BOOM_PX, (g) => drawBoom(g, kind, f)));
  return out;
}

// --- blocks (2048 tiles) -----------------------------------------------------------------

export const BLOCK_PX = 160;

/** Tile body with number, element icons and class pips. Cached per tier+class. */
export function blockTex(tier, cls) {
  const els = [cls.element, cls.fusion, cls.ultimate].filter(Boolean);
  const key = `block.${tier}.${els.join('+')}`;
  return tex(key, BLOCK_PX, BLOCK_PX, (g, W) => {
    const pad = 8;
    const size = W - pad * 2;
    const r = 26;
    const base = TIER_COLORS[Math.min(tier, TIER_COLORS.length - 1)];
    // below 16 a block is dormant: a pale version of its die colour until its element awakens
    const dormant = tier < 4;
    // a fusion (without an ultimate yet) is one unique element: one solid colour of its own
    const fu = els.length === 2 ? fusionOf(cls) : null;
    const elColors = fu ? [fu.color] : els.map((e) => (dormant ? lightenHex(ELEMENTS[e].color, 0.4) : ELEMENTS[e].color));
    // drop shadow
    g.fillStyle = 'rgba(30,18,40,0.35)';
    g.beginPath();
    g.roundRect(pad + 2, pad + 8, size, size, r);
    g.fill();
    // body: unclassed blocks use the tier colour; classed blocks take their
    // element colour (Random Dice: a die's colour is its type); fusions split
    // diagonally, ultimates get three bands. The number shows the tier.
    g.save();
    g.beginPath();
    g.roundRect(pad, pad, size, size, r);
    g.clip();
    if (elColors.length <= 1) {
      const c0 = elColors[0] ?? base;
      const gr = g.createLinearGradient(pad, pad, pad + size * 0.6, pad + size);
      gr.addColorStop(0, shade(c0, 0.32));
      gr.addColorStop(0.6, c0);
      gr.addColorStop(1, shade(c0, -0.22));
      g.fillStyle = gr;
      g.fillRect(pad, pad, size, size);
    } else {
      const n = elColors.length;
      for (let i = 0; i < n; i++) {
        // diagonal bands from top-left to bottom-right
        const a0 = (i / n) * 2 * size;
        const a1 = ((i + 1) / n) * 2 * size;
        const gr = g.createLinearGradient(pad, pad, pad + size, pad + size);
        gr.addColorStop(0, shade(elColors[i], 0.25));
        gr.addColorStop(1, shade(elColors[i], -0.18));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(pad + a0, pad);
        g.lineTo(pad + a1, pad);
        g.lineTo(pad + a1 - size, pad + size);
        g.lineTo(pad + a0 - size, pad + size);
        g.closePath();
        g.fill();
      }
      // soft seam highlights
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 3;
      for (let i = 1; i < n; i++) {
        const a = (i / n) * 2 * size;
        g.beginPath();
        g.moveTo(pad + a, pad);
        g.lineTo(pad + a - size, pad + size);
        g.stroke();
      }
    }
    g.restore();
    // bevel: bottom darker lip + top highlight
    g.save();
    g.beginPath();
    g.roundRect(pad, pad, size, size, r);
    g.clip();
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(pad, pad + size - 14, size, 14);
    const hl = g.createLinearGradient(0, pad, 0, pad + size * 0.5);
    hl.addColorStop(0, 'rgba(255,255,255,0.55)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    g.beginPath();
    g.roundRect(pad + 8, pad + 6, size - 16, size * 0.42, r - 8);
    g.fill();
    g.restore();
    // border
    g.lineWidth = 5;
    g.strokeStyle = els.length === 3 ? '#ffe27a' : 'rgba(40,24,30,0.55)';
    g.beginPath();
    g.roundRect(pad, pad, size, size, r);
    g.stroke();
    // element icons along the top (white badge so they read on their own colour)
    const iconS = els.length === 3 ? 34 : 40;
    const rowW = els.length * (iconS + 2);
    els.forEach((e, i) => {
      const ix = W / 2 - rowW / 2 + i * (iconS + 2);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.arc(ix + iconS / 2, pad + 8 + iconS / 2, iconS * 0.46, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.translate(ix, pad + 8);
      drawIcon(g, e, iconS, ELEMENTS[e].color);
      g.restore();
    });
    // number
    const text = tierValue(tier).toLocaleString('en-US').replace(/,/g, '');
    const px = (els.length ? [0, 68, 68, 62, 52, 42, 36] : [0, 78, 78, 70, 58, 46, 40])[Math.min(text.length, 6)];
    g.font = `800 ${px}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = px * 0.2;
    g.strokeStyle = 'rgba(45,28,35,0.85)';
    const cy = W / 2 + (els.length ? 18 : 4);
    g.strokeText(text, W / 2, cy);
    g.fillStyle = '#ffffff';
    g.fillText(text, W / 2, cy);
  });
}

// --- enemies (procedural critters; replaced by generated sprites when available) ---------

const ACCESSORY = {
  pixie: 'halo',
  axolotlFairy: 'gills',
  griffinChick: 'antenna',
  leafSprite: 'leaf',
  hoodedFlier: 'hood',
  flameSprite: 'flame',
  ninja: 'band',
  armoredSoldier: 'helmet',
  ringMonk: 'monk',
  kiteMinion: 'kite',
  villager: 'pitchfork',
  wyvern: 'horns',
  phoenix: 'flame',
  redDragon: 'horns',
  elfRuler: 'crown',
  kiteNinja: 'crown',
  dragonRider: 'crown',
};

export const ENEMY_PX = 128;

export function enemyTex(type) {
  const genKey = `enemy.${type}`;
  if (generated.has(genKey)) return generated.get(genKey);
  return tex(genKey, ENEMY_PX, ENEMY_PX, (g, W) => {
    const def = ENEMY_TYPES[type];
    const c = W / 2;
    const R = W * 0.3;
    const col = def.color;
    const outline = 'rgba(40,24,30,0.9)';
    g.lineJoin = 'round';
    g.lineCap = 'round';
    // wings behind
    if (def.flying) {
      const wing = ['wyvern', 'redDragon', 'phoenix', 'dragonRider', 'kiteNinja'].includes(type) ? shade(col, -0.1) : 'rgba(230,245,255,0.95)';
      for (const side of [-1, 1]) {
        g.save();
        g.translate(c + side * R * 0.9, c - R * 0.15);
        g.rotate(side * -0.35);
        g.beginPath();
        g.ellipse(side * R * 0.35, -R * 0.1, R * 0.62, R * 0.36, side * 0.25, 0, Math.PI * 2);
        g.fillStyle = wing;
        g.strokeStyle = outline;
        g.lineWidth = 4;
        g.fill();
        g.stroke();
        g.restore();
      }
    }
    // body
    const gr = g.createRadialGradient(c - R * 0.35, c - R * 0.45, R * 0.1, c, c, R * 1.1);
    gr.addColorStop(0, shade(col, 0.45));
    gr.addColorStop(0.6, col);
    gr.addColorStop(1, shade(col, -0.25));
    g.fillStyle = gr;
    g.strokeStyle = outline;
    g.lineWidth = 5;
    g.beginPath();
    g.ellipse(c, c + R * 0.08, R, R * 0.92, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    // belly
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(c, c + R * 0.38, R * 0.55, R * 0.38, 0, 0, Math.PI * 2);
    g.fill();
    // eyes
    for (const side of [-1, 1]) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(c + side * R * 0.36, c - R * 0.05, R * 0.22, R * 0.25, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = outline;
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#2b2230';
      g.beginPath();
      g.arc(c + side * R * 0.38, c - R * 0.02, R * 0.12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(c + side * R * 0.33, c - R * 0.08, R * 0.04, 0, Math.PI * 2);
      g.fill();
    }
    // mouth + cheeks
    g.strokeStyle = outline;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(c, c + R * 0.2, R * 0.12, 0.2, Math.PI - 0.2);
    g.stroke();
    g.fillStyle = 'rgba(255,120,150,0.45)';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.ellipse(c + side * R * 0.62, c + R * 0.18, R * 0.12, R * 0.08, 0, 0, Math.PI * 2);
      g.fill();
    }
    // accessory
    g.lineWidth = 4;
    g.strokeStyle = outline;
    const top = c - R * 0.9;
    switch (ACCESSORY[type]) {
      case 'halo':
        g.strokeStyle = '#ffe08a';
        g.lineWidth = 6;
        g.beginPath();
        g.ellipse(c, top - 6, R * 0.5, R * 0.16, 0, 0, Math.PI * 2);
        g.stroke();
        break;
      case 'antenna':
        g.beginPath();
        g.moveTo(c, top + 4);
        g.quadraticCurveTo(c + 8, top - 14, c + 14, top - 18);
        g.stroke();
        g.fillStyle = '#ff5a5a';
        g.beginPath();
        g.arc(c + 14, top - 18, 6, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        break;
      case 'leaf':
        g.fillStyle = '#4fae4a';
        g.beginPath();
        g.ellipse(c + 6, top - 4, R * 0.25, R * 0.5, 0.6, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        break;
      case 'gills':
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            g.fillStyle = '#ff8fb1';
            g.beginPath();
            g.ellipse(c + side * (R + 4), c - R * 0.3 + i * 10, 9, 4, side * 0.4, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          }
        }
        break;
      case 'hood':
        g.fillStyle = '#c9a23f';
        g.beginPath();
        g.moveTo(c - R * 0.95, c - R * 0.1);
        g.quadraticCurveTo(c, top - R * 0.9, c + R * 0.95, c - R * 0.1);
        g.quadraticCurveTo(c, top + R * 0.25, c - R * 0.95, c - R * 0.1);
        g.fill();
        g.stroke();
        break;
      case 'flame':
        g.save();
        g.translate(c - 18, top - 26);
        drawIcon(g, 'fire', 36, '#ffd36b');
        g.restore();
        break;
      case 'band':
        g.fillStyle = '#d84a4a';
        g.fillRect(c - R, c - R * 0.42, R * 2, R * 0.2);
        g.strokeRect(c - R, c - R * 0.42, R * 2, R * 0.2);
        break;
      case 'helmet':
        g.fillStyle = '#c9d2e0';
        g.beginPath();
        g.arc(c, c - R * 0.15, R * 0.98, Math.PI, 0);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = '#e04848';
        g.fillRect(c - 4, top - 14, 8, 16);
        break;
      case 'monk':
        g.strokeStyle = '#ffd76b';
        g.lineWidth = 6;
        g.beginPath();
        g.arc(c + R + 6, c + 6, 12, 0, Math.PI * 2);
        g.stroke();
        break;
      case 'kite':
        g.fillStyle = '#ffd36b';
        g.beginPath();
        g.moveTo(c, top - 22);
        g.lineTo(c + 14, top - 6);
        g.lineTo(c, top + 8);
        g.lineTo(c - 14, top - 6);
        g.closePath();
        g.fill();
        g.stroke();
        break;
      case 'pitchfork':
        g.strokeStyle = '#8a6a43';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(c + R + 4, c + R);
        g.lineTo(c + R + 4, top - 10);
        g.moveTo(c + R - 6, top - 4);
        g.lineTo(c + R - 6, top - 14);
        g.moveTo(c + R + 14, top - 4);
        g.lineTo(c + R + 14, top - 14);
        g.moveTo(c + R - 6, top - 4);
        g.lineTo(c + R + 14, top - 4);
        g.stroke();
        break;
      case 'horns':
        for (const side of [-1, 1]) {
          g.fillStyle = '#f2e6d0';
          g.beginPath();
          g.moveTo(c + side * R * 0.3, top + 8);
          g.lineTo(c + side * R * 0.65, top - 16);
          g.lineTo(c + side * R * 0.55, top + 12);
          g.closePath();
          g.fill();
          g.stroke();
        }
        break;
      case 'crown':
        g.fillStyle = '#ffd34d';
        g.beginPath();
        g.moveTo(c - R * 0.55, top + 6);
        for (let i = 0; i <= 4; i++) {
          const x = c - R * 0.55 + (R * 1.1 * i) / 4;
          g.lineTo(x, top - (i % 2 ? 4 : 20));
        }
        g.lineTo(c + R * 0.55, top + 6);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = '#ff5a8a';
        g.beginPath();
        g.arc(c, top - 4, 4, 0, Math.PI * 2);
        g.fill();
        break;
      default:
        break;
    }
  });
}

// --- scenery ----------------------------------------------------------------------------------

export const castleTex = () =>
  tex('castle', 160, 160, (g) => {
    const outline = 'rgba(40,24,30,0.9)';
    g.lineJoin = 'round';
    g.lineWidth = 5;
    g.strokeStyle = outline;
    const stone = '#e6dccd';
    const dark = '#b8a894';
    // towers
    for (const x of [22, 106]) {
      g.fillStyle = stone;
      g.fillRect(x, 50, 34, 90);
      g.strokeRect(x, 50, 34, 90);
      g.fillStyle = '#d06a5a';
      g.beginPath();
      g.moveTo(x - 6, 52);
      g.lineTo(x + 17, 14);
      g.lineTo(x + 40, 52);
      g.closePath();
      g.fill();
      g.stroke();
    }
    // keep
    g.fillStyle = stone;
    g.fillRect(44, 72, 72, 70);
    g.strokeRect(44, 72, 72, 70);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = dark;
      g.fillRect(46 + i * 18, 62, 12, 12);
      g.strokeRect(46 + i * 18, 62, 12, 12);
    }
    // gate
    g.fillStyle = '#6b4a33';
    g.beginPath();
    g.moveTo(66, 142);
    g.lineTo(66, 112);
    g.arc(80, 112, 14, Math.PI, 0);
    g.lineTo(94, 142);
    g.closePath();
    g.fill();
    g.stroke();
    // flag
    g.strokeStyle = outline;
    g.beginPath();
    g.moveTo(80, 72);
    g.lineTo(80, 30);
    g.stroke();
    g.fillStyle = '#ff8fb0';
    g.beginPath();
    g.moveTo(80, 30);
    g.lineTo(104, 38);
    g.lineTo(80, 46);
    g.closePath();
    g.fill();
    g.stroke();
  });

export const portalTex = () =>
  tex('portal', 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 60);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.3, 'rgba(190,150,255,0.9)');
    gr.addColorStop(0.75, 'rgba(110,60,220,0.8)');
    gr.addColorStop(1, 'rgba(60,20,140,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(64, 64, 60, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(64, 64, 24 + i * 12, i, i + 2.2);
      g.stroke();
    }
  });
