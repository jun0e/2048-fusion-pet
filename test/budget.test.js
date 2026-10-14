import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costOf, weeklyUsage, checkBudget, WEEK_MS, PRICES } from '../tools/gemini-budget.mjs';

const now = Date.UTC(2026, 9, 14);
const entry = (daysAgo, usd = 0.0336) => ({ t: now - daysAgo * 24 * 3600 * 1000, model: 'gemini-nano-banana-2.1', usd });

test('costOf: known prices, batch halves, unknown models assume the dearest', () => {
  assert.equal(costOf('gemini-nano-banana-2.1'), PRICES['gemini-nano-banana-2.1']);
  assert.equal(costOf('gemini-3-pro-image', { batch: true }), 0.067);
  assert.equal(costOf('some-new-model'), 0.134);
});

test('weeklyUsage counts only the last 7 days', () => {
  const u = weeklyUsage([entry(1), entry(6.9), entry(7.1), entry(30)], now);
  assert.equal(u.images, 2);
  assert.ok(Math.abs(u.usd - 0.0672) < 1e-9);
  assert.equal(WEEK_MS, 604800000);
});

test('checkBudget stops at 80% of the weekly dollar limit', () => {
  const limits = { weeklyLimitUsd: 10, stopAt: 0.8 };
  const ledger = Array.from({ length: 230 }, () => entry(2)); // $7.73
  assert.equal(checkBudget(ledger, limits, 0.0336, now).ok, true);
  const more = [...ledger, ...Array.from({ length: 8 }, () => entry(1))]; // $7.99 → next image crosses $8
  const v = checkBudget(more, limits, 0.0336, now);
  assert.equal(v.ok, false);
  assert.match(v.reason, /80%/);
});

test('checkBudget also honours an image-count limit', () => {
  const limits = { weeklyLimitUsd: 1000, weeklyLimitImages: 10, stopAt: 0.8 };
  const ledger = Array.from({ length: 7 }, () => entry(1));
  assert.equal(checkBudget(ledger, limits, 0.0336, now).ok, false); // the 8th image reaches 80%
  assert.equal(checkBudget(ledger.slice(0, 6), limits, 0.0336, now).ok, true);
});

test('old spend drops out of the window', () => {
  const limits = { weeklyLimitUsd: 1, stopAt: 0.8 };
  const ledger = Array.from({ length: 40 }, () => entry(8)); // $1.34, all last week
  assert.equal(checkBudget(ledger, limits, 0.0336, now).ok, true);
});
