// Economy projection: what the coin rules give a player, wave by wave, how
// many coins pile up unspent, and how strong the board that buys is against each wave.
//
//   npm run economy                          # current config, 30 waves, 0.6 swipes/s
//   node tools/economy.mjs --pace 2          # a very fast swiper (coins, not time, limit swipes)
//   node tools/economy.mjs --metal 0.5       # half the kills marked by Metal
//   node tools/economy.mjs --set '{"ECONOMY":{"killPerWave":1}}'
//
// Model:
// - every foe dies (an upper bound on income); bosses pay bossMult; Kite Ninja's minions count
// - the player swipes at `--pace` swipes per second during the break and the wave, whenever they
//   can afford it; unspent coins are the "bank" (a growing bank = money overflowing)
// - a swipe adds 2.2 board value on average; the board is approximated by the binary split of
//   its value (a tidy corner board); classes multiply damage (×1.3 at 16+, ×2 at 256+, ×3.5 at 4096+)
// - pressure = wave HP ÷ (board damage per second × time the wave is on the field). Above ~1 foes leak.
// - a boss kill's x2s (src/sim/boss-reward.js) add most of the top block's value to the board
//   (median 0.86 over 121 boss kills in 40 autoplay games)
import { DEFENSE, ECONOMY, LANE_LENGTH, GRID } from '../src/config.js';
import { ENEMY_TYPES, generateWave } from '../src/sim/enemies.js';
import { ELEMENTS, turretDamage } from '../src/sim/classes.js';
import { createRng } from '../src/sim/rng.js';

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const waves = Number(arg('waves', 30));
const metal = Number(arg('metal', 0));
const pace = Number(arg('pace', 0.6));
const set = JSON.parse(arg('set', '{}'));
Object.assign(ECONOMY, set.ECONOMY ?? {});
Object.assign(DEFENSE, set.DEFENSE ?? {});

// formulas mirror src/sim/run.js (re-derived here so --set overrides apply)
const swipeCost = (n) => ECONOMY.swipeBase + Math.floor(n / ECONOMY.swipeStepEvery) * ECONOMY.swipeStep;
const killCoins = (w, boss) => Math.round((ECONOMY.killBase + w * ECONOMY.killPerWave) * (boss ? ECONOMY.bossMult : 1));
const clearBonus = (w) => Math.round(ECONOMY.waveClearBase + w * ECONOMY.waveClearPerWave);
const lootPct = ELEMENTS.metal.loot.pct;

function waveStats(w) {
  const SEEDS = 24;
  let foes = 0;
  let bosses = 0;
  let hp = 0;
  let span = 0;
  let speed = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const wave = generateWave(w, createRng(seed * 7919 + w));
    for (const sp of wave.spawns) {
      const def = ENEMY_TYPES[sp.type];
      const n = 1 + (def.summonOnDeath?.count ?? 0);
      foes += def.boss ? n - 1 : 1;
      bosses += def.boss ? 1 : 0;
      hp += def.hp * wave.hpScale;
      if (def.summonOnDeath) hp += def.summonOnDeath.count * ENEMY_TYPES[def.summonOnDeath.type].hp * wave.hpScale;
      speed += def.speed;
    }
    span += wave.spawns.at(-1).t;
  }
  const per = (x) => x / SEEDS;
  const count = per(foes + bosses);
  return {
    foes: per(foes),
    bosses: per(bosses),
    hp: per(hp),
    time: per(span) + LANE_LENGTH / (DEFENSE.enemyBaseSpeed * (speed / (foes + bosses || 1))),
    count,
  };
}

function boardDps(value) {
  // binary split of the board value into at most 16 tiles, biggest first
  let v = Math.max(4, Math.round(value / 2) * 2);
  let dps = 0;
  let tiles = 0;
  for (let t = 16; t >= 1 && tiles < GRID.size * GRID.size; t--) {
    const tv = 2 ** t;
    if (v >= tv) {
      v -= tv;
      tiles += 1;
      const mult = t >= 12 ? 3.5 : t >= 8 ? 2 : t >= 4 ? 1.3 : 1;
      dps += turretDamage(t) * mult;
    }
  }
  return dps;
}

const breakFor = (w) => (w === 1 ? ECONOMY.prepSeconds : Math.min(ECONOMY.breakMax, ECONOMY.breakBase + ECONOMY.breakPerWave * w));
const rows = [];
const BOSS_X2_VALUE = 0.86; // board value a boss's x2s add, as a share of the top block (measured, see above)
let promoted = 0; // board value added by boss x2s
const boardValue = () => 4.4 + 2.2 * swipes + promoted;
const topOf = (v) => 2 ** Math.floor(Math.log2(v * 0.55));
let coins = ECONOMY.startCoins;
let swipes = 0;
let earned = ECONOMY.startCoins;
const spend = (maxSwipes) => {
  let n = 0;
  while (n < maxSwipes && coins >= swipeCost(swipes)) {
    coins -= swipeCost(swipes);
    swipes += 1;
    n += 1;
  }
  return n;
};
for (let w = 1; w <= waves; w++) {
  const st = waveStats(w);
  const before = spend(Math.floor(pace * breakFor(w))); // the break before the wave
  const left = coins;
  const value = boardValue();
  const pressure = st.hp / (boardDps(value) * st.time);
  const income = st.foes * killCoins(w, false) * (1 + metal * lootPct) + st.bosses * killCoins(w, true) * (1 + metal * lootPct) + clearBonus(w);
  // during the wave the kill coins trickle in: about half of them are spendable before it ends
  coins += income * 0.5;
  const during = spend(Math.floor(pace * st.time));
  coins += income * 0.5;
  earned += income;
  if (st.bosses > 0.5) promoted += BOSS_X2_VALUE * topOf(boardValue());
  rows.push({
    wave: w,
    foes: +st.count.toFixed(1),
    'foe HP': Math.round(DEFENSE.enemyBaseHp * DEFENSE.enemyHpGrowth ** (w - 1)),
    income: Math.round(income),
    'swipe cost': swipeCost(swipes),
    swipes: before + during,
    'total swipes': swipes,
    'left after break': Math.round(left),
    'bank at end': Math.round(coins),
    top: topOf(boardValue()),
    pressure: +pressure.toFixed(2),
  });
}
console.table(rows);
const first = (tier) => rows.find((r) => r.top >= 2 ** tier)?.wave ?? '—';
const leak = rows.find((r) => r.pressure > 1)?.wave ?? `>${waves}`;
const bank = (w) => rows[w - 1]?.['left after break'];
console.log(`pace ${pace} swipes/s · metal share ${metal}`);
console.log(`first 64: wave ${first(6)} · 256: wave ${first(8)} · 512: wave ${first(9)} · 1024: wave ${first(10)} (boss x2s included)`);
console.log(`unspent after the break, waves 5/10/20: ${bank(5)}/${bank(10)}/${bank(20)} coins · pressure passes 1 at wave ${leak} · swipes by wave ${waves}: ${swipes} · coins earned: ${Math.round(earned).toLocaleString()}`);
