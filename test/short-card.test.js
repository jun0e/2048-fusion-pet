// The short tile card (src/ui/short-card.js), the one a tap on a block opens: over the board, never
// over the lanes or the tapped block, whole (Sell in view without scrolling) on every phone, the
// bottom bar clear where the board has room; and what its Sell / Break button says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMED_LABEL, actState, shortCardSpot } from '../src/ui/short-card.js';

// the board on six phones, measured in the game (client px): its top edge, one row's height, the
// stage's scale (px per world unit) and the screen's foot (the coin bar's bottom: the safe area + 6
// or 8 px). The 390 × 844 phone twice: with an iPhone's safe areas (47 / 34 px) and without. The
// short ones are phones with their browser toolbars showing (src/render/stage.js).
const PHONES = {
  '360x640': { boardTop: 351.4, row: 47.55, U: 23.78, floor: 634 },
  '360x560': { boardTop: 310.4, row: 39.5, U: 19.75, floor: 554 },
  '375x548': { boardTop: 304.3, row: 38.3, U: 19.14, floor: 542 },
  '320x568': { boardTop: 314.5, row: 40.3, U: 20.15, floor: 562 },
  '390x844 safe areas': { boardTop: 467.1, row: 58.33, U: 29.17, floor: 802 },
  '390x844': { boardTop: 461.5, row: 66.5, U: 33.25, floor: 836 },
};
// the short card's height, measured in the game at 360 to 430 px: a row with the 40 px picture, the
// name and the × (40 px), and a row with the 48 px buttons
const SHORT_H = 114;
const PARAPET_BASE = 0.28; // world units over the board's top: where the lanes end (FRAME_GEOM.parapet.base)

/** Row `r` (0: the bottom row) of a phone's board, and the spot's other inputs. */
function where(p, r, h = SHORT_H) {
  const bottom = p.boardTop + p.row * (4 - r);
  return { tileTop: bottom - p.row, tileBottom: bottom, ceiling: p.boardTop - PARAPET_BASE * p.U, boardBottom: p.boardTop + 4 * p.row, floor: p.floor, h };
}

for (const [name, p] of Object.entries(PHONES)) {
  test(`${name}: the short card fits whole on every row, off the lanes and off the tapped block`, () => {
    for (let r = 0; r < 4; r++) {
      const o = where(p, r);
      const s = shortCardSpot(o);
      const bottom = s.top + Math.min(SHORT_H, s.maxH);
      assert.ok(s.maxH >= SHORT_H, `row ${r}: the card scrolls (${s.maxH} px for ${SHORT_H})`);
      assert.ok(s.top >= o.ceiling - 0.5, `row ${r}: over the lanes (top ${s.top}, lanes' foot ${o.ceiling.toFixed(1)})`);
      assert.ok(bottom <= p.floor + 0.5, `row ${r}: past the screen's foot (${bottom} > ${p.floor})`);
      const clear = bottom <= o.tileTop - 3 || s.top >= o.tileBottom + 3;
      assert.ok(clear, `row ${r}: over the tapped block (${s.top}–${bottom}, block ${o.tileTop.toFixed(1)}–${o.tileBottom.toFixed(1)})`);
    }
  });
}

test('the bottom bar stays clear wherever the board has room for the card', () => {
  const clearOfBar = (p, r) => {
    const o = where(p, r);
    const s = shortCardSpot(o);
    return s.top + SHORT_H <= o.boardBottom + 0.5;
  };
  // the tall phone: every row (the card under the top two rows, over the bottom two)
  for (let r = 0; r < 4; r++) assert.ok(clearOfBar(PHONES['390x844'], r), `390x844 row ${r}`);
  // the 360 × 640 phone: under the top row and over the bottom one; rows 1 and 2 have no room on the board
  assert.ok(clearOfBar(PHONES['360x640'], 3) && clearOfBar(PHONES['360x640'], 0));
  assert.equal(shortCardSpot(where(PHONES['360x640'], 0)).side, 'above');
  assert.equal(shortCardSpot(where(PHONES['360x640'], 2)).side, 'below');
});

test('a card too tall for either side takes the roomier one and scrolls inside, still off the lanes and the block', () => {
  const p = PHONES['375x548'];
  for (let r = 0; r < 4; r++) {
    const o = where(p, r, 400);
    const s = shortCardSpot(o);
    const below = p.floor - (o.tileBottom + 4);
    const above = o.tileTop - 4 - o.ceiling;
    assert.equal(s.side, below >= above ? 'below' : 'above', `row ${r}`);
    assert.equal(s.maxH, Math.floor(Math.max(below, above)), `row ${r}`);
    assert.ok(s.top >= o.ceiling - 0.5 && s.top + s.maxH <= p.floor + 0.5, `row ${r}: off the lanes, above the foot`);
    assert.ok(s.top + s.maxH <= o.tileTop - 3 || s.top >= o.tileBottom + 3, `row ${r}: off the block`);
  }
});

test('Sell / Break: the price on the button, "Tap again" while armed, and why it can\'t on the short card\'s button itself', () => {
  const sell = { kind: 'sell', amount: 5, coins: 0, last: false, armed: false, short: true };
  assert.deepEqual(
    [actState(sell).label, actState(sell).coin, actState(sell).disabled, actState(sell).note],
    ['Sell', '+5', false, ''],
  );
  assert.equal(actState(sell).aria, 'Sell for 5 coins');
  const armed = actState({ ...sell, armed: true });
  assert.deepEqual([armed.label, armed.armed, armed.aria], [ARMED_LABEL, true, 'Tap again to sell for 5 coins']);
  // the short card's button says why it can't; the full card says it beside the button
  const last = actState({ ...sell, last: true });
  assert.deepEqual([last.label, last.coin, last.disabled, last.aria], ['Last block', '', true, 'Your last block can’t be removed.']);
  assert.equal(actState({ ...sell, last: true, short: false }).note, 'Your last block can’t be removed.');
  const brk = { kind: 'break', amount: -15, coins: 10, last: false, armed: false, short: true };
  const poor = actState(brk);
  assert.deepEqual([poor.label, poor.coin, poor.disabled, poor.aria], ['Need', '15', true, 'Need 15 coins to break it.']);
  assert.equal(actState({ ...brk, armed: true }).armed, false, 'a button that cannot act is never armed');
  const rich = actState({ ...brk, coins: 20, short: false });
  assert.deepEqual([rich.label, rich.coin, rich.disabled], ['Break', '−15', false]);
  assert.equal(rich.note, 'A block below 16 costs three swipes to break.');
  assert.equal(actState({ ...sell, short: false }).note, 'A turret sells for the price of one swipe.');
});

test('the narrow card’s sizes in inspect.js are the ones inspect.css sets (the rail fit is measured from them)', async () => {
  const { readFileSync } = await import('node:fs');
  const js = readFileSync(new URL('../src/ui/inspect.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/ui/inspect.css', import.meta.url), 'utf8');
  const m = js.match(/const NARROW = \{ button: (\d+), gap: (\d+), row: (\d+) \}/);
  assert.ok(m, 'NARROW in inspect.js');
  const [, button, gap, row] = m.map(Number);
  const rule = (sel) => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));
  assert.match(rule('.inspect.short.narrow .inspect-sell'), new RegExp(`padding-left: ${button}px;\\s*padding-right: ${button}px`));
  assert.match(rule('.inspect.short.narrow .inspect-act'), new RegExp(`column-gap: ${gap}px`));
  assert.match(rule('.inspect.short.narrow .inspect-act'), new RegExp(`padding-left: ${row}px;\\s*padding-right: ${row}px`));
});
