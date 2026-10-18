// Autoplay: a simple bot that plays the run (the same strategy the balance
// probe uses). It swipes about twice a second when it can afford to, choosing
// the direction by a one-move lookahead: keep the big blocks stacked in the
// bottom-left corner, keep cells free, and put firepower (blocks of 16+) under
// the lanes enemies are coming down. It takes the first offer of every card (the
// default: a new element, a fusion's main element, the fusion to keep), summons each
// fusion pet whose skill is ready, and presses Wave now once it is out of coins (or
// the board is locked) during a break.

import { profileFor } from './sim/classes.js';

const N = 4;
const SWIPE_GAP = 0.42; // seconds between swipes
const PICK_DELAY = 0.9; // seconds to "read" a new-die card
const WEIGHT = [
  [6, 5, 4, 3],
  [5, 4, 3, 2],
  [4, 3, 2, 1],
  [3, 2, 1, 0],
]; // row 0 is the bottom row: the bottom-left corner is the anchor

function boardOf(tiles) {
  const b = new Array(N * N).fill(0);
  for (const t of tiles) b[t.row * N + t.col] = t.tier;
  return b;
}

function slide(b, dir) {
  const out = new Array(N * N).fill(0);
  let moved = false;
  let gain = 0;
  for (let k = 0; k < N; k++) {
    const idx = [];
    for (let j = 0; j < N; j++) idx.push(dir === 'left' ? k * N + j : dir === 'right' ? k * N + (N - 1 - j) : dir === 'down' ? j * N + k : (N - 1 - j) * N + k);
    const vals = idx.map((i) => b[i]).filter(Boolean);
    const res = [];
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] === vals[i + 1]) {
        res.push(vals[i] + 1);
        gain += 2 ** (vals[i] + 1);
        i++;
      } else res.push(vals[i]);
    }
    idx.forEach((i, j) => {
      out[i] = res[j] ?? 0;
      if (out[i] !== b[i]) moved = true;
    });
  }
  return { out, moved, gain };
}

function score(b, threat) {
  let empty = 0;
  let corner = 0;
  let cover = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const t = b[r * N + c];
      if (!t) empty += 1;
      else corner += 2 ** t * WEIGHT[r][c];
    }
  }
  for (let c = 0; c < N; c++) {
    if (!threat[c]) continue;
    let p = 0;
    for (let r = 0; r < N; r++) if (b[r * N + c] >= 4) p += 1.62 ** b[r * N + c]; // only 16+ shoot
    cover += threat[c] * Math.log(1 + p);
  }
  return empty * 2000 + corner + 4000 * cover;
}

/** The swipe the bot would make now (or null if nothing moves). */
export function bestDir(run) {
  const b = boardOf(run.tiles);
  const threat = [0, 0, 0, 0];
  for (const l of run.wave.lanes) threat[l] += 1;
  for (const e of run.enemies) if (!e.dead) threat[e.lane] += 0.5;
  let best = null;
  let bestV = -Infinity;
  for (const d of ['down', 'left', 'right', 'up']) {
    const s = slide(b, d);
    if (!s.moved) continue;
    const v = score(s.out, threat) + s.gain * 2 - (d === 'up' ? 5000 : 0);
    if (v > bestV) {
      bestV = v;
      best = d;
    }
  }
  return best;
}

/** Summon every fusion pet whose skill is ready (run.skillReady); returns how many went out. */
export function autoCast(run) {
  let n = 0;
  for (const t of run.tiles) if (profileFor(t).summon && !t.summon && run.skillReady(t.id) && run.castSkill(t.id)) n += 1;
  return n;
}

export function createAutoplay() {
  let on = false;
  let t = 0;
  return {
    get on() {
      return on;
    },
    toggle() {
      on = !on;
      t = 0;
      return on;
    },
    /** One frame of play; `swipe(dir)` performs a swipe like the player would and returns whether it moved. */
    tick(run, dt, swipe) {
      if (!on || run.over) return;
      t += dt;
      if (run.pendingChoice) {
        if (t >= PICK_DELAY) {
          run.choose(0);
          t = 0;
        }
        return;
      }
      autoCast(run);
      if (t < SWIPE_GAP) return;
      const waiting = run.phase === 'prep' || run.phase === 'break';
      if (waiting && (run.coins < run.swipeCost || run.locked)) {
        run.nextWave();
        t = 0;
        return;
      }
      if (run.coins >= run.swipeCost) {
        const d = bestDir(run);
        if (d && swipe(d)) t = 0;
      }
    },
  };
}
