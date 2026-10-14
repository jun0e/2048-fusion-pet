// Banner queue: one banner at a time, each on screen long enough to read.
// Several pieces of news can land in the same frame ("Boss defeated! 8 x2s"
// and "Wave 10 cleared!" when the boss is the last foe); without a queue the
// later one replaced the earlier at once. Pure: the HUD draws what `show`
// gets (with its time in seconds, for the animation), and the frame loop drives
// `update`, so the queue waits while the game is paused.

export const BANNER = {
  wps: 4, // reading speed, words per second
  minSeconds: 1.8, // with news waiting, a banner gives way after its reading time, never sooner than this
  seconds: 2.2, // alone, it plays at least this long (the animation's own length)
  max: 3, // waiting banners kept; older ones are dropped first
};

const wordsOf = (b) => `${b.title ?? ''} ${b.sub ?? ''}`.split(/\s+/).filter(Boolean).length;

/** How long a banner stays: `min` when news waits behind it, `full` when it is alone. */
export function bannerTimes(b) {
  const min = Math.max(BANNER.minSeconds, 0.4 + wordsOf(b) / BANNER.wps);
  return { min, full: Math.max(BANNER.seconds, min + 0.6) };
}

export function createBannerQueue({ show, max = BANNER.max }) {
  const queue = [];
  let current = null; // { item, t, times }
  return {
    /** Queue a banner; it shows as soon as the one on screen has had its time. */
    push(item) {
      queue.push(item);
      while (queue.length > max) queue.shift();
    },
    /** Per frame (0 while paused). */
    update(dt) {
      if (current) {
        current.t += dt;
        if (current.t < (queue.length ? current.times.min : current.times.full)) return;
        current = null;
      }
      if (!queue.length) return;
      const item = queue.shift();
      current = { item, t: 0, times: bannerTimes(item) };
      show({ ...item, seconds: current.times.full });
    },
    /** A new run: drop everything. */
    clear() {
      queue.length = 0;
      current = null;
    },
    get showing() {
      return current?.item ?? null;
    },
    get waiting() {
      return queue.length;
    },
  };
}
