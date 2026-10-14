#!/usr/bin/env node
// Journey probe: plays the first run headless with the real sim and the real
// tutorial coach, as three kinds of player, and measures the journey: when the
// first swipe, merge, turret, wave, kill and loss happen, how much text the
// player reads first, how the tips are spaced, and how fast a retry gets back
// into play.
//
//   node tools/journey-probe.mjs                      # tuned coach, 12 seeds
//   node tools/journey-probe.mjs --profile=baseline   # the journey as it shipped
//   node tools/journey-probe.mjs --compare            # baseline vs tuned, side by side
//   node tools/journey-probe.mjs --compare --md=reports/ux/journey-metrics.md --json=reports/ux/journey-metrics.json
//
// Players (all reading and acting in game time):
//   skilled  — reads 5 words/s, swipes every 0.5 s with the autoplay strategy, presses Wave now
//   novice   — reads 3 words/s, reads every tip, swipes every 1.2 s, 45% of swipes random, waits for countdowns
//   reckless — skips the tutorial, swipes at random, then retries after the game over
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRun, swipeCostFor } from '../src/sim/run.js';
import { createRng } from '../src/sim/rng.js';
import { PHYSICS } from '../src/config.js';
import { bestDir } from '../src/autoplay.js';
import { createCoach, COACH, COACH_BASELINE, wordCount } from '../src/ux/coach.js';
import { createJourney } from '../src/ux/journey.js';
import { GAME_OVER_DELAY, gameOverWords, causeLine, lossHint } from '../src/ux/journey-tuning.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['left', 'right', 'up', 'down'];

/** What a player meets: the coach config, the sim options, the game-over card, the retry hint. */
export const PROFILES = {
  baseline: { name: 'baseline', coach: COACH_BASELINE, run: { brokeBreak: null }, overWords: gameOverWords(causeLine({ wave: 1 })), retryHint: false },
  tuned: { name: 'tuned', coach: COACH, run: {}, overWords: gameOverWords(), retryHint: true },
};

export const PERSONAS = {
  skilled: { wps: 5, react: 0.3, swipeGap: 0.5, mistake: 0.05, readsTips: false, wavesEarly: true, openingSwipes: 6, skips: false },
  novice: { wps: 3, react: 0.8, swipeGap: 1.2, mistake: 0.45, readsTips: true, wavesEarly: false, openingSwipes: 3, skips: false },
  reckless: { wps: 8, react: 0.15, swipeGap: 0.35, mistake: 1, readsTips: false, wavesEarly: true, openingSwipes: 0, skips: true },
};

/** Swipe directions that would move the board (a no-op swipe is free and wasted). */
function movingDirs(run) {
  const occ = new Map(run.tiles.map((t) => [`${t.col},${t.row}`, t.tier]));
  const at = (c, r) => occ.get(`${c},${r}`);
  const out = [];
  for (const d of DIRS) {
    const [dc, dr] = { left: [-1, 0], right: [1, 0], up: [0, 1], down: [0, -1] }[d];
    const ok = run.tiles.some((t) => {
      const c = t.col + dc;
      const r = t.row + dr;
      if (c < 0 || c > 3 || r < 0 || r > 3) return false;
      const n = at(c, r);
      return n == null || n === t.tier;
    });
    if (ok) out.push(d);
  }
  return out;
}

/**
 * One first run (plus one retry for players that lose), as `persona`, with
 * `coachConfig`. Returns the journey snapshot plus the player's own counters.
 */
export function playJourney({ seed, persona, profile = PROFILES.tuned, maxSeconds = 900, retry = true }) {
  const P = PERSONAS[persona];
  const coachConfig = profile.coach;
  const rng = createRng((seed * 2654435761) >>> 0);
  let t = 0;
  const journey = createJourney({ now: () => t });
  let run = createRun({ seed, ...profile.run });
  const store = { guided: false, seen: new Set() };
  const coach = createCoach({ getRun: () => run, store, onLog: (k, d) => journey.onCoach(k, d), config: coachConfig });
  journey.onRunStart();
  coach.start(run);

  let busyUntil = 0; // reading or reacting: no action before this time
  let nextSwipe = 0;
  let readKey = null; // the bubble already read
  let openingLeft = P.openingSwipes; // swipes to make before pressing Wave now in the opening
  let taps = 0; // required taps: guided OK / skip
  let tipTaps = 0; // optional: Got it on a tip
  let readSeconds = 0; // time spent reading bubbles and cards
  let readBeforeWave = null;
  let waited = 0; // seconds the player wanted to swipe but could not (no coins or a locked board)
  let waitedFirst5 = 0;
  let idleFirst5 = 0; // stuck during a countdown: nothing to do, nothing to watch
  let overAt = null;
  let retried = false;
  let choiceAt = null;
  const steps = Math.round(maxSeconds / PHYSICS.dt);

  const read = (text) => {
    const s = wordCount(text) / P.wps + P.react;
    readSeconds += s;
    busyUntil = t + s;
  };
  const swipe = () => {
    if (run.coins < run.swipeCost || run.over || run.pendingChoice) return false;
    const dirs = movingDirs(run);
    if (!dirs.length) return false;
    const d = rng.next() < P.mistake ? dirs[Math.floor(rng.next() * dirs.length)] : bestDir(run) ?? dirs[0];
    if (!run.move(d)) return false;
    journey.onSwipe(); // before the coach: the next bubble's words come after the swipe
    coach.onSwipe();
    nextSwipe = t + P.swipeGap * (0.8 + rng.next() * 0.4);
    return true;
  };

  for (let i = 0; i < steps; i++) {
    t += PHYSICS.dt;
    run.step();
    for (const e of run.drainEvents()) {
      journey.onRunEvent(e);
      coach.onEvent(e);
      if (e.type === 'waveStart' && e.wave === 1 && readBeforeWave == null) readBeforeWave = readSeconds;
    }
    coach.update(PHYSICS.dt);

    if (run.over) {
      if (overAt == null) overAt = t;
      if (!retry || retried) break;
      // the game-over panel appears, the player reads it and taps Play again
      if (t < overAt + GAME_OVER_DELAY + profile.overWords / P.wps + P.react) continue;
      retried = true;
      const last = { wave: run.waveNo, maxTier: run.maxTier };
      run = createRun({ seed: seed + 7777, ...profile.run });
      journey.onRunStart();
      coach.start(run);
      if (profile.retryHint) coach.note(lossHint(last), 'board');
      nextSwipe = t + P.react;
      continue;
    }
    if (retried && journey.snapshot().marks.retrySwipe) break;
    if (t < busyUntil) continue;

    // a die choice pauses the run: read the card, take the first offer
    if (run.pendingChoice) {
      if (choiceAt == null) {
        choiceAt = t;
        read('Pick a new die for your deck: each one adds an element blocks can roll at 16.');
        continue;
      }
      run.choose(0);
      choiceAt = null;
      continue;
    }

    const v = coach.view;
    if (v && v.key !== readKey) {
      // a new bubble: read it (tips only if this player reads tips)
      if (v.kind === 'guided' || P.readsTips) {
        readKey = v.key;
        if (v.kind === 'guided' && v.skip && P.skips) {
          busyUntil = t + P.react;
          coach.skipAll();
          taps += 1;
          continue;
        }
        read(v.text);
        continue;
      }
      readKey = v.key;
    }
    if (v && v.key === readKey && v.ok && (v.kind === 'guided' || P.readsTips)) {
      // read: tap Got it (unless the step finishes on a swipe this player is about to make)
      const g = coachConfig.guided.find((x) => x.id === v.id);
      if (!(v.kind === 'guided' && g?.doneOn === 'swipe' && t >= nextSwipe && run.coins >= run.swipeCost)) {
        coach.ok();
        if (v.kind === 'guided') taps += 1;
        else tipTaps += 1;
        busyUntil = t + P.react;
        continue;
      }
    }
    // the opening says to start the wave: make a few swipes first, then press Wave now
    if (v && v.kind === 'guided' && v.target === 'wave' && run.phase === 'prep') {
      if (openingLeft > 0 && t >= nextSwipe && swipe()) {
        openingLeft -= 1;
        continue;
      }
      if (openingLeft <= 0 || run.coins < run.swipeCost) {
        run.nextWave();
        busyUntil = t + P.react;
      }
      continue;
    }

    if (t < nextSwipe) continue;
    const cost = swipeCostFor(run.swipes);
    const canSwipe = run.coins >= cost && !run.locked && movingDirs(run).length > 0;
    if (canSwipe) {
      swipe();
      continue;
    }
    // stuck: no coins or a locked board
    waited += PHYSICS.dt;
    if (t <= 300) waitedFirst5 += PHYSICS.dt;
    if (t <= 300 && run.phase !== 'wave') idleFirst5 += PHYSICS.dt;
    if ((run.phase === 'prep' || run.phase === 'break') && P.wavesEarly) {
      run.nextWave();
      busyUntil = t + P.react;
    }
  }

  const snap = journey.snapshot();
  const m = snap.marks;
  return {
    seed,
    persona,
    coach: profile.name,
    firstSwipe: m.firstSwipe?.t ?? null,
    firstMerge: m.firstMerge?.t ?? null,
    firstTurret: m.firstTurret?.t ?? null,
    firstWave: m.firstWave?.t ?? null,
    firstHit: m.firstHit?.t ?? null,
    firstKill: m.firstKill?.t ?? null,
    firstLost: m.firstLost?.t ?? null,
    lossWave: m.gameOver?.wave ?? null,
    lossTime: m.gameOver?.t ?? null,
    retryToSwipe: m.retrySwipe && m.gameOver ? m.retrySwipe.t - m.gameOver.t : null,
    wordsBeforeFirstSwipe: snap.wordsBeforeFirstSwipe,
    wordsBeforeFirstWave: snap.wordsBeforeFirstWave,
    readBeforeWave,
    taps,
    tipTaps,
    tipsFirst5: snap.shows.filter((s) => s.kind === 'tip' && s.t <= 300).length,
    minTipGap: snap.minTipGap,
    waitedFirst5,
    idleFirst5,
    survived: !m.gameOver,
  };
}

// --- aggregate -------------------------------------------------------------------

const KEYS = [
  ['firstSwipe', 'Time to first swipe (s)'],
  ['wordsBeforeFirstSwipe', 'Words before first swipe'],
  ['firstMerge', 'Time to first merge (s)'],
  ['firstTurret', 'Time to first turret, 16 (s)'],
  ['wordsBeforeFirstWave', 'Words before first wave'],
  ['readBeforeWave', 'Reading time before first wave (s)'],
  ['firstWave', 'Time to first wave (s)'],
  ['firstHit', 'Time to first block hit (s)'],
  ['firstKill', 'Time to first kill (s)'],
  ['firstLost', 'Time to first block lost (s)'],
  ['tipsFirst5', 'Tips in first 5 min'],
  ['minTipGap', 'Shortest gap between tips (s)'],
  ['waitedFirst5', 'Coin-limited time in first 5 min (s)'],
  ['idleFirst5', 'Idle countdown time in first 5 min (s)'],
  ['lossWave', 'Wave of first loss'],
  ['retryToSwipe', 'Game over to next swipe (s)'],
  ['taps', 'Required tutorial taps'],
];

const quant = (xs, q) => {
  const v = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.floor(q * v.length))];
};

export function summarize(rows) {
  const out = {};
  for (const [k] of KEYS) out[k] = { p10: quant(rows.map((r) => r[k]), 0.1), med: quant(rows.map((r) => r[k]), 0.5), p90: quant(rows.map((r) => r[k]), 0.9), n: rows.filter((r) => r[k] != null).length };
  out.survived = rows.filter((r) => r.survived).length;
  out.runs = rows.length;
  return out;
}

const fmt = (x) => (x == null ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(1));

export function probe({ profiles, seeds = 12, personas = Object.keys(PERSONAS) }) {
  const result = {};
  for (const c of profiles) {
    result[c.name] = {};
    for (const p of personas) {
      const rows = [];
      for (let s = 1; s <= seeds; s++) rows.push(playJourney({ seed: s, persona: p, profile: c }));
      result[c.name][p] = { rows, sum: summarize(rows) };
    }
  }
  return result;
}

export function toMarkdown(result) {
  const coaches = Object.keys(result);
  const personas = Object.keys(result[coaches[0]]);
  const lines = [];
  for (const p of personas) {
    lines.push(`### ${p[0].toUpperCase() + p.slice(1)} player`, '');
    lines.push(`| Metric | ${coaches.map((c) => `${c} (median, p10–p90)`).join(' | ')} |`);
    lines.push(`|---|${coaches.map(() => '---').join('|')}|`);
    for (const [k, label] of KEYS) {
      const cells = coaches.map((c) => {
        const s = result[c][p].sum[k];
        return s.med == null ? '–' : `${fmt(s.med)} (${fmt(s.p10)}–${fmt(s.p90)})`;
      });
      lines.push(`| ${label} | ${cells.join(' | ')} |`);
    }
    lines.push(`| Runs that never lost (15 min cap) | ${coaches.map((c) => `${result[c][p].sum.survived} of ${result[c][p].sum.runs}`).join(' | ')} |`, '');
  }
  return lines.join('\n');
}

// --- CLI -----------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? '').split('=')[1] || d;
  const compare = process.argv.includes('--compare');
  const which = arg('profile', 'tuned');
  const profiles = compare ? [PROFILES.baseline, PROFILES.tuned] : [PROFILES[which]];
  const seeds = Number(arg('seeds', 12));
  const t0 = Date.now();
  const result = probe({ profiles, seeds });
  const md = toMarkdown(result);
  console.log(md);
  console.log(`\n${seeds} seeds × ${Object.keys(PERSONAS).length} players × ${profiles.length} profile(s) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const mdPath = arg('md', null);
  const jsonPath = arg('json', null);
  if (mdPath) {
    mkdirSync(dirname(join(root, mdPath)), { recursive: true });
    writeFileSync(join(root, mdPath), md + '\n');
  }
  if (jsonPath) {
    mkdirSync(dirname(join(root, jsonPath)), { recursive: true });
    const slim = Object.fromEntries(Object.entries(result).map(([c, ps]) => [c, Object.fromEntries(Object.entries(ps).map(([p, v]) => [p, v.sum]))]));
    writeFileSync(join(root, jsonPath), JSON.stringify(slim, null, 1));
  }
}
