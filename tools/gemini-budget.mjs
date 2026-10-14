// Weekly Gemini image budget. Every generated image is logged with its estimated
// cost in tools/.cache/gemini-usage.json; generation warns and STOPS once the
// rolling 7-day spend (or image count) reaches 80% of the weekly limit.
//
// The Gemini API has no weekly quota of its own (limits are per minute/day and a
// tier billing cap), so the weekly limit is ours, set in tools/gemini-budget.json:
//   { "weeklyLimitUsd": 58.33, "weeklyLimitImages": null, "stopAt": 0.8 }
// The default spreads the Tier 1 billing cap ($250) over a 30-day month: $58.33/week.
// Prices: ai.google.dev/gemini-api/docs/pricing (Oct 2026), standard tier, 1K images.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const PRICES = {
  'gemini-nano-banana-2.1': 0.0336,
  'gemini-3.1-flash-lite-image': 0.0336,
  'gemini-3.1-flash-image': 0.067,
  'gemini-3-pro-image': 0.134,
  'gemini-2.5-flash-image': 0.039,
};
const FALLBACK_PRICE = 0.134; // unknown model: assume the most expensive
export const WEEK_MS = 7 * 24 * 3600 * 1000;
export const DEFAULT_LIMITS = { weeklyLimitUsd: 58.33, weeklyLimitImages: null, stopAt: 0.8 };

/** Estimated cost of one image (batch requests are half price). */
export function costOf(model, { batch = false } = {}) {
  const p = PRICES[model] ?? FALLBACK_PRICE;
  return batch ? p / 2 : p;
}

/** Spend and image count in the 7 days before `now`. */
export function weeklyUsage(ledger, now = Date.now()) {
  let usd = 0;
  let images = 0;
  for (const e of ledger) {
    if (now - e.t > WEEK_MS || e.t > now) continue;
    usd += e.usd;
    images += 1;
  }
  return { usd, images };
}

/**
 * May we spend `nextUsd` more? Stops when the week's spend (or image count)
 * after this request would reach `stopAt` of the limit.
 * → { ok, pct, usage, reason }
 */
export function checkBudget(ledger, limits = DEFAULT_LIMITS, nextUsd = 0, now = Date.now()) {
  const L = { ...DEFAULT_LIMITS, ...limits };
  const usage = weeklyUsage(ledger, now);
  const pctUsd = L.weeklyLimitUsd ? (usage.usd + nextUsd) / L.weeklyLimitUsd : 0;
  const pctImg = L.weeklyLimitImages ? (usage.images + (nextUsd > 0 ? 1 : 0)) / L.weeklyLimitImages : 0;
  const pct = Math.max(pctUsd, pctImg);
  if (pct >= L.stopAt) {
    const what = pctUsd >= pctImg ? `$${(usage.usd + nextUsd).toFixed(2)} of $${L.weeklyLimitUsd}` : `${usage.images + 1} of ${L.weeklyLimitImages} images`;
    return { ok: false, pct, usage, reason: `weekly Gemini budget at ${Math.round(pct * 100)}% (${what}); stop line is ${Math.round(L.stopAt * 100)}%` };
  }
  return { ok: true, pct, usage, reason: '' };
}

export function loadLimits(file) {
  if (!existsSync(file)) return { ...DEFAULT_LIMITS };
  try {
    return { ...DEFAULT_LIMITS, ...JSON.parse(readFileSync(file, 'utf8')) };
  } catch {
    return { ...DEFAULT_LIMITS };
  }
}

export function loadLedger(file) {
  if (!existsSync(file)) return [];
  try {
    const d = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export function appendLedger(file, entry) {
  const ledger = loadLedger(file);
  ledger.push(entry);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(ledger, null, 1));
  return ledger;
}
