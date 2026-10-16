// The code-drawn attack sprites (src/art/attack-vfx.js VFX_PIECES): one fallback for every
// generated vfx.<element>.<piece>, drawn when the generated sprite is missing, and the sticker kit
// they share with textures.js (the ping ring, the puddle, the defeat puff, the link's core). Pure
// canvas-2D drawing (no Pixi, no DOM), so the tests can run every drawing.
//
// They follow the generated sheets' brief: solid sticker shapes with a thick plum outline, flat
// fills and one cel tone, no glow. Bodies are cream-white with a grey cel tone (the renderer tints
// them with the element or fusion colour); bits, bursts and decals are in full colour.
// Directional pieces point to the right; decals are seen from above.

/** A hash of an integer to 0..1 (seeded shapes: blobs, bursts, explosions). */
export function hash01i(n) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const INK = '#2B1D2E';
export const CREAM = '#FFFAF2';
export const CEL = '#D9D2C7';

/**
 * A sticker shape: the outline first (twice as wide, under the fill, so overlapping lobes get one
 * clean outer edge), then the fill, then the cel tone where `celPath` covers it (clipped).
 */
export function sticker(g, path, fill, { line = 4, cel = null, celPath = null, ink = INK } = {}) {
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (line > 0) {
    g.beginPath();
    path();
    g.strokeStyle = ink;
    g.lineWidth = line * 2;
    g.stroke();
  }
  g.beginPath();
  path();
  g.fillStyle = fill;
  g.fill();
  if (cel && celPath) {
    g.save();
    g.beginPath();
    path();
    g.clip();
    g.beginPath();
    celPath();
    g.fillStyle = cel;
    g.fill();
    g.restore();
  }
}
export const poly = (g, pts) => pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
/** A star of `n` points between radii r0 (inner) and r1, rotated by a0. */
export const starPts = (cx, cy, n, r0, r1, a0 = -Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => {
  const a = a0 + (i * Math.PI) / n;
  const r = i % 2 ? r0 : r1;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});
/** A wobbly blob: radius r with a seeded ripple (decals, splats). */
export const blobPts = (cx, cy, r, n, amp, seed, sy = 1) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  const k = 1 + amp * (hash01i(seed * 97 + i) - 0.5) * 2;
  return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * sy];
});
/** A closed smooth curve through points (quadratic midpoints): soft organic outlines. */
export function smooth(g, pts) {
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const n = pts.length;
  const m0 = mid(pts[n - 1], pts[0]);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  g.closePath();
}
export const drop = (g, cx, cy, w, h) => {
  // a drop pointing up: round bottom, pointed top
  g.moveTo(cx, cy - h / 2);
  g.bezierCurveTo(cx + w * 0.15, cy - h * 0.2, cx + w / 2, cy, cx + w / 2, cy + h * 0.16);
  g.arc(cx, cy + h * 0.16, w / 2, 0, Math.PI);
  g.bezierCurveTo(cx - w / 2, cy, cx - w * 0.15, cy - h * 0.2, cx, cy - h / 2);
  g.closePath();
};

// the code-drawn bolt link's zigzag: its top edge left to right, its bottom edge right to left
export const LINK_TOP = [[4, 14], [44, 6], [40, 16], [84, 8], [80, 18], [124, 12]];
export const LINK_BOT = [[124, 26], [76, 32], [80, 22], [36, 30], [40, 20], [4, 28]];

/**
 * Code-drawn fallbacks for every generated attack sprite: id → [width, height, draw(g, w, h)].
 * Canvas sizes keep each piece's aspect (a generated sprite is trimmed to its shape).
 */
export const VFX_FALLBACK = {
  'vfx.fire.tongue': [128, 72, (g) => {
    const path = () => {
      g.moveTo(38, 9);
      g.bezierCurveTo(62, 7, 82, 12, 98, 17);
      g.quadraticCurveTo(111, 14, 120, 19);
      g.quadraticCurveTo(106, 25, 97, 30);
      g.quadraticCurveTo(111, 33, 122, 37);
      g.quadraticCurveTo(107, 42, 97, 44);
      g.quadraticCurveTo(110, 50, 119, 56);
      g.quadraticCurveTo(98, 60, 78, 60);
      g.bezierCurveTo(58, 64, 42, 64, 32, 62);
      g.bezierCurveTo(2, 58, 4, 12, 38, 9);
      g.closePath();
    };
    sticker(g, path, CREAM, { cel: CEL, celPath: () => g.rect(0, 42, 128, 30) });
    g.fillStyle = CEL;
    g.beginPath();
    g.ellipse(34, 30, 9, 6, -0.3, 0, Math.PI * 2); // a cel fleck on the round base
    g.fill();
  }],
  'vfx.fire.ember': [48, 48, (g) => {
    sticker(g, () => drop(g, 24, 22, 26, 36), '#F2662D', { line: 3, cel: '#C8352B', celPath: () => g.rect(0, 30, 48, 18) });
    g.beginPath();
    drop(g, 24, 28, 12, 16);
    g.fillStyle = '#FFD24A';
    g.fill();
  }],
  'vfx.fire.smoke': [64, 64, (g) => {
    const path = () => {
      g.arc(22, 38, 14, 0, Math.PI * 2);
      g.moveTo(52, 26);
      g.arc(36, 26, 16, 0, Math.PI * 2);
      g.moveTo(57, 40);
      g.arc(44, 40, 13, 0, Math.PI * 2);
    };
    sticker(g, path, '#8A8082', { line: 3, cel: '#5A5052', celPath: () => g.rect(0, 40, 64, 24) });
    g.fillStyle = '#B5ADAE';
    g.beginPath();
    g.ellipse(31, 20, 6, 4, -0.4, 0, Math.PI * 2);
    g.fill();
  }],
  'vfx.fire.burst': [128, 128, (g) => {
    const petals = (r0, r1) => () => smooth(g, starPts(64, 64, 5, r0, r1));
    sticker(g, petals(26, 60), '#F2662D', { cel: '#C8352B', celPath: () => g.rect(0, 80, 128, 48) });
    sticker(g, petals(14, 34), '#FFD24A', { line: 0 });
  }],
  'vfx.fire.scorch': [128, 128, (g) => {
    g.globalAlpha = 0.9;
    g.beginPath();
    smooth(g, blobPts(64, 64, 50, 14, 0.22, 3));
    g.fillStyle = '#3B2A26';
    g.fill();
    g.beginPath();
    smooth(g, blobPts(62, 66, 30, 10, 0.25, 7));
    g.fillStyle = '#241819';
    g.fill();
    g.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const a = hash01i(i + 11) * Math.PI * 2;
      g.beginPath();
      g.arc(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44, 3 + 2 * hash01i(i + 3), 0, Math.PI * 2);
      g.fillStyle = i % 2 ? '#FF9E3D' : '#F2662D';
      g.fill();
    }
  }],
  'vfx.ice.harpoon': [160, 48, (g) => {
    const path = () => poly(g, [[153, 24], [118, 8], [104, 18], [26, 18], [10, 9], [16, 24], [10, 39], [26, 30], [104, 30], [118, 40]]);
    sticker(g, () => {
      path();
      g.closePath();
    }, CREAM, { cel: CEL, celPath: () => g.rect(0, 25, 160, 23) });
    g.strokeStyle = INK;
    g.lineWidth = 2.5;
    g.beginPath();
    poly(g, [[118, 9], [130, 24], [118, 39]]); // the head's facet
    g.stroke();
  }],
  'vfx.ice.shard': [48, 48, (g) => {
    const pts = [[42, 6], [30, 30], [8, 42], [20, 20]];
    sticker(g, () => {
      poly(g, pts);
      g.closePath();
    }, '#9BE7F5', { line: 3, cel: '#4FB3D9', celPath: () => poly(g, [[42, 6], [30, 30], [8, 42]]) });
    g.fillStyle = '#F7FDFF';
    g.beginPath();
    poly(g, [[38, 10], [22, 22], [26, 26]]);
    g.fill();
  }],
  'vfx.ice.block': [96, 96, (g) => {
    sticker(g, () => g.roundRect(10, 16, 76, 70, 12), '#DDF7FC', { cel: '#9BE7F5', celPath: () => g.rect(58, 0, 40, 96) });
    sticker(g, () => g.roundRect(14, 10, 68, 22, 8), '#F7FDFF', { line: 3 }); // the top face
    g.strokeStyle = '#4FB3D9';
    g.lineWidth = 2.5;
    g.beginPath();
    poly(g, [[30, 44], [40, 54], [36, 66]]);
    poly(g, [[62, 40], [56, 52]]);
    g.stroke();
    g.strokeStyle = '#FFFFFF';
    g.lineWidth = 4;
    g.beginPath();
    poly(g, [[20, 40], [20, 62]]);
    g.stroke();
  }],
  'vfx.ice.burst': [128, 128, (g) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const r0 = 22 + 6 * hash01i(i + 5);
      const r1 = 50 + 6 * hash01i(i + 9);
      const c = Math.cos(a);
      const s = Math.sin(a);
      const w = 7;
      const pts = [[64 + c * r1, 64 + s * r1], [64 + c * (r0 + 14) - s * w, 64 + s * (r0 + 14) + c * w], [64 + c * r0, 64 + s * r0], [64 + c * (r0 + 14) + s * w, 64 + s * (r0 + 14) - c * w]];
      sticker(g, () => {
        poly(g, pts);
        g.closePath();
      }, i % 2 ? '#9BE7F5' : '#DDF7FC', { line: 3 });
    }
  }],
  'vfx.ice.frost': [128, 128, (g) => {
    g.globalAlpha = 0.9;
    g.beginPath();
    smooth(g, blobPts(64, 64, 52, 12, 0.2, 21));
    g.fillStyle = '#DDF7FC';
    g.fill();
    g.beginPath();
    smooth(g, blobPts(64, 64, 34, 9, 0.25, 23));
    g.fillStyle = '#9BE7F5';
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = '#FFFFFF';
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (const [x, y, r] of [[48, 50, 10], [80, 72, 8], [70, 42, 6]]) {
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.stroke();
    }
  }],
  'vfx.lightning.link': [128, 40, (g) => {
    sticker(g, () => {
      poly(g, [...LINK_TOP, ...LINK_BOT]);
      g.closePath();
    }, CREAM, { cel: CEL, celPath: () => g.rect(0, 22, 128, 18) });
  }],
  'vfx.lightning.spark': [48, 48, (g) => {
    sticker(g, () => {
      poly(g, starPts(24, 24, 4, 6, 21));
      g.closePath();
    }, '#FFE14D', { line: 3 });
    g.fillStyle = '#FFF7C2';
    g.beginPath();
    g.arc(24, 24, 5, 0, Math.PI * 2);
    g.fill();
  }],
  'vfx.lightning.burst': [128, 128, (g) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.save();
      g.translate(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44);
      g.rotate(a);
      sticker(g, () => {
        poly(g, [[-14, -3], [-2, -7], [-4, -1], [14, -4], [2, 6], [4, 1], [-14, 5]]);
        g.closePath();
      }, i % 2 ? '#FFE14D' : '#FFF7C2', { line: 3 });
      g.restore();
    }
  }],
  'vfx.poison.glob': [96, 72, (g) => {
    const path = () => {
      g.moveTo(8, 38);
      g.bezierCurveTo(18, 30, 26, 24, 40, 18);
      g.bezierCurveTo(52, 8, 82, 10, 88, 32);
      g.bezierCurveTo(94, 52, 74, 66, 54, 62);
      g.bezierCurveTo(40, 60, 30, 50, 22, 46);
      g.quadraticCurveTo(12, 44, 8, 38);
      g.closePath();
    };
    sticker(g, path, CREAM, { cel: CEL, celPath: () => g.rect(0, 46, 96, 26) });
    g.fillStyle = CEL;
    g.beginPath();
    g.ellipse(66, 26, 8, 5, -0.4, 0, Math.PI * 2);
    g.fill();
  }],
  'vfx.poison.drip': [40, 48, (g) => {
    sticker(g, () => drop(g, 20, 24, 24, 36), '#8FE53A', { line: 3, cel: '#5DA62A', celPath: () => g.rect(0, 32, 40, 16) });
    g.fillStyle = '#D8FF7A';
    g.beginPath();
    g.ellipse(15, 26, 3, 5, 0.3, 0, Math.PI * 2);
    g.fill();
  }],
  'vfx.poison.bubble': [40, 40, (g) => {
    sticker(g, () => g.arc(20, 20, 15, 0, Math.PI * 2), '#8FE53A', { line: 3, cel: '#5DA62A', celPath: () => g.rect(0, 24, 40, 16) });
    g.fillStyle = '#FFFFFF';
    g.beginPath();
    g.ellipse(14, 14, 4, 3, -0.6, 0, Math.PI * 2);
    g.fill();
  }],
  'vfx.poison.splat': [128, 128, (g) => {
    sticker(g, () => smooth(g, blobPts(64, 64, 40, 12, 0.28, 31)), '#8FE53A', { line: 3, cel: '#5DA62A', celPath: () => smooth(g, blobPts(66, 70, 24, 9, 0.3, 33)) });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + hash01i(i + 41);
      const r = 44 + 8 * hash01i(i + 43);
      sticker(g, () => g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 4 + 3 * hash01i(i + 47), 0, Math.PI * 2), '#8FE53A', { line: 2.5 });
    }
    g.fillStyle = '#D8FF7A';
    g.beginPath();
    g.ellipse(52, 50, 9, 5, -0.5, 0, Math.PI * 2);
    g.fill();
  }],
  'vfx.earth.pebble': [40, 40, (g) => {
    const path = () => smooth(g, blobPts(20, 21, 14, 7, 0.14, 51));
    sticker(g, path, '#9C8268', { line: 3, cel: '#6B5848', celPath: () => g.rect(0, 25, 40, 15) });
    g.fillStyle = '#C9AF8C';
    g.beginPath();
    g.ellipse(17, 15, 6, 3.5, -0.3, 0, Math.PI * 2);
    g.fill();
  }],
  'vfx.earth.dust': [64, 64, (g) => {
    const path = () => {
      g.arc(22, 38, 14, 0, Math.PI * 2);
      g.moveTo(52, 26);
      g.arc(36, 26, 16, 0, Math.PI * 2);
      g.moveTo(57, 40);
      g.arc(44, 40, 13, 0, Math.PI * 2);
    };
    sticker(g, path, '#EADBC0', { line: 3, cel: '#C9AF8C', celPath: () => g.rect(0, 40, 64, 24) });
  }],
  'vfx.earth.stars': [96, 56, (g) => {
    for (const [x, y, r] of [[18, 32, 12], [48, 20, 14], [78, 32, 12]]) {
      sticker(g, () => {
        poly(g, starPts(x, y, 5, r * 0.45, r));
        g.closePath();
      }, '#EADBC0', { line: 3, cel: '#C9AF8C', celPath: () => g.rect(0, y + 2, 96, 30) });
    }
  }],
  'vfx.earth.crack': [160, 56, (g) => {
    const main = [[6, 30], [26, 24], [40, 32], [58, 22], [74, 30], [92, 20], [110, 30], [128, 24], [154, 28]];
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = '#3B3029';
    g.lineWidth = 7;
    g.beginPath();
    poly(g, main);
    poly(g, [[58, 22], [64, 10]]);
    poly(g, [[92, 20], [100, 42]]);
    poly(g, [[26, 24], [22, 40]]);
    g.stroke();
    g.strokeStyle = '#6B5848';
    g.lineWidth = 2.5;
    g.beginPath();
    poly(g, main.map(([x, y]) => [x, y - 3]));
    g.stroke();
    for (const [x, y, r] of [[46, 44, 4], [120, 12, 3.5], [140, 42, 4]]) sticker(g, () => g.arc(x, y, r, 0, Math.PI * 2), '#9C8268', { line: 2 });
  }],
  'vfx.wind.swirl': [160, 80, (g) => {
    // a thick spiral stroke at the right with a tail streaming left: outline, then fill, then cel
    const path = () => {
      g.moveTo(8, 40);
      g.bezierCurveTo(50, 46, 84, 64, 116, 62);
      g.bezierCurveTo(146, 60, 150, 22, 124, 16);
      g.bezierCurveTo(102, 12, 92, 40, 112, 44);
      g.quadraticCurveTo(126, 46, 126, 34);
    };
    g.lineJoin = 'round';
    g.lineCap = 'round';
    for (const [w, c] of [[17, INK], [11, CREAM]]) {
      g.beginPath();
      path();
      g.strokeStyle = c;
      g.lineWidth = w;
      g.stroke();
    }
    g.beginPath();
    g.moveTo(40, 47);
    g.bezierCurveTo(70, 56, 92, 66, 118, 64);
    g.strokeStyle = CEL;
    g.lineWidth = 4;
    g.stroke();
  }],
  'vfx.wind.feather': [56, 56, (g) => {
    g.save();
    g.translate(28, 28);
    g.rotate(-Math.PI / 4);
    sticker(g, () => g.ellipse(0, 0, 23, 10, 0, 0, Math.PI * 2), '#9FE6D2', { line: 3, cel: '#D8FAF0', celPath: () => g.rect(-30, -14, 60, 13) });
    g.strokeStyle = INK;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-26, 0);
    g.lineTo(20, 0);
    g.stroke();
    g.restore();
  }],
  'vfx.wind.streak': [160, 48, (g) => {
    g.globalAlpha = 0.9;
    g.beginPath();
    g.moveTo(10, 24);
    g.bezierCurveTo(40, 8, 120, 10, 154, 20);
    g.bezierCurveTo(156, 26, 154, 30, 150, 32);
    g.bezierCurveTo(120, 38, 40, 40, 10, 24);
    g.closePath();
    g.fillStyle = '#D8FAF0';
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = '#56B8A8';
    g.lineWidth = 3.5;
    g.lineCap = 'round';
    g.beginPath();
    for (const [x0, x1, y] of [[30, 90, 20], [50, 130, 26], [24, 76, 31]]) {
      g.moveTo(x0, y);
      g.lineTo(x1, y);
    }
    g.stroke();
  }],
  'vfx.metal.slash': [112, 112, (g) => {
    for (let k = 0; k < 3; k++) {
      const o = (k - 1) * 22;
      const path = () => {
        g.moveTo(14 + o, 18 - o * 0.4);
        g.quadraticCurveTo(70 + o * 0.6, 34 - o * 0.6, 98 + o * 0.4, 94 - o);
        g.quadraticCurveTo(60 + o * 0.6, 44 - o * 0.6, 14 + o, 18 - o * 0.4);
        g.closePath();
      };
      sticker(g, path, CREAM, { line: 3.5, cel: CEL, celPath: () => g.rect(70, 0, 42, 112) });
    }
  }],
  'vfx.metal.glint': [48, 48, (g) => {
    sticker(g, () => {
      poly(g, starPts(24, 24, 4, 5, 21, 0));
      g.closePath();
    }, '#F7BE1E', { line: 3, cel: '#D99A16', celPath: () => g.rect(24, 24, 24, 24) });
    g.fillStyle = '#FFF7D1';
    g.beginPath();
    g.arc(24, 24, 4.5, 0, Math.PI * 2);
    g.fill();
  }],
  'vfx.nature.arc': [128, 128, (g) => {
    // a thin quarter ring of vine centred on the bottom-right corner, bottom-left to top-right (anchor 1, 1)
    const R0 = 100;
    const R1 = 107;
    const a0 = Math.PI + 0.04;
    const a1 = Math.PI * 1.5 - 0.04; // end caps inside the canvas, so they keep their outline
    const band = () => {
      g.arc(128, 128, R1, a0, a1);
      g.arc(128, 128, R0, a1, a0, true);
      g.closePath();
    };
    for (let i = 0; i < 7; i++) {
      // thorns first: the vine's outline crosses their bases
      const a = Math.PI + ((i + 0.5) / 7) * (Math.PI / 2);
      const c = Math.cos(a);
      const s = Math.sin(a);
      const out = i % 2 ? R1 + 8 : R0 - 7; // thorns on both sides, alternating
      const base = i % 2 ? R1 - 1 : R0 + 1;
      const t = [[128 + c * base - s * 3.5, 128 + s * base + c * 3.5], [128 + c * out, 128 + s * out], [128 + c * base + s * 3.5, 128 + s * base - c * 3.5]];
      sticker(g, () => {
        poly(g, t);
        g.closePath();
      }, CREAM, { line: 2 });
    }
    sticker(g, band, CREAM, { line: 2.5, cel: CEL, celPath: () => g.arc(128, 128, R0 + 3, 0, Math.PI * 2) });
    for (const a of [Math.PI * 1.2, Math.PI * 1.38]) {
      const x = 128 + Math.cos(a) * (R1 + 3);
      const y = 128 + Math.sin(a) * (R1 + 3);
      sticker(g, () => g.ellipse(x, y, 6, 3, a + 0.8, 0, Math.PI * 2), CEL, { line: 2 });
    }
  }],
  'vfx.nature.tendril': [192, 40, (g) => {
    // one long thin vine, gently wavy, a small curl at its right tip and a leaf near the middle (as
    // long and thin as the generated one: the renderer draws it to a length with its own shape)
    const path = () => {
      g.moveTo(6, 22);
      g.bezierCurveTo(40, 12, 70, 30, 104, 20);
      g.bezierCurveTo(130, 13, 150, 26, 168, 20);
      g.bezierCurveTo(184, 15, 186, 30, 176, 30);
      g.bezierCurveTo(170, 30, 170, 24, 175, 24);
    };
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [w, c] of [[9, INK], [4.5, '#3E9B47']]) {
      g.beginPath();
      path();
      g.strokeStyle = c;
      g.lineWidth = w;
      g.stroke();
    }
    sticker(g, () => g.ellipse(92, 12, 10, 4.5, -0.5, 0, Math.PI * 2), '#7CD15A', { line: 3 });
  }],
  'vfx.nature.leaf': [40, 40, (g) => {
    const path = () => {
      g.moveTo(6, 34);
      g.bezierCurveTo(4, 14, 18, 4, 36, 4);
      g.bezierCurveTo(36, 22, 26, 36, 6, 34);
      g.closePath();
    };
    sticker(g, path, '#7CD15A', { line: 3, cel: '#3E9B47', celPath: () => poly(g, [[6, 34], [36, 4], [40, 40], [0, 40]]) });
    g.strokeStyle = '#1F5A2E';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(8, 32);
    g.lineTo(30, 10);
    g.stroke();
  }],
  'vfx.nature.blossom': [48, 48, (g) => {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      sticker(g, () => g.ellipse(24 + Math.cos(a) * 11, 24 + Math.sin(a) * 11, 9, 7, a, 0, Math.PI * 2), i % 2 ? '#FFFFFF' : '#FF9DB8', { line: 3 });
    }
    sticker(g, () => g.arc(24, 24, 6, 0, Math.PI * 2), '#FFE9BF', { line: 2.5 });
  }],
};

/** The colours the puddle is drawn in (cream body, cel edge, white glint): shots.js keeps each, tinted, under the threshold. */
export const PUDDLE_TEXELS = [0xfffaf2, 0xd9d2c7, 0xffffff];

/**
 * A venom puddle on a 128 grid (centre 64, 64): a splat-edged stain with a cel tone along its
 * edge, a ring of droplets that stays inside radius 64 (shots.js draws the grid at the sim's
 * puddle radius, so nothing shows past it) and a small glint. No outline and no soft gradient, so
 * it reads as a stain at a low alpha. Tinted by shots.js.
 */
export function drawPuddle(g) {
  g.beginPath();
  smooth(g, blobPts(64, 64, 36, 13, 0.3, 61));
  g.fillStyle = CEL;
  g.fill();
  g.beginPath();
  smooth(g, blobPts(62, 61, 30, 11, 0.28, 63));
  g.fillStyle = CREAM;
  g.fill();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + hash01i(i + 141) * 0.5;
    const r = 46 + 12 * hash01i(i + 143); // at most 58 out, each at most 5.5 in radius: inside 64
    g.beginPath();
    g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2.5 + 3 * hash01i(i + 147), 0, Math.PI * 2);
    g.fillStyle = i % 2 ? CEL : CREAM;
    g.fill();
  }
  g.beginPath();
  g.ellipse(52, 50, 7, 3.5, -0.5, 0, Math.PI * 2);
  g.fillStyle = '#FFFFFF';
  g.fill();
}
