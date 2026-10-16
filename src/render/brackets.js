// The pick's corner brackets, drawn into Pixi Graphics (their geometry is src/art/plaque.js
// bracketStrokes): round a picked block's pit (src/render/blocks.js) and round a picked den's pet
// out on the field (src/kv/roam.js). Cream with ink under them, or red and dashed while the block's
// Sell / Break is armed. Each corner is drawn once per size and moved, never redrawn per frame.
import { PLAQUE, TILE_COLORS, bracketStrokes } from '../art/plaque.js';

const hex = (c) => parseInt(c.replace('#', ''), 16);
const INK = hex(TILE_COLORS.ink);
const CREAM = hex(TILE_COLORS.cream);
const DANGER = hex(TILE_COLORS.danger);

/** The four corners in order (top left, top right, bottom right, bottom left): the way each points. */
export const BRACKET_CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/**
 * One corner bracket into `g` (cleared first), its corner at g's origin and its arms back toward
 * what it frames (-sx, -sy), at `cell` px per cell: cream with ink under it, or red and dashed when
 * `armed`.
 */
export function drawBracket(g, sx, sy, cell, armed = false) {
  const B = PLAQUE.bracket;
  g.clear();
  const pass = (lines, width, color, alpha) => {
    for (const line of lines) line.forEach(([x, y], j) => (j ? g.lineTo(x * cell, y * cell) : g.moveTo(x * cell, y * cell)));
    g.stroke({ width: width * cell, color, alpha, cap: armed ? 'butt' : 'round', join: 'round' });
  };
  pass(bracketStrokes(sx, sy, armed, armed ? B.under / 2 : 0), B.width + B.under, INK, 0.85); // the ink under it
  pass(bracketStrokes(sx, sy, armed), B.width, armed ? DANGER : CREAM, 1);
}
