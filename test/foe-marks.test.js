// v2's skill statuses on foes (docs/v2/SPEC.md section 6), as src/render/foes.js marks them: one mark
// over the head (asleep, afraid, taunted, in that order), a slashed eye when blind, drops when it
// bleeds, a target under its feet when vulnerable, and a body tint that never hides frozen or stunned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEAD_MARKS, MARK_COLORS, markTint, statusMarks } from '../src/render/foes.js';

test('a foe’s timers become its marks: one over its head by order, and the rest each their own', () => {
  assert.deepEqual(statusMarks({}), { head: null, blind: false, bleed: false, vuln: false }, 'a v1 foe has none');
  assert.deepEqual(statusMarks({ sleepT: 0, fearT: 0 }), { head: null, blind: false, bleed: false, vuln: false });
  assert.deepEqual(HEAD_MARKS, ['sleep', 'fear', 'taunt']);
  assert.equal(statusMarks({ sleepT: 2, fearT: 1, tauntT: 1 }).head, 'sleep', 'asleep shows first');
  assert.equal(statusMarks({ fearT: 1, tauntT: 1 }).head, 'fear');
  assert.equal(statusMarks({ tauntT: 0.2 }).head, 'taunt');
  assert.deepEqual(statusMarks({ blindT: 1, bleedT: 2, vulnT: 3 }), { head: null, blind: true, bleed: true, vuln: true });
});

test('the marks read apart: each its own colour; the body tint says asleep, afraid or blind (frozen and stunned read first in foes.js)', () => {
  const colors = Object.values(MARK_COLORS);
  assert.equal(new Set(colors).size, colors.length);
  assert.equal(markTint(statusMarks({ sleepT: 1 })), 0xc9d2f2);
  assert.equal(markTint(statusMarks({ fearT: 1 })), 0xead8ff);
  assert.equal(markTint(statusMarks({ blindT: 1 })), 0xd8ccb8);
  assert.equal(markTint(statusMarks({ vulnT: 1, bleedT: 1 })), null, 'the target and the drops say those');
  assert.equal(markTint(statusMarks({})), null);
});
