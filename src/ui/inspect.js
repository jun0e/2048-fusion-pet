// Tile info popup: tap a block to see what it does (attack, numbers, effects, what it
// becomes next). Content comes from src/sim/describe.js; the picture is the tile itself in its
// pit (art.tileCanvas: the board and the card agree), else the generated sprite. Its growth row
// shows the tile's 4-segment meter and says it in words; a den's card says its pet is out on the
// field (the board marks the pet). Shown at the top of the screen so the board and the block's
// range drawing stay visible; tap the block again, anywhere else, or × to close.
// The card also sells a turret (+1 swipe's price) or breaks a dormant block (−3 swipes);
// the button asks for a second tap before it acts, and while it waits the tile's brackets on the
// board turn red and dashed (onArm).
import './inspect.css';
import { GRID_TOP } from '../config.js';
import { FRAME_GEOM } from '../art/frame-kit.js';
import { ELEMENTS } from '../sim/classes.js';
import { describeTile } from '../sim/describe.js';
import { petName } from '../art/tokens.js';
import { spriteId, portraitId } from '../art/sprite-ids.js';
import { generatedUrl } from '../render/textures.js';
import { growthWords, meterOf } from '../art/plaque.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function imageFor(tile, info, art) {
  const cls = tile.cls ?? {};
  if (info.kind === 'egg') return generatedUrl(spriteId({ kind: 'egg', tier: Math.max(1, Math.min(3, tile.tier)) }));
  if (info.kind === 'element') return generatedUrl(spriteId({ kind: 'baby', el: cls.element, stage: Math.min(3, tile.tier - 4) }));
  return generatedUrl(portraitId(cls)) ?? generatedUrl(spriteId({ kind: 'fusion', a: cls.element, b: cls.fusion })) ?? art?.portrait(cls) ?? null;
}

/** The card's picture: the tile in its pit, 72 CSS px at the screen's density (null without the art). */
function tilePicture(tile, art) {
  if (!art?.tileCanvas || art.style === 'classic') return null;
  const c = art.tileCanvas(tile, Math.round(72 * Math.min(3, globalThis.devicePixelRatio || 1)));
  c.setAttribute('aria-hidden', 'true');
  return c;
}

/** Where a den's pet is: it roams the field (src/sim/roam.js); '' when the block has none. */
const petWhere = (tile) => (!tile.roam ? '' : tile.roam.hatch >= 1 ? ', out on the field' : ', hopping out');

export function createInspect(root, { stage, art, onClose, onDiscard, onArm }) {
  const el = document.createElement('div');
  el.className = 'inspect';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Block info');
  root.appendChild(el);
  let key = '';
  let actKey = '';
  let tileId = null;
  let armed = 0; // seconds left to confirm the sell / break tap
  let armedId = null; // the tile the board was told is armed (onArm)
  let ctx = {};

  /** Arm the sell / break tap for `s` seconds (0: disarm); the board's brackets follow it (onArm). */
  function setArmed(s) {
    armed = s;
    const id = armed > 0 ? tileId : null;
    if (id === armedId) return;
    if (armedId != null) onArm?.(armedId, false);
    armedId = id;
    if (id != null) onArm?.(id, true);
  }

  el.addEventListener('pointerdown', (e) => e.stopPropagation()); // reading the card never swipes the board
  // click, not pointerdown: Enter and Space on a focused button work too
  el.addEventListener('click', (e) => {
    if (e.target.closest('.inspect-x')) onClose?.();
    const btn = e.target.closest('.inspect-sell');
    if (btn && !btn.disabled) {
      if (armed > 0) {
        setArmed(0);
        onDiscard?.(tileId);
      } else setArmed(2.5);
      renderAct();
    }
  });

  /** The sell / break row: what it pays or costs, and why it can't when it can't. */
  function renderAct() {
    const box = el.querySelector('.inspect-act');
    const p = ctx.price;
    if (!box || !p) return;
    const sell = p.kind === 'sell';
    const cost = Math.abs(p.amount);
    const short = !sell && (ctx.coins ?? 0) < cost;
    const k = `${p.kind}:${cost}:${short}:${!!ctx.last}:${armed > 0}`;
    if (k === actKey) return;
    actKey = k;
    const verb = sell ? 'Sell' : 'Break';
    // a keyboard player arming Sell / Break keeps the focus on the button rebuilt here (else a second
    // Enter would reach the board's Enter shortcut, src/input.js, instead of confirming)
    const focused = box.contains(document.activeElement);
    const note = ctx.last
      ? 'Your last block can’t be removed.'
      : short
        ? `Need ${cost} coins to break it.`
        : sell
          ? 'A turret sells for the price of one swipe.'
          : 'A block below 16 costs three swipes to break.';
    box.innerHTML = `
      <button class="inspect-sell ${sell ? 'is-sell' : 'is-break'}${armed > 0 ? ' armed' : ''}" ${ctx.last || short ? 'disabled' : ''}>
        ${armed > 0 ? `Tap again to ${verb.toLowerCase()}` : verb}
        <b><span class="inspect-coin"></span>${sell ? '+' : '−'}${cost}</b>
      </button>
      <span class="inspect-note">${esc(note)}</span>`;
    if (focused) refocus('.inspect-sell');
  }

  /** Put the focus back on the card's `sel` button after a rebuild (the × when that one is disabled). */
  function refocus(sel) {
    (el.querySelector(`${sel}:not(:disabled)`) ?? el.querySelector('.inspect-x'))?.focus({ preventScroll: true });
  }

  let placed = ''; // the layout the card was last placed for (it is shown, so offsetTop is real)
  let pinned = null; // a den's card keeps clear of its pet out on the field: { top, maxH }, chosen as it opens

  /**
   * Where a den's pet stands on screen, its head to its feet (client px), once it has hopped out; else
   * null. A legend reaches higher: its halo floats over it (src/kv/roam.js MARK.haloY + its hover +
   * the halo's radius ≈ 3.7 units, its brackets a little above).
   */
  function petSpan(tile) {
    const r = tile.roam;
    if (!r || r.hatch < 1) return null;
    const reach = tile.cls?.ultimate ? 3.8 : 2.5;
    return { top: stage.toClient(r.x, r.y + reach).y, bottom: stage.toClient(r.x, r.y - 0.35).y };
  }

  /**
   * A den's card goes above its pet or below it, whichever fits (the pet wears the pick's brackets out
   * on the field, and a card over the whole field would hide it), but only where its whole head (the
   * picture, the title, "out on the field") and the Sell row under it fit; else it is placed as any
   * card, over the pet (the card still says where the pet is).
   */
  function pinFor(tile, boardTop) {
    const pet = petSpan(tile);
    if (!pet) return null;
    el.style.top = '';
    const top0 = el.offsetTop; // the stylesheet's place, under the top bars
    const head = el.querySelector('.inspect-head');
    const act = el.querySelector('.inspect-act');
    const need = el.clientTop * 2 + (head ? head.offsetTop + head.offsetHeight : 0) + (act?.offsetHeight ?? 0);
    const above = pet.top - 8 - top0;
    const below = boardTop - 6 - (pet.bottom + 8);
    if (above >= need && (above >= el.scrollHeight || above >= below)) return { top: top0, maxH: Math.round(above) };
    if (below >= need) return { top: Math.round(pet.bottom + 8), maxH: Math.round(below) };
    return null;
  }

  function place(tile, fresh) {
    // between the field's towers, and never over the namecard rail on the right one: the card's right
    // edge 4 px inside the right tower, as wide as the field allows (240–360 px); on a narrow field
    // it reaches over the left tower instead
    const root0 = root.getBoundingClientRect().left;
    const towerL = stage.toClient(-FRAME_GEOM.towerIn, 0).x - root0;
    const towerR = stage.toClient(FRAME_GEOM.towerIn, 0).x - root0;
    const w = Math.max(240, Math.min(360, towerR - towerL - 8));
    const left = Math.round(towerR - 4 - w);
    // never cover the board (the tapped block may sit in its top row): scroll inside instead
    const boardTop = stage.toClient(0, GRID_TOP).y;
    if (fresh) {
      // measured at the card's own width (its lines wrap there), then placed
      el.style.width = `${w}px`;
      pinned = pinFor(tile, boardTop);
      placed = ''; // pinFor cleared the card's top: write it again even when the layout is the same
    }
    const k = `${w}|${left}|${boardTop}|${pinned ? `${pinned.top}:${pinned.maxH}` : ''}`;
    if (k === placed) return; // per frame while open: write only when the layout moved
    placed = k;
    el.style.width = `${w}px`;
    el.style.left = `${left}px`;
    el.style.top = pinned ? `${pinned.top}px` : '';
    el.style.maxHeight = `${pinned ? pinned.maxH : Math.max(180, boardTop - el.offsetTop - 6)}px`;
  }

  function render(tile) {
    // a re-render (a den's pet has hopped out) keeps the keyboard focus where it was in the card
    const focus = el.contains(document.activeElement) ? (document.activeElement.closest('.inspect-sell') ? '.inspect-sell' : '.inspect-x') : null;
    const info = describeTile(tile, petName);
    const pic = tilePicture(tile, art);
    const img = pic ? null : imageFor(tile, info, art);
    const m = meterOf(tile.tier);
    const grow = growthWords(tile.tier);
    const c = info.colors[0];
    const chips = info.elements
      .map((k) => {
        const badge = generatedUrl(`badge.${k}`);
        return `<span class="inspect-chip" style="--c:${ELEMENTS[k].color}">${badge ? `<img alt="" src="${esc(badge)}" />` : ''}${esc(ELEMENTS[k].name)}</span>`;
      })
      .join('');
    el.style.setProperty('--c', c);
    el.innerHTML = `
      <button class="inspect-x" aria-label="Close">×</button>
      <div class="inspect-head">
        <div class="inspect-pic${pic ? ' inspect-pic-tile' : ''}">${pic ? '' : img ? `<img alt="" src="${esc(img)}" />` : `<b>${info.value}</b>`}</div>
        <div class="inspect-titles">
          <h3>${esc(info.title)}</h3>
          <div class="inspect-sub">${chips}<span class="inspect-value">${info.value}</span></div>
          ${info.petName ? `<div class="inspect-pet">Pet: <b>${esc(info.petName)}</b>${petWhere(tile)}</div>` : ''}
        </div>
      </div>
      ${grow ? `<div class="inspect-grow"><span class="inspect-meter${m.goal === 'legend' ? ' rose' : ''}" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i${i < m.lit ? ' class="lit"' : ''}></i>`).join('')}</span><span>${esc(grow)}</span></div>` : ''}
      <p class="inspect-desc">${esc(info.desc)}</p>
      ${info.stats.length ? `<dl class="inspect-stats">${info.stats.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>` : ''}
      ${info.effects.length ? `<ul class="inspect-fx">${info.effects.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${info.signature ? `<p class="inspect-special">${esc(info.signature)}</p>` : ''}
      ${info.skill ? `<p class="inspect-special">${esc(info.skill)}</p>` : ''}
      ${info.next ? `<p class="inspect-next">${esc(info.next)}</p>` : ''}
      <div class="inspect-act"></div>`;
    if (pic) el.querySelector('.inspect-pic').appendChild(pic);
    actKey = '';
    renderAct();
    if (focus) refocus(focus);
  }

  return {
    /**
     * Show the popup for `tile`, or hide it with null. Re-renders only when the block
     * changes; `context` = { price, coins, last } keeps the sell / break row current.
     */
    show(tile, context = {}, dt = 0) {
      if (!tile) {
        if (!el.hidden) el.hidden = true; // no write per frame while nothing is picked
        key = '';
        placed = '';
        pinned = null;
        setArmed(0);
        return;
      }
      ctx = context;
      if (tile.id !== tileId) setArmed(0);
      tileId = tile.id;
      if (armed > 0) setArmed(Math.max(0, armed - dt));
      const block = `${tile.id}:${tile.tier}:${tile.cls?.element ?? ''}:${tile.cls?.fusion ?? ''}:${tile.cls?.ultimate ?? ''}`;
      // a den's pet hopping out changes its picture (the paw prints) and its line, without a new pop
      const k = `${block}:${tile.roam ? (tile.roam.hatch >= 1 ? 'out' : 'in') : ''}`;
      const fresh = k !== key;
      if (fresh) {
        const popped = key.startsWith(`${block}:`);
        key = k;
        render(tile);
        if (!popped) {
          el.classList.remove('pop');
          void el.offsetWidth;
          el.classList.add('pop');
        }
      }
      renderAct();
      if (!el.isConnected) root.appendChild(el); // the HUD can rebuild its DOM
      el.hidden = false;
      place(tile, fresh);
    },
  };
}
