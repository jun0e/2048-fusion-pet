// Balance probe for the spawn level and the keepsakes: autoplay games on the real
// sim (the bot of src/autoplay.js, two swipes a second, Wave now when stuck).
// Prints the wave reached, the top block, and when each spawn level arrives.
//
//   node tools/level-probe.mjs                     # 48 seeds, spawn levels on, no keepsake
//   node tools/level-probe.mjs --levels=off        # the classic 90/10 spawns (the old game)
//   node tools/level-probe.mjs --keepsake=ironFist --seeds=96
//   node tools/level-probe.mjs --buy               # the bot also buys XP when it can spare the coins
//   node tools/level-probe.mjs --set='{"buy":{"xp":4,"swipes":3}}'   # try other LEVELS numbers
import { createRun } from '../src/sim/run.js';
import { LEVELS } from '../src/sim/levels.js';
import { bestDir } from '../src/autoplay.js';
import { DEFENSE, PHYSICS, tierValue } from '../src/config.js';

const arg = (name, dflt) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? dflt;
const seeds = Number(arg('seeds', 48));
const minutes = Number(arg('minutes', 30));
const levels = arg('levels', 'on') !== 'off';
const keepsake = arg('keepsake', null);
const buy = process.argv.includes('--buy');
// --set='{"xpToNext":[…],"buy":{"xp":4,"swipes":3}}' tries other numbers for src/sim/levels.js LEVELS
const set = arg('set', null);
if (set) Object.assign(LEVELS, JSON.parse(set));
// --hp=1.14 tries another enemy health growth per wave (src/config.js DEFENSE.enemyHpGrowth)
const hp = arg('hp', null);
if (hp) DEFENSE.enemyHpGrowth = Number(hp);

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN;
};

const runs = [];
const levelAtWave = new Map(); // wave → levels seen at its start
for (let seed = 1; seed <= seeds; seed++) {
  const r = createRun({ seed, autoChoose: true, roaming: true, levels, keepsake });
  let t = 0;
  let next = 0;
  let merges = 0;
  let punches = 0;
  let punchDamage = 0;
  let firstLevel = {};
  for (let i = 0; i < (minutes * 60) / PHYSICS.dt && !r.over; i++) {
    t += PHYSICS.dt;
    r.step();
    for (const e of r.drainEvents()) {
      if (e.type === 'merge') merges += 1;
      if (e.type === 'punch') {
        punches += 1;
        punchDamage += e.amount ?? 0;
      }
      if (e.type === 'levelUp' && firstLevel[e.level] == null) firstLevel[e.level] = r.waveNo;
      if (e.type === 'waveStart') {
        const list = levelAtWave.get(e.wave) ?? [];
        list.push(r.level ?? 1);
        levelAtWave.set(e.wave, list);
      }
    }
    if (t >= next && !r.pendingChoice) {
      // the bot buys XP when a wave's worth of swipes is still left after it (a careful player)
      if (buy && r.buyXpPrice && r.coins >= r.buyXpPrice + 8 * r.swipeCost) r.buyXp();
      if (r.coins >= r.swipeCost) {
        const d = bestDir(r);
        if (d) r.move(d);
      }
      next = t + 0.5;
    }
    if ((r.phase === 'break' || r.phase === 'prep') && (r.coins < r.swipeCost || r.locked)) r.nextWave();
  }
  runs.push({ seed, wave: r.waveNo, top: r.maxTier, swipes: r.swipes, merges, level: r.level ?? 1, punches, punchDamage, firstLevel, over: r.over });
}

const waves = runs.map((x) => x.wave);
const tops = runs.map((x) => x.top);
console.log(`${seeds} games · levels ${levels ? 'on' : 'off'} · keepsake ${keepsake ?? 'none'}${buy ? ' · bot buys XP' : ''}${hp ? ` · enemy health ×${hp}/wave` : ''}`);
const mean = waves.reduce((a, b) => a + b, 0) / waves.length;
const reach = (w) => `${Math.round((waves.filter((x) => x >= w).length / waves.length) * 100)}%`;
console.log(`wave reached: median ${pct(waves, 0.5)} (quartiles ${pct(waves, 0.25)}–${pct(waves, 0.75)}, min ${Math.min(...waves)}, max ${Math.max(...waves)}) · mean ${mean.toFixed(1)} · reach w20 ${reach(20)} w30 ${reach(30)} w40 ${reach(40)}`);
console.log(`top block: median ${tierValue(pct(tops, 0.5))} (quartiles ${tierValue(pct(tops, 0.25))}–${tierValue(pct(tops, 0.75))})`);
const share = (tier) => runs.filter((x) => x.top >= tier).length / runs.length;
console.log(`games that made: ${[6, 7, 8, 9, 10, 11, 12].map((t) => `${tierValue(t)} ${Math.round(share(t) * 100)}%`).join(' · ')}`);
const perWave = runs.map((x) => x.merges / Math.max(1, x.wave - 1));
console.log(`merges per wave: median ${pct(perWave, 0.5).toFixed(1)} · swipes per game median ${pct(runs.map((x) => x.swipes), 0.5)}`);
if (levels) {
  console.log(`level at game end: median ${pct(runs.map((x) => x.level), 0.5)}`);
  const at = [...levelAtWave.entries()].sort((a, b) => a[0] - b[0]).filter(([w]) => w % 3 === 1 || w <= 4);
  console.log(`level at wave start (median): ${at.map(([w, l]) => `w${w} L${pct(l, 0.5)}`).join(' · ')}`);
}
if (keepsake === 'ironFist') {
  console.log(`punches per game: median ${pct(runs.map((x) => x.punches), 0.5)} · damage per game median ${Math.round(pct(runs.map((x) => x.punchDamage), 0.5))}`);
}
