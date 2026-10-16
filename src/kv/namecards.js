// Namecards: one card per fusion, on the rail that hangs on the right tower (proposal 4.1): never
// over lane 4. The rail has four slots; from a fifth fusion on, the fourth slot is a stack whose
// face is the card to tap (railSlots), so every fusion's skill can be cast and the rail never grows.
// The portrait uses the second art style, a soft-vinyl toy render, so the card reads as a reward. States follow the style brief: charging (dimmed; a fill bar under the portrait),
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
const SLOTS = 4; // the rail's slots: the fourth holds a stack from a fifth fusion on (railSlots)
// px: between cards, the bar under the portrait (with its gap), between a card's ink ring and the tower's edges
const RAIL = { gap: 6, bar: 14, margin: RAIL_PX.margin };
const MIN = RAIL_PX.card; // a card is never narrower (the touch-target floor)

/**
 * The rail's order: the biggest fusion first, and between equals the older one (tile ids only grow),
 * so a swipe that moves blocks around never reshuffles the cards.
 */
export const railOrder = (fusions) => [...fusions].sort((a, b) => b.tier - a.tier || a.id - b.id);

/**
 * Which fusions show on the rail's slots: the three first (the highest) on slots of their own, and
 * from a fifth on, the rest in a stack on the fourth slot. The stack's face, the one card of it shown
 * and tapped, stays while it is ready or `hold` (just cast: a second quick tap must not cast the next
 * card's skill); else the first ready card comes up; else the face stays (or the first): the face
 * never flickers between charging cards.
 * ids: the fusions' tile ids in rail order; ready: the ids whose skill is ready; face: last frame's.
 * → { shown: ids on slots of their own, stack: the stack's ids, face first, face: its face or null }
 */
export function railSlots(ids, ready, face, hold = false) {
  if (ids.length <= SLOTS) return { shown: ids, stack: [], face: null };
  const rest = ids.slice(SLOTS - 1);
  const keep = rest.includes(face) ? face : null;
  const next = keep != null && (hold || ready.has(keep)) ? keep : (rest.find((id) => ready.has(id)) ?? keep ?? rest[0]);
  return { shown: ids.slice(0, SLOTS - 1), stack: [next, ...rest.filter((id) => id !== next)], face: next };
}

/** How long a just-cast face holds the stack's slot (ms): a quick second tap nudges it instead. */
export const FACE_HOLD_MS = 600;

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
  const stack = (w) => SLOTS * (w + RAIL.bar) + (SLOTS - 1) * RAIL.gap;
  const place = (edge, w) => ({ left: Math.round(edge + RAIL.margin + Math.max(0, (right - edge - RAIL.margin * 2 - w) / 2)), width: w, top: Math.round(top) });
  const roomTower = right - towerX - RAIL.margin * 2;
  const w = Math.max(MIN, Math.floor(Math.min(want, roomTower))); // never under the 44 px touch floor
  if (stack(w) <= parapet - top) return place(towerX, w);
  const tight = Math.max(MIN, Math.min(w, Math.floor((parapet - top - (SLOTS - 1) * RAIL.gap) / SLOTS - RAIL.bar)));
  if (tight <= roomTower && stack(tight) <= parapet - top) return place(towerX, tight);
  // a short phone: the tower is too short for four cards, so the rail runs on beside the keep
  const roomKeep = right - keepX - RAIL.margin * 2;
  if (roomKeep >= MIN) {
    const wk = Math.min(want, roomKeep, Math.max(MIN, Math.floor((floor - top - (SLOTS - 1) * RAIL.gap) / SLOTS - RAIL.bar)));
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
        <i class="kv-more" aria-hidden="true"></i>
      </div>
      <div class="kv-bar"><i></i><b>READY</b></div>`;
    el.title = `${petName(t.cls.element, t.cls.fusion)}: ${skill}`;
    el.style.pointerEvents = 'auto';
    const card = { el, id: t.id, charge: CHARGE * 0.55, max: legend ? CHARGE_LEGEND : CHARGE, skill, name: petName(t.cls.element, t.cls.fusion), legend, cls: { ...t.cls }, lost: false, ready: null, role: 'own', more: 0, slot: '', castAt: -Infinity };
    // a nudge plays once: left on, its class would hold the card's ready bob off for good
    el.addEventListener('animationend', (ev) => ev.animationName === 'kvNudge' && el.classList.remove('nudge'));
    // a press casts at once (no wait for the click); Enter and Space on a focused card do the same
    const press = () => {
      if (card.lost || card.charge < card.max) {
        el.classList.remove('nudge');
        void el.offsetWidth;
        el.classList.add('nudge');
        return;
      }
      card.charge = 0;
      card.castAt = performance.now(); // the stack's face holds a moment (FACE_HOLD_MS)
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

  let face = null; // the stack's face: the card of the fourth slot shown and tapped (railSlots)

  /** A card's name for a screen reader: its pet, its skill, its charge, and the cards behind it. */
  function label(card) {
    const behind = card.role === 'face' ? ` ${card.more} more pet${card.more === 1 ? ' waits' : 's wait'} behind this card.` : '';
    card.el.setAttribute('aria-label', `${card.name}: ${card.skill}. ${card.ready ? 'Ready: tap to cast.' : 'Charging.'}${behind}`);
  }

  /**
   * A card's role on the rail: on a slot of its own ('own'), the stack's face ('face', `more` cards
   * waiting behind it), or behind it ('behind', hidden). A new face slides in once (a one-off
   * animation: a class's would hold the card's ready bob, nudge and fall off).
   */
  function slot(card, role, more = 0) {
    const k = `${role}:${more}`;
    if (card.slot === k) return;
    const turned = role === 'face' && card.role !== 'face';
    card.slot = k;
    card.role = role;
    card.more = more;
    card.el.classList.toggle('stacked', role === 'behind');
    card.el.classList.toggle('stack-face', role === 'face');
    card.el.querySelector('.kv-more').textContent = role === 'face' ? `+${more}` : '';
    label(card);
    const calm = document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (turned && !calm) card.el.animate?.([{ transform: 'translateY(6px) scale(0.92)', opacity: 0.5 }, { transform: 'none', opacity: 1 }], { duration: 250, easing: 'ease-out' });
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
    // every fusion gets a card and charges; the rail shows four slots (railSlots), in railOrder
    const fusions = railOrder(run.tiles.filter((t) => t.tier >= 8 && t.cls.fusion));
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
        label(card);
      }
    }
    // fusions gone: their cards fall where they hang (one behind the stack, never seen, just goes)
    for (const [id, card] of cards) {
      if (live.has(id) || card.lost) continue;
      card.lost = true;
      if (card.role === 'behind') {
        card.el.remove();
        cards.delete(id);
        continue;
      }
      slot(card, 'own'); // a lost face falls as a card of its own: no pill, no hold on the stack
      card.el.classList.add('lost');
      setTimeout(() => {
        card.el.remove();
        cards.delete(id);
      }, 1400);
    }
    const held = face != null && performance.now() - (cards.get(face)?.castAt ?? -Infinity) < FACE_HOLD_MS;
    const slots = railSlots(
      fusions.map((t) => t.id),
      new Set(fusions.filter((t) => cards.get(t.id).ready).map((t) => t.id)),
      face,
      held,
    );
    face = slots.face;
    // a keyboard player's focus follows the stack: the card it was on went behind the new face
    const focused = [...cards.values()].find((c) => c.el === document.activeElement);
    for (const id of slots.shown) slot(cards.get(id), 'own');
    slots.stack.forEach((id, i) => slot(cards.get(id), i === 0 ? 'face' : 'behind', slots.stack.length - 1));
    if (focused?.role === 'behind') cards.get(face)?.el.focus({ preventScroll: true });
    // the DOM in the rail's order, so Tab reads the cards top to bottom (moved only when it changed);
    // a falling card keeps its place
    const onRail = [...slots.shown, ...slots.stack].map((id) => cards.get(id));
    onRail.forEach((c, i) => (c.index = i));
    const order = onRail.map((c) => c.el);
    for (const c of cards.values()) if (c.lost) order.splice(Math.min(c.index ?? order.length, order.length), 0, c.el);
    if (order.some((el, i) => strip.children[i] !== el)) {
      const had = document.activeElement;
      for (const el of order) strip.appendChild(el);
      if (had && had !== document.activeElement && strip.contains(had)) had.focus({ preventScroll: true });
    }
  }

  return {
    sync,
    /** Client-space centre of a tile's card (for the ribbon to its creature). */
    cardCenter(id) {
      const c = cards.get(id);
      if (!c) return null;
      const el = c.el.classList.contains('stacked') ? (cards.get(face)?.el ?? c.el) : c.el; // behind the stack: its slot
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
    },
    reset() {
      for (const c of cards.values()) c.el.remove();
      cards.clear();
      face = null;
    },
  };
}

