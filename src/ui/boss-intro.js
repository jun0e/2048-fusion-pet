// The boss intro card (T6): as a boss wave starts, a card with the boss's portrait (the generated
// "boss approaches" bust, enemy.<key>.portrait), its name and what it does shows over the field for
// 2.6 s of play, then fades. It never takes a tap, and it waits, hidden, behind a die card and while
// paused (its time is the frame loop's: update). The news ribbon still says it (it is the HUD's
// spoken line, aria-live), so the card stays out of the accessibility tree.
// A large panel (docs/ux/photosafe.md): it always fades in, over 0.6 s, which is no flash, so it
// never takes the flash budget a pet's skill cut-in needs.
// It sits between the field's towers, as the full block card does, never over the namecard rail, and
// halfway between the portals and the board (hud.css, from main.js's --field-top and --board-top).
import { ENEMY_TYPES } from '../sim/enemies.js';
import { FRAME_GEOM } from '../art/frame-kit.js';
import { generatedUrl } from '../render/textures.js';
import { tr } from '../i18n/index.js';

const SHOW_S = 2.6;
const OUT_S = 0.45;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createBossIntro(root, { stage }) {
  const el = document.createElement('div');
  el.className = 'boss-intro';
  el.setAttribute('aria-hidden', 'true');
  el.hidden = true;
  root.appendChild(el);
  let left = 0; // seconds of play still to show (then OUT_S of fading)
  let placed = '';

  function hide() {
    left = 0;
    el.hidden = true;
    el.classList.remove('fade', 'out');
  }

  /** Between the towers, the right edge 4 px inside the right one (as inspect.js places the full card). */
  function place() {
    const box = root.getBoundingClientRect();
    const towerL = stage.toClient(-FRAME_GEOM.towerIn, 0).x - box.left;
    const towerR = stage.toClient(FRAME_GEOM.towerIn, 0).x - box.left;
    const w = Math.round(Math.max(240, Math.min(360, towerR - towerL - 8)));
    const x = Math.round(towerR - 4 - w);
    const k = `${w}|${x}`;
    if (k === placed) return;
    placed = k;
    el.style.left = `${x}px`;
    el.style.width = `${w}px`;
  }

  return {
    /** Show boss `key`'s card; false when there is no portrait for it (the ribbon alone says it then). */
    show(key) {
      const boss = ENEMY_TYPES[key];
      const pic = generatedUrl(`enemy.${key}.portrait`);
      if (!boss || !pic) return false;
      if (!el.isConnected) root.appendChild(el); // the HUD can rebuild its DOM
      el.style.setProperty('--c', boss.color ?? '#ef6060');
      el.innerHTML = `
        <div class="boss-intro-card">
          <img alt="" src="${esc(pic)}" />
          <div class="boss-intro-text">
            <span class="boss-intro-kicker">${esc(tr('boss.kicker'))}</span>
            <b>${esc(boss.name)}</b>
            ${boss.intro ? `<span class="boss-intro-line">${esc(boss.intro)}</span>` : ''}
          </div>
        </div>`;
      hide();
      el.hidden = false;
      void el.offsetWidth; // restart the fade
      el.classList.add('fade');
      left = SHOW_S + OUT_S;
      placed = '';
      place();
      return true;
    },
    /** Per frame: `dt` is play time (0 while paused or behind a die card: the card waits). */
    update(dt) {
      if (el.hidden) return;
      place();
      left -= dt;
      if (left <= OUT_S && !el.classList.contains('out')) el.classList.add('out');
      if (left <= 0) hide();
    },
    hide,
  };
}
