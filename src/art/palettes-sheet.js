// palettes.html: the eight element palettes (hard limit) as a swatch chart.
import { ELEMENT_PALETTES, PALETTE_ORDER, UNIVERSAL } from './palettes.js';
import { glyphPath } from './glyphs.js';

await document.fonts.ready;
const W = 1200;
const ROW = 118;
const TOP = 132;
const H = TOP + PALETTE_ORDER.length * ROW + 130;
const dpr = 2;
const c = document.getElementById('c');
c.width = W * dpr;
c.height = H * dpr;
const g = c.getContext('2d');
g.scale(dpr, dpr);
g.fillStyle = '#17203f';
g.fillRect(0, 0, W, H);
const text = (t, x, y, size = 13, color = '#fffaf2', weight = 800, font = 'Nunito', align = 'left') => {
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(t, x, y);
};
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
text('Element palettes: hard limit', 28, 34, 26, '#fffaf2', 800, '"Baloo 2"');
text('A creature uses only its element’s colours (up to 4 of the 6) plus the 4 universal colours. Fusions: body from parent A’s palette, at most 2 accents from parent B’s.', 28, 66, 13, '#c9d3ff', 700);
text('Each row runs dark → light for shading, with accent hues for variety. KEY = the element’s one identity colour (flat icons, badges, UI).', 28, 88, 13, '#c9d3ff', 700);

PALETTE_ORDER.forEach((el, i) => {
  const p = ELEMENT_PALETTES[el];
  const y = TOP + i * ROW;
  g.fillStyle = '#1f2a55';
  g.beginPath();
  g.roundRect(20, y, W - 40, ROW - 12, 14);
  g.fill();
  // glyph badge in the element's base colour
  const base = p.colors[1].hex;
  g.save();
  g.beginPath();
  g.arc(64, y + 53, 30, 0, Math.PI * 2);
  g.fillStyle = base;
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#2b1d2e';
  g.stroke();
  g.translate(64 - 22, y + 53 - 22);
  g.scale(44, 44);
  g.lineWidth = 0.12;
  g.lineJoin = 'round';
  g.stroke(glyphPath(el));
  g.fillStyle = '#ffffff';
  g.fill(glyphPath(el), 'evenodd');
  g.restore();
  text(el[0].toUpperCase() + el.slice(1), 110, y + 34, 20, '#ffe27a', 800, '"Baloo 2"');
  text(p.animal, 110, y + 58, 13, '#fffaf2');
  text(p.mood, 110, y + 78, 12, '#9fb0ff', 700);
  p.colors.forEach((col, j) => {
    const x = 300 + j * 145;
    if (col.hex.toUpperCase() === p.key.toUpperCase()) {
      // the key (identity) colour gets a gold ring and a tag
      g.lineWidth = 4;
      g.strokeStyle = '#ffe27a';
      g.beginPath();
      g.roundRect(x - 4, y + 8, 140, 64, 13);
      g.stroke();
    }
    g.fillStyle = col.hex;
    g.beginPath();
    g.roundRect(x, y + 12, 132, 56, 10);
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.stroke();
    const ink = lum(col.hex) > 0.6 ? '#2b1d2e' : '#fffaf2';
    text(col.hex.toUpperCase(), x + 10, y + 30, 13, ink, 800, 'ui-monospace, Menlo, monospace');
    if (col.hex.toUpperCase() === p.key.toUpperCase()) text('KEY', x + 10, y + 54, 12, ink, 800);
    text(col.role, x + 2, y + 84, 11.5, '#c9d3ff', 700);
  });
});
const uy = TOP + PALETTE_ORDER.length * ROW + 10;
text('Universal', 28, uy + 14, 18, '#ffe27a', 800, '"Baloo 2"');
text('allowed for every creature', 28, uy + 38, 12, '#9fb0ff', 700);
UNIVERSAL.forEach((u, j) => {
  const x = 300 + j * 145;
  g.fillStyle = u.hex;
  g.beginPath();
  g.roundRect(x, uy, 132, 44, 10);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.3)';
  g.lineWidth = 2;
  g.stroke();
  text(u.hex, x + 10, uy + 22, 13, lum(u.hex) > 0.6 ? '#2b1d2e' : '#fffaf2', 800, 'ui-monospace, Menlo, monospace');
  text(u.role, x + 2, uy + 60, 11.5, '#c9d3ff', 700);
});
document.body.dataset.ready = '1';
if (new URLSearchParams(location.search).has('capture')) {
  fetch('/__capture?name=element-palettes', { method: 'POST', body: c.toDataURL('image/png') }).then((r) => (document.body.dataset.saved = r.ok ? 'yes' : 'no'));
}
