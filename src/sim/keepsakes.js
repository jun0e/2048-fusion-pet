// Keepsakes (after Hades): the player brings one into each run. The biggest block
// ever made unlocks the next ones (src/ux/meta.js keeps that record). Each one
// changes a single rule of the run; the run reads its numbers from here
// (createRun({ keepsake })). Pure data.
//
// Unlock steps from tools/level-probe.mjs (48 bot games): 128 comes in 90% of
// games, 256 in 73%, 512 in 54%, 1024 in 38%, 2048 in 10%. So a new player gets
// a second keepsake in the first run or two, and the last one is a real feat.
export const KEEPSAKES = [
  {
    id: 'ironFist',
    name: 'Iron Fist',
    unlockTier: 0, // the starter: the first run equips it, with a tutorial
    short: 'Blocks punch the monsters they slide into.',
    desc: 'A block that moves in a swipe punches every monster in its way, as hard as its base hit. Bigger blocks punch harder.',
    // the punch: mult × the block's base hit (turretDamage); it reaches `reach` past the
    // block's new cell (a monster biting the block stands 1.15 from its centre) and
    // `width` to each side of its path (under half a cell: the next column is safe)
    punch: { mult: 1, reach: 1.25, width: 0.9 },
  },
  {
    id: 'coinPurse',
    name: 'Coin Purse',
    unlockTier: 7, // 128
    short: '+60 coins at the start. Kills pay 20% more.',
    desc: 'Start the run with 60 more coins, and every kill drops 20% more coins.',
    startCoins: 60,
    killPct: 0.2,
  },
  {
    id: 'spikedCollar',
    name: 'Spiked Collar',
    unlockTier: 8, // 256
    short: 'Blocks have 30% more health.',
    desc: 'Every block has 30% more hidden health, so monsters take longer to break it.',
    blockHp: 0.3,
  },
  {
    id: 'luckyClover',
    name: 'Lucky Clover',
    unlockTier: 9, // 512
    short: 'New blocks spawn as if 2 levels higher.',
    desc: 'New blocks use the spawn odds of 2 levels above yours (up to the top level).',
    levels: 2,
  },
  {
    id: 'phoenixFeather',
    name: 'Phoenix Feather',
    unlockTier: 10, // 1024
    short: 'Once a run, your last block rises again.',
    desc: 'Once a run, when your last block falls, it rises as the biggest block you lost this run, at full health. The monsters on the board are thrown back to the gates, and you get 4 swipes of coins to rebuild.',
    // a plain rescue never changed a bot run's last wave: the last block is usually a small one,
    // and it fell again seconds later. Rising as the run's biggest lost block makes it a comeback.
    reviveHp: 1,
    rebuildSwipes: 4,
  },
  {
    id: 'quakeBoots',
    name: 'Quake Boots',
    unlockTier: 11, // 2048
    short: 'A swipe with 2+ merges stomps the board.',
    desc: 'A swipe that makes 2 or more merges stomps: every monster on the board takes your top block\'s base hit and is stunned for 1.5 s.',
    merges: 2,
    stun: 1.5,
    stomp: 1, // × the top block's base hit (turretDamage)
  },
];

export const STARTER_KEEPSAKE = 'ironFist';

export const keepsakeById = (id) => KEEPSAKES.find((k) => k.id === id) ?? null;

/** Keepsakes the player owns with `bestTier` as the biggest block ever made. */
export const unlockedKeepsakes = (bestTier) => KEEPSAKES.filter((k) => bestTier >= k.unlockTier);

export const isUnlocked = (id, bestTier) => (keepsakeById(id)?.unlockTier ?? Infinity) <= bestTier;

/** The next keepsake to unlock (null when all are owned). */
export const nextKeepsake = (bestTier) => KEEPSAKES.find((k) => k.unlockTier > bestTier) ?? null;

/** Keepsakes that a new best block unlocks: the best went from `before` to `after`. */
export const newlyUnlocked = (before, after) => KEEPSAKES.filter((k) => k.unlockTier > before && k.unlockTier <= after);
