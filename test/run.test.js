import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, swipeCostFor, killCoinsFor, breakSecondsFor, maxHpFor } from '../src/sim/run.js';
import { DICE, ECONOMY, PHYSICS, SIEGE, V2 } from '../src/config.js';
import { createAutoplay } from '../src/autoplay.js';
import { ELEMENTS } from '../src/sim/classes.js';

const steps = (run, seconds) => {
  for (let i = 0; i < Math.round(seconds / PHYSICS.dt); i++) run.step();
};
const stepUntil = (run, cond, maxSeconds = 120) => {
  for (let i = 0; i < maxSeconds / PHYSICS.dt && !cond(); i++) run.step();
  return cond();
};
// A simple corner strategy: try moves in priority order.
const bestMove = (run) => ['down', 'left', 'right', 'up'].some((d) => run.move(d));

test('prep, then waves with breaks between them; the board swipes during combat', () => {
  const r = createRun({ seed: 11, autoChoose: true });
  assert.equal(r.phase, 'prep');
  assert.equal(r.waveNo, 1);
  assert.equal(r.coins, ECONOMY.startCoins);
  assert.ok(r.timer > 0, 'a countdown to the first wave');

  const tiles = r.tiles.length;
  assert.ok(bestMove(r));
  assert.equal(r.coins, ECONOMY.startCoins - ECONOMY.swipeBase, 'a swipe costs coins');
  assert.ok(r.tiles.length >= tiles, 'and spawns a new block');
  for (let i = 0; i < 12; i++) bestMove(r); // build some defenders before the wave
  // and a turret in every column (blocks below 16 don't shoot)
  for (let c = 0; c < 4; c++) {
    const t = r.grid.at(c, 3) ?? r.spawnDebug(5, c, 3);
    Object.assign(t, { tier: Math.max(t.tier, 5), cls: { element: 'fire' }, prof: null });
    t.maxHp = t.hp = maxHpFor(t.tier);
  }

  steps(r, ECONOMY.prepSeconds + 0.1);
  assert.equal(r.phase, 'wave', 'the first wave starts by itself');
  steps(r, 2);
  assert.ok(r.enemies.length > 0, 'enemies are walking down their lanes');
  const coins = r.coins;
  assert.ok(bestMove(r), 'swiping works mid-combat');
  assert.ok(r.coins < coins);

  let earned = 0;
  let cleared = null;
  assert.ok(
    stepUntil(r, () => {
      for (const e of r.drainEvents()) {
        if (e.type === 'coins' && e.reason === 'kill') earned += e.amount;
        if (e.type === 'waveClear') cleared = e;
      }
      return cleared || r.over;
    }),
  );
  assert.ok(earned > 0, 'kills drop coins');
  assert.equal(cleared.wave, 1);
  assert.equal(cleared.bonus, ECONOMY.waveClearBase + ECONOMY.waveClearPerWave);
  assert.equal(r.phase, 'break');
  assert.equal(r.waveNo, 2, 'the next wave is already telegraphed');
  assert.ok(r.timer > breakSecondsFor(2) - 0.1, 'a break before wave 2');
  steps(r, breakSecondsFor(2) + 0.1);
  assert.equal(r.phase, 'wave');
});

test('breaks grow from a short wait to a 30 s cap', () => {
  assert.equal(breakSecondsFor(2), ECONOMY.breakBase + 2 * ECONOMY.breakPerWave);
  assert.ok(breakSecondsFor(3) > breakSecondsFor(2));
  assert.equal(breakSecondsFor(40), 30);
});

test('the tutorial can hold the opening countdown', () => {
  const r = createRun({ seed: 1 });
  r.setHold(true);
  steps(r, ECONOMY.prepSeconds + 2);
  assert.equal(r.phase, 'prep', 'still waiting');
  r.setHold(false);
  steps(r, ECONOMY.prepSeconds + 0.1);
  assert.equal(r.phase, 'wave');
});

test('calling the next wave early skips the countdown', () => {
  const r = createRun({ seed: 1 });
  assert.equal(r.nextWave(), true);
  assert.equal(r.phase, 'wave');
  assert.equal(r.nextWave(), false, 'only during prep or a break');
});

test('swipes need coins; an unaffordable or useless swipe is free and changes nothing', () => {
  const r = createRun({ seed: 3, empty: true });
  r.spawnDebug(1, 0, 0);
  const coins = r.coins;
  assert.equal(r.move('left'), false, 'nothing moves');
  assert.equal(r.coins, coins, 'no charge for a swipe that does nothing');

  r.addCoins(-r.coins + ECONOMY.swipeBase - 1);
  assert.equal(r.move('right'), false);
  assert.equal(r.tiles[0].col, 0, 'the board did not move');
  assert.ok(r.drainEvents().some((e) => e.type === 'noCoins' && e.cost === ECONOMY.swipeBase));
});

test('the swipe price rises every few swipes', () => {
  assert.equal(swipeCostFor(0), ECONOMY.swipeBase);
  assert.equal(swipeCostFor(ECONOMY.swipeStepEvery - 1), ECONOMY.swipeBase);
  assert.equal(swipeCostFor(ECONOMY.swipeStepEvery), ECONOMY.swipeBase + ECONOMY.swipeStep);
  const r = createRun({ seed: 7, autoChoose: true });
  r.addCoins(10000);
  let n = 0;
  while (n < ECONOMY.swipeStepEvery && bestMove(r)) n++;
  assert.equal(r.swipes, ECONOMY.swipeStepEvery);
  assert.equal(r.swipeCost, ECONOMY.swipeBase + ECONOMY.swipeStep);
});

test('kills pay coins that grow with the wave; bosses pay much more', () => {
  const r = createRun({ seed: 4, empty: true });
  r.nextWave();
  const foe = r.defense.spawn('pixie', { lane: 0, hpScale: 1 });
  const boss = r.defense.spawn('elfRuler', { lane: 1, hpScale: 1 });
  const coins = r.coins;
  r.defense.damage(foe, 1e9, ['fire']);
  r.defense.damage(boss, 1e9, ['fire']);
  r.step();
  const paid = r.drainEvents().filter((e) => e.type === 'coins' && e.reason === 'kill').map((e) => e.amount);
  assert.deepEqual(paid.sort((a, b) => a - b), [killCoinsFor(1, false), killCoinsFor(1, true)]);
  assert.equal(r.coins, coins + killCoinsFor(1, false) + killCoinsFor(1, true));
  assert.equal(killCoinsFor(5, false), ECONOMY.killBase + 5 * ECONOMY.killPerWave);
  assert.equal(killCoinsFor(5, true), killCoinsFor(5, false) * ECONOMY.bossMult);
});

test('three merges in one swipe refund the swipe', () => {
  const r = createRun({ seed: 9, empty: true, autoChoose: true });
  r.spawnDebug(1, 0, 0);
  r.spawnDebug(1, 1, 0);
  r.spawnDebug(2, 2, 0);
  r.spawnDebug(2, 3, 0);
  r.spawnDebug(3, 0, 1);
  r.spawnDebug(3, 1, 1);
  const before = r.coins;
  assert.ok(r.move('left'));
  assert.ok(r.drainEvents().some((e) => e.type === 'coins' && e.reason === 'combo'));
  assert.equal(r.coins, before, 'the combo paid the swipe back');
});

test('kills marked by Metal drop bonus coins', () => {
  const r = createRun({ seed: 4, empty: true });
  r.nextWave();
  const foe = r.defense.spawn('pixie', { lane: 0, hpScale: 1 });
  foe.lootT = 2;
  foe.lootPct = 0.6;
  r.defense.damage(foe, 1e9, ['fire']);
  r.step();
  const paid = r.drainEvents().find((e) => e.type === 'coins' && e.reason === 'kill');
  assert.equal(paid.amount, Math.round(killCoinsFor(1, false) * 1.6));
});

test('block health is hidden, proportional to value, and refills at the start of each wave', () => {
  const r = createRun({ seed: 2, empty: true, dice: ['fire'] });
  const t = r.spawnDebug(4, 0, 0);
  assert.equal(t.maxHp, maxHpFor(4));
  assert.ok(maxHpFor(6) > maxHpFor(4));
  t.hp = 10;
  r.nextWave();
  assert.equal(t.hp, t.maxHp);
});

test('a merged block keeps the damage its parents had taken', () => {
  const r = createRun({ seed: 2, empty: true, dice: ['fire'] });
  const a = r.spawnDebug(5, 0, 0);
  const b = r.spawnDebug(5, 1, 0);
  a.hp = 100;
  b.hp = 150;
  r.move('left');
  const child = r.tiles.find((t) => t.tier === 6);
  assert.equal(child.maxHp, maxHpFor(6));
  assert.equal(child.hp, 250);
});

test('a block at 0 health is destroyed for good; losing every block ends the run', () => {
  const r = createRun({ seed: 2, empty: true, dice: ['fire'] });
  const a = r.spawnDebug(3, 0, 0);
  const b = r.spawnDebug(3, 2, 2);
  r.nextWave();
  a.hp = 0;
  r.step();
  assert.equal(r.tiles.length, 1);
  assert.ok(r.drainEvents().some((e) => e.type === 'remove' && e.id === a.id && e.reason === 'destroyed'));
  assert.equal(r.over, false);
  b.hp = -5;
  r.step();
  assert.equal(r.over, true);
  assert.equal(r.overReason, 'overrun');
  assert.equal(r.move('left'), false);
  assert.ok(r.drainEvents().some((e) => e.type === 'gameover' && e.reason === 'overrun'));
});

test('enemies left alone eat the board', () => {
  const r = createRun({ seed: 2, empty: true, dice: ['fire'] });
  r.spawnDebug(1, 0, 3);
  r.nextWave(); // a lone 2 cannot hold a wave
  assert.ok(stepUntil(r, () => r.over, 90));
  assert.equal(r.overReason, 'overrun');
});

test('a turret (16+) sells for one swipe; the block is gone and the swipe price is unchanged', () => {
  const r = createRun({ seed: 2, empty: true, dice: ['fire'] });
  const t = r.spawnDebug(4, 0, 0);
  t.cls = { element: 'fire' };
  r.spawnDebug(1, 1, 0);
  const coins = r.coins;
  const cost = r.swipeCost;
  assert.deepEqual(r.discardPrice(t.id), { kind: 'sell', amount: cost });
  assert.deepEqual(r.discard(t.id), { ok: true, kind: 'sell', amount: cost });
  assert.equal(r.coins, coins + cost);
  assert.equal(r.tiles.length, 1);
  assert.equal(r.swipeCost, cost, 'selling is not a swipe');
  const ev = r.drainEvents();
  assert.ok(ev.some((e) => e.type === 'remove' && e.reason === 'sold'));
  assert.ok(ev.some((e) => e.type === 'discard' && e.kind === 'sell'));
});

test('a dormant block (below 16) costs three swipes to break', () => {
  const r = createRun({ seed: 2, empty: true, dice: ['fire'] });
  const egg = r.spawnDebug(2, 0, 0);
  r.spawnDebug(1, 1, 0);
  const coins = r.coins;
  const cost = 3 * r.swipeCost;
  assert.deepEqual(r.discardPrice(egg.id), { kind: 'break', amount: -cost });
  assert.equal(r.discard(egg.id).ok, true);
  assert.equal(r.coins, coins - cost);
  assert.ok(r.drainEvents().some((e) => e.type === 'remove' && e.reason === 'broken'));
});

test('breaking needs the coins, and the last block can never go', () => {
  const r = createRun({ seed: 2, empty: true, dice: ['fire'] });
  const egg = r.spawnDebug(2, 0, 0);
  const other = r.spawnDebug(1, 1, 0);
  r.addCoins(-r.coins); // broke
  assert.deepEqual(r.discard(egg.id), { ok: false, reason: 'coins', cost: 3 * r.swipeCost });
  assert.equal(r.tiles.length, 2);
  assert.ok(r.drainEvents().some((e) => e.type === 'noCoins'));
  r.addCoins(1000);
  assert.equal(r.discard(egg.id).ok, true);
  assert.deepEqual(r.discard(other.id), { ok: false, reason: 'last' });
  assert.equal(r.tiles.length, 1);
});

test('a locked board warns once but the run goes on', () => {
  const r = createRun({ seed: 2, empty: true });
  for (let i = 0; i < 16; i++) r.spawnDebug(((i % 4) + Math.floor(i / 4)) % 2 ? 2 : 1, i % 4, Math.floor(i / 4)); // checkerboard: no equal neighbours
  const coins = r.coins;
  assert.equal(r.move('left'), false);
  assert.equal(r.coins, coins);
  steps(r, 1);
  assert.equal(r.over, false, 'a locked board is not a loss');
  assert.equal(r.drainEvents().filter((e) => e.type === 'locked').length, 1);
  assert.ok(stepUntil(r, () => r.phase === 'wave'), 'waves keep coming');
});

test('a block destroyed by enemies reopens a locked board', () => {
  const r = createRun({ seed: 2, empty: true });
  const tiles = [];
  for (let i = 0; i < 16; i++) tiles.push(r.spawnDebug(((i % 4) + Math.floor(i / 4)) % 2 ? 2 : 1, i % 4, Math.floor(i / 4)));
  r.step();
  assert.equal(r.locked, true);
  r.nextWave();
  tiles[5].hp = 0;
  r.step();
  assert.equal(r.tiles.length, 15);
  assert.equal(r.locked, false);
  assert.ok(r.move('left'), 'the board moves again');
});

/** Kill a boss on a run set up with `blocks` ([tier, col, row]); returns the run and its blocks. */
function killBoss(blocks, opts = {}, setup = () => {}) {
  const r = createRun({ seed: 4, empty: true, autoChoose: true, ...opts });
  const tiles = blocks.map(([tier, col, row]) => r.spawnDebug(tier, col, row));
  tiles.forEach(setup);
  r.nextWave();
  const boss = r.defense.spawn('elfRuler', { hpScale: 1 });
  r.defense.damage(boss, 1e9, ['fire']);
  r.step();
  return { r, tiles, events: r.drainEvents() };
}

test('killing a boss hands out x2s to the other blocks: they multiply up to the biggest block', () => {
  const { r, tiles, events } = killBoss([
    [6, 0, 0],
    [1, 1, 0],
    [2, 2, 2],
    [3, 3, 3],
  ]);
  const [big, ...rest] = tiles;
  assert.equal(big.tier, 6, 'the biggest block gets no x2');
  assert.equal(r.tiles.length, 4, 'no new block');
  const added = rest.reduce((n, t, i) => n + t.tier - [1, 2, 3][i], 0);
  assert.equal(added, 6, '64 = 2^6: six x2s');
  assert.ok(rest.every((t) => t.tier <= 6), 'no block grows past the biggest');
  const reward = events.find((e) => e.type === 'bossReward');
  assert.equal(reward.x2s, 6);
  const promotes = events.filter((e) => e.type === 'promote');
  assert.equal(reward.blocks, promotes.length);
  assert.equal(
    promotes.reduce((n, e) => n + e.by, 0),
    6,
  );
  for (const t of rest) assert.equal(t.maxHp, maxHpFor(t.tier), 'health grows with the block');
});

test('a block that falls in the boss-kill step takes no x2', () => {
  const r = createRun({ seed: 4, empty: true, autoChoose: true });
  r.spawnDebug(6, 0, 0);
  const doomed = r.spawnDebug(2, 1, 0);
  r.spawnDebug(1, 3, 3);
  r.nextWave();
  doomed.hp = -3; // broken this step, swept after the reward
  const boss = r.defense.spawn('elfRuler', { hpScale: 1 });
  r.defense.damage(boss, 1e9, ['fire']);
  r.step();
  assert.ok(!r.tiles.includes(doomed), 'it fell');
  assert.equal(doomed.tier, 2, 'with no x2 on the way out');
  assert.ok(r.drainEvents().find((e) => e.type === 'bossReward').x2s > 0, 'the others still got theirs');
});

test('same seed and inputs replay the same run', () => {
  const play = () => {
    const r = createRun({ seed: 21, autoChoose: true });
    for (let i = 0; i < 60 * 60 && !r.over; i++) {
      if (i % 40 === 0) bestMove(r);
      r.step();
    }
    return JSON.stringify({
      wave: r.waveNo,
      coins: r.coins,
      score: r.score,
      blocks: r.blocks,
      tiles: r.tiles.map((t) => [t.tier, t.col, t.row, t.cls.element ?? '']),
    });
  };
  assert.equal(play(), play());
});

test('a siege run opens with two 8s side by side: an egg of the deck’s first element and a plain 8; the first sideways swipe hatches a pet', () => {
  const r = createRun({ seed: 9, dice: ['wind', 'fire'] });
  assert.deepEqual(
    r.tiles.map((t) => [t.tier, t.col, t.row, t.cls.element ?? null]),
    [
      [3, 1, 0, 'wind'],
      [3, 2, 0, null],
    ],
  );
  const egg = r.drainEvents().find((e) => e.type === 'egg');
  assert.deepEqual([egg.element, egg.tier, egg.tileId], ['wind', 3, r.tiles[0].id], 'the egg is announced');
  assert.ok(r.move('left'));
  const pet = r.tiles.find((t) => t.tier === 4);
  assert.deepEqual(pet.cls, { element: 'wind' });
  const hatch = r.drainEvents().find((e) => e.type === 'classed');
  assert.equal(hatch.stage, 1);
  assert.equal(hatch.info.name, ELEMENTS.wind.attack, 'announced with its attack');
  assert.equal(hatch.tileId, pet.id);
  const deck = createRun({ seed: 9 });
  assert.equal(deck.tiles[0].cls.element, deck.owned[0], 'a random deck: its first element');
});

test('you start with 2 elements in the deck; plain blocks never gain one, and from 16 they shoot pebbles', () => {
  const r = createRun({ seed: 3, empty: true, levels: false, dice: ['fire', 'ice'] });
  assert.equal(DICE.start, 2);
  assert.equal(createRun({ seed: 3 }).owned.length, 2);
  r.spawnDebug(3, 0, 0);
  r.spawnDebug(3, 0, 1);
  r.drainEvents();
  assert.ok(r.move('down'));
  const t = r.grid.at(0, 0);
  assert.equal(t.tier, 4);
  assert.deepEqual(t.cls, {}, 'two plain 8s make a plain 16');
  assert.ok(!r.drainEvents().some((e) => e.type === 'classed'), 'nothing hatched');
  assert.equal(t.prof?.shoots ?? true, true);
});

test('boss x2s follow the merge rules: an egg hatches at 16 and turns pure at 4096; a plain block stays plain', () => {
  const { tiles, events } = killBoss(
    [
      [12, 0, 0],
      [3, 3, 3],
    ],
    {},
    (t, i) => i === 1 && (t.cls = { element: 'fire' }),
  );
  const egg = tiles[1];
  assert.equal(egg.tier, 12, 'the only other block takes all the x2s it has room for');
  assert.deepEqual(egg.cls, { element: 'fire', pure: true });
  assert.deepEqual(
    events.filter((x) => x.type === 'classed' && x.tileId === egg.id).map((x) => [x.stage, x.promoted]),
    [
      [1, true],
      [3, true],
    ],
    'it hatched, then became pure',
  );
  const plain = killBoss([
    [9, 0, 0],
    [3, 3, 3],
  ]);
  assert.equal(plain.tiles[1].tier, 9);
  assert.deepEqual(plain.tiles[1].cls, {}, 'no rolled element');
  assert.ok(!plain.events.some((x) => x.type === 'classed'));
});

test('summons: skillCharge and skillReady read the defense; castSkill sends a fusion pet (1024+) out through defense.summon', () => {
  const r = createRun({ seed: 1, empty: true, levels: false });
  const pet = r.spawnDebug(10, 0, 0);
  pet.cls = { element: 'fire', fusion: 'ice', buffs: {} };
  const single = r.spawnDebug(10, 1, 0);
  single.cls = { element: 'earth' };
  const young = r.spawnDebug(9, 2, 0);
  young.cls = { element: 'wind', fusion: 'metal', buffs: {} };
  assert.equal(r.skillCharge(pet.id), 0, 'the stub charges nothing');
  assert.equal(r.skillReady(pet.id), false);
  const sent = [];
  r.defense.skillCharge = () => 1;
  r.defense.summon = (t) => (sent.push(t.id), true);
  assert.equal(r.skillCharge(pet.id), 1);
  assert.equal(r.skillReady(pet.id), true);
  assert.equal(r.skillReady(single.id), false, 'a single pet has no summon');
  assert.equal(r.skillReady(young.id), false, 'a fusion below 1024 neither');
  assert.equal(r.skillReady(999), false);
  assert.equal(r.castSkill(pet.id), true);
  assert.deepEqual(sent, [pet.id]);
  assert.equal(r.castSkill(single.id), false);
  assert.equal(r.castSkill(999), false);
  pet.summon = { key: 'fire+ice', t: 0, dur: V2.summon.durS, phase: 'out', x: 0, y: 12, facing: 1, lane: 0 };
  assert.equal(r.skillReady(pet.id), false, 'not while it is out');
  r.defense.summon = () => false;
  delete pet.summon;
  assert.equal(r.castSkill(pet.id), false, 'the defense says no: not cast');
  // an open card pauses the run: no summon (and not shown as ready)
  r.grid.remove(single);
  r.grid.remove(young); // (only the new pair merges: the pet stays where it is)
  r.spawnDebug(5, 0, 3).cls = { element: 'fire' };
  r.spawnDebug(5, 1, 3).cls = { element: 'ice' };
  r.defense.summon = () => true;
  assert.ok(r.move('left'));
  assert.equal(r.pendingChoice?.kind, 'fusion');
  assert.equal(r.grid.at(0, 0), pet, 'the pet is still home');
  assert.equal(r.skillReady(pet.id), false);
  assert.equal(r.castSkill(pet.id), false);
  r.choose(0);
  assert.equal(r.skillReady(pet.id), true, 'ready again once the card is gone');
});

test('kill rewards a skill changes: coinMult multiplies the coins, xp adds spawn XP (Bumper Harvest)', () => {
  const r = createRun({ seed: 4, empty: true });
  r.spawnDebug(8, 0, 0); // a 256: the level cap is 5
  r.nextWave();
  const drain = r.defense.drainEvents;
  r.defense.drainEvents = () => drain().map((e) => (e.type === 'kill' ? { ...e, coinMult: 3, xp: 1 } : e));
  const foe = r.defense.spawn('pixie', { lane: 0, hpScale: 1 });
  const coins = r.coins;
  r.drainEvents();
  r.defense.damage(foe, 1e9, ['fire']);
  r.step();
  const paid = r.drainEvents().find((e) => e.type === 'coins' && e.reason === 'kill');
  assert.equal(paid.amount, killCoinsFor(1, false) * 3);
  assert.ok(r.coins >= coins + paid.amount);
  assert.equal(r.xp, 1, 'one level XP');
});

test('pets no longer roam: the roaming option is accepted (saved runs carry it) but blocks stay on their tiles', () => {
  const r = createRun({ seed: 5, empty: true, roaming: true, levels: false });
  assert.equal(r.roaming, true);
  const t = r.spawnDebug(9, 0, 0);
  t.cls = { element: 'fire', fusion: 'ice', buffs: {} };
  r.nextWave();
  steps(r, 3);
  assert.equal(t.roam, undefined);
  assert.deepEqual([t.x, t.y], [r.grid.at(0, 0).x, r.grid.at(0, 0).y]);
});

test('the summons’ field state is on the run for the renderer', () => {
  const r = createRun({ seed: 5, empty: true });
  for (const k of ['zones', 'walls', 'traps', 'minions', 'tethers']) assert.equal(r[k], r.defense[k], k);
});

test('coins trickle in during a wave', () => {
  const r = createRun({ seed: 9, empty: true });
  r.spawnDebug(2, 0, 0);
  r.nextWave();
  const before = r.coins;
  steps(r, 2);
  assert.ok(r.coins >= before + Math.floor(SIEGE.incomePerSec * 2) - 1);
});

test('autoplay plays a run: swipes, picks dice and starts waves', () => {
  const r = createRun({ seed: 4 });
  const auto = createAutoplay();
  auto.toggle();
  let swipes = 0;
  for (let i = 0; i < 60 * 60 && !r.over; i++) {
    auto.tick(r, PHYSICS.dt, (d) => (r.move(d) ? ++swipes : false));
    r.step();
  }
  assert.ok(swipes > 20, `it swiped (${swipes})`);
  assert.ok(r.waveNo >= 2, 'it got through waves');
  assert.equal(r.pendingChoice, null, 'no die card left waiting');
});
