// The tutorial director, without the DOM: the guided opening, the one-time
// tips and their timing. src/ui/tutorial.js draws what `view` says; the journey
// probe (tools/journey-probe.mjs) drives the same logic headless, so the first
// run can be measured and tuned with numbers.
//
// A config holds the script and the timing. COACH_BASELINE is the opening as it
// shipped before the journey pass; COACH is the tuned one (the default).

export const TIPS_BASELINE = {
  merge: 'Merged! A bigger block is a stronger turret.',
  lanes: 'Enemies come down the glowing lanes. Each block shoots along its own column.',
  attacked: 'Enemies on the board attack your blocks. Their hidden health refills every wave.',
  lost: 'A destroyed block is gone for good. Keep spares on the board.',
  coins: 'Kills drop coins. Spend them on swipes.',
  broke: 'Out of coins! Kill enemies to earn more.',
  break: 'Break time: swipe to grow, then press Wave now.',
  colour: 'When two elemental blocks merge, the one that slides in keeps its element.',
  awaken: '16! The block rolled a random element from your deck and starts shooting. Its border fills with each merge: full means fusion at 256.',
  unlock: 'New die: blocks reaching 16 can now roll it.',
  fusion: 'Fusion! Two elements became one unique element with both effects. The border now counts to 4096.',
  ultimate: 'Ultimate! A signature attack that reaches the whole field.',
  boss: 'Boss next, from the red portal. Kill it to promote your biggest block.',
  milestone: '2048! Keep going: 4096 makes an ultimate.',
};

export const COACH_BASELINE = {
  name: 'baseline',
  guided: [
    { id: 'swipe', text: 'Swipe to slide every block. Equal blocks merge. At 16 a block becomes a turret.', target: 'board', hand: true, skip: true, doneOn: 'swipe' },
    { id: 'cost', text: 'Each swipe costs coins and adds a new block.', target: 'coins', ok: true, doneOn: 'swipe' },
    { id: 'defend', text: 'Enemies attack your blocks, and you lose when they are all gone. Only blocks of 16+ shoot back.', target: 'blocks', ok: true },
    { id: 'start', text: 'Make a few more merges, then start the first wave.', target: 'wave', doneOn: 'waveStart', release: true },
  ],
  tips: TIPS_BASELINE,
  tipSeconds: () => 5.5, // how long a tip stays up
  gapAfterTip: 0.6, // seconds between tips
  gapAfterOk: 0.4,
  queueMax: 3, // too many tips at once: keep the newest
  urgent: [], // tips that jump the queue
  urgentGap: 0.6,
  seenWithStep: {},
};

// Tuned opening (journey pass 1): teach by doing. Short bubbles (≤ 8 words), no
// required "Got it" taps, the cost taught while the player swipes, the defend
// lesson moved to the moment a block is first hit. Steps advance on swipes or on
// a timer; `swipes: n` waits for n more swipes, `after: s` moves on after s seconds.
// Tips (pass 2): ≤ 12 words, shown for their reading time, 15 s apart, and the
// urgent ones (a block hit or lost, out of coins) jump the queue.
export const TIPS = {
  merge: 'Merged! Bigger blocks shoot harder.',
  lanes: 'Enemies come down the lit lanes.',
  attacked: 'Enemies break your blocks for good. Lose them all, you lose.',
  lost: 'That block is gone for good. Keep spares.',
  coins: 'Kills drop coins for more swipes.',
  broke: 'Out of coins. Kills and cleared waves pay more.',
  break: 'Break: swipe to grow, or tap Wave now.',
  colour: 'The block that slides in keeps its element.',
  awaken: 'Your 16 rolled an element! Fill its border to fuse at 256.',
  unlock: 'New die! New 16s can roll it.',
  fusion: 'Fusion! Two elements, both effects. Next stop: 4096.',
  ultimate: 'Ultimate! It hits the whole field.',
  boss: 'Boss next, from the red portal. Kill it to promote a block.',
  milestone: '2048! Reach 4096 for an ultimate.',
};

/** Seconds a tip stays up: long enough to read slowly, never under 3 s. */
export const readSeconds = (text) => Math.max(3, wordCount(text) / 2.5 + 1.5);

export const COACH = {
  name: 'tuned',
  guided: [
    { id: 'swipe', text: 'Swipe to merge the two 8s.', target: 'board', hand: true, skip: true, doneOn: 'swipe' },
    { id: 'turret', text: 'A 16 shoots enemies in its column.', target: 'top', doneOn: 'swipe', after: 4 },
    { id: 'grow', text: 'Keep merging. Each swipe costs coins.', target: 'coins', swipes: 3, after: 12 },
    { id: 'start', text: 'Tap Wave now when you are ready.', target: 'wave', doneOn: 'waveStart', release: true },
  ],
  tips: TIPS,
  tipSeconds: readSeconds,
  gapAfterTip: 16,
  gapAfterOk: 16,
  urgentGap: 2, // an urgent tip waits only this long after the last one
  queueMax: 3,
  urgent: ['note', 'attacked', 'lost', 'broke'],
  // survival first, then the core loop, then depth; ties keep arrival order
  priority: { note: 4, attacked: 3, lost: 3, broke: 3, lanes: 2, coins: 2, break: 2, merge: 2, boss: 2 },
  // depth waits until the basics have had time to land
  minWave: { colour: 3, unlock: 2 },
  seenWithStep: { turret: ['awaken'] }, // a guided step already covers these tips
  seenWithTip: { attacked: ['lost'] }, // a tip that already says what these say
  guidedWave: true, // first run: wave 1 comes down the first turret's column (run.setGuidedWave)
};

export const HELP = [
  ['Swipe', 'Every block slides; equal neighbours merge. Each swipe costs coins and adds a block.'],
  ['Turrets', 'Blocks of 16 or more shoot enemies along their column; smaller ones only soak up hits. Tap a block to see its range.'],
  ['Siege', 'Enemies on the board attack your blocks. Hidden health refills each wave; destroyed blocks are gone. No blocks left = game over.'],
  ['Elements', 'A block reaching 16 rolls a random element from your deck. When two elemental blocks merge, the one that slides in keeps its element.'],
  ['Upgrades', 'The 4-piece border fills one piece per merge. Full at 256: fusion, a unique element with both effects (Fire + Ice = Frostnova). Full again at 4096: ultimate.'],
  ['Unlocks', 'You start with 2 dice. Your first 64, 256 and 512 each add a new die to the deck.'],
  ['Coins', 'Kills and cleared waves pay coins. Three merges in one swipe refund it.'],
  ['Bosses', 'Every 5th wave, from the red portal. Killing one promotes your biggest block.'],
];

export const STORE_KEY = 'siege:tutorial';
export const wordCount = (text) => (text ? text.trim().split(/\s+/).length : 0);

/** Read the saved tutorial progress (browser only; a fresh store elsewhere). */
export function loadStore({ reset = false } = {}) {
  if (reset) return { guided: false, seen: new Set() };
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || '{}');
    return { guided: !!v.guided, seen: new Set(v.seen ?? []) };
  } catch {
    return { guided: false, seen: new Set() };
  }
}

export function saveStore(store) {
  try {
    globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify({ guided: store.guided, seen: [...store.seen] }));
  } catch {}
}

/**
 * @param getRun  () => the current run (setHold, tiles, wave, pendingChoice)
 * @param store   { guided, seen } progress; `save(store)` persists it
 * @param onLog   (kind, data) for the journey log: 'show', 'hide', 'done', 'skip'
 */
export function createCoach({ getRun, store = { guided: false, seen: new Set() }, save = () => {}, onLog = () => {}, config = COACH }) {
  const { guided: GUIDED, tips: TIPS } = config;
  let guided = -1; // index into GUIDED, -1 when not guiding
  let muted = false; // autoplay is on
  let tip = null; // { id, target, t }
  const queue = [];
  let gap = 0;
  let view = null;
  let seq = 0;
  let stepT = 0; // seconds in the current guided step
  let stepSwipes = 0; // swipes during the current guided step
  const run = () => getRun();
  const persist = () => save(store);

  /** 'top' points at the biggest block on the board. */
  function resolve(target) {
    if (target !== 'top') return target;
    const top = run().tiles.reduce((b, t) => (!b || t.tier > b.tier ? t : b), null);
    return top ? { tile: top.id } : 'board';
  }

  function show(kind, id, text, target, { ok = false, skip = false, hand = false } = {}) {
    view = { key: `${kind}:${id}:${++seq}`, kind, id, text, target: resolve(target), ok, skip, hand };
    onLog('show', { kind, id, words: wordCount(text) });
  }
  function hide() {
    if (view) onLog('hide', { kind: view.kind, id: view.id });
    view = null;
  }

  function guide(i) {
    guided = i;
    if (i >= GUIDED.length) {
      guided = -1;
      store.guided = true;
      persist();
      hide();
      onLog('done', {});
      return;
    }
    const g = GUIDED[i];
    stepT = 0;
    stepSwipes = 0;
    if (g.release) run().setHold?.(false);
    for (const id of config.seenWithStep?.[g.id] ?? []) store.seen.add(id);
    show('guided', g.id, g.text, g.target, g);
  }

  function advance(trigger) {
    if (guided < 0) return;
    const g = GUIDED[guided];
    if (trigger === 'swipe' && g.swipes) {
      stepSwipes += 1;
      if (stepSwipes >= g.swipes) guide(guided + 1);
      return;
    }
    if (trigger === 'ok' || trigger === g.doneOn) guide(guided + 1);
  }

  const prio = (id) => config.priority?.[id] ?? 1;
  /** Keep the queue in priority order; when it overflows, drop the oldest of the least important. */
  function enqueue(item) {
    queue.push(item);
    queue.sort((a, b) => prio(b.id) - prio(a.id)); // stable: arrival order within a priority
    if (queue.length > config.queueMax) {
      let worst = 0;
      for (let i = 1; i < queue.length; i++) if (prio(queue[i].id) < prio(queue[worst].id)) worst = i;
      queue.splice(worst, 1);
    }
  }

  /** Queue a tip the first time something happens. */
  function offer(id, target = null) {
    if (!TIPS[id]) return;
    if (store.seen.has(id) || (tip && tip.id === id) || queue.some((q) => q.id === id)) return;
    store.seen.add(id);
    for (const other of config.seenWithTip?.[id] ?? []) store.seen.add(other);
    persist();
    enqueue({ id, target });
  }

  function skipAll() {
    store.guided = true;
    for (const id of Object.keys(TIPS)) store.seen.add(id);
    persist();
    guided = -1;
    tip = null;
    queue.length = 0;
    run().setHold?.(false);
    hide();
    onLog('skip', {});
  }

  return {
    /** A new run: guide it if the player hasn't finished the opening yet. */
    start(r) {
      tip = null;
      queue.length = 0;
      hide();
      if (!store.guided) {
        r.setHold?.(true);
        if (config.guidedWave) r.setGuidedWave?.(true);
        guide(0);
      } else {
        r.setHold?.(false);
        guided = -1;
      }
    },
    /** Feed every run event. */
    onEvent(e) {
      if (e.type === 'gameover') {
        // the run is over: clear the bubble; an unfinished opening starts again on the retry
        guided = -1;
        tip = null;
        queue.length = 0;
        hide();
        return;
      }
      if (guided >= 0 && e.type === 'waveStart') advance('waveStart');
      switch (e.type) {
        case 'merge':
          if (guided < 0) offer('merge', { tile: e.id });
          else if (!store.seen.has('merge')) {
            store.seen.add('merge'); // the guided swipe already taught it
            persist();
          }
          break;
        case 'waveStart':
          offer('lanes', { lane: e.lanes?.[0] ?? 0 });
          break;
        case 'tileHit':
          offer('attacked', { tile: e.id });
          break;
        case 'remove':
          if (e.reason === 'destroyed') offer('lost', 'blocks');
          break;
        case 'coins':
          if (e.reason === 'kill') offer('coins', 'coins');
          break;
        case 'noCoins':
          offer('broke', 'coins');
          break;
        case 'waveIncoming':
          if (e.boss) offer('boss', { lane: run().wave.bossLane ?? e.lanes?.[0] ?? 0 });
          offer('break', 'wave');
          break;
        case 'override':
          offer('colour', { tile: e.tileId });
          break;
        case 'classed':
          offer(e.stage === 1 ? 'awaken' : e.stage === 2 ? 'fusion' : 'ultimate', { tile: e.tileId });
          break;
        case 'dieGained':
          offer('unlock', 'deck');
          break;
        case 'milestone':
          offer('milestone', 'board');
          break;
      }
    },
    /** A swipe that moved the board. */
    onSwipe() {
      advance('swipe');
    },
    /** The bubble's OK button. */
    ok() {
      if (guided >= 0) advance('ok');
      else if (tip) {
        tip = null;
        gap = config.gapAfterOk;
        hide();
      }
    },
    skipAll,
    /** A one-off message as a tip (not remembered): the retry hint, the return-visit goal. */
    note(text, target = null) {
      if (!text) return;
      enqueue({ id: 'note', text, target });
    },
    /** Replay from the help sheet: forget all progress. */
    reset() {
      store.guided = false;
      store.seen = new Set();
      persist();
    },
    /** Per frame: count tips down and rotate them. */
    update(dt) {
      if (muted) return;
      if (guided >= 0) {
        stepT += dt;
        const g = GUIDED[guided];
        if (g.after && stepT >= g.after) guide(guided + 1);
        return;
      }
      if (tip) {
        tip.t -= dt;
        const gone = tip.target?.tile != null && !run().tiles.some((t) => t.id === tip.target.tile);
        if (tip.t <= 0 || gone) {
          tip = null;
          gap = config.gapAfterTip;
          hide();
        }
        return;
      }
      gap -= dt;
      if (!queue.length || run().pendingChoice) return;
      // the most important tip whose wave has come
      const i = queue.findIndex((q) => (config.minWave?.[q.id] ?? 0) <= run().waveNo);
      if (i < 0) return;
      const urgent = config.urgent.includes(queue[i].id);
      if (gap > (urgent ? Math.max(0, config.gapAfterTip - config.urgentGap) : 0)) return;
      const next = queue.splice(i, 1)[0];
      const text = next.text ?? TIPS[next.id];
      tip = { ...next, t: config.tipSeconds(text) };
      show('tip', next.id, text, next.target, { ok: true });
    },
    /** What the bubble shows now (null = hidden). */
    get view() {
      return muted ? null : view;
    },
    get active() {
      return guided >= 0 && !muted;
    },
    get store() {
      return store;
    },
    /** Autoplay: step aside (no bubbles, no countdown hold); resume the opening when it stops. */
    setMuted(v) {
      muted = v;
      if (muted) {
        hide();
        run().setHold?.(false);
      } else if (guided >= 0) guide(guided);
    },
  };
}
