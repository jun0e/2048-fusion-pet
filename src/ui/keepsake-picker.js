// The keepsake picker: before every run but the first, the player picks the keepsake to bring
// (src/sim/keepsakes.js). Six slots: an owned keepsake shows its icon and name; a locked one is
// dimmed under a padlock with the block that unlocks it. The keepsake brought last time is
// picked already, so Start run is one tap. Pure presentation; main.js opens it (the game waits
// meanwhile) and starts the run with the pick. Markup is built from constants (safe innerHTML).
import { KEEPSAKES, isUnlocked, keepsakeById, nextKeepsake } from '../sim/keepsakes.js';
import { tierValue } from '../config.js';
import { LOCK_ICON, keepsakeIcon } from './keepsake-icons.js';

export function createKeepsakePicker(root, { onStart }) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim picker-scrim';
  scrim.setAttribute('role', 'dialog');
  scrim.setAttribute('aria-modal', 'true');
  scrim.setAttribute('aria-labelledby', 'picker-title');
  scrim.inert = true;
  scrim.innerHTML = `
    <div class="card picker">
      <h2 id="picker-title">Pick a keepsake</h2>
      <p class="sub picker-sub"></p>
      <div class="ks-grid" role="group" aria-label="Keepsakes"></div>
      <div class="ks-detail" aria-live="polite"></div>
      <button class="primary picker-start">Start run</button>
    </div>`;
  root.appendChild(scrim);
  const grid = scrim.querySelector('.ks-grid');
  const detail = scrim.querySelector('.ks-detail');
  const startBtn = scrim.querySelector('.picker-start');
  let pick = null; // the keepsake to bring
  let view = null; // the one the detail box describes (a locked one can be read, not picked)
  let best = 0;
  let fresh = [];
  let inerted = [];

  scrim.addEventListener('pointerdown', (e) => e.stopPropagation()); // the board under it never swipes
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.ks-opt');
    if (!b) return;
    view = b.dataset.id;
    if (isUnlocked(view, best)) pick = view;
    render();
    grid.querySelector(`[data-id="${view}"]`)?.focus({ preventScroll: true }); // the grid redraws: keep the focus
  });
  startBtn.addEventListener('click', () => {
    const chosen = pick;
    close();
    onStart?.(chosen);
  });

  function render() {
    grid.innerHTML = KEEPSAKES.map((k) => {
      if (isUnlocked(k.id, best)) {
        return `<button class="ks-opt" data-id="${k.id}" aria-pressed="${k.id === pick}">${fresh.includes(k.id) ? '<span class="ks-new">NEW</span>' : ''}<span class="ks-art">${keepsakeIcon(k.id)}</span>${k.name}</button>`;
      }
      const v = tierValue(k.unlockTier).toLocaleString();
      return `<button class="ks-opt locked" data-id="${k.id}" aria-pressed="false" aria-label="${k.name}, locked: make a ${v} to unlock it"><span class="ks-art">${keepsakeIcon(k.id)}</span><span class="ks-lock">${LOCK_ICON}</span>${k.name}<small>Make a ${v}</small></button>`;
    }).join('');
    const k = keepsakeById(view ?? pick);
    const owned = k && isUnlocked(k.id, best);
    detail.innerHTML = k ? `<b>${k.name}</b>${owned ? '' : ` · locked`}<p>${k.desc}</p>${owned ? '' : `<p>Make a ${tierValue(k.unlockTier).toLocaleString()} in any run to unlock it.</p>`}` : '';
    startBtn.textContent = `Start run with ${keepsakeById(pick)?.name ?? 'no keepsake'}`;
  }

  function close() {
    scrim.classList.remove('open');
    scrim.inert = true;
    for (const el of inerted) el.inert = false;
    inerted = [];
  }

  return {
    /** Show the picker. best: the biggest block ever made; pick: the keepsake picked first; fresh: ids that wear NEW. */
    open({ bestTier = 0, pick: first = null, fresh: newIds = [] } = {}) {
      const already = scrim.classList.contains('open');
      best = bestTier;
      fresh = newIds;
      pick = first && isUnlocked(first, best) ? first : KEEPSAKES[0].id;
      view = fresh[0] ?? pick; // a new keepsake is described first
      const nk = nextKeepsake(best);
      scrim.querySelector('.picker-sub').textContent = nk
        ? `Your best block: ${best ? tierValue(best).toLocaleString() : 'none yet'}. A ${tierValue(nk.unlockTier).toLocaleString()} unlocks the next.`
        : 'You own every keepsake.';
      render();
      if (already) return; // the HUD is already waiting: a second open must not lose what it made inert
      // the rest of the HUD waits behind the dialog (no focus, no taps)
      inerted = [...root.children].filter((el) => el !== scrim && !el.inert);
      for (const el of inerted) el.inert = true;
      scrim.inert = false;
      scrim.classList.add('open');
      startBtn.focus({ preventScroll: true });
    },
    close,
    get isOpen() {
      return scrim.classList.contains('open');
    },
  };
}
