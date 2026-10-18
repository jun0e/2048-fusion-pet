import './ui/hud.css';
import './ui/keepsakes.css'; // the level and keepsake discs, their cards and the keepsake picker
import './ui/cards.css'; // v2: the choices, the skill gained, the namecard's time out
import { Assets } from 'pixi.js';
import { createRun } from './sim/run.js';
import { ENEMY_TYPES } from './sim/enemies.js';
import { ELEMENTS, FUSIONS, fusionKey, profileFor } from './sim/classes.js';
import { FIELD, GRID, GRID_TOP, PHYSICS, cellX, cellY } from './config.js';
import { createStage } from './render/stage.js';
import { createScenery } from './render/scenery.js';
import { createBlocks } from './render/blocks.js';
import { createFoes } from './render/foes.js';
import { createShots } from './render/shots.js';
import { createTrails } from './render/trails.js';
import { createAttacks } from './render/attacks.js';
import { createDeck } from './render/deck.js';
import { createFx } from './render/fx.js';
import { createSkillFx } from './render/skillfx.js';
import { loadGeneratedAssets, readyVfx } from './render/textures.js';
import { createDiagnostics } from './render/diagnostics.js';
import { createHud, bossHealth } from './ui/hud.js';
import { createTutorial } from './ui/tutorial.js';
import { createJourney } from './ux/journey.js';
import { GAME_OVER_DELAY, causeLine, lossHint, returnGoal } from './ux/journey-tuning.js';
import { createInspect } from './ui/inspect.js';
import { buffBanner } from './sim/describe.js';
import { petName } from './art/tokens.js';
import { DEMO_DECK, createDemoPanel, mockChoice, presetBoard, shimSummons } from './ui/v2demo.js';
import { createRunBadges } from './ui/run-badges.js';
import { createKeepsakePicker } from './ui/keepsake-picker.js';
import { loadMeta, saveMeta, recordBest, isFirstRun, unseenKeepsakes } from './ux/meta.js';
import { STARTER_KEEPSAKE } from './sim/keepsakes.js';
import { createAutoplay } from './autoplay.js';
import { createInput } from './input.js';
import { createSfx } from './sfx.js';
import { createHaptics } from './haptics.js';
import { nextSpeed } from './ux/speed.js';
import { createPause } from './ux/pause.js';
import { inFrame, shareLine, shareRun } from './ux/share.js';
import { createBossIntro } from './ui/boss-intro.js';
import { LANGS, getLang, letters, num, setLang, tr } from './i18n/index.js';
import { recordRun, restoreRun, loadSaved, saveRun, clearSaved, markRelang, mayRestore, takeRelang } from './ux/resume.js';
import { SIGNATURE_TINT, TEXT, popupFont, textInk } from './ux/photosafe.js';
import { loadStore } from './ux/coach.js';
import { createArt } from './art/index.js';
import { boardRefused } from './art/plaque.js';
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

// ?seed=123 replays a run; ?debug starts with a single pet, a fusion at 1024 and a pure pet at 4096.
// ?v2demo: every kind of v2 block on the board, and buttons that open each v2 card with mock choices
// (src/ui/v2demo.js; window.__mb.card(kind) does the same).
const params = new URLSearchParams(location.search);
const seedParam = params.has('seed') ? Number(params.get('seed')) >>> 0 : undefined;
const v2demo = params.has('v2demo');
const debugStart = params.has('debug') || v2demo;
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
  // every letter of the language's words as the sample: a font loads only the subsets its sample needs
  // (Vietnamese letters span two), and the canvas draws its words with what has loaded by then
  const say = letters();
  // a font that cannot load (blocked fonts, a flaky network) is no failure: the game draws with the fallback
  const load = (font) => document.fonts.load(font, say).catch(() => {});
  await Promise.race([Promise.all([load('800 64px "Baloo 2"'), load('700 16px "Nunito"')]), t]);
}

// The loading screen in index.html (#boot): a message while loading, hidden after the first frame.
const boot = document.getElementById('boot');
const bootSay = (text) => boot && (boot.querySelector('.boot-msg').textContent = text);
// index.html already says these in the language (its BOOT_WORDS); the tables are the source
bootSay(tr('boot.loading'));
if (boot) {
  boot.querySelector('.boot-retry').textContent = tr('boot.retry');
  boot.querySelector('.boot-new').textContent = tr('boot.newRun');
}

let failed = false; // after a failure: no more saves, and the loading screen stays up
/** Loading failed, or a frame broke: the loading screen comes back with "Try again" and "New run". */
function bootFail(err) {
  console.error(err);
  failed = true;
  boot?.classList.remove('done');
  boot?.classList.add('failed');
  // the message changes once the screen shows again: a hidden live region announces nothing
  setTimeout(() => bootSay(tr('boot.failed')), 100);
}

async function start() {
  await waitForFonts(); // block numbers and damage digits are drawn with Baloo 2
  // Gemini sprites, if tools/pipeline.mjs has produced them. A single-file pack carries them
  // inline (window.__GEN__); without that it has no manifest to fetch.
  if (window.__GEN__) {
    // the packed sprites are data: URLs: decode them as images (img-src), not with fetch, which a
    // strict page policy refuses (the shared single-file build: no data: in connect-src)
    Assets.setPreferences({ preferWorkers: false, preferCreateImageBitmap: false });
  }
  if (window.__GEN__ || !window.__SINGLE_FILE__) await loadGeneratedAssets();
  readyVfx(); // the attack sprites: levelled and measured for the light budget now, not in the first fight

  const stage = await createStage(document.getElementById('app'));
  const fx = createFx(stage);
  const scenery = createScenery(stage, fx); // fx: a lit brazier books its flame in the light budget
  const diag = createDiagnostics(stage.app);
  const style = params.get('style') || 'sticker';
  const art = kvMode || style !== 'classic' ? createArt(style) : null;
  // the game draws the pets: fusions' pets roam the field (sim state: createRun({ roaming })).
  // ?style=classic draws none, so its fusions stay on the board; the showcase's run always roams.
  const roaming = !kvMode && !!art;
  // the attacks' sprites: trails (ribbons, ghosts, tethers, decals, pieces) under the shots and the instant attacks' shapes
  const trails = createTrails(stage);
  const attacks = createAttacks(stage, fx, trails);
  const blocks = createBlocks(stage, fx, { art });
  const foes = createFoes(stage, fx);
  const shots = createShots(stage, fx, trails, attacks);
  const deck = createDeck(stage);
  // v2: what the fusion skills do on the field (zones, walls, traps, minions, tethers, skillFx events: U2)
  const skillFx = createSkillFx({ stage, fx, art });
  const sfx = createSfx();
  const haptics = createHaptics();
  // a game, not a page: no long-press menu or image callout (but the share line, shown to copy by hand)
  addEventListener('contextmenu', (e) => e.target.closest?.('.share-line') || e.preventDefault());
  const kv = kvMode ? setupKv({ stage, fx, blocks, art, hudEl: document.getElementById('hud'), getRun: () => run, params }) : null;

  let best = loadBest();
  let bestWave = loadBestWave();
  // keepsakes (src/sim/keepsakes.js): the record across runs and the keepsake to bring (src/ux/meta.js).
  // The first run brings Iron Fist with no picker; the tutorial teaches it.
  const meta = loadMeta();
  const firstRun = isFirstRun(meta);
  /** The picker comes once the opening is over (a player still in the tutorial keeps Iron Fist). */
  const pickerDue = () => meta.runs >= 1 && tutorial.openingDone;
  let runUnlocks = []; // keepsakes this run unlocked (the game-over card lists them)
  let badges = null; // the spawn level and keepsake discs (created with the HUD)
  // what this run did, for the summary on the game-over card
  const freshStats = () => ({ bosses: 0, lost: 0, combo: 0, fusions: 0, punches: 0 });
  let stats = freshStats();
  function tally(e) {
    if (e.type === 'merge') stats.combo = Math.max(stats.combo, e.combo ?? 1);
    else if (e.type === 'bossReward') stats.bosses += 1;
    else if (e.type === 'classed' && e.stage === 2) stats.fusions += 1;
    else if (e.type === 'remove' && e.reason === 'destroyed') stats.lost += 1;
    else if (e.type === 'punch') stats.punches += 1;
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
  // v2: fusions made, waiting to show the skill they gained ([{ cls, tier }]), and the one on screen
  const results = [];
  let resultOn = null;
  let demoChoice = null; // ?v2demo: a mock choice on screen (src/ui/v2demo.js)
  let demoTiles = null; // ?v2demo: the preset's blocks
  // ?tutorial replays the opening from scratch: a fresh run, not a resumed one. A language switch
  // reloads the page: its run comes back even mid-opening, the opening at its step, and Settings again
  const relang = takeRelang(); // { step }, once, after a language switch
  const found = mayRestore({ canSave, tutorial: params.has('tutorial'), guided: loadStore().guided, relang }) ? loadSaved() : null;
  // a run whose pets roam resumes only where pets are drawn (not under ?style=classic), and back
  const saved = found && !!found.log.roaming === roaming ? found : null;
  if (saved) {
    bootSay(tr('boot.restoring'));
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
  // ?tutorial replays the opening as a first run: with Iron Fist (the player's pick stays for later)
  if (!run) run = params.has('tutorial') && !kv ? newRun(STARTER_KEEPSAKE, { remember: false }) : newRun();
  journey.onRunStart();
  let gameOverShown = false;
  let lastDownBy = null; // the enemy that broke the latest block
  let lastLoss = null; // how the last run ended (for the retry hint)
  let selected = null; // tile id picked to show its range
  let clearBonus = 0;
  // Text over the canvas is photosafe too (src/ux/photosafe.js TEXT): a popup takes from the light
  // budget and is skipped when the screen is already lit up; the big milestone number takes the
  // one-a-second flash budget, and waits for it (a moment at most).
  function popup(x, y, text, tier, color) {
    const share = fx.flashShare(textInk(text, popupFont(tier), stage.view.U), TEXT.life, Math.max(TEXT.minScale, TEXT.minPx / popupFont(tier)) ** 2); // a popup hud.js would not draw (under TEXT.minPx) books nothing
    if (share) hud.popup(x, y, text, tier, color, Math.sqrt(share)); // ink grows with the font size squared
  }
  function milestone(tier, tries = 0) {
    if (stage.reduced || stage.takeFlash()) hud.milestone(tier); // under Reduce motion it fades in place
    else if (tries < 6) setTimeout(() => milestone(tier, tries + 1), 200);
  }
  // a wave with 3 blocks or fewer left: the red vignette shows, and so does a fallen block's edge pulse
  const inDanger = () => run.blocks <= 3 && run.phase === 'wave';

  /**
   * A new run that brings `keepsake` (the showcase brings none and keeps the classic spawns).
   * `remember`: it becomes the keepsake picked first next time; `count`: it counts as a run started.
   */
  function newRun(keepsake = meta.keepsake, { remember = true, count = true } = {}) {
    if (kv) return kv.preset(createRun({ seed: seedParam ?? 2048, empty: true, dice: KV_DICE, roaming: true, levels: false })); // it draws its pets
    const r = createRun({ seed: seedParam, empty: debugStart, roaming, keepsake, ...(v2demo ? { dice: DEMO_DECK } : {}) });
    runUnlocks = [];
    if (canSave) {
      if (remember) meta.keepsake = keepsake;
      if (count) meta.runs += 1;
      saveMeta(meta);
    }
    if (v2demo) {
      demoTiles = presetBoard(r);
      shimSummons(r); // the namecards' states before the sim has summons (none once it has)
      r.setHold(true); // the cards are checked at rest: the first wave waits for Wave now
    } else if (debugStart) {
      // a single pet, a fusion at 1024 (its summon), a pure pet at 4096, a plain block: from the deck's elements
      const [a, b] = r.owned;
      r.spawnDebug(4, 0, 0).cls = { element: a };
      r.spawnDebug(10, 1, 0).cls = { element: a, fusion: b, buffs: {} };
      r.spawnDebug(12, 2, 0).cls = { element: b, fusion: a, buffs: { [a]: 1 }, pure: true };
      r.spawnDebug(1, 3, 1);
    }
    runLog = canSave ? recordRun(r) : null;
    return r;
  }

  let switching = false; // the Language row was tapped: the page is on its way to the next language
  const hud = createHud(document.getElementById('hud'), {
    onRestart: () => restart(),
    onMenu: (page) => (page === 'main' && pause.menu === 'closed' ? openMenu() : pause.show(page)),
    onSetting: (name, { keyboard = false } = {}) => {
      if (name === 'lang') {
        // the next language: the player's choice (saved, or where storage is blocked, in the address);
        // the page reloads in it (every screen and table is built in the language as it loads), and
        // the run restores itself (src/ux/resume.js). One switch per tap: until the page goes, a
        // second tap would switch straight back
        if (switching) return;
        switching = true;
        const langs = Object.keys(LANGS);
        setLang(langs[(langs.indexOf(getLang()) + 1) % langs.length], true);
        saveNow();
        markRelang({ step: tutorial.step, keyboard });
        // the loading screen at once, in the new language: it answers the tap, and covers the row. A
        // reload that is stopped (the browser's Stop) leaves it up: Try again then finishes the switch
        boot?.classList.remove('done');
        bootSay(tr('boot.loading'));
        if (boot) {
          boot.querySelector('.boot-retry').textContent = tr('boot.retry');
          boot.querySelector('.boot-new').textContent = tr('boot.newRun');
          setTimeout(() => boot.classList.add('slow'), 5000);
        }
        location.reload();
        return;
      }
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
    onNextWave: () => !paused && !run.pendingChoice && run.nextWave(), // never behind a die card
    onAuto: () => {
      // autoplay: the bot plays; the tutorial steps aside while it does
      const on = auto.toggle();
      tutorial.setMuted(on);
      if (on) run.setHold(false);
      return on;
    },
    onChoose: (i) => (demoChoice ? pickDemo(i) : !paused && run.choose(i)),
    onResult: () => closeResult(),
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

  /**
   * Share the run: the system share sheet, else copy the line, else show it (src/ux/share.js).
   * Nothing may be awaited before shareRun: a browser lets a page write the clipboard only inside the tap.
   */
  async function share() {
    if (!lastSummary) return;
    const framed = inFrame();
    const s = shareLine(lastSummary, { origin: location.origin, pathname: location.pathname, protocol: location.protocol, framed });
    const how = await shareRun(s, { framed });
    if (how === 'copied') hud.shareDone(tr('share.copied'));
    else if (how === 'shown') hud.shareShow(s.line); // the browser refused every copy: the player copies it
  }

  // the pets layer (after the HUD, whose markup would drop its namecard strip)
  const pets = roaming ? setupPets({ stage, fx, art, hudEl: document.getElementById('hud'), getRun: () => run }) : null;

  // the spawn level (above the coins: XP is bought with them) and the keepsake (above Wave now)
  badges = createRunBadges(document.getElementById('hud'), {
    stage,
    onBuyXp: () => !paused && run.buyXp(),
    onOpen: () => select(null, { keepCard: true }), // one card at a time
  });

  // before every run but the first: pick the keepsake to bring (the game waits)
  let pickerFor = null; // 'boot' (the run already exists) | 'restart'
  const picker = kv
    ? null
    : createKeepsakePicker(document.getElementById('hud'), {
        onStart: (pick) => {
          pause.hold('picker', false);
          if (pickerFor !== 'boot') return startRun(pick);
          if (pick === run.keepsake) return; // the run already brings it
          // the untouched boot run, again with this keepsake: the same run count, and the goal again
          startRun(pick, { count: false });
          tutorial.note(returnGoal(bestWave));
        },
      });
  function openPicker(why) {
    pickerFor = why;
    bossIntro.hide();
    pause.show('closed');
    if (why === 'restart') hud.hideGameOver();
    const fresh = unseenKeepsakes(meta).map((k) => k.id);
    picker.open({ bestTier: meta.bestTier, pick: meta.keepsake, fresh });
    pause.hold('picker', true);
    if (fresh.length) {
      meta.seen = [...meta.seen, ...fresh];
      saveMeta(meta);
    }
  }

  // tap a block: a card says what it does (attack, numbers, effects, what it becomes next)
  const inspect = createInspect(document.getElementById('hud'), {
    stage,
    art,
    onClose: () => select(null),
    onDiscard: (id) => run.discard(id).ok && select(null), // sell a turret / break a dormant block
    onArm: (id, on) => blocks.arm(id, on), // the tile's brackets turn red and dashed while the tap is armed
  });
  // a boss wave's intro card: the boss's portrait over the field for a moment (T6)
  const bossIntro = createBossIntro(document.getElementById('hud'), { stage });

  /** New run: the keepsake picker first (every run after the first), then the run. */
  function restart() {
    if (picker && pickerDue()) return openPicker('restart');
    startRun(meta.keepsake);
  }

  function startRun(keepsake = meta.keepsake, opts = {}) {
    pause.show('closed');
    clearTimeout(overTimer); // a card still on its way from the last run must not cover this one
    clearSaved(); // the old run is over; this one saves itself from its first input
    pauseTitle = tr('pause.title');
    stats = freshStats();
    resetSpeed();
    hud.clearBanners();
    results.length = 0; // the skills a fusion of the old run gained: not this run's news
    closeResult();
    run = newRun(keepsake, opts);
    journey.onRunStart();
    blocks.reset();
    foes.reset();
    shots.reset();
    attacks.reset();
    fx.reset();
    skillFx.reset();
    kv?.reset();
    pets?.reset();
    bossIntro.hide();
    hud.hideGameOver();
    gameOverShown = false;
    select(null);
    if (!kv && !v2demo) tutorial.start(run);
    // after a loss, the retry opens with one lesson from how that run ended
    if (!kv && lastLoss) tutorial.note(lossHint(lastLoss), 'board');
    lastLoss = null;
  }

  /** Pick a block (null: none); `keepCard` keeps the level / keepsake card open (one card at a time). */
  function select(id, { keepCard = false } = {}) {
    selected = id;
    blocks.select(id);
    (pets ?? kv)?.roam.highlight(id); // a den's pet out on the field wears the pick's brackets too
    if (!keepCard) badges?.close();
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
    if (paused) return false;
    if (!run.move(dir)) {
      if (boardRefused(run)) blocks.nudge(dir); // the board refused it: every plaque bumps that way and back
      return false;
    }
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
    onReplay: () => startRun(STARTER_KEEPSAKE, { remember: false }), // the tutorial teaches Iron Fist; the player's pick stays
    onLog: (kind, data) => journey.onCoach(kind, data),
    onShow: () => select(null), // a new tip closes an open block card, which would cover it
  });

  // Pause (src/ux/pause.js): the menu and its pages, and a phone held sideways.
  let pauseTitle = tr('pause.title'); // 'Welcome back' after a resume
  const pause = createPause({
    onChange: (s) => {
      paused = s.paused;
      hudEl.classList.toggle('paused', paused); // banners stop with the game
      if (s.menu === 'main') syncSettings();
      if (s.menu === 'closed') pauseTitle = tr('pause.title');
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
    if (v2demo) return; // the cards' check page stays as it is (a hidden preview pane hides it often)
    if (!run.over && pause.menu === 'closed' && !picker?.isOpen) openMenu(); // the keepsake picker already holds the game
  });
  addEventListener('pagehide', () => saveNow());
  // portrait only: a phone turned sideways shows "Turn your phone upright" (hud.css) and the game waits
  const sideways = matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)');
  pause.hold('rotate', sideways.matches);
  sideways.addEventListener('change', (e) => {
    pause.hold('rotate', e.matches);
    // upright again: the game waits for Resume, not the turn; an open menu stays on its page
    if (!e.matches && !run.over && pause.menu === 'closed' && !picker?.isOpen) openMenu();
  });
  if (!kv && !v2demo) tutorial.start(run, { at: resumed ? relang?.step : null });
  else tutorial.setMuted(true); // the showcase and the cards' check page have no tips
  if (v2demo) run.setHold(true); // (muting the tips lets the countdown go: the cards' page waits for Wave now)
  // a returning player (opening done) gets a goal: their best wave; a resumed run, the pause menu;
  // after a language switch, Settings again
  if (resumed && relang) {
    pause.show('settings');
    // a keyboard player is back on the row they were on; after a tap, no focus at all (the page has
    // seen no input since it loaded, so a focused button would show its focus ring)
    if (relang.keyboard) hudEl.querySelector('[data-act="set-lang"]')?.focus({ preventScroll: true });
    else document.activeElement?.blur?.();
  } else if (resumed) {
    pauseTitle = tr('pause.welcome');
    openMenu();
  } else if (!kv && !v2demo && !tutorial.active) {
    // a player who learned the game before keepsakes existed: name the one they bring
    if (firstRun) tutorial.note(tr('note.keepsakes'), 'keepsake');
    tutorial.note(returnGoal(bestWave));
  }
  // a returning player picks a keepsake before the first swipe (the run waits)
  if (!resumed && picker && !firstRun && !v2demo && pickerDue()) openPicker('boot'); // (the cards' check page brings none)

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
    choose: (i) => (demoChoice ? i < demoChoice.offers.length && pickDemo(i) : !paused && i < (run.pendingChoice?.offers.length ?? 0) && run.choose(i)), // a key beyond the cards does nothing
    nextWave: () => !paused && !run.pendingChoice && run.nextWave(),
    pause: () => (picker?.isOpen ? null : pause.menu === 'closed' ? openMenu() : pause.back()), // Escape / P: one step back (the keepsake picker already holds the game)
  });
  // swipes on the HUD area outside buttons should also work
  document.getElementById('hud').style.pointerEvents = 'none';

  const client = (x, y) => stage.toClient(x, y);

  // --- v2: the skill a new fusion gained (a card the game waits behind), the buff banner, the demo ---
  /**
   * A fusion was made: its skill card comes at once, before a choice queued behind it (the card is about
   * the pick just made; the choice waits under it). The bot plays on without it.
   */
  function queueResult(tile, e) {
    const cls = tile?.cls?.fusion ? tile.cls : null;
    if (!cls || auto.on || kv) return;
    results.push({ cls: { element: cls.element, fusion: cls.fusion }, tier: tile.tier ?? e.tier });
  }
  function nextResult() {
    if (resultOn || !results.length || demoChoice || gameOverShown) return;
    openResult(results.shift());
  }
  function openResult(r) {
    resultOn = r;
    hud.showResult(r.cls, { tier: r.tier });
    pause.hold('result', true); // the game waits while the player reads it
  }
  function closeResult() {
    if (!resultOn) return;
    resultOn = null;
    hud.showResult(null);
    pause.hold('result', false);
  }
  /** A single pet's element fed into a fusion, or a fusion kept: "Novakit +Fire: +20% damage". */
  function showBuffed(e) {
    const t = run.tiles.find((x) => x.id === e.tileId);
    const pet = t?.cls?.fusion ? petName(t.cls.element, t.cls.fusion) : '';
    const b = buffBanner(e.gain ?? {}, pet);
    hud.banner(b.title, b.sub, 'good');
    const first = Object.keys(e.gain ?? {})[0];
    const at = e.x != null ? e : t; // the block's place (the event's, else the block's own)
    if (first && at) {
      fx.ring(at.x, at.y, hex(ELEMENTS[first].color), 0.4, 2, 0.4);
      const p = client(at.x, at.y + 1);
      popup(p.x, p.y, b.gains, 3, ELEMENTS[first].color);
    }
    sfx.choose(1);
  }
  /** ?v2demo, and window.__mb.card(kind): open a card with mock data. */
  function openDemo(kind) {
    select(null);
    if (kind === 'result') {
      closeResult();
      demoChoice = null;
      return openResult({ cls: { element: 'fire', fusion: 'ice' }, tier: 5 }); // over any choice the sim has open
    }
    if (kind === 'buffed') {
      const t = demoTiles?.fusion ?? run.tiles.find((x) => x.cls?.fusion);
      return showBuffed({ type: 'buffed', tileId: t?.id, gain: { fire: 1 }, buffs: { ...(t?.cls?.buffs ?? {}), fire: 1 }, x: t?.x, y: t?.y, tier: t?.tier });
    }
    closeResult();
    demoChoice = mockChoice(kind); // two offers whatever the deck has grown to (its fusions show with the run's deck)
  }
  /** A mock choice picked: it closes; a fusion's shows its skill gained, with the main element picked. */
  function pickDemo(i) {
    const c = demoChoice;
    demoChoice = null;
    if (c?.kind === 'fusion') {
      const o = c.offers[Math.max(0, Math.min(c.offers.length - 1, i))];
      results.unshift({ cls: { element: o.element, fusion: o.fusion }, tier: c.tier });
    }
  }
  if (v2demo) createDemoPanel(hudEl, { open: openDemo });

  function handleEvents() {
    for (const e of run.drainEvents()) {
      tally(e);
      journey.onRunEvent(e);
      tutorial.onEvent(e);
      blocks.onEvent(e);
      kv?.onEvent(e);
      pets?.onEvent(e);
      skillFx.onEvent(e); // v2: skillFx events and the summons' moments (src/render/skillfx.js)
      switch (e.type) {
        case 'merge': {
          fx.burst(e.x, e.y, [0xffffff, 0xffe27a], 10 + e.tier * 2, { speed: 4, size: 0.24, life: 0.45, gravity: 0 });
          fx.ring(e.x, e.y, 0xffffff, 0.6, 1.6, 0.3);
          stage.shake(1 + e.tier * 0.4 + (e.combo > 1 ? 2 : 0));
          sfx.merge(e.tier, e.combo);
          haptics.play('merge');
          const p = client(e.x, e.y + 0.9);
          popup(p.x, p.y, `+${num(e.value)}`, e.tier);
          if (e.combo >= 2 && fx.flashAll((TEXT.peak * TEXT.comboPx) / stage.view.U ** 2, TEXT.life)) hud.combo(e.combo);
          break;
        }
        case 'milestone':
          milestone(e.tier);
          sfx.milestone();
          stage.shake(10);
          break;
        case 'coins': {
          if (e.reason === 'kill') {
            fx.number(e.x, e.y + 0.5, e.amount, { color: 0xffd34a, small: true, prefix: '+' });
            fx.coinDrop(e.x, e.y, Math.min(6, 1 + Math.floor(e.amount / 12)), coinTarget, coinPulse);
          } else if (e.reason === 'combo') {
            const p = client(e.x, e.y + 1.2);
            popup(p.x, p.y, tr('pop.freeSwipe'), 6, '#ffd34a');
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
            popup(p.x, p.y, tr('pop.sold', { n: e.amount }), 4, '#ffd34a');
            sfx.coin();
          } else {
            fx.burst(e.x, e.y, [0xc9b08a, 0x8a7462, 0xffffff], 22, { speed: 5, size: 0.26, life: 0.5, gravity: -9 });
            stage.shake(4);
            popup(p.x, p.y, tr('pop.broken', { n: -e.amount }), 3, '#ef6060');
            sfx.deny();
          }
          break;
        }
        case 'noCoins': {
          hud.coinDeny();
          sfx.deny();
          haptics.play('deny');
          const c = hud.coinTarget();
          popup(c.x + 60, c.y - 28, tr('pop.need', { n: e.cost }), 2, '#ef6060');
          break;
        }
        case 'promote': {
          // a boss x2 (or several) on this block
          fx.burst(e.x, e.y, [0xffe27a, 0xffffff], 30, { speed: 5, size: 0.3, life: 0.6, gravity: 0 });
          fx.ring(e.x, e.y, 0xffe27a, 0.6, 2.4, 0.5);
          const p = client(e.x, e.y + 1.2);
          popup(p.x, p.y, `x${2 ** (e.by ?? 1)}`, e.tier, '#ffe27a');
          break;
        }
        case 'bossReward':
          sfx.milestone();
          haptics.play('boss');
          hud.banner(
            tr('ban.bossDown', { name: e.boss ?? tr('ban.boss') }),
            e.x2s ? `${tr('ban.bossX2s', { n: e.x2s })}${e.pairs > 0 ? ` ${tr('ban.mergePairs')}` : ''}` : tr('ban.noRoom'),
            'good',
          );
          if (maxSpeed < 4) {
            maxSpeed = 4;
            try {
              localStorage.setItem(X4_KEY, '1');
            } catch {}
            hud.banner(tr('ban.x4'), tr('ban.x4.sub'), 'good');
          }
          break;
        case 'classed': {
          // an egg hatched, a fusion was made or a pet turned pure: announce the combination
          const color = hex(ELEMENTS[e.element].color);
          fx.ring(e.x, e.y, color, 0.8, 3, 0.6);
          fx.burst(e.x, e.y, e.info.colors.map(hex), 34, { speed: 5, size: 0.3, life: 0.6, gravity: 0 });
          hud.announce(e.info);
          sfx.choose(e.stage);
          if (e.stage >= 2) stage.shake(4 + e.stage * 2);
          // a fusion made (its main element picked, or no pick): the skill it gained, in full
          if (e.stage === 2) queueResult(run.tiles.find((t) => t.id === e.tileId) ?? null, e);
          break;
        }
        case 'egg': {
          // a new elemental egg (docs/v2/SPEC.md section 2): a light cue in its element's colour
          const c = hex(ELEMENTS[e.element]?.color ?? '#fffaf2');
          fx.ring(e.x, e.y, c, 0.3, 1.5, 0.35);
          fx.burst(e.x, e.y, [c, 0xffffff], 8, { speed: 2, size: 0.18, life: 0.4, gravity: -2 });
          break;
        }
        case 'buffed':
          showBuffed(e);
          break;
        case 'petOut': {
          // v2: a fusion's pet goes out to the front with its skill (docs/v2/SPEC.md section 5; the board
          // draws its hop, its namecard plays the cut-in)
          const t = run.tiles.find((x) => x.id === e.tileId);
          const c = t?.cls?.fusion ? hex(FUSIONS[fusionKey(t.cls.element, t.cls.fusion)].color) : 0xffe27a;
          fx.ring(e.x, e.y, c, 0.5, 2.6, 0.45);
          sfx.choose(2);
          haptics.play('merge');
          break;
        }
        case 'petHome': {
          // the pet is home again: a soft ring on its tile (none when its tile left the board meanwhile)
          const t = !e.gone && run.tiles.find((x) => x.id === e.tileId);
          if (t) fx.ring(t.x, t.y, 0xfffaf2, 0.3, 1.4, 0.3);
          break;
        }
        case 'override': {
          // the sliding block's colour wins: show who took over
          const p = client(e.x, e.y + 1.6);
          popup(p.x, p.y, tr('pop.over', { a: ELEMENTS[e.winner].name, b: ELEMENTS[e.loser].name }), 3, ELEMENTS[e.winner].color);
          break;
        }
        case 'resist': {
          // a boss got used to pushback (DEFENSE.bossPushResist, steps I–III): say so over its head
          const p = client(e.x, e.y + 1.6);
          popup(p.x, p.y, tr('pop.resists', { name: e.name }), 3, '#4f6b86');
          fx.ring(e.x, e.y + 0.4, 0xdfe8f2, 0.35, 1.6, 0.35);
          break;
        }
        case 'levelUp': {
          // the spawn level rose (src/sim/levels.js): the disc pops; the ribbon says the new odds
          badges.levelUp();
          sfx.choose(1);
          hud.banner(tr('ban.level', { n: e.level }), tr('ban.level.sub', { odds: e.odds.map((o) => `${o.value} ${o.pct}%`).join(' · ') }), 'good');
          break;
        }
        case 'no2':
          hud.banner(tr('ban.no2s'), tr('ban.no2s.sub'), 'good');
          break;
        case 'buyXp': {
          sfx.coin();
          const c = badges.center('level');
          popup(c.x + 26, c.y - 26, tr('pop.xp', { n: e.xp }), 3, '#ffcf4a');
          break;
        }
        case 'punch': {
          // Iron Fist: the block that slid in lands a punch (sparks thrown the way it moved)
          const toward = { up: Math.PI / 2, down: -Math.PI / 2, left: Math.PI, right: 0 }[e.dir] ?? 0;
          fx.burst(e.x, e.y + 0.3, [0xffffff, 0xc9d3e6, 0xffd34a], 12, { speed: 6, size: 0.26, life: 0.35, gravity: 0, spread: 1.6, dir: toward });
          fx.ring(e.x, e.y + 0.3, 0xffffff, 0.3, 1.2, 0.25);
          fx.number(e.x, e.y + 0.6, Math.round(e.amount), { color: 0xffd34a, crit: true });
          stage.shake(2 + Math.min(4, e.tier * 0.4));
          sfx.land(Math.min(1, 0.4 + e.tier * 0.06));
          haptics.play('merge');
          badges.pulseKeepsake();
          break;
        }
        case 'stomp':
          // Quake Boots: the board shakes and every monster on it is stunned
          fx.ring(0, GRID_TOP / 2, 0xc9a582, 1, 6, 0.45);
          stage.shake(6);
          sfx.land(1);
          badges.pulseKeepsake();
          break;
        case 'phoenix':
          // Phoenix Feather: the last block rises and blasts the board clear
          fx.ring(e.x, e.y, 0xff8a3d, 0.6, 7, 0.6);
          fx.burst(e.x, e.y, [0xff8a3d, 0xffd36b, 0xffffff], 40, { speed: 7, size: 0.32, life: 0.7, gravity: 0 });
          stage.shake(10);
          sfx.milestone();
          hud.banner(tr('ban.phoenix'), tr('ban.phoenix.sub'), 'good');
          badges.pulseKeepsake();
          break;
        case 'dieGained':
          hud.banner(tr('ban.newDie', { name: e.offer.name }), tr('ban.newDie.sub'), 'good');
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
            fx.explode(e.x, e.y, 'earth', 2.6);
            fx.burst(e.x, e.y, [0x2a1c22, 0xff6b6b, hex(ELEMENTS[e.cls?.element]?.color ?? '#d9d2c5')], 26, { speed: 6, size: 0.3, life: 0.6, gravity: -9 });
            stage.shake(10);
            sfx.hurt();
            haptics.play('lost');
            hud.castleHit(inDanger() && stage.takeFlash()); // the edge pulse shows only in danger; then it takes the one-a-second flash budget
            const p = client(e.x, e.y + 0.9);
            popup(p.x, p.y, tr('pop.lost'), 4, '#ef6060');
          }
          break;
        case 'tilesRestored':
          for (const t of run.tiles) fx.burst(t.x, t.y, [0x9dff9d, 0xffffff], 4, { speed: 1.5, size: 0.16, life: 0.4, gravity: -3 });
          break;
        case 'locked':
          hud.banner(tr('ban.locked'), tr('ban.locked.sub'), 'boss');
          break;
        case 'waveStart':
          sfx.battle(!!e.boss);
          if (e.boss) resetSpeed(); // a boss is worth watching at full detail
          if (e.boss) {
            hud.banner(tr('ban.bossComes', { name: ENEMY_TYPES[e.boss].name }), ENEMY_TYPES[e.boss].intro, 'boss');
            bossIntro.show(e.boss); // the boss's portrait over the field (the ribbon speaks it)
          } else hud.banner(tr('ban.wave', { n: e.wave }), tr('ban.wave.sub', { chapter: e.chapter, foes: tr('meter.foes', { n: e.count }) }));
          break;
        case 'waveClear':
          clearBonus = e.bonus;
          break;
        case 'waveIncoming':
          hud.banner(
            tr('ban.cleared', { n: e.wave - 1, bonus: clearBonus }),
            e.boss ? tr('ban.bossNext', { name: ENEMY_TYPES[e.boss].name }) : tr('ban.next', { foes: tr('meter.foes', { n: e.count }), lanes: tr('unit.lanes', { n: e.lanes.length }) }),
            e.boss ? 'boss' : 'good',
          );
          break;
        case 'fire':
          break;
        case 'hit': {
          const big = e.crit && e.amount > 0;
          fx.number(e.x, e.y + 0.35, e.amount, { color: big ? hex(e.colors.at(-1)) : 0xffffff, crit: false });
          attacks.onEvent(e); // where the area attacks' thorns and tendrils go
          break;
        }
        case 'impact':
          if (!e.area) shots.impact(e); // area attacks draw their own shape below
          if (e.kind === 'zap') sfx.kill(false);
          break;
        // --- the basic attacks' shapes and the statuses (src/render/attacks.js; the sim already applied the hits) ---
        case 'breath':
        case 'gust':
        case 'pulse':
        case 'quake':
        case 'pounce':
        case 'ping':
        case 'pushed':
        case 'stun':
        case 'weaken':
        case 'bite':
        case 'freeze':
        case 'strike':
        case 'spread':
          attacks.onEvent(e);
          break;
        case 'kill':
          attacks.kill(e);
          sfx.kill(e.boss);
          if (e.boss) stage.shake(14); // the banner comes with the reward ('bossReward')
          break;
        case 'meteor':
          attacks.meteor(e, () => stage.shake(10));
          break;
        case 'signature': {
          const tint = SIGNATURE_TINT[e.effect];
          if (tint) stage.flash(tint); // photosafe: a soft wash, one a second at most (src/ux/photosafe.js)
          fx.ring(e.x, e.y, hex(e.colors.at(-1)), 0.8, 3.2, 0.5);
          const p = client(e.x, e.y + 1.3);
          popup(p.x, p.y, e.name, 12, e.colors.at(-1));
          break;
        }
        case 'heal':
          fx.ring(e.x, e.y, 0x9dff9d, 0.3, e.radius * 2, 0.6);
          break;
        case 'summon':
          fx.burst(e.x, e.y, [0xc04848, 0xffd36b], 20, { speed: 4, size: 0.24, life: 0.5, gravity: 0 }); // a foe splits into its minions
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
          bossIntro.hide(); // the game-over card comes next
          const isBest = e.score > best;
          if (isBest) {
            best = e.score;
            saveBest(best);
          }
          const isBestWave = e.wave > bestWave;
          if (isBestWave) saveBestWave((bestWave = e.wave));
          lastSummary = { wave: e.wave, score: e.score };
          clearSaved(); // nothing to resume
          const summary = { kills: e.kills, time: run.time, ...stats, keepsakes: runUnlocks.map((k) => k.name) };
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
    if (picker?.isOpen && pickerFor === 'boot') return; // an untouched run waiting for its keepsake: a reload picks again
    saveRun(run, runLog);
    savedInputs = runLog.inputs.length;
    saveWait = 1;
  }

  let acc = 0;
  /** One frame. `force` steps even while paused (the __mb.advance dev helper). */
  function update(dt, force = false) {
    const live = force || !paused; // paused: the menu, How to play, a sideways phone
    acc = live ? acc + dt * speed * tutorial.slowmo : 0; // the first punch is taught in slow motion
    const t0 = run.time;
    let n = 0;
    while (acc >= PHYSICS.dt && n < 8 * speed) {
      run.step();
      acc -= PHYSICS.dt;
      n += 1;
    }
    handleEvents();
    if (runLog && runLog.inputs.length !== savedInputs && (saveWait -= dt) <= 0) saveNow();
    // a new biggest block ever: the record rises, and may unlock a keepsake (for the next run)
    if (canSave && run.maxTier > meta.bestTier) {
      for (const k of recordBest(meta, run.maxTier)) {
        runUnlocks.push(k);
        hud.banner(tr('ban.ksUnlocked', { name: k.name }), tr('ban.ksUnlocked.sub', { short: k.short }), 'good');
        sfx.milestone();
      }
      saveMeta(meta);
    }

    hud.setScore(run.score, Math.max(best, run.score));
    hud.setNext(Math.max(1, run.maxTier));
    hud.setStatus({
      wave: run.waveNo,
      chapter: run.wave.chapter, // its key picks the skin; its name is the lintel's
      phase: run.phase,
      timer: run.timer,
      holding: run.holding,
      left: run.left,
      blocks: run.blocks,
      boss: run.wave.boss,
      bestWave,
      total: run.wave.count, // the foes meter's full mark
      bossHp: bossHealth(run.enemies), // the lintel's boss bar
    });
    hud.setEconomy(run.coins, run.swipeCost, run.swipes); // the swipes count drives the price step tick
    // a choice waits while the skill a fusion gained is on screen; then the next skill card, if any
    hud.setChoice(gameOverShown || resultOn ? null : (demoChoice ?? run.pendingChoice), { deck: run.owned });
    nextResult();
    badges.update({
      level: run.level,
      xp: run.xp,
      need: run.xpNeed,
      cap: run.levelCap,
      spawnLevel: run.spawnLevel,
      maxTier: run.maxTier,
      no2: run.no2,
      keepsake: run.keepsake,
      phoenixReady: run.phoenixReady,
      coins: run.coins,
      price: run.buyXpPrice,
      bestTier: meta.bestTier,
      levelsOn: run.levelsOn,
      hidden: !!kv,
      blocked: paused || !!run.pendingChoice || !!demoChoice || gameOverShown,
    });
    if (!picker?.isOpen) tutorial.update(live ? dt : 0); // no tip opens behind the keepsake picker
    hud.update(live && !run.pendingChoice ? dt : 0); // banners wait behind a die card, too
    bossIntro.update(live && !run.pendingChoice ? dt : 0); // and so does the boss's card
    if (live && !gameOverShown) auto.tick(run, dt, doSwipe);
    hud.setDanger(inDanger() ? 0.5 : 0);

    // a picked block shows its range (and its inspect card); a die card or a lost block puts it down
    const picked = selected != null && run.tiles.find((t) => t.id === selected);
    if (selected != null && (!picked || run.pendingChoice || demoChoice)) select(null);
    scenery.showRange(picked ? { x: picked.x, y: picked.y, shoot: profileFor(picked).shoot } : null);
    // no card in the guided opening (its Break would undo the first lesson's 8s)
    const skill = picked && run.skillCharge ? { charge: run.skillCharge(picked.id), ready: !!run.skillReady?.(picked.id) } : null; // a fusion's summon line (v2)
    inspect.show(picked && !run.pendingChoice && !gameOverShown && !pause.paused && !tutorial.active ? picked : null, picked ? { price: run.discardPrice(picked.id), coins: run.coins, last: run.tiles.length <= 1, tiles: run.tiles, skill } : {}, dt, { kept: !!picked });

    const perLane = [0, 0, 0, 0];
    for (const e of run.enemies) if (!e.dead && !e.gone) perLane[e.lane] += 1;
    scenery.update(dt, { lanes: run.wave.lanes, bossLane: run.wave.bossLane, phase: run.phase, perLane, run }); // run: chapter skin, gate chips, deck slot
    kv?.update(run, dt);
    pets?.update(run, dt, Math.max(0, run.time - t0)); // skills charge on sim time
    blocks.sync(run, dt);
    deck.sync(run, dt);
    skillFx.update(run, dt); // the skills' standing pieces: zones, walls, traps, minions, tethers (U2)
    foes.sync(run.enemies, dt);
    shots.sync(run.shots, dt, run.defense.puddles);
    attacks.update(dt); // and the trails
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
    /** Renderer diagnostics: fps, frame-time p50/p95, scene counts, texture MB (?dev shows them). */
    diag: () => diag.read(),
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
    /** The keepsake record (src/ux/meta.js) and the run-start picker. */
    meta,
    /** The game's speed under a slow-motion tip (1 = normal): the first Iron Fist punch. */
    get slowmo() {
      return tutorial.slowmo;
    },
    openPicker: () => picker && openPicker('restart'),
    /** Open a v2 card with mock data: 'die' | 'fusion' | 'keep' | 'result' | 'buffed' (src/ui/v2demo.js). */
    card: (kind) => openDemo(kind),
    coins: (n) => run.addCoins(n),
    /** The full-screen wash on screen now (0 = none): photosafe checks. */
    get wash() {
      return stage.washLevel;
    },
    select,
    cell: (col, row) => ({ x: cellX(col), y: cellY(row) }),
  };
}

start().catch(bootFail);
