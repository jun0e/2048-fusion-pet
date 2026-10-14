import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoach, COACH, COACH_BASELINE, wordCount } from '../src/ux/coach.js';
import { createJourney } from '../src/ux/journey.js';
import { causeLine, lossHint, returnGoal, gameOverWords } from '../src/ux/journey-tuning.js';
import { createRun } from '../src/sim/run.js';
import { ECONOMY, GUIDED_WAVE, PHYSICS } from '../src/config.js';
import { playJourney, PROFILES } from '../tools/journey-probe.mjs';

/** The smallest run the coach needs. */
function fakeRun() {
  return {
    hold: null,
    guidedWave: false,
    tiles: [{ id: 1, tier: 4 }],
    wave: { bossLane: null },
    waveNo: 1,
    pendingChoice: null,
    setHold(v) {
      this.hold = v;
    },
    setGuidedWave(v) {
      this.guidedWave = v;
    },
  };
}

const tick = (coach, seconds) => {
  for (let t = 0; t < seconds; t += 0.1) coach.update(0.1);
};

test('baseline coach: the opening as it shipped (swipe, cost, defend, start)', () => {
  const run = fakeRun();
  const coach = createCoach({ getRun: () => run, config: COACH_BASELINE });
  coach.start(run);
  assert.equal(run.hold, true, 'the opening countdown waits');
  assert.equal(run.guidedWave, false);
  assert.equal(coach.view.id, 'swipe');
  assert.ok(coach.view.skip && coach.view.hand);
  coach.onSwipe();
  assert.equal(coach.view.id, 'cost');
  coach.ok();
  assert.equal(coach.view.id, 'defend');
  coach.ok();
  assert.equal(coach.view.id, 'start');
  assert.equal(run.hold, false, 'the start step lets the countdown run');
  coach.onEvent({ type: 'waveStart', wave: 1, lanes: [0] });
  assert.equal(coach.store.guided, true);
});

test('tuned opening: short bubbles, no required taps, steps advance by playing', () => {
  const run = fakeRun();
  const coach = createCoach({ getRun: () => run, config: COACH });
  coach.start(run);
  assert.equal(run.guidedWave, true, 'first run: wave 1 is aimed at the first turret');
  for (const g of COACH.guided) {
    assert.ok(wordCount(g.text) <= 8, `"${g.id}" has 8 words or fewer`);
    assert.ok(!g.ok, `"${g.id}" needs no Got it tap`);
  }
  assert.equal(coach.view.id, 'swipe');
  coach.onSwipe();
  assert.equal(coach.view.id, 'turret');
  assert.deepEqual(coach.view.target, { tile: 1 }, '"top" points at the biggest block');
  tick(coach, 4.2);
  assert.equal(coach.view.id, 'grow', 'the turret step moves on by itself');
  coach.onSwipe();
  coach.onSwipe();
  assert.equal(coach.view.id, 'grow');
  coach.onSwipe();
  assert.equal(coach.view.id, 'start', 'three swipes finish the grow step');
  assert.equal(run.hold, false);
  coach.onEvent({ type: 'waveStart', wave: 1, lanes: [1] });
  assert.equal(coach.store.guided, true);
  assert.equal(coach.store.seen.has('awaken'), true, 'the turret step already covered the awaken tip');
});

test('tuned tips: urgent first, depth waits for its wave, ordinary tips 16 s apart', () => {
  const run = fakeRun();
  const coach = createCoach({ getRun: () => run, store: { guided: true, seen: new Set() }, config: COACH });
  coach.start(run);
  coach.onEvent({ type: 'override', tileId: 1 }); // colour: depth, waits for wave 3
  coach.onEvent({ type: 'coins', reason: 'kill' }); // core
  coach.onEvent({ type: 'tileHit', id: 1 }); // urgent
  tick(coach, 0.2);
  assert.equal(coach.view.id, 'attacked', 'the urgent tip jumps the queue');
  assert.equal(coach.store.seen.has('lost'), true, 'the attacked tip also says what the lost tip says');
  tick(coach, 10); // attacked hides after its reading time; the gap starts
  assert.equal(coach.view, null);
  tick(coach, 10);
  assert.equal(coach.view, null, 'an ordinary tip waits out the gap');
  tick(coach, 2.5);
  assert.equal(coach.view?.id, 'coins');
  tick(coach, 40);
  assert.equal(coach.view, null, 'colour waits for wave 3');
  run.waveNo = 3;
  tick(coach, 0.2);
  assert.equal(coach.view?.id, 'colour');
});

test('tips show once; notes show but are not remembered', () => {
  const run = fakeRun();
  const store = { guided: true, seen: new Set() };
  const coach = createCoach({ getRun: () => run, store, config: COACH });
  coach.start(run);
  coach.onEvent({ type: 'coins', reason: 'kill' });
  tick(coach, 0.2);
  assert.equal(coach.view.id, 'coins');
  coach.ok();
  coach.onEvent({ type: 'coins', reason: 'kill' });
  tick(coach, 30);
  assert.equal(coach.view, null, 'a seen tip does not come back');
  coach.note('Your best is wave 7. Beat it!');
  tick(coach, 0.2);
  assert.equal(coach.view.text, 'Your best is wave 7. Beat it!');
  assert.equal(store.seen.has('note'), false);
});

test('skip ends the opening and silences every tip', () => {
  const run = fakeRun();
  const coach = createCoach({ getRun: () => run, config: COACH });
  coach.start(run);
  coach.skipAll();
  assert.equal(coach.view, null);
  assert.equal(run.hold, false);
  coach.onEvent({ type: 'tileHit', id: 1 });
  tick(coach, 1);
  assert.equal(coach.view, null);
});

test('journey log: milestones in order, words counted before the first swipe', () => {
  let t = 0;
  const j = createJourney({ now: () => t });
  j.onRunStart();
  j.onCoach('show', { kind: 'guided', id: 'swipe', words: 6 });
  t = 2.5;
  j.onSwipe();
  j.onCoach('show', { kind: 'guided', id: 'turret', words: 7 });
  j.onRunEvent({ type: 'merge', tier: 4 });
  j.onRunEvent({ type: 'classed', stage: 1, element: 'fire' });
  t = 10;
  j.onRunEvent({ type: 'waveStart', wave: 1 });
  t = 40;
  j.onRunEvent({ type: 'gameover', wave: 3, score: 100, maxTier: 5 });
  t = 45;
  j.onRunStart();
  t = 46;
  j.onSwipe();
  const s = j.snapshot();
  assert.equal(s.wordsBeforeFirstSwipe, 6);
  assert.equal(s.wordsBeforeFirstWave, 13);
  assert.equal(s.marks.firstSwipe.t, 2.5);
  assert.equal(s.marks.firstTurret.t, 2.5);
  assert.equal(s.marks.gameOver.wave, 3);
  assert.equal(s.marks.retry.t, 45);
  assert.equal(s.marks.retrySwipe.t, 46);
});

test('guided first wave: aimed down the biggest block, with fewer foes', () => {
  const r = createRun({ seed: 5 });
  const before = r.wave.count;
  r.setGuidedWave(true);
  const top = r.tiles.reduce((b, t) => (!b || t.tier > b.tier ? t : b), null);
  assert.deepEqual(r.wave.lanes, [top.col]);
  assert.equal(r.wave.count, GUIDED_WAVE.count);
  assert.ok(before > GUIDED_WAVE.count);
  assert.ok(r.wave.spawns.every((sp) => sp.lane === top.col));
  assert.ok(r.move('right') || r.move('left'));
  const top2 = r.tiles.reduce((b, t) => (!b || t.tier > b.tier ? t : b), null);
  assert.deepEqual(r.wave.lanes, [top2.col], 'the lit lane follows the biggest block');
});

test('a break shrinks when no swipe is possible, and only then', () => {
  /** Merge the opening 8s into a 16, aim wave 1 at it, and play to the break. */
  const toBreak = (opts) => {
    const r = createRun({ seed: 3, ...opts });
    r.setGuidedWave(true);
    assert.ok(r.move('right'), 'the opening swipe makes a 16');
    r.nextWave();
    for (let i = 0; i < 120 / PHYSICS.dt && r.phase !== 'break'; i++) {
      r.step();
      r.drainEvents();
    }
    assert.equal(r.phase, 'break', 'the guided wave is cleared');
    return r;
  };
  const r = toBreak({});
  assert.ok(r.coins >= r.swipeCost, 'coins left after the wave');
  r.step();
  assert.ok(r.timer > ECONOMY.brokeBreak, 'a swipe is possible: the break keeps its length');
  r.addCoins(-1e6); // out of coins
  r.drainEvents();
  r.step();
  assert.ok(r.timer <= ECONOMY.brokeBreak + 1e-9, 'no swipe possible: a short break');
  assert.ok(r.drainEvents().some((e) => e.type === 'breakShortened'));

  const old = toBreak({ brokeBreak: null });
  old.addCoins(-1e6);
  old.step();
  assert.ok(old.timer > ECONOMY.brokeBreak, 'the rule can be switched off (the baseline journey)');
});

test('game-over copy and the retry hint', () => {
  assert.equal(causeLine({ wave: 4, by: 'Pixie' }), 'A Pixie broke your last block on wave 4.');
  assert.equal(causeLine({ wave: 4 }), 'Your last block fell on wave 4.');
  assert.match(lossHint({ wave: 2, maxTier: 3 }), /16/);
  assert.match(lossHint({ wave: 2, maxTier: 5 }), /lit lanes/);
  assert.match(lossHint({ wave: 9, maxTier: 7 }), /spare/);
  assert.equal(returnGoal(0), null);
  assert.equal(returnGoal(12), 'Your best is wave 12. Beat it!');
  assert.ok(gameOverWords() >= 14);
});

test('journey probe: the tuned first run beats the baseline for a novice', () => {
  const seeds = [1, 2, 3, 4, 5, 6];
  const base = seeds.map((seed) => playJourney({ seed, persona: 'novice', profile: PROFILES.baseline, maxSeconds: 240, retry: false }));
  const tuned = seeds.map((seed) => playJourney({ seed, persona: 'novice', profile: PROFILES.tuned, maxSeconds: 240, retry: false }));
  for (const r of tuned) {
    assert.ok(r.wordsBeforeFirstSwipe <= 8);
    assert.equal(r.taps, 0, 'no required taps');
    assert.ok(r.lossWave == null || r.lossWave > 3, `seed ${r.seed}: no loss in the first 3 waves`);
  }
  const med = (rows, k) => rows.map((r) => r[k]).sort((a, b) => a - b)[rows.length >> 1];
  assert.ok(med(tuned, 'firstTurret') < med(base, 'firstTurret'));
  assert.ok(med(tuned, 'wordsBeforeFirstWave') < med(base, 'wordsBeforeFirstWave'));
});
