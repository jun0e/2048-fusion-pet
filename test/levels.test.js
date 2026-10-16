import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, swipeCostFor } from '../src/sim/run.js';
import { LEVELS, buyXpPrice, levelCap, spawnOdds, spawnTable, xpNeeded } from '../src/sim/levels.js';
import { levelCard } from '../src/ui/run-badges.js';
import { ECONOMY, PHYSICS } from '../src/config.js';

const stepUntil = (run, cond, maxSeconds = 120) => {
  for (let i = 0; i < maxSeconds / PHYSICS.dt && !cond(); i++) run.step();
  return cond();
};
/** Clear wave 1 at once: start it, then kill every foe as it comes. */
function clearWave(r) {
  r.nextWave();
  return stepUntil(r, () => {
    for (const e of r.enemies) if (!e.dead) r.defense.damage(e, 1e9, ['fire']);
    return r.phase === 'break';
  });
}

test('the odds: level 1 is classic 2048, and each level shifts weight toward bigger blocks (TFT shape)', () => {
  assert.deepEqual(spawnTable(1), [
    [1, 90],
    [2, 10],
  ]);
  let prev = null;
  for (let level = 1; level <= LEVELS.max; level++) {
    const row = LEVELS.odds[level - 1];
    assert.equal(row.reduce((a, b) => a + b, 0), 100, `level ${level} adds up to 100`);
    if (prev) {
      assert.ok(row[0] <= prev[0], 'the 2s never get likelier');
      assert.ok(row[2] >= prev[2] && row[3] >= prev[3], 'the 8s and 16s never get rarer');
    }
    prev = row;
  }
  // a new value comes in small: the first 8 and the first 16 at 1%
  assert.equal(LEVELS.odds.find((r) => r[2] > 0)[2], 1);
  assert.equal(LEVELS.odds.find((r) => r[3] > 0)[3], 1);
});

test('after the first 512, 2s stop spawning: the rest of the table shares their weight', () => {
  for (let level = 1; level <= LEVELS.max; level++) {
    assert.ok(!spawnTable(level, 9).some(([tier]) => tier === 1), `no 2 at level ${level}`);
    assert.ok(spawnTable(level, 8).some(([tier]) => tier === 1), `2s before the 512 at level ${level}`);
  }
  assert.deepEqual(spawnOdds(1, 9), [{ tier: 2, value: 4, pct: 100 }]);
  const odds = spawnOdds(5, 9);
  assert.ok(Math.abs(odds.reduce((s, o) => s + o.pct, 0) - 100) <= 1, 'whole percents that still add up');
});

test('the level cap follows the top block (16 → 1, 64 → 3, 512 → 6, 4096 → 9) and XP costs grow', () => {
  assert.equal(levelCap(3), 1);
  assert.equal(levelCap(4), 1);
  assert.equal(levelCap(6), 3);
  assert.equal(levelCap(9), 6);
  assert.equal(levelCap(12), 9);
  assert.equal(levelCap(16), 9);
  for (let l = 2; l < LEVELS.max; l++) assert.ok(xpNeeded(l) > xpNeeded(l - 1));
  assert.equal(xpNeeded(LEVELS.max), Infinity);
  assert.equal(buyXpPrice(7), LEVELS.buy.swipes * 7);
});

test('a run starts at level 1; a cleared wave gives XP; Buy XP costs two swipes and carries over', () => {
  const r = createRun({ seed: 4, empty: true, autoChoose: true });
  r.spawnDebug(6, 0, 0); // a 64: the cap is level 3
  r.spawnDebug(1, 3, 3);
  assert.equal(r.level, 1);
  assert.equal(r.xp, 0);
  assert.deepEqual(r.spawnOdds, spawnOdds(1));
  r.drainEvents();

  const coins = r.coins;
  const price = r.buyXpPrice;
  assert.equal(price, LEVELS.buy.swipes * swipeCostFor(0));
  assert.ok(r.buyXp());
  assert.equal(r.coins, coins - price);
  assert.equal(r.level, 2, 'the 4 XP took level 1 (2 XP) …');
  assert.equal(r.xp, LEVELS.buy.xp - xpNeeded(1), '… and the rest carried over');
  const ev = r.drainEvents();
  assert.ok(ev.some((e) => e.type === 'buyXp' && e.price === price));
  assert.ok(ev.some((e) => e.type === 'levelUp' && e.level === 2 && e.odds.length));

  const xp = r.xp;
  assert.ok(clearWave(r));
  assert.equal(r.xp, xp + LEVELS.xp.waveClear, 'a cleared wave gives XP');
});

test('Buy XP: not without the coins, not at the cap, not at the top level, never with levels off', () => {
  const r = createRun({ seed: 4, empty: true });
  r.spawnDebug(4, 0, 0); // a 16: the cap is level 1
  assert.equal(r.levelCap, 1);
  assert.equal(r.buyXpPrice, null, 'nothing to buy at the cap');
  assert.equal(r.buyXp(), false);

  const poor = createRun({ seed: 4, empty: true });
  poor.spawnDebug(8, 0, 0);
  poor.addCoins(-poor.coins);
  poor.drainEvents();
  assert.equal(poor.buyXp(), false);
  assert.ok(poor.drainEvents().some((e) => e.type === 'noCoins' && e.reason === 'xp'));

  const top = createRun({ seed: 4, empty: true });
  top.spawnDebug(12, 0, 0);
  top.addCoins(1e6);
  while (top.buyXp());
  assert.equal(top.level, LEVELS.max);
  assert.equal(top.xp, 0);
  assert.equal(top.buyXpPrice, null);

  const classic = createRun({ seed: 4, empty: true, levels: false });
  classic.spawnDebug(8, 0, 0);
  assert.equal(classic.buyXp(), false);
  assert.equal(classic.spawnOdds, null);
});

test('at the cap the bar fills and waits; a bigger block raises the cap and the level comes on that swipe', () => {
  const r = createRun({ seed: 9, empty: true, autoChoose: true });
  r.spawnDebug(4, 0, 0);
  r.spawnDebug(4, 1, 0); // two 16s: cap 1 until they merge into a 32
  assert.ok(clearWave(r));
  assert.equal(r.level, 1);
  assert.equal(r.xp, xpNeeded(1), 'a full bar, waiting');
  r.drainEvents();
  assert.ok(r.move('left'));
  assert.equal(r.maxTier, 5);
  assert.equal(r.level, 2, 'the 32 lets the full bar level up');
  assert.ok(r.drainEvents().some((e) => e.type === 'levelUp' && e.level === 2));
});

test('the first 512 says so once, and no 2 spawns after it', () => {
  const r = createRun({ seed: 21, empty: true });
  r.spawnDebug(9, 0, 0);
  r.addCoins(1e5);
  r.drainEvents();
  const spawned = [];
  let no2 = 0;
  for (let i = 0; i < 300; i++) {
    while (r.pendingChoice) r.choose(0); // the 512 brings new-die cards
    if (!['down', 'left', 'right', 'up'].some((d) => r.move(d))) break;
    for (const e of r.drainEvents()) {
      if (e.type === 'no2') no2 += 1;
      if (e.type === 'spawn' && e.col != null) spawned.push(e.tier);
    }
  }
  assert.equal(no2, 1);
  assert.equal(r.no2, true);
  assert.ok(spawned.length > 20);
  assert.ok(!spawned.includes(1), 'no 2 after the 512');
});

test('a spawned 16 hatches like a merged one: an element from the deck, announced', () => {
  const saved = LEVELS.odds[0];
  LEVELS.odds[0] = [0, 0, 0, 100]; // every new block is a 16 (restored below)
  try {
    const r = createRun({ seed: 2, empty: true, dice: ['fire', 'ice'] });
    r.spawnDebug(1, 0, 0);
    r.spawnDebug(2, 3, 3);
    r.drainEvents();
    assert.ok(r.move('right'));
    const ev = r.drainEvents();
    const hatch = ev.find((e) => e.type === 'classed' && e.spawned);
    assert.ok(hatch, 'announced');
    const t = r.tiles.find((x) => x.id === hatch.tileId);
    assert.equal(t.tier, 4);
    assert.ok(['fire', 'ice'].includes(t.cls.element));
  } finally {
    LEVELS.odds[0] = saved;
  }
});

test('the level card: the odds now and next, Buy XP, the cap, the top', () => {
  const base = { level: 2, xp: 3, need: 12, cap: 4, spawnLevel: 2, maxTier: 7, no2: false, keepsake: null, coins: 100, price: 10 };
  const c = levelCard(base);
  assert.equal(c.title, 'Spawn level 2');
  assert.equal(c.xpText, '3 / 12 XP');
  assert.deepEqual(c.now, spawnOdds(2, 7));
  assert.deepEqual(c.next, spawnOdds(3, 7));
  assert.ok(c.buy.ok && c.buy.price === 10);
  assert.ok(!levelCard({ ...base, coins: 5 }).buy.ok, 'short of coins');
  assert.match(levelCard({ ...base, coins: 5 }).buy.note, /Need 10 coins/);
  const capped = levelCard({ ...base, level: 4, cap: 4, price: null }); // a 128 on top: level 4 is the cap
  assert.ok(!capped.buy.ok);
  assert.match(capped.notes.join(' '), /caps the level at 4: a 256 raises it/);
  const top = levelCard({ ...base, level: 9, spawnLevel: 9, price: null });
  assert.equal(top.next, null);
  assert.equal(top.buy.label, 'Top odds');
  // the run's start (two 8s): level 1 is the cap, and a 32 (not a 16) lifts it
  assert.match(levelCard({ ...base, level: 1, cap: 1, maxTier: 3, price: null }).buy.note, /Make a 32 to raise the cap/);
  // Lucky Clover: the next row is the player's next level, with the clover's 2 levels on top
  const lucky = levelCard({ ...base, level: 2, spawnLevel: 4, keepsake: 'luckyClover' });
  assert.equal(lucky.nextLevel, 3);
  assert.deepEqual(lucky.next, spawnOdds(5, 7));
  const maxed = levelCard({ ...base, level: 7, spawnLevel: 9, cap: 9, keepsake: 'luckyClover', price: null });
  assert.equal(maxed.next, null);
  assert.equal(maxed.buy.label, 'Top odds', 'nothing to buy once the odds are at the top');
  const clover = levelCard({ ...base, spawnLevel: 4, keepsake: 'luckyClover' });
  assert.match(clover.notes[0], /Lucky Clover: new blocks use level 4's odds/);
  assert.match(levelCard({ ...base, no2: true }).notes.join(' '), /2s no longer spawn/);
});

test('levels off keep the classic spawns (the showcase): nothing levels', () => {
  const r = createRun({ seed: 3, levels: false, autoChoose: true });
  assert.equal(r.levelsOn, false);
  r.addCoins(500);
  for (let i = 0; i < 40; i++) ['down', 'left', 'right', 'up'].some((d) => r.move(d));
  assert.equal(r.level, 1);
  assert.equal(r.spawnLevel, 0);
  assert.equal(ECONOMY.startCoins > 0, true);
});
