// The skill gauntlet: every v2 fusion skill (src/sim/skills) against the same standard wave, on its own
// (its block does not shoot), to compare what each skill is worth and to catch any that throws or idles.
// One summon each; the pet's hit is 100, so damage reads as "hits' worth × 100". Three plain blocks shoot
// pebbles meanwhile, so what a skill does for the rest of the board (holds, melted armour) counts too.
//   node tools/skill-gauntlet.mjs            a table, best first
//   node tools/skill-gauntlet.mjs --json     the rows as JSON
// Columns: dmg (health the foes lost), kills, boss (its health lost), ctl (foe-seconds held: frozen,
// stunned, asleep, afraid, taunted), slow (foe-seconds slowed), saved (block health kept vs. no skill),
// fx (effects drawn), err.
import { skillHarness, fakeBlock } from '../test/helpers/skill-harness.js';
import { SKILL_IMPL } from '../src/sim/skills/index.js';
import { FUSION_SKILLS } from '../src/sim/skills/data.js';
import { PHYSICS } from '../src/config.js';

const HIT = 100;
const SECONDS = 9.5; // out, 8 s of skill, home

/**
 * The standard wave, at the ratio a 1024 fusion meets around wave 25: foes worth 1.5 to 4 of the pet's hits
 * stream down the lanes (one every 0.5 s, round the lanes), a boss worth 25 hits walks lane 1, and three
 * plain blocks stand beside the pet's.
 */
function stage(key) {
  // the plain blocks shoot their own lanes (a pebble of 60 a second each), so a skill that holds foes in
  // range, or makes them take more damage, shows what it adds to the rest of the board
  const PEBBLE = { shoots: true, shoot: { pattern: 'single', reach: 10, lanes: 0, target: 'front' }, rate: 1, damage: 60, kinds: ['physical'], colors: ['#d9d2c5'] };
  const blocks = [0, 2, 3].map((col, i) => fakeBlock(10 + i, { col, row: 3, hp: 2000, ...PEBBLE }));
  const h = skillHarness(key, { hit: HIT, blocks, row: 3 });
  h.pet.hp = h.pet.maxHp = 2000;
  // the pet's own tile keeps shooting while its pet is out (v2), here a plain shot of its hit a second
  Object.assign(h.pet.fakeProf, PEBBLE, { damage: HIT });
  const boss = h.foe(1, 1, { hp: 25 * HIT, speed: 0.7, boss: true });
  boss.atk = 60;
  const foes = [boss];
  let k = 0;
  const spawnNext = () => {
    const e = h.foe(k % 4, 0, { hp: (k % 3 === 2 ? 4 : 1.5) * HIT, speed: 1.6 });
    e.atk = 30;
    foes.push(e);
    k += 1;
  };
  return { h, foes, blocks: [h.pet, ...blocks], spawnNext };
}

function measure(key) {
  const { h, foes, blocks, spawnNext } = stage(key);
  let ctl = 0;
  let slow = 0;
  let err = null;
  try {
    if (key !== null) h.go();
    const n = Math.round(SECONDS / PHYSICS.dt);
    for (let i = 0; i < n; i++) {
      if (i % Math.round(0.5 / PHYSICS.dt) === 0) spawnNext();
      h.run(PHYSICS.dt);
      for (const e of foes) {
        if (e.dead) continue;
        if (e.freezeT > 0 || e.stunT > 0 || e.sleepT > 0 || e.fearT > 0 || e.tauntT > 0) ctl += PHYSICS.dt;
        else if (e.chillT > 0 && e.chillSlow > 0) slow += PHYSICS.dt;
      }
    }
  } catch (x) {
    err = x.message.slice(0, 60);
  }
  const dmg = foes.reduce((sum, e) => sum + (e.maxHp - Math.max(0, e.hp)), 0);
  const kills = foes.filter((e) => e.dead).length;
  const boss = foes[0];
  const blockHp = blocks.reduce((sum, b) => sum + Math.max(0, b.hp), 0);
  return { key, dmg: Math.round(dmg), kills, boss: Math.round(boss.maxHp - Math.max(0, boss.hp)), ctl: +ctl.toFixed(1), slow: +slow.toFixed(1), blockHp: Math.round(blockHp), fx: h.fx().length, foes: foes.length, err };
}

const base = measure(null); // the wave with no skill: what the blocks lose anyway
const rows = Object.keys(FUSION_SKILLS).map((key) => {
  if (!SKILL_IMPL[key]) return { key, missing: true };
  const r = measure(key);
  return { ...r, saved: r.blockHp - base.blockHp };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ base, rows }));
} else {
  const done = [{ ...base, key: '(no skill)', saved: 0 }, ...rows.filter((r) => !r.missing)].sort((a, b) => b.dmg - a.dmg);
  const pad = (v, n) => String(v).padStart(n);
  console.log(`${base.foes} foes (a boss of 25 hits, the rest 1.5 or 4 hits), ${SECONDS} s; no skill: the blocks keep ${base.blockHp} of 8000 health\n`);
  console.log(`${'skill'.padEnd(18)} ${pad('dmg', 7)} ${pad('kills', 5)} ${pad('boss', 5)} ${pad('ctl', 6)} ${pad('slow', 6)} ${pad('saved', 6)} ${pad('fx', 4)}  err`);
  for (const r of done) console.log(`${r.key.padEnd(18)} ${pad(r.dmg, 7)} ${pad(r.kills, 5)} ${pad(r.boss, 5)} ${pad(r.ctl, 6)} ${pad(r.slow, 6)} ${pad(r.saved, 6)} ${pad(r.fx, 4)}  ${r.err ?? ''}`);
  const missing = rows.filter((r) => r.missing).map((r) => r.key);
  if (missing.length) console.log(`\nnot written yet (${missing.length}): ${missing.join(', ')}`);
}
