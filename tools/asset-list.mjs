#!/usr/bin/env node
// Full production asset list for the recommended art direction, built from the game's
// own data (elements, 28 fusions, apex kits, enemies) so names and colours never drift.
//   node tools/asset-list.mjs   → reports/asset-list.csv (one row per asset)
// The human-readable sheet with the proportion spec is reports/Asset list 2048 Siege.md.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssetRows } from '../src/art/asset-catalog.js';
import { PRICES } from './gemini-budget.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rows = buildAssetRows(PRICES['gemini-nano-banana-2.1']);

// --- write ------------------------------------------------------------------------------------
const cols = ['id', 'cat', 'layer', 'name', 'desc', 'style', 'src', 'display', 'method', 'refs', 'priority', 'count', 'gens', 'cost', 'notes'];
const head = ['ID', 'Category', 'Layer', 'Name', 'Description', 'Style', 'Source size', 'Display size', 'Method', 'References', 'Priority', 'Count', 'Est. attempts', 'Est. cost (USD)', 'Notes'];
const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [head.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
writeFileSync(join(root, 'reports', 'asset-list.csv'), csv + '\n');

// summary for the sheet
const sum = (f) => rows.filter(f).reduce((k, r) => k + r.count, 0);
const by = {};
for (const r of rows) {
  const k = `${r.cat}|${r.priority}`;
  by[k] = (by[k] ?? 0) + r.count;
}
const gemini = rows.filter((r) => r.method.startsWith('Gemini'));
const tally = (pri) => {
  const g = gemini.filter((r) => pri.includes(r.priority));
  return { n: g.reduce((k, r) => k + r.count, 0), gens: g.reduce((k, r) => k + r.gens, 0), cost: g.reduce((k, r) => k + r.cost, 0) };
};
console.log(`rows ${rows.length}, assets ${sum(() => true)}`);
console.log('by category|priority', by);
for (const p of [['P0'], ['P0', 'P1'], ['P0', 'P1', 'P2'], ['P0', 'P1', 'P2', 'P3']]) {
  const t = tally(p);
  console.log(`Gemini ${p.join('+')}: ${t.n} images, ~${t.gens} attempts, ~$${t.cost.toFixed(2)}`);
}
