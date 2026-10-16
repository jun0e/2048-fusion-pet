// Tile info popup: tap a block to see what it is and to sell it. It opens short (the picture, the
// name and value, Sell / Break and Details) over the board, under or over the tapped block
// (src/ui/short-card.js), so the lanes stay in view, waves or not, and Sell needs no scrolling.
// Details opens the full card at the top of the screen: what the block does (attack, numbers,
// effects, what it becomes next), its growth row (the tile's 4-segment meter, said in words), and
// for a den where its pet is (the board marks the pet). Content comes from src/sim/describe.js; the
// picture is the tile itself in its pit (art.tileCanvas: the board and the card agree), else the
// generated sprite. Tap the block again, anywhere else, or × to close.
// The card also sells a turret (+1 swipe's price) or breaks a dormant block (−3 swipes);
// the button asks for a second tap before it acts, and while it waits the tile's brackets on the
// board turn red and dashed (onArm).
import './inspect.css';
import { GRID, GRID_TOP } from '../config.js';
import { FRAME_GEOM } from '../art/frame-kit.js';
import { ELEMENTS } from '../sim/classes.js';
import { describeTile } from '../sim/describe.js';
import { petName } from '../art/tokens.js';
import { spriteId, portraitId } from '../art/sprite-ids.js';
import { generatedUrl } from '../render/textures.js';
import { growthWords, meterOf } from '../art/plaque.js';
import { ARMED_LABEL, actState, shortCardSpot } from './short-card.js';

/** Details as an icon, where the short card narrows to keep off the namecard rail (24 px, as the HUD's icons). */
const INFO_ICON = '<svg class="inspect-more-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.2v.1" /></svg>';

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
  // the screen's foot line (--foot-y, the coin bar's bottom): the short card reaches no lower
  const foot = document.createElement('i');
  foot.className = 'inspect-foot';
  foot.setAttribute('aria-hidden', 'true');
  root.appendChild(foot);
  let key = '';
  let actKey = '';
  let tileId = null;
  let armed = 0; // seconds left to confirm the sell / break tap
  let armedId = null; // the tile the board was told is armed (onArm)
  let ctx = {};
  let full = false; // the player asked for this block's whole card (Details); another block opens short

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
    if (e.target.closest('.inspect-more')) {
      full = true; // show() renders the full card on the next frame
      setArmed(0);
    }
    const btn = e.target.closest('.inspect-sell');
    if (btn && !btn.disabled) {
      if (armed > 0) {
        setArmed(0);
        onDiscard?.(tileId);
      } else setArmed(2.5);
      renderAct();
    }
  });

  /** The sell / break row: what it pays or costs, and why it can't when it can't (short-card.js actState). */
  function renderAct() {
    const box = el.querySelector('.inspect-act');
    const p = ctx.price;
    if (!box || !p) return;
    const a = actState({ kind: p.kind, amount: p.amount, coins: ctx.coins ?? 0, last: !!ctx.last, armed: armed > 0, short: !full });
    const k = `${a.sell}:${a.label}:${a.coin}:${a.disabled}:${a.armed}:${a.note}`;
    if (k === actKey) return;
    actKey = k;
    // a keyboard player keeps the focus on the button they were on (else a second Enter would reach the
    // board's Enter shortcut, src/input.js, or arm Break instead of opening Details)
    const focus = box.contains(document.activeElement) ? (document.activeElement.closest('.inspect-more') ? '.inspect-more' : '.inspect-sell') : null;
    // the button is as wide as its armed label too (a hidden copy holds the room): arming never grows it
    // over Details, so a tap meant for Details never confirms
    box.innerHTML = `
      <button class="inspect-sell ${a.sell ? 'is-sell' : 'is-break'}${a.armed ? ' armed' : ''}" aria-label="${esc(a.aria)}" ${a.disabled ? 'disabled' : ''}>
        <span class="inspect-label"><span>${esc(a.label)}</span><span class="inspect-ghost" aria-hidden="true">${esc(ARMED_LABEL)}</span></span>
        ${a.coin ? `<b><span class="inspect-coin"></span>${esc(a.coin)}</b>` : ''}
      </button>
      ${full ? '' : `<button class="inspect-more" aria-label="Details"><span class="inspect-more-word">Details</span>${INFO_ICON}</button>`}
      ${a.note ? `<span class="inspect-note">${esc(a.note)}</span>` : ''}`;
    if (focus) refocus(focus);
  }

  /** Put the focus back on the card's `sel` button after a rebuild (else Sell, else the ×). */
  function refocus(sel) {
    (el.querySelector(`${sel}:not(:disabled)`) ?? el.querySelector('.inspect-sell:not(:disabled)') ?? el.querySelector('.inspect-x'))?.focus({ preventScroll: true });
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

  /** The namecard rail's cards (a pet's skill buttons) in root px, or null while there are none. */
  function railBox(box) {
    let r = null;
    for (const c of root.querySelectorAll('.kv-cards .kv-card')) {
      const b = c.getBoundingClientRect();
      if (!b.width) continue;
      r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, bottom: b.bottom };
    }
    return r && { left: r.left - box.left, top: r.top - box.top, bottom: r.bottom - box.top };
  }

  /**
   * The short card: centred on the board, as wide as the screen allows (up to 360 px), under or over
   * the tapped block, never over the lanes (short-card.js), and kept off the namecard rail (a pet's
   * skill buttons): narrowed to the rail, Details shown as its icon, wherever Sell and the icon still
   * fit. Measured every frame (the screen can resize, the button row can change); written only when
   * the spot moves.
   */
  function placeShort(tile) {
    pinned = null;
    const box = root.getBoundingClientRect();
    const o = stage.toClient(0, 0); // the canvas's place, read once; the rest is the stage's scale
    const up = stage.toClient(0, 1).y - o.y; // client px per world unit, upward (negative)
    const y = (wy) => o.y + up * wy - box.top;
    let w = Math.round(Math.min(360, box.width - 16));
    const left = Math.round(Math.max(8, Math.min(box.width - 8 - w, o.x - box.left - w / 2)));
    const h = el.scrollHeight + el.offsetHeight - el.clientHeight; // its whole height: one line a row, at any width
    const spot = shortCardSpot({
      tileTop: y(tile.y + GRID.cell / 2),
      tileBottom: y(tile.y - GRID.cell / 2),
      ceiling: y(FRAME_GEOM.parapet.base),
      boardBottom: y(0),
      floor: foot.offsetTop,
      h,
    });
    const rail = railBox(box);
    let narrow = false;
    if (rail && rail.top < spot.top + Math.min(h, spot.maxH) && rail.bottom > spot.top && left + w > rail.left - 4) {
      const fit = Math.floor(rail.left - 4 - left);
      const sell = el.querySelector('.inspect-sell');
      const act = getComputedStyle(el.querySelector('.inspect-act'));
      // Sell (always as wide as its armed label), the 48 px Details icon, the gap, the row's padding, the borders
      const need = (sell?.offsetWidth ?? 0) + 48 + parseFloat(act.columnGap) + parseFloat(act.paddingLeft) + parseFloat(act.paddingRight) + el.offsetWidth - el.clientWidth;
      if (fit >= need) [w, narrow] = [fit, true]; // else it covers the rail: a phone too narrow for both
    }
    const k = `short|${w}|${left}|${spot.top}|${spot.maxH}|${narrow}`;
    if (k === placed) return;
    placed = k;
    el.classList.toggle('narrow', narrow);
    el.style.width = `${w}px`;
    el.style.left = `${left}px`;
    el.style.top = `${spot.top}px`;
    el.style.maxHeight = `${spot.maxH}px`;
  }

  function place(tile, fresh) {
    if (!full) return placeShort(tile);
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
    const at = el.contains(document.activeElement) ? document.activeElement : null;
    const focus = at && (at.closest('.inspect-more') ? '.inspect-more' : at.closest('.inspect-sell') ? '.inspect-sell' : '.inspect-x');
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
    el.classList.toggle('short', !full);
    const picture = `<div class="inspect-pic${pic ? ' inspect-pic-tile' : ''}">${pic ? '' : img ? `<img alt="" src="${esc(img)}" />` : `<b>${info.value}</b>`}</div>`;
    if (!full) {
      // the short card: the picture, the name and value (an egg's name already says it), the buttons
      const value = info.kind === 'egg' ? '' : ` <span class="inspect-value">${info.value}</span>`;
      el.innerHTML = `
      <button class="inspect-x" aria-label="Close">×</button>
      <div class="inspect-head">${picture}<div class="inspect-titles"><h3>${esc(info.title)}${value}</h3></div></div>
      <div class="inspect-act"></div>`;
    } else
      el.innerHTML = `
      <button class="inspect-x" aria-label="Close">×</button>
      <div class="inspect-head">
        ${picture}
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
        setArmed(0); // `full` stays: a pause, or a die card, hides the card it asked for, not its choice
        return;
      }
      ctx = context;
      if (tile.id !== tileId) {
        setArmed(0);
        full = false; // a new block opens short
      }
      tileId = tile.id;
      if (armed > 0) setArmed(Math.max(0, armed - dt));
      const block = `${tile.id}:${tile.tier}:${tile.cls?.element ?? ''}:${tile.cls?.fusion ?? ''}:${tile.cls?.ultimate ?? ''}`;
      // a den's pet hopping out changes its picture (the paw prints) and its line, without a new pop;
      // Details pops the full card in
      const look = `${block}:${full ? 'full' : 'short'}`;
      const k = `${look}:${tile.roam ? (tile.roam.hatch >= 1 ? 'out' : 'in') : ''}`;
      const fresh = k !== key;
      if (fresh) {
        const popped = key.startsWith(`${look}:`);
        key = k;
        render(tile);
        if (!popped) {
          el.classList.remove('pop');
          void el.offsetWidth;
          el.classList.add('pop');
        }
      }
      renderAct();
      if (!el.isConnected) root.append(el, foot); // the HUD can rebuild its DOM
      el.hidden = false;
      place(tile, fresh);
    },
  };
}
