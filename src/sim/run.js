// A run of the merge-turret defense: a classic 4×4 2048 board whose blocks are
// turrets, plus the tower-defense layer, in real time:
//   prep  — a short countdown before the first wave
//   wave  — enemies walk down the four lanes onto the board and attack the blocks
//   break — a short countdown before the next wave (the next wave's lanes are telegraphed)
// The board can be swiped at any time, but every swipe costs coins (and, as in
// 2048, spawns a new block). Kills drop coins, clearing a wave pays a bonus and
// three merges in one swipe refund it. There is no selling: a locked board opens
// up when enemies destroy a block or a boss kill's x2s make a pair.
// Elements (v2, docs/v2/SPEC.md): the deck starts with 2. A new block is sometimes an elemental egg
// (V2.eggChance) of a deck element that has no single egg or pet on the board (one single per element).
// Plain blocks stay plain; from 16 they shoot pebbles, and an egg hatches into a single pet. Two singles
// of different elements merge into a fusion (the player picks the main element), a single fed into a
// fusion adds a buff of its element, two fusions merge into the one the player keeps (classes.js
// mergeClass). At 1024 a fusion pet has a summon skill (defense.summon); at 4096 a pet becomes the pure
// form of its main element, whose aura reaches every other block. Spawn levels in V2.unlockLevels each
// offer a new element for the deck (a pick of V2.offers). Choices are cards that pause the run.
// Siege: there is no castle. Every block has hidden health (hpPerTier × tier^hpExp)
// that refills at the start of each wave; enemies on the board attack the nearest
// block; a block at 0 is destroyed for good. The run ends when the last block falls.
// Spawn level (src/sim/levels.js): cleared waves and bought XP raise the level (the
// run's top block caps it), and each level makes bigger new blocks likelier (TFT's
// shop odds); after the run's first 512, 2s stop spawning. A keepsake (src/sim/keepsakes.js) changes
// one rule of the run, e.g. Iron Fist: blocks punch the monsters they slide into.
// Pure and deterministic for a given seed, keepsake and input sequence.

import { createGrid } from './grid.js';
import { createDefense } from './defense.js';
import { generateWave } from './enemies.js';
import { createRng } from './rng.js';
import { planBossReward } from './boss-reward.js';
import { ELEMENT_KEYS, copyCls, describeStage, dieOffers, mergeClass, profileFor, singlesOn, stageFor, turretDamage, withPure } from './classes.js';
import { ELEMENT_STATS } from './skills/data.js';
import { LEVELS, buyXpPrice, levelCap, spawnOdds, spawnTable, xpNeeded } from './levels.js';
import { keepsakeById } from './keepsakes.js';
import { punchTargets, slidePaths } from './punch.js';
import { DEFENSE, DICE, ECONOMY, GRID, GUIDED_WAVE, PHYSICS, SIEGE, V2, cellX, cellY } from '../config.js';

const HATCH_TIER = DEFENSE.classTiers[0]; // 16

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
 * @param levels    the spawn level (on in the game; off: classic 90/10 spawns and no element unlocks, for the showcase and tests)
 * @param keepsake  the keepsake brought into this run (an id from src/sim/keepsakes.js), or null
 * @param roaming   accepted for saved runs; v2 pets stay on their tiles (summons go out instead)
 */
export function createRun({ seed = (Math.random() * 2 ** 32) >>> 0, autoChoose = false, empty = false, dice = null, brokeBreak = ECONOMY.brokeBreak, roaming = false, levels = true, keepsake = null } = {}) {
  const diceRng = createRng((seed ^ 0xa5a5a5a5) >>> 0);
  const eggRng = createRng((seed ^ 0x2545f491) >>> 0); // which new blocks are eggs, and of what (its own stream: other rolls stay put)
  const bossRng = createRng((seed ^ 0x27d4eb2f) >>> 0); // where boss x2s go (its own stream: other rolls stay the same)
  const events = [];
  // the cards that pause the run: new elements { kind: 'die', level, offers }, and the merge choices
  // { kind: 'fusion' | 'keep', tileId, tier, parts, offers, stage } (docs/v2/SPEC.md section 3)
  const choices = [];
  const picks = []; // merge choices a swipe made, queued after its news
  const notes = []; // what merges and spawns made (hatches, buffs, eggs), emitted after the grid's events

  // the deck: DICE.start random elements (or the given ones); new eggs take one with no single on the board
  let owned = dice ? [...dice] : null;
  if (!owned) {
    const pool = [...ELEMENT_KEYS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(diceRng.next() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    owned = pool.slice(0, DICE.start);
  }
  /** A new block is an egg this often, of a deck element with no single on the board (null: a plain block). */
  function rollEgg() {
    const roll = eggRng.next();
    const singles = singlesOn(gridRef?.tiles ?? []);
    const free = owned.filter((e) => !singles.has(e));
    if (roll >= V2.eggChance || !free.length) return null;
    return free[Math.floor(eggRng.next() * free.length)];
  }

  const ks = keepsakeById(keepsake);
  const fist = ks?.punch ?? null; // Iron Fist
  /** A block's hidden health with this run's keepsake (Spiked Collar adds to it). */
  const hpFor = (tier) => Math.round(maxHpFor(tier) * (1 + (ks?.blockHp ?? 0)));
  /** … and with its element stats: earth buffs and an earth aura raise it (profileFor hpMult). */
  const maxHpOf = (t) => Math.round(hpFor(t.tier) * profileFor(t).hpMult);
  const lv = { level: 1, xp: 0 }; // the spawn level and the XP toward the next one
  /** The level the spawn odds use: the player's level, plus Lucky Clover's. */
  const spawnLevel = () => Math.min(LEVELS.max, lv.level + (ks?.levels ?? 0));
  let gridRef = null; // the grid's own first spawns come before `grid` exists

  const grid = createGrid({
    seed,
    spawn: true,
    spawnTable: levels ? () => spawnTable(spawnLevel(), gridRef?.maxTier ?? 0) : null,
    onSpawn: (t, info) => {
      t.cls = {};
      t.maxHp = hpFor(t.tier);
      t.hp = t.maxHp;
      if (!info?.random) return; // debug blocks are plain
      const e = rollEgg();
      if (!e) return;
      t.cls = { element: e };
      // a spawned 16 (the top spawn levels) is a single pet at once
      if (t.tier >= HATCH_TIER) notes.push(classed(t, 1, { spawned: true }));
      else notes.push(eggEvent(t));
    },
    onMerge: (child, mover, stayer) => {
      const res = mergeClass(child, mover, stayer);
      // the merged block keeps the damage its parents had taken (merging doesn't heal); its aura comes
      // from the board (refresh, after the swipe)
      child.aura = mover.aura ?? null;
      child.maxHp = maxHpOf(child);
      child.hp = Math.min(child.maxHp, (mover.hp ?? hpFor(mover.tier)) + (stayer.hp ?? hpFor(stayer.tier)));
      if (res.gain) notes.push(buffed(child, res.gain));
      // a choice is announced once made (the main element decides what the block is)
      if (res.choice) picks.push({ ...res.choice, tileId: child.id, tier: child.tier, stage: res.stage });
      else if (res.stage) notes.push(classed(child, res.stage));
    },
  });
  gridRef = grid;
  grid.clear();
  grid.drainEvents(); // the grid's own first spawns are gone: no news of them
  notes.length = 0;
  if (!empty) {
    // siege opening: two 8s side by side; the first an egg of the deck's first element, so the first
    // sideways swipe hatches a pet
    const egg = grid.spawnDebug(3, 1, 0);
    grid.spawnDebug(3, 2, 0);
    if (owned.length) {
      egg.cls = { element: owned[0] };
      events.push(eggEvent(egg));
    }
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
  refresh();
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

  function classed(t, stage, extra = {}) {
    return { type: 'classed', tileId: t.id, stage, element: t.cls.element, x: t.x, y: t.y, tier: t.tier, ...extra, info: describeStage(t.cls, stage, t.tier) };
  }
  function eggEvent(t) {
    return { type: 'egg', tileId: t.id, element: t.cls.element, tier: t.tier, x: t.x, y: t.y };
  }
  function buffed(t, gain) {
    return { type: 'buffed', tileId: t.id, gain, buffs: { ...t.cls.buffs }, x: t.x, y: t.y, tier: t.tier };
  }

  /** A block's max health follows its tier and element stats; growth adds to its health (it is not a heal), a fallen block stays down. */
  function setMaxHp(t) {
    const max = maxHpOf(t);
    if (t.hp == null) {
      t.maxHp = max;
      t.hp = max;
      return;
    }
    if (t.maxHp === max) return;
    const grow = Math.max(0, max - (t.maxHp ?? max));
    t.maxHp = max;
    if (t.hp > 0) t.hp = Math.min(max, t.hp + grow);
  }

  /**
   * The auras: each pure pet's (ELEMENT_STATS pure, by its main element) reaches every other block, as
   * tile.aura = { element: v } (null when none; profileFor applies it). Then max health, which earth
   * buffs and auras raise.
   */
  function refresh() {
    const tiles = grid.tiles;
    const pures = tiles.filter((t) => t.cls.pure && t.cls.element);
    for (const t of tiles) {
      let aura = null;
      for (const p of pures) {
        if (p === t) continue;
        aura ??= {};
        aura[p.cls.element] = (aura[p.cls.element] ?? 0) + ELEMENT_STATS[p.cls.element].pure;
      }
      t.aura = aura;
      setMaxHp(t);
    }
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
      if (V2.unlockLevels.includes(lv.level)) offerElement(lv.level);
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

  /** A level in V2.unlockLevels: a new element for the deck, a pick of V2.offers (fewer when the deck is nearly full, none when it is full). */
  function offerElement(level) {
    const offers = dieOffers(owned, diceRng);
    if (!offers.length) return;
    const c = { kind: 'die', level, offers };
    choices.push(c);
    events.push({ type: 'choice', ...c });
  }

  /** Merge choices wait behind the news of the swipe that made them, then open like the element pick. */
  function queuePicks() {
    for (const c of picks.splice(0)) {
      choices.push(c);
      events.push({ type: 'choice', ...c });
    }
  }

  function choose(index) {
    const c = choices.shift();
    if (!c) return false;
    const offer = c.offers[Math.max(0, Math.min(c.offers.length - 1, index))];
    if (c.kind === 'die') {
      owned.push(offer.element);
      events.push({ type: 'dieGained', element: offer.element, level: c.level, offer });
      // element picks queued together must not offer the element just taken
      for (const next of choices) if (next.kind === 'die') next.offers = dieOffers(owned, diceRng);
      for (let i = choices.length - 1; i >= 0; i--) if (choices[i].kind === 'die' && !choices[i].offers.length) choices.splice(i, 1);
      return true;
    }
    const t = grid.tiles.find((x) => x.id === c.tileId);
    if (!t) return true;
    if (c.kind === 'fusion') {
      // the fusion made, with the main element picked: its news (it supersedes a hatch)
      t.cls = withPure({ element: offer.element, fusion: offer.fusion, buffs: {} }, t.tier);
      t.prof = null;
      events.push(classed(t, 2, { chosen: true }));
    } else {
      // 'keep': the kept fusion, with what it gained from the other
      t.cls = copyCls(offer.cls);
      t.prof = null;
      events.push(buffed(t, offer.gain));
      if (c.stage === 1) events.push(classed(t, 1));
    }
    if (c.stage === 3) events.push(classed(t, 3));
    refresh();
    return true;
  }

  /**
   * Boss x2s follow the merge rules: a block with an element that passes 16 hatches, one that reaches
   * V2.pureTier becomes pure; plain blocks stay plain (no rolled elements). → the stages reached, in order.
   */
  function promoteClass(t, from) {
    t.prof = null;
    if (!t.cls.element) return [];
    const out = [];
    if (from < HATCH_TIER && t.tier >= HATCH_TIER) out.push(1);
    if (from < V2.pureTier && t.tier >= V2.pureTier) {
      withPure(t.cls, t.tier);
      out.push(3);
    }
    return out;
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
    refresh();
    for (const t of grid.tiles) {
      t.maxHp = maxHpOf(t);
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
    events.push(...notes.splice(0)); // what the merges and the new block made: hatches, buffs, eggs
    queuePicks();
    refresh();
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
      // Metal marks foes: a marked foe drops bonus coins (and the Coin Purse adds its share); a skill can
      // multiply a kill's coins and add spawn XP (Bumper Harvest: coinMult, xp)
      addCoins(Math.round(killCoinsFor(s.waveNo, e.boss) * (1 + (e.loot ?? 0)) * (1 + (ks?.killPct ?? 0)) * (e.coinMult ?? 1)), 'kill', e.x, e.y);
      if (e.xp) gainXp(e.xp, 'kill');
      if (e.boss) {
        // boss reward: x2s for the other blocks, as many as the biggest block's power of two (boss-reward.js).
        // Blocks at 0 health this step are about to fall: they take no x2 (and pair with nothing).
        const live = grid.tiles.filter((t) => t.hp > 0);
        const { x2s, pairs, plan } = planBossReward(live, GRID.size, bossRng);
        for (const { id, x2 } of plan) {
          const t = live.find((b) => b.id === id);
          const from = t.tier;
          if (!grid.promote(t, x2)) continue;
          for (const g of grid.drainEvents()) events.push(g);
          // an egg that jumps past 16 hatches; one that reaches 4096 also turns pure
          for (const stage of promoteClass(t, from)) events.push(classed(t, stage, { promoted: true }));
          setMaxHp(t); // a bigger block has more health (added, not healed)
        }
        events.push({ type: 'bossReward', x2s, pairs, blocks: plan.length, boss: e.enemy?.def?.name ?? null, wave: s.waveNo });
        refresh(); // a block that turned pure brings its aura
        checkLock();
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
    refresh();
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
      // regen (nature buffs and auras): blocks heal a share of their max health per second while the wave runs
      for (const t of grid.tiles) {
        if (!(t.hp > 0) || t.hp >= t.maxHp) continue;
        const regen = profileFor(t).regen;
        if (regen > 0) t.hp = Math.min(t.maxHp, t.hp + regen * t.maxHp * dt);
      }
    }

    defense.step(dt, grid.tiles);
    drainDefense();
    // Phoenix Feather: when the last blocks fall together, the biggest rises again, once a run, as the
    // biggest block lost this run (with its element) when that one was bigger
    const falling = grid.tiles.filter((t) => t.hp <= 0);
    if (s.phoenix && falling.length && falling.length === grid.tiles.length) {
      const keep = falling.reduce((b, t) => (t.tier > b.tier ? t : b));
      if (s.fallen && s.fallen.tier > keep.tier && grid.promote(keep, s.fallen.tier - keep.tier)) {
        keep.cls = copyCls(s.fallen.cls);
        keep.prof = null;
        for (const g of grid.drainEvents()) events.push(g);
      }
      keep.maxHp = maxHpOf(keep);
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
      if (!s.fallen || t.tier > s.fallen.tier) s.fallen = { tier: t.tier, cls: copyCls(t.cls) };
      grid.remove(t, 'destroyed');
      lost += 1;
    }
    if (lost) {
      for (const g of grid.drainEvents()) events.push(g);
      refresh(); // a fallen pure pet takes its aura with it
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
      refresh();
      checkLock();
      return { ok: true, ...price };
    },
    /** A fusion pet's summon charge, 0..1 (the defense keeps it: docs/v2/SPEC.md section 5). */
    skillCharge: (id) => defense.skillCharge(id),
    /** The pet can be summoned now: a fusion pet at V2.summonTier+, home, fully charged. */
    skillReady: (id) => {
      const t = grid.tiles.find((x) => x.id === id);
      return !!t && !s.over && !!profileFor(t).summon && !t.summon && defense.skillCharge(id) >= 1;
    },
    /** Summon a fusion pet to the front (its namecard): true when it went out (defense.summon). */
    castSkill: (id) => {
      const t = grid.tiles.find((x) => x.id === id);
      if (!t || s.over || choices.length || !profileFor(t).summon) return false;
      return defense.summon(t) === true;
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
    /** The run was made with { roaming } (saved runs carry it); v2 pets stay on their tiles. */
    get roaming() {
      return roaming;
    },
    // the summons' field state, for the renderer (docs/v2/SPEC.md section 6)
    get zones() {
      return defense.zones;
    },
    get walls() {
      return defense.walls;
    },
    get traps() {
      return defense.traps;
    },
    get minions() {
      return defense.minions;
    },
    get tethers() {
      return defense.tethers;
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
    /** The deck: the elements new eggs can be. */
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
