// Dev art sheet (art.html): every creature in every style, at real and large sizes.
import { renderCreature, renderPortrait } from './creatures.js';
import { ELEMENT_ORDER } from './tokens.js';

const root = document.getElementById('sheet');
const section = (title) => {
  const h = document.createElement('h2');
  h.textContent = title;
  const row = document.createElement('div');
  row.className = 'row';
  root.append(h, row);
  return row;
};
const show = (row, canvas, label, h, pixel = false) => {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  c.getContext('2d').drawImage(canvas, 0, 0);
  c.style.height = `${h}px`;
  if (pixel) c.className = 'px';
  const t = document.createElement('span');
  t.textContent = label;
  cell.append(c, t);
  row.append(cell);
};

await document.fonts.ready;
for (const style of ['sticker', 'pixel']) {
  const px = style === 'pixel';
  const r = section(`Babies, ${style} (16 → 32 → 64 → 128)`);
  for (const el of ELEMENT_ORDER) for (let s = 0; s < 4; s++) show(r, renderCreature({ kind: 'baby', el, stage: s }, style).canvas, `${el} ${16 << s}`, 92, px);
  const e = section(`Eggs, ${style} (2, 4, 8)`);
  for (const tier of [1, 2, 3]) show(e, renderCreature({ kind: 'egg', tier }, style).canvas, `egg ${2 ** tier}`, 80, px);
  const f = section(`Fusions, ${style} (body from A, crest and tail from B)`);
  for (const [a, b, leg] of [['fire', 'ice'], ['fire', 'lightning'], ['earth', 'nature'], ['lightning', 'metal', true], ['ice', 'wind'], ['poison', 'nature'], ['wind', 'metal'], ['metal', 'fire']])
    show(f, renderCreature({ kind: 'fusion', a, b, legendary: !!leg }, style).canvas, `${a}+${b}${leg ? ' legend' : ''}`, 130, px);
  show(f, renderCreature({ kind: 'halo', apex: 'ice' }, style).canvas, 'halo: Timestop', 130, px);
}
const p = section('Namecard portraits, soft vinyl (code stand-ins; retired from the game 2026-10-23)');
for (const [a, b, leg, apex] of [['fire', 'ice'], ['fire', 'lightning'], ['earth', 'nature'], ['lightning', 'metal', true, 'ice'], ['ice', 'wind'], ['poison', 'nature']])
  show(p, renderPortrait(a, b, { legendary: !!leg, apex }), `${a}+${b}`, 140);
const v = section('Fusions, vinyl full body');
for (const [a, b] of [['fire', 'ice'], ['earth', 'nature']]) show(v, renderCreature({ kind: 'fusion', a, b }, 'vinyl').canvas, `${a}+${b}`, 150);
