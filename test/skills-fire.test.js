// v2 fusion skills, fire's group (src/sim/skills/fire.js): each one does what its words say
// (src/i18n/skills-en.js), with its numbers from src/sim/skills/data.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUSION_SKILLS as P } from '../src/sim/skills/data.js';
import { DEFENSE } from '../src/config.js';
import { skillHarness } from './helpers/skill-harness.js';

const HIT = 100;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('Frostfire Waltz: a frost wave freezes the foes around the pet, the fire wave half a beat later shatters them', () => {
  const h = skillHarness('fire+ice', { hit: HIT });
  const a = h.foe(1, 6);
  const b = h.foe(1, 6.6);
  const far = h.foe(3, 1);
  h.act();
  assert.ok(a.freezeT > 0 && b.freezeT > 0, 'frozen by the first beat');
  assert.equal(far.freezeT, 0, 'a foe out of reach is not');
  h.run(P['fire+ice'].periodS / 2 + 0.02);
  // shatter: its share of the hit, and frozen foes take DEFENSE.frozenVuln more
  const blow = h.events('hit').find((x) => x.skill === 'fire+ice' && x.id === a.id);
  assert.ok(blow && near(blow.amount, HIT * P['fire+ice'].shatterPct * (1 + DEFENSE.frozenVuln)), `shattered for ${blow?.amount}`);
  assert.ok(a.burn.stacks > 0, 'and set burning');
  assert.equal(h.fx('ring').length, 2, 'one ring a wave');
});

test('Plasma Barrage: each punch at the nearest foe hits harder than the last; the last one bursts', () => {
  const h = skillHarness('fire+lightning', { hit: HIT });
  const e = h.foe(2, 5);
  h.act();
  h.run(2.5);
  const punches = h.events('hit').filter((x) => x.skill === 'fire+lightning' && x.id === e.id).map((x) => Math.round(x.amount));
  assert.ok(punches.length >= 3, `${punches.length} punches`);
  for (let i = 1; i < punches.length; i++) assert.equal(punches[i] - punches[i - 1], HIT * P['fire+lightning'].rampPct, 'each one 30% more');
  assert.equal(punches[0], HIT * P['fire+lightning'].hitPct);
  const before = e.hp;
  h.run(h.pet.summon.dur);
  assert.ok(before - e.hp >= HIT * P['fire+lightning'].finalPct, 'the plasma burst at the end');
});

test('Brimstone Blast: every poisoned foe on the field goes off, each stack a share of the hit, and burns', () => {
  const h = skillHarness('fire+poison', { hit: HIT });
  h.foe(1, 5); // the crowd the toad spits on
  h.foe(1, 5.3);
  const lone = h.foe(3, 1);
  for (let i = 0; i < 4; i++) h.d.damage(lone, 0, ['poison']);
  lone.poison = { stacks: 4, dps: 0, t: 10 };
  h.act();
  assert.equal(lone.poison.stacks, 0, 'its stacks are spent');
  const blast = h.events('hit').find((x) => x.skill === 'fire+poison' && x.id === lone.id);
  assert.ok(blast && near(blast.amount, HIT * P['fire+poison'].perStackPct * 4), `4 stacks: ${blast?.amount}`);
  assert.ok(lone.burn.stacks > 0, 'it burns');
});

test('Magma Burrow: it erupts under the biggest crowd, stuns it, and the lava outlasts the pet', () => {
  const h = skillHarness('fire+earth', { hit: HIT });
  const crowd = [h.foe(2, 4), h.foe(2, 4.4), h.foe(2, 4.8)];
  h.foe(0, 1);
  h.act();
  for (const e of crowd) assert.ok(e.stunT > 0 && e.hp < e.maxHp, 'hit and knocked up');
  assert.ok(h.d.zones.some((z) => z.kind === 'lava'), 'a lava pool');
  h.run(1);
  assert.ok(crowd[1].burn.stacks > 0, 'the pool burns what stands in it');
  h.run(h.pet.summon.dur - 1); // (a second of it went by above)
  assert.equal(h.pet.summon.phase, 'back');
  h.run(h.pet.summon.hop + 0.1);
  assert.equal(h.pet.summon, undefined, 'the mole is home');
  assert.ok(h.d.zones.some((z) => z.kind === 'lava'), 'its last pool is still there');
});

test('Fire Twister: a twister runs the busiest lane, drags foes into it and burns them every second', () => {
  const h = skillHarness('fire+wind', { hit: HIT });
  const e = h.foe(2, 4);
  h.act();
  const tw = h.d.zones.find((z) => z.kind === 'twister');
  assert.ok(tw, 'the twister');
  const s0 = e.s;
  h.run(2);
  assert.notEqual(e.s, s0, 'dragged along its lane');
  assert.ok(e.hp < e.maxHp && e.burn.stacks > 0, 'hit and burning');
  const ys = [];
  for (let i = 0; i < 8; i++) {
    h.run(0.5);
    ys.push(tw.y);
  }
  assert.ok(Math.max(...ys) - Math.min(...ys) > 2, 'it travels the lane');
});

test('Molten Jaws: it clamps the toughest foe, holds it, and everything hits it harder for a while', () => {
  const h = skillHarness('fire+metal', { hit: HIT });
  const small = h.foe(1, 5, { hp: 500 });
  const big = h.foe(2, 4, { hp: 5000 });
  h.act();
  assert.ok(big.stunT > 0 && big.vulnT > 0, 'held, armour melted');
  assert.equal(big.vulnPct, P['fire+metal'].vulnPct);
  assert.equal(small.vulnT, 0);
  const hp = big.hp;
  h.d.damage(big, 100, ['physical']);
  assert.ok(near(hp - big.hp, 100 * (1 + P['fire+metal'].vulnPct)), 'it takes 50% more');
});

test('Ember Swarm: locusts hunt and burst; a foe that burns to death hatches another, up to the cap', () => {
  const h = skillHarness('fire+nature', { hit: HIT });
  const foes = [h.foe(1, 5, { hp: 150 }), h.foe(2, 5, { hp: 150 }), h.foe(3, 5, { hp: 150 })];
  h.act();
  assert.equal(h.d.minions.filter((m) => m.kind === 'locust').length, P['fire+nature'].count);
  h.run(1.5);
  assert.ok(foes.some((e) => e.burn.stacks > 0 || e.dead), 'they reach the foes and set them burning');
  assert.ok(h.d.minions.length <= P['fire+nature'].max);
  // a foe that dies burning hatches one more locust
  const victim = h.foe(0, 3, { hp: 1 });
  victim.burn = { stacks: 2, dps: 50, t: 3 };
  const before = h.d.minions.length;
  h.run(0.1);
  assert.ok(victim.dead);
  assert.ok(h.d.minions.length >= Math.min(before + 1, P['fire+nature'].max) - 1, 'a new locust');
});
