// Boss reward: x2s for the board. A boss kill hands out one x2 for each power
// of two in the biggest block (256 = 2^8: eight x2s), so all the x2s multiply
// up to the biggest block's value. They go to the other blocks only: never to
// the biggest, never so far that a block passes it, and never as a new block.
// One block can take several. A block can grow to equal the biggest, so the two
// make a pair: one swipe then doubles the biggest block.
//
// Where they go: each step takes the move that makes the most new merge pairs
// per x2 it costs (ties at random). A move raises one block, or both blocks of
// a pair together (so the pair stays a pair). When no move makes a pair, the
// next x2 goes at random to a block outside every pair (raising it cannot break
// one), or to a pair that grows together. When the blocks outside pairs have
// less room than the x2s left, a pair grows together first, so the last x2s
// need not break a pair; only when nothing else is left does an x2 break the
// fewest pairs. A pair is two equal blocks in a row or a column with no block
// between them: one swipe merges them.

/**
 * Plan the x2s. Pure: reads the blocks, changes nothing.
 * @param tiles  the board's blocks: { id, tier, col, row }
 * @param size   the board's width and height
 * @param rng    a seeded RNG ({ next() } in [0, 1))
 * @returns { x2s, pairs, plan: [{ id, x2 }] } x2s handed out, pairs gained, and how many x2s each block takes
 */
export function planBossReward(tiles, size, rng) {
  const top = tiles.reduce((m, t) => Math.max(m, t.tier), 0); // a block can grow to equal it, not past it
  const tier = new Map(tiles.map((t) => [t.id, t.tier]));
  const room = (id) => top - tier.get(id);

  // Blocks do not move during the reward, so who faces whom is fixed: each block's
  // nearest block left, right, up and down (gaps allowed). A link joins two such
  // neighbours once; a link between equal blocks is a pair.
  const cell = new Array(size * size).fill(null);
  for (const t of tiles) cell[t.row * size + t.col] = t.id;
  const near = new Map(tiles.map((t) => [t.id, []]));
  const links = [];
  for (let i = 0; i < size; i++) {
    for (const line of [(j) => cell[i * size + j], (j) => cell[j * size + i]]) {
      let prev = null;
      for (let j = 0; j < size; j++) {
        const id = line(j);
        if (id == null) continue;
        if (prev != null) {
          links.push([prev, id]);
          near.get(prev).push(id);
          near.get(id).push(prev);
        }
        prev = id;
      }
    }
  }
  const isPair = ([a, b]) => tier.get(a) === tier.get(b);
  const pairCount = () => links.filter(isPair).length;
  /** Pairs that touch any of `ids` (only these can change when `ids` grow). */
  const touching = (ids) => links.filter((l) => (ids.includes(l[0]) || ids.includes(l[1])) && isPair(l)).length;

  /** Pairs gained (or lost, below 0) if the blocks `ids` each grew by k. */
  function gainOf(ids, k) {
    const before = touching(ids);
    for (const id of ids) tier.set(id, tier.get(id) + k);
    const after = touching(ids);
    for (const id of ids) tier.set(id, tier.get(id) - k);
    return after - before;
  }

  /** x2 counts worth trying for `ids`: one, or enough to match a neighbour (fits in `most`). */
  function counts(ids, most) {
    const ks = new Set([1]);
    for (const id of ids) for (const n of near.get(id)) if (!ids.includes(n)) ks.add(tier.get(n) - tier.get(ids[0]));
    return [...ks].filter((k) => k >= 1 && k <= most).sort((a, b) => a - b);
  }

  const pick = (list) => list[Math.floor(rng.next() * list.length)];
  const given = new Map();
  const startPairs = pairCount();
  let left = top;
  while (left > 0) {
    const open = tiles.filter((t) => room(t.id) > 0).map((t) => t.id);
    if (!open.length) break; // every other block is as big as the biggest
    const pairs = links.filter(isPair);
    // every move: one block up by k, or both blocks of a pair up by k
    const moves = [];
    for (const id of open) for (const k of counts([id], Math.min(left, room(id)))) moves.push({ ids: [id], k });
    for (const [a, b] of pairs) {
      for (const k of counts([a, b], Math.min(Math.floor(left / 2), room(a), room(b)))) moves.push({ ids: [a, b], k });
    }
    for (const m of moves) m.gain = gainOf(m.ids, m.k);
    let choice;
    const making = moves.filter((m) => m.gain > 0);
    if (making.length) {
      // the most new pairs per x2
      const best = Math.max(...making.map((m) => m.gain / (m.ids.length * m.k)));
      choice = pick(making.filter((m) => m.gain / (m.ids.length * m.k) > best - 1e-9));
    } else {
      // no pair to make: at random, one x2 on a block outside every pair, or a pair grows together
      // (a pair first, if the blocks outside pairs have less room than the x2s left); else break the fewest
      const ones = moves.filter((m) => m.k === 1);
      const singles = ones.filter((m) => m.ids.length === 1);
      const paired = new Set(pairs.flat());
      const safe = singles.filter((m) => !paired.has(m.ids[0]));
      const safeRoom = safe.reduce((n, m) => n + room(m.ids[0]), 0);
      const together = ones.filter((m) => m.ids.length === 2 && m.gain === 0);
      if (together.length && left > safeRoom) choice = pick(together);
      else if (safe.length || together.length) choice = pick([...safe, ...together]);
      else {
        const least = Math.max(...singles.map((m) => m.gain));
        choice = pick(singles.filter((m) => m.gain === least));
      }
    }
    for (const id of choice.ids) {
      tier.set(id, tier.get(id) + choice.k);
      given.set(id, (given.get(id) ?? 0) + choice.k);
    }
    left -= choice.ids.length * choice.k;
  }
  return { x2s: top - left, pairs: pairCount() - startPairs, plan: tiles.filter((t) => given.has(t.id)).map((t) => ({ id: t.id, x2: given.get(t.id) })) };
}
