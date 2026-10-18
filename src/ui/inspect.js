// Tile info popup: tap a block to see what it is and to sell it. It opens short (the picture, the
// name and value, Sell / Break and Details) over the board, under or over the tapped block
// (src/ui/short-card.js), so the lanes stay in view, waves or not, and Sell needs no scrolling.
// Details opens the full card at the top of the screen, as v2 has it (docs/v2/SPEC.md section 7): a
// plain stone block, an egg (the pet it hatches into), a single pet (its attack, what it gives a
// fusion, the fusions it makes with the singles on the board), a fusion pet (its main and second
// element, its buffs, its summon skill as a tooltip with its live state: locked below 1024, charging,
// ready, out on the field; its pure aura at 4096). Content comes from src/sim/describe.js and the
// shared card pieces from src/ui/cards.js; the picture is the tile itself in its pit (art.tileCanvas:
// the board and the card agree), else the generated sprite. Tap the block again, anywhere else, or ×
// to close.
// The card also sells a turret (+1 swipe's price) or breaks a dormant block (−3 swipes);
// the button asks for a second tap before it acts, and while it waits the tile's brackets on the
// board turn red and dashed (onArm).
import './inspect.css';
import { GRID, GRID_TOP } from '../config.js';
import { FRAME_GEOM } from '../art/frame-kit.js';
import { ELEMENTS } from '../sim/classes.js';
import { describeTile, skillState, singlesOf } from '../sim/describe.js';
import { petName } from '../art/tokens.js';
import { generatedUrl } from '../render/textures.js';
import { ARMED_LABEL, actState, shortCardSpot } from './short-card.js';
import { elChipHtml, fusionPic, petPicId, skillTipHtml } from './cards.js';
import { tr } from '../i18n/index.js';

/** The narrow short card's sizes (px), as inspect.css sets them: the buttons' side padding, the row's gap and side padding, the Details icon. */
const NARROW = { button: 10, gap: 6, row: 8, icon: 48 };

/**
 * The room the full card needs above the board (px): with less (a phone), it reaches on over the board,
 * down to the screen's foot, since v2's card says more (a fusion's whole skill); its picture names the
 * block it covers.
 */
export const FULL_ROOM = 360;

/** Details as an icon, where the short card narrows to keep off the namecard rail (24 px, as the HUD's icons). */
const INFO_ICON = '<svg class="inspect-more-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.2v.1" /></svg>';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The card's picture without the tile's canvas: an egg, a baby pet, a fusion pet's portrait (a plain block shows its value). */
function imageFor(tile, info, art) {
  const cls = tile.cls ?? {};
  if (info.kind === 'plain') return null;
  if (info.kind === 'egg' || info.kind === 'single') return generatedUrl(petPicId(cls.element, tile.tier));
  return fusionPic(cls, generatedUrl) ?? art?.portrait?.(cls) ?? null;
}

/** The card's picture: the tile in its pit, 72 CSS px at the screen's density (null without the art). */
function tilePicture(tile, art) {
  if (!art?.tileCanvas || art.style === 'classic') return null;
  const c = art.tileCanvas(tile, Math.round(72 * Math.min(3, globalThis.devicePixelRatio || 1)));
  c.setAttribute('aria-hidden', 'true');
  return c;
}

/** Where a fusion's pet is: home on its tile, hopping out or back, or out on the field (tile.summon). */
const petWhere = (tile) => (!tile.summon ? 'home' : tile.summon.phase === 'act' ? 'out' : 'hopping');

export function createInspect(root, { stage, art, onClose, onDiscard, onArm }) {
  const el = document.createElement('div');
  el.className = 'inspect';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', tr('card.name'));
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
      // a tap or a click leaves no focus behind (Space would reach the full card's Sell); a keyboard
      // player's focus moves to the × as the card turns over (render)
      if (e.detail > 0) document.activeElement?.blur();
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
      ${full ? '' : `<button class="inspect-more" aria-label="${esc(tr('card.details'))}"><span class="inspect-more-word">${esc(tr('card.details'))}</span>${INFO_ICON}</button>`}
      ${a.note ? `<span class="inspect-note">${esc(a.note)}</span>` : ''}`;
    if (focus) refocus(focus);
  }

  /**
   * Put the focus back on the card's `sel` button after a rebuild, else on the ×: never on Sell
   * unless it had it (Space or Enter there would arm and then sell a block the player never chose to).
   */
  function refocus(sel) {
    (el.querySelector(`${sel}:not(:disabled)`) ?? el.querySelector('.inspect-x'))?.focus({ preventScroll: true });
  }

  let placed = ''; // the layout the card was last placed for (it is shown, so offsetTop is real)
  let pinned = null; // a den's card keeps clear of its pet out on the field: { top, maxH }, chosen as it opens

  /**
   * Where a den's pet stands on screen, its head to its feet (client px), while it is out on a summon;
   * else null. A pure pet reaches higher: its halo floats over it (src/kv/roam.js MARK.haloY + its
   * hover + the halo's radius ≈ 3.7 units, its brackets a little above).
   */
  function petSpan(tile) {
    const r = tile.summon;
    if (!r || petWhere(tile) !== 'out') return null;
    const reach = tile.cls?.pure ? 3.8 : 2.5;
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

  /**
   * The namecard rail (a pet's skill buttons) in root px, or null while it has no card: the strip's
   * box, which a card's bob, nudge or fall never moves (the cards' own boxes do, and the card would
   * flicker between its two widths).
   */
  function railBox(box) {
    const strip = root.querySelector('.kv-cards');
    const b = strip?.querySelector('.kv-card') && strip.getBoundingClientRect();
    if (!b || b.height < 1) return null;
    return { left: b.left - box.left, top: b.top - box.top, bottom: b.bottom - box.top };
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
      // Sell (always as wide as its armed label) at the narrow row's padding, the 48 px Details icon, the
      // narrow row's gap and padding, the card's borders
      const pad = sell ? parseFloat(getComputedStyle(sell).paddingLeft) : 0;
      const need = (sell?.offsetWidth ?? 0) - 2 * (pad - NARROW.button) + NARROW.icon + NARROW.gap + 2 * NARROW.row + el.offsetWidth - el.clientWidth;
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
    // over the lanes, not the board (the tapped block may sit in its top row), where FULL_ROOM fits
    // above it; else down to the screen's foot. Longer still, it scrolls inside
    const boardTop = stage.toClient(0, GRID_TOP).y;
    if (fresh) {
      // measured at the card's own width (its lines wrap there), then placed
      el.style.width = `${w}px`;
      pinned = pinFor(tile, boardTop);
      placed = ''; // pinFor cleared the card's top: write it again even when the layout is the same
    }
    const k = `${w}|${left}|${boardTop}|${foot.offsetTop}|${pinned ? `${pinned.top}:${pinned.maxH}` : ''}`;
    if (k === placed) return; // per frame while open: write only when the layout moved
    placed = k;
    el.style.width = `${w}px`;
    el.style.left = `${left}px`;
    el.style.top = pinned ? `${pinned.top}px` : '';
    const above = boardTop - el.offsetTop - 6;
    el.style.maxHeight = `${pinned ? pinned.maxH : Math.max(180, above >= FULL_ROOM ? above : foot.offsetTop - el.offsetTop - 6)}px`;
  }

  /** The parts of the full card that only some blocks have (src/sim/describe.js describeTile). */
  function extras(info) {
    const out = [];
    if (info.hint) out.push(`<p class="inspect-hint">${esc(info.hint)}</p>`);
    if (info.feed) out.push(`<p class="inspect-perk inspect-feed">${esc(info.feed)}</p>`);
    if (info.auras?.length) out.push(`<div class="inspect-auras"><h4>${esc(tr('card.auras'))}</h4><ul>${info.auras.map((a) => `<li style="--c:${ELEMENTS[a.element].color}">${esc(a.text)}</li>`).join('')}</ul></div>`);
    if (info.buffs) {
      out.push(
        `<div class="inspect-buffs"><h4>${esc(tr('card.buffs'))}</h4>${
          info.buffs.length ? `<ul>${info.buffs.map((b) => `<li style="--c:${ELEMENTS[b.element].color}">${esc(b.text)}</li>`).join('')}</ul>` : `<p>${esc(tr('card.buffs.none'))}</p>`
        }</div>`,
      );
    }
    // the skill as a tooltip; its foot is the summon's live state (updateSkill)
    if (info.skill) out.push(skillTipHtml(info.skill.cls, { passive: info.kind === 'fusion', foot: `<p class="tip-foot tip-state"><span class="tip-text"></span><span class="tip-bar"><i></i></span></p>` }));
    if (info.pure) {
      const p = info.pure;
      out.push(
        `<div class="inspect-pure${p.active ? ' on' : ''}" style="--c:${ELEMENTS[p.element].color}"><h4>${esc(p.active ? p.name : p.at)}</h4><p>${esc(p.aura)}${p.active ? ` ${esc(p.self)}` : ''}</p></div>`,
      );
    }
    if (info.fuses) {
      out.push(
        `<div class="inspect-fuses"><h4>${esc(tr('card.fuses'))}</h4>${
          info.fuses.length
            ? `<ul>${info.fuses
                .map((f) => {
                  const face = fusionPic({ element: info.elements[0].element, fusion: f.partner }, generatedUrl);
                  return `<li style="--c:${f.color}"><span class="fc-pic">${face ? `<img alt="" src="${esc(face)}" />` : ''}</span><span><b>${esc(f.skill)}</b> <small>${esc(f.pet)} · ${esc(tr('card.fuses.with', { name: tr(`el.${f.partner}`) }))}</small></span></li>`;
                })
                .join('')}</ul>`
            : `<p>${esc(tr('card.fuses.none'))}</p>`
        }</div>`,
      );
    }
    return out.join('');
  }

  let skillKey = '';
  /** The skill tooltip's foot, every frame: locked, charging (with its bar), ready, or out with the time left. */
  function updateSkill(tile) {
    const foot = el.querySelector('.tip-state');
    if (!foot) return;
    const st = skillState(tile, ctx.skill);
    const k = `${st.state}|${st.text}|${Math.round(st.charge * 50)}`;
    if (k === skillKey) return;
    skillKey = k;
    foot.querySelector('.tip-text').textContent = st.text;
    foot.classList.toggle('ready', st.state === 'ready');
    foot.querySelector('.tip-bar').hidden = st.state !== 'charging';
    foot.style.setProperty('--f', st.charge.toFixed(3));
  }

  function render(tile) {
    // a re-render (a den's pet has hopped out) keeps the keyboard focus where it was in the card
    const at = el.contains(document.activeElement) ? document.activeElement : null;
    const focus = at && (at.closest('.inspect-more') ? '.inspect-more' : at.closest('.inspect-sell') ? '.inspect-sell' : '.inspect-x');
    const info = describeTile(tile, { petName, tiles: ctx.tiles, skill: ctx.skill });
    const pic = tilePicture(tile, art);
    const img = pic ? null : imageFor(tile, info, art);
    const c = info.colors[0];
    const chips = info.elements.map((x) => elChipHtml(x.element, { main: x.main, img: generatedUrl })).join('');
    el.style.setProperty('--c', c);
    el.classList.toggle('short', !full);
    const picture = `<div class="inspect-pic${pic ? ' inspect-pic-tile' : ''}">${pic ? '' : img ? `<img alt="" src="${esc(img)}" />` : `<b>${info.value}</b>`}</div>`;
    skillKey = '';
    if (!full) {
      // the short card: the picture, the name and value, the buttons
      // the name gives way first ("…"), the value never: a pet's name runs to 22 letters
      el.innerHTML = `
      <button class="inspect-x" aria-label="${esc(tr('ui.close'))}">×</button>
      <div class="inspect-head">${picture}<div class="inspect-titles"><h3><span class="inspect-name">${esc(info.title)}</span><span class="inspect-value">${info.value}</span></h3></div></div>
      <div class="inspect-act"></div>`;
    } else
      el.innerHTML = `
      <button class="inspect-x" aria-label="${esc(tr('ui.close'))}">×</button>
      <div class="inspect-head">
        ${picture}
        <div class="inspect-titles">
          <h3>${esc(info.title)}</h3>
          ${info.subtitle ? `<div class="inspect-kicker">${esc(info.subtitle)}</div>` : ''}
          <div class="inspect-sub">${chips}<span class="inspect-value">${info.value}</span></div>
        </div>
      </div>
      ${info.desc ? `<p class="inspect-desc">${esc(info.desc)}</p>` : ''}
      ${info.stats.length ? `<dl class="inspect-stats">${info.stats.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>` : ''}
      ${info.effects.length ? `<ul class="inspect-fx">${info.effects.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${extras(info)}
      ${info.next ? `<p class="inspect-next">${esc(info.next)}</p>` : ''}
      <div class="inspect-act"></div>`;
    if (pic) el.querySelector('.inspect-pic').appendChild(pic);
    actKey = '';
    renderAct();
    updateSkill(tile);
    if (focus) refocus(focus);
  }

  return {
    /**
     * Show the popup for `tile`, or hide it with null (`kept`: the block is still picked, the card
     * only hidden). Re-renders only when the block changes; `context` = { price, coins, last, tiles,
     * skill } keeps the sell / break row current, a single pet's fusions with the singles on the board
     * (tiles), and a fusion's summon line (skill: { charge, ready } from the run).
     */
    show(tile, context = {}, dt = 0, { kept = false } = {}) {
      if (!tile) {
        if (!el.hidden) el.hidden = true; // no write per frame while nothing is picked
        key = '';
        placed = '';
        pinned = null;
        setArmed(0);
        // kept: the block is still picked, the card only hidden (a pause, the tutorial): it comes
        // back as it was; closed (×, a swipe, another tap, a die card), it opens short next time
        if (!kept) full = false;
        return;
      }
      ctx = context;
      if (tile.id !== tileId) {
        setArmed(0);
        full = false; // a new block opens short
      }
      tileId = tile.id;
      if (armed > 0) setArmed(Math.max(0, armed - dt));
      const cls = tile.cls ?? {};
      const block = `${tile.id}:${tile.tier}:${cls.element ?? ''}:${cls.fusion ?? ''}:${cls.pure ? 'pure' : ''}:${JSON.stringify(cls.buffs ?? {})}`;
      // a den's pet hopping out changes its picture (the paw prints) and its line, without a new pop;
      // Details pops the full card in. A single pet's fusions follow the singles on the board
      const look = `${block}:${full ? 'full' : 'short'}`;
      const singles = cls.element && !cls.fusion && full ? [...singlesOf(ctx.tiles ?? [], tile)].join(',') : '';
      const k = `${look}:${petWhere(tile)}:${singles}`;
      const fresh = k !== key;
      if (fresh) {
        const popped = key.startsWith(`${look}:`);
        key = k;
        // the same block drawn again (its pet hopped, the singles on the board changed): the player's
        // place in a scrolled card stays
        const scroll = popped ? el.scrollTop : 0;
        render(tile);
        el.scrollTop = scroll;
        if (!popped) {
          el.classList.remove('pop');
          void el.offsetWidth;
          el.classList.add('pop');
        }
      }
      renderAct();
      if (full) updateSkill(tile);
      if (!el.isConnected) root.append(el, foot); // the HUD can rebuild its DOM
      el.hidden = false;
      place(tile, fresh);
    },
  };
}
