// Journey log: when each first-run milestone happens, and how much tutorial
// text the player has seen by then. Pure (the clock is injected), so the same
// log runs in the browser (window.__mb.journey) and in the headless journey
// probe (tools/journey-probe.mjs). Times are seconds since the log started.

/** The milestones, in the order a first run usually meets them. */
export const MILESTONES = ['firstSwipe', 'firstMerge', 'firstTurret', 'firstWave', 'firstHit', 'firstKill', 'firstLost', 'firstBroke', 'firstLocked', 'gameOver', 'retry', 'retrySwipe'];

export function createJourney({ now }) {
  const t0 = now();
  const at = () => now() - t0;
  const marks = {}; // milestone → { t, ...data }
  const shows = []; // every bubble shown: { t, kind, id, words }
  let words = 0; // tutorial words shown so far
  let runs = 0;
  let over = false;

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
        words += data.words ?? 0;
        shows.push({ t: at(), kind: data.kind, id: data.id, words: data.words ?? 0 });
      } else if (kind === 'done') mark('openingDone');
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
        shows: shows.map((s) => ({ ...s })),
        words,
        wordsBeforeFirstSwipe: marks.firstSwipe?.words ?? null,
        wordsBeforeFirstWave: marks.firstWave?.words ?? null,
        tipsShown: tips.length,
        minTipGap,
      };
    },
  };
}
