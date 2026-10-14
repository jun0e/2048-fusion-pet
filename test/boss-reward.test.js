import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBossReward } from '../src/sim/boss-reward.js';
import { createRng } from '../src/sim/rng.js';

const block = (id, tier, col, row) => ({ id, tier, col, row });

/** The board after the plan: tier by id. */
function after(tiles, plan) {
  const tier = new Map(tiles.map((t) => [t.id, t.tier]));
  for (const { id, x2 } of plan) tier.set(id, tier.get(id) + x2);
  return tier;
}

/** Equal neighbours in rows and columns, gaps allowed (what one swipe can merge). */
function pairs(tiles, tier, size = 4) {
  const cell = new Array(size * size).fill(null);
  for (const t of tiles) cell[t.row * size + t.col] = t.id;
  let n = 0;
  for (let i = 0; i < size; i++) {
    for (const line of [[...Array(size).keys()].map((j) => cell[i * size + j]), [...Array(size).keys()].map((j) => cell[j * size + i])]) {
      const tiers = line.filter((id) => id != null).map((id) => tier.get(id));
      for (let j = 1; j < tiers.length; j++) if (tiers[j] === tiers[j - 1]) n += 1;
    }
  }
  return n;
}

test('one x2 per power of two in the biggest block: they multiply up to it', () => {
  const tiles = [block(1, 8, 0, 0), block(2, 1, 1, 0), block(3, 1, 3, 0), block(4, 2, 0, 2), block(5, 3, 2, 1), block(6, 4, 3, 3), block(7, 5, 1, 3), block(8, 2, 2, 2)];
  for (let seed = 1; seed <= 20; seed++) {
    const { x2s, plan } = planBossReward(tiles, 4, createRng(seed));
    assert.equal(x2s, 8, '256 = 2^8: eight x2s');
    assert.equal(plan.reduce((n, p) => n + p.x2, 0), 8);
    assert.equal(2 ** plan.reduce((n, p) => n + p.x2, 0), 256, 'the x2s multiply up to the biggest block');
    assert.ok(!plan.some((p) => p.id === 1), 'the biggest block gets none');
    const tier = after(tiles, plan);
    for (const t of tiles.slice(1)) assert.ok(tier.get(t.id) <= 8, 'no block grows past the biggest');
    assert.equal(tier.size, tiles.length, 'no new block');
  }
});

test('x2s make pairs first', () => {
  // the 4 next to the 8 needs one x2 to make a pair; the lone 2 makes none
  const tiles = [block(1, 6, 0, 0), block(2, 2, 0, 3), block(3, 3, 1, 3), block(4, 1, 3, 1)];
  for (let seed = 1; seed <= 20; seed++) {
    const { x2s, plan } = planBossReward(tiles, 4, createRng(seed));
    assert.equal(x2s, 6);
    const tier = after(tiles, plan);
    assert.equal(tier.get(2), tier.get(3), 'the 4 and the 8 end as a pair');
    assert.ok(pairs(tiles, tier) >= 1);
  }
  // a board with pairs to make ends with more pairs than it had
  const busy = [block(1, 7, 0, 0), block(2, 1, 1, 0), block(3, 2, 2, 0), block(4, 3, 3, 0), block(5, 2, 0, 1), block(6, 4, 1, 1), block(7, 1, 2, 1), block(8, 3, 3, 1), block(9, 5, 0, 2), block(10, 2, 1, 2)];
  const before = pairs(busy, new Map(busy.map((t) => [t.id, t.tier])));
  for (let seed = 1; seed <= 20; seed++) {
    const { plan } = planBossReward(busy, 4, createRng(seed));
    assert.ok(pairs(busy, after(busy, plan)) >= before + 3, `seed ${seed}: at least 3 new pairs from 7 x2s`);
  }
});

test('one block can take several x2s', () => {
  // the 2 needs three x2s to match the 16 next to it
  const tiles = [block(1, 8, 3, 0), block(2, 1, 0, 2), block(3, 4, 1, 2)];
  const { x2s, plan } = planBossReward(tiles, 4, createRng(1));
  assert.equal(x2s, 8);
  assert.ok(plan.find((p) => p.id === 2).x2 >= 3);
});

test('a pair grows together rather than break, when the other blocks run out of room', () => {
  // after the 4 meets the 8, the lone 16 has room for 2 of the 5 x2s left: the pair takes the rest, together
  const tiles = [block(1, 6, 0, 0), block(2, 2, 0, 3), block(3, 3, 1, 3), block(4, 4, 3, 1)];
  for (let seed = 1; seed <= 10; seed++) {
    const tier = after(tiles, planBossReward(tiles, 4, createRng(seed)).plan);
    assert.equal(tier.get(2), tier.get(3), 'still a pair');
    assert.equal(tier.get(2) + tier.get(3) + tier.get(4), 2 + 3 + 4 + 6, 'all six x2s used');
  }
});

test('spare x2s spread at random: a lone block or a pair growing together', () => {
  // after the 128 meets the 256, no x2 can make a pair: the lone 2 and the pair of 8s share the rest
  const tiles = [block(1, 8, 0, 1), block(2, 7, 1, 1), block(3, 3, 1, 0), block(4, 3, 2, 0), block(5, 1, 3, 3)];
  let pairGrew = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const tier = after(tiles, planBossReward(tiles, 4, createRng(seed)).plan);
    assert.equal(tier.get(2), 8, 'the 128 pairs with the 256 first');
    assert.equal(tier.get(3), tier.get(4), 'the 8s stay a pair');
    if (tier.get(3) > 3) pairGrew += 1;
  }
  assert.ok(pairGrew > 0 && pairGrew < 20, 'sometimes the pair grows, sometimes the lone 2 takes it all');
});

test('a block can grow to equal the biggest and pair with it', () => {
  // the 128 next to the 256 takes one x2: a pair of 256s
  const tiles = [block(1, 8, 0, 0), block(2, 7, 1, 0), block(3, 1, 3, 3)];
  const tier = after(tiles, planBossReward(tiles, 4, createRng(1)).plan);
  assert.equal(tier.get(2), 8);
  assert.equal(tier.get(1), 8, 'the biggest itself is unchanged');
});

test('the biggest block and its equals get none; a full board hands out what fits', () => {
  const ties = [block(1, 8, 0, 0), block(2, 8, 3, 3), block(3, 1, 1, 1)];
  const { x2s, plan } = planBossReward(ties, 4, createRng(1));
  assert.deepEqual(plan, [{ id: 3, x2: 7 }], 'only the 2 grows, up to 256');
  assert.equal(x2s, 7, 'no more room: one of the eight x2s stays unused');
  assert.deepEqual(planBossReward([block(1, 6, 0, 0), block(2, 5, 1, 0)], 4, createRng(1)), { x2s: 1, pairs: 1, plan: [{ id: 2, x2: 1 }] }, 'a 32 next to a 64 takes one: a pair of 64s');
  assert.deepEqual(planBossReward([block(1, 6, 0, 0)], 4, createRng(1)), { x2s: 0, pairs: 0, plan: [] }, 'nothing else on the board');
});

test('the pairs it reports are the pairs the board gained', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rng = createRng(seed * 31);
    const tiles = [];
    let id = 0;
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) if (rng.next() < 0.7) tiles.push(block(id++, 1 + Math.floor(rng.next() * 7), col, row));
    if (tiles.length < 2) continue;
    const before = pairs(tiles, new Map(tiles.map((t) => [t.id, t.tier])));
    const { pairs: made, plan } = planBossReward(tiles, 4, createRng(seed));
    assert.equal(made, pairs(tiles, after(tiles, plan)) - before, `seed ${seed}`);
  }
});

test('the plan is the same for the same RNG', () => {
  const tiles = [block(1, 9, 0, 0), block(2, 1, 1, 0), block(3, 2, 2, 0), block(4, 1, 0, 1), block(5, 3, 1, 1), block(6, 2, 3, 2), block(7, 1, 2, 3)];
  const a = planBossReward(tiles, 4, createRng(42));
  const b = planBossReward(tiles, 4, createRng(42));
  assert.deepEqual(a, b);
  assert.deepEqual(
    tiles.map((t) => t.tier),
    [9, 1, 2, 1, 3, 2, 1],
    'the blocks themselves are not changed',
  );
});
