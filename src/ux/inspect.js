// Inspect card: what a tapped block is and what it does, in words. Pure: reads
// the tile ({ tier, cls }) and the element tables; the HUD draws the card.
import { APEX, ELEMENTS, FUSIONS, TAGS, fusionKey, milestonePieces, stageFor } from '../sim/classes.js';

/**
 * @returns { value, name, kind, text, colors, progress } progress: a line about the
 *   4-piece border toward the next stage, or null
 */
export function describeBlock(tile) {
  const value = 2 ** tile.tier;
  const c = tile.cls ?? {};
  const pieces = milestonePieces(tile.tier);
  if (stageFor(tile.tier) < 1) {
    return { value, name: 'Sleeping block', kind: 'No element yet', text: 'It does not shoot. Merge it up to 16: it wakes with an element from your deck.', colors: [], progress: null };
  }
  if (!c.element) return { value, name: 'Pebble turret', kind: 'Plain', text: 'Shoots plain pebbles down its column.', colors: ['#d9d2c5'], progress: null };
  const e = ELEMENTS[c.element];
  if (!c.fusion) {
    return { value, name: e.attack, kind: e.name, text: e.desc, colors: [e.color], progress: `Border ${pieces}/4 · fusion at 256` };
  }
  const fu = FUSIONS[fusionKey(c.element, c.fusion)];
  const kind = `${ELEMENTS[c.element].name} + ${ELEMENTS[c.fusion].name}`;
  if (!c.ultimate) {
    return { value, name: fu.name, kind, text: `${TAGS[c.element]} · ${TAGS[c.fusion]}, both stronger.`, colors: [ELEMENTS[c.element].color, ELEMENTS[c.fusion].color], progress: `Border ${pieces}/4 · ultimate at 4096` };
  }
  const apex = APEX[c.ultimate];
  return { value, name: `${fu.name} · ${apex.name}`, kind: `${kind} + ${ELEMENTS[c.ultimate].name}`, text: apex.desc, colors: [fu.color, ELEMENTS[c.ultimate].color], progress: null };
}
