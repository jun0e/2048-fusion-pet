// Namecards: one card per fusion, on the rail that hangs on the right tower (proposal 4.1): never
// over lane 4. The portrait uses the second art style, a soft-vinyl toy render, so the card reads
// as a reward. States follow the style brief: charging (dimmed; a fill bar under the portrait),
// ready (full colour, an element rim, the bar turns into an inverted READY pill, a shine sweep, a
// small bob), activating (a 0.9 s cut-in that never blocks play), lost (grey, falls away).
import { ELEMENTS, fusionOf, APEX } from '../sim/classes.js';
import { GRID } from '../config.js';
import { petName } from '../art/tokens.js';
import { glyphPath } from '../art/glyphs.js';
import { FRAME_GEOM, RAIL_PX } from '../art/frame-kit.js';
import { generatedUrl } from '../render/textures.js';

const CHARGE = 9; // seconds of wave time per skill
const CHARGE_LEGEND = 7;
const MAX_CARDS = 4;
// px: between cards, the bar under the portrait (with its gap), between a card's ink ring and the tower's edges
const RAIL = { gap: 6, bar: 14, margin: RAIL_PX.margin };
const MIN = RAIL_PX.card; // a card is never narrower (the touch-target floor)

/** The card width a screen `vw` px wide would like: 48 on a phone up to 400 px wide (the touch-target size), 52 on wider ones (proposal 4.1). */
export const cardWidth = (vw) => (vw <= 400 ? 48 : 52);

/**
 * Where the rail goes, in client px: on the right tower from the gate wall's top down to the parapet,
 * centred on the tower (from its inner edge to its outer edge, or to the screen's edge where the
 * tower runs off it, as on a phone). The cards take the width the tower has, up to cardWidth(vw),
 * never under 44 px. When four cards do not fit that tall (a short phone), the rail runs on beside
 * the keep, down to the deck row.
 * towerX / towerOut: the right tower's inner and outer edges; keepX: the keep's outer edge; top,
 * parapet, floor: the rail's top, the parapet line and the lowest it may reach. → { left, width, top }
 */
export function railLayout({ vw, towerX, towerOut = Infinity, keepX, top, parapet, floor }) {
  const want = cardWidth(vw);
  const right = Math.min(vw, towerOut);
  const stack = (w) => MAX_CARDS * (w + RAIL.bar) + (MAX_CARDS - 1) * RAIL.gap;
  const place = (edge, w) => ({ left: Math.round(edge + RAIL.margin + Math.max(0, (right - edge - RAIL.margin * 2 - w) / 2)), width: w, top: Math.round(top) });
  const roomTower = right - towerX - RAIL.margin * 2;
  const w = Math.max(MIN, Math.floor(Math.min(want, roomTower))); // never under the 44 px touch floor
  if (stack(w) <= parapet - top) return place(towerX, w);
  const tight = Math.max(MIN, Math.min(w, Math.floor((parapet - top - (MAX_CARDS - 1) * RAIL.gap) / MAX_CARDS - RAIL.bar)));
  if (tight <= roomTower && stack(tight) <= parapet - top) return place(towerX, tight);
  // a short phone: the tower is too short for four cards, so the rail runs on beside the keep
  const roomKeep = right - keepX - RAIL.margin * 2;
  if (roomKeep >= MIN) {
    const wk = Math.min(want, roomKeep, Math.max(MIN, Math.floor((floor - top - (MAX_CARDS - 1) * RAIL.gap) / MAX_CARDS - RAIL.bar)));
    return place(keepX, wk);
  }
  // no room beside the keep either: the rail stays on the tower and runs on past the parapet, its
  // cards as wide as the tower allows up to the width wanted (w: never under the 44 px floor)
  return place(towerX, w);
}

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
        <div class="kv-shine"></div>
        <div class="kv-glyphs">${[t.cls.element, t.cls.fusion, t.cls.ultimate]
          .filter(Boolean)
          .map((e) => `<img src="${glyph(e)}" alt="${ELEMENTS[e].name}" />`)
          .join('')}</div>
      </div>
      <div class="kv-bar"><i></i><b>READY</b></div>`;
    el.title = `${petName(t.cls.element, t.cls.fusion)}: ${skill}`;
    el.style.pointerEvents = 'auto';
    const card = { el, id: t.id, charge: CHARGE * 0.55, max: legend ? CHARGE_LEGEND : CHARGE, skill, name: petName(t.cls.element, t.cls.fusion), legend, cls: { ...t.cls }, lost: false, ready: null };
    // a press casts at once (no wait for the click); Enter and Space on a focused card do the same
    const press = () => {
      if (card.lost || card.charge < card.max) {
        el.classList.remove('nudge');
        void el.offsetWidth;
        el.classList.add('nudge');
        return;
      }
      card.charge = 0;
      onCast(card);
      play(card);
    };
    el.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      press();
    });
    el.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault(); // no click after it, and no page scroll for Space
      ev.stopPropagation(); // the game's own Enter / Space (Wave now) stays out of it
      if (!ev.repeat) press();
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

  let placed = '';
  function layout() {
    // the rail on the right tower (src/render/frame.js draws it), clear of lane 4
    const vw = root.clientWidth || window.innerWidth;
    const k = FRAME_GEOM.keep;
    const r = railLayout({
      vw,
      towerX: stage.toClient(FRAME_GEOM.towerIn, 0).x,
      towerOut: stage.toClient(FRAME_GEOM.towerIn + FRAME_GEOM.towerW, 0).x,
      keepX: stage.toClient(GRID.size + k.pad + k.wall / 2 + k.tower / 2, 0).x,
      top: stage.toClient(0, FRAME_GEOM.rail.top).y,
      parapet: stage.toClient(0, FRAME_GEOM.rail.bottom).y,
      floor: stage.toClient(0, FRAME_GEOM.deck.y - FRAME_GEOM.deck.die / 2).y,
    });
    const key = `${r.left}|${r.top}|${r.width}`;
    if (key === placed) return;
    placed = key;
    strip.style.left = `${r.left}px`;
    strip.style.top = `${r.top}px`;
    strip.style.width = `${r.width}px`;
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
      // a new class (an ultimate, or a fusion picked after the merge): a new card
      if (card && (card.cls.ultimate !== t.cls.ultimate || card.cls.element !== t.cls.element || card.cls.fusion !== t.cls.fusion)) {
        card.el.remove();
        cards.delete(t.id);
        card = null;
      }
      if (!card) cards.set(t.id, (card = make(t)));
      if (run.phase === 'wave' && !run.over) card.charge = Math.min(card.max, card.charge + simDt); // wave time: not while paused, x2 charges x2
      const f = card.charge / card.max;
      card.el.style.setProperty('--f', f.toFixed(3));
      const ready = f >= 1;
      if (ready !== card.ready) {
        card.ready = ready;
        card.el.classList.toggle('ready', ready);
        card.el.classList.toggle('charging', !ready);
        card.el.setAttribute('aria-label', `${card.name}: ${card.skill}. ${ready ? 'Ready: tap to cast.' : 'Charging.'}`);
      }
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

