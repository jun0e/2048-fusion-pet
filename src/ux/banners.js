// Banner queue: one banner at a time, each on screen long enough to read.
// Several pieces of news can land in the same frame ("Boss defeated! 8 x2s"
// and "Wave 10 cleared!" when the boss is the last foe); without a queue the
// later one replaced the earlier at once. Pure: the HUD draws what `show`
// gets, and the frame loop drives `update`, so the queue waits while the game
// is paused.

export const BANNER = {
  seconds: 2.2, // a banner alone plays its whole animation
  minSeconds: 1.3, // with news waiting, it gives way after this
  max: 3, // waiting banners kept; older ones are dropped first
};

export function createBannerQueue({ show, seconds = BANNER.seconds, minSeconds = BANNER.minSeconds, max = BANNER.max }) {
  const queue = [];
  let current = null; // { item, t }
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
        if (current.t < (queue.length ? minSeconds : seconds)) return;
        current = null;
      }
      if (!queue.length) return;
      current = { item: queue.shift(), t: 0 };
      show(current.item);
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
