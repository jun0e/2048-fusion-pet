// The player's record across runs, for the keepsakes (src/sim/keepsakes.js): the biggest block
// ever made (it unlocks keepsakes), the keepsake to bring next, the keepsakes already shown in
// the picker (a new one wears a NEW tag) and how many runs have started (the first run equips
// Iron Fist with no picker, and teaches it). Kept in localStorage; where storage is blocked
// (a sandboxed frame, private browsing) the player reads as new and nothing throws.
import { KEEPSAKES, STARTER_KEEPSAKE, isUnlocked, newlyUnlocked } from '../sim/keepsakes.js';
import { MAX_TIER } from '../config.js';

export const META_KEY = 'siege:meta';

const fresh = () => ({ bestTier: 0, keepsake: STARTER_KEEPSAKE, seen: [STARTER_KEEPSAKE], runs: 0 });

/** localStorage, or null where reading it throws. */
function local() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Read the record; anything missing or broken falls back to a new player's. */
export function loadMeta(storage = local()) {
  try {
    const v = JSON.parse(storage?.getItem(META_KEY) || 'null');
    if (!v || typeof v !== 'object') return fresh();
    const bestTier = Number.isInteger(v.bestTier) ? Math.max(0, Math.min(MAX_TIER, v.bestTier)) : 0;
    const keepsake = typeof v.keepsake === 'string' && isUnlocked(v.keepsake, bestTier) ? v.keepsake : STARTER_KEEPSAKE;
    const seen = Array.isArray(v.seen) ? [...new Set(v.seen.filter((id) => KEEPSAKES.some((k) => k.id === id)))] : [STARTER_KEEPSAKE];
    const runs = Number.isInteger(v.runs) && v.runs >= 0 ? v.runs : 0;
    return { bestTier, keepsake, seen, runs };
  } catch {
    return fresh();
  }
}

export function saveMeta(meta, storage = local()) {
  try {
    storage?.setItem(META_KEY, JSON.stringify({ bestTier: meta.bestTier, keepsake: meta.keepsake, seen: meta.seen, runs: meta.runs }));
  } catch {}
}

/** A block of `tier` was made: the record rises. → the keepsakes it unlocks (empty when none). */
export function recordBest(meta, tier) {
  if (!(tier > meta.bestTier)) return [];
  const unlocked = newlyUnlocked(meta.bestTier, tier);
  meta.bestTier = Math.min(MAX_TIER, tier);
  return unlocked;
}

/** The first run: Iron Fist is equipped with no picker, and the tutorial teaches it. */
export const isFirstRun = (meta) => meta.runs === 0;

/** Unlocked keepsakes the picker has not shown yet (they wear a NEW tag). */
export const unseenKeepsakes = (meta) => KEEPSAKES.filter((k) => isUnlocked(k.id, meta.bestTier) && !meta.seen.includes(k.id));
