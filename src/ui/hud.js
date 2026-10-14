// DOM HUD: score, best, top block, wave/phase/blocks-left status, the coin bar
// (coins + next swipe price), the next-wave button, class-choice
// cards, banners, floating popups, flashes and the game-over card.
// Pure presentation; main.js feeds it. All markup is built from constants and
// numbers from config/sim data (no user input), so innerHTML is safe here.
import { TIER_COLORS, tierValue } from '../config.js';

const ICON_RESTART =
  '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
const ICON_SOUND =
  '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const ICON_MUTE =
  '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

const STAGE_LABEL = { 1: 'Awakened', 2: 'Fusion', 3: 'Ultimate' };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function chipHtml(tier, cls = '') {
  return `<div class="chip ${cls}" style="--c:${TIER_COLORS[tier]}">${tierValue(tier)}</div>`;
}

const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>';

export function createHud(root, { onRestart, onToggleMute, onNextWave, onChoose, onAuto, muted }) {
  root.innerHTML = `
    <div class="vignette"></div>
    <div class="flash"></div>
    <div class="topbar">
      <div class="icons">
        <button class="icon-btn" data-act="restart" aria-label="Restart">${ICON_RESTART}</button>
        <button class="icon-btn" data-act="mute" aria-label="Toggle sound">${muted ? ICON_MUTE : ICON_SOUND}</button>
        <button class="icon-btn auto-btn" data-act="auto" aria-label="Autoplay" aria-pressed="false">${ICON_PLAY}<span>Auto</span></button>
      </div>
      <div class="score-card">
        <div class="label">Score</div>
        <div class="score">0</div>
        <div class="best">Best 0</div>
      </div>
      <div class="next-card">
        <div class="label">Top</div>
        <div class="next-slot"></div>
      </div>
    </div>
    <div class="statusbar">
      <div class="day"><b class="day-n">Wave 1</b><span class="chapter">Eternal Forest</span></div>
      <div class="phase">Get ready</div>
      <div class="castle" aria-label="Blocks left">
        <span class="castle-ico">▦</span>
        <span class="castle-hp">0</span><span class="castle-unit">blocks</span>
      </div>
    </div>
    <div class="combo"></div>
    <div class="milestone"></div>
    <div class="banner"><b class="banner-title"></b><span class="banner-sub"></span></div>
    <div class="announce-stack" aria-live="polite"></div>
    <div class="hint hidden">Swipe anytime; each swipe costs coins. When two blocks merge, the one that slides in sets the colour. Elements awaken at 16, fuse at 256.</div>
    <div class="coinbar" aria-label="Coins">
      <span class="coin-ico"></span>
      <b class="coins">0</b>
      <span class="cost" title="Price of the next swipe">Swipe <b class="cost-n">0</b></span>
    </div>
    <button class="fight" data-act="fight">Next wave</button>
    <div class="scrim choice-scrim" role="dialog" aria-modal="true" aria-label="Choose a new die">
      <div class="choice">
        <div class="choice-head"><div class="choice-chip"></div><div><h2 class="choice-title"></h2><p class="choice-sub"></p></div></div>
        <div class="options"></div>
      </div>
    </div>
    <div class="scrim over-scrim" role="dialog" aria-modal="true" aria-label="Game over">
      <div class="card">
        <h2 class="over-title">Overflow!</h2>
        <p class="sub over-sub">The crate is full.</p>
        <div class="badge-slot"></div>
        <div class="stats">
          <div class="stat"><div class="label">Score</div><div class="val go-score">0</div></div>
          <div class="stat"><div class="label">Wave</div><div class="val go-day">1</div></div>
          <div class="stat"><div class="label">Top block</div><div class="go-top"></div></div>
        </div>
        <button class="primary" data-act="again">Play again</button>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const scoreEl = $('.score');
  const bestEl = $('.best');
  const nextSlot = $('.next-slot');
  const comboEl = $('.combo');
  const milestoneEl = $('.milestone');
  const vignette = $('.vignette');
  const flashEl = $('.flash');
  const hint = $('.hint');
  const overScrim = $('.over-scrim');
  const choiceScrim = $('.choice-scrim');
  const muteBtn = $('[data-act="mute"]');
  const fightBtn = $('.fight');
  const phaseEl = $('.phase');
  const castleHp = $('.castle-hp');
  const castleEl = $('.castle');
  const banner = $('.banner');
  const coinbar = $('.coinbar');
  const coinsEl = $('.coins');
  const costEl = $('.cost-n');
  const coinIco = $('.coin-ico');
  const announceStack = $('.announce-stack');

  // Closed dialogs must not hold focus while invisible.
  overScrim.inert = true;
  choiceScrim.inert = true;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'restart' || act === 'again') onRestart();
    if (act === 'mute') muteBtn.innerHTML = onToggleMute() ? ICON_MUTE : ICON_SOUND;
    if (act === 'auto') {
      const on = onAuto();
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.innerHTML = `${on ? ICON_PAUSE : ICON_PLAY}<span>Auto</span>`;
    }
    if (act === 'fight') onNextWave();
    if (act === 'pick') onChoose(Number(btn.dataset.i));
    // Space/Enter are the drop keys: a button that kept focus would turn the
    // next drop into another click (e.g. restart). Hand focus back to the game.
    btn.blur();
  });
  // keep HUD taps from reaching the canvas as drops
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) e.stopPropagation();
  });

  let shownScore = -1;
  let shownBest = -1;
  let shownNext = 0;
  let shownStatus = '';
  let choiceKey = null;
  let shownCoins = -1;
  let shownCost = -1;

  function restartAnim(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // reflow so the animation replays
    el.classList.add(cls);
  }

  return {
    setScore(score, best) {
      if (score !== shownScore) {
        if (score > shownScore && shownScore >= 0) restartAnim(scoreEl, 'bump');
        scoreEl.textContent = score.toLocaleString();
        shownScore = score;
      }
      if (best !== shownBest) {
        bestEl.textContent = `Best ${best.toLocaleString()}`;
        shownBest = best;
      }
    },
    setNext(tier) {
      if (tier === shownNext) return;
      shownNext = tier;
      nextSlot.innerHTML = chipHtml(tier, 'pop');
    },
    setStatus({ wave, chapter, phase, timer, left, blocks, boss }) {
      const secs = Math.ceil(timer);
      const key = `${wave}|${chapter}|${phase}|${secs}|${left}|${blocks}|${boss}`;
      if (key === shownStatus) return;
      shownStatus = key;
      $('.day-n').textContent = `Wave ${wave}`;
      $('.chapter').textContent = chapter;
      const labels = {
        prep: `First wave in ${secs}s`,
        break: boss ? `Boss in ${secs}s!` : `Next wave in ${secs}s`,
        wave: boss ? `Boss wave! ${left} left` : `${left} foe${left === 1 ? '' : 's'} left`,
        over: 'Defeat',
      };
      phaseEl.textContent = labels[phase] ?? phase;
      phaseEl.dataset.phase = phase;
      // siege: no castle; losing every block loses the run
      castleHp.textContent = String(blocks);
      castleEl.classList.toggle('low', blocks <= 3 && phase === 'wave');
      const waiting = phase === 'prep' || phase === 'break';
      fightBtn.classList.toggle('show', waiting);
      fightBtn.classList.toggle('boss', !!boss);
      fightBtn.textContent = `${boss ? 'Boss' : `Wave ${wave}`} now ▶ ${secs}`;
    },
    /** Coin counter and the price of the next swipe. */
    setEconomy(coins, cost) {
      if (coins === shownCoins && cost === shownCost) return;
      if (coins > shownCoins && shownCoins >= 0) restartAnim(coinIco, 'gain');
      shownCoins = coins;
      shownCost = cost;
      coinsEl.textContent = coins.toLocaleString();
      costEl.textContent = String(cost);
      coinbar.classList.toggle('poor', coins < cost);
    },
    /** A swipe was refused: not enough coins. */
    coinDeny() {
      restartAnim(coinbar, 'deny');
    },
    /** Client position of the coin icon: where dropped coins fly to. */
    coinTarget() {
      const r = coinIco.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    castleHit() {
      restartAnim(castleEl, 'shake');
      restartAnim(vignette, 'hurt');
    },
    popup(x, y, text, tier, color) {
      const el = document.createElement('div');
      el.className = 'popup';
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty('--c', color ?? TIER_COLORS[tier]);
      el.style.fontSize = `${Math.min(40, 18 + tier * 1.6)}px`;
      root.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
      setTimeout(() => el.remove(), 1500); // animations pause in hidden tabs; don't let popups pile up
    },
    combo(n) {
      comboEl.textContent = `Combo ×${n}`;
      restartAnim(comboEl, 'show');
    },
    milestone(tier) {
      milestoneEl.textContent = tierValue(tier).toLocaleString();
      restartAnim(milestoneEl, 'show');
    },
    banner(title, sub = '', tone = '') {
      $('.banner-title').textContent = title;
      $('.banner-sub').textContent = sub;
      banner.dataset.tone = tone;
      restartAnim(banner, 'show');
    },
    flash(color) {
      flashEl.style.background = color;
      restartAnim(flashEl, 'go');
    },
    setDanger(level) {
      vignette.style.opacity = String(level * 0.9);
    },
    hint(visible) {
      hint.classList.toggle('hidden', !visible);
    },
    /** Show (or keep showing) the pending new-die pick; null hides it. */
    setChoice(choice) {
      const key = choice ? `die:${choice.tier}` : null;
      if (key === choiceKey) return;
      choiceKey = key;
      root.classList.toggle('choosing', !!choice);
      if (!choice) {
        choiceScrim.classList.remove('open');
        choiceScrim.inert = true;
        return;
      }
      $('.choice-chip').innerHTML = chipHtml(choice.tier);
      $('.choice-title').textContent = 'New die unlocked!';
      $('.choice-sub').textContent = `Your first ${tierValue(choice.tier).toLocaleString()}. Pick a die for your deck: blocks reaching 16 can roll it.`;
      $('.options').innerHTML = choice.offers
        .map(
          (o, i) => `
        <button class="option" data-act="pick" data-i="${i}">
          <span class="swatches">${o.colors.map((c) => `<i style="--c:${c}"></i>`).join('')}</span>
          <span class="opt-text">
            <b>${o.name}</b>
            <em>${o.attack}</em>
            <small>${o.desc}</small>
          </span>
          <kbd>${i + 1}</kbd>
        </button>`,
        )
        .join('');
      choiceScrim.inert = false;
      choiceScrim.classList.add('open');
    },
    /**
     * Announce a class combination: "[Fire] + [Ice] → Blue Flame".
     * info: { stage, parts: [{ name, color }], name, colors, tags }
     */
    announce(info) {
      const el = document.createElement('div');
      el.className = `announce stage-${info.stage}`;
      const grad = info.colors.length > 1 ? `linear-gradient(90deg, ${info.colors.join(', ')})` : info.colors[0];
      const part = (p) => `<span class="part" style="--c:${p.color ?? '#efe3cf'}">${esc(p.name)}</span>`;
      // one compact line, so a few of them don't bury the field: [Fusion] Fire + Ice → Blue Flame
      el.title = info.tags;
      el.innerHTML = `<span class="announce-kicker">${STAGE_LABEL[info.stage]}</span>${part(info.parts[0])}<i>+</i>${part(info.parts[1])}<i>→</i><b style="--g:${grad}">${esc(info.name)}</b>`;
      announceStack.appendChild(el);
      while (announceStack.children.length > 3) announceStack.firstElementChild.remove();
      setTimeout(() => el.classList.add('out'), 2100);
      setTimeout(() => el.remove(), 2500);
    },
    showGameOver({ score, wave, maxTier, isBest, cause = null }) {
      $('.over-title').textContent = 'Overrun!';
      $('.over-sub').textContent = cause ?? `Your last block fell on wave ${wave}.`;
      $('.go-score').textContent = score.toLocaleString();
      $('.go-day').textContent = String(wave);
      $('.go-top').innerHTML = chipHtml(maxTier);
      $('.badge-slot').innerHTML = isBest ? '<div class="new-best">New best!</div>' : '';
      overScrim.inert = false;
      overScrim.classList.add('open');
      // keyboard players can restart with Space/Enter; the click handler blurs it after
      setTimeout(() => overScrim.classList.contains('open') && $('[data-act="again"]').focus({ preventScroll: true }), 300);
    },
    /** The break shrank (no swipe possible): pulse Wave now. */
    nudgeWave() {
      fightBtn.classList.remove('nudge');
      void fightBtn.offsetWidth;
      fightBtn.classList.add('nudge');
    },
    hideGameOver() {
      overScrim.classList.remove('open');
      overScrim.inert = true; // also drops focus from the hidden button
    },
  };
}
