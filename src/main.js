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
import { createInspect } from './ui/inspect.js';
import { createAutoplay } from './autoplay.js';
import { createInput } from './input.js';
import { createSfx } from './sfx.js';
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

// ?seed=123 replays a run; ?debug starts with a 16, a 256 and a 4096 to try every class stage.
const params = new URLSearchParams(location.search);
const seedParam = params.has('seed') ? Number(params.get('seed')) >>> 0 : undefined;
const debugStart = params.has('debug');
// The game draws its pets with the sticker art (Gemini sprites from tools/pipeline.mjs when
// generated): creatures on tiles, roaming fusions, namecards. ?style=classic brings back the
// plain blocks. ?kv: the key-visual demo (preset board, style switcher; see src/kv/index.js)
const kvMode = params.has('kv') || window.__KV__ === true; // the packed 2048-siege-kv.html sets __KV__
const hex = (c) => parseInt(String(c).replace('#', ''), 16);

async function waitForFonts() {
  if (!document.fonts?.load) return;
  const t = new Promise((r) => setTimeout(r, 1500));
  await Promise.race([Promise.all([document.fonts.load('800 64px "Baloo 2"'), document.fonts.load('700 16px "Nunito"')]), t]);
}

async function start() {
  await waitForFonts(); // block numbers and damage digits are drawn with Baloo 2
  await loadGeneratedAssets(); // Gemini sprites, if tools/gen-assets.mjs has produced them

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
  const kv = kvMode ? setupKv({ stage, fx, blocks, art, hudEl: document.getElementById('hud'), getRun: () => run, params }) : null;
  const pets = !kvMode && art ? setupPets({ stage, fx, art, hudEl: document.getElementById('hud'), getRun: () => run }) : null;

  let best = loadBest();
  let run = newRun();
  let gameOverShown = false;
  let hasMoved = false;
  let hintDone = false;
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
    return r;
  }

  const hud = createHud(document.getElementById('hud'), {
    onRestart: restart,
    onToggleMute: () => sfx.toggle(),
    onNextWave: () => run.nextWave(),
    onAuto: () => {
      // autoplay: the bot plays; the tutorial steps aside while it does
      const on = auto.toggle();
      tutorial.setMuted(on);
      if (on) run.setHold(false);
      return on;
    },
    onChoose: (i) => run.choose(i),
    muted: sfx.muted,
  });

  // tap a block: a card says what it does (attack, numbers, effects, what it becomes next)
  const inspect = createInspect(document.getElementById('hud'), {
    stage,
    art,
    onClose: () => select(null),
    onDiscard: (id) => run.discard(id).ok && select(null), // sell a turret / break a dormant block
  });

  function restart() {
    run = newRun();
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
  stage.onResize(() => {
    hudEl.style.setProperty('--field-top', `${Math.round(stage.toClient(0, FIELD.spawnY + 1.05).y)}px`);
    hudEl.style.setProperty('--board-top', `${Math.round(stage.toClient(0, GRID_TOP + 0.3).y)}px`);
  });

  const auto = createAutoplay();
  /** A swipe from the player or the autoplay bot. */
  function doSwipe(dir) {
    select(null);
    if (paused || !run.move(dir)) return false;
    tutorial.onSwipe();
    sfx.drop(2);
    return true;
  }

  // first-run guided opening, one-time tips, and the "?" How to play sheet
  let paused = false;
  const tutorial = createTutorial(hudEl, {
    stage,
    getRun: () => run,
    onPause: (v) => (paused = v),
    onReplay: () => restart(),
  });
  if (!kv) tutorial.start(run);
  else tutorial.setMuted(true); // the showcase has no tips

  createInput(stage.app.canvas, {
    swipe: (dir) => doSwipe(dir),
    // tap a block to see its range; tap it again (or anywhere else) to put it down
    tap: (cx, cy) => {
      if (run.over || run.pendingChoice) return;
      const p = stage.toWorld(cx, cy);
      const col = Math.round((p.x - cellX(0)) / GRID.cell);
      const row = Math.floor(p.y / GRID.cell);
      const tile = run.grid.at(col, row);
      if (!tile) return select(null);
      select(tile.id === selected ? null : tile.id);
    },
    choose: (i) => run.pendingChoice && run.choose(i),
    nextWave: () => run.nextWave(),
  });
  // swipes on the HUD area outside buttons should also work
  document.getElementById('hud').style.pointerEvents = 'none';

  const client = (x, y) => stage.toClient(x, y);

  function handleEvents() {
    for (const e of run.drainEvents()) {
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
          const c = hud.coinTarget();
          hud.popup(c.x + 60, c.y - 28, `Need ${e.cost}`, 2, '#ef6060');
          break;
        }
        case 'promote': {
          fx.burst(e.x, e.y, [0xffe27a, 0xffffff], 30, { speed: 5, size: 0.3, life: 0.6, gravity: 0 });
          fx.ring(e.x, e.y, 0xffe27a, 0.6, 2.4, 0.5);
          const p = client(e.x, e.y + 1.2);
          hud.popup(p.x, p.y, 'Promoted!', e.tier, '#ffe27a');
          sfx.milestone();
          break;
        }
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
            hud.castleHit();
            const p = client(e.x, e.y + 0.9);
            hud.popup(p.x, p.y, 'Block lost!', 4, '#ef6060');
          }
          break;
        case 'tilesRestored':
          for (const t of run.tiles) fx.burst(t.x, t.y, [0x9dff9d, 0xffffff], 4, { speed: 1.5, size: 0.16, life: 0.4, gravity: -3 });
          break;
        case 'locked':
          hud.banner('Board locked!', 'No swipe can move a block until one is destroyed or a boss kill promotes one.', 'boss');
          break;
        case 'waveStart':
          hintDone = true; // the swipe tip is for the opening countdown; the wave banner takes its place
          sfx.battle(!!e.boss);
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
          if (e.boss) {
            stage.shake(14);
            hud.banner(`${def.name} defeated!`, 'Your biggest block is promoted.', 'good');
          }
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
        case 'gameover': {
          const isBest = e.score > best;
          if (isBest) {
            best = e.score;
            saveBest(best);
          }
          sfx.gameover();
          setTimeout(() => hud.showGameOver({ score: e.score, wave: e.wave, maxTier: e.maxTier, isBest }), 700);
          gameOverShown = true;
          select(null);
          break;
        }
      }
    }
  }

  let acc = 0;
  function update(dt) {
    acc = paused ? 0 : acc + dt; // How to play pauses the game
    let n = 0;
    while (acc >= PHYSICS.dt && n < 8) {
      run.step();
      acc -= PHYSICS.dt;
      n += 1;
    }
    handleEvents();

    hud.setScore(run.score, Math.max(best, run.score));
    hud.setNext(Math.max(1, run.maxTier));
    hud.setStatus({
      wave: run.waveNo,
      chapter: run.wave.chapter.name,
      phase: run.phase,
      timer: run.timer,
      left: run.left,
      blocks: run.blocks,
      boss: run.wave.boss,
    });
    hud.setEconomy(run.coins, run.swipeCost);
    hud.setChoice(gameOverShown ? null : run.pendingChoice);
    hud.hint(false); // the tutorial teaches swiping now
    tutorial.update(paused ? 0 : dt);
    if (!paused && !gameOverShown) auto.tick(run, dt, doSwipe);
    hud.setDanger(run.blocks <= 3 && run.phase === 'wave' ? 0.5 : 0);

    // a picked block shows its range
    const picked = selected != null && run.tiles.find((t) => t.id === selected);
    if (selected != null && !picked) select(null);
    scenery.showRange(picked ? { x: picked.x, y: picked.y, shoot: profileFor(picked).shoot } : null);
    inspect.show(picked && !run.pendingChoice && !gameOverShown ? picked : null, picked ? { price: run.discardPrice(picked.id), coins: run.coins, last: run.tiles.length <= 1 } : {}, dt);

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

  stage.app.ticker.add((ticker) => update(Math.min(0.1, ticker.deltaMS / 1000)));

  // handy in the console while prototyping
  window.__mb = {
    get run() {
      return run;
    },
    restart,
    /** Step + render without the ticker (works in hidden tabs). */
    advance(seconds, fps = 60) {
      for (let i = 0; i < Math.round(seconds * fps); i++) {
        update(1 / fps);
        stage.app.render();
      }
    },
    spawn: (tier, col, row) => run.spawnDebug(tier, col, row),
    coins: (n) => run.addCoins(n),
    select,
    cell: (col, row) => ({ x: cellX(col), y: cellY(row) }),
  };
}

start();
