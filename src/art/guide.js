// Key-visual proportion guideline (kv-guide.html): the numbers an artist (or a
// Gemini prompt) must hit, drawn over the actual creatures. Values come from the
// same constants the game uses, so the guide and the demo cannot disagree.
import { renderCreature, renderPortrait, FUSION_PROPORTIONS } from './creatures.js';
import { composeTileCanvas, cropFor } from './index.js';
import { INK, CREAM, GOLD } from './tokens.js';

const FONT = 'Nunito, system-ui, sans-serif';
const HEAD = '"Baloo 2", Nunito, sans-serif';
const GUIDE = '#ff5ca8'; // guide lines: hot pink, never used by the art
const GUIDE2 = '#3fd0ff';
const root = document.getElementById('guide');

function panel(title, sub, w, h) {
  const wrap = document.createElement('section');
  wrap.className = 'panel';
  wrap.innerHTML = `<h2>${title}</h2><p>${sub}</p>`;
  const c = document.createElement('canvas');
  const dpr = 2;
  c.width = w * dpr;
  c.height = h * dpr;
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  wrap.appendChild(c);
  root.appendChild(wrap);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  return g;
}

function label(g, text, x, y, { color = CREAM, size = 12, align = 'left', bold = true, font = FONT } = {}) {
  g.font = `${bold ? 800 : 700} ${size}px ${font}`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function hline(g, x0, x1, y, text, color = GUIDE, tx = x1 + 8) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.setLineDash([5, 4]);
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x1, y);
  g.stroke();
  g.restore();
  if (text) label(g, text, tx, y, { color });
}

function bracket(g, x, y0, y1, text, color = GUIDE2, side = 1) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 5 * side, y0);
  g.lineTo(x, y0);
  g.lineTo(x, y1);
  g.lineTo(x - 5 * side, y1);
  g.stroke();
  g.restore();
  label(g, text, x + 8 * side, (y0 + y1) / 2, { color, align: side > 0 ? 'left' : 'right' });
}

function grid(g, x, y, s) {
  // the 100-unit construction box, a line every 10 units
  g.save();
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    g.beginPath();
    g.moveTo(x + i * 10 * s, y);
    g.lineTo(x + i * 10 * s, y + 100 * s);
    g.moveTo(x, y + i * 10 * s);
    g.lineTo(x + 100 * s, y + i * 10 * s);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.strokeRect(x, y, 100 * s, 100 * s);
  g.restore();
}

/** Draw a rendered creature so that its 100-unit box lands at (x, y) with s px per unit. */
function placeCreature(g, r, x, y, s) {
  const k = s / r.unit;
  g.drawImage(r.canvas, x - r.pad * k, y - r.pad * k, r.canvas.width * k, r.canvas.height * k);
}

await document.fonts.ready;

// 1. growth arc at true relative scale -----------------------------------------------------------
{
  const cell = 96;
  const W = 1180;
  const g = panel(
    'Growth arc at true scale',
    'One design per creature. Babies live in tiles and grow by motif count and head share; a fusion pet stays on its tile too, and from 1024 its summon sends it to the field for a while at about one cell tall (its tile shows a den meanwhile); at 4096 the pure form wears its element\'s halo. Cute-funny → cool → serene.',
    W,
    300,
  );
  const base = 200;
  const items = [
    { t: { tier: 1, cls: {} }, k: 'Egg 2–8', s: 'promise' },
    { t: { tier: 4, cls: { element: 'fire' } }, k: '16 hatchling', s: 'head 39% · 1 motif' },
    { t: { tier: 5, cls: { element: 'fire' } }, k: '32', s: 'head 42% · 2 motifs' },
    { t: { tier: 6, cls: { element: 'fire' } }, k: '64', s: 'head 45% · faint brow' },
    { t: { tier: 7, cls: { element: 'fire' } }, k: '128', s: 'head 48% · 4 motifs' },
  ];
  let x = 20;
  for (const it of items) {
    const c = composeTileCanvas(it.t, 'sticker');
    g.drawImage(c, x, base - cell, cell, cell);
    label(g, it.k, x + cell / 2, base + 22, { align: 'center', size: 14, font: HEAD });
    label(g, it.s, x + cell / 2, base + 40, { align: 'center', size: 11, color: '#c9d3ff', bold: false });
    x += cell + 36;
  }
  // den (v2: while its pet is summoned out) + the pet on the field + a pure form
  const den = composeTileCanvas({ tier: 10, cls: { element: 'fire', fusion: 'ice', buffs: {} }, summon: { phase: 'act' } }, 'sticker');
  g.drawImage(den, x, base - cell, cell, cell);
  label(g, '1024 den', x + cell / 2, base + 22, { align: 'center', size: 14, font: HEAD });
  label(g, 'its pet is summoned out', x + cell / 2, base + 40, { align: 'center', size: 11, color: '#c9d3ff', bold: false });
  x += cell + 44;
  const fu = renderCreature({ kind: 'fusion', a: 'fire', b: 'ice' }, 'sticker');
  const fs = (cell * 1.42) / 116; // the roaming canvas is 1.42 cells tall
  placeCreature(g, fu, x, base - 95 * fs, fs);
  label(g, 'Fusion (summoned)', x + 50 * fs, base + 22, { align: 'center', size: 14, font: HEAD });
  label(g, '≈1.05 cell · head 35%', x + 50 * fs, base + 40, { align: 'center', size: 11, color: '#c9d3ff', bold: false });
  hline(g, x - 6, x + 100 * fs, base - cell, '1 cell', GUIDE2, x + 100 * fs + 4);
  x += 100 * fs + 56;
  const lg = renderCreature({ kind: 'fusion', a: 'lightning', b: 'metal', legendary: true }, 'sticker');
  const ls = (cell * 1.62) / 116;
  const halo = renderCreature({ kind: 'halo', apex: 'ice' }, 'sticker');
  const hs = (cell * 1.05) / 116;
  placeCreature(g, halo, x + 50 * ls - 50 * hs, base - 95 * ls - 18 - 50 * hs + 6, hs);
  placeCreature(g, lg, x, base - 95 * ls - 18, ls);
  g.fillStyle = 'rgba(20,10,40,0.35)';
  g.beginPath();
  g.ellipse(x + 50 * ls, base - 4, 26, 7, 0, 0, Math.PI * 2);
  g.fill();
  label(g, 'Legendary 4096', x + 50 * ls, base + 22, { align: 'center', size: 14, font: HEAD });
  label(g, '≈1.2 cell + halo · floats', x + 50 * ls, base + 40, { align: 'center', size: 11, color: '#c9d3ff', bold: false });
}

// 2. baby construction -----------------------------------------------------------------------
{
  const s = 3.4;
  const g = panel('Baby construction (16 → 128)', 'All babies share one round "bean" body; the element lives in one motif. Units are the 100-unit drawing box.', 690, 430);
  const x = 96;
  const y = 40;
  grid(g, x, y, s);
  placeCreature(g, renderCreature({ kind: 'baby', el: 'fire', stage: 0 }, 'sticker'), x, y, s);
  const R = x + 100 * s;
  hline(g, x, R, y + 13 * s, 'motif zone top (128: ~13)');
  hline(g, x, R, y + 34 * s, 'head/body top 34');
  hline(g, x, R, y + 59 * s, 'eye line 59 (eyes Ø15, 25 apart)');
  hline(g, x, R, y + 70 * s, 'mouth 70, blush 69');
  hline(g, x, R, y + 76 * s, 'tile crop: top 76% shows', GOLD);
  hline(g, x, R, y + 93 * s, 'feet 93–97');
  bracket(g, x - 12, y + 34 * s, y + 93 * s, '1 head tall', GUIDE2, -1);
  g.save();
  g.strokeStyle = GUIDE2;
  g.setLineDash([3, 3]);
  g.strokeRect(x + 18 * s, y + 34 * s, 64 * s, 59 * s);
  g.restore();
  label(g, 'width 64 (18–82), arms to 13–87', x + 50 * s, y + 100 * s + 24, { align: 'center', color: GUIDE2 });
}

// 3. fusion construction ----------------------------------------------------------------------
{
  const s = 3.4;
  const { lift, headScale, neckY } = FUSION_PROPORTIONS;
  const g = panel('Fusion construction (256+)', `Body and silhouette from parent A, crest and tail from parent B. Head drawn in a 41-unit box, scaled ×${headScale} about the neck.`, 690, 430);
  const x = 96;
  const y = 40;
  grid(g, x, y, s);
  placeCreature(g, renderCreature({ kind: 'fusion', a: 'fire', b: 'ice' }, 'sticker'), x, y, s);
  const R = x + 100 * s;
  const neck = neckY - lift;
  const headTop = neck - 40 * headScale;
  const eye = neck - (neckY - 34) * headScale;
  hline(g, x, R, y + headTop * s, `head top ${headTop.toFixed(0)}`);
  hline(g, x, R, y + eye * s, `eye line ${eye.toFixed(0)}, almond, tilt 13°`);
  hline(g, x, R, y + neck * s, `neck ${neck}`);
  hline(g, x, R, y + (74 - lift) * s, `hips / legs start ${74 - lift}`);
  hline(g, x, R, y + 95 * s, 'feet 95');
  const H = 95 - headTop;
  bracket(g, x - 12, y + headTop * s, y + neck * s, `head ${Math.round(((neck - headTop) / H) * 100)}%`, GUIDE2, -1);
  bracket(g, x - 12, y + (74 - lift) * s, y + 95 * s, `legs ${Math.round(((95 - (74 - lift)) / H) * 100)}%`, GUIDE2, -1);
  label(g, 'target: head 30–35%, limbs 35–40% (≈2.9 heads tall)', x + 50 * s, y + 100 * s + 24, { align: 'center', color: GUIDE2 });
}

// 4. tile layout --------------------------------------------------------------------------------
{
  const T = 300;
  const g = panel('Tile layout (map)', 'The number owns the top of the square; the creature peeks over the bottom sill. Eyes never go under the number.', 580, 400);
  const x = 40;
  const y = 40;
  const tile = composeTileCanvas({ tier: 5, cls: { element: 'ice' } }, 'sticker');
  g.drawImage(tile, x, y, T, T);
  const R = x + T;
  hline(g, x, R, y + T * 0.05, 'plate inset 5%');
  hline(g, x, R, y + T * 0.33, 'number centre 33% (Baloo 2 800)');
  hline(g, x, R, y + T * 0.55, 'number zone ends 55%', GOLD);
  hline(g, x, R, y + T * 0.8, 'eyes ≈ 80% (always below the number)');
  hline(g, x, R, y + T * 0.93, 'creature sits on 93% (bottom sill)');
  g.save();
  g.strokeStyle = GUIDE2;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x + T * 0.84, y + T * 0.84, T * 0.106, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  label(g, 'glyph badge r 10.6%', x + T * 0.84, y + T + 14, { align: 'center', color: GUIDE2 });
  label(g, 'numeral size (of tile): 1–2 digits 39% · 3 digits 31% · 4 digits 26%', x, y + T + 36, { color: '#c9d3ff', bold: false });
  label(g, 'plum fill #2b1d2e + cream stroke 26% of size → 4.95–13.4:1 on every plate', x, y + T + 54, { color: '#c9d3ff', bold: false });
}

// 5. roaming scale --------------------------------------------------------------------------------
{
  const cell = 88;
  const g = panel('Roaming scale on the field', 'Pets must stay readable among ~0.5-cell foes without hiding them: fusions ≈1.05 cell, legends ≈1.2 cell + halo (1.5 total). Ally cues: cream rim, element ground ring; foes get neither.', 690, 400);
  const base = 330;
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i <= 7; i++) {
    g.beginPath();
    g.moveTo(30 + i * cell, base - 3.2 * cell);
    g.lineTo(30 + i * cell, base);
    g.stroke();
  }
  for (let j = 0; j <= 3; j++) {
    g.beginPath();
    g.moveTo(30, base - j * cell);
    g.lineTo(30 + 7 * cell, base - j * cell);
    g.stroke();
  }
  label(g, '1 cell', 30 + cell / 2, base + 14, { align: 'center', color: GUIDE2 });
  // a foe at 0.5 cell, drawn as the game's foe silhouette stand-in
  g.fillStyle = '#ff9db0';
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(30 + cell * 1.5, base - cell * 0.25, cell * 0.25, cell * 0.25, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  label(g, 'foe 0.5', 30 + cell * 1.5, base + 14, { align: 'center' });
  const fu = renderCreature({ kind: 'fusion', a: 'earth', b: 'nature' }, 'sticker');
  const fs = (cell * 1.42) / 116;
  g.save();
  g.strokeStyle = '#2e8b57';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(30 + cell * 3, base - 4, cell * 0.62, cell * 0.2, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  placeCreature(g, fu, 30 + cell * 3 - 50 * fs, base - 95 * fs, fs);
  label(g, 'fusion ≈1.05', 30 + cell * 3, base + 14, { align: 'center' });
  const lg = renderCreature({ kind: 'fusion', a: 'lightning', b: 'metal', legendary: true }, 'sticker');
  const ls = (cell * 1.62) / 116;
  const halo = renderCreature({ kind: 'halo', apex: 'ice' }, 'sticker');
  const hs = (cell * 1.05) / 116;
  const lx = 30 + cell * 5.2;
  placeCreature(g, halo, lx - 50 * hs, base - 95 * ls - 14 - 52 * hs, hs);
  placeCreature(g, lg, lx - 50 * ls, base - 95 * ls - 14, ls);
  g.fillStyle = 'rgba(20,10,40,0.4)';
  g.beginPath();
  g.ellipse(lx, base - 3, cell * 0.36, cell * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  label(g, 'legend ≈1.2 + halo, floats', lx, base + 14, { align: 'center' });
}

// 6. namecard portrait ---------------------------------------------------------------------------
{
  const S = 260;
  const g = panel('Namecard portrait (vinyl, retired 2026-10-23)', 'The game’s namecards now show the pet’s own sticker on a flat 2D plate. Kept for the record: head-and-shoulders bust, 3/4 facing the field, warm key light upper-left, the element aura as the rim light.', 580, 400);
  const x = 40;
  const y = 40;
  g.drawImage(renderPortrait('fire', 'ice', { size: 512 }), x, y, S, S);
  g.save();
  g.strokeStyle = CREAM;
  g.lineWidth = 4;
  g.strokeRect(x, y, S, S);
  g.restore();
  const R = x + S;
  hline(g, x, R, y + S * 0.12, 'crest may touch the top edge');
  hline(g, x, R, y + S * 0.45, 'eye line ≈ 45%');
  hline(g, x, R, y + S * 0.72, 'chin ≈ 72%: head fills ~60% of height');
  hline(g, x, R, y + S * 0.95, 'shoulders at the bottom edge');
  // light arrows
  g.save();
  g.strokeStyle = GOLD;
  g.fillStyle = GOLD;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - 26, y - 22);
  g.lineTo(x + 20, y + 24);
  g.stroke();
  g.restore();
  label(g, 'key light', x - 20, y - 28, { color: GOLD });
  label(g, 'card at rest 56–64 pt · cut-in 132 pt · plate painted in (no keying)', x, y + S + 22, { color: '#c9d3ff', bold: false });
  label(g, 'legend: low camera, backlight halo in the apex colour, gold frame (no holo foil)', x, y + S + 40, { color: '#c9d3ff', bold: false });
}

// 7. line weights -------------------------------------------------------------------------------
{
  const g = panel('Line and colour rules', 'Measured on the final display size, not on the generated image.', 1180, 150);
  const rows = [
    ['Outer outline', 'plum #2b1d2e, 3 units (≈1.5–2 pt on screen)', INK],
    ['Sticker rim', 'cream #fffaf2, 2.2 units outside the outline (≈1–1.5 pt); tiles and roaming only', CREAM],
    ['Inner lines', 'plum, 2.3 units; one hard cel tone, light from upper-left', '#7a6a8a'],
    ['Palette', '4–5 colours + outline per creature; fusions 60% fusion colour / 30% motif parent / 10% accent; legend adds one gold', GOLD],
    ['Foes', 'dark outline, no cream rim, red-tinted shadow: friend vs foe by shape and value, not hue', '#ff6b6b'],
  ];
  rows.forEach(([k, v, c], i) => {
    const yy = 24 + i * 24;
    g.fillStyle = c;
    g.fillRect(20, yy - 7, 26, 14);
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.strokeRect(20, yy - 7, 26, 14);
    label(g, k, 58, yy, { size: 13 });
    label(g, v, 190, yy, { size: 13, color: '#c9d3ff', bold: false });
  });
}

document.body.dataset.ready = '1';

// ?capture: stitch every panel into one PNG and save it through the dev server
if (new URLSearchParams(location.search).has('capture')) {
  const panels = [...document.querySelectorAll('.panel')];
  const dpr = 2;
  const pad = 24 * dpr;
  const gap = 18 * dpr;
  const W = 1520 * dpr;
  // flow the panels into rows like the page does
  const rows = [];
  let row = [];
  let rw = 0;
  for (const p of panels) {
    const c = p.querySelector('canvas');
    const w = c.width + 28 * dpr;
    if (rw + w > W - pad * 2 && row.length) {
      rows.push(row);
      row = [];
      rw = 0;
    }
    row.push(p);
    rw += w + gap;
  }
  rows.push(row);
  const head = 80 * dpr;
  const rowH = rows.map((r) => Math.max(...r.map((p) => p.querySelector('canvas').height + 72 * dpr)));
  const out = document.createElement('canvas');
  out.width = W;
  out.height = head + rowH.reduce((a, b) => a + b + gap, 0) + pad;
  const g = out.getContext('2d');
  g.fillStyle = '#17203f';
  g.fillRect(0, 0, out.width, out.height);
  g.scale(dpr, dpr);
  label(g, '2048 Fusion Pet: key visual proportion guide', 24, 30, { size: 26, font: HEAD });
  label(g, 'Map tiles, roaming fusions and (since 2026-10-23) namecards in sticker style. Pink = guide lines, blue = ratios.', 24, 58, { size: 13, color: '#c9d3ff', bold: false });
  let y = head / dpr;
  rows.forEach((r, i) => {
    let x = 24;
    for (const p of r) {
      const c = p.querySelector('canvas');
      const w = c.width / dpr + 28;
      const h = rowH[i] / dpr;
      g.fillStyle = '#1f2a55';
      g.beginPath();
      g.roundRect(x, y, w, h, 16);
      g.fill();
      label(g, p.querySelector('h2').textContent, x + 14, y + 20, { size: 17, color: '#ffe27a', font: HEAD });
      // wrap the subtitle to the panel width (two lines at most)
      g.font = `700 11.5px ${FONT}`;
      const words = p.querySelector('p').textContent.split(' ');
      const lines = [''];
      for (const wd of words) {
        const t = lines.at(-1) ? `${lines.at(-1)} ${wd}` : wd;
        if (g.measureText(t).width > w - 28 && lines.at(-1)) lines.push(wd);
        else lines[lines.length - 1] = t;
      }
      lines.slice(0, 2).forEach((ln, k) => label(g, ln, x + 14, y + 40 + k * 15, { size: 11.5, color: '#c9d3ff', bold: false }));
      g.drawImage(c, x + 14, y + 62, c.width / dpr, c.height / dpr);
      x += w + gap / dpr;
    }
    y += rowH[i] / dpr + gap / dpr;
  });
  fetch('/__capture?name=proportion-guide', { method: 'POST', body: out.toDataURL('image/png') }).then((r) => (document.body.dataset.saved = r.ok ? 'yes' : 'no'));
}
