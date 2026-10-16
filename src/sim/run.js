// A run of the merge-turret defense: a classic 4×4 2048 board whose blocks are
// turrets, plus the tower-defense layer, in real time:
//   prep  — a short countdown before the first wave
//   wave  — enemies walk down the four lanes onto the board and attack the blocks
//   break — a short countdown before the next wave (the next wave's lanes are telegraphed)
// The board can be swiped at any time, but every swipe costs coins (and, as in
// 2048, spawns a new block). Kills drop coins, clearing a wave pays a bonus and
// three merges in one swipe refund it. There is no selling: a locked board opens
// up when enemies destroy a block or a boss kill's x2s make a pair.
// Dice: blocks below 16 are plain and don't shoot. A block reaching 16 rolls a
// random element from the deck; when elemental blocks merge, the one that slides
// in keeps its element; 256 fuses in a second element (a unique fusion), 4096 a
// third (see mergeClass). You start with 2 dice; the first 64, 256 and 512 each
// add one more to the deck (a card pick that pauses the run).
// Siege: there is no castle. Every block has hidden health (hpPerTier × tier^hpExp)
// that refills at the start of each wave; enemies on the board attack the nearest
// block; a block at 0 is destroyed for good. The run ends when the last block falls.
// Spawn level (src/sim/levels.js): cleared waves and bought XP raise the level (the
// run's top block caps it), and each level makes bigger new blocks likelier (TFT's
// shop odds); after the run's first 512, 2s stop spawning. A keepsake (src/sim/keepsakes.js) changes
// one rule of the run, e.g. Iron Fist: blocks punch the monsters they slide into.
// Fusion choice: every block keeps its material (the elements of all the elemental blocks
// merged into it); a block reaching 256 lets the player pick its fusion from the pairs its
// material can make (a card, like the die pick), when there is more than one.
// Pure and deterministic for a given seed, keepsake and input sequence.

import { createGrid } from './grid.js';
import { createDefense } from './defense.js';
import { generateWave } from './enemies.js';
import { createRng } from './rng.js';
import { createRoam } from './roam.js';
import { planBossReward } from './boss-reward.js';
import { ELEMENT_KEYS, describeStage, dieOffers, elementsOf, fusionOffers, materialOf, mergeClass, mergeMaterial, stageFor, turretDamage } from './classes.js';
import { LEVELS, buyXpPrice, levelCap, spawnOdds, spawnTable, xpNeeded } from './levels.js';
import { keepsakeById } from './keepsakes.js';
import { punchTargets, slidePaths } from './punch.js';
import { DEFENSE, DICE, ECONOMY, GRID, GUIDED_WAVE, PHYSICS, SIEGE, cellX, cellY } from '../config.js';

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

/**
 * @param levels    the spawn level (on in the game; off: classic 90/10 spawns, for the showcase and old tests)
 * @param keepsake  the keepsake brought into this run (an id from src/sim/keepsakes.js), or null
 */
export function createRun({ seed = (Math.random() * 2 ** 32) >>> 0, autoChoose = false, empty = false, dice = null, brokeBreak = ECONOMY.brokeBreak, roaming = false, levels = true, keepsake = null } = {}) {
  const diceRng = createRng((seed ^ 0xa5a5a5a5) >>> 0);
  const rollRng = createRng((seed ^ 0x3c6ef372) >>> 0);
  const bossRng = createRng((seed ^ 0x27d4eb2f) >>> 0); // where boss x2s go (its own stream: other rolls stay the same)
  const roam = roaming ? createRoam(createRng((seed ^ 0x6d2b79f5) >>> 0)) : null; // fusions' pets roam the field (src/sim/roam.js)
  const events = [];
  const choices = []; // die unlocks { kind: 'die', tier, offers } and fusion picks { kind: 'fusion', tileId, tier, offers }
  const fusionPicks = []; // fusion picks a swipe or a boss reward made, queued after their announcements
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

  const ks = keepsakeById(keepsake);
  const fist = ks?.punch ?? null; // Iron Fist
  /** A block's hidden health with this run's keepsake (Spiked Collar adds to it). */
  const hpFor = (tier) => Math.round(maxHpFor(tier) * (1 + (ks?.blockHp ?? 0)));
  const lv = { level: 1, xp: 0 }; // the spawn level and the XP toward the next one
  /** The level the spawn odds use: the player's level, plus Lucky Clover's. */
  const spawnLevel = () => Math.min(LEVELS.max, lv.level + (ks?.levels ?? 0));
  let gridRef = null; // the grid's own first spawns come before `grid` exists

  const grid = createGrid({
    seed,
    spawn: true,
    spawnTable: levels ? () => spawnTable(spawnLevel(), gridRef?.maxTier ?? 0) : null,
    onSpawn: (t, info) => {
      t.cls = {}; // plain until it reaches 16
      t.mats = []; // no material yet (an element joins at 16)
      t.maxHp = hpFor(t.tier);
      t.hp = t.maxHp;
      // a spawned 16 (the top spawn levels) hatches like a merged one: an element from the deck
      if (info?.random && stageFor(t.tier) >= 1) {
        const e = roll([]);
        if (e) {
          t.cls.element = e;
          t.mats = [e];
          notes.push({ type: 'classed', tileId: t.id, stage: 1, element: e, x: t.x, y: t.y, tier: t.tier, spawned: true, info: describeStage(t.cls, 1, t.tier) });
        }
      }
    },
    onMerge: (child, mover, stayer) => {
      // the merged block keeps the damage its parents had taken (merging doesn't heal)
      child.maxHp = hpFor(child.tier);
      child.hp = Math.min(child.maxHp, (mover.hp ?? hpFor(mover.tier)) + (stayer.hp ?? hpFor(stayer.tier)));
      let stage = mergeClass(child, mover, stayer, roll);
      let picking = false;
      // the material both blocks brought; a new fusion is made from it only (a pick when it allows several)
      const material = mergeMaterial(materialOf(mover), materialOf(stayer));
      if (stage === 2 && material.length >= 2) {
        const offers = fusionOffers(child.cls, material);
        // until the pick, the block holds the first offer: the merge rule's own pick when it came from the material
        child.cls = { ...child.cls, element: offers[0].element, fusion: offers[0].fusion };
        child.prof = null;
        if (offers.length > 1) {
          fusionPicks.push({ kind: 'fusion', tileId: child.id, tier: child.tier, offers });
          stage = 0; // announced with the pick
          picking = true;
        }
      }
      child.mats = mergeMaterial(material, elementsOf(child.cls));
      if (stage) notes.push({ type: 'classed', tileId: child.id, stage, element: child.cls.element, x: child.x, y: child.y, tier: child.tier, info: describeStage(child.cls, stage, child.tier) });
      else if (!picking && stageFor(child.tier) >= 1 && mover.cls.element && stayer.cls.element && mover.cls.element !== stayer.cls.element) {
        notes.push({ type: 'override', tileId: child.id, x: child.x, y: child.y, tier: child.tier, winner: mover.cls.element, loser: stayer.cls.element });
      }
    },
  });
  gridRef = grid;
  grid.clear();
  grid.drainEvents(); // the grid's own first spawns are gone: no news of them
  notes.length = 0;
  if (!empty) {
    // siege opening: two 8s side by side, so the first sideways swipe makes a 16 turret
    grid.spawnDebug(3, 1, 0);
    grid.spawnDebug(3, 2, 0);
  }
  const defense = createDefense({ rng: createRng((seed ^ 0x5bd1e995) >>> 0) });
  const waveFor = (n) => generateWave(n, createRng((seed ^ Math.imul(n, 0x9e3779b1)) >>> 0));
  const s = {
    phase: 'prep',
    timer: ECONOMY.prepSeconds,
    waveNo: 1,
    waveT: 0,
    spawnIdx: 0,
    coins: ECONOMY.startCoins + (ks?.startCoins ?? 0),
    swipes: 0,
    killScore: 0,
    kills: 0,
    locked: false,
    time: 0,
    over: false,
    overReason: null,
    no2: false, // the run made a 512: 2s no longer spawn
    phoenix: ks?.reviveHp != null, // Phoenix Feather not used yet
    fallen: null, // the biggest block destroyed this run ({ tier, cls }): the Phoenix Feather brings it back
  };
  let wave = waveFor(1);

  // First run only (set by the tutorial): wave 1 comes down the biggest block's
  // column, with fewer foes. Re-aimed after every swipe while the opening waits,
  // so the lit lane always matches what the player built.
  function aimGuidedWave() {
    if (!s.guidedWave || s.waveNo !== 1 || s.phase !== 'prep') return;
    const top = grid.tiles.reduce((b, t) => (!b || t.tier > b.tier ? t : b), null);
    if (!top) return;
    const lane = top.col;
    const spawns = waveFor(1).spawns.slice(0, GUIDED_WAVE.count).map((sp) => ({ ...sp, lane }));
    wave = { ...wave, lanes: [lane], spawns, count: spawns.length };
  }

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

  /**
   * Spawn XP: each level reached raises the odds of bigger new blocks ('levelUp'). The level waits
   * at its cap (levelCap: the run's top block) with a full bar until a bigger block raises the cap.
   */
  function gainXp(amount, reason) {
    if (!levels || lv.level >= LEVELS.max) return;
    lv.xp += Math.max(0, amount);
    while (lv.level < levelCap(grid.maxTier) && lv.xp >= xpNeeded(lv.level)) {
      lv.xp -= xpNeeded(lv.level);
      lv.level += 1;
      events.push({ type: 'levelUp', level: lv.level, reason, odds: spawnOdds(spawnLevel(), grid.maxTier) });
    }
    // the top level has no bar; at the cap the bar fills and waits (XP past a full bar is lost)
    lv.xp = lv.level >= LEVELS.max ? 0 : Math.min(lv.xp, xpNeeded(lv.level));
  }

  /** The run's first 512: 2s stop spawning (said once). */
  function checkNo2() {
    if (!levels || s.no2 || grid.maxTier < LEVELS.no2Tier) return;
    s.no2 = true;
    events.push({ type: 'no2', tier: LEVELS.no2Tier, odds: spawnOdds(spawnLevel(), grid.maxTier) });
  }

  /** Iron Fist: the monsters in the moving blocks' way take a punch (each one once, from the biggest block). */
  function punch(paths, dir) {
    for (const { foe, path } of punchTargets(paths, defense.enemies, dir, fist)) {
      const dealt = defense.damage(foe, turretDamage(path.tier) * fist.mult, ['physical']);
      if (dealt <= 0) continue;
      events.push({ type: 'punch', id: foe.id, x: foe.x, y: foe.y, from: { x: cellX(path.to.col), y: cellY(path.to.row) }, dir, tier: path.tier, amount: dealt, kill: !!foe.dead, boss: !!foe.boss });
    }
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

  /** Fusion picks wait behind the news of what made them, then open like the die pick. */
  function queueFusionPicks() {
    for (const c of fusionPicks.splice(0)) {
      choices.push(c);
      events.push({ type: 'choice', ...c });
    }
  }

  function choose(index) {
    const c = choices.shift();
    if (!c) return false;
    const offer = c.offers[Math.max(0, Math.min(c.offers.length - 1, index))];
    if (c.kind === 'fusion') {
      // the block becomes the fusion picked (from its own material); now it is announced
      const t = grid.tiles.find((x) => x.id === c.tileId);
      if (t) {
        t.cls = { ...t.cls, element: offer.element, fusion: offer.fusion };
        t.prof = null;
        t.mats = mergeMaterial(materialOf(t), elementsOf(t.cls));
        events.push({ type: 'classed', tileId: t.id, stage: 2, element: t.cls.element, x: t.x, y: t.y, tier: t.tier, chosen: true, promoted: !!c.promoted, info: describeStage(t.cls, 2, t.tier) });
      }
      return true;
    }
    owned.push(offer.element);
    events.push({ type: 'dieGained', element: offer.element, tier: c.tier, offer });
    // die unlocks queued together must not offer the die just taken
    for (const next of choices) if (next.kind === 'die') next.offers = dieOffers(owned, diceRng);
    for (let i = choices.length - 1; i >= 0; i--) if (choices[i].kind === 'die' && !choices[i].offers.length) choices.splice(i, 1);
    return true;
  }

  /**
   * A boss x2 that lifts a block into a new class stage: at 16 it rolls its
   * element; at 256 the fusion comes from the block's own material when that has
   * a second element (a pick when there are several: returns -2, announced with
   * the pick), else a roll from the deck; at 4096 the ultimate rolls from the deck
   * (there is no partner block to borrow from). Fills one slot per call; returns
   * the stage filled, 0 when none.
   */
  function promoteClass(t) {
    t.prof = null;
    const slots = stageFor(t.tier);
    if (slots >= 1 && !t.cls.element) {
      const e = roll([]);
      if (!e) return 0;
      t.cls.element = e;
      t.mats = mergeMaterial(materialOf(t), [e]);
      return 1;
    }
    if (slots >= 2 && !t.cls.fusion) {
      // from its own material when that has a second element (a pick when there are several, if the
      // block stops at the fusion stage; one that jumps on to 4096 takes the first, as its ultimate builds on it)
      const material = mergeMaterial(materialOf(t), elementsOf(t.cls));
      const offers = material.length >= 2 ? fusionOffers(t.cls, material) : [];
      if (offers.length) {
        t.cls = { ...t.cls, element: offers[0].element, fusion: offers[0].fusion };
        if (offers.length > 1 && slots === 2) {
          fusionPicks.push({ kind: 'fusion', tileId: t.id, tier: t.tier, offers, promoted: true });
          return -2; // filled, announced with the pick
        }
        return 2;
      }
      const e = roll(elementsOf(t.cls));
      if (!e) return 0;
      t.cls.fusion = e;
      t.mats = mergeMaterial(material, [e]);
      return 2;
    }
    if (slots >= 3 && !t.cls.ultimate) {
      const e = roll(elementsOf(t.cls));
      if (!e) return 0;
      t.cls.ultimate = e;
      t.mats = mergeMaterial(materialOf(t), [e]);
      return 3;
    }
    return 0;
  }

  // Warn once each time the board locks; a boss reward can reopen merges.
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
      t.maxHp = hpFor(t.tier);
      t.hp = t.maxHp;
    }
    events.push({ type: 'tilesRestored', count: grid.tiles.length });
    events.push({ type: 'waveStart', wave: s.waveNo, boss: wave.boss, chapter: wave.chapter.name, count: wave.count, lanes: wave.lanes });
  }

  function clearWave() {
    const bonus = waveBonusFor(s.waveNo);
    events.push({ type: 'waveClear', wave: s.waveNo, bonus });
    addCoins(bonus, 'clear');
    gainXp(LEVELS.xp.waveClear, 'clear');
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
    const paths = fist ? slidePaths(grid.tiles, dir) : null; // Iron Fist: where each block goes
    if (!grid.move(dir)) return false; // a swipe that changes nothing is free
    s.coins -= cost;
    s.swipes += 1;
    events.push({ type: 'spend', amount: cost, total: s.coins, next: swipeCostFor(s.swipes) });
    let merges = 0;
    for (const e of grid.drainEvents()) {
      events.push(e);
      if (e.type !== 'merge') continue;
      merges += 1;
      if (e.combo === ECONOMY.comboAt) addCoins(cost, 'combo', e.x, e.y);
    }
    events.push(...notes.splice(0)); // what the merges made: new classes, overridden colours
    queueFusionPicks();
    if (paths) punch(paths, dir);
    if (ks?.merges && merges >= ks.merges) {
      // Quake Boots: a swipe with enough merges stuns the monsters on the board
      const top = grid.tiles.reduce((m, t) => Math.max(m, t.tier), 1);
      const stunned = defense.stunBoard(ks.stun, turretDamage(top) * ks.stomp);
      if (stunned) events.push({ type: 'stomp', merges, stunned }); // ('quake' is Earth's Quake Stomp attack)
    }
    if (paths || ks?.merges) drainDefense(); // their kills pay now, even with a die card about to open
    gainXp(merges * LEVELS.xp.merge, 'merge'); // also levels up a full bar whose cap a new top block just raised
    checkNo2();
    scanUnlocks();
    checkLock();
    aimGuidedWave();
    return true;
  }

  /**
   * XP can be bought below the cap (bought XP never waits on a level the board doesn't allow yet),
   * and only while a level still changes the odds (Lucky Clover reaches the top odds 2 levels early).
   */
  const canBuyXp = () => lv.level < LEVELS.max && lv.level < levelCap(grid.maxTier) && spawnLevel() < LEVELS.max;

  /** The defense's news: kills pay (score, coins, a boss's x2s); everything goes on to the renderer. */
  function drainDefense() {
    for (const e of defense.drainEvents()) {
      events.push(e);
      if (e.type !== 'kill') continue;
      s.killScore += e.bounty;
      s.kills += 1;
      // Metal marks foes: a marked foe drops bonus coins (and the Coin Purse adds its share)
      addCoins(Math.round(killCoinsFor(s.waveNo, e.boss) * (1 + (e.loot ?? 0)) * (1 + (ks?.killPct ?? 0))), 'kill', e.x, e.y);
      if (e.boss) {
        // boss reward: x2s for the other blocks, as many as the biggest block's power of two (boss-reward.js).
        // Blocks at 0 health this step are about to fall: they take no x2 (and pair with nothing).
        const live = grid.tiles.filter((t) => t.hp > 0);
        const { x2s, pairs, plan } = planBossReward(live, GRID.size, bossRng);
        for (const { id, x2 } of plan) {
          const t = live.find((b) => b.id === id);
          if (!grid.promote(t, x2)) continue;
          for (const g of grid.drainEvents()) events.push(g);
          const grow = hpFor(t.tier) - (t.maxHp ?? 0);
          t.maxHp = hpFor(t.tier);
          t.hp = Math.min(t.maxHp, (t.hp ?? 0) + grow);
          // a block that jumps several stages (an 8 that becomes a 256) fills each slot in turn
          for (let stage = promoteClass(t); stage; stage = promoteClass(t)) {
            if (stage > 0) events.push({ type: 'classed', tileId: t.id, stage, element: t.cls.element, x: t.x, y: t.y, tier: t.tier, promoted: true, info: describeStage(t.cls, stage, t.tier) });
          }
        }
        events.push({ type: 'bossReward', x2s, pairs, blocks: plan.length, boss: e.enemy?.def?.name ?? null, wave: s.waveNo });
        queueFusionPicks(); // a block the reward lifted to 256 picks its fusion
        checkLock(); // (no unlock check: the reward never raises the biggest block)
      }
    }
  }

  /** Buy XP: LEVELS.buy.xp spawn XP for the price of LEVELS.buy.swipes swipes (TFT's Buy XP). */
  function buyXp() {
    if (!levels || s.over || choices.length || !canBuyXp()) return false;
    const price = buyXpPrice(swipeCostFor(s.swipes));
    if (s.coins < price) {
      events.push({ type: 'noCoins', cost: price, coins: s.coins, reason: 'xp' });
      return false;
    }
    s.coins -= price;
    events.push({ type: 'buyXp', price, xp: LEVELS.buy.xp, total: s.coins });
    gainXp(LEVELS.buy.xp, 'buy');
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
      // out of coins (or a locked board) in a break: nothing to do but wait, so the wait gets short
      if (s.phase === 'break' && brokeBreak != null && s.timer > brokeBreak && (s.coins < swipeCostFor(s.swipes) || s.locked) && !choices.length) {
        s.timer = brokeBreak;
        events.push({ type: 'breakShortened', wave: s.waveNo, timer: brokeBreak });
      }
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

    roam?.step(grid.tiles, defense.enemies, dt);
    defense.step(dt, grid.tiles);
    drainDefense();
    // Phoenix Feather: when the last blocks fall together, the biggest rises again, once a run, as the
    // biggest block lost this run (with its element) when that one was bigger
    const falling = grid.tiles.filter((t) => t.hp <= 0);
    if (s.phoenix && falling.length && falling.length === grid.tiles.length) {
      const keep = falling.reduce((b, t) => (t.tier > b.tier ? t : b));
      if (s.fallen && s.fallen.tier > keep.tier && grid.promote(keep, s.fallen.tier - keep.tier)) {
        keep.cls = { ...s.fallen.cls };
        keep.mats = mergeMaterial(materialOf(keep), s.fallen.mats);
        keep.prof = null;
        for (const g of grid.drainEvents()) events.push(g);
      }
      keep.maxHp = hpFor(keep.tier);
      keep.hp = keep.maxHp * ks.reviveHp;
      keep.downed = false; // its next fall says who broke it (defense 'tileDown')
      s.phoenix = false;
      const blasted = defense.blastBoard();
      events.push({ type: 'phoenix', id: keep.id, x: keep.x, y: keep.y, tier: keep.tier, blasted });
      addCoins(ks.rebuildSwipes * swipeCostFor(s.swipes), 'phoenix', keep.x, keep.y); // coins to rebuild with
    }
    // blocks whose hidden health ran out are destroyed for good
    let lost = 0;
    for (const t of [...grid.tiles]) {
      if (t.hp > 0) continue;
      if (!s.fallen || t.tier > s.fallen.tier) s.fallen = { tier: t.tier, cls: { ...t.cls }, mats: materialOf(t) };
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
    buyXp,
    /** First run: aim wave 1 at the player's biggest block (see aimGuidedWave); off restores the normal wave 1. */
    setGuidedWave: (v) => {
      s.guidedWave = !!v;
      if (s.guidedWave) aimGuidedWave();
      else if (s.waveNo === 1 && s.phase === 'prep') wave = waveFor(1);
    },
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
    /** Fusions' pets roam the field (createRun({ roaming })). */
    get roaming() {
      return roaming;
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
    /** The opening countdown is held (the first-run tutorial is still teaching). */
    get holding() {
      return !!s.hold && s.phase === 'prep';
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
    /** The keepsake brought into this run (its id), or null. */
    get keepsake() {
      return ks?.id ?? null;
    },
    /** Phoenix Feather is still unused this run. */
    get phoenixReady() {
      return !!s.phoenix;
    },
    /** The spawn level is on (off: classic 90/10 spawns). */
    get levelsOn() {
      return levels;
    },
    /** Spawn level (1 to LEVELS.max) and the XP toward the next one. */
    get level() {
      return lv.level;
    },
    get xp() {
      return lv.xp;
    },
    /** XP needed to leave this level (Infinity at the top). */
    get xpNeed() {
      return xpNeeded(lv.level);
    },
    /** The level the spawn odds use (Lucky Clover adds to it). */
    get spawnLevel() {
      return levels ? spawnLevel() : 0;
    },
    /** The odds of the next new block: [{ tier, value, pct }] (null with levels off). */
    get spawnOdds() {
      return levels ? spawnOdds(spawnLevel(), grid.maxTier) : null;
    },
    /** The run made a 512: 2s no longer spawn. */
    get no2() {
      return s.no2;
    },
    /** What Buy XP costs now (null when it can't be bought: levels off, the top level, or the level cap). */
    get buyXpPrice() {
      return levels && canBuyXp() ? buyXpPrice(swipeCostFor(s.swipes)) : null;
    },
    /** The highest level the board allows now (src/sim/levels.js levelCap). */
    get levelCap() {
      return levels ? levelCap(grid.maxTier) : 0;
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
