// Tile info popup: tap a block to see what it does (attack, numbers, effects, what it
// becomes next). Content comes from src/sim/describe.js, the image from the generated
// art when it exists. Shown at the top of the screen so the board and the block's range
// drawing stay visible; tap the block again, anywhere else, or × to close.
// The card also sells a turret (+1 swipe's price) or breaks a dormant block (−3 swipes);
// the button asks for a second tap before it acts.
import './inspect.css';
import { GRID_TOP } from '../config.js';
import { FRAME_GEOM } from '../art/frame-kit.js';
import { ELEMENTS } from '../sim/classes.js';
import { describeTile } from '../sim/describe.js';
import { petName } from '../art/tokens.js';
import { spriteId, portraitId } from '../art/sprite-ids.js';
import { generatedUrl } from '../render/textures.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function imageFor(tile, info, art) {
  const cls = tile.cls ?? {};
  if (info.kind === 'egg') return generatedUrl(spriteId({ kind: 'egg', tier: Math.max(1, Math.min(3, tile.tier)) }));
  if (info.kind === 'element') return generatedUrl(spriteId({ kind: 'baby', el: cls.element, stage: Math.min(3, tile.tier - 4) }));
  return generatedUrl(portraitId(cls)) ?? generatedUrl(spriteId({ kind: 'fusion', a: cls.element, b: cls.fusion })) ?? art?.portrait(cls) ?? null;
}

export function createInspect(root, { stage, art, onClose, onDiscard }) {
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
  let ctx = {};

  el.addEventListener('pointerdown', (e) => e.stopPropagation()); // reading the card never swipes the board
  // click, not pointerdown: Enter and Space on a focused button work too
  el.addEventListener('click', (e) => {
    if (e.target.closest('.inspect-x')) onClose?.();
    const btn = e.target.closest('.inspect-sell');
    if (btn && !btn.disabled) {
      if (armed > 0) {
        armed = 0;
        onDiscard?.(tileId);
      } else armed = 2.5;
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
  }

  let placed = ''; // the layout the card was last placed for (it is shown, so offsetTop is real)
  function place() {
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
    const k = `${w}|${left}|${boardTop}`;
    if (k === placed) return; // per frame while open: write only when the layout moved
    placed = k;
    el.style.width = `${w}px`;
    el.style.left = `${left}px`;
    el.style.maxHeight = `${Math.max(180, boardTop - el.offsetTop - 6)}px`;
  }

  function render(tile) {
    const info = describeTile(tile, petName);
    const img = imageFor(tile, info, art);
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
        <div class="inspect-pic">${img ? `<img alt="" src="${esc(img)}" />` : `<b>${info.value}</b>`}</div>
        <div class="inspect-titles">
          <h3>${esc(info.title)}</h3>
          <div class="inspect-sub">${chips}<span class="inspect-value">${info.value}</span></div>
          ${info.petName ? `<div class="inspect-pet">Pet: <b>${esc(info.petName)}</b></div>` : ''}
        </div>
      </div>
      <p class="inspect-desc">${esc(info.desc)}</p>
      ${info.stats.length ? `<dl class="inspect-stats">${info.stats.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>` : ''}
      ${info.effects.length ? `<ul class="inspect-fx">${info.effects.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${info.signature ? `<p class="inspect-special">${esc(info.signature)}</p>` : ''}
      ${info.skill ? `<p class="inspect-special">${esc(info.skill)}</p>` : ''}
      ${info.next ? `<p class="inspect-next">${esc(info.next)}</p>` : ''}
      <div class="inspect-act"></div>`;
    actKey = '';
    renderAct();
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
        armed = 0;
        return;
      }
      ctx = context;
      if (tile.id !== tileId) armed = 0;
      tileId = tile.id;
      if (armed > 0) armed = Math.max(0, armed - dt);
      const k = `${tile.id}:${tile.tier}:${tile.cls?.element ?? ''}:${tile.cls?.fusion ?? ''}:${tile.cls?.ultimate ?? ''}`;
      if (k !== key) {
        key = k;
        render(tile);
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
      }
      renderAct();
      if (!el.isConnected) root.appendChild(el); // the HUD can rebuild its DOM
      el.hidden = false;
      place();
    },
  };
}
