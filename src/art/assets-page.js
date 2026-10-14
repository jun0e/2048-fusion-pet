// assets.html: every asset in the production list with its current image (code-drawn
// stand-ins, procedural effects, captures), filterable by category, priority and text.
// Thumbnails render lazily as cards scroll into view.
import { buildAssetRows } from './asset-catalog.js';
import { renderCreature, renderPortrait, makeCanvas } from './creatures.js';
import { composeTileCanvas, plateCanvas } from './index.js';
import { BODY_PLANS, PROPOSED_PLAN, renderPlan } from './bodyplans.js';
import { drawBadge } from './glyphs.js';
import { INK, CREAM, GOLD } from './tokens.js';
import { ELEMENTS, FUSIONS, fusionKey } from '../sim/classes.js';
import { enemyTex, projTex, boomFrames, statusTex, iconTex, softDot, sparkTex, ringTex, coinTex, shadowTex, portalTex } from '../render/textures.js';

await document.fonts.ready;
const rows = buildAssetRows(0.0336);
const PRI_COLOR = { P0: 'var(--p0)', P1: 'var(--p1)', P2: 'var(--p2)', P3: 'var(--p3)' };
const PLAN = Object.fromEntries(BODY_PLANS.map((p) => [p.key, p]));
const log2 = (n) => Math.round(Math.log2(n));
const texCanvas = (t) => t?.source?.resource ?? null;

// --- section grouping ----------------------------------------------------------------------------
const SECTIONS = [
  ['Eggs', (r) => r.id.startsWith('egg.'), 'Tinted per die colour in code; each crack is an edit of the previous egg.'],
  ['Babies 16 → 128', (r) => /^pet\.[a-z]+\.\d+$/.test(r.id), 'Left: canonical creature. Right: how it sits in its tile (top 76% peeks over the bottom sill).'],
  ['Baby expression edits', (r) => /^pet\.[a-z]+\.(scared|blink)$/.test(r.id), 'Edits of the 16 stage; the image shows the base it edits.'],
  ['Fusions (roaming)', (r) => r.id.startsWith('fusion.'), 'Left: current stand-in (shared biped). Right: proposed body plan (pending your pick; see the silhouette sheet).'],
  ['Namecard portraits', (r) => /^portrait\.[a-z+]+$/.test(r.id), 'Soft-vinyl 3D bust on a painted plate: no background keying.'],
  ['Ascended portraits', (r) => r.id.endsWith('.ascended'), 'Legendary edit: backlight halo, gold, lower camera.'],
  ['Apex halo kits', (r) => r.id.startsWith('halo.'), 'Composited over any fusion at 4096; glow added in code.'],
  ['Enemies', (r) => r.cat === 'Enemy', 'Current procedural stand-ins; all need an originality pass before generation.'],
  ['Projectiles', (r) => r.id.startsWith('proj.'), ''],
  ['Explosions', (r) => r.id.startsWith('boom.'), 'Frame 4 of 8 shown.'],
  ['Status icons and particles', (r) => r.id.startsWith('status.') || r.id.startsWith('fx.'), ''],
  ['Glyphs, plates and tile parts', (r) => r.id.startsWith('glyph.') || r.id.startsWith('plate.') || r.id.startsWith('tile.'), ''],
  ['Namecard UI', (r) => r.id.startsWith('card.'), ''],
  ['HUD and dice', (r) => r.id.startsWith('die.') || r.id.startsWith('icon.') || r.id.startsWith('ui.'), ''],
  ['Environment', (r) => r.cat === 'Environment', ''],
  ['Store and marketing', (r) => r.cat === 'Marketing', ''],
];

// --- thumbnails --------------------------------------------------------------------------------
function badgeCanvas(el) {
  const c = makeCanvas(120, 120);
  drawBadge(c.getContext('2d'), el, 60, 60, 46, ELEMENTS[el].color, INK);
  return c;
}

function drawn(w, h, fn) {
  const c = makeCanvas(w, h);
  fn(c.getContext('2d'), w, h);
  return c;
}

function cardMock(state) {
  const port = renderPortrait('fire', 'ice', { size: 256 });
  return drawn(200, 230, (g) => {
    g.fillStyle = '#5b8cff';
    g.beginPath();
    g.roundRect(20, 10, 160, 160, 18);
    g.fill();
    g.save();
    g.beginPath();
    g.roundRect(20, 10, 160, 160, 18);
    g.clip();
    if (state === 'socket') {
      g.fillStyle = '#f6ead8';
      g.fillRect(20, 10, 160, 160);
      g.fillStyle = '#d8c6ad';
      g.font = '800 90px "Baloo 2"';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('?', 100, 96);
    } else {
      if (state === 'fill') g.filter = 'saturate(0.3) brightness(0.62)';
      g.drawImage(port, 20, 10, 160, 160);
      g.filter = 'none';
      if (state === 'fill') {
        g.fillStyle = 'rgba(91,140,255,0.45)';
        g.fillRect(20, 100, 160, 70);
      }
      if (state === 'shine') {
        const gr = g.createLinearGradient(40, 0, 160, 170);
        gr.addColorStop(0.35, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, 'rgba(255,255,255,0.8)');
        gr.addColorStop(0.65, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(20, 10, 160, 160);
      }
    }
    g.restore();
    g.lineWidth = 6;
    g.strokeStyle = state === 'legend' ? GOLD : CREAM;
    g.beginPath();
    g.roundRect(20, 10, 160, 160, 18);
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = INK;
    g.beginPath();
    g.roundRect(15, 5, 170, 170, 21);
    g.stroke();
    if (state !== 'socket') {
      g.fillStyle = state === 'namepill' ? INK : CREAM;
      g.beginPath();
      g.roundRect(48, 158, 104, 30, 15);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.5;
      g.stroke();
      g.fillStyle = state === 'namepill' ? CREAM : INK;
      g.font = '800 17px "Baloo 2"';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Novakit', 100, 174);
    }
  });
}

function placeholder(text) {
  const d = document.createElement('div');
  d.className = 'placeholder';
  d.textContent = text;
  return d;
}

function img(src) {
  const i = new Image();
  i.src = src;
  i.loading = 'lazy';
  return i;
}

/** [{ el: canvas|img|div, label, px }] for one asset row. */
function thumbsFor(r, showPx) {
  const id = r.id;
  const out = [];
  const add = (el, label = '', px = false) => el && out.push({ el, label, px });
  const crt = (spec, label) => {
    add(renderCreature(spec, 'sticker').canvas, label);
    if (showPx) add(renderCreature(spec, 'pixel').canvas, 'pixel', true);
  };
  let m;
  if ((m = id.match(/^egg\.(\d+)$/))) crt({ kind: 'egg', tier: log2(+m[1]) }, `egg ${m[1]}`);
  else if ((m = id.match(/^pet\.([a-z]+)\.(\d+)$/))) {
    const tier = log2(+m[2]);
    crt({ kind: 'baby', el: m[1], stage: tier - 4 }, 'creature');
    add(composeTileCanvas({ tier, cls: { element: m[1] } }, 'sticker'), 'in tile');
    if (showPx) add(composeTileCanvas({ tier, cls: { element: m[1] } }, 'pixel'), 'pixel tile', true);
  } else if ((m = id.match(/^pet\.([a-z]+)\.(scared|blink)$/))) add(renderCreature({ kind: 'baby', el: m[1], stage: 0 }, 'sticker').canvas, `base for ${m[2]} edit`);
  else if ((m = id.match(/^fusion\.([a-z]+)\+([a-z]+)$/))) {
    const [, a, b] = m;
    add(renderCreature({ kind: 'fusion', a, b }, 'sticker').canvas, 'current');
    const plan = PLAN[PROPOSED_PLAN[`${a}+${b}`]];
    if (plan) add(renderPlan(plan, a, b).canvas, `proposed: ${plan.name}`);
    if (showPx && plan) add(renderPlan(plan, a, b, 'pixel').canvas, 'pixel', true);
  } else if ((m = id.match(/^portrait\.([a-z]+)\+([a-z]+)$/))) add(renderPortrait(m[1], m[2], { size: 256 }), 'vinyl');
  else if ((m = id.match(/^portrait\.([a-z]+)\+([a-z]+)\.ascended$/))) {
    const apex = ['ice', 'fire', 'lightning'].find((e) => e !== m[1] && e !== m[2]);
    add(renderPortrait(m[1], m[2], { size: 256, legendary: true, apex }), `ascended (${apex} apex)`);
  } else if ((m = id.match(/^halo\.([a-z]+)$/))) crt({ kind: 'halo', apex: m[1] }, 'kit');
  else if ((m = id.match(/^enemy\.([a-zA-Z]+)(\.portrait)?$/))) add(texCanvas(enemyTex(m[1])), m[2] ? 'source sprite' : 'stand-in');
  else if ((m = id.match(/^proj\.([a-z]+)$/))) {
    try {
      add(texCanvas(projTex(m[1])), 'white base');
    } catch {
      add(placeholder('instant (no projectile)'));
    }
  } else if ((m = id.match(/^boom\.([a-z]+)$/))) add(texCanvas(boomFrames(m[1])[3]), 'frame 4/8');
  else if ((m = id.match(/^status\.([a-z]+)$/))) add(texCanvas(statusTex(m[1])), '');
  else if (id === 'fx.shadow') add(texCanvas(shadowTex()));
  else if (id === 'fx.softdot') add(texCanvas(softDot()));
  else if (id === 'fx.spark') add(texCanvas(sparkTex()));
  else if (id === 'fx.coin') add(texCanvas(coinTex()));
  else if (id === 'fx.skill') add(texCanvas(ringTex()));
  else if (id === 'fx.ring.ground')
    add(
      drawn(160, 80, (g) => {
        g.strokeStyle = '#2e8b57';
        g.lineWidth = 8;
        g.beginPath();
        g.ellipse(80, 40, 66, 22, 0, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = '#fff';
        g.lineWidth = 2;
        g.stroke();
      }),
    );
  else if (id === 'fx.hitflash') {
    const src = renderCreature({ kind: 'baby', el: 'ice', stage: 1 }, 'sticker').canvas;
    add(
      drawn(src.width, src.height, (g) => {
        g.drawImage(src, 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, src.width, src.height);
      }),
      'white silhouette',
    );
  } else if ((m = id.match(/^glyph\.([a-z]+)$/))) add(badgeCanvas(m[1]), 'badge');
  else if (id === 'plate.egg') add(plateCanvas({ tier: 1, cls: {} }));
  else if (id === 'plate.den') add(plateCanvas({ tier: 8, cls: { element: 'fire', fusion: 'ice' } }, 'sticker', true), 'Frostnova den');
  else if (id === 'plate.legend') add(plateCanvas({ tier: 12, cls: { element: 'lightning', fusion: 'metal', ultimate: 'ice' } }, 'sticker', true));
  else if ((m = id.match(/^plate\.([a-z]+)$/))) add(plateCanvas({ tier: 4, cls: { element: m[1] } }));
  else if (id === 'tile.number') {
    add(plateCanvas({ tier: 7, cls: { element: 'nature' } }, 'sticker', true), '128');
    add(plateCanvas({ tier: 11, cls: { element: 'fire', fusion: 'lightning' } }, 'sticker', true), '2048 den');
  } else if (id === 'tile.milestone')
    add(
      drawn(160, 160, (g) => {
        const segs = [
          [40, 20, 120, 20],
          [140, 40, 140, 120],
          [120, 140, 40, 140],
          [20, 120, 20, 40],
        ];
        segs.forEach(([x0, y0, x1, y1], i) => {
          g.lineCap = 'round';
          g.strokeStyle = INK;
          g.lineWidth = 16;
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
          g.stroke();
          g.strokeStyle = i < 2 ? '#ffe27a' : 'rgba(255,255,255,0.3)';
          g.lineWidth = 10;
          g.stroke();
        });
      }),
      '2 of 4 lit',
    );
  else if ((m = id.match(/^card\.(.+)$/))) {
    const s = { frame: 'frame', 'frame.legend': 'legend', socket: 'socket', fill: 'fill', shine: 'shine', namepill: 'namepill', cutin: 'cutin' }[m[1]];
    if (s === 'cutin') add(img('/reports/kv/namecard-cutin.jpg'), 'in game');
    else add(cardMock(s));
  } else if ((m = id.match(/^die\.([a-z]+)$/))) add(texCanvas(iconTex(m[1])), 'deck die');
  else if (id === 'env.portal') add(texCanvas(portalTex()));
  else if (id === 'env.background')
    add(
      drawn(160, 220, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#2f4a8a');
        gr.addColorStop(0.55, '#253a72');
        gr.addColorStop(1, '#1a2552');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 30; i++) {
          g.fillStyle = `rgba(255,255,255,${0.05 + (i % 5) * 0.02})`;
          g.beginPath();
          g.arc((i * 53) % w, (i * 97) % h, 2 + (i % 4), 0, Math.PI * 2);
          g.fill();
        }
      }),
      'current (code)',
    );
  else if (id === 'env.lane' || id === 'env.field' || id === 'env.board') add(img('/reports/kv/map-sticker.jpg'), 'see live map');
  else if (id === 'store.icon') {
    const p = renderPortrait('fire', 'ice', { size: 256 });
    add(
      drawn(200, 200, (g) => {
        g.beginPath();
        g.roundRect(0, 0, 200, 200, 44);
        g.clip();
        g.drawImage(p, -20, -10, 240, 240);
      }),
      'concept',
    );
  } else if (id === 'store.keyart' || id === 'ads.stills') add(img('/reports/kv/key-visual.png'), 'key visual');
  else if (id === 'store.screens') {
    add(img('/reports/kv/map-sticker.jpg'), 'gameplay');
    add(img('/reports/kv/namecard-cutin.jpg'), 'skill');
  } else add(placeholder(r.method.startsWith('Hand') ? 'Hand SVG (to draw)' : r.method.startsWith('CSS') ? 'CSS / code in game' : 'to make'));
  return out;
}

// --- page -----------------------------------------------------------------------------------------
const state = { cat: 'All', pri: 'All', q: '', px: false };
const main = document.getElementById('main');
const cards = [];

const gem = rows.filter((r) => r.method.startsWith('Gemini'));
const sum = (list, k) => list.reduce((a, r) => a + r[k], 0);
const core = gem.filter((r) => r.priority === 'P0' || r.priority === 'P1');
document.getElementById('stats').innerHTML = [
  `<span><b>${sum(rows, 'count')}</b> assets in <b>${rows.length}</b> rows</span>`,
  `<span><b>${sum(gem, 'count')}</b> to generate with Gemini (~$${sum(gem, 'cost').toFixed(2)})</span>`,
  `<span>core P0+P1: <b>${sum(core, 'count')}</b> images, ~$${sum(core, 'cost').toFixed(2)}</span>`,
  `<span>P0 slice: <b>${sum(gem.filter((r) => r.priority === 'P0'), 'count')}</b> images</span>`,
  `<span>art shown = code-drawn stand-ins</span>`,
].join('');

function chips(id, values, key) {
  const box = document.getElementById(id);
  for (const v of values) {
    const b = document.createElement('button');
    b.className = 'chip' + (state[key] === v ? ' on' : '');
    b.textContent = v;
    b.onclick = () => {
      state[key] = v;
      for (const x of box.children) x.classList.toggle('on', x.textContent === v);
      filter();
    };
    box.appendChild(b);
  }
}
chips('cats', ['All', 'Creature', 'Enemy', 'Effect', 'UI', 'Environment', 'Marketing'], 'cat');
chips('pris', ['All', 'P0', 'P1', 'P2', 'P3'], 'pri');
document.getElementById('q').oninput = (e) => {
  state.q = e.target.value.toLowerCase();
  filter();
};
document.getElementById('px').onchange = (e) => {
  state.px = e.target.checked;
  for (const c of cards) {
    c.done = false;
    c.thumbs.replaceChildren();
    io.unobserve(c.el);
    io.observe(c.el);
  }
};

const io = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const c = cards.find((x) => x.el === en.target);
      if (!c || c.done) continue;
      c.done = true;
      for (const t of thumbsFor(c.r, state.px)) {
        const w = document.createElement('div');
        w.className = 'thumb' + (t.px ? ' px' : '');
        w.appendChild(t.el);
        if (t.label) {
          const s = document.createElement('span');
          s.textContent = t.label;
          w.appendChild(s);
        }
        c.thumbs.appendChild(w);
      }
      io.unobserve(c.el);
    }
  },
  { rootMargin: '400px' },
);

function card(r) {
  const el = document.createElement('article');
  el.className = 'card';
  const thumbs = document.createElement('div');
  thumbs.className = 'thumbs';
  const body = document.createElement('div');
  body.className = 'body';
  const title = document.createElement('div');
  title.className = 'title';
  const b = document.createElement('b');
  b.textContent = r.name + (r.count > 1 ? ` ×${r.count}` : '');
  const pri = document.createElement('span');
  pri.className = 'pri';
  pri.style.background = PRI_COLOR[r.priority];
  pri.textContent = r.priority;
  title.append(b, pri);
  const id = document.createElement('div');
  id.className = 'id';
  id.textContent = r.id;
  const desc = document.createElement('div');
  desc.className = 'desc';
  desc.textContent = r.desc;
  const meta = document.createElement('dl');
  meta.className = 'meta';
  const rowsMeta = [
    ['Style', r.style],
    ['Method', r.method],
    ['Source', r.src],
    ['On screen', r.display],
    ['Refs', r.refs],
    ['Est.', r.gens ? `${r.gens} attempts · $${r.cost.toFixed(2)}` : 'no generation'],
    ['Note', r.notes],
  ];
  for (const [k, v] of rowsMeta) {
    if (!v) continue;
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    meta.append(dt, dd);
  }
  body.append(title, id, desc, meta);
  el.append(thumbs, body);
  const c = { el, thumbs, r, done: false, text: `${r.id} ${r.name} ${r.desc} ${r.method} ${r.style}`.toLowerCase() };
  cards.push(c);
  io.observe(el);
  return el;
}

const sections = [];
for (const [title, test, note] of SECTIONS) {
  const list = rows.filter(test);
  if (!list.length) continue;
  const sec = document.createElement('section');
  const h = document.createElement('h2');
  h.textContent = title;
  const sm = document.createElement('small');
  sm.textContent = `${list.reduce((a, r) => a + r.count, 0)} assets`;
  h.appendChild(sm);
  sec.appendChild(h);
  if (note) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = note;
    sec.appendChild(p);
  }
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const r of list) grid.appendChild(card(r));
  sec.appendChild(grid);
  main.appendChild(sec);
  sections.push({ sec, list });
}

function filter() {
  for (const c of cards) {
    const ok = (state.cat === 'All' || c.r.cat === state.cat) && (state.pri === 'All' || c.r.priority === state.pri) && (!state.q || c.text.includes(state.q));
    c.el.classList.toggle('hidden', !ok);
  }
  for (const s of sections) s.sec.classList.toggle('hidden', ![...s.sec.querySelectorAll('.card')].some((x) => !x.classList.contains('hidden')));
}
document.body.dataset.ready = '1';
