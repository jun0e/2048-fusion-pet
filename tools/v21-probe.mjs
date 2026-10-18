// Balance probe for v2.1 (docs/v2/SPEC-v2.1.md): bot games on the real sim (src/autoplay.js's bot, as
// tools/v2-probe.mjs plays it), checked against the user's targets: after about 8 minutes only strong
// play survives, nobody lasts past about 12, the level road's minutes (5×5 at about 4, 6×6 at about 7,
// the top level at about 10), and no single block carrying the board. Prints the run lengths, the level
// timeline, the board growths, foes per wave, resistances and the top block's share of the firepower.
//
//   node tools/v21-probe.mjs                         # 96 seeds, 20 minutes of game time at most
//   node tools/v21-probe.mjs --seeds=48 --workers=8
//   node tools/v21-probe.mjs --set='{"ramp":{"steepK":0.25}}'   # try other V2_1 / WAVES numbers
//   node tools/v21-probe.mjs --json                  # one line of numbers (for sweeps)
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { createRun } from '../src/sim/run.js';
import { autoCast, bestDir } from '../src/autoplay.js';
import { profileFor } from '../src/sim/classes.js';
import { LEVELS } from '../src/sim/levels.js';
import { DEFENSE, PHYSICS, V2_1, WAVES, tierValue } from '../src/config.js';

const SWIPE_GAP = 0.5;
const MARKS = [2, 4, 6, 8, 9, 10, 11, 12];

/** Merge `over` into `into`, one level of nesting (the ramp's and the resistances' fields). */
function apply(into, over) {
  for (const [k, v] of Object.entries(over ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && into[k] && typeof into[k] === 'object') Object.assign(into[k], v);
    else into[k] = v;
  }
}
function applySet(set) {
  if (!set) return;
  const o = JSON.parse(set);
  apply(V2_1, o.V2_1 ?? (o.ramp ? { ramp: o.ramp } : {}));
  apply(WAVES, o.WAVES ?? {});
  if (o.xpToNext) LEVELS.xpToNext.splice(0, LEVELS.xpToNext.length, ...o.xpToNext);
  if (o.enemyHpGrowth) DEFENSE.enemyHpGrowth = o.enemyHpGrowth;
}

/** The board's firepower and its top block's share of it. */
function firepower(r) {
  const dps = [];
  for (const t of r.tiles) {
    const p = profileFor(t);
    if (!p.shoots || !(t.hp > 0)) continue;
    dps.push(p.damage * p.rate * (1 + (p.critChance ?? 0) * ((p.critMult ?? 2) - 1)));
  }
  const sum = dps.reduce((a, b) => a + b, 0);
  return { sum, topShare: sum ? Math.max(...dps) / sum : 0 };
}

function play(seed, { minutes }) {
  const r = createRun({ seed, autoChoose: true });
  const g = { seed, levelAt: {}, growAt: {}, waveAt: {}, foes: {}, resist: { foes: 0, resisting: 0 }, marks: {}, end: null, ramp: {} };
  let t = 0;
  let next = 0;
  let wave = r.waveNo;
  let mi = 0;
  for (let i = 0; i < (minutes * 60) / PHYSICS.dt && !r.over; i++) {
    t += PHYSICS.dt;
    r.step();
    if (r.waveNo !== wave) {
      wave = r.waveNo;
      g.waveAt[wave] = t / 60;
    }
    for (const e of r.drainEvents()) {
      if (e.type === 'levelUp') g.levelAt[e.level] = t / 60;
      else if (e.type === 'grow') g.growAt[e.size] = t / 60;
      else if (e.type === 'ramp') g.ramp[e.phase] = t / 60;
      else if (e.type === 'spawn' && e.enemy) {
        g.foes[r.waveNo] = (g.foes[r.waveNo] ?? 0) + 1;
        g.resist.foes += 1;
        if (e.resist) g.resist.resisting += 1;
      }
    }
    while (mi < MARKS.length && t >= MARKS[mi] * 60) {
      g.marks[MARKS[mi]] = { wave: r.waveNo, level: r.level, size: r.size, top: r.maxTier, ...firepower(r) };
      mi += 1;
    }
    if (t >= next && !r.pendingChoice) {
      if (r.coins >= r.swipeCost) {
        const d = bestDir(r);
        if (d) r.move(d);
      }
      next = t + SWIPE_GAP;
    }
    autoCast(r);
    if ((r.phase === 'break' || r.phase === 'prep') && (r.coins < r.swipeCost || r.locked)) r.nextWave();
  }
  g.end = { minute: t / 60, wave: r.waveNo, over: r.over, level: r.level, size: r.size, top: r.maxTier };
  return g;
}

if (!isMainThread) {
  applySet(workerData.set);
  parentPort.postMessage(workerData.seeds.map((s) => play(s, workerData.opts)));
} else {
  const arg = (name, d) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? d;
  const seeds = Number(arg('seeds', 96));
  const opts = { minutes: Number(arg('minutes', 20)) };
  const set = arg('set', null);
  applySet(set);
  const workers = Math.max(1, Math.min(seeds, Number(arg('workers', availableParallelism()))));
  const chunks = Array.from({ length: workers }, (_, w) => Array.from({ length: seeds }, (_, i) => i + 1).filter((s) => s % workers === w % workers));
  const runs = (
    await Promise.all(
      chunks.map(
        (list) =>
          new Promise((res, rej) => {
            const w = new Worker(new URL(import.meta.url), { workerData: { seeds: list, opts, set } });
            w.once('message', res);
            w.once('error', rej);
          }),
      ),
    )
  ).flat();
  const q = (xs, p) => {
    const s = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b);
    return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN;
  };
  const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
  const pc = (x) => (Number.isFinite(x) ? Math.round(x * 100) : null);
  const ends = runs.map((g) => g.end.minute);
  const share = (cond) => pc(runs.filter(cond).length / runs.length);
  const out = {
    seeds,
    minutes: { median: r1(q(ends, 0.5)), q1: r1(q(ends, 0.25)), q3: r1(q(ends, 0.75)), p90: r1(q(ends, 0.9)), max: r1(Math.max(...ends)) },
    deadBy: { 6: share((g) => g.end.over && g.end.minute <= 6), 8: share((g) => g.end.over && g.end.minute <= 8), 10: share((g) => g.end.over && g.end.minute <= 10), 12: share((g) => g.end.over && g.end.minute <= 12) },
    alive12: runs.filter((g) => !g.end.over || g.end.minute > 12).length,
    wave: q(runs.map((g) => g.end.wave), 0.5),
    levels: Object.fromEntries(Array.from({ length: LEVELS.max - 1 }, (_, i) => i + 2).map((l) => [l, [r1(q(runs.map((g) => g.levelAt[l]), 0.5)), pc(runs.filter((g) => g.levelAt[l] != null).length / runs.length)]])),
    grow: { 5: [r1(q(runs.map((g) => g.growAt[5]), 0.5)), share((g) => g.growAt[5] != null)], 6: [r1(q(runs.map((g) => g.growAt[6]), 0.5)), share((g) => g.growAt[6] != null)] },
    waveAt: Object.fromEntries([5, 10, 15, 20, 25, 30].map((w) => [w, [r1(q(runs.map((g) => g.waveAt[w]), 0.5)), q(runs.map((g) => g.foes[w]), 0.5) ?? null]])),
    resisting: pc(runs.reduce((a, g) => a + g.resist.resisting, 0) / Math.max(1, runs.reduce((a, g) => a + g.resist.foes, 0))),
    topShare: Object.fromEntries(MARKS.map((m) => [m, [pc(q(runs.map((g) => g.marks[m]?.topShare), 0.5)), pc(q(runs.map((g) => g.marks[m]?.topShare), 0.75)), runs.filter((g) => g.marks[m]).length]])),
  };
  if (process.argv.includes('--json')) console.log(JSON.stringify(out));
  else {
    const m = out.minutes;
    console.log(`${seeds} games, ${opts.minutes} min max`);
    console.log(`run length (min): median ${m.median} · quartiles ${m.q1}–${m.q3} · 90% by ${m.p90} · longest ${m.max}   (targets: median ≈ 8.5–9, none past 12)`);
    console.log(`dead by 6 / 8 / 10 / 12 min: ${out.deadBy[6]}% / ${out.deadBy[8]}% / ${out.deadBy[10]}% / ${out.deadBy[12]}% · alive past 12: ${out.alive12} · final wave median ${out.wave}`);
    console.log(`levels (median minute, share reached): ${Object.entries(out.levels).map(([l, [mm, p]]) => `L${l} ${mm ?? '–'}m${p < 100 ? ` (${p}%)` : ''}`).join(' · ')}`);
    console.log(`board grows: 5×5 at ${out.grow[5][0]}m (${out.grow[5][1]}%) · 6×6 at ${out.grow[6][0]}m (${out.grow[6][1]}%)   (targets ≈ 4 and 7)`);
    console.log(`waves (minute it starts · foes): ${Object.entries(out.waveAt).map(([w, [mm, f]]) => `w${w} ${mm ?? '–'}m·${f ?? '–'}`).join(' · ')}`);
    console.log(`foes resisting something: ${out.resisting}% of all foes`);
    console.log(`top block's share of the firepower (median, q3; games alive): ${Object.entries(out.topShare).map(([mm, [a, b, n]]) => `${mm}m ${a ?? '–'}%/${b ?? '–'}% (${n})`).join(' · ')}`);
  }
}
