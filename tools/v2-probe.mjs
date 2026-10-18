// Balance probe for v2 (docs/v2/SPEC.md section 8): autoplay games on the real sim, the way
// tools/level-probe.mjs plays them: the bot of src/autoplay.js swipes every 0.5 s when it has the
// coins, takes the first offer of every card (autoChoose), summons every ready pet (autoCast) and
// presses Wave now when it is broke (or the board is locked) in a break. Prints the final wave
// (v1's median was 24 over 96 seeds: tools/level-probe.mjs at tag v1-backup), the share of games
// that made each block from 64 to 4096, and what the v2 rules did in a game: eggs, fusions, buffs,
// keeps, pure forms, summons. The seeds are split over worker threads.
//
//   node tools/v2-probe.mjs                                 # 96 seeds, 30 minutes of game time at most
//   node tools/v2-probe.mjs --seeds=48 --minutes=20 --workers=4
//   node tools/v2-probe.mjs --set='{"eggChance":0.3}'       # try other V2 numbers (src/config.js)
//   node tools/v2-probe.mjs --keepsake=ironFist
//   node tools/v2-probe.mjs --json                          # one line of numbers (for sweeps)
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { createRun } from '../src/sim/run.js';
import { autoCast, bestDir } from '../src/autoplay.js';
import { FUSION_HIT, PURE_SELF } from '../src/sim/skills/data.js';
import { PHYSICS, V2, tierValue } from '../src/config.js';

const SWIPE_GAP = 0.5;

/** One bot game: the final wave, the top block and what the v2 rules did. */
function play(seed, { minutes, keepsake }) {
  const r = createRun({ seed, autoChoose: true, keepsake });
  const g = { seed, eggs: 0, hatched: 0, fusions: 0, buffs: 0, keeps: 0, pures: 0, casts: 0, firstFusion: null };
  let t = 0;
  let next = 0;
  for (let i = 0; i < (minutes * 60) / PHYSICS.dt && !r.over; i++) {
    t += PHYSICS.dt;
    r.step();
    for (const e of r.drainEvents()) {
      if (e.type === 'egg') g.eggs += 1;
      else if (e.type === 'buffed') g.buffs += 1;
      else if (e.type === 'choice' && e.kind === 'keep') g.keeps += 1;
      else if (e.type === 'classed') {
        if (e.stage === 1) g.hatched += 1;
        if (e.stage === 2) {
          g.fusions += 1;
          g.firstFusion ??= r.waveNo;
        }
        if (e.stage === 3) g.pures += 1;
      }
    }
    if (t >= next && !r.pendingChoice) {
      if (r.coins >= r.swipeCost) {
        const d = bestDir(r);
        if (d) r.move(d);
      }
      next = t + SWIPE_GAP;
    }
    g.casts += autoCast(r);
    if ((r.phase === 'break' || r.phase === 'prep') && (r.coins < r.swipeCost || r.locked)) r.nextWave();
  }
  return { ...g, wave: r.waveNo, top: r.maxTier, deck: r.owned.length, level: r.level, over: r.over };
}

if (!isMainThread) {
  const { seeds, opts, set } = workerData;
  if (set) Object.assign(V2, JSON.parse(set));
  parentPort.postMessage(seeds.map((seed) => play(seed, opts)));
} else {
  const arg = (name, dflt) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
  const seeds = Number(arg('seeds', 96));
  const opts = { minutes: Number(arg('minutes', 30)), keepsake: arg('keepsake', null) };
  const workers = Math.max(1, Math.min(seeds, Number(arg('workers', availableParallelism()))));
  const json = process.argv.includes('--json');
  const set = arg('set', null);
  if (set) Object.assign(V2, JSON.parse(set));

  // seeds dealt round-robin, so every worker gets a mix of short and long games
  const chunks = Array.from({ length: workers }, (_, w) => Array.from({ length: seeds }, (_, i) => i + 1).filter((s) => s % workers === w % workers));
  const parts = await Promise.all(
    chunks.map(
      (list) =>
        new Promise((resolve, reject) => {
          const w = new Worker(new URL(import.meta.url), { workerData: { seeds: list, opts, set } });
          w.once('message', resolve);
          w.once('error', reject);
        }),
    ),
  );
  const runs = parts.flat().sort((a, b) => a.seed - b.seed);

  const quant = (xs, p) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN;
  };
  const median = (xs) => quant(xs, 0.5);
  const waves = runs.map((x) => x.wave);
  const share = (tier) => Math.round((runs.filter((x) => x.top >= tier).length / runs.length) * 100);
  const out = {
    seeds,
    eggChance: V2.eggChance,
    fusionHit: FUSION_HIT,
    pureSelf: PURE_SELF,
    wave: { median: median(waves), q1: quant(waves, 0.25), q3: quant(waves, 0.75), min: Math.min(...waves), max: Math.max(...waves), mean: Math.round((waves.reduce((a, b) => a + b, 0) / waves.length) * 10) / 10 },
    made: Object.fromEntries([6, 7, 8, 9, 10, 11, 12].map((t) => [tierValue(t), share(t)])),
    perGame: Object.fromEntries(['eggs', 'hatched', 'fusions', 'buffs', 'keeps', 'pures', 'casts', 'deck', 'level'].map((k) => [k, median(runs.map((x) => x[k]))])),
    firstFusionWave: median(runs.filter((x) => x.firstFusion != null).map((x) => x.firstFusion)),
    noFusion: Math.round((runs.filter((x) => !x.fusions).length / runs.length) * 100),
  };
  if (json) console.log(JSON.stringify(out));
  else {
    console.log(`${seeds} games · ${opts.minutes} min max · keepsake ${opts.keepsake ?? 'none'} · eggChance ${V2.eggChance} · FUSION_HIT ${FUSION_HIT} · PURE_SELF ${PURE_SELF}`);
    console.log(`final wave: median ${out.wave.median} (quartiles ${out.wave.q1}–${out.wave.q3}, min ${out.wave.min}, max ${out.wave.max}) · mean ${out.wave.mean}   (v1: median 24)`);
    console.log(`games that made: ${Object.entries(out.made).map(([v, p]) => `${v} ${p}%`).join(' · ')} · top block median ${tierValue(median(runs.map((x) => x.top)))}`);
    const pg = out.perGame;
    console.log(`per game (median): ${pg.eggs} eggs · ${pg.hatched} hatched · ${pg.fusions} fusions · ${pg.buffs} buffs fed · ${pg.keeps} keeps · ${pg.pures} pure forms · ${pg.casts} summons · deck ${pg.deck} · level ${pg.level}`);
    console.log(`first fusion: wave ${out.firstFusionWave} (median) · games without one ${out.noFusion}%`);
    if (!runs.some((x) => x.casts)) console.log('summons: none cast (the defense stub never charges); expect the numbers to move once the framework lands');
  }
}
