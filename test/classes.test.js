import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEMENTS,
  ELEMENT_KEYS,
  FUSIONS,
  PLAIN_SHOOT,
  fusionKey,
  singlesOn,
  mergeClass,
  describeStage,
  dieOffers,
  profileFor,
  statsOf,
  grownElement,
  turretDamage,
  milestonePieces,
} from '../src/sim/classes.js';
import { ELEMENT_STATS, FUSION_HIT, PURE_SELF } from '../src/sim/skills/data.js';
import { V2 } from '../src/config.js';
import { createRng } from '../src/sim/rng.js';
import { ELEMENT_PALETTES } from '../src/art/palettes.js';
import { INK, contrast, tone } from '../src/art/tokens.js';

const block = (tier, cls = {}, id = 1) => ({ id, tier, cls: structuredClone(cls) });
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ''} ${a} ≈ ${b}`);
const fusion = (element, second, buffs = {}) => ({ element, fusion: second, buffs });

test('eight elements and 28 named fusions, one per pair (the renderer reads them unchanged)', () => {
  assert.equal(ELEMENT_KEYS.length, 8);
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
  assert.equal(new Set(Object.values(FUSIONS).map((f) => f.color)).size, 28, 'every fusion has a colour of its own');
});

test('singlesOn: the elements that have a single egg or pet on the board (fusions and plain blocks do not count)', () => {
  const tiles = [block(2, { element: 'fire' }), block(5, { element: 'ice' }), block(6, fusion('earth', 'wind')), block(7), block(12, { element: 'metal', pure: true })];
  assert.deepEqual([...singlesOn(tiles)].sort(), ['fire', 'ice', 'metal']);
  assert.equal(singlesOn([]).size, 0);
});

test('merge: plain + plain stays plain at any tier (never an element, never pure)', () => {
  const c = block(5);
  const r = mergeClass(c, block(4), block(4));
  assert.deepEqual(c.cls, {});
  assert.deepEqual(r, { stage: 0, choice: null, gain: null });
  const big = block(12);
  assert.equal(mergeClass(big, block(11), block(11)).stage, 0);
  assert.deepEqual(big.cls, {});
});

test('merge: plain + X and X + plain take X’s class, buffs kept (a copy, not shared)', () => {
  for (const [mover, stayer] of [
    [block(5), block(5, { element: 'fire' })],
    [block(5, { element: 'fire' }), block(5)],
  ]) {
    const c = block(6);
    assert.deepEqual(mergeClass(c, mover, stayer), { stage: 0, choice: null, gain: null });
    assert.deepEqual(c.cls, { element: 'fire' });
  }
  const f = block(7, fusion('fire', 'ice', { metal: 2 }));
  const c = block(8);
  mergeClass(c, block(7), f);
  assert.deepEqual(c.cls, fusion('fire', 'ice', { metal: 2 }));
  assert.notEqual(c.cls.buffs, f.cls.buffs, 'the child’s buffs are its own');
});

test('an egg hatches at 16 (stage 1), from either side; below 16 it stays an egg', () => {
  for (const [mover, stayer] of [
    [block(3, { element: 'ice' }), block(3)],
    [block(3), block(3, { element: 'ice' })],
  ]) {
    const c = block(4);
    assert.equal(mergeClass(c, mover, stayer).stage, 1);
    assert.deepEqual(c.cls, { element: 'ice' });
  }
  const small = block(3);
  assert.equal(mergeClass(small, block(2, { element: 'ice' }), block(2)).stage, 0);
  assert.deepEqual(small.cls, { element: 'ice' });
});

test('single A + single A (cannot happen in play): keeps A', () => {
  const c = block(6);
  assert.deepEqual(mergeClass(c, block(5, { element: 'nature' }), block(5, { element: 'nature' })), { stage: 0, choice: null, gain: null });
  assert.deepEqual(c.cls, { element: 'nature' });
});

test('two single pets of different elements fuse: a fusion choice, the mover’s element main by default', () => {
  const c = block(6);
  const r = mergeClass(c, block(5, { element: 'fire' }), block(5, { element: 'ice' }));
  assert.equal(r.choice.kind, 'fusion');
  assert.deepEqual(r.choice.parts, [
    { element: 'fire', tier: 5 },
    { element: 'ice', tier: 5 },
  ]);
  assert.deepEqual(
    r.choice.offers.map((o) => [o.element, o.fusion, o.key]),
    [
      ['fire', 'ice', 'fire+ice'],
      ['ice', 'fire', 'fire+ice'],
    ],
  );
  assert.equal(r.choice.offers[0].name, 'Frostnova');
  assert.equal(r.choice.offers[0].color, FUSIONS['fire+ice'].color);
  assert.deepEqual(c.cls, fusion('fire', 'ice'), 'until the choice, the block holds offer 0');
  assert.equal(r.stage, 0);
  assert.equal(r.gain, null);
});

test('two eggs of different elements make a fusion egg, with the same choice; two 8-eggs hatch as a fusion', () => {
  const c = block(3);
  const r = mergeClass(c, block(2, { element: 'poison' }), block(2, { element: 'earth' }));
  assert.equal(r.choice.kind, 'fusion');
  assert.deepEqual(c.cls, fusion('poison', 'earth'));
  assert.equal(r.stage, 0);
  const hatch = block(4);
  const h = mergeClass(hatch, block(3, { element: 'wind' }), block(3, { element: 'metal' }));
  assert.equal(h.choice.kind, 'fusion');
  assert.equal(h.stage, 1, 'it reached 16: the run announces it with the choice');
});

test('a single fed into a fusion (either order) adds one buff of its element: no choice, a gain', () => {
  const c = block(7);
  const r = mergeClass(c, block(6, fusion('fire', 'ice')), block(6, { element: 'metal' }));
  assert.deepEqual(c.cls, fusion('fire', 'ice', { metal: 1 }));
  assert.deepEqual(r, { stage: 0, choice: null, gain: { metal: 1 } });

  const c2 = block(7);
  const stayer = block(6, fusion('fire', 'ice', { metal: 1 }));
  const r2 = mergeClass(c2, block(6, { element: 'metal' }), stayer);
  assert.deepEqual(c2.cls, fusion('fire', 'ice', { metal: 2 }), 'buffs stack');
  assert.deepEqual(r2.gain, { metal: 1 });
  assert.deepEqual(stayer.cls.buffs, { metal: 1 }, 'the parent is untouched');

  const own = block(7);
  mergeClass(own, block(6, { element: 'fire' }), block(6, fusion('fire', 'ice')));
  assert.deepEqual(own.cls, fusion('fire', 'ice', { fire: 1 }), 'an element of its own feeds it too');

  const eggs = block(3);
  assert.deepEqual(mergeClass(eggs, block(2, fusion('wind', 'earth')), block(2, { element: 'nature' })).gain, { nature: 1 }, 'eggs follow the same rules');
});

test('two fusions merged: a keep choice; the kept one gains the other’s two elements and all its buffs', () => {
  const mover = block(8, fusion('fire', 'ice', { metal: 1 }));
  const stayer = block(8, fusion('earth', 'wind', { fire: 2 }));
  const c = block(9);
  const r = mergeClass(c, mover, stayer);
  assert.equal(r.choice.kind, 'keep');
  assert.deepEqual(r.choice.offers, [
    { cls: fusion('fire', 'ice', { metal: 1, earth: 1, wind: 1, fire: 2 }), gain: { earth: 1, wind: 1, fire: 2 } },
    { cls: fusion('earth', 'wind', { fire: 3, ice: 1, metal: 1 }), gain: { fire: 1, ice: 1, metal: 1 } },
  ]);
  assert.deepEqual(r.choice.parts, [
    { cls: fusion('fire', 'ice', { metal: 1 }), tier: 8 },
    { cls: fusion('earth', 'wind', { fire: 2 }), tier: 8 },
  ]);
  assert.deepEqual(c.cls, r.choice.offers[0].cls, 'until the choice, the block keeps the mover’s');
  assert.notEqual(c.cls, r.choice.offers[0].cls, 'a copy: the offer stays as offered');
  assert.notEqual(c.cls.buffs, r.choice.offers[0].cls.buffs);
  assert.equal(r.gain, null, 'the run says what was gained once the choice is made');
});

test('reaching 4096 makes the pure form of the main element (stage 3); a pure block stays pure', () => {
  assert.equal(V2.pureTier, 12);
  const single = block(12);
  assert.deepEqual(mergeClass(single, block(11, { element: 'fire' }), block(11)), { stage: 3, choice: null, gain: null });
  assert.deepEqual(single.cls, { element: 'fire', pure: true });

  const fed = block(12);
  const r = mergeClass(fed, block(11, fusion('earth', 'metal')), block(11, { element: 'fire' }));
  assert.deepEqual(fed.cls, { ...fusion('earth', 'metal', { fire: 1 }), pure: true });
  assert.equal(r.stage, 3);
  assert.deepEqual(r.gain, { fire: 1 });

  const fused = block(12);
  const f = mergeClass(fused, block(11, { element: 'ice' }), block(11, { element: 'wind' }));
  assert.equal(f.choice.kind, 'fusion');
  assert.equal(f.stage, 3);
  assert.equal(fused.cls.pure, true);

  const bigger = block(13);
  assert.equal(mergeClass(bigger, block(12, { element: 'ice', pure: true }), block(12)).stage, 0, 'already pure: nothing new');
  assert.deepEqual(bigger.cls, { element: 'ice', pure: true });
});

test('announcements: a hatch, a fusion, a fusion egg hatching, and the pure form', () => {
  const one = describeStage({ element: 'fire' }, 1, 4);
  assert.equal(one.name, 'Ember Breath');
  assert.deepEqual(one.parts.map((p) => p.name), ['16', 'Fire']);
  const two = describeStage(fusion('fire', 'ice'), 2, 8);
  assert.equal(two.name, 'Frostnova');
  assert.deepEqual(two.colors, [FUSIONS['fire+ice'].color]);
  assert.deepEqual(two.parts.map((p) => p.name), ['Fire', 'Ice']);
  const hatch = describeStage(fusion('wind', 'metal'), 1, 4);
  assert.equal(hatch.name, FUSIONS['wind+metal'].name, 'a fusion egg hatches as its fusion');
  assert.deepEqual(hatch.colors, [FUSIONS['wind+metal'].color]);
  const pure = describeStage({ ...fusion('fire', 'ice'), pure: true }, 3, 12);
  assert.equal(pure.name, 'Pure Fire');
  assert.equal(pure.pure, 'fire');
  assert.deepEqual(pure.colors, [ELEMENTS.fire.color]);
  assert.deepEqual(pure.parts.map((p) => p.name), ['Frostnova', 'Fire']);
  assert.equal(describeStage({ element: 'nature', pure: true }, 3, 12).name, 'Pure Nature');
});

test('a new element: 2 offers by default, only elements not in the deck, fewer when it is nearly full', () => {
  assert.equal(V2.offers, 2);
  const owned = ['fire', 'ice', 'lightning', 'poison', 'earth'];
  const offers = dieOffers(owned, createRng(3));
  assert.equal(offers.length, 2);
  for (const o of offers) {
    assert.ok(!owned.includes(o.element));
    assert.deepEqual(Object.keys(o).sort(), ['attack', 'colors', 'desc', 'element', 'line', 'name']);
    assert.equal(o.line, ELEMENTS[o.element].line);
  }
  assert.equal(new Set(offers.map((o) => o.element)).size, 2);
  assert.equal(dieOffers(ELEMENT_KEYS.slice(0, 7), createRng(1)).length, 1);
  assert.equal(dieOffers(ELEMENT_KEYS, createRng(1)).length, 0);
  assert.equal(dieOffers([], createRng(1), 3).length, 3, 'the count can be asked for');
});

test("the element pick says each element in one short line (it fits one line of a 360 px phone's card)", () => {
  for (const k of ELEMENT_KEYS) {
    const { line } = ELEMENTS[k];
    assert.ok(line && line.length <= 28 && line.endsWith('.'), `${k}: "${line}"`);
  }
});

test('profiles: plain blocks shoot pebbles from 16, eggs and small blocks do not shoot, single pets as v1', () => {
  const plain = profileFor(block(4));
  assert.equal(plain.shoots, true);
  assert.equal(plain.dmgMult, 1);
  assert.deepEqual(plain.kinds, ['physical']);
  assert.deepEqual(plain.shoot, PLAIN_SHOOT);
  assert.equal(plain.element, null);
  assert.equal(plain.damage, turretDamage(4));
  assert.equal(profileFor(block(3)).shoots, false, 'below 16 a block does not shoot');
  assert.equal(profileFor(block(3, { element: 'fire' })).shoots, false, 'nor does an egg');

  const fire = profileFor(block(5, { element: 'fire' }));
  const grown = grownElement('fire', 1);
  assert.equal(fire.name, 'Ember Breath');
  assert.equal(fire.element, 'fire');
  assert.deepEqual(fire.colors, [ELEMENTS.fire.color]);
  assert.equal(fire.shoot.reach, grown.shoot.reach);
  assert.equal(fire.dmgMult, ELEMENTS.fire.dmg);
  assert.deepEqual(fire.burn, { dpsPct: grown.burn.dpsPct, dur: grown.burn.dur, max: grown.burn.max });
  assert.equal(fire.damage, turretDamage(5) * ELEMENTS.fire.dmg);
  for (const p of [plain, fire]) {
    assert.equal(p.hpMult, 1);
    assert.equal(p.regen, 0);
    assert.equal(p.critChance, 0);
    assert.equal(p.critMult, 2);
    assert.equal(p.summon, null);
    assert.equal(p.pure, null);
    assert.equal(p.signature, null, 'no v1 ultimates');
  }
  const metal = profileFor(block(4, { element: 'metal' }));
  assert.equal(metal.loot.pct, 0.6);
});

test('the basic attacks grow from 16 to 128 (one step per merge)', () => {
  const at = (tier, element) => profileFor(block(tier, { element }));
  assert.equal(at(4, 'fire').shoot.reach, 4, 'Ember Breath: 2 cells at 16 …');
  assert.equal(at(7, 'fire').shoot.reach, 6, '… 3 cells at 128');
  assert.deepEqual([4, 5, 6, 7].map((t) => at(t, 'lightning').chain.jumps + 1), [3, 4, 5, 6], 'Horn Arc chains 3 → 6 foes');
  assert.equal(at(7, 'ice').freeze.every, 3);
  assert.equal(at(6, 'ice').shoot.lanes, 1, 'from 64 the ping covers the neighbouring lanes');
  assert.ok(at(7, 'nature').regrow.pct > at(4, 'nature').regrow.pct);
});

test('a fusion pet: its main element’s attack fully grown, × FUSION_HIT, plus the second’s effects at boost 1', () => {
  const p = profileFor(block(6, fusion('fire', 'ice')));
  const fire3 = grownElement('fire', 3);
  const ice3 = grownElement('ice', 3);
  assert.equal(p.name, 'Frostnova');
  assert.deepEqual(p.colors, [FUSIONS['fire+ice'].color]);
  assert.equal(p.element, 'fire');
  assert.equal(p.shoot.pattern, 'cone');
  assert.equal(p.shoot.reach, fire3.shoot.reach, 'the main element’s attack at growth 3, even at 64');
  assert.equal(p.rate, ELEMENTS.fire.rate);
  near(p.dmgMult, ELEMENTS.fire.dmg * FUSION_HIT, 'dmgMult');
  near(p.damage, turretDamage(6) * ELEMENTS.fire.dmg * FUSION_HIT, 'damage');
  assert.deepEqual(p.burn, { dpsPct: fire3.burn.dpsPct, dur: fire3.burn.dur, max: fire3.burn.max }, 'its own effects at boost 1');
  assert.deepEqual(p.chill, { slow: ice3.chill.slow, dur: ice3.chill.dur }, 'the second element’s at boost 1 (v1: 1.5)');
  assert.deepEqual(p.freeze, { every: ice3.freeze.every, dur: ice3.freeze.dur });
  assert.ok(p.kinds.includes('fire') && p.kinds.includes('ice'));
  assert.equal(p.summon, null, 'no summon below 1024');

  const other = profileFor(block(6, fusion('ice', 'fire')));
  assert.equal(other.shoot.pattern, 'lance', 'the other main element: the other attack');
  near(other.dmgMult, ELEMENTS.ice.dmg * FUSION_HIT);
  assert.ok(other.burn, 'with fire’s burn');

  const harvest = profileFor(block(8, fusion('metal', 'nature')));
  assert.equal(harvest.shoot.pattern, 'pounce');
  assert.ok(harvest.loot && harvest.regrow && harvest.thorns, 'both elements’ effects');
});

test('the summon: fusion pets from V2.summonTier (1024); never singles or plain blocks', () => {
  assert.equal(V2.summonTier, 10);
  assert.equal(profileFor(block(9, fusion('fire', 'ice'))).summon, null);
  assert.equal(profileFor(block(10, fusion('ice', 'fire'))).summon, 'fire+ice');
  assert.equal(profileFor(block(13, fusion('wind', 'metal'))).summon, 'wind+metal');
  assert.equal(profileFor(block(10, { element: 'fire' })).summon, null);
  assert.equal(profileFor(block(10)).summon, null);
});

test('the pure form hits PURE_SELF harder and names its element', () => {
  const pure = profileFor(block(12, { ...fusion('fire', 'ice'), pure: true }));
  near(pure.dmgMult, ELEMENTS.fire.dmg * FUSION_HIT * PURE_SELF);
  assert.equal(pure.pure, 'fire');
  assert.equal(pure.summon, 'fire+ice');
  const single = profileFor(block(12, { element: 'ice', pure: true }));
  near(single.dmgMult, ELEMENTS.ice.dmg * PURE_SELF);
  assert.equal(single.pure, 'ice');
  assert.equal(profileFor(block(12, { element: 'ice' })).pure, null, 'the flag makes it pure (the sim sets it)');
});

test('element buffs on a fusion: every stat, stacking', () => {
  const f = (buffs, main = 'fire', second = 'ice', tier = 6) => profileFor(block(tier, fusion(main, second, buffs)));
  const base = f({});
  near(f({ fire: 2 }).dmgMult, base.dmgMult * (1 + 2 * ELEMENT_STATS.fire.buff), 'dmg');
  near(f({ ice: 1 }).chill.slow, base.chill.slow + ELEMENT_STATS.ice.buff, 'slow raised');
  assert.equal(f({ ice: 30 }).chill.slow, 0.65, 'slow caps at 0.65');
  assert.deepEqual(f({ ice: 1 }, 'fire', 'lightning').chill, { slow: ELEMENT_STATS.ice.buff, dur: 1.5 }, 'slow added where there was none');
  near(f({ lightning: 2 }).rate, base.rate * (1 + 2 * ELEMENT_STATS.lightning.buff), 'rate');
  assert.deepEqual(f({ poison: 1 }).poison, { dpsPct: 0.1, dur: 3, max: 3, perHit: 1 }, 'poison added: +1 stack per hit');
  const venom = f({ poison: 2 }, 'poison', 'earth');
  assert.equal(venom.poison.perHit, 3, 'its own stack and 2 more');
  assert.equal(venom.poison.max, grownElement('poison', 3).poison.max, 'max ≥ 2 + v');
  assert.equal(venom.poison.dpsPct, grownElement('poison', 3).poison.dpsPct, 'dpsPct ≥ 0.1·v');
  near(f({ earth: 1 }).hpMult, 1 + ELEMENT_STATS.earth.buff, 'hp');
  assert.equal(base.hpMult, 1);
  near(f({ wind: 1 }).shoot.reach, base.shoot.reach * (1 + ELEMENT_STATS.wind.buff), 'range: reach');
  const chain = f({}, 'lightning', 'fire');
  near(f({ wind: 2 }, 'lightning', 'fire').shoot.radius, chain.shoot.radius * (1 + 2 * ELEMENT_STATS.wind.buff), 'range: radius');
  near(f({ metal: 2 }).critChance, 2 * ELEMENT_STATS.metal.buff, 'crit');
  assert.equal(f({ metal: 20 }).critChance, 0.75, 'crit caps at 0.75');
  assert.equal(f({ metal: 1 }).critMult, 2);
  near(f({ nature: 3 }).regen, 3 * ELEMENT_STATS.nature.buff, 'regen');
  assert.deepEqual(statsOf(block(6, fusion('fire', 'ice', { fire: 2, earth: 1 }))), { dmg: 0.4, hp: 0.25 });
});

test('a pure pet’s aura (tile.aura): hp and regen on every block, the other stats only on pets', () => {
  const aura = { fire: ELEMENT_STATS.fire.pure, earth: ELEMENT_STATS.earth.pure, nature: ELEMENT_STATS.nature.pure };
  const withAura = (tier, cls) => profileFor({ ...block(tier, cls), aura });
  const plain = withAura(5);
  assert.equal(plain.dmgMult, 1, 'no damage aura on a plain block');
  near(plain.hpMult, 1 + ELEMENT_STATS.earth.pure);
  near(plain.regen, ELEMENT_STATS.nature.pure);
  near(withAura(2).hpMult, 1 + ELEMENT_STATS.earth.pure, 'small blocks too');
  const single = withAura(5, { element: 'fire' });
  near(single.dmgMult, ELEMENTS.fire.dmg * (1 + ELEMENT_STATS.fire.pure));
  near(single.hpMult, 1 + ELEMENT_STATS.earth.pure);
  const fed = profileFor({ ...block(6, fusion('fire', 'ice', { earth: 1 })), aura: { earth: ELEMENT_STATS.earth.pure } });
  near(fed.hpMult, 1 + ELEMENT_STATS.earth.buff + ELEMENT_STATS.earth.pure, 'buffs and aura add up');
});

test('the profile cache follows the tier, the buffs, the pure flag and the aura', () => {
  const t = block(6, fusion('fire', 'ice'));
  const a = profileFor(t);
  assert.equal(profileFor(t), a, 'cached');
  t.cls.buffs.fire = 1;
  const b = profileFor(t);
  assert.notEqual(b, a);
  assert.ok(b.dmgMult > a.dmgMult);
  t.aura = { lightning: ELEMENT_STATS.lightning.pure };
  const c = profileFor(t);
  assert.notEqual(c, b);
  assert.ok(c.rate > b.rate);
  t.tier = 12;
  t.cls.pure = true;
  const d = profileFor(t);
  assert.equal(d.pure, 'fire');
  t.aura = null;
  assert.notEqual(profileFor(t), d);
});

test('the 4-piece border counts merges to the next milestone', () => {
  assert.deepEqual([3, 4, 5, 6, 7].map(milestonePieces), [-1, 0, 1, 2, 3]);
  assert.deepEqual([8, 9, 10, 11, 12].map(milestonePieces), [0, 1, 2, 3, -1]);
});

test('one colour per element: the UI uses the art palette key, and every tile number stays readable', () => {
  for (const k of ELEMENT_KEYS) {
    assert.equal(ELEMENTS[k].color.toLowerCase(), ELEMENT_PALETTES[k].key.toLowerCase(), `${k}: the UI colour is the art's key`);
    assert.ok(contrast(INK, tone(ELEMENTS[k].color, 0.42)) >= 4.5, `${k}: the tile number reads on its plate`);
  }
  assert.ok(contrast(ELEMENTS.ice.color, ELEMENTS.lightning.color) >= 2, 'ice and lightning read apart');
});
