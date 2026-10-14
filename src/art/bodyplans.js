// Fusion body-plan candidates: twelve silhouette families so the 28 fusions stop
// sharing one humanoid template. Same sticker kit, palette and slot rule as the
// current fusions (fusion colour dominant, parent B supplies crest and tail tip),
// drawn in the 100-unit box, facing left, ground at y ≈ 95.
import { kit, motif, MOTIF, leafPath, rockPath, shardPath, zigPath, flamePath, drawFusion, makeCanvas, stickerize, quantize } from './creatures.js';
import { BODY, GOLD, INK, tone, mix, fusionPalette } from './tokens.js';

const TAU = Math.PI * 2;
const P = () => new Path2D();

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}

/** A tapered tube along cubic bezier segments: one clean outline (no inner seams). */
function tubePath(segs, r0, r1, n = 40) {
  const pts = [];
  segs.forEach((s, i) => {
    for (let j = i ? 1 : 0; j <= n; j++) pts.push(cubic(...s, j / n));
  });
  const L = [];
  const R = [];
  const N = pts.length;
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
  // round tail cap
  const end = pts[N - 1];
  path.arc(end[0], end[1], Math.max(0.3, r1), Math.atan2(L[N - 1][1] - end[1], L[N - 1][0] - end[0]), Math.atan2(R[N - 1][1] - end[1], R[N - 1][0] - end[0]), true);
  for (let i = N - 1; i >= 0; i--) path.lineTo(...R[i]);
  const st = pts[0];
  path.arc(st[0], st[1], r0, Math.atan2(R[0][1] - st[1], R[0][0] - st[0]), Math.atan2(L[0][1] - st[1], L[0][0] - st[0]), true);
  path.closePath();
  return { path, pts };
}

const ell = (x, y, rx, ry, rot = 0) => {
  const p = P();
  p.ellipse(x, y, rx, ry, rot, 0, TAU);
  return p;
};
const box = (x, y, rx, ry) => [x - rx, y - ry, rx * 2, ry * 2];
const darker = (pal) => ({ base: pal.shade, shade: tone(pal.shade, -0.22), light: pal.base });

/** An adult face: almond eyes tilted up, short fierce brows, a smirk. */
function face(k, x, y, s = 1, { profile = false } = {}) {
  k.eyes(x, y, profile ? 3.6 * s : 4.4 * s, 2.8 * s, { almond: 0.72, brow: 1, look: profile ? -1.4 * s : -1 * s });
  if (s >= 0.8) k.mouth(x - 1 * s, y + 5 * s, 4 * s, 'smirk');
}

// --- the twelve candidates ----------------------------------------------------------------

function runner(k, pal, b) {
  const { g } = k;
  // far legs (darker), tail, body, near legs, neck, head
  for (const x of [40, 70]) k.fill(ell(x, 81, 3.2, 12, 0.12), darker(pal), box(x, 81, 3.2, 12));
  const t = tubePath([[[74, 60], [86, 58], [94, 44], [90, 30]]], 4.6, 1.6);
  k.fill(t.path, pal, [74, 28, 22, 34]);
  g.save();
  g.translate(90, 30);
  g.rotate(0.2);
  motif(k, b, 1, 0, 0, 0.7);
  g.restore();
  k.fill(ell(56, 62, 22, 10.5), pal, box(56, 62, 22, 10.5));
  k.fill(ell(56, 66, 14, 5), { base: pal.light, shade: pal.light, light: '#fff' }, box(56, 66, 14, 5), { shade: false });
  for (const x of [35, 64]) k.fill(ell(x, 82, 3.4, 12.5, -0.08), pal, box(x, 82, 3.4, 12.5));
  const neck = tubePath([[[44, 58], [38, 52], [34, 46], [30, 42]]], 7, 6);
  k.fill(neck.path, pal, [26, 38, 22, 24]);
  for (const side of [-1, 1]) {
    const e = P();
    e.moveTo(28 + side * 4, 34);
    e.lineTo(26 + side * 7, 20);
    e.lineTo(33 + side * 4, 31);
    e.closePath();
    k.fill(e, pal, [22, 20, 16, 14]);
  }
  k.fill(ell(28, 38, 9, 8), pal, box(28, 38, 9, 8));
  k.fill(ell(19, 42, 7, 4.2, 0.15), pal, box(19, 42, 7, 4.2));
  k.fill(ell(13.5, 41, 1.6, 1.3), { base: INK, shade: INK, light: INK }, box(13.5, 41, 1.6, 1.3), { shade: false, ink: false });
  motif(k, b, 2, 30, 31, 0.6);
  face(k, 27, 37, 0.9, { profile: true });
}

function kaiju(k, pal, b) {
  const { g } = k;
  const t = tubePath([[[64, 70], [80, 78], [90, 88], [96, 92]]], 9, 2);
  k.fill(t.path, pal, [60, 66, 38, 28]);
  k.fill(ell(62, 82, 8, 11), darker(pal), box(62, 82, 8, 11));
  const body = P();
  body.moveTo(38, 34);
  body.bezierCurveTo(54, 28, 72, 46, 70, 70);
  body.bezierCurveTo(68, 86, 46, 88, 40, 78);
  body.bezierCurveTo(34, 66, 30, 44, 38, 34);
  k.fill(body, pal, [30, 28, 42, 60]);
  k.fill(ell(50, 66, 9, 13, -0.2), { base: pal.light, shade: pal.light, light: '#fff' }, box(50, 66, 9, 13), { shade: false });
  // back plates in B's motif
  [
    [58, 36, -0.1],
    [66, 46, 0.5],
    [70, 58, 0.9],
  ].forEach(([x, y, r]) => {
    g.save();
    g.translate(x, y);
    g.rotate(r + 0.6);
    motif(k, b, 1, 0, 0, 0.62);
    g.restore();
  });
  k.fill(ell(50, 84, 9.5, 11), pal, box(50, 84, 9.5, 11));
  k.fill(ell(45, 94, 8, 3), darker(pal), box(45, 94, 8, 3), { shade: false });
  k.fill(ell(42, 54, 2.6, 5, 0.6), pal, box(42, 54, 2.6, 5));
  const head = P();
  head.moveTo(20, 30);
  head.bezierCurveTo(22, 18, 40, 16, 44, 26);
  head.bezierCurveTo(46, 34, 40, 40, 30, 40);
  head.bezierCurveTo(22, 40, 18, 36, 20, 30);
  k.fill(head, pal, [18, 18, 28, 22]);
  face(k, 30, 27, 0.95, { profile: true });
}

function golem(k, pal, b) {
  for (const side of [-1, 1]) {
    k.fill(ell(50 + side * 9, 88, 6, 8), darker(pal), box(50 + side * 9, 88, 6, 8));
  }
  const body = P();
  body.roundRect(24, 34, 52, 48, [22, 22, 12, 12]);
  k.fill(body, pal, [24, 34, 52, 48]);
  k.fill(ell(50, 64, 13, 11), { base: mix(pal.light, BODY.earth.light, 0.3), shade: pal.light, light: '#fff' }, box(50, 64, 13, 11), { shade: false });
  for (const side of [-1, 1]) {
    const arm = tubePath([[[50 + side * 24, 42], [50 + side * 34, 50], [50 + side * 36, 66], [50 + side * 34, 78]]], 8, 7);
    k.fill(arm.path, pal, [50 + Math.min(side * 24, side * 42), 40, 18, 44]);
    k.fill(ell(50 + side * 34, 84, 9, 8), pal, box(50 + side * 34, 84, 9, 8));
    k.g.save();
    k.g.translate(50 + side * 24, 38);
    k.g.rotate(side * 0.35);
    k.fill(rockPath(14, 9), MOTIF.earth, [-7, -9, 14, 9]);
    k.g.restore();
  }
  k.fill(ell(50, 32, 9, 8), pal, box(50, 32, 9, 8));
  motif(k, b, 3, 50, 25, 0.75);
  face(k, 49, 32, 0.85);
}

function raptor(k, pal, b) {
  const { g } = k;
  // wings
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
  // tail fan from B colours
  for (const r of [-0.35, 0, 0.35]) {
    g.save();
    g.translate(52, 74);
    g.rotate(Math.PI + r);
    k.fill(leafPath(8, 18), MOTIF[b], [-4, -18, 8, 18]);
    g.restore();
  }
  for (const x of [46, 56]) {
    k.fill(ell(x, 86, 1.8, 8), { base: GOLD, shade: '#d49b1f', light: '#fff4c2' }, box(x, 86, 1.8, 8));
    k.fill(ell(x - 1, 94, 4.5, 1.8), { base: GOLD, shade: '#d49b1f', light: '#fff4c2' }, box(x - 1, 94, 4.5, 1.8), { shade: false });
  }
  k.fill(ell(51, 62, 11, 15), pal, box(51, 62, 11, 15));
  k.fill(ell(51, 66, 7, 10), { base: pal.light, shade: pal.light, light: '#fff' }, box(51, 66, 7, 10), { shade: false });
  k.fill(ell(48, 38, 9, 8.5), pal, box(48, 38, 9, 8.5));
  const beak = P();
  beak.moveTo(41, 37);
  beak.lineTo(32, 41);
  beak.lineTo(41, 43);
  beak.closePath();
  k.fill(beak, { base: GOLD, shade: '#d49b1f', light: '#fff4c2' }, [32, 37, 9, 6]);
  motif(k, b, 3, 50, 31, 0.6);
  face(k, 48, 36, 0.8, { profile: true });
}

function serpent(k, pal, b) {
  const { g } = k;
  const t = tubePath(
    [
      [[44, 42], [52, 54], [74, 56], [72, 70]],
      [[72, 70], [70, 84], [36, 78], [30, 88]],
      [[30, 88], [26, 94], [60, 96], [86, 90]],
    ],
    7.5,
    1.6,
    30,
  );
  k.fill(t.path, pal, [24, 40, 64, 58]);
  // belly scale marks along the coil
  t.pts.forEach((p, i) => {
    if (i % 9 || i < 6 || i > t.pts.length - 12) return;
    k.fill(ell(p[0], p[1], 2.4, 1.4), { base: pal.light, shade: pal.light, light: '#fff' }, box(p[0], p[1], 2.4, 1.4), { shade: false, ink: false });
  });
  const end = t.pts[t.pts.length - 1];
  g.save();
  g.translate(end[0] + 2, end[1] - 1);
  g.rotate(1.3);
  motif(k, b, 1, 0, 0, 0.6);
  g.restore();
  // frilled head
  for (const side of [-1, 1]) {
    const f = P();
    f.moveTo(40, 34);
    f.lineTo(40 + side * 16, 22);
    f.lineTo(40 + side * 12, 34);
    f.lineTo(40 + side * 17, 38);
    f.closePath();
    k.fill(f, MOTIF[b], [24, 22, 33, 16]);
  }
  k.fill(ell(38, 34, 10, 8.5, -0.2), pal, box(38, 34, 10, 8.5));
  k.fill(ell(29, 37, 5.5, 3.6, -0.1), pal, box(29, 37, 5.5, 3.6));
  face(k, 37, 32, 0.85, { profile: true });
}

function wisp(k, pal, b) {
  const { g } = k;
  const body = P();
  body.moveTo(50, 14);
  body.bezierCurveTo(70, 14, 76, 34, 72, 48);
  body.bezierCurveTo(68, 62, 60, 66, 62, 78);
  body.bezierCurveTo(64, 88, 76, 88, 78, 82);
  body.bezierCurveTo(78, 94, 58, 96, 52, 88);
  body.bezierCurveTo(44, 78, 46, 66, 36, 58);
  body.bezierCurveTo(24, 48, 28, 14, 50, 14);
  k.fill(body, pal, [26, 14, 52, 82]);
  for (const side of [-1, 1]) k.fill(ell(50 + side * 22, 50, 3.5, 6, side * 0.6), pal, box(50 + side * 22, 50, 3.5, 6));
  // trailing sparks in B colours
  for (const [x, y, r] of [
    [36, 74, 2.6],
    [30, 84, 1.8],
    [84, 72, 2],
  ])
    k.fill(ell(x, y, r, r), MOTIF[b], box(x, y, r, r), { shade: false });
  motif(k, b, 3, 50, 16, 0.75);
  face(k, 49, 36, 1.15);
  g.save();
  g.globalAlpha = 0.35;
  k.fill(ell(52, 98, 12, 2.2), { base: INK, shade: INK, light: INK }, box(52, 98, 12, 2.2), { shade: false, ink: false });
  g.restore();
}

function bell(k, pal, b) {
  const { g } = k;
  // tendrils
  [30, 40, 50, 60, 70].forEach((x, i) => {
    const t = tubePath([[[x, 48], [x + (i % 2 ? 6 : -6), 62], [x + (i % 2 ? -6 : 6), 76], [x + (i % 2 ? 4 : -4), 92]]], 2.6, 1);
    k.fill(t.path, i % 2 ? pal : MOTIF[b], [x - 8, 48, 16, 46]);
  });
  const dome = P();
  dome.moveTo(22, 46);
  dome.bezierCurveTo(20, 18, 80, 18, 78, 46);
  for (let i = 0; i < 6; i++) {
    const x0 = 78 - i * (56 / 6);
    dome.quadraticCurveTo(x0 - 56 / 12, 54, x0 - 56 / 6, 46);
  }
  dome.closePath();
  k.fill(dome, pal, [20, 18, 60, 36]);
  k.shine(36, 28, 6, 3.5, pal, 0.9);
  motif(k, b, 3, 50, 21, 0.75);
  face(k, 50, 37, 1.05);
}

function stag(k, pal, b) {
  const { g } = k;
  for (const x of [42, 70]) k.fill(ell(x, 78, 2.4, 15, 0.08), darker(pal), box(x, 78, 2.4, 15));
  k.fill(ell(58, 56, 20, 9.5), pal, box(58, 56, 20, 9.5));
  k.fill(ell(78, 50, 3.5, 5, 0.5), { base: pal.light, shade: pal.light, light: '#fff' }, box(78, 50, 3.5, 5));
  for (const x of [38, 66]) k.fill(ell(x, 79, 2.6, 15.5, -0.06), pal, box(x, 79, 2.6, 15.5));
  const neck = tubePath([[[44, 54], [38, 44], [34, 36], [32, 28]]], 6, 4.6);
  k.fill(neck.path, pal, [28, 26, 20, 30]);
  // antlers: B's motif, large and symmetrical (the majestic read)
  for (const side of [-1, 1]) {
    g.save();
    g.translate(31 + side * 3, 18);
    g.rotate(side * 0.5);
    motif(k, b, 2, 0, 0, 0.75);
    g.restore();
  }
  k.fill(ell(30, 23, 7, 6.5), pal, box(30, 23, 7, 6.5));
  k.fill(ell(23, 27, 5, 3.2, 0.25), pal, box(23, 27, 5, 3.2));
  face(k, 29, 22, 0.75, { profile: true });
}

function shell(k, pal, b) {
  for (const x of [30, 46, 62, 76]) k.fill(ell(x, 88, 4.6, 6.5), darker(pal), box(x, 88, 4.6, 6.5));
  k.fill(ell(17, 70, 8.5, 7.5), pal, box(17, 70, 8.5, 7.5));
  const dome = P();
  dome.moveTo(22, 82);
  dome.bezierCurveTo(20, 44, 88, 44, 88, 82);
  dome.closePath();
  const shellPal = { base: mix(pal.base, BODY.earth.base, 0.45), shade: mix(pal.shade, BODY.earth.shade, 0.45), light: pal.light };
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
      const px = x + Math.cos(a) * 6;
      const py = y + Math.sin(a) * 5;
      i ? h.lineTo(px, py) : h.moveTo(px, py);
    }
    h.closePath();
    k.fill(h, { base: pal.base, shade: pal.shade, light: pal.light }, [x - 6, y - 5, 12, 10], { shade: false });
  }
  k.fill(ell(55, 83, 34, 3.6), { base: pal.light, shade: pal.light, light: '#fff' }, box(55, 83, 34, 3.6), { shade: false });
  motif(k, b, 3, 56, 54, 0.8);
  face(k, 15, 69, 0.75, { profile: true });
}

function manta(k, pal, b) {
  const { g } = k;
  const t = tubePath([[[56, 62], [64, 76], [80, 84], [92, 90]]], 2.6, 0.8);
  k.fill(t.path, pal, [54, 60, 40, 32]);
  g.save();
  g.translate(92, 90);
  g.rotate(0.9);
  motif(k, b, 1, 0, 0, 0.55);
  g.restore();
  const w = P();
  w.moveTo(46, 30);
  w.bezierCurveTo(60, 30, 74, 38, 96, 50);
  w.bezierCurveTo(80, 56, 66, 60, 54, 66);
  w.bezierCurveTo(48, 68, 42, 66, 38, 62);
  w.bezierCurveTo(28, 58, 14, 54, 4, 50);
  w.bezierCurveTo(22, 40, 34, 30, 46, 30);
  k.fill(w, pal, [4, 30, 92, 38]);
  k.fill(ell(46, 52, 12, 6), { base: pal.light, shade: pal.light, light: '#fff' }, box(46, 52, 12, 6), { shade: false });
  for (const side of [-1, 1]) {
    const f = P();
    f.moveTo(46 + side * 6, 32);
    f.quadraticCurveTo(46 + side * 9, 24, 46 + side * 4, 22);
    f.quadraticCurveTo(46 + side * 4, 28, 46 + side * 2, 32);
    f.closePath();
    k.fill(f, MOTIF[b], [40, 22, 12, 10]);
  }
  face(k, 45, 40, 0.95);
  g.save();
  g.globalAlpha = 0.35;
  k.fill(ell(50, 98, 18, 2), { base: INK, shade: INK, light: INK }, box(50, 98, 18, 2), { shade: false, ink: false });
  g.restore();
}

function mantis(k, pal, b) {
  const { g } = k;
  for (const [x0, x1] of [
    [54, 46],
    [62, 70],
    [66, 82],
  ]) {
    const l = tubePath([[[x0, 64], [x0 + (x1 - x0) * 0.4, 74], [x1, 80], [x1, 94]]], 1.8, 1.2);
    k.fill(l.path, darker(pal), [Math.min(x0, x1) - 3, 64, Math.abs(x1 - x0) + 6, 32]);
  }
  // wings: opaque, light, B-tinted veins
  for (const r of [0.15, -0.15]) {
    g.save();
    g.translate(62, 56);
    g.rotate(1.25 + r);
    k.fill(leafPath(12, 36), { base: mix(pal.light, MOTIF[b].base, 0.35), shade: mix(pal.light, MOTIF[b].base, 0.55), light: '#fff' }, [-6, -36, 12, 36]);
    g.restore();
  }
  k.fill(ell(72, 66, 15, 6.5, 0.35), pal, box(72, 66, 15, 6.5));
  k.fill(ell(52, 56, 7, 9, -0.4), pal, box(52, 56, 7, 9));
  // raptorial blade arms
  const arm = tubePath([[[48, 50], [40, 52], [34, 58], [36, 64]]], 2.4, 2);
  k.fill(arm.path, pal, [32, 48, 18, 18]);
  g.save();
  g.translate(36, 64);
  g.rotate(-2.4);
  k.fill(shardPath(5, 16), MOTIF[b], [-2.5, -16, 5, 16]);
  g.restore();
  const head = P();
  head.moveTo(36, 30);
  head.lineTo(52, 30);
  head.lineTo(44, 46);
  head.closePath();
  k.fill(head, pal, [36, 30, 16, 16]);
  for (const side of [-1, 1]) {
    const a = tubePath([[[44 + side * 3, 31], [44 + side * 6, 22], [44 + side * 10, 16], [44 + side * 14, 14]]], 0.9, 0.6);
    k.fill(a.path, pal, [30, 12, 30, 20]);
  }
  k.eyes(44, 35, 4.6, 2.6, { almond: 0.8, brow: 1, look: -1 });
}

function treant(k, pal, b) {
  const { g } = k;
  const bark = { base: mix(pal.base, BODY.earth.base, 0.5), shade: mix(pal.shade, BODY.earth.shade, 0.5), light: mix(pal.light, BODY.earth.light, 0.5) };
  for (const side of [-1, 0, 1]) {
    const r = tubePath([[[50 + side * 6, 82], [50 + side * 12, 88], [50 + side * 18, 92], [50 + side * 24, 95]]], 3.4, 1.2);
    k.fill(r.path, darker(bark), [26, 80, 48, 16]);
  }
  const trunk = P();
  trunk.moveTo(38, 44);
  trunk.bezierCurveTo(36, 62, 34, 76, 38, 88);
  trunk.lineTo(62, 88);
  trunk.bezierCurveTo(66, 76, 64, 62, 62, 44);
  trunk.closePath();
  k.fill(trunk, bark, [34, 44, 32, 44]);
  for (const side of [-1, 1]) {
    const arm = tubePath([[[50 + side * 11, 54], [50 + side * 20, 50], [50 + side * 26, 42], [50 + side * 30, 36]]], 3, 1.4);
    k.fill(arm.path, bark, [50 + Math.min(side * 11, side * 32), 34, 22, 22]);
    g.save();
    g.translate(50 + side * 30, 36);
    g.rotate(side * 0.6);
    k.fill(leafPath(8, 12), MOTIF.nature, [-4, -12, 8, 12]);
    g.restore();
  }
  // canopy crown: B's motif rings the crown
  const crown = P();
  for (const [x, y, r] of [
    [50, 26, 16],
    [36, 32, 11],
    [64, 32, 11],
    [42, 18, 10],
    [58, 18, 10],
  ])
    crown.moveTo(x + r, y), crown.arc(x, y, r, 0, TAU);
  k.fill(crown, { base: pal.base, shade: pal.shade, light: pal.light }, [26, 8, 48, 36]);
  motif(k, b, 3, 50, 12, 0.7);
  face(k, 50, 60, 0.95);
}

function humanoid(k, pal, b, a) {
  drawFusion(k, a, b);
}

export const BODY_PLANS = [
  { key: 'humanoid', name: 'Current: chibi biped', draw: humanoid, sample: ['fire', 'ice'], read: 'Two legs, two arms, upright', motion: 'Walk cycle', suits: '—', arc: 'Baseline; every fusion looks alike', ip: 'Digimon / generic' },
  { key: 'runner', name: 'Quadruped runner', draw: runner, sample: ['fire', 'wind'], read: 'Long horizontal body, 4 legs, tail up', motion: 'Bounding gallop, pounce', suits: 'Fire, Wind, Lightning', arc: 'Puppy → sleek hunter', ip: 'Avoid fire-fox and flame-mane horse looks' },
  { key: 'kaiju', name: 'Heavy biped (kaiju)', draw: kaiju, sample: ['fire', 'earth'], read: 'Forward lean, thick tail on the ground, back plates', motion: 'Slow stomp, tail sweep', suits: 'Fire, Earth', arc: 'Chubby → towering', ip: 'Avoid orange dragon-lizard with tail flame' },
  { key: 'golem', name: 'Golem brute', draw: golem, sample: ['earth', 'metal'], read: 'Huge shoulders and fists, tiny sunk head', motion: 'Knuckle-walk, ground slam', suits: 'Earth, Metal', arc: 'Pebble → walking fortress', ip: 'Avoid boulder-with-arms' },
  { key: 'raptor', name: 'Winged raptor', draw: raptor, sample: ['lightning', 'wind'], read: 'Wide wingspan, beak, fanned tail', motion: 'Hover-flap, dive', suits: 'Wind, Lightning, Fire', arc: 'Fledgling → storm bird', ip: 'Avoid the legendary-bird trio silhouettes' },
  { key: 'serpent', name: 'Serpent coil', draw: serpent, sample: ['poison', 'wind'], read: 'S-coil, frilled head, no limbs', motion: 'Slither, rear and strike', suits: 'Poison, Ice, Wind', arc: 'Noodle → sea dragon', ip: 'Avoid blue serpent with ear-wings and cobra hood patterns' },
  { key: 'wisp', name: 'Floating wisp', draw: wisp, sample: ['lightning', 'poison'], read: 'Big round head-body melting into a curl tail', motion: 'Float, drift, blink-dash', suits: 'Poison, Lightning, Ice', arc: 'Puff → spectral lord', ip: 'Avoid purple ghost-gas ball' },
  { key: 'bell', name: 'Jellyfish bell', draw: bell, sample: ['ice', 'poison'], read: 'Dome with scalloped hem, hanging tendrils', motion: 'Pulse-swim, sting', suits: 'Ice, Poison, Lightning', arc: 'Bubble → glowing medusa', ip: 'Avoid two-tone jellyfish with red gems' },
  { key: 'stag', name: 'Antlered stag', draw: stag, sample: ['ice', 'nature'], read: 'Tall thin legs, long neck, big antlers (B motif)', motion: 'Prance, antler charge', suits: 'Nature, Ice, Metal', arc: 'Fawn → majestic guardian', ip: 'Avoid seasonal deer forms' },
  { key: 'shell', name: 'Shell crawler', draw: shell, sample: ['earth', 'nature'], read: 'Low dome, peeking head, stubby legs', motion: 'Waddle, hide-and-spin', suits: 'Earth, Nature, Metal', arc: 'Hatchling → island turtle', ip: 'Avoid tree-on-back tortoise' },
  { key: 'manta', name: 'Manta glider', draw: manta, sample: ['ice', 'wind'], read: 'Flat diamond wings, whip tail, hovers', motion: 'Glide, bank, swoop', suits: 'Wind, Ice, Lightning', arc: 'Flutter → sky ray', ip: 'Low risk' },
  { key: 'mantis', name: 'Insectoid blade', draw: mantis, sample: ['wind', 'metal'], read: 'Thin segments, blade arms, wings, antennae', motion: 'Twitchy dash, slash', suits: 'Wind, Metal, Poison', arc: 'Grub → blade knight', ip: 'Avoid green scythe mantis' },
  { key: 'treant', name: 'Rooted treant', draw: treant, sample: ['metal', 'nature'], read: 'Trunk, root feet, round canopy crown', motion: 'Root-shuffle, sway', suits: 'Nature, Earth', arc: 'Sapling → ancient grove', ip: 'Avoid stump with arms' },
];

/** Render one plan with a fusion's colours: { canvas, unit, pad } like renderCreature. */
export function renderPlan(plan, a, b, style = 'sticker', unit = 2.6) {
  if (style === 'pixel') {
    const G = 44;
    const c = makeCanvas(G + 2, G + 2);
    const g = c.getContext('2d');
    g.translate(1, 1);
    g.scale(G / 100, G / 100);
    plan.draw(kit(g, 'pixel'), fusionPalette(a, b), b, a);
    const pal = fusionPalette(a, b);
    quantize(c, [INK, '#ffffff', GOLD, '#d49b1f', '#ff8fa3', pal.base, pal.shade, pal.light, MOTIF[b].base, MOTIF[b].shade, MOTIF[b].light, MOTIF[b].core, BODY.earth.base, BODY.earth.shade, MOTIF.nature.base, MOTIF.nature.shade, MOTIF.earth.base, mix(pal.base, BODY.earth.base, 0.45), mix(pal.base, BODY.earth.base, 0.5)]);
    return { canvas: c, unit: G / 100, pad: 1 };
  }
  const padU = 8;
  const W = (100 + padU * 2) * unit;
  const c = makeCanvas(W, W);
  const g = c.getContext('2d');
  g.translate(padU * unit, padU * unit);
  g.scale(unit, unit);
  plan.draw(kit(g, style === 'vinyl' ? 'vinyl' : 'sticker'), fusionPalette(a, b), b, a);
  if (style === 'vinyl') return { canvas: c, unit, pad: padU * unit };
  return { canvas: stickerize(c, 3 * unit, 2.2 * unit), unit, pad: padU * unit };
}

/** A solid silhouette mask, normalised to its bounding box (for the divergence score). */
export function silhouetteMask(canvas, n = 48) {
  const src = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let x0 = canvas.width;
  let y0 = canvas.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++)
      if (src.data[(y * canvas.width + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
  const m = makeCanvas(n, n);
  const g = m.getContext('2d');
  // compare at real on-field size: every plan shares the same canvas box, so size,
  // height and footprint count (a low shell vs a tall stag), not just outline
  void x0, y0, x1, y1;
  g.drawImage(canvas, 0, 0, n, n);
  const d = g.getImageData(0, 0, n, n).data;
  const out = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) out[i] = d[i * 4 + 3] > 100 ? 1 : 0;
  return out;
}

export function iou(a, b) {
  let i = 0;
  let u = 0;
  for (let k = 0; k < a.length; k++) {
    i += a[k] & b[k];
    u += a[k] | b[k];
  }
  return u ? i / u : 0;
}

export { flamePath, zigPath };

/** Proposed body plan per fusion (10 plans, assigned by the pair; pending sign-off). */
export const PROPOSED_PLAN = {
  'fire+ice': 'runner',
  'fire+wind': 'runner',
  'earth+wind': 'runner',
  'fire+earth': 'kaiju',
  'lightning+earth': 'kaiju',
  'poison+earth': 'kaiju',
  'earth+metal': 'golem',
  'fire+metal': 'golem',
  'ice+earth': 'golem',
  'fire+lightning': 'raptor',
  'lightning+wind': 'raptor',
  'lightning+metal': 'raptor',
  'ice+poison': 'serpent',
  'poison+wind': 'serpent',
  'ice+lightning': 'serpent',
  'fire+poison': 'wisp',
  'lightning+poison': 'wisp',
  'poison+nature': 'wisp',
  'ice+nature': 'stag',
  'lightning+nature': 'stag',
  'ice+metal': 'stag',
  'earth+nature': 'shell',
  'metal+nature': 'shell',
  'fire+nature': 'shell',
  'ice+wind': 'manta',
  'wind+nature': 'manta',
  'wind+metal': 'mantis',
  'poison+metal': 'mantis',
};
