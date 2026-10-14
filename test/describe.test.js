import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeTile, effectLines } from '../src/sim/describe.js';
import { profileFor, turretDamage, ELEMENTS } from '../src/sim/classes.js';

const tile = (tier, cls = {}) => ({ id: 1, tier, cls, prof: null });

test('an egg says it is dormant and when it hatches', () => {
  const d = describeTile(tile(2));
  assert.equal(d.kind, 'egg');
  assert.equal(d.title, 'Egg 4');
  assert.equal(d.stats.length, 0);
  assert.match(d.next, /Hatches at 16 \(2 more merges\)/);
});

test('an element block shows its real attack, numbers and effects', () => {
  const t = tile(5, { element: 'fire' }); // 32
  const d = describeTile(t);
  assert.equal(d.kind, 'element');
  assert.equal(d.title, ELEMENTS.fire.attack);
  assert.equal(d.subtitle, 'Fire · 32');
  const hit = turretDamage(5) * profileFor(t).dmgMult;
  const dmg = d.stats.find((s) => s.label === 'Damage').value;
  assert.equal(dmg, hit >= 10 ? hit.toFixed(0) : hit.toFixed(1).replace(/\.0$/, ''), 'the damage each foe in the cone takes');
  assert.equal(d.stats.find((s) => s.label === 'Targets').value, 'Every foe in the cone');
  assert.ok(d.effects.some((e) => e.startsWith('Burn:')));
  assert.match(d.next, /256 \(3 more merges\)/);
});

test('ranges read in cells and lanes, circles around the block', () => {
  const range = (tier, element) => describeTile(tile(tier, { element })).stats.find((s) => s.label === 'Range').value;
  assert.equal(range(4, 'fire'), '2 cells cone', 'world units shown as cells (1 cell = 2 units)');
  assert.equal(range(7, 'fire'), '3 cells cone');
  assert.equal(range(4, 'lightning'), '3.5-cell circle');
  assert.equal(range(4, 'nature'), '1-cell ring');
  assert.equal(range(4, 'earth'), '1.5 cells deep · 3 lanes');
  assert.equal(range(4, 'wind'), '5 cells · 1 lane');
  assert.equal(describeTile(tile(4, { element: 'ice' })).stats.find((s) => s.label === 'Targets').value, 'Toughest foe');
});

test('a fusion carries both effect sets, its pet name and the namecard skill', () => {
  const d = describeTile(tile(8, { element: 'fire', fusion: 'ice' }), (a, b) => `${a}-${b}-pet`);
  assert.equal(d.kind, 'fusion');
  assert.equal(d.title, 'Frostnova');
  assert.equal(d.petName, 'fire-ice-pet');
  assert.ok(d.effects.some((e) => e.startsWith('Burn:')) && d.effects.some((e) => e.startsWith('Slow:')) && d.effects.some((e) => e.startsWith('Freeze:')));
  assert.match(d.skill, /×5 damage/);
  assert.match(d.next, /Ultimate at 4096/);
});

test('a legendary adds its apex signature and the bigger skill', () => {
  const d = describeTile(tile(12, { element: 'fire', fusion: 'ice', ultimate: 'lightning' }));
  assert.equal(d.kind, 'legend');
  assert.match(d.title, /^Tempest Frostnova$/);
  assert.match(d.signature, /^Tempest: /);
  assert.match(d.skill, /×7 damage/);
  assert.equal(d.next, null);
});

test('effect lines cover every component a profile can carry', () => {
  const lines = effectLines({ burn: { dpsPct: 0.32, dur: 3, max: 3 }, chain: { jumps: 2, range: 2.6, falloff: 0.8 }, loot: { pct: 0.6, dur: 3 }, heal: { chance: 0.2, pct: 0.12 }, knockback: 0.5, pierce: { len: 1.6 } });
  assert.equal(lines.length, 6);
  assert.match(lines.find((l) => l.startsWith('Chain')), /2 more foes within 1.3 cells, 20% less per jump/, 'distances in cells');
});
