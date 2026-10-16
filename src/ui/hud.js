// DOM HUD (proposal 4.1, zones B–H): the top bar (Pause and Speed as stone discs, the score plate,
// the top-block chip), the head (the chapter lintel: crest and wave, the foes meter that becomes the
// boss's health bar, the 4×4 keep grid of blocks alive; and under it the news ribbon in the sky,
// where banners and class announcements queue, src/ux/banners.js), the bottom bar (the coin plate
// with the swipe price and its step tick, Wave now), the die pick, floating popups, the red edge
// pulse, the pause menu and the game-over card. Nothing here sits over a lane: the combo tally hangs
// on the left tower, the namecard rail on the right one (src/kv/namecards.js).
// Pure presentation; main.js feeds it. All markup is built from constants and numbers from
// config/sim data (no user input), so innerHTML is safe here.
import { ECONOMY, TIER_COLORS, tierValue } from '../config.js';
import { ENEMY_TYPES } from '../sim/enemies.js';
import { createBannerQueue, bannerTimes } from '../ux/banners.js';
import { TEXT, popupFont } from '../ux/photosafe.js';
import { chapterKeyFor, skinFor } from '../art/frame-kit.js';
import { generatedUrl } from '../render/textures.js';
import { ELEMENTS } from '../sim/classes.js';
import { portraitId, spriteId } from '../art/sprite-ids.js';
import { petName } from '../art/tokens.js';

const STAGE_LABEL = { 1: 'Awakened', 2: 'Fusion', 3: 'Ultimate' };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function chipHtml(tier, cls = '') {
  return `<div class="chip ${cls}" style="--c:${TIER_COLORS[tier]}">${tierValue(tier)}</div>`;
}

/** An element's badge (its glyph on its colour: the colour-blind channel), when the pipeline made it. */
function badgeImg(element) {
  const url = element ? generatedUrl(`badge.${element}`) : null;
  return url ? `<img alt="" src="${esc(url)}" />` : '';
}

const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>';

/** Chapter crests for the lintel: a pine (the Wild Hunt), a gate (the Paper Court), a peak (the Ember Peaks). */
const CREST = {
  forest: '<svg viewBox="0 0 24 24"><path class="f" d="M12 2.5l6 8h-3l4.5 6.5H4.5L9 10.5H6z"/><path d="M12 17v4.5"/></svg>',
  fareast: '<svg viewBox="0 0 24 24"><path d="M3 6.5c4 1.2 14 1.2 18 0M5.5 10h13M7.5 7.5V21M16.5 7.5V21"/></svg>',
  peaks: '<svg viewBox="0 0 24 24"><path class="f" d="M2.5 19.5l6.5-12 4 6 2.5-3.5 6 9.5z"/><path class="a" d="M9 8l1.2 4.5"/></svg>',
};

// --- pure rules (tested in test/hud-frame.test.js) -------------------------------------------------

/**
 * The lintel's meter. During a wave it is the foes still to come or alive (it fills down); on a
 * boss wave, while the boss lives, it is the boss's health; before a wave it waits full, hatched.
 * → { mode: 'foes' | 'boss' | 'incoming' | 'over', fill (0–1), label, say (for screen readers) }
 */
export function meterState({ phase, left = 0, total = 0, boss = null, bossHp = null, timer = 0, holding = false }) {
  const secs = Math.ceil(timer);
  const foes = `${left} foe${left === 1 ? '' : 's'}`;
  if (phase === 'wave') {
    if (boss && bossHp != null) {
      const pct = Math.round(Math.max(0, Math.min(1, bossHp)) * 100);
      return { mode: 'boss', fill: Math.max(0, Math.min(1, bossHp)), label: `${left} left`, say: `Boss wave: ${ENEMY_TYPES[boss]?.name ?? 'boss'} at ${pct}% health, ${foes} left` };
    }
    return { mode: 'foes', fill: total > 0 ? Math.max(0, Math.min(1, left / total)) : 0, label: `${left} left`, say: `${boss ? 'Boss wave: ' : ''}${foes} left` };
  }
  if (phase === 'prep') {
    // the opening holds the countdown while the tutorial teaches: no frozen number
    return holding ? { mode: 'incoming', fill: 1, label: 'Ready?', say: 'First wave: when ready' } : { mode: 'incoming', fill: 1, label: `In ${secs}s`, say: `First wave in ${secs} seconds` };
  }
  if (phase === 'break') return { mode: 'incoming', fill: 1, label: `In ${secs}s`, say: `${boss ? 'Boss' : 'Next wave'} in ${secs} seconds` };
  return { mode: 'over', fill: 0, label: 'Defeat', say: 'Defeat' };
}

/** The keep grid: 16 cells (top-left first, as the DOM lays them out); the blocks alive light them from the bottom row up, left to right. */
export function keepGridCells(blocks) {
  const n = Math.max(0, Math.min(16, Math.floor(blocks)));
  const cells = new Array(16).fill(false);
  for (let k = 0; k < n; k++) cells[(3 - Math.floor(k / 4)) * 4 + (k % 4)] = true;
  return cells;
}

/** The swipe price and its next step: { cost, next, left: swipes until the price rises, share: how far along (0–1) }. */
export function priceStep(swipes) {
  const every = ECONOMY.swipeStepEvery;
  const done = ((swipes % every) + every) % every;
  const cost = ECONOMY.swipeBase + Math.floor(swipes / every) * ECONOMY.swipeStep;
  return { cost, next: cost + ECONOMY.swipeStep, left: every - done, share: done / every };
}

/** The boss's health (0–1) among `enemies`, or null when no boss is alive (main.js passes it to setStatus). */
export function bossHealth(enemies) {
  const b = enemies?.find((e) => e.boss && !e.dead && !e.gone);
  return b ? Math.max(0, b.hp) / (b.maxHp || 1) : null;
}

/**
 * A banner on the one-line ribbon, cut into pages that each fit `width` px: the title and its line
 * together when they fit; else the title first, then the line in as few pages as it needs, with
 * its words shared out evenly (the least squared slack), so no page is left with a lone word
 * ("roll it."). measure(text, 'title' | 'sub') → px. → [{ title, sub }]
 */
export function pageBanner(title, sub, width, measure, gap = 8) {
  const t = title ?? '';
  const s = sub ?? '';
  if (!s || measure(t, 'title') + gap + measure(s, 'sub') <= width) return [{ title: t, sub: s }];
  const words = s.split(/\s+/).filter(Boolean);
  const N = words.length;
  const widths = new Map();
  const span = (j, i) => {
    const k = j * 1000 + i;
    if (!widths.has(k)) widths.set(k, measure(words.slice(j, i).join(' '), 'sub'));
    return widths.get(k);
  };
  // the fewest pages: a greedy fill (a word wider than the line gets a page of its own)
  let n = 1;
  for (let i = 0, j = 0; i < N; i++) {
    if (i > j && span(j, i + 1) > width) {
      n += 1;
      j = i;
    }
  }
  // as many pages, the words shared out: best[k][i] is the least squared slack of words 0..i on k pages
  const best = Array.from({ length: n + 1 }, () => new Array(N + 1).fill(Infinity));
  const from = Array.from({ length: n + 1 }, () => new Array(N + 1).fill(0));
  best[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let i = 1; i <= N; i++) {
      for (let j = i - 1; j >= 0; j--) {
        const w = span(j, i);
        if (w > width && i - j > 1) break;
        const c = best[k - 1][j] + (width - Math.min(w, width)) ** 2;
        if (c < best[k][i]) {
          best[k][i] = c;
          from[k][i] = j;
        }
      }
    }
  }
  const lines = [];
  for (let k = n, i = N; k > 0; k--) {
    const j = from[k][i];
    lines.unshift(words.slice(j, i).join(' '));
    i = j;
  }
  return [...(t ? [{ title: t, sub: '' }] : []), ...lines.map((line) => ({ title: '', sub: line }))];
}

/** Seconds each page of a banner shows: an equal share of its reading time (bannerTimes), 1.1 s or more. */
export const pageSeconds = (item, count) => Math.max(1.1, (bannerTimes(item).min - 0.15) / Math.max(1, count));

/**
 * The lintel's state as one key: a change re-renders it. It holds what the meter says (`say`, with
 * the boss's health), so the screen reader's description never goes stale.
 */
export function statusKey({ wave, phase, timer = 0, holding = false, left, blocks, boss, bestWave = 0 }, m) {
  return `${wave}|${phase}|${Math.ceil(timer)}|${holding}|${left}|${blocks}|${boss}|${bestWave}|${m.mode}|${m.label}|${m.say}`;
}

/** The meter's label as markup: its numbers ("In 14s", "12 left") in their own spans, drawn as primary numerals. */
export const meterLabelHtml = (label) => esc(label).replace(/\d+/g, '<b class="meter-num">$&</b>');

/** The smallest a floating text is drawn (px): below it, a popup is not drawn at all (a phone at arm's length). main.js books it no smaller. */
export const POPUP_MIN_PX = TEXT.minPx;

/** A popup's font size: popupFont(tier) × its photosafe scale, or 0 when that is under POPUP_MIN_PX (not drawn). */
export function popupPx(tier, scale = 1) {
  const px = popupFont(tier) * scale;
  return px < POPUP_MIN_PX - 1e-6 ? 0 : px; // (a share booked at the floor comes back as √share, to rounding)
}

/** Wave now's label: "Wave 7 now ▶ 12". The wave's number (in its own span) gives way on a narrow phone. */
export function fightLabel({ wave, boss = null, timer = 0, holding = false }) {
  const what = boss ? 'Boss' : `Wave<span class="fight-n"> ${wave}</span>`;
  return `${what} now ▶${holding ? '' : `<span class="fight-t"> ${Math.ceil(timer)}</span>`}`;
}

/**
 * @param dev  show developer controls (the Auto button): `?dev` in the URL
 */
export function createHud(root, { onRestart, onMenu, onSetting, onShare, onSpeed, onNextWave, onChoose, onAuto, dev = false }) {
  // (Sound is a setting in the pause menu: the top bar holds Pause and Speed only)
  root.innerHTML = `
    <div class="vignette"></div>
    <div class="topbar">
      <div class="icons">
        <button class="icon-btn stone" data-act="pause" aria-label="Pause">${ICON_PAUSE}</button>
        <button class="icon-btn stone speed-btn" data-act="speed" aria-label="Game speed x1">x1</button>
        ${dev ? `<button class="icon-btn stone auto-btn" data-act="auto" aria-label="Autoplay" aria-pressed="false">${ICON_PLAY}<span>Auto</span></button>` : ''}
      </div>
      <div class="score-card" role="group" aria-label="Score">
        <div class="score">0</div>
        <div class="best">Best 0</div>
      </div>
      <div class="top-right">
        <div class="next-card" aria-label="Top block"><div class="next-slot"></div></div>
      </div>
    </div>
    <div class="statusbar">
      <div class="lintel">
        <div class="day"><i class="crest" aria-hidden="true"></i><b class="day-n"><span class="day-word">Wave</span> <span class="day-num">1</span></b><span class="best-wave"></span><span class="chapter">Eternal Forest</span></div>
        <div class="phase meter" data-phase="prep" data-mode="incoming" role="img" aria-label="First wave: when ready">
          <span class="meter-face" hidden><img alt="" /></span>
          <span class="meter-bar"><i class="meter-fill"></i></span>
          <b class="meter-label">Ready?</b>
        </div>
        <div class="castle" role="img" aria-label="Blocks left">
          <span class="keep-grid" aria-hidden="true">${'<i></i>'.repeat(16)}</span>
          <span class="castle-hp">0</span>
        </div>
      </div>
      <div class="ribbon" data-tone="" aria-live="polite">
        <div class="ribbon-line"><b class="banner-title"></b><span class="banner-sub"></span></div>
      </div>
    </div>
    <div class="combo" aria-hidden="true"></div>
    <div class="milestone"></div>
    <div class="coinbar" aria-label="Coins">
      <span class="coin-ico"></span>
      <b class="coins">0</b>
      <span class="cost" title="Price of the next swipe">Swipe <b class="cost-n">0</b><i class="cost-step" aria-hidden="true"><s></s></i></span>
    </div>
    <button class="fight" data-act="fight">Wave<span class="fight-n"> 1</span> now ▶</button>
    <div class="scrim choice-scrim" role="dialog" aria-modal="true" aria-label="Choose a new die">
      <div class="choice">
        <div class="choice-head"><div class="choice-chip"></div><div><h2 class="choice-title"></h2><p class="choice-sub"></p></div></div>
        <div class="options"></div>
      </div>
    </div>
    <div class="rotate" role="status">
      <div class="rotate-card">
        <i class="rotate-phone"></i>
        <b>Turn your phone upright</b>
        <span>2048 Siege plays in portrait. The game waits.</span>
      </div>
    </div>
    <div class="scrim pause-scrim" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div class="card pause-card">
        <h2 id="pause-title">Paused</h2>
        <p class="sub pause-sub"></p>
        <div class="pause-actions">
          <button class="primary" data-act="resume">Resume</button>
          <button class="soft" data-act="howto">How to play</button>
          <button class="soft" data-act="settings">Settings</button>
          <button class="soft" data-act="restart">Restart run</button>
        </div>
        <div class="pause-settings">
          <button class="switch" data-act="set-sound" role="switch" aria-checked="true"><span>Sound</span><i></i></button>
          <button class="switch" data-act="set-haptics" role="switch" aria-checked="true"><span>Vibration</span><i></i></button>
          <button class="switch" data-act="set-motion" role="switch" aria-checked="false"><span>Reduce motion</span><i></i></button>
          <button class="primary" data-act="settings-done">Done</button>
        </div>
        <div class="pause-confirm">
          <p class="confirm-text">Restart? This run ends.</p>
          <div class="confirm-actions">
            <button class="soft" data-act="restart-no">Keep playing</button>
            <button class="danger" data-act="restart-yes">Restart</button>
          </div>
        </div>
      </div>
    </div>
    <div class="scrim over-scrim" role="dialog" aria-modal="true" aria-label="Game over">
      <div class="card over-card">
        <h2 class="over-title">Overrun!</h2>
        <p class="sub over-sub"></p>
        <div class="badge-slot"></div>
        <div class="stats">
          <div class="stat"><div class="label">Wave</div><div class="val go-day">1</div></div>
          <div class="stat"><div class="label">Score</div><div class="val go-score">0</div></div>
          <div class="stat"><div class="label">Top block</div><div class="go-top"></div></div>
          <div class="stat"><div class="label">Kills</div><div class="val go-kills">0</div></div>
          <div class="stat"><div class="label">Bosses</div><div class="val go-bosses">0</div></div>
          <div class="stat"><div class="label">Time</div><div class="val go-time">0:00</div></div>
        </div>
        <p class="go-extra"></p>
        <div class="over-actions">
          <button class="primary" data-act="again">Play again</button>
          <button class="soft" data-act="share">Share</button>
        </div>
        <label class="share-box" hidden>Copy this to share:<textarea class="share-line" readonly rows="3"></textarea></label>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const scoreEl = $('.score');
  const bestEl = $('.best');
  const nextSlot = $('.next-slot');
  const comboEl = $('.combo');
  const milestoneEl = $('.milestone');
  const vignette = $('.vignette');
  const overScrim = $('.over-scrim');
  const choiceScrim = $('.choice-scrim');
  const fightBtn = $('.fight');
  const meterEl = $('.meter');
  const meterFill = $('.meter-fill');
  const meterLabel = $('.meter-label');
  const meterFace = $('.meter-face');
  const castleHp = $('.castle-hp');
  const castleEl = $('.castle');
  const lintelEl = $('.lintel');
  const gridCells = [...root.querySelectorAll('.keep-grid i')];
  const ribbon = $('.ribbon');
  const ribbonLine = $('.ribbon-line');
  const ribbonTitle = $('.banner-title');
  const ribbonSub = $('.banner-sub');
  const coinbar = $('.coinbar');
  const coinsEl = $('.coins');
  const costEl = $('.cost-n');
  const costBox = $('.cost');
  const costStep = $('.cost-step s');
  const coinIco = $('.coin-ico');
  const pauseScrim = $('.pause-scrim');
  const pauseCard = $('.pause-card');

  // Closed dialogs must not hold focus while invisible.
  overScrim.inert = true;
  choiceScrim.inert = true;
  pauseScrim.inert = true;

  // The open dialog keeps the focus: while the menu is up (its card, or How to play over
  // it), the rest of the HUD is inert.
  let inerted = [];
  let page = 'closed';
  /**
   * Draw a page of the pause menu (src/ux/pause.js). 'closed' and 'help' hide the
   * card; 'confirm' asks before a restart (one stray tap must not end a long run).
   * Call it after the help sheet has opened or closed for 'help'.
   */
  function setPauseView(next, info) {
    const was = page;
    page = next;
    for (const el of inerted) el.inert = false;
    inerted = [];
    const open = next === 'main' || next === 'confirm' || next === 'settings';
    if (next !== 'closed') {
      const keep = open ? pauseScrim : root.querySelector('.help-scrim');
      inerted = [...root.children].filter((el) => el !== keep && !el.inert);
      for (const el of inerted) el.inert = true;
    }
    if (!open) {
      pauseScrim.classList.remove('open');
      pauseScrim.inert = true;
      return;
    }
    if (info) {
      $('.pause-card h2').textContent = info.title ?? 'Paused';
      $('.pause-sub').textContent = `Wave ${info.wave} · ${info.score.toLocaleString()} points · ${info.blocks} block${info.blocks === 1 ? '' : 's'}`;
    }
    pauseCard.classList.toggle('confirming', next === 'confirm');
    pauseCard.classList.toggle('settings', next === 'settings');
    pauseScrim.inert = false;
    pauseScrim.classList.add('open');
    if (next === was) return; // the same page (e.g. a phone turned): keep the focus where it is
    // focus: the page's first choice; back on the main page, the button that led away
    const target = next === 'main' ? ({ confirm: 'restart', settings: 'settings', help: 'howto' }[was] ?? 'resume') : next === 'confirm' ? 'restart-no' : 'set-sound';
    $(`[data-act="${target}"]`).focus({ preventScroll: true });
  }
  const shareBtn = $('[data-act="share"]');
  const shareBox = $('.share-box');
  const shareText = $('.share-line');
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // --- the news ribbon: one line in the sky; a banner that does not fit turns its pages ---
  const measureCtx = globalThis.document?.createElement('canvas').getContext('2d');
  // the ribbon's fonts (the `font` shorthand reads empty when font-variant-numeric is set, so build it)
  const fontOf = (el) => {
    const cs = getComputedStyle(el);
    return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  };
  // The title's digits are tabular (every one as wide as "0"), which a canvas does not draw: it is
  // measured with its digits as "0", or a line it judged to fit by a few px would end in an ellipsis.
  function measure(text, part) {
    if (!measureCtx) return text.length * 7;
    measureCtx.font = fontOf(part === 'title' ? ribbonTitle : ribbonSub);
    return measureCtx.measureText(part === 'title' ? text.replace(/[0-9]/g, '0') : text).width;
  }
  /** The line's width for text: the ribbon's inner width less its padding. */
  function lineWidth() {
    const cs = getComputedStyle(ribbonLine);
    return (ribbonLine.clientWidth || 280) - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
  }
  let news = null; // { pages, at, per, t, announce }
  function renderPage(p, item) {
    if (item.kind === 'announce') {
      const info = item.info;
      const grad = info.colors.length > 1 ? `linear-gradient(90deg, ${info.colors.join(', ')})` : info.colors[0];
      const part = (x) => `<span class="part" style="--c:${esc(x.color ?? '#efe3cf')}">${esc(x.name)}</span>`;
      ribbonTitle.innerHTML = '';
      ribbonSub.innerHTML = `<span class="announce stage-${info.stage}"><span class="announce-kicker">${STAGE_LABEL[info.stage]}</span>${part(info.parts[0])}<i>+</i>${part(info.parts[1])}<i>→</i><b style="--g:${esc(grad)}">${esc(info.name)}</b></span>`;
      ribbonLine.title = info.tags ?? '';
      // too long for the line (the line's text box overflows: it is the part that shrinks): first the
      // two parts give way, then the stage's kicker (the ribbon's tone still tells the stage); the new
      // name stays whole, and only a name too long for the line on its own ellipses
      const ann = ribbonSub.firstElementChild;
      const over = () => ribbonSub.scrollWidth > ribbonSub.clientWidth + 1;
      if (over()) for (const el of ann.querySelectorAll('.part, i')) el.remove();
      if (over()) ann.querySelector('.announce-kicker')?.remove();
      if (over()) ann.classList.add('squeeze');
      return;
    }
    ribbonLine.title = '';
    ribbonTitle.textContent = p.title;
    ribbonSub.textContent = p.sub;
    ribbonLine.classList.toggle('sub-only', !p.title);
  }
  // one banner at a time: news that lands together shows in turn (src/ux/banners.js)
  const banners = createBannerQueue({
    show(item) {
      ribbon.dataset.tone = item.tone ?? '';
      ribbon.dataset.kind = item.kind ?? 'banner';
      ribbon.classList.add('show');
      restartAnim(ribbon, 'in');
      const pages = item.kind === 'announce' ? [item] : pageBanner(item.title, item.sub, lineWidth(), measure);
      // every page gets an equal share of the time the banner is sure to stay (its reading time)
      news = { item, pages, at: 0, per: pageSeconds(item, pages.length), t: 0 };
      renderPage(pages[0], item);
    },
  });
  function updateNews(dt) {
    banners.update(dt);
    if (!banners.showing) {
      if (news) {
        news = null;
        ribbon.classList.remove('show');
      }
      return;
    }
    if (!news || news.pages.length < 2) return;
    news.t += dt;
    const at = Math.min(news.pages.length - 1, Math.floor(news.t / news.per));
    if (at !== news.at) {
      news.at = at;
      renderPage(news.pages[at], news.item);
      restartAnim(ribbonLine, 'flip'); // a quick fade, in place
    }
  }

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'again' || act === 'restart-yes') onRestart();
    const to = { pause: 'main', resume: 'closed', howto: 'help', restart: 'confirm', 'restart-no': 'main', settings: 'settings', 'settings-done': 'main' }[act];
    if (to) onMenu(to);
    if (act.startsWith('set-')) onSetting(act.slice(4));
    if (act === 'share') onShare();
    if (act === 'speed') onSpeed();
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
  let shownSwipes = -1;
  let shownChapter = '';
  let shownFill = -1;
  let shownFight = '';
  let shownLabel = '';
  let waveSeen = 0;
  let waveTotal = 0; // the most foes seen left this wave: the meter's full mark when main.js gives no total

  const setText = (el, text) => {
    if (el.textContent !== text) el.textContent = text;
  };
  const setAttr = (el, name, value) => {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };

  function restartAnim(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // reflow so the animation replays
    el.classList.add(cls);
  }

  /**
   * A block reached 256: the player picks its fusion from the pairs its material can make
   * (src/sim/classes.js fusionOffers). Each card shows the fusion's pet (its generated portrait,
   * else the two element badges), its name, the two elements and what it does.
   */
  function showFusionPick(choice) {
    choiceScrim.setAttribute('aria-label', 'Choose a fusion');
    $('.choice-chip').innerHTML = chipHtml(choice.tier);
    $('.choice-title').textContent = 'Choose your fusion';
    $('.choice-sub').textContent = `Your ${tierValue(choice.tier).toLocaleString()} fuses two of the elements that went into it.`;
    $('.options').innerHTML = choice.offers
      .map((o, i) => {
        const a = ELEMENTS[o.element];
        const b = ELEMENTS[o.fusion];
        const pic = generatedUrl(portraitId({ element: o.element, fusion: o.fusion }));
        const art = pic ? `<i class="pet" style="--c:${o.color}"><img alt="" src="${esc(pic)}" /></i>` : `<i style="--c:${a.color}">${badgeImg(o.element)}</i><i style="--c:${b.color}">${badgeImg(o.fusion)}</i>`;
        return `
        <button class="option fusion-option" data-act="pick" data-i="${i}">
          <span class="swatches">${art}</span>
          <span class="opt-text">
            <b>${esc(o.name)}</b>
            <em>${esc(a.name)} + ${esc(b.name)} · ${esc(petName(o.element, o.fusion))}</em>
            <small>${esc(o.tags)}, both stronger. Attacks like ${esc(a.name)}: ${esc(a.attack)}.</small>
          </span>
          <kbd>${i + 1}</kbd>
        </button>`;
      })
      .join('');
    choiceScrim.inert = false;
    choiceScrim.classList.add('open');
  }

  /** The chapter's skin: the lintel's crest and the stone of the HUD (CSS custom properties). */
  function setChapter(name) {
    const key = chapterKeyFor(name);
    if (key === shownChapter) return;
    shownChapter = key;
    root.dataset.chapter = key;
    const [face, light, dark] = skinFor(key).slate;
    root.style.setProperty('--stone', face);
    root.style.setProperty('--stone-l', light);
    root.style.setProperty('--stone-d', dark);
    $('.crest').innerHTML = CREST[key] ?? CREST.forest;
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
    /** The top-block chip: the biggest block's value on a clay disc, ringed in its tier colour. */
    setNext(tier) {
      if (tier === shownNext) return;
      shownNext = tier;
      const v = tierValue(tier);
      const digits = String(v).length;
      // three digits and more do not fit the disc's inner ring at a readable size: the disc stretches into a pill
      nextSlot.innerHTML = `<div class="top-chip pop${digits >= 3 ? ' wide' : ''}" style="--c:${TIER_COLORS[tier] ?? '#c39bff'}"><b>${v}</b></div>`;
      nextSlot.parentElement.setAttribute('aria-label', `Top block ${v}`);
    },
    /**
     * The lintel. total: foes in this wave (optional: else the most seen left), bossHp: the boss's
     * health 0–1 while it lives (optional, bossHealth(run.enemies)); chapter: its name or key.
     */
    setStatus({ wave, chapter, phase, timer, holding = false, left, blocks, boss, bestWave = 0, total = null, bossHp = null }) {
      setChapter(chapter);
      if (wave !== waveSeen || phase !== 'wave') {
        if (wave !== waveSeen) waveSeen = wave;
        waveTotal = 0;
      }
      waveTotal = Math.max(waveTotal, left ?? 0);
      const m = meterState({ phase, left, total: total ?? waveTotal, boss, bossHp, timer, holding });
      const fill = Math.round(m.fill * 200) / 200;
      if (fill !== shownFill) {
        shownFill = fill;
        meterFill.style.transform = `scaleX(${fill})`;
      }
      const key = statusKey({ wave, phase, timer, holding, left, blocks, boss, bestWave }, m);
      if (key === shownStatus) return;
      shownStatus = key;
      // only what changed is written (the boss's health changes the description many times a wave)
      setText($('.day-num'), String(wave));
      // the record to beat (the main record: the best wave reached)
      setText($('.best-wave'), bestWave > 0 ? `best ${bestWave}` : '');
      setText($('.chapter'), typeof chapter === 'string' ? chapter : chapter?.name ?? '');
      setAttr(meterEl, 'data-phase', phase);
      setAttr(meterEl, 'data-mode', m.mode);
      meterEl.classList.toggle('boss', !!boss);
      // not a live region: the countdown is read when the player gets to it, never every second; the
      // phase changes (a wave starts, a wave is cleared) are spoken by the news ribbon (aria-live)
      setAttr(meterEl, 'aria-label', m.say);
      // its numbers (the countdown, the foes left) are primary numerals, its words labels
      const labelHtml = meterLabelHtml(m.label);
      if (labelHtml !== shownLabel) {
        shownLabel = labelHtml;
        meterLabel.innerHTML = labelHtml;
      }
      // the boss's portrait chip: during its break and its wave
      const face = boss && (phase === 'wave' || phase === 'break') ? generatedUrl(`enemy.${boss}`) : null;
      meterFace.hidden = !boss || !(phase === 'wave' || phase === 'break');
      // with the boss's face in it, a narrow phone's lintel gives the record's room to the boss bar (hud.css)
      lintelEl.classList.toggle('face', !meterFace.hidden);
      if (!meterFace.hidden) {
        const img = meterFace.querySelector('img');
        if (face && img.getAttribute('src') !== face) img.src = face;
        img.hidden = !face;
        meterFace.classList.toggle('blank', !face);
      }
      // siege: no castle; losing every block loses the run. The keep grid shows the blocks alive.
      setText(castleHp, String(blocks));
      const lit = keepGridCells(blocks);
      gridCells.forEach((c, i) => c.classList.toggle('on', lit[i]));
      setAttr(castleEl, 'aria-label', `${blocks} block${blocks === 1 ? '' : 's'} left`);
      castleEl.classList.toggle('low', blocks <= 3 && phase === 'wave');
      const waiting = phase === 'prep' || phase === 'break';
      // hidden during a wave, it also leaves the tab order (visibility, hud.css)
      fightBtn.classList.toggle('show', waiting);
      fightBtn.classList.toggle('boss', !!boss);
      const label = fightLabel({ wave, boss, timer, holding });
      if (label !== shownFight) {
        shownFight = label;
        fightBtn.innerHTML = label;
      }
    },
    /** Coin counter, the price of the next swipe and (with `swipes`) its step tick: how soon it rises. */
    setEconomy(coins, cost, swipes = null) {
      if (coins === shownCoins && cost === shownCost && swipes === shownSwipes) return;
      if (coins > shownCoins && shownCoins >= 0) restartAnim(coinIco, 'gain');
      shownCoins = coins;
      shownCost = cost;
      shownSwipes = swipes;
      coinsEl.textContent = coins.toLocaleString();
      costEl.textContent = String(cost);
      coinbar.classList.toggle('poor', coins < cost);
      if (swipes != null) {
        const st = priceStep(swipes);
        costStep.style.transform = `scaleY(${Math.max(0.08, st.share)})`;
        costBox.classList.toggle('soon', st.left <= 3);
        costBox.title = `Price of the next swipe: ${cost}. It rises to ${st.next} in ${st.left} swipe${st.left === 1 ? '' : 's'}.`;
        costBox.setAttribute('aria-label', costBox.title);
      }
      costBox.classList.toggle('stepped', swipes != null);
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
    /** A block fell. `pulse`: the red edge pulse may play (the photosafe budget, stage.takeFlash). */
    castleHit(pulse = true) {
      restartAnim(castleEl, 'shake');
      if (pulse) restartAnim(vignette, 'hurt');
    },
    /**
     * A floating text: its font is popupFont(tier) × scale (photosafe: smaller when the screen is lit
     * up). One the light budget would shrink below POPUP_MIN_PX is not drawn: unreadable at arm's
     * length, and drawing nothing lights less than what was booked.
     */
    popup(x, y, text, tier, color, scale = 1) {
      const px = popupPx(tier, scale);
      if (!px) return;
      const el = document.createElement('div');
      el.className = 'popup';
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty('--c', color ?? TIER_COLORS[tier]);
      el.style.fontSize = `${px}px`;
      root.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
      setTimeout(() => el.remove(), 1500); // animations pause in hidden tabs; don't let popups pile up
    },
    /** A combo: a tally on the left tower (never over a lane). */
    combo(n) {
      comboEl.innerHTML = `<small>Combo</small><b>×${n}</b>`;
      restartAnim(comboEl, 'show');
    },
    /** A new top block (2048+): its number over the head of the screen, not over the lanes. */
    milestone(tier) {
      milestoneEl.textContent = tierValue(tier).toLocaleString();
      restartAnim(milestoneEl, 'show');
    },
    /** Queue a banner on the news ribbon; it shows when the one on screen has had its reading time. */
    banner(title, sub = '', tone = '') {
      banners.push({ title, sub, tone });
    },
    /** Per frame (0 while paused): rotate the news. */
    update(dt) {
      updateNews(dt);
    },
    /** A new run: drop the news still waiting, and the one on screen. */
    clearBanners() {
      banners.clear();
      news = null;
      ribbon.classList.remove('show');
    },
    setPauseView,
    setDanger(level) {
      vignette.style.opacity = String(level * 0.9);
    },
    /** Show (or keep showing) the pending pick: a new die, or a new fusion; null hides it. */
    setChoice(choice) {
      const key = choice ? `${choice.kind}:${choice.tier}:${choice.tileId ?? ''}` : null;
      if (key === choiceKey) return;
      choiceKey = key;
      root.classList.toggle('choosing', !!choice);
      if (!choice) {
        choiceScrim.classList.remove('open');
        choiceScrim.inert = true;
        return;
      }
      if (choice.kind === 'fusion') {
        showFusionPick(choice);
        return;
      }
      choiceScrim.setAttribute('aria-label', 'Choose a new die');
      $('.choice-chip').innerHTML = chipHtml(choice.tier);
      $('.choice-title').textContent = 'New die unlocked!';
      $('.choice-sub').textContent = `Your first ${tierValue(choice.tier).toLocaleString()}. Pick a die for your deck: blocks reaching 16 can roll it.`;
      // each die: its baby pet with the element's badge (the badge alone without the art), its name and
      // attack on one line, and what it does in one short line (src/sim/classes.js ELEMENTS line)
      $('.options').innerHTML = choice.offers
        .map((o, i) => {
          const baby = generatedUrl(spriteId({ kind: 'baby', el: o.element, stage: 0 }));
          const art = baby
            ? `<i class="pet" style="--c:${o.colors[0]}"><img alt="" src="${esc(baby)}" /><span class="pet-badge">${badgeImg(o.element)}</span></i>`
            : `<i style="--c:${o.colors[0]}">${badgeImg(o.element)}</i>`;
          return `
        <button class="option die-option" data-act="pick" data-i="${i}">
          <span class="swatches">${art}</span>
          <span class="opt-text">
            <span class="opt-head"><b>${esc(o.name)}</b> <em>${esc(o.attack)}</em></span>
            <small>${esc(o.line)}</small>
          </span>
          <kbd>${i + 1}</kbd>
        </button>`;
        })
        .join('');
      choiceScrim.inert = false;
      choiceScrim.classList.add('open');
    },
    /**
     * Announce a class combination on the news ribbon: "[Fusion] Fire + Ice → Blue Flame".
     * info: { stage, parts: [{ name, color }], name, colors, tags }
     */
    announce(info) {
      banners.push({ kind: 'announce', info, title: STAGE_LABEL[info.stage], sub: `${info.parts[0].name} + ${info.parts[1].name} → ${info.name}`, tone: `stage-${info.stage}` });
    },
    /**
     * The end of a run: the cause, the records broken, and a summary.
     * stats: { kills, bosses, time (s), lost, combo, fusions, punches, keepsakes: [names unlocked] }
     */
    showGameOver({ score, wave, maxTier, isBest, isBestWave = false, cause = null, stats = {} }) {
      $('.over-sub').textContent = cause ?? `Your last block fell on wave ${wave}.`;
      $('.go-score').textContent = score.toLocaleString();
      $('.go-day').textContent = String(wave);
      $('.go-top').innerHTML = chipHtml(maxTier);
      $('.go-kills').textContent = (stats.kills ?? 0).toLocaleString();
      $('.go-bosses').textContent = String(stats.bosses ?? 0);
      $('.go-time').textContent = mmss(stats.time ?? 0);
      const extra = [];
      if (stats.keepsakes?.length) extra.push(`New keepsake: ${stats.keepsakes.join(', ')}!`);
      if (stats.combo >= 2) extra.push(`Best combo ×${stats.combo}`);
      if (stats.fusions) extra.push(`${stats.fusions} fusion${stats.fusions === 1 ? '' : 's'}`);
      if (stats.lost) extra.push(`${stats.lost} block${stats.lost === 1 ? '' : 's'} lost`);
      if (stats.punches) extra.push(`${stats.punches} punch${stats.punches === 1 ? '' : 'es'}`);
      $('.go-extra').textContent = extra.join(' · ');
      // the best wave is the main record; a best score alone gets its own badge
      const badge = isBestWave ? 'New best wave!' : isBest ? 'New best score!' : '';
      $('.badge-slot').innerHTML = badge ? `<div class="new-best">${badge}</div>` : '';
      shareBtn.textContent = 'Share';
      shareBox.hidden = true;
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
    /** The speed button: x1, x2, x4 (lit when faster than x1). */
    setSpeed(n) {
      const btn = $('[data-act="speed"]');
      btn.textContent = `x${n}`;
      btn.classList.toggle('fast', n > 1);
      btn.setAttribute('aria-label', `Game speed x${n}`);
    },
    /** Share feedback on the button ("Copied!"), then back to "Share". */
    shareDone(label) {
      shareBtn.textContent = label;
      setTimeout(() => (shareBtn.textContent = 'Share'), 1800);
    },
    /** The browser refused every copy: show the line, selected and in view, to copy by hand. */
    shareShow(line) {
      shareText.value = line;
      shareBox.hidden = false;
      shareBtn.textContent = 'Copy it below';
      shareText.focus({ preventScroll: true });
      shareText.setSelectionRange(0, line.length); // iOS: select() alone selects nothing
      shareBox.scrollIntoView({ block: 'nearest' }); // a short card scrolls; focusing a textarea does not scroll it
    },
    /** Switch states in the settings page. */
    setSettings({ sound, haptics, hapticsSupported, motion }) {
      const set = (act, on) => $(`[data-act="${act}"]`).setAttribute('aria-checked', String(on));
      set('set-sound', sound);
      set('set-haptics', haptics);
      set('set-motion', motion);
      $('[data-act="set-haptics"]').hidden = !hapticsSupported; // no Vibration API on iOS
    },
    hideGameOver() {
      overScrim.classList.remove('open');
      overScrim.inert = true; // also drops focus from the hidden button
    },
  };
}
