// The tile card's content, v2 (docs/v2/SPEC.md section 7; src/sim/describe.js): a plain stone block, an
// elemental egg, a fusion egg, a single pet, a fusion pet with its buffs, its summon skill and its state,
// and its pure aura. The attack's numbers come from the sim's own profile (whatever S's rules make it),
// so these tests read them from profileFor rather than copying them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buffBanner, buffList, buffStat, describeTile, effectLines, gainLine, gainTag, mergesTo, pureAura, singlesOf, skillHead, skillState, skillWords, statText, summonLeft } from '../src/sim/describe.js';
import { ELEMENTS, FUSIONS, profileFor, turretDamage } from '../src/sim/classes.js';
import { ELEMENT_STATS, FUSION_SKILLS } from '../src/sim/skills/data.js';
import { V2 } from '../src/config.js';

let ids = 1;
const tile = (tier, cls = {}, extra = {}) => ({ id: ids++, tier, cls, prof: null, ...extra });
const pet = (a, b) => `${a}-${b}-pet`;

test('a plain block is stone: it never hatches, and from 16 it shoots pebbles', () => {
  const egg = describeTile(tile(3));
  assert.equal(egg.kind, 'plain');
  assert.equal(egg.title, 'Stone block');
  assert.equal(egg.stats.length, 0, 'below 16 it does not shoot');
  assert.equal(egg.next, 'Shoots at 16 (1 more merge)');
  const turret = describeTile(tile(5));
  assert.equal(turret.kind, 'plain');
  assert.equal(turret.title, 'Stone turret');
  assert.ok(turret.stats.length === 5 && turret.next === null);
  assert.deepEqual(turret.elements, []);
});

test('an elemental egg says which pet it hatches into, its attack, and how it fuses', () => {
  const d = describeTile(tile(2, { element: 'fire' }));
  assert.equal(d.kind, 'egg');
  assert.equal(d.title, 'Fire egg');
  assert.equal(d.desc, `Hatches into a Fire pet at 16. Its attack: ${ELEMENTS.fire.attack}. ${ELEMENTS.fire.line}`);
  assert.match(d.hint, /another element to make a fusion/);
  assert.equal(d.feed, 'Fed to a fusion: +20% damage');
  assert.equal(d.next, 'Hatches at 16 (2 more merges)');
  assert.equal(d.stats.length, 0);
});

test('a fusion egg names its pet, its fusion and its skill, locked until 1024', () => {
  const d = describeTile(tile(3, { element: 'lightning', fusion: 'nature', buffs: {} }), { petName: pet });
  assert.equal(d.kind, 'egg');
  assert.equal(d.title, 'lightning-nature-pet egg');
  assert.match(d.desc, /^Hatches into lightning-nature-pet at 16: the Thunderbloom fusion of Lightning and Nature\.$/);
  assert.equal(d.skill.name, 'Bloom Ambush');
  assert.equal(d.skill.state, 'locked');
  assert.equal(d.skill.text.includes('{'), false, 'every number filled in');
});

test('a single pet: its real attack, what it gives a fusion, and the fusions it makes with the singles on the board', () => {
  const t = tile(5, { element: 'ice' });
  const board = [t, tile(2, { element: 'fire' }), tile(6, { element: 'earth' }), tile(9, { element: 'poison', fusion: 'metal', buffs: {} }), tile(4, {})];
  const d = describeTile(t, { petName: pet, tiles: board });
  assert.equal(d.kind, 'single');
  assert.equal(d.title, ELEMENTS.ice.attack);
  assert.equal(d.subtitle, 'Ice pet');
  const p = profileFor(t);
  const hit = p.damage ?? turretDamage(5) * p.dmgMult;
  assert.equal(d.stats.find((s) => s.label === 'Damage').value, hit >= 10 ? String(Math.round(hit)) : String(Math.round(hit * 10) / 10));
  assert.equal(d.stats.find((s) => s.label === 'Targets').value, 'Toughest foe');
  assert.equal(d.feed, 'Fed to a fusion: +10% slow');
  // fire (an egg) and earth are singles; the fusion and the plain block are not
  assert.deepEqual(
    d.fuses.map((f) => [f.partner, f.skill, f.pet]),
    [
      ['fire', 'Frostfire Waltz', 'ice-fire-pet'],
      ['earth', 'Glacier Wall', 'ice-earth-pet'],
    ],
  );
  assert.equal(d.pure.active, false);
  assert.equal(d.pure.at, 'Pure Ice at 4096 (7 more merges)');
  assert.deepEqual(describeTile(t, { tiles: [t] }).fuses, [], 'alone: no fusion to make yet (the card says how)');
});

test('the singles on the board: one per element, fusions and plain blocks left out, and never the block itself', () => {
  const a = tile(4, { element: 'fire' });
  const tiles = [a, tile(2, { element: 'ice' }), tile(8, { element: 'fire', fusion: 'ice', buffs: {} }), tile(3, {})];
  assert.deepEqual([...singlesOf(tiles)].sort(), ['fire', 'ice']);
  assert.deepEqual([...singlesOf(tiles, a)], ['ice']);
});

test('a fusion pet: its main and second element, its buffs, its skill in full, its pure form to come', () => {
  const t = tile(10, { element: 'fire', fusion: 'lightning', buffs: { nature: 2, ice: 1 } });
  const d = describeTile(t, { petName: pet, skill: { charge: 0.42, ready: false } });
  assert.equal(d.kind, 'fusion');
  assert.equal(d.title, 'fire-lightning-pet');
  assert.equal(d.subtitle, FUSIONS['fire+lightning'].name);
  assert.deepEqual(d.elements, [
    { element: 'fire', main: true },
    { element: 'lightning', main: false },
  ]);
  assert.deepEqual(
    d.buffs.map((b) => b.text),
    ['+Ice: +10% slow', '+Nature ×2: heals 2% health per second'],
    'in element order, each with what it gives',
  );
  assert.equal(d.skill.name, 'Plasma Barrage');
  assert.match(d.skill.text, /^Every 0\.8 s, punches the nearest foe for 120% damage/);
  assert.equal(d.skill.passive, 'Attacks like Ember Breath, 25% harder, with the effects of Lightning (Chain + Stun).');
  assert.equal(d.skill.state, 'charging');
  assert.equal(d.skill.stateText, 'Charging: 42%');
  assert.equal(d.skill.text.includes('{'), false);
  assert.equal(d.pure.at, 'Pure Fire at 4096 (2 more merges)');
  assert.ok(d.stats.length === 5 && d.effects.length > 0);
});

test('a pure pet: its aura is on, and what it gains itself', () => {
  const d = describeTile(tile(12, { element: 'nature', fusion: 'ice', buffs: {}, pure: true }), { petName: pet, skill: { charge: 1, ready: true } });
  assert.equal(d.pure.active, true);
  assert.equal(d.pure.name, 'Pure Nature');
  assert.equal(d.pure.aura, 'Every block: heals 1.5% health per second.');
  assert.equal(d.pure.self, 'Itself: +60% damage.');
  assert.equal(d.skill.state, 'ready');
  assert.equal(d.next, null);
});

test('the auras a block takes from pure pets: health and regen reach every block, the rest only pets', () => {
  const aura = { fire: 0.25, earth: 0.3 };
  assert.deepEqual(
    describeTile(tile(6, { element: 'ice' }, { aura })).auras.map((a) => a.text),
    ['Pure Fire: +25% damage', 'Pure Earth: +30% health'],
  );
  assert.deepEqual(describeTile(tile(5, {}, { aura })).auras.map((a) => a.text), ['Pure Earth: +30% health'], 'a plain block takes health, not damage');
  assert.deepEqual(describeTile(tile(5, {}, { aura: null })).auras, []);
});

test('the summon: locked below 1024, then charging, ready, and out with its time left', () => {
  const young = tile(8, { element: 'ice', fusion: 'fire', buffs: {} });
  assert.deepEqual(skillState(young), { state: 'locked', charge: 0, left: 0, text: 'Unlocks at 1024 (2 more merges)' });
  const t = tile(V2.summonTier, { element: 'ice', fusion: 'fire', buffs: {} });
  assert.equal(skillState(t).state, 'charging', 'a run without summons yet: charging from empty');
  assert.equal(skillState(t, { charge: 0.5, ready: false }).text, 'Charging: 50%');
  assert.equal(skillState(t, { charge: 1, ready: true }).text, 'Ready: tap its namecard');
  t.summon = { key: 'fire+ice', t: 2.2, dur: 8, phase: 'act', x: 0, y: 10 };
  const out = skillState(t, { charge: 0, ready: false });
  assert.equal(out.state, 'out');
  assert.equal(out.text, 'Out on the field: 6 s left');
  assert.equal(summonLeft(t.summon), 5.8);
  assert.equal(summonLeft({ left: 3 }), 3, 'a `left` the sim keeps wins');
  assert.equal(summonLeft(null), 0);
});

test('every fusion skill reads in full, its numbers filled from the data', () => {
  for (const key of Object.keys(FUSION_SKILLS)) {
    const [a, b] = key.split('+');
    const w = skillWords({ element: a, fusion: b }, 'Pet');
    assert.ok(w.name && !w.name.startsWith('skill.'), key);
    assert.ok(!/[{}]/.test(w.text), `${key}: ${w.text}`);
    assert.equal(w.summon, 'Summons Pet to the front.');
  }
  assert.equal(skillHead(), 'Cooldown 15 s · Out for 8 s · Unlocks at 1024');
  assert.equal(skillHead({ unlock: false }), 'Cooldown 15 s · Out for 8 s', 'the unlock said on its own line');
});

test('element stats, buffs and auras as words, from ELEMENT_STATS', () => {
  assert.equal(statText('fire', 0.2), '+20% damage');
  assert.equal(statText('poison', 2), '+2 poison stack per hit');
  assert.equal(buffStat('ice', 3), `+${Math.round(ELEMENT_STATS.ice.buff * 3 * 100)}% slow`, 'stacks add up');
  assert.equal(pureAura('fire'), 'Every other pet: +25% damage.');
  assert.equal(pureAura('earth'), 'Every block: +30% health.', 'health and regen reach every block');
  assert.equal(gainTag('fire', 2), '+Fire ×2');
  assert.equal(gainLine('metal'), '+Metal: +10% crit chance (double damage)');
  assert.deepEqual(buffList({ nature: 1, fire: 2, ice: 0 }), [
    { element: 'fire', n: 2 },
    { element: 'nature', n: 1 },
  ]);
  assert.equal(mergesTo(8, 10), '2 more merges');
});

test('the buff banner: the pet, what it gained, and what that gives', () => {
  assert.deepEqual(buffBanner({ fire: 1 }, 'Novakit'), { title: 'Novakit +Fire', sub: '+20% damage' });
  assert.deepEqual(buffBanner({ ice: 1, fire: 2 }, 'Mistmaw'), { title: 'Mistmaw +Fire ×2 +Ice', sub: '+40% damage, +10% slow' });
});

test('effect lines cover every component a profile can carry, v2 stats too', () => {
  const lines = effectLines({ burn: { dpsPct: 0.32, dur: 3, max: 3 }, chain: { jumps: 2, range: 2.6, falloff: 0.8 }, loot: { pct: 0.6, dur: 3 }, heal: { chance: 0.2, pct: 0.12 }, knockback: 0.5, pierce: { len: 1.6 } });
  assert.equal(lines.length, 6);
  assert.match(lines.find((l) => l.startsWith('Chain')), /2 more foes within 1.3 cells, 20% less per jump/, 'distances in cells');
  assert.deepEqual(effectLines({ critChance: 0.2, critMult: 2, regen: 0.015, hpMult: 1.25 }), ['Crit: 20% chance of ×2 damage', 'Regen: heals 1.5% of its health per second in a wave', 'Health: +25%']);
});

test('attack speeds show their exact design value: Horn Arc 0.85 / s, not 0.8', () => {
  const attacks = (cls, tier = 4) => describeTile(tile(tier, cls)).stats.find((s) => s.label === 'Attacks').value;
  assert.equal(attacks({ element: 'lightning' }), '0.85 / s');
  assert.equal(attacks({ element: 'earth' }), '0.45 / s', 'Quake Stomp, not 0.5');
  for (const k of Object.keys(ELEMENTS)) assert.equal(attacks({ element: k }), `${profileFor(tile(4, { element: k })).rate} / s`, k);
});

test('the Knockback line says bosses resist after many pushes', () => {
  const line = describeTile(tile(4, { element: 'wind' })).effects.find((l) => l.startsWith('Knockback'));
  assert.match(line, /^Knockback: pushes foes [\d.]+ cells? back; bosses resist it more after 20, 50 and 100 pushes$/);
});

test('the old call (tile, petName) still works', () => {
  const d = describeTile(tile(9, { element: 'fire', fusion: 'ice', buffs: {} }), pet);
  assert.equal(d.title, 'fire-ice-pet');
});
