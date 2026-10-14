// Journey log: when each first-run milestone happens, and how much tutorial
// text the player has seen by then. Pure (the clock is injected), so the same
// log runs in the browser (window.__mb.journey) and in the headless journey
// probe (tools/journey-probe.mjs). Times are seconds since the log started.

import { FLASH_SECONDS } from './journey-tuning.js';

/** The milestones, in the order a first run usually meets them. */
export const MILESTONES = ['firstSwipe', 'firstMerge', 'firstTurret', 'firstWave', 'firstHit', 'firstKill', 'firstLost', 'firstBroke', 'firstLocked', 'gameOver', 'retry', 'retrySwipe'];

export function createJourney({ now }) {
  const t0 = now();
  const at = () => now() - t0;
  const marks = {}; // milestone → { t, ...data }
  const shows = []; // every bubble shown: { t, kind, id, words, up: seconds on screen, null while it is up }
  let open = null; // the bubble on screen (one at a time)
  let since = 0; // when the bubble on screen (re)appeared
  let words = 0; // tutorial words shown so far
  let runs = 0;
  let over = false;

  function close() {
    if (open) open.up = (open.done ?? 0) + at() - since;
    open = null;
  }

  function mark(name, data = {}) {
    if (marks[name]) return false;
    marks[name] = { t: at(), words, ...data };
    return true;
  }

  return {
    /** Feed every run event. */
    onRunEvent(e) {
      switch (e.type) {
        case 'merge':
          mark('firstMerge', { tier: e.tier });
          break;
        case 'classed':
          if (e.stage === 1) mark('firstTurret', { element: e.element });
          break;
        case 'waveStart':
          if (e.wave === 1) mark('firstWave');
          break;
        case 'tileHit':
          mark('firstHit');
          break;
        case 'kill':
          mark('firstKill');
          break;
        case 'remove':
          if (e.reason === 'destroyed') mark('firstLost');
          break;
        case 'noCoins':
          mark('firstBroke');
          break;
        case 'locked':
          mark('firstLocked', { wave: e.wave });
          break;
        case 'gameover':
          over = true;
          mark('gameOver', { wave: e.wave, score: e.score, maxTier: e.maxTier });
          break;
      }
    },
    /** A swipe that moved the board. */
    onSwipe() {
      mark('firstSwipe');
      if (marks.retry) mark('retrySwipe');
    },
    /** A new run started (runs after the first are retries). */
    onRunStart() {
      runs += 1;
      if (runs > 1 && over) mark('retry');
    },
    /** Feed the coach's log: bubbles shown, the opening done or skipped, help opened. */
    onCoach(kind, data = {}) {
      if (kind === 'show') {
        close(); // a new bubble replaces the last one
        words += data.words ?? 0;
        open = { t: at(), kind: data.kind, id: data.id, words: data.words ?? 0, up: null };
        since = open.t;
        shows.push(open);
      } else if (kind === 'reshow') {
        // the same bubble back after autoplay: no new words; its time on screen adds up
        close();
        open = shows.findLast((s) => s.kind === data.kind && s.id === data.id) ?? null;
        if (open) {
          open.done = open.up ?? 0;
          open.up = null;
          since = at();
        }
      } else if (kind === 'hide') close();
      else if (kind === 'done') mark('openingDone');
      else if (kind === 'skip') mark('openingSkipped');
      else if (kind === 'help') mark('firstHelp');
    },
    get words() {
      return words;
    },
    /** A plain copy for reports: milestones, bubbles and derived numbers. */
    snapshot() {
      const tips = shows.filter((s) => s.kind === 'tip');
      let minTipGap = null;
      for (let i = 1; i < tips.length; i++) {
        const g = tips[i].t - tips[i - 1].t;
        if (minTipGap == null || g < minTipGap) minTipGap = g;
      }
      return {
        t: at(),
        marks: structuredClone(marks),
        shows: shows.map(({ done, ...s }) => s),
        words,
        wordsBeforeFirstSwipe: marks.firstSwipe?.words ?? null,
        wordsBeforeFirstWave: marks.firstWave?.words ?? null,
        tipsShown: tips.length,
        tipFlashes: tips.filter((s) => s.up != null && s.up < FLASH_SECONDS).length,
        minTipGap,
      };
    },
  };
}
