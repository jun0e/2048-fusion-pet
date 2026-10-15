import './ui/hud.css';
import { createRun } from './sim/run.js';
import { ENEMY_TYPES } from './sim/enemies.js';
import { ELEMENTS, profileFor } from './sim/classes.js';
import { FIELD, GRID, GRID_TOP, PHYSICS, cellX, cellY, laneX } from './config.js';
import { createStage } from './render/stage.js';
import { createScenery } from './render/scenery.js';
import { createBlocks } from './render/blocks.js';
import { createFoes } from './render/foes.js';
import { createShots } from './render/shots.js';
import { createDeck } from './render/deck.js';
import { createFx } from './render/fx.js';
import { loadGeneratedAssets } from './render/textures.js';
import { createHud } from './ui/hud.js';
import { createTutorial } from './ui/tutorial.js';
import { createJourney } from './ux/journey.js';
import { GAME_OVER_DELAY, causeLine, lossHint, returnGoal } from './ux/journey-tuning.js';
import { createInspect } from './ui/inspect.js';
import { createAutoplay } from './autoplay.js';
import { createInput } from './input.js';
import { createSfx } from './sfx.js';
import { createHaptics } from './haptics.js';
import { nextSpeed } from './ux/speed.js';
import { createPause } from './ux/pause.js';
import { recordRun, restoreRun, loadSaved, saveRun, clearSaved } from './ux/resume.js';
import { loadStore } from './ux/coach.js';
import { createArt } from './art/index.js';
import { setupKv, KV_DICE } from './kv/index.js';
import { setupPets } from './kv/pets.js';

const BEST_KEY = 'mb:best';
const loadBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};
const saveBest = (v) => {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {}
};
// best wave reached: the return-visit goal ("Your best is wave 12. Beat it!")
const BEST_WAVE_KEY = 'siege:bestWave';
const loadBestWave = () => {
  try {
    return Number(localStorage.getItem(BEST_WAVE_KEY)) || 0;
  } catch {
    return 0;
  }
};
const saveBestWave = (v) => {
  try {
    localStorage.setItem(BEST_WAVE_KEY, String(v));
  } catch {}
};

// ?seed=123 replays a run; ?debug starts with a 16, a 256 and a 4096 to try every class stage.
const params = new URLSearchParams(location.search);
const seedParam = params.has('seed') ? Number(params.get('seed')) >>> 0 : undefined;
const debugStart = params.has('debug');
// The game draws its pets with the sticker art (Gemini sprites from tools/pipeline.mjs when
// generated): creatures on tiles, roaming fusions, namecards. ?style=classic brings back the
// plain blocks. ?kv: the key-visual demo (preset board, style switcher; see src/kv/index.js)
const kvMode = params.has('kv') || window.__KV__ === true; // the packed 2048-siege-kv.html sets __KV__
// ?dev: developer controls on the HUD (the Auto button: the bot plays)
const devMode = params.has('dev');
// Reduce motion: a setting that starts from the system preference
const MOTION_KEY = 'siege:motion';
// x4 speed unlocks for good after the first boss kill
const X4_KEY = 'siege:x4';
const loadX4 = () => {
  try {
    return localStorage.getItem(X4_KEY) === '1';
  } catch {
    return false;
  }
};
const loadReduceMotion = () => {
  try {
    const v = localStorage.getItem(MOTION_KEY);
    if (v != null) return v === '1';
  } catch {}
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
};
const hex = (c) => parseInt(String(c).replace('#', ''), 16);

async function waitForFonts() {
  if (!document.fonts?.load) return;
  const t = new Promise((r) => setTimeout(r, 1500));
  await Promise.race([Promise.all([document.fonts.load('800 64px "Baloo 2"'), document.fonts.load('700 16px "Nunito"')]), t]);
}

// The loading screen in index.html (#boot): a message while loading, hidden after the first frame.
const boot = document.getElementById('boot');
const bootSay = (text) => boot && (boot.querySelector('.boot-msg').textContent = text);
let failed = false; // after a failure: no more saves, and the loading screen stays up
/** Loading failed, or a frame broke: the loading screen comes back with "Try again" and "New run". */
function bootFail(err) {
  console.error(err);
  failed = true;
  boot?.classList.remove('done');
  boot?.classList.add('failed');
  // the message changes once the screen shows again: a hidden live region announces nothing
  setTimeout(() => bootSay('Something went wrong. Try again to reload the game.'), 100);
}

async function start() {
  await waitForFonts(); // block numbers and damage digits are drawn with Baloo 2
  // Gemini sprites, if tools/pipeline.mjs has produced them. A single-file pack carries them
  // inline (window.__GEN__); without that it has no manifest to fetch.
  if (window.__GEN__ || !window.__SINGLE_FILE__) await loadGeneratedAssets();

  const stage = await createStage(document.getElementById('app'));
  const fx = createFx(stage);
  const scenery = createScenery(stage);
  const style = params.get('style') || 'sticker';
  const art = kvMode || style !== 'classic' ? createArt(style) : null;
  const blocks = createBlocks(stage, fx, { art });
  const foes = createFoes(stage, fx);
  const shots = createShots(stage, fx);
  const deck = createDeck(stage);
  const sfx = createSfx();
  const haptics = createHaptics();
  // a game, not a page: no long-press menu or image callout
  addEventListener('contextmenu', (e) => e.preventDefault());
  const kv = kvMode ? setupKv({ stage, fx, blocks, art, hudEl: document.getElementById('hud'), getRun: () => run, params }) : null;
  const pets = !kvMode && art ? setupPets({ stage, fx, art, hudEl: document.getElementById('hud'), getRun: () => run }) : null;

  let best = loadBest();
  let bestWave = loadBestWave();
  // what this run did, for the summary on the game-over card
  const freshStats = () => ({ bosses: 0, lost: 0, combo: 0, fusions: 0 });
  let stats = freshStats();
  function tally(e) {
    if (e.type === 'merge') stats.combo = Math.max(stats.combo, e.combo ?? 1);
    else if (e.type === 'bossReward') stats.bosses += 1;
    else if (e.type === 'classed' && e.stage === 2) stats.fusions += 1;
    else if (e.type === 'remove' && e.reason === 'destroyed') stats.lost += 1;
  }
  let lastSummary = null; // { wave, score }: the line to share
  let overTimer = null; // the game-over card waits GAME_OVER_DELAY after the last block falls
  // first-run journey log (window.__mb.journey): milestones and tutorial text, wall-clock seconds
  const journey = createJourney({ now: () => performance.now() / 1000 });
  // Run resume (src/ux/resume.js): every input of a run is logged with its sim step and saved;
  // after a reload the log is replayed (the sim is deterministic) and the pause menu greets the
  // player. The showcase and debug runs are not saved. A first run waits for its opening to end.
  const canSave = !kvMode && !debugStart;
  let runLog = null;
  let saveWait = 0; // seconds until the next save may happen
  let savedInputs = -1; // inputs in the last save
  let run = null;
  let resumed = false;
  // ?tutorial replays the opening from scratch: a fresh run, not a resumed one
  const saved = canSave && !params.has('tutorial') && loadStore().guided ? loadSaved() : null;
  if (saved) {
    bootSay('Restoring your run…');
    // let the message paint first (a replay can take a moment on a slow phone); a hidden tab has no frames
    await Promise.race([new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))), new Promise((r) => setTimeout(r, 100))]);
    const back = restoreRun(createRun, saved, { onEvents: (list) => list.forEach(tally) });
    if (back) {
      run = back;
      runLog = recordRun(run, saved.log);
      resumed = true;
    } else {
      clearSaved(); // a newer build cannot replay it: start fresh
      stats = freshStats();
    }
  }
  if (!run) run = newRun();
  journey.onRunStart();
  let gameOverShown = false;
  let lastDownBy = null; // the enemy that broke the latest block
  let lastLoss = null; // how the last run ended (for the retry hint)
  let selected = null; // tile id picked to show its range
  let clearBonus = 0;

  function newRun() {
    if (kv) return kv.preset(createRun({ seed: seedParam ?? 2048, empty: true, dice: KV_DICE }));
    const r = createRun({ seed: seedParam, empty: debugStart });
    if (debugStart) {
      // one block per class stage, built from the deck's colours
      const [a, b, c] = r.owned;
      r.spawnDebug(4, 0, 0).cls = { element: a };
      r.spawnDebug(8, 1, 0).cls = { element: a, fusion: b };
      r.spawnDebug(12, 2, 0).cls = { element: a, fusion: b, ultimate: c };
      r.spawnDebug(1, 3, 1);
    }
    runLog = canSave ? recordRun(r) : null;
    return r;
  }

  const hud = createHud(document.getElementById('hud'), {
    onRestart: restart,
    onMenu: (page) => (page === 'main' && pause.menu === 'closed' ? openMenu() : pause.show(page)),
    onToggleMute: () => sfx.toggle(),
    onSetting: (name) => {
      if (name === 'sound') sfx.toggle();
      if (name === 'haptics') haptics.set(!haptics.on);
      if (name === 'motion') {
        reduceMotion = !reduceMotion;
        try {
          localStorage.setItem(MOTION_KEY, reduceMotion ? '1' : '0');
        } catch {}
        applyMotion();
      }
      syncSettings();
    },
    onShare: () => share(),
    onSpeed: () => {
      speed = nextSpeed(speed, maxSpeed);
      hud.setSpeed(speed);
    },
    onNextWave: () => !paused && run.nextWave(),
    onAuto: () => {
      // autoplay: the bot plays; the tutorial steps aside while it does
      const on = auto.toggle();
      tutorial.setMuted(on);
      if (on) run.setHold(false);
      return on;
    },
    onChoose: (i) => !paused && run.choose(i),
    muted: sfx.muted,
    dev: devMode,
  });

  let speed = 1; // sim steps per frame are multiplied by this (src/ux/speed.js)
  let maxSpeed = loadX4() ? 4 : 2;
  function resetSpeed() {
    speed = 1;
    hud.setSpeed(1);
  }
  let reduceMotion = loadReduceMotion();
  function applyMotion() {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
    stage.setReducedMotion(reduceMotion);
  }
  applyMotion();
  function syncSettings() {
    hud.setSettings({ sound: !sfx.muted, haptics: haptics.on, hapticsSupported: haptics.supported, motion: reduceMotion });
  }
  syncSettings();

  /** Share the run: the system share sheet, else copy the line. */
  async function share() {
    if (!lastSummary) return;
    const text = `I held the siege to wave ${lastSummary.wave} in 2048 Siege (${lastSummary.score.toLocaleString()} points). Can you beat it?`;
    const url = /^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}` : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: '2048 Siege', text, ...(url && { url }) });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // the player closed the sheet
      }
    }
    const line = url ? `${text} ${url}` : text;
    try {
      await navigator.clipboard.writeText(line);
      hud.shareDone('Copied!');
    } catch {
      // no Clipboard API (a plain-http address): the old copy command
      const area = Object.assign(document.createElement('textarea'), { value: line, readOnly: true });
      area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, area.value.length); // iOS Safari: select() alone selects nothing
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch {}
      area.remove();
      hud.shareDone(copied ? 'Copied!' : 'Cannot share here');
    }
  }

  // tap a block: a card says what it does (attack, numbers, effects, what it becomes next)
  const inspect = createInspect(document.getElementById('hud'), {
    stage,
    art,
    onClose: () => select(null),
    onDiscard: (id) => run.discard(id).ok && select(null), // sell a turret / break a dormant block
  });

  function restart() {
    pause.show('closed');
    clearTimeout(overTimer); // a card still on its way from the last run must not cover this one
    clearSaved(); // the old run is over; this one saves itself from its first input
    pauseTitle = 'Paused';
    stats = freshStats();
    resetSpeed();
    hud.clearBanners();
    run = newRun();
    journey.onRunStart();
    blocks.reset();
    foes.reset();
    shots.reset();
    fx.reset();
    kv?.reset();
    pets?.reset();
    hud.hideGameOver();
    gameOverShown = false;
    select(null);
    if (!kv) tutorial.start(run);
    // after a loss, the retry opens with one lesson from how that run ended
    if (!kv && lastLoss) tutorial.note(lossHint(lastLoss), 'board');
    lastLoss = null;
  }

  function select(id) {
    selected = id;
    blocks.select(id);
  }

  // where dropped coins fly to: the HUD coin icon, in world space
  const coinTarget = () => {
    const c = hud.coinTarget();
    return stage.toWorld(c.x, c.y);
  };
  const coinPulse = () => sfx.coin();

  // Keep notifications off the board: tell the HUD's CSS where the lane field and the board start.
  const hudEl = document.getElementById('hud');
  // The world fills the space between the HUD's top bars and its bottom bar. Measured (not
  // fixed numbers), so the compact HUD of a short phone gives the board more room.
  function fitStage() {
    const bar = hudEl.querySelector('.statusbar');
    const low = Math.min(...['.coinbar', '.fight'].map((s) => hudEl.querySelector(s).offsetTop));
    stage.setInsets({ top: bar.offsetTop + bar.offsetHeight + 4, bottom: hudEl.clientHeight - low + 4 });
  }
  fitStage();
  addEventListener('resize', fitStage);
  // the bars can also change size without a resize (a late font, a longer status text)
  if (typeof ResizeObserver === 'function') {
    const bars = new ResizeObserver(() => fitStage());
    for (const sel of ['.statusbar', '.coinbar', '.fight']) bars.observe(hudEl.querySelector(sel));
  }
  stage.onResize(() => {
    hudEl.style.setProperty('--field-top', `${Math.round(stage.toClient(0, FIELD.spawnY + 1.05).y)}px`);
    hudEl.style.setProperty('--board-top', `${Math.round(stage.toClient(0, GRID_TOP + 0.3).y)}px`);
  });

  const auto = createAutoplay();
  /** A swipe from the player or the autoplay bot. */
  function doSwipe(dir) {
    select(null);
    if (paused || !run.move(dir)) return false;
    journey.onSwipe(); // before the tutorial: the next bubble's words come after the swipe
    tutorial.onSwipe();
    sfx.drop(2);
    return true;
  }

  let paused = false; // the pause controller (below) sets it

  // first-run guided opening, one-time tips, and the How to play sheet (from the pause menu)
  const tutorial = createTutorial(hudEl, {
    stage,
    getRun: () => run,
    onPause: (open) => {
      if (!open && pause.menu === 'help') pause.show('main'); // its Back button returns to the menu
    },
    onReplay: () => restart(),
    onLog: (kind, data) => journey.onCoach(kind, data),
  });

  // Pause (src/ux/pause.js): the menu and its pages, and a phone held sideways.
  let pauseTitle = 'Paused'; // 'Welcome back' after a resume
  const pause = createPause({
    onChange: (s) => {
      paused = s.paused;
      hudEl.classList.toggle('paused', paused); // banners stop with the game
      if (s.menu === 'main') syncSettings();
      if (s.menu === 'closed') pauseTitle = 'Paused';
      if (s.menu !== 'closed') saveNow(); // the phone may close the tab next
      // the help sheet first: the pause view then knows which dialog keeps the focus
      if ((s.menu === 'help') !== tutorial.helpOpen) tutorial.openHelp(s.menu === 'help');
      hud.setPauseView(s.menu, { title: pauseTitle, wave: run.waveNo, score: run.score, blocks: run.blocks });
    },
  });
  /** The pause menu: the Pause button, Escape or P, or the tab going to the background. */
  const openMenu = () => !gameOverShown && pause.show('main');
  // a phone call or a switch to another app must not cost the run: save it, come back to the pause menu
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    saveNow();
    if (!run.over && pause.menu === 'closed') openMenu();
  });
  addEventListener('pagehide', () => saveNow());
  // portrait only: a phone turned sideways shows "Turn your phone upright" (hud.css) and the game waits
  const sideways = matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)');
  pause.hold('rotate', sideways.matches);
  sideways.addEventListener('change', (e) => {
    pause.hold('rotate', e.matches);
    // upright again: the game waits for Resume, not the turn; an open menu stays on its page
    if (!e.matches && !run.over && pause.menu === 'closed') openMenu();
  });
  if (!kv) tutorial.start(run);
  else tutorial.setMuted(true); // the showcase has no tips
  // a returning player (opening done) gets a goal: their best wave; a resumed run, the pause menu
  if (resumed) {
    pauseTitle = 'Welcome back';
    openMenu();
  } else if (!kv && !tutorial.active) tutorial.note(returnGoal(bestWave));

  createInput(stage.app.canvas, {
    swipe: (dir) => doSwipe(dir),
    // tap a block to see its range; tap it again (or anywhere else) to put it down
    tap: (cx, cy) => {
      if (paused || run.over || run.pendingChoice) return;
      const p = stage.toWorld(cx, cy);
      const col = Math.round((p.x - cellX(0)) / GRID.cell);
      const row = Math.floor(p.y / GRID.cell);
      const tile = run.grid.at(col, row);
      if (!tile) return select(null);
      select(tile.id === selected ? null : tile.id);
    },
    choose: (i) => !paused && run.pendingChoice && run.choose(i),
    nextWave: () => !paused && run.nextWave(),
    pause: () => (pause.menu === 'closed' ? openMenu() : pause.back()), // Escape / P: one step back
  });
  // swipes on the HUD area outside buttons should also work
  document.getElementById('hud').style.pointerEvents = 'none';

  const client = (x, y) => stage.toClient(x, y);

  function handleEvents() {
    for (const e of run.drainEvents()) {
      tally(e);
      journey.onRunEvent(e);
      tutorial.onEvent(e);
      blocks.onEvent(e);
      kv?.onEvent(e);
      pets?.onEvent(e);
      switch (e.type) {
        case 'merge': {
          fx.burst(e.x, e.y, [0xffffff, 0xffe27a], 10 + e.tier * 2, { speed: 4, size: 0.24, life: 0.45, gravity: 0 });
          fx.ring(e.x, e.y, 0xffffff, 0.6, 1.6, 0.3);
          stage.shake(1 + e.tier * 0.4 + (e.combo > 1 ? 2 : 0));
          sfx.merge(e.tier, e.combo);
          haptics.play('merge');
          const p = client(e.x, e.y + 0.9);
          hud.popup(p.x, p.y, `+${e.value.toLocaleString()}`, e.tier);
          if (e.combo >= 2) hud.combo(e.combo);
          break;
        }
        case 'milestone':
          hud.milestone(e.tier);
          sfx.milestone();
          stage.shake(10);
          break;
        case 'coins': {
          if (e.reason === 'kill') {
            fx.number(e.x, e.y + 0.5, e.amount, { color: 0xffd34a, small: true, prefix: '+' });
            fx.coinDrop(e.x, e.y, Math.min(6, 1 + Math.floor(e.amount / 12)), coinTarget, coinPulse);
          } else if (e.reason === 'combo') {
            const p = client(e.x, e.y + 1.2);
            hud.popup(p.x, p.y, 'Free swipe!', 6, '#ffd34a');
            fx.coinDrop(e.x, e.y, 3, coinTarget, coinPulse);
          } else if (e.reason === 'clear') {
            fx.coinDrop(0, 4, 10, coinTarget, coinPulse);
          }
          break;
        }
        case 'discard': {
          // a sold turret pays out in coins; a broken block crumbles and the price leaves
          const p = client(e.x, e.y + 0.9);
          if (e.kind === 'sell') {
            fx.burst(e.x, e.y, [0xffd34a, 0xffffff], 18, { speed: 4, size: 0.24, life: 0.5, gravity: -6 });
            fx.coinDrop(e.x, e.y, Math.min(6, 2 + Math.floor(e.amount / 5)), coinTarget, coinPulse);
            hud.popup(p.x, p.y, `Sold +${e.amount}`, 4, '#ffd34a');
            sfx.coin();
          } else {
            fx.burst(e.x, e.y, [0xc9b08a, 0x8a7462, 0xffffff], 22, { speed: 5, size: 0.26, life: 0.5, gravity: -9 });
            stage.shake(4);
            hud.popup(p.x, p.y, `Broken −${-e.amount}`, 3, '#ef6060');
            sfx.deny();
          }
          break;
        }
        case 'noCoins': {
          hud.coinDeny();
          sfx.deny();
          haptics.play('deny');
          const c = hud.coinTarget();
          hud.popup(c.x + 60, c.y - 28, `Need ${e.cost}`, 2, '#ef6060');
          break;
        }
        case 'promote': {
          // a boss x2 (or several) on this block
          fx.burst(e.x, e.y, [0xffe27a, 0xffffff], 30, { speed: 5, size: 0.3, life: 0.6, gravity: 0 });
          fx.ring(e.x, e.y, 0xffe27a, 0.6, 2.4, 0.5);
          const p = client(e.x, e.y + 1.2);
          hud.popup(p.x, p.y, `x${2 ** (e.by ?? 1)}`, e.tier, '#ffe27a');
          break;
        }
        case 'bossReward':
          sfx.milestone();
          haptics.play('boss');
          hud.banner(
            `${e.boss ?? 'Boss'} defeated!`,
            e.x2s ? `Your blocks got ${e.x2s} x2${e.x2s === 1 ? '' : 's'}.${e.pairs > 0 ? ' Merge the new pairs!' : ''}` : 'No other block had room to grow.',
            'good',
          );
          if (maxSpeed < 4) {
            maxSpeed = 4;
            try {
              localStorage.setItem(X4_KEY, '1');
            } catch {}
            hud.banner('x4 speed unlocked', 'The speed button now goes x1 · x2 · x4.', 'good');
          }
          break;
        case 'classed': {
          // a merge awakened an element, made a fusion or an ultimate: announce the combination
          const color = hex(ELEMENTS[e.element].color);
          fx.ring(e.x, e.y, color, 0.8, 3, 0.6);
          fx.burst(e.x, e.y, e.info.colors.map(hex), 34, { speed: 5, size: 0.3, life: 0.6, gravity: 0 });
          hud.announce(e.info);
          sfx.choose(e.stage);
          if (e.stage >= 2) stage.shake(4 + e.stage * 2);
          break;
        }
        case 'override': {
          // the sliding block's colour wins: show who took over
          const p = client(e.x, e.y + 1.6);
          hud.popup(p.x, p.y, `${ELEMENTS[e.winner].name} over ${ELEMENTS[e.loser].name}`, 3, ELEMENTS[e.winner].color);
          break;
        }
        case 'dieGained':
          hud.banner(`New die: ${e.offer.name}`, 'Added to your deck: blocks reaching 16 can now roll it.', 'good');
          sfx.milestone();
          break;
        case 'tileHeal':
          // Nature repairs a block: a green beam from the hit to the block, a sparkle on it
          fx.beam(e.from.x, e.from.y, e.x, e.y, 0x4cd964);
          fx.burst(e.x, e.y, [0x4cd964, 0xd9ffd9], 10, { speed: 2.5, size: 0.22, life: 0.5, gravity: -2 });
          blocks.onEvent(e);
          break;
        case 'tileHit':
          blocks.onEvent(e); // red flash + shudder (block health itself stays hidden)
          fx.burst(e.x + (e.from.x - e.x) * 0.45, e.y + (e.from.y - e.y) * 0.45, [0xff6b6b, 0xffffff], 4, { speed: 2.5, size: 0.16, life: 0.25, gravity: 0 });
          break;
        case 'remove':
          if (e.reason === 'destroyed') {
            // a block's hidden health ran out: it shatters and is gone for good
            fx.explode(e.x, e.y, 'earth', 2.6, { flash: 0xff6b6b });
            fx.burst(e.x, e.y, [0x2a1c22, 0xff6b6b, hex(ELEMENTS[e.cls?.element]?.color ?? '#d9d2c5')], 26, { speed: 6, size: 0.3, life: 0.6, gravity: -9 });
            stage.shake(10);
            sfx.hurt();
            haptics.play('lost');
            hud.castleHit();
            const p = client(e.x, e.y + 0.9);
            hud.popup(p.x, p.y, 'Block lost!', 4, '#ef6060');
          }
          break;
        case 'tilesRestored':
          for (const t of run.tiles) fx.burst(t.x, t.y, [0x9dff9d, 0xffffff], 4, { speed: 1.5, size: 0.16, life: 0.4, gravity: -3 });
          break;
        case 'locked':
          hud.banner('Board locked!', 'No swipe can move a block until one is destroyed or boss x2s make a pair.', 'boss');
          break;
        case 'waveStart':
          sfx.battle(!!e.boss);
          if (e.boss) resetSpeed(); // a boss is worth watching at full detail
          if (e.boss) hud.banner(`${ENEMY_TYPES[e.boss].name} approaches!`, ENEMY_TYPES[e.boss].intro, 'boss');
          else hud.banner(`Wave ${e.wave}`, `${e.chapter} · ${e.count} foes`);
          break;
        case 'waveClear':
          clearBonus = e.bonus;
          break;
        case 'waveIncoming':
          hud.banner(
            `Wave ${e.wave - 1} cleared! +${clearBonus}`,
            e.boss ? `Boss next: ${ENEMY_TYPES[e.boss].name}. Line up your blocks under the red lane.` : `Next: ${e.count} foes in ${e.lanes.length} lanes`,
            e.boss ? 'boss' : 'good',
          );
          break;
        case 'fire':
          break;
        case 'hit': {
          const big = e.crit && e.amount > 0;
          fx.number(e.x, e.y + 0.35, e.amount, { color: big ? hex(e.colors.at(-1)) : 0xffffff, crit: false });
          break;
        }
        case 'impact':
          if (!e.area) shots.impact(e); // area attacks draw their own shape below
          if (e.kind === 'zap') sfx.kill(false);
          break;
        // --- the basic attacks' shapes (the sim already applied the hits) ---
        case 'breath': {
          // Ember Breath: a fan of flame up (or down) the lane
          const cols = [...e.colors.map(hex), 0xffb347, 0xffe27a];
          const up = e.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          fx.burst(e.x, e.y + e.dir * 0.4, cols, 22 + (e.lanes ?? 0) * 8, { speed: e.reach / 0.32, size: 0.32, life: 0.32, gravity: 0, spread: 0.75 + (e.lanes ?? 0) * 0.35, dir: up });
          fx.ring(e.x, e.y + e.dir * 0.5, cols[0], 0.2, 0.9, 0.2);
          break;
        }
        case 'gust':
          // Wing Gust: a streak of wind up the whole lane (and the neighbours at 128)
          for (let l = e.lane - e.lanes; l <= e.lane + e.lanes; l++) {
            if (l < 0 || l >= FIELD.lanes) continue;
            fx.slash(l, FIELD.spawnY - e.y, e.reach, hex(e.colors.at(-1)));
          }
          fx.burst(e.x, e.y + 0.5, [0xffffff, hex(e.colors.at(-1))], 10, { speed: 7, size: 0.2, life: 0.35, gravity: 0, spread: 0.4, dir: Math.PI / 2 });
          break;
        case 'pulse': {
          // Bramble Shell: a thorny ring around the block
          const c = hex(e.colors.at(-1));
          fx.ring(e.x, e.y, c, 0.3, e.radius, 0.45, 2);
          fx.ring(e.x, e.y, 0x8a5a33, 0.2, e.radius * 0.8, 0.35, 1);
          fx.burst(e.x, e.y, [c, 0x7cd15a, 0x8a5a33], 16, { speed: e.radius * 3, size: 0.22, life: 0.35, gravity: 0 });
          break;
        }
        case 'quake':
          // Quake Stomp: a shockwave across three lanes
          for (let l = e.lane - e.lanes; l <= e.lane + e.lanes; l++) {
            if (l < 0 || l >= FIELD.lanes) continue;
            fx.ring(laneX(l), e.y, hex(e.colors.at(-1)), 0.3, e.reach * 0.9, 0.4, 1.6);
            fx.burst(laneX(l), e.y, [0xc79a62, 0x8b6b4a, 0xeadbc0], 9, { speed: 4, size: 0.26, life: 0.45, gravity: -7 });
          }
          stage.shake(4);
          break;
        case 'pounce': {
          // Pride Pounce: a golden leap onto the prey
          fx.beam(e.from.x, e.from.y, e.to.x, e.to.y, 0xffd34a);
          fx.burst(e.to.x, e.to.y, [0xffd34a, 0xffffff, hex(e.colors.at(-1))], 12, { speed: 5, size: 0.22, life: 0.3, gravity: 0 });
          break;
        }
        case 'ping':
          // Echo Harpoon: the sonar ping finds its prey
          fx.ring(e.x, e.y, 0x9be7f5, 0.15, 1.3, 0.35, 1.2);
          fx.ring(e.x, e.y, 0xffffff, 0.1, 0.8, 0.25, 0.8);
          break;
        case 'stun':
          fx.burst(e.x, e.y + 0.7, [0xffe14d, 0xffffff], 7, { speed: 1.6, size: 0.17, life: 0.5, gravity: 0 });
          break;
        case 'weaken':
          fx.burst(e.x, e.y + 0.5, [0xa35cf0, 0xd9b3ff], 8, { speed: 1.8, size: 0.18, life: 0.45, gravity: -5 });
          break;
        case 'bite':
          fx.burst(e.x, e.y, [0xff6b6b, 0xffd34a, 0xffffff], 14, { speed: 6, size: 0.24, life: 0.3, gravity: 0 });
          fx.ring(e.x, e.y, 0xffd34a, 0.2, 1.2, 0.25, 1.5);
          break;
        case 'freeze':
          fx.burst(e.x, e.y, [0xbfeaff, 0xffffff], 14, { speed: 3, size: 0.2, life: 0.4, gravity: 0 });
          break;
        case 'kill': {
          const def = e.enemy.def;
          fx.burst(e.x, e.y, [hex(def.color), 0xffffff, 0xffe27a], e.boss ? 70 : 16, { speed: e.boss ? 9 : 5, size: e.boss ? 0.4 : 0.26, life: 0.6, gravity: -8 });
          fx.ring(e.x, e.y, hex(def.color), 0.3, e.boss ? 3.5 : 1.3, 0.35);
          sfx.kill(e.boss);
          if (e.boss) stage.shake(14); // the banner comes with the reward ('bossReward')
          break;
        }
        case 'strike':
          fx.bolt(e.x, e.y);
          break;
        case 'meteor':
          fx.meteor(e.x, e.y, e.radius, () => stage.shake(10));
          break;
        case 'spread':
          fx.spread(e.from, e.to);
          break;
        case 'signature': {
          const tint = { globalBurn: 0xff7a3d, globalFreeze: 0x7fd4ff, vortex: 0xbff7e6, contagion: 0xb46cff, gild: 0xffd34a, bloom: 0x4cd964 }[e.effect];
          if (tint) stage.flash(tint, 0.28);
          fx.ring(e.x, e.y, hex(e.colors.at(-1)), 0.8, 3.2, 0.5);
          const p = client(e.x, e.y + 1.3);
          hud.popup(p.x, p.y, e.name, 12, e.colors.at(-1));
          break;
        }
        case 'heal':
          fx.ring(e.x, e.y, 0x9dff9d, 0.3, e.radius * 2, 0.6);
          break;
        case 'summon':
          fx.burst(e.x, e.y, [0xc04848, 0xffd36b], 20, { speed: 4, size: 0.24, life: 0.5, gravity: 0 });
          break;
        case 'tileDown': {
          // remember what broke the block, for the game-over card's cause line
          const en = run.enemies.find((x) => x.id === e.by);
          lastDownBy = en ? (ENEMY_TYPES[en.type]?.name ?? null) : null;
          break;
        }
        case 'breakShortened':
          hud.nudgeWave(); // no swipe possible: the break shrinks and Wave now pulses
          break;
        case 'gameover': {
          const isBest = e.score > best;
          if (isBest) {
            best = e.score;
            saveBest(best);
          }
          const isBestWave = e.wave > bestWave;
          if (isBestWave) saveBestWave((bestWave = e.wave));
          lastSummary = { wave: e.wave, score: e.score };
          clearSaved(); // nothing to resume
          const summary = { kills: e.kills, time: run.time, ...stats };
          lastLoss = { wave: e.wave, maxTier: e.maxTier };
          sfx.gameover();
          haptics.play('over');
          const cause = causeLine({ wave: e.wave, by: lastDownBy });
          overTimer = setTimeout(() => hud.showGameOver({ score: e.score, wave: e.wave, maxTier: e.maxTier, isBest, isBestWave, cause, stats: summary }), GAME_OVER_DELAY * 1000);
          gameOverShown = true;
          select(null);
          break;
        }
      }
    }
  }

  /** Save the run for a resume (at most once a second while inputs come in; at once on pause). */
  function saveNow() {
    // none after a failure: a broken frame can leave the run half-stepped, and the save on the way out would undo New run (index.html)
    if (!runLog || run.over || failed) return;
    saveRun(run, runLog);
    savedInputs = runLog.inputs.length;
    saveWait = 1;
  }

  let acc = 0;
  /** One frame. `force` steps even while paused (the __mb.advance dev helper). */
  function update(dt, force = false) {
    const live = force || !paused; // paused: the menu, How to play, a sideways phone
    acc = live ? acc + dt * speed : 0;
    let n = 0;
    while (acc >= PHYSICS.dt && n < 8 * speed) {
      run.step();
      acc -= PHYSICS.dt;
      n += 1;
    }
    handleEvents();
    if (runLog && runLog.inputs.length !== savedInputs && (saveWait -= dt) <= 0) saveNow();

    hud.setScore(run.score, Math.max(best, run.score));
    hud.setNext(Math.max(1, run.maxTier));
    hud.setStatus({
      wave: run.waveNo,
      chapter: run.wave.chapter.name,
      phase: run.phase,
      timer: run.timer,
      holding: run.holding,
      left: run.left,
      blocks: run.blocks,
      boss: run.wave.boss,
      bestWave,
    });
    hud.setEconomy(run.coins, run.swipeCost);
    hud.setChoice(gameOverShown ? null : run.pendingChoice);
    tutorial.update(live ? dt : 0);
    hud.update(live && !run.pendingChoice ? dt : 0); // banners wait behind a die card, too
    if (live && !gameOverShown) auto.tick(run, dt, doSwipe);
    hud.setDanger(run.blocks <= 3 && run.phase === 'wave' ? 0.5 : 0);

    // a picked block shows its range (and its inspect card); a die card or a lost block puts it down
    const picked = selected != null && run.tiles.find((t) => t.id === selected);
    if (selected != null && (!picked || run.pendingChoice)) select(null);
    scenery.showRange(picked ? { x: picked.x, y: picked.y, shoot: profileFor(picked).shoot } : null);
    inspect.show(picked && !run.pendingChoice && !gameOverShown && !pause.paused ? picked : null, picked ? { price: run.discardPrice(picked.id), coins: run.coins, last: run.tiles.length <= 1 } : {}, dt);

    const perLane = [0, 0, 0, 0];
    for (const e of run.enemies) if (!e.dead && !e.gone) perLane[e.lane] += 1;
    scenery.update(dt, { lanes: run.wave.lanes, bossLane: run.wave.bossLane, phase: run.phase, perLane });
    kv?.update(run, dt);
    pets?.update(run, dt);
    blocks.sync(run, dt);
    deck.sync(run, dt);
    foes.sync(run.enemies, dt);
    shots.sync(run.shots, dt, run.defense.puddles);
    fx.update(dt);
    stage.update(dt);
  }

  stage.app.ticker.add((ticker) => {
    try {
      update(Math.min(0.1, ticker.deltaMS / 1000));
    } catch (err) {
      // a broken frame would freeze the board with no word: show the failure screen instead
      stage.app.ticker.stop();
      bootFail(err);
    }
  });
  // the first frame is on screen: the loading screen fades out (it stays in the page for a failure,
  // and stays up if a frame already broke)
  requestAnimationFrame(() => requestAnimationFrame(() => !failed && boot?.classList.add('done')));

  // handy in the console while prototyping
  window.__mb = {
    get journey() {
      return journey.snapshot();
    },
    get run() {
      return run;
    },
    /** Layout: U = pixels per world unit (the board is 8 units wide). */
    get view() {
      return { ...stage.view };
    },
    restart,
    /** Step + render without the ticker (works in hidden tabs, and while paused). */
    advance(seconds, fps = 60) {
      for (let i = 0; i < Math.round(seconds * fps); i++) {
        update(1 / fps, true);
        stage.app.render();
      }
    },
    spawn: (tier, col, row) => run.spawnDebug(tier, col, row),
    coins: (n) => run.addCoins(n),
    select,
    cell: (col, row) => ({ x: cellX(col), y: cellY(row) }),
  };
}

start().catch(bootFail);
