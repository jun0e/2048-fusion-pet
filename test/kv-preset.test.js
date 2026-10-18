// The key-visual showcase's board (src/kv/index.js PRESET) is in v2's class model (docs/v2/SPEC.md
// section 1). The module imports its CSS, so Node reads the preset's literal from the source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ELEMENT_KEYS, FUSIONS, fusionKey } from '../src/sim/classes.js';
import { V2 } from '../src/config.js';

const src = readFileSync(new URL('../src/kv/index.js', import.meta.url), 'utf8');
const literal = src.slice(src.indexOf('export const PRESET = [') + 'export const PRESET = '.length, src.indexOf('];', src.indexOf('export const PRESET = [')) + 1);
// the literal as JSON: comments out, keys and strings double-quoted, no trailing commas (no eval)
const json = literal
  .replace(/\/\/[^\n]*/g, '')
  .replace(/'/g, '"')
  .replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":')
  .replace(/,(\s*[\]}])/g, '$1');
const PRESET = JSON.parse(json);

test('the showcase board is v2: plain blocks, eggs, singles, fusions with buffs, pure forms; one single per element', () => {
  assert.equal(PRESET.length, 16, 'a full board');
  const cells = new Set(PRESET.map(([, col, row]) => `${col},${row}`));
  assert.equal(cells.size, 16, 'one block per cell');
  const singles = [];
  const kinds = new Set();
  for (const [tier, , , cls] of PRESET) {
    assert.ok(!('ultimate' in cls), 'no v1 ultimate');
    if (!cls.element) {
      kinds.add('plain');
      continue;
    }
    assert.ok(ELEMENT_KEYS.includes(cls.element));
    if (cls.fusion) {
      assert.ok(FUSIONS[fusionKey(cls.element, cls.fusion)], `${cls.element}+${cls.fusion} is a fusion`);
      assert.ok(cls.buffs && typeof cls.buffs === 'object', 'a fusion always carries its buffs');
      kinds.add(tier < 4 ? 'fusion egg' : tier >= V2.summonTier ? 'summoner' : 'fusion pet');
    } else {
      singles.push(cls.element);
      kinds.add(tier < 4 ? 'egg' : 'single');
    }
    if (cls.pure) {
      assert.ok(tier >= V2.pureTier, 'pure only at 4096');
      kinds.add('pure');
    }
  }
  assert.equal(new Set(singles).size, singles.length, `one single per element: ${singles.join(', ')}`);
  assert.deepEqual([...kinds].sort(), ['egg', 'fusion egg', 'fusion pet', 'plain', 'pure', 'single', 'summoner'], 'every v2 look on show');
});
