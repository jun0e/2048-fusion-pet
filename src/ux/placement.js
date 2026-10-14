// Where the coach bubble sits, worked out from boxes in client pixels (no DOM),
// so the rules can be tested: next to its target, above the bottom bar (coins,
// Wave now), above the field for a lane, beside a block or under the board for
// a block.

export const BUBBLE = { width: 300, besideWidth: 232 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** A block is where the action is: its bubble is narrower, to sit beside it. */
export const bubbleWidth = (target, vw) => Math.min(target?.tile != null ? BUBBLE.besideWidth : BUBBLE.width, vw - 24);

/**
 * @param target  the coach target ('board', 'coins', { tile }, { lane }, ...)
 * @param rect    the target's box ({ left, top, right, bottom }), or null: centred, no arrow
 * @param board   the board's box (a block's bubble can go under it)
 * @param floor   the top of the bottom bar: the bubble stays above it
 * @param vw, vh  the viewport size
 * @param bh      the bubble's height
 * @returns { width, left, top, arrow: null | { side: 'up' | 'down', x } }
 */
export function placeBubble({ target, rect: r, board = null, floor = Infinity, vw, vh, bh = 80 }) {
  const width = bubbleWidth(target, vw);
  if (!r) return { width, left: (vw - width) / 2, top: vh * 0.3, arrow: null };
  const beside = target?.tile != null;
  const low = Math.min(floor, vh) - 8; // the bubble's bottom edge stays above this
  const cx = (r.left + r.right) / 2;
  // below the target in the upper half of the screen, above it otherwise
  let below = (r.top + r.bottom) / 2 < vh * 0.5;
  let top = clamp(below ? r.bottom + 16 : r.top - bh - 16, 8, Math.max(8, low - bh));
  // a target taller than the room left (the board): sit the bubble inside its top edge instead
  const inside = below && !beside && r.bottom - r.top > vh * 0.3;
  if (inside) top = Math.max(8, r.top + 12);
  // a lane: above the field (over the score bar), so no lane and no foe is hidden
  if (target?.lane != null) {
    below = false;
    top = Math.max(8, r.top - bh - 12);
  }
  // a block: under the board (over the deck row, not over the lanes) if it fits above the bottom bar
  if (beside && board && board.bottom + 6 + bh <= low) {
    top = board.bottom + 6;
    below = true;
  }
  let left = clamp(cx - width / 2, 12, vw - width - 12);
  if (beside) {
    // keep the block's column clear: sit on the roomier side of it if the bubble fits there
    const leftSide = r.left - width - 8;
    const rightSide = r.right + 8;
    if (cx > vw / 2 && leftSide >= 12) left = leftSide;
    else if (cx <= vw / 2 && rightSide + width <= vw - 12) left = rightSide;
    else if (leftSide >= 12) left = leftSide;
    else if (rightSide + width <= vw - 12) left = rightSide;
  }
  return { width, left, top, arrow: inside ? null : { side: below ? 'up' : 'down', x: clamp(cx - left, 16, width - 16) } };
}
