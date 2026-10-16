// The spawn level and the keepsake on the run screen (src/sim/levels.js, src/sim/keepsakes.js):
// two clay discs at the bottom corners, the level above the coin plate (XP is bought with coins)
// and the keepsake above Wave now. Tapping a disc opens its card where the block's full card opens
// (src/ui/inspect.js: at the top, so the board stays in view). The level card shows the spawn
// odds now and at the next level, how XP comes, and Buy XP; the keepsake card says what the
// keepsake does and which one unlocks next. Pure presentation; main.js feeds it every frame.
// All markup is built from constants and numbers (no user input), so innerHTML is safe.
import { GRID, GRID_TOP, TIER_COLORS, cellX, tierValue } from '../config.js';
import { LEVELS, spawnOdds } from '../sim/levels.js';
import { keepsakeById, nextKeepsake } from '../sim/keepsakes.js';
import { keepsakeIcon } from './keepsake-icons.js';

const RING = 2 * Math.PI * 19; // the XP ring's length (r = 19 in a 44-unit box)

/** Odds as chips: the value on its tier colour, the percentage under it. */
export function oddsHtml(odds) {
  return odds.map((o) => `<span class="odd" style="--c:${TIER_COLORS[o.tier]}"><b>${o.value}</b><em>${o.pct}%</em></span>`).join('');
}

/**
 * The level card's text, from the run's numbers (pure: tested in test/keepsakes.test.js). `price`
 * is what Buy XP costs (null when it can't be bought); `cap` the level the top block allows.
 * → { title, xpText, share (0–1), now, next (null at the top), nextLevel, notes: [string], buy }
 */
export function levelCard({ level, xp, need, cap = LEVELS.max, spawnLevel = level, maxTier = 0, no2 = false, keepsake = null, coins = 0, price = null }) {
  const top = level >= LEVELS.max;
  const atCap = !top && level >= cap;
  const bonus = keepsakeById(keepsake)?.levels ?? 0; // Lucky Clover
  const nextLevel = Math.min(LEVELS.max, level + 1); // the player's next level, as the disc counts
  const nextSpawn = Math.min(LEVELS.max, nextLevel + bonus);
  const raise = tierValue(cap + (LEVELS.capBelowTop ?? 0) + 1).toLocaleString(); // the block that lifts the cap a level
  const oddsTop = spawnLevel >= LEVELS.max;
  const notes = [];
  if (spawnLevel > level) notes.push(`${keepsakeById(keepsake)?.name ?? 'Your keepsake'}: new blocks use level ${spawnLevel}'s odds.`);
  if (atCap) notes.push(`Your top block caps the level at ${cap}: a ${raise} raises it.`);
  notes.push(no2 ? 'You made a 512: 2s no longer spawn.' : 'After your first 512, 2s stop spawning.');
  const label = `Buy ${LEVELS.buy.xp} XP`;
  let buy;
  if (top || oddsTop) buy = { ok: false, label: 'Top odds', price: null, note: 'Your spawns are as good as they get.' };
  else if (price == null) buy = { ok: false, label, price: null, note: `Make a ${raise} to raise the cap.` };
  else if (coins < price) buy = { ok: false, label, price, note: `Need ${price} coins.` };
  else buy = { ok: true, label, price, note: `${LEVELS.buy.xp} XP for the price of ${LEVELS.buy.swipes} swipes.` };
  return {
    title: `Spawn level ${level}`,
    xpText: top ? 'Top level' : `${xp} / ${need} XP`,
    share: top ? 1 : Math.max(0, Math.min(1, xp / need)),
    now: spawnOdds(spawnLevel, maxTier),
    next: !top && nextSpawn > spawnLevel ? spawnOdds(nextSpawn, maxTier) : null,
    nextLevel,
    notes,
    buy,
  };
}

/** Where XP comes from, in words (the numbers in src/sim/levels.js). */
export const xpSources = () =>
  `XP: +${LEVELS.xp.waveClear} for each cleared wave${LEVELS.xp.merge ? `, +${LEVELS.xp.merge} for each merge` : ''}, or buy it.`;

export function createRunBadges(root, { stage, onBuyXp, onOpen }) {
  const lv = document.createElement('button');
  lv.className = 'run-badge lv-badge';
  lv.dataset.badge = 'level';
  lv.innerHTML = `
    <svg class="lv-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="lv-track" cx="22" cy="22" r="19"/><circle class="lv-fill" cx="22" cy="22" r="19" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></svg>
    <span class="lv-face"><small>Lv</small><b>1</b></span>`;
  const ks = document.createElement('button');
  ks.className = 'run-badge ks-badge';
  ks.dataset.badge = 'keepsake';
  ks.innerHTML = '<span class="ks-face"></span>';
  lv.hidden = ks.hidden = true; // until the first frame says what the run has (the showcase has neither)
  const card = document.createElement('div');
  card.className = 'inspect run-card';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  root.append(lv, ks, card);

  const lvNum = lv.querySelector('b');
  const lvFill = lv.querySelector('.lv-fill');
  let open = null; // 'level' | 'keepsake' | null
  let shown = { level: 0, share: -1, keepsake: undefined, spent: null };
  let cardKey = '';
  let placedFor = ''; // the screen the card was placed for (placed again only when it changes)
  let last = null; // the latest numbers (update())

  for (const b of [lv, ks]) {
    b.addEventListener('pointerdown', (e) => e.stopPropagation()); // a tap on a disc never swipes the board
    b.addEventListener('click', () => {
      toggle(b.dataset.badge);
      b.blur();
    });
  }
  card.addEventListener('pointerdown', (e) => e.stopPropagation());
  card.addEventListener('click', (e) => {
    if (e.target.closest('.inspect-x')) close();
    const buy = e.target.closest('.lv-buy');
    if (buy && !buy.disabled) onBuyXp?.();
  });

  function toggle(which) {
    if (open === which) return close();
    open = which;
    cardKey = '';
    onOpen?.(which);
    render();
  }
  function close() {
    open = null;
    card.hidden = true;
    cardKey = '';
    placedFor = '';
  }

  /** Where the block card goes: across the board's width, under the top bars, never over the board. */
  function place() {
    const left = stage.toClient(cellX(0) - GRID.cell / 2, 0).x;
    const right = stage.toClient(cellX(GRID.size - 1) + GRID.cell / 2, 0).x;
    const w = Math.min(360, Math.max(260, right - left + 24));
    card.style.width = `${w}px`;
    card.style.left = `${(left + right) / 2 - w / 2}px`;
    const boardTop = stage.toClient(0, GRID_TOP).y;
    card.style.maxHeight = `${Math.max(180, boardTop - card.offsetTop - 6)}px`;
  }

  function renderLevel(n) {
    const c = levelCard(n);
    const key = `L|${n.level}|${n.xp}|${n.cap}|${n.spawnLevel}|${n.no2}|${c.buy.ok}|${c.buy.price}`;
    if (key === cardKey) return;
    cardKey = key;
    const refocus = card.contains(document.activeElement) && document.activeElement.classList.contains('lv-buy'); // a keyboard buyer keeps the button
    card.style.setProperty('--c', '#ffcf4a');
    card.innerHTML = `
      <button class="inspect-x" aria-label="Close">×</button>
      <div class="inspect-head">
        <div class="inspect-pic lv-pic"><small>Lv</small><b>${n.level}</b></div>
        <div class="inspect-titles">
          <h3>${c.title}</h3>
          <div class="inspect-sub"><span class="inspect-value">${c.xpText}</span></div>
        </div>
      </div>
      <div class="lv-xpbar" aria-hidden="true"><i style="transform:scaleX(${c.share})"></i></div>
      <div class="inspect-act lv-act">
        <button class="inspect-sell is-sell lv-buy" ${c.buy.ok ? '' : 'disabled'}>${c.buy.label}${c.buy.price != null ? ` <b><span class="inspect-coin"></span>−${c.buy.price}</b>` : ''}</button>
        <span class="inspect-note">${c.buy.note}</span>
      </div>
      <div class="lv-odds"><span class="lv-odds-label">New blocks</span><div class="odds">${oddsHtml(c.now)}</div></div>
      ${c.next ? `<div class="lv-odds next"><span class="lv-odds-label">At Lv ${c.nextLevel}</span><div class="odds">${oddsHtml(c.next)}</div></div>` : ''}
      <p class="inspect-next">${xpSources()} ${c.notes.join(' ')}</p>`;
    if (refocus) card.querySelector('.lv-buy')?.focus({ preventScroll: true });
  }

  function renderKeepsake(n) {
    const k = keepsakeById(n.keepsake);
    const nk = nextKeepsake(n.bestTier);
    const key = `K|${n.keepsake}|${n.phoenixReady}|${n.bestTier}`;
    if (key === cardKey || !k) return;
    cardKey = key;
    card.style.setProperty('--c', '#c9b8a4');
    const used = k.reviveHp != null ? `<p class="inspect-special">${n.phoenixReady ? 'Ready: it has not been used this run.' : 'Used this run. It comes back next run.'}</p>` : '';
    const next = nk ? `Next keepsake: ${nk.name}, unlocked by your first ${tierValue(nk.unlockTier).toLocaleString()} (your best: ${n.bestTier ? tierValue(n.bestTier).toLocaleString() : 'none yet'}).` : 'You own every keepsake.';
    card.innerHTML = `
      <button class="inspect-x" aria-label="Close">×</button>
      <div class="inspect-head">
        <div class="inspect-pic ks-pic">${keepsakeIcon(k.id)}</div>
        <div class="inspect-titles">
          <h3>${k.name}</h3>
          <div class="inspect-sub"><span class="inspect-chip">Keepsake</span></div>
        </div>
      </div>
      <p class="inspect-desc">${k.desc}</p>
      ${used}
      <p class="inspect-next">Brought into this run. Pick another before your next run. ${next}</p>`;
  }

  function render() {
    if (!open || !last) return;
    if (open === 'level') renderLevel(last);
    else renderKeepsake(last);
    card.setAttribute('aria-label', open === 'level' ? 'Spawn level' : 'Keepsake');
    card.hidden = false;
    const screen = `${stage.view.U}|${stage.view.w}|${stage.view.h}`;
    if (screen !== placedFor) {
      placedFor = screen;
      place();
    }
  }

  return {
    /**
     * Per frame. n: { level, xp, need, cap, spawnLevel, maxTier, no2, keepsake, phoenixReady, coins,
     * price (Buy XP, null: can't buy), bestTier, levelsOn, hidden (no discs: the showcase), blocked
     * (paused, a die card or the game over: the card closes) }
     */
    update(n) {
      last = n;
      lv.hidden = n.hidden || !n.levelsOn;
      ks.hidden = n.hidden || !n.keepsake;
      if (n.level !== shown.level) {
        shown.level = n.level;
        lvNum.textContent = String(n.level);
        lv.setAttribute('aria-label', `Spawn level ${n.level}: tap for the odds`);
        lv.classList.toggle('top', n.level >= LEVELS.max);
      }
      const share = n.level >= LEVELS.max ? 1 : Math.max(0, Math.min(1, n.xp / n.need));
      if (Math.abs(share - shown.share) > 0.001) {
        shown.share = share;
        lvFill.setAttribute('stroke-dashoffset', String(RING * (1 - share)));
      }
      if (n.keepsake !== shown.keepsake) {
        shown.keepsake = n.keepsake;
        const k = keepsakeById(n.keepsake);
        ks.firstElementChild.innerHTML = k ? keepsakeIcon(k.id) : '';
        ks.setAttribute('aria-label', k ? `Keepsake: ${k.name}. Tap to see what it does.` : 'No keepsake');
      }
      const spent = n.keepsake === 'phoenixFeather' && !n.phoenixReady;
      if (spent !== shown.spent) {
        shown.spent = spent;
        ks.classList.toggle('spent', spent);
      }
      if (open && (n.blocked || (open === 'level' ? lv.hidden : ks.hidden))) close();
      else render();
    },
    /** A new level: the disc pops. */
    levelUp() {
      lv.classList.remove('pop');
      void lv.offsetWidth;
      lv.classList.add('pop');
    },
    /** The keepsake did something (a punch, a stomp, a rescue): the disc pulses. */
    pulseKeepsake() {
      ks.classList.remove('pulse');
      void ks.offsetWidth;
      ks.classList.add('pulse');
    },
    /** Client centre of a disc (where coins fly to, where the tutorial points). */
    center(which) {
      const r = (which === 'level' ? lv : ks).getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
    },
    close,
    get open() {
      return open;
    },
  };
}
