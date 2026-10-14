import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEMENT_KEYS,
  FUSIONS,
  APEX,
  fusionKey,
  stageFor,
  activeStages,
  mergeClass,
  describeStage,
  dieOffers,
  profileFor,
  milestonePieces,
} from '../src/sim/classes.js';
import { createRng } from '../src/sim/rng.js';

const block = (tier, cls = {}, id = 1) => ({ id, tier, cls: { ...cls } });

test('eight dice, 28 named fusions covering every pair, an ultimate for each', () => {
  assert.equal(ELEMENT_KEYS.length, 8);
  assert.ok(ELEMENT_KEYS.includes('metal') && ELEMENT_KEYS.includes('nature'));
  const names = new Set();
  for (let i = 0; i < ELEMENT_KEYS.length; i++) {
    for (let j = i + 1; j < ELEMENT_KEYS.length; j++) {
      const k = fusionKey(ELEMENT_KEYS[i], ELEMENT_KEYS[j]);
      assert.ok(FUSIONS[k]?.name, `missing fusion ${k}`);
      assert.equal(k, fusionKey(ELEMENT_KEYS[j], ELEMENT_KEYS[i]), 'fusion key is order independent');
      names.add(FUSIONS[k].name);
    }
  }
  assert.equal(names.size, 28, 'fusion names are unique');
  assert.equal(Object.keys(FUSIONS).length, 28);
  assert.equal(FUSIONS[fusionKey('fire', 'ice')].name, 'Frostnova');
  for (const f of Object.values(FUSIONS)) assert.match(f.color, /^#[0-9a-f]{6}$/, 'every fusion has its own colour');
  assert.equal(new Set(Object.values(FUSIONS).map((f) => f.color)).size, 28, 'all different');
  assert.equal(FUSIONS[fusionKey('nature', 'metal')].name, 'Harvest');
  for (const e of ELEMENT_KEYS) assert.ok(APEX[e]?.name, `apex for ${e}`);
});

test('class stages: dormant below 16, element at 16, fusion at 256, ultimate at 4096', () => {
  assert.equal(stageFor(3), 0);
  assert.equal(stageFor(4), 1);
  assert.equal(stageFor(8), 2);
  assert.equal(stageFor(12), 3);
  assert.equal(activeStages(block(3, { element: 'fire' })), 0, 'a coloured 8 is still dormant');
  assert.equal(activeStages(block(4, { element: 'fire' })), 1);
  assert.equal(activeStages(block(8, { element: 'fire', fusion: 'ice' })), 2);
});

test('below 16 blocks are plain; elemental blocks keep the sliding block’s element', () => {
  const plain = block(3, {}, 3);
  assert.equal(mergeClass(plain, block(2, {}, 1), block(2, {}, 2), () => 'fire'), 0);
  assert.deepEqual(plain.cls, {}, 'an 8 has no element');
  const mover = block(4, { element: 'fire' }, 1);
  const stayer = block(4, { element: 'ice' }, 2);
  const child = block(5, {}, 3);
  assert.equal(mergeClass(child, mover, stayer, () => 'metal'), 0);
  assert.deepEqual(child.cls, { element: 'fire' });
  const other = block(5, {}, 4);
  mergeClass(other, stayer, mover);
  assert.deepEqual(other.cls, { element: 'ice' }, 'the other direction, the other element');
});

test('reaching 16 rolls a random element from the deck', () => {
  const child = block(4, {}, 3);
  const seen = [];
  assert.equal(mergeClass(child, block(3, {}, 1), block(3, {}, 2), (exclude) => (seen.push(exclude), 'nature')), 1);
  assert.deepEqual(child.cls, { element: 'nature' });
  assert.deepEqual(seen, [[]]);
});

test('reaching 256 always fuses: the stayer’s element, or a rolled one when they match', () => {
  const child = block(8, {}, 3);
  assert.equal(mergeClass(child, block(7, { element: 'fire' }, 1), block(7, { element: 'ice' }, 2), () => 'metal'), 2);
  assert.deepEqual(child.cls, { element: 'fire', fusion: 'ice' });

  const same = block(8, {}, 4);
  let asked = null;
  assert.equal(mergeClass(same, block(7, { element: 'fire' }, 1), block(7, { element: 'fire' }, 2), (exclude) => ((asked = exclude), 'earth')), 2);
  assert.deepEqual(same.cls, { element: 'fire', fusion: 'earth' }, 'a matching pair rolls its partner');
  assert.deepEqual(asked, ['fire'], 'never the element it already has');

  const kept = block(9, {}, 7);
  assert.equal(mergeClass(kept, block(8, { element: 'fire', fusion: 'ice' }, 1), block(8, { element: 'earth', fusion: 'wind' }, 2)), 0);
  assert.deepEqual(kept.cls, { element: 'fire', fusion: 'ice' }, 'a full mover overrides the stayer entirely');
});

test('reaching 4096 adds the stayer’s element as the ultimate', () => {
  const child = block(12, {}, 3);
  assert.equal(mergeClass(child, block(11, { element: 'fire', fusion: 'ice' }, 1), block(11, { element: 'ice', fusion: 'earth' }, 2)), 3);
  assert.deepEqual(child.cls, { element: 'fire', fusion: 'ice', ultimate: 'earth' }, 'skips the element the mover already has');
});

test('announcements describe what combined', () => {
  const b = block(12, { element: 'fire', fusion: 'ice', ultimate: 'lightning' });
  const one = describeStage(b.cls, 1, 4);
  assert.equal(one.name, 'Ember Breath');
  assert.deepEqual(one.parts.map((p) => p.name), ['16', 'Fire']);
  const two = describeStage(b.cls, 2, 8);
  assert.equal(two.name, 'Frostnova');
  assert.equal(two.colors.length, 1, 'one unique fusion colour');
  assert.deepEqual(two.parts.map((p) => p.name), ['Fire', 'Ice']);
  const three = describeStage(b.cls, 3, 12);
  assert.equal(three.name, 'Tempest');
  assert.deepEqual(three.parts.map((p) => p.name), ['Frostnova', 'Lightning']);
});

test('new-die offers only show dice you do not own', () => {
  const owned = ['fire', 'ice', 'lightning', 'poison', 'earth'];
  const offers = dieOffers(owned, createRng(3));
  assert.equal(offers.length, 3);
  for (const o of offers) assert.ok(!owned.includes(o.element));
  assert.equal(dieOffers(ELEMENT_KEYS.slice(0, 7), createRng(1)).length, 1);
  assert.equal(dieOffers(ELEMENT_KEYS, createRng(1)).length, 0);
});

test('profiles combine element effects: Frostnova burns and slows; Metal loots; Nature heals', () => {
  const fire = profileFor(block(4, { element: 'fire' }));
  assert.ok(fire.burn && !fire.chill);
  const blue = profileFor(block(8, { element: 'fire', fusion: 'ice' }));
  assert.equal(blue.name, 'Frostnova');
  assert.deepEqual(blue.colors, [FUSIONS[fusionKey('fire', 'ice')].color], 'a unique fusion element');
  assert.ok(blue.burn && blue.chill);
  assert.ok(blue.burn.max > fire.burn.max, 'fusion strengthens the base effect');
  assert.ok(blue.damage > fire.damage, 'higher tier hits harder');
  const ult = profileFor(block(12, { element: 'fire', fusion: 'ice', ultimate: 'earth' }));
  assert.equal(ult.signature.effect, APEX.earth.effect);
  assert.ok(ult.stun && ult.knockback, 'apex element adds its own effects');
  assert.deepEqual(profileFor(block(2)).kinds, ['physical']);
  assert.equal(profileFor(block(3)).shoots, false, 'below 16 a block does not shoot');
  assert.equal(profileFor(block(4, { element: 'fire' })).shoots, true);

  const metal = profileFor(block(4, { element: 'metal' }));
  assert.equal(metal.loot.pct, 0.6);
  const harvest = profileFor(block(8, { element: 'metal', fusion: 'nature' }));
  assert.equal(harvest.name, 'Harvest');
  const nature = profileFor(block(4, { element: 'nature' }));
  assert.ok(harvest.loot.pct > metal.loot.pct && harvest.regrow.pct > nature.regrow.pct, 'both boosted');
  assert.equal(harvest.shoot.pattern, 'pounce', "a fusion attacks with its first element's shape");
});

test('the basic attacks grow from 16 to 128 (one step per merge), and fusions are fully grown', () => {
  const at = (tier, element) => profileFor(block(tier, { element }));
  assert.equal(at(4, 'fire').shoot.reach, 4, 'Ember Breath: 2 cells at 16 …');
  assert.equal(at(7, 'fire').shoot.reach, 6, '… 3 cells at 128');
  assert.equal(at(7, 'fire').burn.max, 3, 'the burn cap stays at 3 (tuned)');
  assert.deepEqual([4, 5, 6, 7].map((t) => at(t, 'lightning').chain.jumps + 1), [3, 4, 5, 6], 'Horn Arc chains 3 → 6 foes');
  assert.equal(at(4, 'ice').freeze.every, 4);
  assert.equal(at(7, 'ice').freeze.every, 3, 'Echo Harpoon freezes every 3rd hit at 128');
  assert.equal(at(5, 'ice').shoot.lanes, 0);
  assert.equal(at(6, 'ice').shoot.lanes, 1, 'from 64 the ping covers the neighbouring lanes');
  assert.equal(at(7, 'wind').shoot.lanes, 1, 'at 128 the gust catches the neighbouring lanes');
  assert.ok(at(7, 'nature').regrow.pct > at(4, 'nature').regrow.pct);
  assert.ok(at(7, 'metal').bite.chance > at(4, 'metal').bite.chance && at(7, 'metal').loot.pct === 1);
  assert.equal(profileFor(block(8, { element: 'fire', fusion: 'wind' })).shoot.reach, 6, 'a fusion breathes the full-grown cone');
});

test('the 4-piece border counts merges to the next milestone', () => {
  assert.deepEqual([3, 4, 5, 6, 7].map(milestonePieces), [-1, 0, 1, 2, 3], '16 → 256: one piece per merge');
  assert.deepEqual([8, 9, 10, 11, 12].map(milestonePieces), [0, 1, 2, 3, -1], 'then again to 4096');
});
