// Probe for T15 (bosses resist pushback, DEFENSE.bossPushResist): autoplay games on the real
// sim (the bot of src/autoplay.js, two swipes a second, Wave now when stuck) with a fixed
// starting deck, the resistance on and off. Prints how often each boss wave is cleared, how many
// pushes a boss takes, and how far into its wave it dies.
//
//   node tools/boss-push-probe.mjs                          # 48 seeds, the Wind + Earth deck
//   node tools/boss-push-probe.mjs --dice=wind,fire --seeds=96
//   node tools/boss-push-probe.mjs --dice=random            # the usual random starting deck
//   node tools/boss-push-probe.mjs --steps=50:0.25,100:0.5 --only=on   # try other steps, skip the run without
import { createRun } from '../src/sim/run.js';
import { bestDir } from '../src/autoplay.js';
import { DEFENSE, PHYSICS } from '../src/config.js';

const arg = (name, dflt) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? dflt;
const seeds = Number(arg('seeds', 48));
const minutes = Number(arg('minutes', 30));
const diceArg = arg('dice', 'wind,earth');
const dice = diceArg === 'random' ? null : diceArg.split(',');
const stepsArg = arg('steps', null);
const STEPS = stepsArg ? stepsArg.split(',').map((x) => ({ after: Number(x.split(':')[0]), resist: Number(x.split(':')[1]) })) : DEFENSE.bossPushResist;
const only = arg('only', null);

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN;
};

function play(resist) {
  DEFENSE.bossPushResist = resist ? STEPS : [];
  const reached = new Map(); // boss wave → runs that started it
  const cleared = new Map(); // boss wave → runs that cleared it
  const pushes = []; // pushes each boss took before it died
  const killAt = []; // seconds into its wave when the boss died
  const levels = [0, 0, 0, 0]; // bosses by the resistance step they reached
  const waves = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const r = createRun({ seed, autoChoose: true, roaming: true, dice });
    let t = 0;
    let next = 0;
    let waveT0 = 0;
    for (let i = 0; i < (minutes * 60) / PHYSICS.dt && !r.over; i++) {
      t += PHYSICS.dt;
      r.step();
      for (const e of r.drainEvents()) {
        if (e.type === 'waveStart') {
          waveT0 = t;
          if (e.boss) reached.set(e.wave, (reached.get(e.wave) ?? 0) + 1);
        }
        if (e.type === 'waveClear' && reached.has(e.wave)) cleared.set(e.wave, (cleared.get(e.wave) ?? 0) + 1);
        if (e.type === 'kill' && e.boss) {
          killAt.push(t - waveT0);
          pushes.push(e.enemy.pushes);
          levels[STEPS.filter((s) => e.enemy.pushes >= s.after).length] += 1;
        }
      }
      if (t >= next && !r.pendingChoice) {
        if (r.coins >= r.swipeCost) {
          const d = bestDir(r);
          if (d) r.move(d);
        }
        next = t + 0.5;
      }
      if ((r.phase === 'break' || r.phase === 'prep') && (r.coins < r.swipeCost || r.locked)) r.nextWave();
    }
    waves.push(r.waveNo);
  }
  DEFENSE.bossPushResist = STEPS;
  return { reached, cleared, pushes, killAt, levels, waves };
}

const show = (label, x) => {
  const bossWaves = [...x.reached.keys()].sort((a, b) => a - b).filter((w) => x.reached.get(w) >= 4);
  console.log(`${label}: wave reached median ${pct(x.waves, 0.5)} (quartiles ${pct(x.waves, 0.25)}–${pct(x.waves, 0.75)})`);
  console.log(`  boss waves cleared: ${bossWaves.map((w) => `w${w} ${Math.round(((x.cleared.get(w) ?? 0) / x.reached.get(w)) * 100)}% of ${x.reached.get(w)}`).join(' · ')}`);
  console.log(`  pushes per boss: median ${pct(x.pushes, 0.5)}, p90 ${pct(x.pushes, 0.9)}, max ${Math.max(0, ...x.pushes)} · bosses at steps 0/I/II/III: ${x.levels.join(' / ')}`);
  console.log(`  boss dies after: median ${pct(x.killAt, 0.5)?.toFixed(1)} s into its wave (p90 ${pct(x.killAt, 0.9)?.toFixed(1)} s)`);
};

console.log(`${seeds} games · deck ${diceArg} · resistance after ${STEPS.map((s) => `${s.after} (${s.resist * 100}%)`).join(', ')}`);
if (only !== 'on') show('resistance off', play(false));
if (only !== 'off') show('resistance on ', play(true));
