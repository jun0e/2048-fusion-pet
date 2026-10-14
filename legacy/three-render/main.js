import './ui/hud.css';
import { createRun } from './sim/run.js';
import { ENEMY_TYPES } from './sim/enemies.js';
import { PHYSICS, FIELD, tierRadius } from './config.js';
import { createStage } from './render/scene.js';
import { createBoard } from './render/board.js';
import { createField } from './render/field.js';
import { createBallView } from './render/balls.js';
import { createFoeView } from './render/foes.js';
import { createShotView } from './render/shots.js';
import { createFx } from './render/fx.js';
import { createHud } from './ui/hud.js';
import { createInput } from './input.js';
import { createSfx } from './sfx.js';

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

// ?seed=123 replays a run; ?debug starts with a 16, a 256 and a 4096 to try the class system.
const params = new URLSearchParams(location.search);
const seedParam = params.has('seed') ? Number(params.get('seed')) >>> 0 : undefined;
const debugStart = params.has('debug');

async function waitForFonts() {
  if (!document.fonts?.load) return;
  const t = new Promise((r) => setTimeout(r, 1500));
  await Promise.race([Promise.all([document.fonts.load('800 64px "Baloo 2"'), document.fonts.load('700 16px "Nunito"')]), t]);
}

async function start() {
  await waitForFonts(); // number textures are drawn with Baloo 2

  const touch = matchMedia('(pointer: coarse)').matches;
  const stage = createStage(document.getElementById('app'), { touch });
  const board = createBoard(stage.scene);
  const field = createField(stage.scene);
  const balls = createBallView(stage.scene);
  const foes = createFoeView(stage.scene);
  const shots = createShotView(stage.scene);
  const fx = createFx(stage.scene);
  const sfx = createSfx();

  let best = loadBest();
  let run = newRun();
  let gameOverShown = false;
  let hasDropped = false;

  function newRun() {
    const r = createRun({ seed: seedParam });
    if (debugStart) {
      r.spawnDebug(4, -2.4, 1);
      r.spawnDebug(8, 0.6, 2);
      r.spawnDebug(12, 2.2, 4);
    }
    return r;
  }

  const hud = createHud(document.getElementById('hud'), {
    onRestart: restart,
    onToggleMute: () => sfx.toggle(),
    onFight: () => run.fightNow(),
    onChoose: (i) => run.choose(i),
    muted: sfx.muted,
  });

  function restart() {
    run = newRun();
    balls.reset();
    foes.reset();
    shots.reset();
    fx.reset();
    hud.hideGameOver();
    gameOverShown = false;
  }

  createInput(stage.renderer.domElement, stage, {
    aim: (x) => run.setAim(x),
    drop: () => run.drop(),
    nudge: (dx) => run.setAim(run.aimX + dx),
  });
  window.addEventListener('keydown', (e) => {
    if (run.pendingChoice && ['1', '2', '3'].includes(e.key)) run.choose(Number(e.key) - 1);
    else if ((e.key === 'f' || e.key === 'F') && run.phase === 'plan') run.fightNow();
  });

  const screen = (x, y) => stage.worldToScreen(x, y, 0.5);

  function handleEvents() {
    for (const e of run.drainEvents()) {
      switch (e.type) {
        case 'drop':
          sfx.drop(e.tier);
          if (!hasDropped) {
            hasDropped = true;
            hud.hint(false);
          }
          break;
        case 'land':
          sfx.land(e.impact);
          break;
        case 'merge': {
          const r = tierRadius(e.tier);
          fx.burst(e.x, e.y, e.tier, r);
          stage.addShake(0.02 + e.tier * 0.012 + (e.combo > 1 ? 0.03 : 0));
          sfx.merge(e.tier, e.combo);
          const p = screen(e.x, e.y + r * 0.6);
          hud.popup(p.x, p.y, `+${e.value.toLocaleString()}`, e.tier);
          if (e.combo >= 2) hud.combo(e.combo);
          break;
        }
        case 'milestone':
          hud.milestone(e.tier);
          sfx.milestone();
          stage.addShake(0.35);
          break;
        case 'bonusMove': {
          const p = screen(e.x, e.y + 1);
          hud.popup(p.x, p.y, '+1 drop', 6, '#c39bff');
          break;
        }
        case 'promote': {
          fx.burst(e.x, e.y, e.tier, tierRadius(e.tier));
          const p = screen(e.x, e.y + 1.4);
          hud.popup(p.x, p.y, 'Promoted!', e.tier);
          sfx.milestone();
          break;
        }
        case 'classChosen': {
          const r = tierRadius(e.tier);
          const color = e.offer.colors.at(-1);
          fx.ring(e.x, e.y, color, r, r * 2.6, 0.6);
          fx.burstColor(e.x, e.y, color, 30, r);
          const p = screen(e.x, e.y + r + 0.4);
          hud.popup(p.x, p.y, e.offer.name, e.tier, color);
          sfx.choose(e.stage);
          break;
        }
        case 'dayStart':
          hud.banner(`Day ${e.day}`, e.boss ? `Boss day: ${ENEMY_TYPES[e.boss].name}` : e.chapter, e.boss ? 'boss' : '');
          break;
        case 'battleStart':
          sfx.battle(!!e.boss);
          if (e.boss) hud.banner(`${ENEMY_TYPES[e.boss].name} approaches!`, ENEMY_TYPES[e.boss].intro, 'boss');
          break;
        case 'dayClear':
          break;
        case 'kill': {
          const def = e.enemy.def;
          fx.burstColor(e.x, e.y, def.color, e.boss ? 60 : 10, def.size);
          sfx.kill(e.boss);
          if (e.boss) {
            stage.addShake(0.4);
            hud.banner(`${def.name} defeated!`, 'Your biggest ball is promoted.', 'good');
          }
          break;
        }
        case 'leak':
          stage.addShake(e.boss ? 0.5 : 0.12);
          hud.castleHit();
          sfx.hurt();
          break;
        case 'impact':
          if (e.chain) shots.arc(e.chain, e.colors[0]);
          if (e.splash) fx.ring(e.x, e.y, e.colors.at(-1), 0.2, e.splash, 0.3);
          break;
        case 'strike':
          shots.arc([{ x: e.x + 0.3, y: FIELD.spawnY + 2 }, { x: e.x, y: e.y }], '#ffe14d', 0.25);
          break;
        case 'meteor':
          fx.ring(e.x, e.y, '#ff9a4d', 0.3, e.radius, 0.5);
          fx.burstColor(e.x, e.y, '#ff9a4d', 30, e.radius * 0.6);
          stage.addShake(0.2);
          break;
        case 'signature': {
          const tint = { globalBurn: '#ff7a3d', globalFreeze: '#7fd4ff', vortex: '#bff7e6' }[e.effect];
          if (tint) hud.flash(tint);
          const p = screen(e.x, e.y + 1.6);
          hud.popup(p.x, p.y, e.name, 12, e.colors.at(-1));
          break;
        }
        case 'heal':
          fx.ring(e.x, e.y, '#9dff9d', 0.2, e.radius, 0.5);
          break;
        case 'summon':
          fx.burstColor(e.x, e.y, '#c04848', 20, 0.8);
          break;
        case 'gameover': {
          const isBest = e.score > best;
          if (isBest) {
            best = e.score;
            saveBest(best);
          }
          sfx.gameover();
          setTimeout(() => hud.showGameOver({ score: e.score, day: e.day, maxTier: e.maxTier, reason: e.reason, isBest }), 700);
          gameOverShown = true;
          break;
        }
      }
    }
  }

  let last = performance.now();
  let acc = 0;
  let clock = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    update(dt);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    clock += dt;
    acc += dt;
    while (acc >= PHYSICS.dt) {
      run.step();
      acc -= PHYSICS.dt;
      handleEvents();
    }
    const alpha = run.pendingChoice ? 1 : acc / PHYSICS.dt;

    hud.setScore(run.score, Math.max(best, run.score));
    hud.setNext(run.next);
    hud.setStatus({
      day: run.day,
      chapter: run.wave.chapter.name,
      phase: run.phase,
      moves: run.moves,
      castle: run.castle.hp,
      castleMax: run.castle.max,
      boss: run.wave.boss,
    });
    hud.setChoice(gameOverShown ? null : run.pendingChoice);
    hud.setDanger(gameOverShown ? 0 : run.dangerLevel);
    board.setDanger(run.dangerLevel, clock);
    field.update(dt, run);
    balls.sync(run, alpha, dt);
    foes.sync(run.enemies, dt);
    shots.sync(run.shots, dt);
    fx.update(dt);
    stage.render(dt);
  }
  requestAnimationFrame(frame);

  // handy in the console while prototyping
  window.__mb = {
    get run() {
      return run;
    },
    restart,
    /** Step + render without requestAnimationFrame (works in hidden tabs). */
    advance(seconds, fps = 60) {
      for (let i = 0; i < Math.round(seconds * fps); i++) update(1 / fps);
    },
    spawn: (tier, x = 0) => run.spawnDebug(tier, x),
  };
}

start();
