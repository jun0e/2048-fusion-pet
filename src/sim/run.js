// A run of the merge-turret defense: a classic 4×4 2048 board whose blocks are
// turrets, plus the tower-defense layer, in real time:
//   prep  — a short countdown before the first wave
//   wave  — enemies walk down the four lanes onto the board and attack the blocks
//   break — a short countdown before the next wave (the next wave's lanes are telegraphed)
// The board can be swiped at any time, but every swipe costs coins (and, as in
// 2048, spawns a new block). Kills drop coins, clearing a wave pays a bonus and
// three merges in one swipe refund it. There is no selling: a locked board opens
// up when enemies destroy a block or a boss kill promotes one.
// Dice: blocks below 16 are plain and don't shoot. A block reaching 16 rolls a
// random element from the deck; when elemental blocks merge, the one that slides
// in keeps its element; 256 fuses in a second element (a unique fusion), 4096 a
// third (see mergeClass). You start with 2 dice; the first 64, 256 and 512 each
// add one more to the deck (a card pick that pauses the run).
// Siege: there is no castle. Every block has hidden health (hpPerTier × tier^hpExp)
// that refills at the start of each wave; enemies on the board attack the nearest
// block; a block at 0 is destroyed for good. The run ends when the last block falls.
// Pure and deterministic for a given seed and input sequence.

import { createGrid } from './grid.js';
import { createDefense } from './defense.js';
import { generateWave } from './enemies.js';
import { createRng } from './rng.js';
import { ELEMENT_KEYS, describeStage, dieOffers, elementsOf, mergeClass, stageFor } from './classes.js';
import { DEFENSE, DICE, ECONOMY, PHYSICS, SIEGE } from '../config.js';

const DEFENSE_CLASS_TIER = DEFENSE.classTiers[0];

/** Hidden health of a block: grows with its tier (so big blocks stay fragile). */
export const maxHpFor = (tier) => Math.round(SIEGE.hpPerTier * tier ** SIEGE.hpExp);
/** Price of the next swipe after `swipes` paid swipes. */
export const swipeCostFor = (swipes) => ECONOMY.swipeBase + Math.floor(swipes / ECONOMY.swipeStepEvery) * ECONOMY.swipeStep;

/**
 * Taking a block off the board: a turret (16+) sells for one swipe's price; a dormant
 * block (below 16) costs three swipes to break. → { kind: 'sell'|'break', amount } with
 * amount > 0 paid to the player, < 0 charged.
 */
export function discardPrice(tier, swipes) {
  const swipe = swipeCostFor(swipes);
  return stageFor(tier) >= 1 ? { kind: 'sell', amount: ECONOMY.sellSwipes * swipe } : { kind: 'break', amount: -ECONOMY.breakSwipes * swipe };
}
/** Coins dropped by a kill during `wave`. */
export const killCoinsFor = (wave, boss) => Math.round((ECONOMY.killBase + wave * ECONOMY.killPerWave) * (boss ? ECONOMY.bossMult : 1));
/** Seconds of break before `wave` (the player can skip it with Wave now). */
export const breakSecondsFor = (wave) => Math.min(ECONOMY.breakMax, ECONOMY.breakBase + ECONOMY.breakPerWave * wave);
export const waveBonusFor = (wave) => Math.round(ECONOMY.waveClearBase + wave * ECONOMY.waveClearPerWave);

export function createRun({ seed = (Math.random() * 2 ** 32) >>> 0, autoChoose = false, empty = false, dice = null } = {}) {
  const diceRng = createRng((seed ^ 0xa5a5a5a5) >>> 0);
  const rollRng = createRng((seed ^ 0x3c6ef372) >>> 0);
  const events = [];
  const choices = []; // die unlocks: { kind: 'die', tier, offers }
  const notes = []; // merge results (class gained, colour overridden), emitted after the grid's events

  // the deck: 4 random dice (or the given ones); every new block takes a random die's colour
  let owned = dice ? [...dice] : null;
  if (!owned) {
    const pool = [...ELEMENT_KEYS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(diceRng.next() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    owned = pool.slice(0, DICE.start);
  }
  const unlocked = new Set(); // unlock tiers already rewarded
  /** A random die from the deck, avoiding `exclude` (null if none is left). */
  const roll = (exclude) => {
    const pool = owned.filter((e) => !exclude.includes(e));
    return pool.length ? pool[Math.floor(rollRng.next() * pool.length)] : null;
  };

  const grid = createGrid({
    seed,
    spawn: true,
    onSpawn: (t) => {
      t.cls = {}; // plain until it reaches 16
      t.maxHp = maxHpFor(t.tier);
      t.hp = t.maxHp;
    },
    onMerge: (child, mover, stayer) => {
      // the merged block keeps the damage its parents had taken (merging doesn't heal)
      child.maxHp = maxHpFor(child.tier);
      child.hp = Math.min(child.maxHp, (mover.hp ?? maxHpFor(mover.tier)) + (stayer.hp ?? maxHpFor(stayer.tier)));
      const stage = mergeClass(child, mover, stayer, roll);
      if (stage) notes.push({ type: 'classed', tileId: child.id, stage, element: child.cls.element, x: child.x, y: child.y, tier: child.tier, info: describeStage(child.cls, stage, child.tier) });
      else if (stageFor(child.tier) >= 1 && mover.cls.element && stayer.cls.element && mover.cls.element !== stayer.cls.element) {
        notes.push({ type: 'override', tileId: child.id, x: child.x, y: child.y, tier: child.tier, winner: mover.cls.element, loser: stayer.cls.element });
      }
    },
  });
  grid.clear();
  if (!empty) {
    // siege opening: two 8s side by side, so the first sideways swipe makes a 16 turret
    grid.spawnDebug(3, 1, 0);
    grid.spawnDebug(3, 2, 0);
    grid.drainEvents();
  }
  const defense = createDefense({ rng: createRng((seed ^ 0x5bd1e995) >>> 0) });
  const waveFor = (n) => generateWave(n, createRng((seed ^ Math.imul(n, 0x9e3779b1)) >>> 0));
  const s = {
    phase: 'prep',
    timer: ECONOMY.prepSeconds,
    waveNo: 1,
    waveT: 0,
    spawnIdx: 0,
    coins: ECONOMY.startCoins,
    swipes: 0,
    killScore: 0,
    kills: 0,
    locked: false,
    time: 0,
    over: false,
    overReason: null,
  };
  let wave = waveFor(1);

  function endRun(reason) {
    if (s.over) return;
    s.over = true;
    s.overReason = reason;
    s.phase = 'over';
    events.push({ type: 'gameover', reason, wave: s.waveNo, score: grid.score + s.killScore, maxTier: grid.maxTier, kills: s.kills });
  }

  function addCoins(amount, reason, x = 0, y = 0) {
    s.coins = Math.max(0, s.coins + amount);
    events.push({ type: 'coins', amount, reason, x, y, total: s.coins });
  }

  // The first time the top block reaches an unlock tier, offer a new die.
  function scanUnlocks() {
    DICE.unlockTiers.forEach((tier) => {
      if (grid.maxTier < tier || unlocked.has(tier)) return;
      unlocked.add(tier);
      const offers = dieOffers(owned, diceRng);
      if (!offers.length) return;
      const c = { kind: 'die', tier, offers };
      choices.push(c);
      events.push({ type: 'choice', ...c });
    });
  }

  function choose(index) {
    const c = choices.shift();
    if (!c) return false;
    const offer = c.offers[Math.max(0, Math.min(c.offers.length - 1, index))];
    owned.push(offer.element);
    events.push({ type: 'dieGained', element: offer.element, tier: c.tier, offer });
    // unlocks queued together must not offer the die just taken
    for (const next of choices) next.offers = dieOffers(owned, diceRng);
    for (let i = choices.length - 1; i >= 0; i--) if (!choices[i].offers.length) choices.splice(i, 1);
    return true;
  }

  /**
   * A boss promotion that lifts a block into a new class stage: at 16 it rolls
   * its element; at 256 / 4096 there is no partner block to borrow an element
   * from, so the open fusion / ultimate slot rolls one from the deck.
   */
  function promoteClass(t) {
    t.prof = null;
    const slots = stageFor(t.tier);
    if (slots >= 1 && !t.cls.element) {
      const e = roll([]);
      if (!e) return 0;
      t.cls.element = e;
      return 1;
    }
    if (slots >= 2 && !t.cls.fusion) {
      const e = roll(elementsOf(t.cls));
      if (!e) return 0;
      t.cls.fusion = e;
      return 2;
    }
    if (slots >= 3 && !t.cls.ultimate) {
      const e = roll(elementsOf(t.cls));
      if (!e) return 0;
      t.cls.ultimate = e;
      return 3;
    }
    return 0;
  }

  // Warn once each time the board locks; a boss promotion can reopen merges.
  function checkLock() {
    const locked = !grid.canMove();
    if (locked && !s.locked) events.push({ type: 'locked', wave: s.waveNo });
    s.locked = locked;
  }

  function startWave() {
    s.phase = 'wave';
    s.timer = 0;
    s.waveT = 0;
    s.spawnIdx = 0;
    // every block's hidden health refills at the start of a wave
    for (const t of grid.tiles) {
      t.maxHp = maxHpFor(t.tier);
      t.hp = t.maxHp;
    }
    events.push({ type: 'tilesRestored', count: grid.tiles.length });
    events.push({ type: 'waveStart', wave: s.waveNo, boss: wave.boss, chapter: wave.chapter.name, count: wave.count, lanes: wave.lanes });
  }

  function clearWave() {
    const bonus = waveBonusFor(s.waveNo);
    events.push({ type: 'waveClear', wave: s.waveNo, bonus });
    addCoins(bonus, 'clear');
    s.waveNo += 1;
    wave = waveFor(s.waveNo);
    s.phase = 'break';
    s.timer = breakSecondsFor(s.waveNo);
    events.push({ type: 'waveIncoming', wave: s.waveNo, boss: wave.boss, chapter: wave.chapter.name, count: wave.count, lanes: wave.lanes });
  }

  function move(dir) {
    if (s.over || choices.length) return false;
    const cost = swipeCostFor(s.swipes);
    if (s.coins < cost) {
      events.push({ type: 'noCoins', cost, coins: s.coins });
      return false;
    }
    if (!grid.move(dir)) return false; // a swipe that changes nothing is free
    s.coins -= cost;
    s.swipes += 1;
    events.push({ type: 'spend', amount: cost, total: s.coins, next: swipeCostFor(s.swipes) });
    for (const e of grid.drainEvents()) {
      events.push(e);
      if (e.type === 'merge' && e.combo === ECONOMY.comboAt) addCoins(cost, 'combo', e.x, e.y);
    }
    events.push(...notes.splice(0)); // what the merges made: new classes, overridden colours
    scanUnlocks();
    checkLock();
    return true;
  }

  /** Skip the prep / break countdown. */
  function nextWave() {
    if (s.over || (s.phase !== 'prep' && s.phase !== 'break')) return false;
    startWave();
    return true;
  }

  function step() {
    if (s.over) return;
    if (choices.length) {
      if (!autoChoose) return; // paused for the player's pick
      while (choices.length) choose(0);
    }
    const dt = PHYSICS.dt;
    s.time += dt;
    grid.step(dt);
    for (const e of grid.drainEvents()) events.push(e);
    scanUnlocks();
    checkLock();

    if (s.phase === 'prep' || s.phase === 'break') {
      if (!(s.hold && s.phase === 'prep')) s.timer -= dt; // the tutorial can hold the opening countdown
      if (s.timer <= 0) startWave();
    } else if (s.phase === 'wave') {
      s.waveT += dt;
      // siege income: a trickle of coins while the wave runs
      s.income = (s.income ?? 0) + SIEGE.incomePerSec * dt;
      if (s.income >= 1) {
        const n = Math.floor(s.income);
        s.income -= n;
        s.coins += n;
      }
      while (s.spawnIdx < wave.spawns.length && wave.spawns[s.spawnIdx].t <= s.waveT) {
        const sp = wave.spawns[s.spawnIdx++];
        defense.spawn(sp.type, { lane: sp.lane, hpScale: wave.hpScale, atkScale: SIEGE.attackGrowth ** (s.waveNo - 1) });
      }
    }

    defense.step(dt, grid.tiles);
    for (const e of defense.drainEvents()) {
      events.push(e);
      if (e.type !== 'kill') continue;
      s.killScore += e.bounty;
      s.kills += 1;
      // Metal marks foes: a marked foe drops bonus coins
      addCoins(Math.round(killCoinsFor(s.waveNo, e.boss) * (1 + (e.loot ?? 0))), 'kill', e.x, e.y);
      if (e.boss) {
        // boss reward (Slime Legion-style upgrade card): the biggest block goes up a tier
        const top = grid.tiles.reduce((best, t) => (!best || t.tier > best.tier ? t : best), null);
        if (top && grid.promote(top)) {
          for (const g of grid.drainEvents()) events.push(g);
          top.prof = null;
          const grow = maxHpFor(top.tier) - (top.maxHp ?? 0);
          top.maxHp = maxHpFor(top.tier);
          top.hp = Math.min(top.maxHp, (top.hp ?? 0) + grow);
          const stage = promoteClass(top);
          if (stage) events.push({ type: 'classed', tileId: top.id, stage, element: top.cls.element, x: top.x, y: top.y, tier: top.tier, promoted: true, info: describeStage(top.cls, stage, top.tier) });
        }
        scanUnlocks();
        checkLock();
      }
    }
    // blocks whose hidden health ran out are destroyed for good
    let lost = 0;
    for (const t of [...grid.tiles]) {
      if (t.hp > 0) continue;
      grid.remove(t, 'destroyed');
      lost += 1;
    }
    if (lost) {
      for (const g of grid.drainEvents()) events.push(g);
      checkLock();
      if (!grid.tiles.length) endRun('overrun');
    }
    if (!s.over && s.phase === 'wave' && s.spawnIdx >= wave.spawns.length && defense.aliveCount === 0) clearWave();
  }

  return {
    step,
    move,
    nextWave,
    choose,
    /** Hold the opening countdown (the first-run tutorial); Wave now still works. */
    setHold: (v) => {
      s.hold = !!v;
    },
    spawnDebug: (tier, col, row) => grid.spawnDebug(tier, col, row),
    /** What taking this block off the board would pay (+) or cost (−), or null if it can't go. */
    discardPrice: (id) => {
      const t = grid.tiles.find((x) => x.id === id);
      return t ? discardPrice(t.tier, s.swipes) : null;
    },
    /**
     * Sell a turret or break a dormant block (see discardPrice). The last block can't go
     * (it would end the run), and breaking needs the coins. → { ok, kind, amount } or { ok: false, reason }
     */
    discard: (id) => {
      const t = grid.tiles.find((x) => x.id === id);
      if (!t || s.over) return { ok: false, reason: 'gone' };
      if (grid.tiles.length <= 1) return { ok: false, reason: 'last' };
      const price = discardPrice(t.tier, s.swipes);
      if (price.amount < 0 && s.coins < -price.amount) {
        events.push({ type: 'noCoins', cost: -price.amount, coins: s.coins });
        return { ok: false, reason: 'coins', cost: -price.amount };
      }
      grid.remove(t, price.kind === 'sell' ? 'sold' : 'broken');
      for (const g of grid.drainEvents()) events.push(g);
      s.coins = Math.max(0, s.coins + price.amount);
      events.push({ type: 'discard', ...price, tier: t.tier, x: t.x, y: t.y, total: s.coins });
      checkLock();
      return { ok: true, ...price };
    },
    /** Fire a block's active skill (key-visual namecards); returns foes caught. */
    castSkill: (id, opts) => {
      const t = grid.tiles.find((x) => x.id === id);
      return t && !s.over ? defense.cast(t, opts) : 0;
    },
    addCoins: (n) => addCoins(n, 'debug'),
    drainEvents: () => events.splice(0, events.length),
    grid,
    defense,
    get tiles() {
      return grid.tiles;
    },
    get enemies() {
      return defense.enemies;
    },
    get shots() {
      return defense.shots;
    },
    /** Blocks left on the board (losing them all ends the run). */
    get blocks() {
      return grid.tiles.length;
    },
    /** Current wave number (during prep/break: the upcoming one). */
    get waveNo() {
      return s.waveNo;
    },
    /** Current (or upcoming) wave: lanes, boss, chapter, spawns. */
    get wave() {
      return wave;
    },
    get phase() {
      return s.phase;
    },
    /** Seconds until the next wave during prep / break. */
    get timer() {
      return Math.max(0, s.timer);
    },
    get coins() {
      return s.coins;
    },
    get swipes() {
      return s.swipes;
    },
    get swipeCost() {
      return swipeCostFor(s.swipes);
    },
    get locked() {
      return s.locked;
    },
    /** Enemies still to come or alive in the current wave. */
    get left() {
      return s.phase === 'wave' ? wave.spawns.length - s.spawnIdx + defense.aliveCount : wave.count;
    },
    get pendingChoice() {
      return choices[0] ?? null;
    },
    /** The deck: dice (elements) new blocks can spawn in. */
    get owned() {
      return [...owned];
    },
    get score() {
      return grid.score + s.killScore;
    },
    get kills() {
      return s.kills;
    },
    get maxTier() {
      return grid.maxTier;
    },
    get over() {
      return s.over;
    },
    get overReason() {
      return s.overReason;
    },
    get time() {
      return s.time;
    },
    get seed() {
      return seed;
    },
  };
}
