// What a boss kill's x2s add to the board, measured in autoplay games. It sets
// BOSS_X2_VALUE in tools/economy.mjs (the added value as a share of the top block).
//
//   node tools/boss-value.mjs            # 40 seeds, up to 20 minutes each
import { createRun } from '../src/sim/run.js';
import { bestDir } from '../src/autoplay.js';
import { PHYSICS } from '../src/config.js';

const seeds = Number(process.argv.find((a) => a.startsWith('--seeds='))?.split('=')[1] ?? 40);
const rows = [];
for (let seed = 1; seed <= seeds; seed++) {
  const r = createRun({ seed, autoChoose: true });
  let t = 0;
  let next = 0;
  for (let i = 0; i < 1200 / PHYSICS.dt && !r.over; i++) {
    t += PHYSICS.dt;
    r.step();
    let added = 0;
    let reward = null;
    for (const e of r.drainEvents()) {
      if (e.type === 'promote') added += 2 ** e.tier - 2 ** (e.tier - e.by);
      if (e.type === 'bossReward') reward = e;
    }
    if (reward) {
      const top = Math.max(...r.tiles.map((b) => 2 ** b.tier));
      rows.push({ wave: reward.wave, perTop: added / top });
    }
    // the autoplay strategy, two swipes a second; Wave now when stuck
    if (t >= next && r.coins >= r.swipeCost && !r.pendingChoice) {
      const d = bestDir(r);
      if (d) r.move(d);
      next = t + 0.5;
    }
    if ((r.phase === 'break' || r.phase === 'prep') && (r.coins < r.swipeCost || r.locked)) r.nextWave();
  }
}
const sorted = rows.map((x) => x.perTop).sort((a, b) => a - b);
console.log(`${rows.length} boss kills in ${seeds} games: added value / top block, median ${sorted[sorted.length >> 1].toFixed(2)}, mean ${(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2)}`);
