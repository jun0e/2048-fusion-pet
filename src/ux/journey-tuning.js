// Journey timing and copy shared by the game (main.js), the coach and the
// journey log (src/ux), and the journey probe (tools/journey-probe.mjs), so the
// probe measures what ships.

/** Seconds between the last block falling and the game-over card. */
export const GAME_OVER_DELAY = 0.7;

/**
 * A bubble on screen for less time than this (s) could not be read: a flash.
 * The coach counts such a tip as unseen; the journey log counts it as a flash.
 */
export const FLASH_SECONDS = 1;

/** The game-over card's cause line: what broke the last block. */
export function causeLine({ wave, by = null }) {
  return by ? `A ${by} broke your last block on wave ${wave}.` : `Your last block fell on wave ${wave}.`;
}

/** Words on the game-over card: title, cause line, stat labels, button. */
export const gameOverWords = (cause = causeLine({ wave: 1, by: 'Pixie' })) => 1 + cause.split(/\s+/).length + 4 + 2;

/**
 * One lesson for the next run, picked from how this one ended. It shows as the
 * first tip of the retry, when the player can act on it (not on the card).
 */
export function lossHint({ wave, maxTier }) {
  if (maxTier < 4) return 'Merge to 16: only blocks of 16 or more shoot.';
  if (wave <= 3) return 'Build 16s under the lit braziers, then tap Wave now.';
  return 'Spread turrets over the lanes and keep spare blocks.';
}

/** The return-visit goal, shown once when a returning player starts. */
export const returnGoal = (bestWave) => (bestWave > 0 ? `Your best is wave ${bestWave}. Beat it!` : null);
