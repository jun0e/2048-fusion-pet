// The tutorial director, without the DOM: the guided opening, the one-time
// tips and their timing. src/ui/tutorial.js draws what `view` says; the journey
// probe (tools/journey-probe.mjs) drives the same logic headless, so the first
// run can be measured and tuned with numbers.
//
// A config holds the script and the timing. COACH_BASELINE is the opening as it
// shipped before the journey pass; COACH is the tuned one (the default). Every
// tuned behaviour is a config flag, so the baseline plays as it shipped. Only
// the autoplay handling (everything that checks `muted`) is shared; the probe
// never mutes.
import { stageFor } from '../sim/classes.js';
import { FLASH_SECONDS } from './journey-tuning.js';

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
  boss: 'Boss from the red portal! Kill it: x2s for your blocks.',
  milestone: '2048! Reach 4096 for an ultimate.',
};

/**
 * A break tip is out of date once the break it was offered in ends, and too late
 * to start in that break's last 3 s (the countdown would cut it).
 */
const breakOver = (run, q) => run.phase !== 'break' || run.waveNo !== q.wave || (q.up == null && run.timer < 3);

/** Seconds a tip stays up: long enough to read slowly, never under 3 s. */
export const readSeconds = (text) => Math.max(3, wordCount(text) / 2.5 + 1.5);

export const COACH = {
  name: 'tuned',
  guided: [
    // the first step ends on the first 16 (a swipe that only moves the 8s does not count)
    { id: 'swipe', text: 'Swipe to merge the two 8s.', target: 'board', hand: true, skip: true, doneOn: 'turret' },
    { id: 'turret', text: '16+ blocks shoot enemies in their column.', target: 'top', doneOn: 'swipe', after: 4 },
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
  // depth tips are not offered before these waves: the basics land first
  minWave: { colour: 3, unlock: 2 },
  // a tip is offered only when its advice can be followed ("swipe to grow" needs a possible swipe)
  when: { break: (run) => run.coins >= run.swipeCost && !run.locked },
  // a tip whose moment has passed is dropped and offered again next time: the break tip
  // lasts its break; the boss tip lasts until its boss wave is over
  stale: { break: breakOver, boss: (run, q) => run.waveNo !== q.wave },
  reoffer: true, // a tip dropped unseen (queue overflow, stale, game over, a flash) can be offered again
  minSeen: FLASH_SECONDS, // a tip on screen for less than this was not read: a flash counts as unseen
  follow: true, // a tip that points at a block follows it when it merges
  fallback: { attacked: 'blocks' }, // where a tip points when its block breaks (others go with the block)
  seenWithStep: { turret: ['awaken'] }, // a guided step already covers these tips
  seenWithTip: { attacked: ['lost'] }, // a tip that already says what these say
  guidedWave: true, // first run: wave 1 comes down the first turret's column (run.setGuidedWave)
  endOnWave: true, // a wave that starts during the opening ends it (the player chose to start)
  brokeStep: 'start', // out of coins during the opening: skip to this step (Wave now still works)
  clearOnGameOver: true, // a game over clears the bubble; tips still waiting are offered again later
};

export const HELP = [
  ['Swipe', 'Every block slides; equal neighbours merge. Each swipe costs coins and adds a block.'],
  ['Turrets', 'Blocks of 16 or more shoot enemies along their column; smaller ones only soak up hits. Tap a block to see its range.'],
  ['Siege', 'Enemies on the board attack your blocks. Hidden health refills each wave; destroyed blocks are gone. No blocks left = game over.'],
  ['Elements', 'A block reaching 16 rolls a random element from your deck. When two elemental blocks merge, the one that slides in keeps its element.'],
  ['Upgrades', 'The 4-piece border fills one piece per merge. Full at 256: fusion, a unique element with both effects (Fire + Ice = Frostnova). Full again at 4096: ultimate.'],
  ['Unlocks', 'You start with 2 dice. Your first 64, 256 and 512 each add a new die to the deck.'],
  ['Coins', 'Kills and cleared waves pay coins. Three merges in one swipe refund it.'],
  ['Bosses', 'Every 5th wave, from the red portal. Killing one gives your other blocks x2s, one for each doubling in your biggest block (256 = eight x2s), aimed to make pairs. No block grows past the biggest.'],
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
 * @param getRun  () => the current run (setHold, setGuidedWave, tiles, wave, waveNo, phase, pendingChoice)
 * @param store   { guided, seen } progress; `save(store)` persists it
 * @param onLog   (kind, data) for the journey log: 'show', 'hide', 'done', 'skip'
 */
export function createCoach({ getRun, store = { guided: false, seen: new Set() }, save = () => {}, onLog = () => {}, config = COACH }) {
  const { guided: GUIDED, tips: TIPS } = config;
  let guided = -1; // index into GUIDED, -1 when not guiding
  let muted = false; // autoplay is on
  let tip = null; // the tip on screen: { id, target, wave, t: seconds left, up: seconds shown, covered }
  const queue = [];
  let wait = 0; // seconds since the last tip went away
  let need = 0; // how long an ordinary tip must wait after it
  let view = null;
  let seq = 0;
  let stepT = 0; // seconds in the current guided step
  let stepSwipes = 0; // swipes during the current guided step
  const reoffered = new Set(); // tips already offered again after a flash (once is enough)
  const run = () => getRun();
  const persist = () => save(store);

  /** 'top' points at the biggest block on the board. */
  function resolve(target) {
    if (target !== 'top') return target;
    const top = run().tiles.reduce((b, t) => (!b || t.tier > b.tier ? t : b), null);
    return top ? { tile: top.id } : 'board';
  }

  /** `log: false` re-shows a bubble the player already saw (after autoplay): logged as 'reshow', no new words. */
  function show(kind, id, text, target, { ok = false, skip = false, hand = false } = {}, log = true) {
    view = { key: `${kind}:${id}:${++seq}`, kind, id, text, target: resolve(target), ok, skip, hand };
    if (!muted) onLog(log ? 'show' : 'reshow', { kind, id, words: wordCount(text) });
  }
  function hide() {
    if (view && !muted) onLog('hide', { kind: view.kind, id: view.id });
    view = null;
  }
  /** A tip went away: ordinary tips now wait `gap` seconds, urgent ones only urgentGap. */
  function rest(gap) {
    wait = 0;
    need = gap;
  }

  function guide(i, { reshow = false } = {}) {
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
    for (const id of config.seenWithStep?.[g.id] ?? []) {
      store.seen.add(id);
      const k = queue.findIndex((q) => q.id === id);
      if (k >= 0) queue.splice(k, 1); // this step says it already
    }
    show('guided', g.id, g.text, g.target, g, !reshow);
  }

  /** Jump forward to the step called `id` (never back). */
  function jump(id) {
    const i = GUIDED.findIndex((g) => g.id === id);
    if (i > guided) guide(i);
  }

  function advance(trigger) {
    if (guided < 0 || muted) return; // autoplay's swipes don't teach the player anything
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
      unsee(queue.splice(worst, 1)[0]);
    }
  }

  /** A tip the player did not get to read: let it (and what it covered) be offered again. */
  function unsee(q) {
    if (!q || q.id === 'note' || !config.reoffer) return; // the baseline forgot dropped tips for good
    store.seen.delete(q.id);
    for (const id of q.covered ?? []) store.seen.delete(id);
    persist();
  }

  /** Queue a tip the first time something happens (a depth tip: not before its wave). */
  function offer(id, target = null) {
    if (!TIPS[id] || muted) return; // autoplay's moments are not the player's
    if ((config.minWave?.[id] ?? 0) > run().waveNo || config.when?.[id]?.(run()) === false) return;
    if (store.seen.has(id) || (tip && tip.id === id) || queue.some((q) => q.id === id)) return;
    store.seen.add(id);
    persist();
    enqueue({ id, target, wave: run().waveNo });
  }

  /** Point the tip on screen somewhere else (same bubble, new ring). */
  function aimTip(target) {
    tip.target = target;
    if (view?.kind === 'tip') view = { ...view, target: resolve(target) };
  }

  /** Blocks merged: tips that point at them point at the merged block. */
  function follow(ids, id) {
    const at = (q) => q?.target?.tile != null && ids.includes(q.target.tile);
    for (const q of queue) if (at(q)) q.target = { tile: id };
    if (at(tip)) aimTip({ tile: id });
  }

  /** A block broke: its tips point at their fallback (the block count), or go with it. */
  function lose(id) {
    const at = (q) => q?.target?.tile === id;
    for (let i = queue.length - 1; i >= 0; i--) {
      if (!at(queue[i])) continue;
      const fallback = config.fallback?.[queue[i].id];
      if (fallback) queue[i].target = fallback;
      else unsee(queue.splice(i, 1)[0]); // about that block only: it can come with the next one
    }
    if (!at(tip)) return;
    const fallback = config.fallback?.[tip.id];
    if (fallback) aimTip(fallback);
    else endTip();
  }

  /** Put the next tip up; the tips it also covers count as seen and leave the queue. */
  function showTip(next) {
    const text = next.text ?? TIPS[next.id];
    const covered = new Set(next.covered ?? []);
    for (const id of config.seenWithTip?.[next.id] ?? []) {
      const k = queue.findIndex((q) => q.id === id);
      if (k >= 0) queue.splice(k, 1);
      if (k >= 0 || !store.seen.has(id)) covered.add(id);
      store.seen.add(id);
    }
    if (covered.size) persist();
    tip = { ...next, covered: [...covered], t: config.tipSeconds(text), up: 0 };
    show('tip', next.id, text, next.target, { ok: true }, !next.reshow);
  }

  /**
   * Too short to read: a tip that went within minSeen seconds was not seen, and it
   * can come again (once, so a player who always taps fast sees no flicker).
   * Returns true for a flash.
   */
  function flashed() {
    if (!tip || tip.up >= (config.minSeen ?? 0)) return false;
    if (!reoffered.has(tip.id)) {
      reoffered.add(tip.id);
      unsee(tip);
    }
    return true;
  }

  /** The tip on screen goes before the player taps it; after a flash the next tip comes sooner. */
  function endTip() {
    rest(flashed() ? config.urgentGap : config.gapAfterTip);
    tip = null;
    hide();
  }

  /** Clear the tip and the queue; what the player did not read can come again. */
  function clearTips() {
    flashed();
    for (const q of queue) unsee(q);
    queue.length = 0;
    tip = null;
  }

  function skipAll() {
    store.guided = true;
    for (const id of Object.keys(TIPS)) store.seen.add(id);
    persist();
    guided = -1;
    tip = null;
    queue.length = 0;
    run().setHold?.(false);
    run().setGuidedWave?.(false); // a player who skips gets the normal first wave
    hide();
    onLog('skip', {});
  }

  return {
    /** A new run: guide it if the player hasn't finished the opening yet. */
    start(r) {
      clearTips();
      hide();
      if (!store.guided) {
        r.setHold?.(!muted); // the opening waits for the player, not for autoplay
        if (config.guidedWave) r.setGuidedWave?.(true);
        guide(0);
      } else {
        r.setHold?.(false);
        guided = -1;
      }
    },
    /** Feed every run event. */
    onEvent(e) {
      if (e.type === 'gameover' && config.clearOnGameOver) {
        // the run is over: clear the bubble; tips not yet read come back later;
        // an unfinished opening starts again on the retry
        clearTips();
        guided = -1;
        hide();
        return;
      }
      if (config.follow) {
        if (e.type === 'merge') follow(e.from ?? [], e.id);
        else if (e.type === 'remove') lose(e.id);
      }
      if (guided >= 0 && !muted && e.type === 'waveStart') {
        if (config.endOnWave) guide(GUIDED.length);
        else advance('waveStart');
      }
      if (e.type === 'classed' && e.stage === 1) advance('turret');
      if (guided >= 0 && !muted && e.type === 'noCoins' && config.brokeStep) jump(config.brokeStep);
      switch (e.type) {
        case 'merge':
          if (guided < 0) offer('merge', { tile: e.id });
          else if (!muted && !store.seen.has('merge')) {
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
        rest(config.gapAfterOk);
        hide();
      }
    },
    skipAll,
    /** A one-off message as a tip (not remembered): the retry hint, the return-visit goal. */
    note(text, target = null) {
      if (!text) return;
      enqueue({ id: 'note', text, target, wave: run().waveNo });
    },
    /** Replay from the help sheet: forget all progress. */
    reset() {
      store.guided = false;
      store.seen = new Set();
      reoffered.clear();
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
        tip.up += dt;
        const gone = tip.target?.tile != null && !run().tiles.some((t) => t.id === tip.target.tile);
        if (tip.t <= 0 || gone || config.stale?.[tip.id]?.(run(), tip)) endTip();
        return;
      }
      wait += dt;
      // drop tips whose moment has passed (they are offered again at the next such moment)
      for (let i = queue.length - 1; i >= 0; i--) {
        if (config.stale?.[queue[i].id]?.(run(), queue[i])) unsee(queue.splice(i, 1)[0]);
      }
      if (!queue.length || run().pendingChoice) return;
      // the most important tip first; an urgent one waits only urgentGap
      const urgent = config.urgent.includes(queue[0].id);
      if (wait < (urgent ? Math.min(need, config.urgentGap) : need)) return;
      showTip(queue.shift());
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
    /** Autoplay: step aside (no bubbles, no tips, no countdown hold); resume the opening when it stops. */
    setMuted(v) {
      v = !!v;
      if (v === muted) return;
      if (v) {
        hide(); // the player saw it go
        muted = true;
        if (tip) {
          // a tip cut short comes back after autoplay (the same words: not logged again)
          const { t, up, ...q } = tip;
          tip = null;
          enqueue({ ...q, reshow: true });
        }
        run().setHold?.(false);
        return;
      }
      muted = false;
      if (guided < 0) return;
      // catch up with what autoplay did: a started wave ends the opening, a 16 ends the
      // first step, and with no coins left only Wave now is still possible
      if (config.endOnWave && run().phase !== 'prep') return guide(GUIDED.length);
      let i = guided;
      while (i < GUIDED.length && GUIDED[i].doneOn === 'turret' && run().tiles.some((t) => stageFor(t.tier) >= 1)) i += 1;
      if (config.brokeStep && run().coins < run().swipeCost) i = Math.max(i, GUIDED.findIndex((g) => g.id === config.brokeStep));
      run().setHold?.(!GUIDED.slice(0, i + 1).some((g) => g.release)); // hold again until the release step
      guide(i, { reshow: i === guided });
    },
  };
}
