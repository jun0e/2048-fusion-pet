// Game speed: x1, x2 and, once the player has beaten a boss, x4. Speed only adds
// fixed sim steps to each frame, so a run stays deterministic. A new run and a
// boss wave start at x1 (main.js).
export const SPEEDS = [1, 2, 4];

/** The speed after `speed`, cycling through the speeds up to `max`. */
export function nextSpeed(speed, max) {
  const list = SPEEDS.filter((v) => v <= max);
  return list[(list.indexOf(speed) + 1) % list.length];
}
