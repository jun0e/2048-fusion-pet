// mulberry32: tiny, fast, seedable. State is a plain number so it serialises.
export function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Pick from [[value, weight], ...] */
    weighted(table) {
      const total = table.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of table) {
        if ((r -= w) < 0) return v;
      }
      return table[table.length - 1][0];
    },
    get state() {
      return state;
    },
  };
}
