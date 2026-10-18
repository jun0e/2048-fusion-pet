// Every v2 fusion skill in the registry, through random fights: foes of every size and speed, bosses,
// foes dying to other causes, a pet whose tile leaves the board mid-skill. Nothing may throw, and once
// the pet is home nothing of its skill may linger (bound pieces, hooks, taunts, tethers).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_IMPL } from '../src/sim/skills/index.js';
import { createRng } from '../src/sim/rng.js';
import { skillHarness, fakeBlock } from './helpers/skill-harness.js';

const KEYS = Object.keys(SKILL_IMPL).filter((k) => k.includes('+') && !k.startsWith('test'));

function fight(key, seed) {
  const rnd = createRng(seed);
  const r = () => rnd.next();
  const blocks = [fakeBlock(20, { col: 0, row: 3, hp: 800 }), fakeBlock(21, { col: 3, row: 2, hp: 800 })];
  const h = skillHarness(key, { hit: 50 + Math.floor(r() * 200), blocks, seed });
  const foes = [];
  const n = Math.floor(r() * 14);
  for (let i = 0; i < n; i++) {
    const e = h.foe(Math.floor(r() * 4), r() * 12, { hp: 20 + r() * 800, speed: r() * 2.2, boss: r() < 0.1 });
    e.atk = 10 + r() * 40;
    foes.push(e);
  }
  const vanish = r() < 0.3 ? 1 + r() * 6 : null; // its tile merges away mid-skill
  h.go();
  let t = 0;
  while (t < 11) {
    h.run(0.25);
    t += 0.25;
    if (r() < 0.15) {
      const e = foes[Math.floor(r() * foes.length)];
      if (e && !e.dead) h.d.damage(e, 1e9, ['physical']); // dies to something else
    }
    if (r() < 0.1) foes.push(h.foe(Math.floor(r() * 4), 0, { hp: 30 + r() * 300, speed: 1 + r() })); // more come
    if (vanish != null && t >= vanish && h.blocks.includes(h.pet)) h.blocks.splice(h.blocks.indexOf(h.pet), 1);
  }
  return h;
}

for (const key of KEYS) {
  test(`${key}: random fights never throw, and nothing lingers once the pet is home`, () => {
    for (let seed = 1; seed <= 6; seed++) {
      const h = fight(key, seed * 97 + key.length);
      assert.equal(h.pet.summon, undefined, `seed ${seed}: the pet came home`);
      const id = h.pet.id;
      for (const list of ['walls', 'traps', 'minions', 'tethers']) {
        assert.ok(!h.d[list].some((p) => p.owner === id && p.bound), `seed ${seed}: no ${list} of its left`);
      }
      assert.ok(!h.d.zones.some((z) => z.owner === id && z.bound), `seed ${seed}: no zones of its left`);
      assert.ok(!h.d.enemies.some((e) => e.tauntBy === id && e.tauntT > 0), `seed ${seed}: nobody still taunted`);
      // the hooks went with it: a fresh foe's death reports no reward of the skill's
      const e = h.foe(0, 1, { hp: 1 });
      h.d.damage(e, 5, ['physical']);
      const kill = h.d.drainEvents().find((x) => x.type === 'kill' && x.id === e.id);
      assert.ok(kill && kill.coinMult == null && kill.xp == null, `seed ${seed}: no kill hook left`);
      assert.ok(h.events('petHome').length === 1, `seed ${seed}: one trip home`);
    }
  });
}

test('the registry has a skill for every fusion as the groups land (and only real fusion keys)', () => {
  for (const key of KEYS) assert.match(key, /^(fire|ice|lightning|poison|earth|wind|metal|nature)\+(fire|ice|lightning|poison|earth|wind|metal|nature)$/);
  assert.ok(KEYS.length >= 7, `${KEYS.length} skills`);
});
