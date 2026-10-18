import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { autoCast, createAutoplay } from '../src/autoplay.js';

const fusion = (element, second) => ({ element, fusion: second, buffs: {} });
/** A run with three 1024s (two fusion pets and a single) whose defense charges and summons on demand. */
function setup(charge) {
  const r = createRun({ seed: 1, empty: true, levels: false });
  const tiles = [fusion('fire', 'ice'), fusion('earth', 'wind'), { element: 'metal' }].map((cls, i) => {
    const t = r.spawnDebug(10, i, 0);
    t.cls = cls;
    return t;
  });
  const sent = [];
  r.defense.skillCharge = (id) => charge(tiles.findIndex((t) => t.id === id));
  r.defense.summon = (t) => (sent.push(t.id), (t.summon = { key: 'x', t: 0 }), true);
  return { r, tiles, sent };
}

test('autoCast casts every ready summon (fusion pets at 1024+, charged, home) and says how many', () => {
  const { r, tiles, sent } = setup((i) => (i === 1 ? 0.5 : 1));
  assert.equal(autoCast(r), 1);
  assert.deepEqual(sent, [tiles[0].id], 'not the half-charged one, not the single');
  assert.equal(autoCast(r), 0, 'the pet is out');
});

test('the bot casts a ready summon as it plays', () => {
  const { r, tiles, sent } = setup(() => 1);
  const bot = createAutoplay();
  bot.toggle();
  bot.tick(r, 1 / 60, (d) => r.move(d));
  assert.deepEqual(sent, [tiles[0].id, tiles[1].id]);
});
