// The short tile card's pure parts (src/ui/inspect.js: the card a tap on a block opens): where it
// goes, and what its Sell / Break button says. Client px, y growing downward; no DOM, so a test
// holds them to the phone sizes.

/**
 * The short card's top and height limit. In order: under the tapped block on the board alone (the
 * bottom bar stays clear), over it on the board, under it over the bottom bar, and when the whole
 * card fits nowhere, the roomier side, scrolling inside (its button row stays in view). Never over
 * the lanes, never over the tapped block.
 *
 * @param {object} o
 * @param {number} o.tileTop      the tapped block's top edge
 * @param {number} o.tileBottom   its bottom edge
 * @param {number} o.ceiling      the lanes' foot (the parapet's base): the card goes no higher
 * @param {number} o.boardBottom  the board's bottom edge: under it are the coin bar and Wave now
 * @param {number} o.floor        the lowest the card may reach (the screen's foot, inside its safe area)
 * @param {number} o.h            the card's own height
 * @param {number} [o.gap]        what it keeps clear of the block
 * @returns {{ top: number, maxH: number, side: 'below' | 'above' }}
 */
export function shortCardSpot({ tileTop, tileBottom, ceiling, boardBottom, floor, h, gap = 4 }) {
  const below = floor - (tileBottom + gap);
  const above = tileTop - gap - ceiling;
  const under = () => ({ top: Math.round(tileBottom + gap), maxH: Math.floor(below), side: 'below' });
  // over the block: its foot on the block's top, or, when it does not fit, its head on the ceiling
  const over = (fits) => ({ top: Math.round(fits ? tileTop - gap - h : ceiling), maxH: Math.floor(above), side: 'above' });
  if (h <= boardBottom - (tileBottom + gap)) return under();
  if (h <= above) return over(true);
  if (h <= below) return under();
  return below >= above ? under() : over(false);
}

/** The armed button's label. The button is always as wide as this too, so arming never moves it. */
export const ARMED_LABEL = 'Tap again';

/**
 * What the Sell / Break button says, and the note beside it. The short card has no room for a note:
 * its button says why it can't ("Last block", "Need 15"); the full card says it beside the button.
 *
 * @param {object} o
 * @param {'sell' | 'break'} o.kind  sell a turret, or break a dormant block
 * @param {number} o.amount          what it pays (sell) or costs (break, negative)
 * @param {number} o.coins           the player's coins
 * @param {boolean} o.last           the player's last block (it can't be removed)
 * @param {boolean} o.armed          waiting for the second tap
 * @param {boolean} o.short          on the short card
 * @returns {{ sell: boolean, disabled: boolean, armed: boolean, label: string, coin: string, aria: string, note: string }}
 */
export function actState({ kind, amount, coins, last, armed, short }) {
  const sell = kind === 'sell';
  const cost = Math.abs(amount);
  const poor = !sell && coins < cost;
  const disabled = last || poor;
  const verb = sell ? 'sell' : 'break';
  const why = last ? 'Your last block can’t be removed.' : poor ? `Need ${cost} coins to break it.` : '';
  const on = armed && !disabled;
  let label = on ? ARMED_LABEL : sell ? 'Sell' : 'Break';
  let coin = `${sell ? '+' : '−'}${cost}`;
  if (short && last) [label, coin] = ['Last block', ''];
  else if (short && poor) [label, coin] = ['Need', String(cost)];
  return {
    sell,
    disabled,
    armed: on,
    label,
    coin,
    aria: why || (on ? `Tap again to ${verb} for ${cost} coins` : `${sell ? 'Sell' : 'Break'} for ${cost} coins`),
    note: short ? '' : why || (sell ? 'A turret sells for the price of one swipe.' : 'A block below 16 costs three swipes to break.'),
  };
}
