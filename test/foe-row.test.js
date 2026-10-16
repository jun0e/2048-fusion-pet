// A foe's status row (T38) and a boss's shield mark (T15): src/render/foes.js and src/sim/defense.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BADGES, NUMBER_HALF, badgeRow, foeLabels, labelDrop } from '../src/render/foes.js';
import { bossResistLevel } from '../src/sim/defense.js';
import { DEFENSE } from '../src/config.js';

test('a busy foe shows its two most telling statuses and "+N" for the rest', () => {
  const all = { freeze: 1.2, burn: 3, poison: 6, chill: 0, loot: 60 };
  assert.deepEqual(badgeRow(all), { shield: false, shown: ['freeze', 'burn'], more: 2 });
  assert.deepEqual(badgeRow({ freeze: 0, burn: 0, poison: 2, chill: 35, loot: 0 }), { shield: false, shown: ['poison', 'chill'], more: 0 });
  assert.deepEqual(badgeRow({ freeze: 0, burn: 1, poison: 0, chill: 0, loot: 0 }), { shield: false, shown: ['burn'], more: 0 });
  assert.deepEqual(badgeRow({}), { shield: false, shown: [], more: 0 });
  assert.equal(MAX_BADGES, 2);
});

test("a boss's shield mark takes one of the row's two places", () => {
  const all = { freeze: 0, burn: 3, poison: 6, chill: 40, loot: 0 };
  assert.deepEqual(badgeRow(all, { shield: 2 }), { shield: true, shown: ['burn'], more: 2 });
  assert.deepEqual(badgeRow({ burn: 1 }, { shield: 1 }), { shield: true, shown: ['burn'], more: 0 });
  assert.deepEqual(badgeRow({}, { shield: 3 }), { shield: true, shown: [], more: 0 });
});

test('the shield mark shows the step of pushback resistance a boss has reached (I, II, III)', () => {
  const steps = DEFENSE.bossPushResist.map((r) => r.after);
  assert.equal(bossResistLevel(0), 0);
  assert.equal(bossResistLevel(steps[0] - 1), 0);
  steps.forEach((n, i) => {
    assert.equal(bossResistLevel(n), i + 1, `after ${n} pushes`);
    assert.equal(bossResistLevel(n + 1), i + 1);
  });
});

test("near the gate a foe's labels move down to stay under the news ribbon, elsewhere they stay put", () => {
  for (const U of [19.14, 23.78, 36.83]) {
    for (const boss of [true, false]) {
      const barH = (boss ? 0.2 : 0.13) * U;
      const barY = -(boss ? 1.6 : 0.8) * U; // over the body
      const top = 120; // the HUD's bands end here (the ribbon's bottom + 4 px)
      const rowTop = (y) => {
        const lab = foeLabels({ U, boss, barY: y, barH });
        return lab.y - Math.max(lab.bs / 2, lab.badgePx * NUMBER_HALF);
      };
      // far below the ribbon: nothing moves
      assert.equal(labelDrop({ U, boss, barY, barH, cy: top + 300, top }), 0);
      // a foe whose row would start 10 px up behind the ribbon
      const cy = top + 2 - rowTop(barY) - 10;
      const drop = labelDrop({ U, boss, barY, barH, cy, top });
      assert.ok(Math.abs(drop - 10) < 1e-9, `U ${U}${boss ? ' boss' : ''}: moved ${drop} px`);
      assert.ok(Math.abs(cy + rowTop(barY + drop) - (top + 2)) < 1e-9, 'the row now starts 2 px under the bands');
    }
  }
});
