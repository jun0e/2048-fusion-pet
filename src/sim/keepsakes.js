// Keepsakes (after Hades): the player brings one into each run. The biggest block
// ever made unlocks the next ones (src/ux/meta.js keeps that record). Each one
// changes a single rule of the run; the run reads its numbers from here
// (createRun({ keepsake })). Pure data.
//
// Unlock steps from tools/level-probe.mjs (48 bot games): 128 comes in 90% of
// games, 256 in 73%, 512 in 54%, 1024 in 38%, 2048 in 10%. So a new player gets
// a second keepsake in the first run or two, and the last one is a real feat.
import { tr } from '../i18n/index.js';
export const KEEPSAKES = [
  {
    id: 'ironFist',
    unlockTier: 0, // the starter: the first run equips it, with a tutorial
    // the punch: mult × the block's base hit (turretDamage); it reaches `reach` past the
    // block's new cell (a monster biting the block stands 1.15 from its centre) and
    // `width` to each side of its path (under half a cell: the next column is safe)
    punch: { mult: 1, reach: 1.25, width: 0.9 },
  },
  {
    id: 'coinPurse',
    unlockTier: 7, // 128
    startCoins: 60,
    killPct: 0.2,
  },
  {
    id: 'spikedCollar',
    unlockTier: 8, // 256
    blockHp: 0.3,
  },
  {
    id: 'luckyClover',
    unlockTier: 9, // 512
    levels: 2,
  },
  {
    id: 'phoenixFeather',
    unlockTier: 10, // 1024
    // a plain rescue never changed a bot run's last wave: the last block is usually a small one,
    // and it fell again seconds later. Rising as the run's biggest lost block makes it a comeback.
    reviveHp: 1,
    rebuildSwipes: 4,
  },
  {
    id: 'quakeBoots',
    unlockTier: 11, // 2048
    merges: 2,
    stun: 1.5,
    stomp: 1, // × the top block's base hit (turretDamage)
  },
];
// each keepsake's name, its one line and its card's words come from the language's table (src/i18n)
for (const k of KEEPSAKES) Object.assign(k, { name: tr(`ks.${k.id}`), short: tr(`ks.${k.id}.short`), desc: tr(`ks.${k.id}.desc`) });

export const STARTER_KEEPSAKE = 'ironFist';

export const keepsakeById = (id) => KEEPSAKES.find((k) => k.id === id) ?? null;

/** Keepsakes the player owns with `bestTier` as the biggest block ever made. */
export const unlockedKeepsakes = (bestTier) => KEEPSAKES.filter((k) => bestTier >= k.unlockTier);

export const isUnlocked = (id, bestTier) => (keepsakeById(id)?.unlockTier ?? Infinity) <= bestTier;

/** The next keepsake to unlock (null when all are owned). */
export const nextKeepsake = (bestTier) => KEEPSAKES.find((k) => k.unlockTier > bestTier) ?? null;

/** Keepsakes that a new best block unlocks: the best went from `before` to `after`. */
export const newlyUnlocked = (before, after) => KEEPSAKES.filter((k) => k.unlockTier > before && k.unlockTier <= after);
