// The boss intro card (T6): as a boss wave starts, a card with the boss's portrait (the generated
// "boss approaches" bust, enemy.<key>.portrait), its name and what it does shows over the field for
// 2.6 s, then fades. It never takes a tap. The news ribbon still says it (it is the HUD's spoken
// line, aria-live), so the card stays out of the accessibility tree.
// A large panel (docs/ux/photosafe.md): it slides in only when the flash budget allows
// (stage.takeFlash) and Reduce motion is off; else it fades in over 0.6 s.
import { FIELD, GRID_TOP } from '../config.js';
import { ENEMY_TYPES } from '../sim/enemies.js';
import { generatedUrl } from '../render/textures.js';
import { tr } from '../i18n/index.js';

const SHOW_MS = 2600;
const OUT_MS = 450;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createBossIntro(root, { stage }) {
  const el = document.createElement('div');
  el.className = 'boss-intro';
  el.setAttribute('aria-hidden', 'true');
  el.hidden = true;
  root.appendChild(el);
  let timer = 0;

  function hide() {
    clearTimeout(timer);
    el.hidden = true;
    el.classList.remove('slide', 'fade', 'out');
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
      const calm = document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
      const slide = !calm && stage.takeFlash();
      hide();
      el.hidden = false;
      void el.offsetWidth; // restart the animation
      el.classList.add(slide ? 'slide' : 'fade');
      // centred over the field: between the portals' line and the board's top
      const top = stage.toClient(0, FIELD.spawnY + 1.05).y;
      const bottom = stage.toClient(0, GRID_TOP).y;
      el.style.top = `${Math.round((top + bottom) / 2 - el.offsetHeight / 2 - root.getBoundingClientRect().top)}px`;
      timer = setTimeout(() => {
        el.classList.add('out');
        timer = setTimeout(hide, OUT_MS);
      }, SHOW_MS);
      return true;
    },
    hide,
  };
}
