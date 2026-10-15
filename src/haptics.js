// Haptics: short vibrations on Android (the Vibration API). iOS Safari has no
// Vibration API, so there the calls do nothing. Merges come in bursts (a triple
// merge is three events), so they share one tick. A setting turns haptics off.
const KEY = 'siege:haptics';
const PATTERNS = { merge: 8, deny: 12, lost: 35, boss: [20, 40, 30], over: [40, 60, 80] };

export function createHaptics() {
  let on = true;
  try {
    on = localStorage.getItem(KEY) !== '0';
  } catch {}
  const can = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  let lastMerge = 0;
  return {
    play(kind) {
      if (!on || !can) return;
      // before the first tap the browser refuses a vibration (and logs an error for each)
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
      if (kind === 'merge') {
        const now = performance.now();
        if (now - lastMerge < 80) return;
        lastMerge = now;
      }
      try {
        navigator.vibrate(PATTERNS[kind] ?? 10);
      } catch {}
    },
    get on() {
      return on;
    },
    /** false on iOS: the settings sheet hides the switch there */
    get supported() {
      return can;
    },
    set(v) {
      on = !!v;
      try {
        localStorage.setItem(KEY, on ? '1' : '0');
      } catch {}
    },
  };
}
