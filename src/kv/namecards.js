// Namecards (key-visual demo): one card per fusion in the strip beside the board.
// The portrait uses the second art style, a soft-vinyl toy render, so the card
// reads as a reward. States follow the style brief: charging (dimmed, an
// element-colour fill rising), ready (full colour, a shine sweep, a small bob),
// activating (a 0.9 s cut-in that never blocks play), lost (grey, falls away).
import { ELEMENTS, fusionOf, APEX } from '../sim/classes.js';
import { GRID, FIELD } from '../config.js';
import { petName } from '../art/tokens.js';
import { glyphPath } from '../art/glyphs.js';
import { generatedUrl } from '../render/textures.js';

const CHARGE = 9; // seconds of wave time per skill
const CHARGE_LEGEND = 7;
const MAX_CARDS = 4;

function glyphSvg(el) {
  // render the glyph path into a tiny data-URL image for the card badges
  const c = document.createElement('canvas');
  c.width = c.height = 40;
  const g = c.getContext('2d');
  g.fillStyle = ELEMENTS[el].color;
  g.beginPath();
  g.arc(20, 20, 18, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 3.5;
  g.strokeStyle = '#2b1d2e';
  g.stroke();
  g.translate(7, 7);
  g.scale(26, 26);
  g.lineWidth = 0.14;
  g.lineJoin = 'round';
  g.stroke(glyphPath(el));
  g.fillStyle = '#fff';
  g.fill(glyphPath(el), 'evenodd');
  return c.toDataURL();
}
const glyphCache = new Map();
// the generated dual-colour badge when it exists, else the drawn glyph disc
const glyph = (el) => generatedUrl(`badge.${el}`) ?? (glyphCache.has(el) ? glyphCache.get(el) : glyphCache.set(el, glyphSvg(el)).get(el));

export function createNamecards(root, { art, stage, getRun, onCast }) {
  const strip = document.createElement('div');
  strip.className = 'kv-cards';
  root.appendChild(strip);
  const cutin = document.createElement('div');
  cutin.className = 'kv-cutin';
  root.appendChild(cutin);
  const cards = new Map();

  function make(t) {
    const fu = fusionOf(t.cls);
    const legend = !!t.cls.ultimate;
    const el = document.createElement('button');
    el.className = `kv-card${legend ? ' legend' : ''}`;
    el.style.setProperty('--c', fu.color);
    el.style.setProperty('--c2', ELEMENTS[t.cls.fusion].color);
    const skill = legend ? `${APEX[t.cls.ultimate].name} ${fu.name}` : fu.name;
    el.innerHTML = `
      <div class="kv-port">
        <img alt="" src="${art.portrait(t.cls)}" />
        <div class="kv-fill"></div>
        <div class="kv-shine"></div>
        <div class="kv-glyphs">${[t.cls.element, t.cls.fusion, t.cls.ultimate]
          .filter(Boolean)
          .map((e) => `<img src="${glyph(e)}" alt="${ELEMENTS[e].name}" />`)
          .join('')}</div>
      </div>
      <div class="kv-name">${petName(t.cls.element, t.cls.fusion)}</div>`;
    el.title = `${petName(t.cls.element, t.cls.fusion)}: ${skill}`;
    el.style.pointerEvents = 'auto';
    const card = { el, id: t.id, charge: CHARGE * 0.55, max: legend ? CHARGE_LEGEND : CHARGE, skill, name: petName(t.cls.element, t.cls.fusion), legend, cls: { ...t.cls }, lost: false };
    el.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      if (card.lost || card.charge < card.max) {
        el.classList.remove('nudge');
        void el.offsetWidth;
        el.classList.add('nudge');
        return;
      }
      card.charge = 0;
      onCast(card);
      play(card);
    });
    strip.appendChild(el);
    return card;
  }

  function play(card) {
    card.el.classList.add('fire');
    setTimeout(() => card.el.classList.remove('fire'), 600);
    // the cut-in is a large panel: it takes the photosafe flash budget (one a second, none under
    // Reduce motion), so quick taps on several cards never make it blink
    if (!stage.takeFlash()) return;
    cutin.innerHTML = `
      <div class="kv-cutin-card" style="--c:${fusionOf(card.cls).color}">
        <img alt="" src="${art.portrait(card.cls)}" />
        <div class="kv-cutin-text"><b>${card.name}</b><span>${card.skill}!</span></div>
      </div>`;
    cutin.classList.remove('go');
    void cutin.offsetWidth;
    cutin.classList.add('go');
  }

  function layout() {
    // the strip between the board's right edge and the screen edge
    const right = stage.toClient(GRID.cell * 2 + 0.1, 0).x;
    const top = stage.toClient(0, FIELD.spawnY - 1.4).y;
    const vw = root.clientWidth || window.innerWidth;
    const w = Math.max(50, Math.min(66, vw - right - 14)); // room for the ready ring
    strip.style.left = `${Math.min(right + 2, vw - w - 9)}px`;
    strip.style.top = `${top}px`;
    strip.style.width = `${w}px`;
  }

  function sync(run, dt, simDt = dt) {
    // the HUD rebuilds its DOM after the demo starts: re-attach if needed
    if (!strip.isConnected) root.appendChild(strip);
    if (!cutin.isConnected) root.appendChild(cutin);
    layout();
    const fusions = run.tiles
      .filter((t) => t.tier >= 8 && t.cls.fusion)
      .sort((a, b) => b.tier - a.tier)
      .slice(0, MAX_CARDS);
    const live = new Set(fusions.map((t) => t.id));
    for (const t of fusions) {
      let card = cards.get(t.id);
      if (card && card.cls.ultimate !== t.cls.ultimate) {
        card.el.remove();
        cards.delete(t.id);
        card = null;
      }
      if (!card) cards.set(t.id, (card = make(t)));
      if (run.phase === 'wave' && !run.over) card.charge = Math.min(card.max, card.charge + simDt); // wave time: not while paused, x2 charges x2
      const f = card.charge / card.max;
      card.el.style.setProperty('--f', f.toFixed(3));
      card.el.classList.toggle('ready', f >= 1);
      card.el.classList.toggle('charging', f < 1);
    }
    for (const [id, card] of cards) {
      if (live.has(id) || card.lost) continue;
      card.lost = true;
      card.el.classList.add('lost');
      setTimeout(() => {
        card.el.remove();
        cards.delete(id);
      }, 1400);
    }
  }

  return {
    sync,
    /** Client-space centre of a tile's card (for the ribbon to its creature). */
    cardCenter(id) {
      const c = cards.get(id);
      if (!c) return null;
      const r = c.el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
    },
    reset() {
      for (const c of cards.values()) c.el.remove();
      cards.clear();
    },
  };
}

