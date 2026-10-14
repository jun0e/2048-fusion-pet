// Fusion body-plan candidates (fusion-shapes.html): each plan as a black silhouette
// (large, and at its real one-cell size), in colour, with a divergence score: the
// highest silhouette overlap (IoU) with any other plan. Lower = more distinct.
import { BODY_PLANS, renderPlan, silhouetteMask, iou } from './bodyplans.js';
import { FUSIONS, fusionKey } from '../sim/classes.js';
import { petName } from './tokens.js';
import { makeCanvas } from './creatures.js';

await document.fonts.ready;
const FONT = 'Nunito, system-ui, sans-serif';
const HEAD = '"Baloo 2", Nunito, sans-serif';
const COLS = 4;
const CW = 340;
const CH = 360;
const PAD = 24;
const TOP = 120;
const plans = BODY_PLANS.map((p) => {
  const r = renderPlan(p, ...p.sample);
  return { ...p, r, mask: silhouetteMask(r.canvas) };
});
for (const p of plans) {
  let best = 0;
  let near = '';
  for (const q of plans) {
    if (q === p) continue;
    const v = iou(p.mask, q.mask);
    if (v > best) {
      best = v;
      near = q.name;
    }
  }
  p.maxIou = best;
  p.near = near;
}
const rows = Math.ceil(plans.length / COLS);
const dpr = 2;
const W = PAD * 2 + COLS * CW + (COLS - 1) * 16;
const H = TOP + rows * (CH + 16) + PAD;
const c = document.getElementById('sheet');
c.width = W * dpr;
c.height = H * dpr;
const g = c.getContext('2d');
g.scale(dpr, dpr);
g.fillStyle = '#17203f';
g.fillRect(0, 0, W, H);
const text = (t, x, y, { size = 12, color = '#fffaf2', font = FONT, weight = 800, align = 'left' } = {}) => {
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(t, x, y);
};
text('Fusion body-plan candidates: divergent silhouettes', PAD, 34, { size: 26, font: HEAD });
text('Same palette and slot rule (fusion colour dominant, parent B gives crest/tail). Black = silhouette test; small black = real size on the field (1 cell).', PAD, 64, { size: 13, color: '#c9d3ff', weight: 700 });
text('Overlap = highest silhouette IoU with any other plan, compared at real field size (lower is more distinct). Green < 0.60, amber < 0.70, red = a near twin: never give two such plans to related fusions.', PAD, 84, { size: 13, color: '#c9d3ff', weight: 700 });

function sil(src, color = '#0b0f1e') {
  const s = makeCanvas(src.width, src.height);
  const x = s.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, s.width, s.height);
  return s;
}

plans.forEach((p, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = PAD + col * (CW + 16);
  const y = TOP + row * (CH + 16);
  g.fillStyle = p.key === 'humanoid' ? '#2a2a4a' : '#1f2a55';
  g.beginPath();
  g.roundRect(x, y, CW, CH, 16);
  g.fill();
  const num = p.key === 'humanoid' ? '0' : String(i);
  text(`${num}. ${p.name}`, x + 14, y + 22, { size: 17, font: HEAD, color: p.key === 'humanoid' ? '#ff9db0' : '#ffe27a' });
  // light panel behind the silhouettes so black reads
  g.fillStyle = '#e9e4f5';
  g.beginPath();
  g.roundRect(x + 12, y + 40, 150, 150, 10);
  g.fill();
  const S = sil(p.r.canvas);
  g.drawImage(S, x + 12, y + 40, 150, 150);
  // real size: canvas 1.42 cells tall at ~60 px per cell
  const small = 1.42 * 60;
  g.fillStyle = '#e9e4f5';
  g.beginPath();
  g.roundRect(x + 12, y + 196, 150, 98, 10);
  g.fill();
  g.drawImage(S, x + 12 + 75 - small / 2, y + 196 + 49 - small / 2 + 6, small, small);
  g.strokeStyle = 'rgba(43,29,46,0.35)';
  g.strokeRect(x + 12 + 75 - 30, y + 196 + 98 - 66, 60, 60);
  text('1 cell', x + 18, y + 284, { size: 10, color: '#2b1d2e' });
  g.drawImage(p.r.canvas, x + 170, y + 40, 160, 160);
  const [a, b] = p.sample;
  const f = FUSIONS[fusionKey(a, b)];
  text(`${petName(a, b)} · ${f.name}`, x + 250, y + 206, { size: 12, align: 'center' });
  const lines = [
    ['Reads as', p.read],
    ['Motion', p.motion],
    ['Suits', p.suits],
    ['Arc', p.arc],
    ['IP care', p.ip],
  ];
  lines.forEach(([k, v], j) => {
    const yy = y + 226 + j * 15;
    text(k, x + 170, yy, { size: 10.5, color: '#9fb0ff' });
    g.font = `700 10.5px ${FONT}`;
    let t = v;
    while (g.measureText(t).width > 112 && t.length > 4) t = t.slice(0, -2);
    text(t === v ? v : t + '…', x + 222, yy, { size: 10.5, weight: 700, color: '#e6ebff' });
  });
  const ok = p.maxIou < 0.6;
  g.fillStyle = ok ? '#2e8b57' : p.maxIou < 0.7 ? '#b8860b' : '#c0392b';
  g.beginPath();
  g.roundRect(x + 12, y + 304, CW - 24, 42, 10);
  g.fill();
  text(`Overlap ${p.maxIou.toFixed(2)} · closest: ${p.near}`, x + 24, y + 325, { size: 12.5 });
});
document.body.dataset.ready = '1';
window.__plans = plans.map((p) => ({ key: p.key, maxIou: +p.maxIou.toFixed(3), near: p.near }));
window.__matrix = Object.fromEntries(plans.map((p) => [p.key, Object.fromEntries(plans.map((q) => [q.key, +iou(p.mask, q.mask).toFixed(2)]))]));
if (new URLSearchParams(location.search).has('capture')) {
  fetch('/__capture?name=fusion-silhouettes', { method: 'POST', body: c.toDataURL('image/png') }).then((r) => (document.body.dataset.saved = r.ok ? 'yes' : 'no'));
}
