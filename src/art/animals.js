// Element animals (the user's list, 2026-10-14): each element is one animal, and a
// fusion is parent A's animal body with ONE signature part grafted on from parent B's
// animal (fire + wind = lizard + wings = a dragon; ice + lightning = orca + horn = a
// narwhal). Same sticker kit; drawn in the 100-unit box, facing left, ground y ≈ 95.
import { kit, makeCanvas, stickerize, quantize, MOTIF, leafPath, zigPath, shardPath } from './creatures.js';
import { BODY, GOLD, INK, tone, mix, fusionPalette } from './tokens.js';

const TAU = Math.PI * 2;
const P = () => new Path2D();
const ell = (x, y, rx, ry, rot = 0) => {
  const p = P();
  p.ellipse(x, y, rx, ry, rot, 0, TAU);
  return p;
};
const box = (x, y, rx, ry) => [x - rx, y - ry, rx * 2, ry * 2];
const pal3 = (base, shade, light) => ({ base, shade, light });
const darker = (pal) => pal3(pal.shade, tone(pal.shade, -0.22), pal.base);
const WHITE = pal3('#ffffff', '#dfe7f2', '#ffffff');

/** Animal colours per element (pure forms). Lightning goes neon blue, metal goes gold. */
export const ANIMAL_PAL = {
  fire: pal3('#ff6a3d', '#d8452a', '#ffd9a8'),
  wind: pal3('#e9fbff', '#a9dcec', '#ffffff'),
  nature: pal3('#4cc760', '#2d9346', '#cdf5b8'),
  ice: pal3('#2f3e5c', '#1d2840', '#e8f6ff'),
  poison: pal3('#9a5ae4', '#7036bf', '#e0c8ff'),
  lightning: pal3('#2fd8ff', '#1597d6', '#d8f8ff'),
  metal: pal3('#ffcf4a', '#d4961f', '#fff1bf'),
  earth: pal3('#8d7b6a', '#66574a', '#cbbba8'),
  shark: pal3('#8fd6f0', '#4f9dc4', '#f2fbff'),
};
// the part colours a parent B brings along
const PART_PAL = {
  fire: pal3('#ff7a3d', '#d8452a', '#ffd9a8'),
  wind: pal3('#f2fdff', '#a9dcec', '#ffffff'),
  nature: pal3('#5fd36f', '#33a04c', '#d6f7c4'),
  ice: pal3('#2f3e5c', '#1d2840', '#e8f6ff'),
  poison: pal3('#b07af0', '#7a3fd0', '#ecdcff'),
  lightning: pal3('#ffe14d', '#efb31c', '#fff7c9'),
  metal: pal3('#ffcf4a', '#d4961f', '#fff1bf'),
  earth: pal3('#b9a48c', '#8a7663', '#ece2d3'),
  shark: pal3('#bfeaff', '#6cc3f0', '#ffffff'),
};

export const ANIMAL_NAMES = {
  fire: 'Lizard (baby dragon)',
  wind: 'Bird',
  nature: 'Turtle',
  ice: 'Orca',
  poison: 'Snake',
  lightning: 'Unicorn (neon blue)',
  metal: 'Gold lion',
  earth: 'Rock ox',
  shark: 'Frost shark (alt. Ice)',
};
export const PART_NAMES = {
  fire: 'dragon spikes',
  wind: 'wings',
  nature: 'shell',
  ice: 'orca fin',
  poison: 'serpent tail',
  lightning: 'horn',
  metal: 'mane',
  earth: 'ox horns',
  shark: 'shark fin',
};

function tube(k, segs, r0, r1, pal, n = 30) {
  const pts = [];
  const cub = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  };
  segs.forEach((s, i) => {
    for (let j = i ? 1 : 0; j <= n; j++) pts.push(cub(...s, j / n));
  });
  const N = pts.length;
  const L = [];
  const R = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(N - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const r = r0 + (r1 - r0) * (i / (N - 1));
    L.push([p[0] - (dy / d) * r, p[1] + (dx / d) * r]);
    R.push([p[0] + (dy / d) * r, p[1] - (dx / d) * r]);
  });
  const path = P();
  path.moveTo(...L[0]);
  for (const q of L) path.lineTo(...q);
  const e = pts[N - 1];
  path.arc(e[0], e[1], Math.max(0.4, r1), Math.atan2(L[N - 1][1] - e[1], L[N - 1][0] - e[0]), Math.atan2(R[N - 1][1] - e[1], R[N - 1][0] - e[0]), true);
  for (let i = N - 1; i >= 0; i--) path.lineTo(...R[i]);
  const s0 = pts[0];
  path.arc(s0[0], s0[1], r0, Math.atan2(R[0][1] - s0[1], R[0][0] - s0[0]), Math.atan2(L[0][1] - s0[1], L[0][0] - s0[0]), true);
  path.closePath();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  k.fill(path, pal, [Math.min(...xs) - r0, Math.min(...ys) - r0, Math.max(...xs) - Math.min(...xs) + r0 * 2, Math.max(...ys) - Math.min(...ys) + r0 * 2]);
  return pts;
}

function face(k, x, y, s = 1) {
  k.eyes(x, y, 3.6 * s, 2.8 * s, { almond: 0.7, brow: 1, look: -1.3 * s });
  k.mouth(x - 1.2 * s, y + 5 * s, 3.8 * s, 'smirk');
}

// --- grafted parts (parent B) ------------------------------------------------------------------
// stage: 'behind' (before the body), 'back' (on the body), 'head' (on the head)
function graft(k, part, stage, an) {
  if (!part) return;
  const { g } = k;
  const pp = PART_PAL[part];
  const [bx, by, bs] = an.back;
  const [hx, hy, hs] = an.head;
  if (stage === 'behind' && part === 'wind') {
    for (const side of [1, -1]) {
      const w = P();
      const ox = bx + side * 2;
      w.moveTo(ox, by);
      w.bezierCurveTo(ox + 10 * bs, by - 22 * bs, ox + 26 * bs, by - 30 * bs, ox + 36 * bs, by - 28 * bs);
      w.lineTo(ox + 30 * bs, by - 20 * bs);
      w.lineTo(ox + 34 * bs, by - 16 * bs);
      w.lineTo(ox + 24 * bs, by - 10 * bs);
      w.lineTo(ox + 26 * bs, by - 5 * bs);
      w.bezierCurveTo(ox + 16 * bs, by - 2 * bs, ox + 8 * bs, by + 2 * bs, ox, by + 2 * bs);
      w.closePath();
      g.save();
      if (side < 0) {
        g.translate(ox * 2, 0);
        g.scale(-1, 1);
        g.translate(-ox * 0.0, 0);
      }
      k.fill(w, side > 0 ? pp : darker(pp), [ox, by - 30 * bs, 36 * bs, 32 * bs]);
      g.restore();
    }
  }
  if (stage === 'behind' && part === 'metal') {
    // gear-plate mane behind the head
    const m = P();
    const teeth = 14;
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * TAU;
      const r = (i % 2 ? 13 : 17) * hs;
      const x = hx + Math.cos(a) * r;
      const y = hy + Math.sin(a) * r;
      i ? m.lineTo(x, y) : m.moveTo(x, y);
    }
    m.closePath();
    k.fill(m, pal3('#e0a33a', '#b57a1d', '#ffe1a0'), [hx - 17 * hs, hy - 17 * hs, 34 * hs, 34 * hs]);
  }
  if (stage === 'behind' && part === 'poison') {
    const [tx, ty] = an.tail;
    const pts = tube(
      k,
      [
        [[tx, ty], [tx + 14, ty + 10], [tx + 2, ty + 22], [tx + 16, ty + 26]],
        [[tx + 16, ty + 26], [tx + 26, ty + 30], [tx + 30, ty + 16], [tx + 22, ty + 12]],
      ],
      4.2,
      1,
      pp,
    );
    const e = pts.at(-1);
    k.fill(ell(e[0], e[1] - 1, 1.6, 1.6), pal3('#c8ff5a', '#9ad63a', '#f0ffd0'), box(e[0], e[1] - 1, 1.6, 1.6), { shade: false });
  }
  if (stage === 'back' && part === 'nature') {
    const d = P();
    d.moveTo(bx - 14 * bs, by + 4 * bs);
    d.bezierCurveTo(bx - 14 * bs, by - 16 * bs, bx + 14 * bs, by - 16 * bs, bx + 14 * bs, by + 4 * bs);
    d.closePath();
    k.fill(d, pp, [bx - 14 * bs, by - 12 * bs, 28 * bs, 16 * bs]);
    for (const [x, y] of [
      [-6, -3],
      [5, -4],
    ])
      k.fill(ell(bx + x * bs, by + y * bs, 4 * bs, 3 * bs), pal3(pp.light, pp.light, '#fff'), box(bx + x * bs, by + y * bs, 4 * bs, 3 * bs), { shade: false });
    g.save();
    g.translate(bx, by - 11 * bs);
    k.fill(leafPath(5 * bs, 8 * bs), MOTIF.nature, [-2.5 * bs, -8 * bs, 5 * bs, 8 * bs]);
    g.restore();
  }
  if (stage === 'back' && (part === 'ice' || part === 'shark')) {
    const f = P();
    if (part === 'ice') {
      f.moveTo(bx - 6 * bs, by + 1);
      f.quadraticCurveTo(bx - 2 * bs, by - 14 * bs, bx + 3 * bs, by - 22 * bs);
      f.quadraticCurveTo(bx + 7 * bs, by - 8 * bs, bx + 7 * bs, by + 1);
    } else {
      f.moveTo(bx - 7 * bs, by + 1);
      f.lineTo(bx + 4 * bs, by - 20 * bs);
      f.quadraticCurveTo(bx + 5 * bs, by - 6 * bs, bx + 9 * bs, by + 1);
    }
    f.closePath();
    k.fill(f, pp, [bx - 7 * bs, by - 22 * bs, 16 * bs, 23 * bs]);
    g.save();
    g.translate(bx + 3 * bs, by - 19 * bs);
    k.fill(shardPath(3 * bs, 7 * bs), MOTIF.ice, [-1.5 * bs, -7 * bs, 3 * bs, 7 * bs]);
    g.restore();
  }
  if (stage === 'back' && part === 'fire') {
    [
      [-8, 0.9],
      [0, 1.15],
      [8, 0.9],
    ].forEach(([dx, h]) => {
      const s = P();
      s.moveTo(bx + (dx - 4) * bs, by + 2);
      s.lineTo(bx + dx * bs, by - 9 * h * bs);
      s.lineTo(bx + (dx + 4) * bs, by + 2);
      s.closePath();
      k.fill(s, pp, [bx + (dx - 4) * bs, by - 9 * h * bs, 8 * bs, 11 * bs]);
    });
  }
  if (stage === 'head' && part === 'lightning') {
    const [tx, ty] = an.headTop;
    const h = P();
    h.moveTo(tx - 2.6 * hs, ty + 1);
    h.lineTo(tx - 7 * hs, ty - 15 * hs);
    h.lineTo(tx + 2.6 * hs, ty + 1);
    h.closePath();
    k.fill(h, pal3(GOLD, '#d49b1f', '#fff4c2'), [tx - 7 * hs, ty - 15 * hs, 10 * hs, 16 * hs]);
    k.line(
      [
        [tx - 2.4 * hs, ty - 3 * hs],
        [tx - 0.4 * hs, ty - 4 * hs],
      ],
      0.9,
    );
    k.line(
      [
        [tx - 4 * hs, ty - 8 * hs],
        [tx - 2 * hs, ty - 9 * hs],
      ],
      0.9,
    );
  }
  if (stage === 'head' && part === 'earth') {
    const [tx, ty] = an.headTop;
    for (const side of [-1, 1]) {
      const h = P();
      const x0 = tx + side * 4 * hs;
      h.moveTo(x0 - 1.5 * hs, ty + 2);
      h.bezierCurveTo(x0 + side * 9 * hs, ty - 2 * hs, x0 + side * 10 * hs, ty - 10 * hs, x0 + side * 4 * hs, ty - 13 * hs);
      h.bezierCurveTo(x0 + side * 6 * hs, ty - 8 * hs, x0 + side * 4 * hs, ty - 3 * hs, x0 + 1.5 * hs, ty + 2);
      h.closePath();
      k.fill(h, pal3('#efe2c8', '#c9b48f', '#ffffff'), [x0 - 10 * hs, ty - 13 * hs, 20 * hs, 15 * hs]);
    }
  }
}

// --- the animals -------------------------------------------------------------------------------------
// Each returns nothing; `part` is parent B's element (or null for the pure animal).

function lizard(k, pal, part) {
  const an = { back: [60, 58, 1], head: [26, 50, 0.9], headTop: [27, 39], tail: [70, 74] };
  graft(k, part, 'behind', an);
  if (part !== 'poison') tube(k, [[[66, 74], [80, 80], [94, 70], [90, 54]]], 5, 1.6, pal);
  for (const x of [40, 64]) k.fill(ell(x, 86, 4.2, 7.5, 0.1), darker(pal), box(x, 86, 4.2, 7.5));
  if (part !== 'wind') {
    // stub wings: the "baby dragon" hint
    const w = P();
    w.moveTo(58, 60);
    w.quadraticCurveTo(66, 44, 76, 46);
    w.lineTo(72, 52);
    w.lineTo(76, 56);
    w.quadraticCurveTo(66, 60, 60, 64);
    w.closePath();
    k.fill(w, darker(pal), [58, 44, 18, 20]);
  }
  k.fill(ell(54, 70, 20, 12, -0.05), pal, box(54, 70, 20, 12));
  k.fill(ell(52, 76, 13, 5.5), pal3(pal.light, pal.light, '#fff'), box(52, 76, 13, 5.5), { shade: false });
  if (part !== 'fire')
    [
      [50, 58],
      [58, 58.5],
      [66, 61],
    ].forEach(([x, y]) => {
      const s = P();
      s.moveTo(x - 3, y + 1.5);
      s.lineTo(x, y - 4.5);
      s.lineTo(x + 3, y + 1.5);
      s.closePath();
      k.fill(s, pal3(pal.light, tone(pal.light, -0.15), '#fff'), [x - 3, y - 4.5, 6, 6]);
    });
  graft(k, part, 'back', an);
  for (const x of [35, 60]) {
    k.fill(ell(x, 87, 4.6, 8, -0.05), pal, box(x, 87, 4.6, 8));
    k.fill(ell(x - 1, 94, 5.5, 2.4), pal, box(x - 1, 94, 5.5, 2.4), { shade: false });
  }
  for (const side of [-1, 1]) k.fill(ell(26 + side * 4.5, 39, 2, 3.4, side * 0.4), pal3(pal.light, tone(pal.light, -0.15), '#fff'), box(26 + side * 4.5, 39, 2, 3.4));
  k.fill(ell(28, 50, 12, 11), pal, box(28, 50, 12, 11));
  k.fill(ell(17, 55, 8.5, 6, 0.1), pal, box(17, 55, 8.5, 6));
  k.fill(ell(12, 53, 1.2, 1), pal3(INK, INK, INK), box(12, 53, 1.2, 1), { shade: false, ink: false });
  graft(k, part, 'head', an);
  face(k, 26, 48, 1);
}

function bird(k, pal, part) {
  const { g } = k;
  const an = { back: [50, 52, 1], head: [48, 38, 0.8], headTop: [48, 30], tail: [52, 74] };
  graft(k, part === 'wind' ? null : part, 'behind', an);
  for (const side of [-1, 1]) {
    const w = P();
    w.moveTo(50 + side * 6, 48);
    w.bezierCurveTo(50 + side * 20, 30, 50 + side * 36, 22, 50 + side * 46, 24);
    w.lineTo(50 + side * 40, 34);
    w.lineTo(50 + side * 44, 38);
    w.lineTo(50 + side * 36, 46);
    w.lineTo(50 + side * 38, 52);
    w.lineTo(50 + side * 28, 56);
    w.bezierCurveTo(50 + side * 20, 60, 50 + side * 12, 60, 50 + side * 8, 58);
    w.closePath();
    k.fill(w, side < 0 ? pal : darker(pal), [50 + Math.min(side * 6, side * 46), 22, 40, 38]);
  }
  if (part !== 'poison')
    for (const r of [-0.35, 0, 0.35]) {
      g.save();
      g.translate(52, 74);
      g.rotate(Math.PI + r);
      k.fill(leafPath(8, 18), MOTIF.wind, [-4, -18, 8, 18]);
      g.restore();
    }
  for (const x of [46, 56]) {
    k.fill(ell(x, 86, 1.8, 8), pal3(GOLD, '#d49b1f', '#fff4c2'), box(x, 86, 1.8, 8));
    k.fill(ell(x - 1, 94, 4.5, 1.8), pal3(GOLD, '#d49b1f', '#fff4c2'), box(x - 1, 94, 4.5, 1.8), { shade: false });
  }
  k.fill(ell(51, 62, 11, 15), pal, box(51, 62, 11, 15));
  k.fill(ell(51, 66, 7, 10), pal3(pal.light, pal.light, '#fff'), box(51, 66, 7, 10), { shade: false });
  graft(k, part, 'back', { ...an, back: [52, 50, 0.8] });
  k.fill(ell(48, 38, 9, 8.5), pal, box(48, 38, 9, 8.5));
  const beak = P();
  beak.moveTo(41, 37);
  beak.lineTo(32, 41);
  beak.lineTo(41, 43);
  beak.closePath();
  k.fill(beak, pal3(GOLD, '#d49b1f', '#fff4c2'), [32, 37, 9, 6]);
  // crest feathers
  for (const r of [-0.4, 0, 0.4]) {
    g.save();
    g.translate(49, 31);
    g.rotate(r - 0.3);
    k.fill(leafPath(4, 10), pal, [-2, -10, 4, 10]);
    g.restore();
  }
  graft(k, part, 'head', an);
  k.eyes(48, 36, 2.8, 2.3, { almond: 0.7, brow: 1, look: -1.2 });
}

function turtle(k, pal, part) {
  const { g } = k;
  const an = { back: [56, 58, 1.4], head: [17, 66, 0.75], headTop: [18, 59], tail: [86, 80] };
  graft(k, part, 'behind', an);
  for (const x of [30, 46, 62, 76]) k.fill(ell(x, 88, 4.6, 6.5), darker(pal), box(x, 88, 4.6, 6.5));
  if (part !== 'poison') k.fill(ell(87, 82, 4, 2.5, 0.3), pal, box(87, 82, 4, 2.5));
  const shellPal = pal3(mix(pal.base, '#6b4f2a', 0.35), mix(pal.shade, '#4f3a1e', 0.35), pal.light);
  const dome = P();
  dome.moveTo(22, 82);
  dome.bezierCurveTo(20, 44, 88, 44, 88, 82);
  dome.closePath();
  k.fill(dome, shellPal, [20, 50, 68, 32]);
  for (const [x, y] of [
    [40, 68],
    [56, 62],
    [72, 70],
    [55, 76],
  ]) {
    const h = P();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      i ? h.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 5) : h.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 5);
    }
    h.closePath();
    k.fill(h, pal, [x - 6, y - 5, 12, 10], { shade: false });
  }
  k.fill(ell(55, 83, 34, 3.6), pal3(pal.light, pal.light, '#fff'), box(55, 83, 34, 3.6), { shade: false });
  if (!part || part === 'nature')
    for (const [x, r] of [
      [52, -0.3],
      [58, 0.3],
    ]) {
      g.save();
      g.translate(x, 51);
      g.rotate(r);
      k.fill(leafPath(6, 10), MOTIF.nature, [-3, -10, 6, 10]);
      g.restore();
    }
  if (part && part !== 'nature') graft(k, part, 'back', { ...an, back: [56, 52, 1] });
  k.fill(ell(17, 69, 8.5, 7.5), pal, box(17, 69, 8.5, 7.5));
  graft(k, part, 'head', an);
  face(k, 15, 68, 0.75);
}

function orca(k, pal, part, shark = false) {
  const { g } = k;
  const an = { back: [52, 40, 1], head: [26, 56, 0.9], headTop: [24, 44], tail: [82, 60] };
  graft(k, part, 'behind', an);
  // flukes
  if (part !== 'poison') {
    const fl = P();
    fl.moveTo(80, 60);
    if (shark) {
      fl.lineTo(96, 40);
      fl.quadraticCurveTo(92, 58, 98, 74);
      fl.closePath();
    } else {
      fl.quadraticCurveTo(90, 46, 98, 46);
      fl.quadraticCurveTo(94, 58, 98, 74);
      fl.quadraticCurveTo(90, 74, 80, 60);
    }
    k.fill(fl, pal, [80, 40, 18, 34]);
  }
  const fin = P();
  fin.moveTo(46, 42);
  if (shark) {
    fin.lineTo(58, 16);
    fin.quadraticCurveTo(60, 32, 66, 42);
  } else {
    fin.quadraticCurveTo(50, 30, 56, 18);
    fin.quadraticCurveTo(62, 30, 64, 42);
  }
  fin.closePath();
  if (part !== 'ice' && part !== 'shark') k.fill(fin, pal, [46, 16, 20, 26]);
  const body = P();
  body.moveTo(10, 60);
  body.bezierCurveTo(14, 42, 48, 34, 70, 46);
  body.bezierCurveTo(78, 50, 84, 56, 84, 60);
  body.bezierCurveTo(70, 72, 48, 80, 28, 76);
  body.bezierCurveTo(16, 73, 9, 67, 10, 60);
  k.fill(body, pal, [10, 36, 74, 44]);
  // markings: white belly, eye patch (orca) / pale belly and gills (shark)
  const belly = P();
  belly.moveTo(14, 64);
  belly.bezierCurveTo(30, 66, 52, 66, 72, 60);
  belly.bezierCurveTo(56, 74, 30, 78, 18, 70);
  belly.closePath();
  k.fill(belly, shark ? pal3(pal.light, pal.light, '#fff') : WHITE, [14, 60, 58, 18], { shade: false });
  if (!shark) k.fill(ell(34, 52, 6, 3.4, -0.2), WHITE, box(34, 52, 6, 3.4), { shade: false });
  else for (const x of [36, 40, 44]) k.line([[x, 54], [x - 1.5, 62]], 1.2, pal.shade);
  const flip = P();
  flip.moveTo(36, 68);
  flip.quadraticCurveTo(32, 80, 40, 84);
  flip.quadraticCurveTo(44, 76, 46, 68);
  flip.closePath();
  k.fill(flip, darker(pal), [32, 68, 14, 16]);
  graft(k, part, 'back', an);
  graft(k, part, 'head', an);
  if (shark) {
    // toothy grin
    k.line(
      [
        [14, 64],
        [28, 66],
      ],
      1.6,
    );
    for (let i = 0; i < 4; i++) {
      const t = P();
      t.moveTo(16 + i * 3, 64.4);
      t.lineTo(17.5 + i * 3, 67.4);
      t.lineTo(19 + i * 3, 64.8);
      t.closePath();
      k.fill(t, WHITE, [16 + i * 3, 64, 3, 3], { shade: false, ink: false });
    }
    k.eyes(25, 56, 2.2, 2.4, { almond: 0.8, brow: 1, look: -1 });
  } else {
    k.eyes(26, 56, 2.4, 2.4, { almond: 0.6, brow: 0.8, look: -1 });
    k.mouth(17, 64, 4, 'smirk');
  }
  // it swims: a shadow on the ground below
  g.save();
  g.globalAlpha = 0.3;
  k.fill(ell(48, 97, 26, 2), pal3(INK, INK, INK), box(48, 97, 26, 2), { shade: false, ink: false });
  g.restore();
}

function snake(k, pal, part) {
  const an = { back: [70, 60, 0.9], head: [38, 34, 0.85], headTop: [38, 26], tail: [86, 90] };
  graft(k, part === 'poison' ? null : part, 'behind', an);
  const pts = tube(
    k,
    [
      [[44, 42], [52, 54], [74, 56], [72, 70]],
      [[72, 70], [70, 84], [36, 78], [30, 88]],
      [[30, 88], [26, 94], [60, 96], [86, 90]],
    ],
    7.5,
    1.6,
    pal,
  );
  pts.forEach((p, i) => {
    if (i % 9 || i < 6 || i > pts.length - 12) return;
    const d = P();
    d.moveTo(p[0], p[1] - 2.6);
    d.lineTo(p[0] + 2.4, p[1]);
    d.lineTo(p[0], p[1] + 2.6);
    d.lineTo(p[0] - 2.4, p[1]);
    d.closePath();
    k.fill(d, pal3('#c8ff5a', '#9ad63a', '#f0ffd0'), [p[0] - 2.4, p[1] - 2.6, 4.8, 5.2], { shade: false, ink: false });
  });
  graft(k, part, 'back', an);
  k.fill(ell(38, 34, 10, 8.5, -0.2), pal, box(38, 34, 10, 8.5));
  k.fill(ell(29, 37, 5.5, 3.6, -0.1), pal, box(29, 37, 5.5, 3.6));
  k.line(
    [
      [24, 39],
      [19, 40],
      [16, 38],
    ],
    1.1,
    '#ff5c7a',
  );
  k.line(
    [
      [19, 40],
      [16, 42],
    ],
    1.1,
    '#ff5c7a',
  );
  graft(k, part, 'head', an);
  k.eyes(37, 32, 3, 2.4, { almond: 0.8, brow: 1, look: -1.1 });
}

function unicorn(k, pal, part) {
  const { g } = k;
  const an = { back: [58, 50, 1], head: [26, 26, 0.85], headTop: [29, 17], tail: [76, 52] };
  graft(k, part, 'behind', an);
  if (part !== 'poison') {
    // a lightning-bolt tail
    const t = P();
    t.moveTo(74, 50);
    t.lineTo(88, 52);
    t.lineTo(82, 60);
    t.lineTo(94, 66);
    t.lineTo(80, 64);
    t.lineTo(84, 58);
    t.lineTo(74, 56);
    t.closePath();
    k.fill(t, PART_PAL.lightning, [74, 50, 20, 16]);
  }
  for (const x of [44, 70]) k.fill(ell(x, 79, 2.4, 14, 0.06), darker(pal), box(x, 79, 2.4, 14));
  k.fill(ell(58, 56, 19, 9.5), pal, box(58, 56, 19, 9.5));
  graft(k, part, 'back', an);
  for (const x of [40, 66]) {
    k.fill(ell(x, 80, 2.6, 14.5, -0.04), pal, box(x, 80, 2.6, 14.5));
    k.fill(ell(x - 0.5, 94, 3.6, 2), pal3(INK, INK, INK), box(x - 0.5, 94, 3.6, 2), { shade: false, ink: false });
  }
  const neck = P();
  neck.moveTo(42, 52);
  neck.quadraticCurveTo(34, 40, 26, 26);
  neck.lineTo(36, 22);
  neck.quadraticCurveTo(44, 36, 52, 50);
  neck.closePath();
  k.fill(neck, pal, [26, 22, 26, 30]);
  // zigzag mane down the neck
  if (part !== 'metal') {
    const m = P();
    m.moveTo(34, 20);
    for (let i = 1; i <= 5; i++) m.lineTo(36 + i * 3.4 + (i % 2 ? 5 : 0), 20 + i * 6);
    m.lineTo(50, 50);
    m.lineTo(40, 30);
    m.closePath();
    k.fill(m, PART_PAL.lightning, [34, 20, 22, 30]);
  }
  k.fill(ell(26, 25, 8, 6.5, -0.5), pal, box(26, 25, 8, 6.5));
  k.fill(ell(19, 31, 5, 4, -0.3), pal, box(19, 31, 5, 4));
  for (const side of [-1, 1]) {
    const e = P();
    e.moveTo(30 + side * 1.5, 19);
    e.lineTo(32 + side * 2, 12);
    e.lineTo(34 + side * 1, 19);
    e.closePath();
    k.fill(e, pal, [29, 12, 7, 7]);
  }
  if (!part || part === 'lightning') {
    // the horn: a twisted bolt
    const h = P();
    h.moveTo(25.5, 18);
    h.lineTo(20, 4);
    h.lineTo(28.5, 17);
    h.closePath();
    k.fill(h, pal3(GOLD, '#d49b1f', '#fff4c2'), [20, 4, 9, 14]);
  } else graft(k, part, 'head', an);
  k.eyes(25, 23, 2.4, 2.2, { almond: 0.7, brow: 1, look: -1 });
}

function lion(k, pal, part) {
  const an = { back: [60, 56, 1], head: [30, 48, 1], headTop: [30, 38], tail: [76, 60] };
  if (part !== 'metal') graft(k, part, 'behind', an);
  if (part !== 'poison') {
    tube(k, [[[76, 62], [86, 64], [92, 56], [92, 46]]], 2, 1.4, pal);
    k.fill(ell(92, 44, 3.2, 4), pal3('#e0a33a', '#b57a1d', '#ffe1a0'), box(92, 44, 3.2, 4));
  }
  for (const x of [44, 70]) k.fill(ell(x, 82, 4, 11, 0.06), darker(pal), box(x, 82, 4, 11));
  k.fill(ell(58, 64, 20, 11), pal, box(58, 64, 20, 11));
  graft(k, part, 'back', an);
  for (const x of [40, 66]) {
    k.fill(ell(x, 83, 4.4, 11.5, -0.04), pal, box(x, 83, 4.4, 11.5));
    k.fill(ell(x - 1, 94, 5.5, 2.4), pal, box(x - 1, 94, 5.5, 2.4), { shade: false });
  }
  // the mane: gear-toothed plates (metal), the lion's own signature
  if (!part || part === 'metal' || true) {
    const m = P();
    const teeth = 14;
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * TAU;
      const r = i % 2 ? 13 : 17;
      i ? m.lineTo(30 + Math.cos(a) * r, 48 + Math.sin(a) * r) : m.moveTo(30 + Math.cos(a) * r, 48 + Math.sin(a) * r);
    }
    m.closePath();
    k.fill(m, part && part !== 'metal' ? PART_PAL[part] : pal3('#e0a33a', '#b57a1d', '#ffe1a0'), [13, 31, 34, 34]);
  }
  k.fill(ell(30, 49, 10, 9.5), pal, box(30, 49, 10, 9.5));
  k.fill(ell(23, 54, 5.5, 4), pal3(pal.light, pal.light, '#fff'), box(23, 54, 5.5, 4), { shade: false });
  k.fill(ell(20, 52, 1.6, 1.2), pal3(INK, INK, INK), box(20, 52, 1.6, 1.2), { shade: false, ink: false });
  for (const side of [-1, 1]) k.fill(ell(30 + side * 6, 40, 2.6, 2.6), pal, box(30 + side * 6, 40, 2.6, 2.6));
  if (part !== 'metal') graft(k, part, 'head', an);
  face(k, 29, 47, 0.95);
}

function ox(k, pal, part) {
  const an = { back: [58, 50, 1.1], head: [24, 64, 0.95], headTop: [24, 55], tail: [80, 62] };
  graft(k, part, 'behind', an);
  if (part !== 'poison') tube(k, [[[80, 62], [86, 66], [88, 74], [86, 80]]], 1.8, 1.2, pal);
  for (const x of [42, 70]) k.fill(ell(x, 86, 5.5, 8.5), darker(pal), box(x, 86, 5.5, 8.5));
  const body = P();
  body.moveTo(32, 60);
  body.bezierCurveTo(34, 42, 52, 38, 60, 46);
  body.bezierCurveTo(72, 46, 84, 52, 82, 68);
  body.bezierCurveTo(80, 80, 44, 82, 36, 76);
  body.bezierCurveTo(30, 72, 30, 66, 32, 60);
  k.fill(body, pal, [30, 38, 54, 44]);
  // rocky hump plates
  if (part !== 'nature' && part !== 'fire')
    for (const [x, y, w, h] of [
      [46, 44, 12, 8],
      [58, 44, 11, 7],
    ]) {
      const r = P();
      r.moveTo(x - w / 2, y + h / 2);
      r.lineTo(x - w / 2 + 1, y - h / 3);
      r.lineTo(x, y - h / 2 - 1);
      r.lineTo(x + w / 2, y - h / 4);
      r.lineTo(x + w / 2, y + h / 2);
      r.closePath();
      k.fill(r, PART_PAL.earth, [x - w / 2, y - h / 2 - 1, w, h + 1]);
    }
  graft(k, part, 'back', { ...an, back: [52, 46, 1.1] });
  for (const x of [38, 64]) {
    k.fill(ell(x, 87, 5.8, 9), pal, box(x, 87, 5.8, 9));
    k.fill(ell(x, 94.5, 6, 2.2), pal3(INK, INK, INK), box(x, 94.5, 6, 2.2), { shade: false, ink: false });
  }
  k.fill(ell(24, 65, 10, 9), pal, box(24, 65, 10, 9));
  k.fill(ell(19, 70, 7, 5), pal3(pal.light, pal.light, '#fff'), box(19, 70, 7, 5), { shade: false });
  if (!part || part === 'earth') {
    for (const side of [-1, 1]) {
      const h = P();
      const x0 = 24 + side * 5;
      h.moveTo(x0 - 1.5, 58);
      h.bezierCurveTo(x0 + side * 10, 56, x0 + side * 12, 46, x0 + side * 5, 42);
      h.bezierCurveTo(x0 + side * 7, 48, x0 + side * 5, 54, x0 + 1.5, 58);
      h.closePath();
      k.fill(h, pal3('#efe2c8', '#c9b48f', '#ffffff'), [x0 - 12, 42, 24, 16]);
    }
  } else graft(k, part, 'head', an);
  face(k, 23, 63, 0.9);
}

function shark(k, pal, part) {
  orca(k, pal, part, true);
}

export const ANIMALS = { fire: lizard, wind: bird, nature: turtle, ice: orca, poison: snake, lightning: unicorn, metal: lion, earth: ox, shark };

/** Pure element animal, or a chimera: A's body with B's part, in the fusion palette. */
export function renderAnimal(a, b = null, style = 'sticker', unit = 2.6) {
  const draw = ANIMALS[a];
  const pal = b ? (a === 'shark' ? fusionPalette('ice', b === 'ice' ? 'wind' : b) : fusionPalette(a, b)) : ANIMAL_PAL[a];
  const part = b && b !== a ? b : null;
  if (style === 'pixel') {
    const G = 44;
    const c = makeCanvas(G + 2, G + 2);
    const g = c.getContext('2d');
    g.translate(1, 1);
    g.scale(G / 100, G / 100);
    draw(kit(g, 'pixel'), pal, part);
    const pp = part ? PART_PAL[part] : pal;
    quantize(c, [INK, '#ffffff', '#dfe7f2', GOLD, '#d49b1f', '#ff8fa3', pal.base, pal.shade, pal.light, pp.base, pp.shade, pp.light, '#c8ff5a', '#e0a33a', '#efe2c8', BODY.earth.base]);
    return { canvas: c, unit: G / 100, pad: 1 };
  }
  const padU = 8;
  const W = (100 + padU * 2) * unit;
  const c = makeCanvas(W, W);
  const g = c.getContext('2d');
  g.translate(padU * unit, padU * unit);
  g.scale(unit, unit);
  draw(kit(g, style === 'vinyl' ? 'vinyl' : 'sticker'), pal, part);
  if (style === 'vinyl') return { canvas: c, unit, pad: padU * unit };
  return { canvas: stickerize(c, 3 * unit, 2.2 * unit), unit, pad: padU * unit };
}

export { zigPath };
