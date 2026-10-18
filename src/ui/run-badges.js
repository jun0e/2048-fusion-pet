// The level and the keepsake on the run screen (src/sim/levels.js, src/sim/keepsakes.js): two clay discs
// at the bottom corners, the level above the coin plate and the keepsake above Wave now. Tapping a disc
// opens its card where the block's full card opens (src/ui/inspect.js: at the top, so the board stays in
// view). The level card (docs/v2/SPEC-v2.1.md sections 4 and 6) shows only the XP still needed for the
// next level, as a bar and "12 XP to level 8", and what that level brings on the level road (run.road:
// LEVEL_ROAD), each reward as an icon and words; no spawn odds, and nothing to buy. The keepsake card
// says what the keepsake does and which one unlocks next. Pure presentation; main.js feeds it every
// frame. All markup is built from constants and numbers (no user input), so innerHTML is safe.
import { num, tr } from '../i18n/index.js';
import { GRID, GRID_TOP, TIER_COLORS, cellX, tierValue } from '../config.js';
import { LEVELS } from '../sim/levels.js';
import { keepsakeById, nextKeepsake } from '../sim/keepsakes.js';
import { keepsakeIcon } from './keepsake-icons.js';
import { icon } from './icons.js';

const RING = 2 * Math.PI * 19; // the XP ring's length (r = 19 in a 44-unit box)
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Each level-road reward's icon (src/ui/icons.js), by its kind. */
export const REWARD_ICON = { odds: 'odds', element: 'element', grow: 'grow', charge: 'charge', top: 'top' };

/**
 * A level-road reward (src/sim/levels.js LEVEL_ROAD) in words: "Better new blocks", "Pick a new
 * element", "The board grows to 5×5", "Summons charge 2 s faster", "Top level".
 */
export function rewardWords(r) {
  if (r.kind === 'odds') return tr('reward.odds');
  if (r.kind === 'element') return tr('reward.element');
  if (r.kind === 'grow') return tr('reward.grow', { size: r.size });
  if (r.kind === 'charge') return tr('reward.charge', { s: tr('unit.s', { n: num(r.s) }) });
  if (r.kind === 'top') return tr('reward.top');
  return '';
}

/** A level's rewards as one banner line, each with its icon (hud.js iconToken: the ribbon draws it). */
export const rewardsLine = (rewards, token) =>
  (rewards ?? [])
    .filter((r) => REWARD_ICON[r.kind])
    .map((r) => `${token(REWARD_ICON[r.kind])}${rewardWords(r)}`)
    .join(' · ');

/** A block value on its tier colour, as the level card names the values new blocks gain or lose. */
const valueChip = (tier) => `<span class="lv-value" style="--c:${TIER_COLORS[tier] ?? '#c39bff'}">${tierValue(tier)}</span>`;

/**
 * The level card's content, from the run's numbers and its level road (pure: tested in
 * test/level-card.test.js). `road`: run.road (LEVEL_ROAD), [] when the run has none; `max`: the top
 * level. → { title, xpText ("12 XP to level 8", or "Top level"), share (0–1), top, nextLevel (null at the
 * top), rewards: [{ kind, icon, text, adds, drops }] (what the next level brings) }
 */
export function levelCard({ level, xp = 0, need = Infinity, road = [], max = road?.at?.(-1)?.level ?? LEVELS.max }) {
  const top = level >= max || !(need > 0) || !Number.isFinite(need);
  const next = top ? null : (road ?? []).find((r) => r.level === level + 1);
  return {
    title: tr('lv.title', { level }),
    xpText: top ? tr('lv.top') : tr('lv.toNext', { n: num(Math.max(0, Math.ceil(need - xp))), level: level + 1 }),
    share: top ? 1 : Math.max(0, Math.min(1, xp / need)),
    top,
    nextLevel: top ? null : level + 1,
    rewards: (next?.rewards ?? []).filter((r) => REWARD_ICON[r.kind]).map((r) => ({ kind: r.kind, icon: REWARD_ICON[r.kind], text: rewardWords(r), adds: r.adds ?? [], drops: r.drops ?? [] })),
  };
}

/** The level card's markup (its × is the card's own; the head's picture is the disc). */
export function levelCardHtml(n) {
  const c = levelCard(n);
  const values = (key, tiers) => (tiers.length ? `<small class="lv-values">${esc(tr(key))} ${tiers.map(valueChip).join('')}</small>` : '');
  const reward = (r) => `<li class="lv-reward">${icon(r.icon, { size: 28, title: null })}<span><b>${esc(r.text)}</b>${values('reward.adds', r.adds)}${values('reward.drops', r.drops)}</span></li>`;
  return `
      <button class="inspect-x" aria-label="${esc(tr('ui.close'))}">×</button>
      <div class="inspect-head">
        <div class="inspect-pic lv-pic"><small>${esc(tr('lv.disc'))}</small><b>${n.level}</b></div>
        <div class="inspect-titles">
          <h3>${esc(c.title)}</h3>
          <div class="inspect-sub"><span class="inspect-value lv-to-next">${esc(c.xpText)}</span></div>
        </div>
      </div>
      <div class="lv-xpbar" role="progressbar" aria-label="${esc(tr('icon.xp'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(c.share * 100)}"><i style="transform:scaleX(${c.share})"></i></div>
      ${c.top ? `<p class="lv-top">${icon('top', { size: 24, title: null })}<span>${esc(tr('lv.topLine'))}</span></p>` : ''}
      ${c.rewards.length ? `<div class="lv-next"><h4>${esc(tr('lv.next', { level: c.nextLevel }))}</h4><ul class="lv-rewards">${c.rewards.map(reward).join('')}</ul></div>` : ''}`;
}

export function createRunBadges(root, { stage, onOpen }) {
  const lv = document.createElement('button');
  lv.className = 'run-badge lv-badge';
  lv.dataset.badge = 'level';
  lv.innerHTML = `
    <svg class="lv-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="lv-track" cx="22" cy="22" r="19"/><circle class="lv-fill" cx="22" cy="22" r="19" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></svg>
    <span class="lv-face"><small>${tr('lv.disc')}</small><b>1</b></span>`;
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
    const key = `L|${n.level}|${n.xp}|${n.need}|${n.road?.length ?? 0}`;
    if (key === cardKey) return;
    cardKey = key;
    card.style.setProperty('--c', '#ffcf4a');
    card.innerHTML = levelCardHtml(n);
  }

  function renderKeepsake(n) {
    const k = keepsakeById(n.keepsake);
    const nk = nextKeepsake(n.bestTier);
    const key = `K|${n.keepsake}|${n.phoenixReady}|${n.bestTier}`;
    if (key === cardKey || !k) return;
    cardKey = key;
    card.style.setProperty('--c', '#c9b8a4');
    const used = k.reviveHp != null ? `<p class="inspect-special">${tr(n.phoenixReady ? 'ks.ready' : 'ks.used')}</p>` : '';
    const next = nk ? tr('ks.next', { name: nk.name, value: num(tierValue(nk.unlockTier)), best: n.bestTier ? num(tierValue(n.bestTier)) : tr('ks.noneYet') }) : tr('ks.all');
    card.innerHTML = `
      <button class="inspect-x" aria-label="${tr('ui.close')}">×</button>
      <div class="inspect-head">
        <div class="inspect-pic ks-pic">${keepsakeIcon(k.id)}</div>
        <div class="inspect-titles">
          <h3>${k.name}</h3>
          <div class="inspect-sub"><span class="inspect-chip">${tr('ks.chip')}</span></div>
        </div>
      </div>
      <p class="inspect-desc">${k.desc}</p>
      ${used}
      <p class="inspect-next">${tr('ks.brought')} ${next}</p>`;
  }

  function render() {
    if (!open || !last) return;
    if (open === 'level') renderLevel(last);
    else renderKeepsake(last);
    card.setAttribute('aria-label', open === 'level' ? tr('lv.cardName') : tr('ks.chip'));
    card.hidden = false;
    const screen = `${stage.view.U}|${stage.view.w}|${stage.view.h}`;
    if (screen !== placedFor) {
      placedFor = screen;
      place();
    }
  }

  return {
    /**
     * Per frame. n: { level, xp, need, road (the run's level road), keepsake, phoenixReady, bestTier,
     * levelsOn, hidden (no discs: the showcase), blocked (paused, a choice or the game over: the card
     * closes) }
     */
    update(n) {
      last = n;
      lv.hidden = n.hidden || !n.levelsOn;
      ks.hidden = n.hidden || !n.keepsake;
      if (n.level !== shown.level) {
        shown.level = n.level;
        lvNum.textContent = String(n.level);
        lv.setAttribute('aria-label', tr('lv.discName', { n: n.level }));
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
        ks.setAttribute('aria-label', k ? tr('ks.discName', { name: k.name }) : tr('ks.none'));
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
    /** Open a disc's card ('level' | 'keepsake'), or keep it open: the demo, and a tip that points at it. */
    show(which) {
      if (open !== which) toggle(which);
    },
    get open() {
      return open;
    },
  };
}
