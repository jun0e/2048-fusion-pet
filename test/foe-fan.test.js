// T38 (1): foes that share a spot (pinned at a gate, bunched on a block) fan out sideways so each
// one can be seen and counted. Drawing only: the sim's positions do not change (src/render/foes.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAN, fanOffsets } from '../src/render/foes.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('foes on one spot spread across their lane, at most FAN.spread to each side', () => {
  const two = fanOffsets([{ id: 7, x: 0, y: 16.9 }, { id: 3, x: 0, y: 16.9 }]);
  assert.ok(near(two.get(3), -FAN.spread) && near(two.get(7), FAN.spread), 'two: one to each side, in id order');
  const three = fanOffsets([1, 2, 3].map((id) => ({ id, x: 1, y: 12 + id * 0.05 })));
  assert.deepEqual([1, 2, 3].map((id) => +three.get(id).toFixed(6)), [-FAN.spread, 0, FAN.spread]);
  const many = fanOffsets([1, 2, 3, 4, 5, 6].map((id) => ({ id, x: -3, y: 16.9 })));
  for (const v of many.values()) assert.ok(Math.abs(v) <= FAN.spread + 1e-9, 'never out of the lane');
  assert.ok(FAN.spread <= 0.4, 'a foe (≥ 1.05 wide) stays inside its 2-wide lane');
});

test('foes apart keep their own place, and a crowd keeps its order frame to frame', () => {
  const apart = fanOffsets([{ id: 1, x: -3, y: 16.9 }, { id: 2, x: -1, y: 16.9 }, { id: 3, x: -3, y: 14 }]);
  for (const v of apart.values()) assert.equal(v, 0);
  const a = fanOffsets([{ id: 4, x: 0, y: 10 }, { id: 9, x: 0.05, y: 10.1 }]);
  const b = fanOffsets([{ id: 9, x: 0.05, y: 10.1 }, { id: 4, x: 0, y: 10 }]);
  assert.equal(a.get(4), b.get(4), 'the same offsets whatever the list order');
  // a chain of near neighbours is one crowd
  const chain = fanOffsets([1, 2, 3].map((id) => ({ id, x: 0, y: 10 + id * (FAN.spot * 0.9) })));
  assert.ok(near(chain.get(1), -FAN.spread) && near(chain.get(3), FAN.spread));
});
