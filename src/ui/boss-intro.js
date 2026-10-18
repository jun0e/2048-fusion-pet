// The boss intro card (T6): as a boss wave starts, a card with the boss's portrait (the generated
// "boss approaches" bust, enemy.<key>.portrait), its name and what it does shows over the field for
// 2.6 s of play, then fades. It never takes a tap, and it waits, hidden, behind a die card and while
// paused (its time is the frame loop's: update). The news ribbon still says it (it is the HUD's
// spoken line, aria-live), so the card stays out of the accessibility tree.
// A large panel (docs/ux/photosafe.md): it always fades in, over 0.6 s, which is no flash, so it
// never takes the flash budget a pet's skill cut-in needs.
// It sits on the field, never over the namecard rail (place), and halfway between the portals and the
// board (hud.css, from main.js's --field-top and --board-top). Two rows (the portrait and the name; what
// it does, three or four lines as the room allows), so it fits between the gates and the board on every
// phone, a 320 x 480 one with its toolbars showing included.
import { FIELD, GRID_TOP } from '../config.js';
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

  /**
   * Off the namecard rail: its right edge at most 4 px inside the right tower. Centred on the field where
   * a centred card is still 240 px wide or more (a big phone, a tablet, a laptop); on a smaller phone it
   * starts at the screen's 8 px gutter instead, over the left tower, so its lines stay long and the card
   * short. Its intro takes a fourth line where the room allows.
   */
  function place() {
    const box = root.getBoundingClientRect();
    const right = stage.toClient(FRAME_GEOM.towerIn, 0).x - box.left - 4;
    const mid = stage.toClient(0, 0).x - box.left;
    const centred = Math.min(360, 2 * (right - mid));
    const w = Math.round(centred >= 240 ? centred : Math.min(360, right - 8));
    const x = Math.round(centred >= 240 ? mid - w / 2 : Math.max(8, Math.min(right - w, mid - w / 2)));
    const room = stage.toClient(0, GRID_TOP + 0.3).y - stage.toClient(0, FIELD.spawnY + 1.05).y; // --board-top less --field-top
    const lines = room >= 170 ? 4 : 3;
    const k = `${w}|${x}|${lines}`;
    if (k === placed) return;
    placed = k;
    el.style.left = `${x}px`;
    el.style.width = `${w}px`;
    el.style.setProperty('--lines', String(lines));
    el.classList.toggle('narrow', w < 260); // a smaller name on a narrow card (the portrait still sets the row)
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
          <div class="boss-intro-head">
            <span class="boss-intro-kicker">${esc(tr('boss.kicker'))}</span>
            <b>${esc(boss.name)}</b>
          </div>
          ${boss.intro ? `<span class="boss-intro-line">${esc(boss.intro)}</span>` : ''}
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
