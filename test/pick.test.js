import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCEPT_SLACK, GATE_TOLERANCE, PET_STRICT, STRICT, acceptedMiss, failingGates, gateBrief, imagesFor, insideTolerance, lstar, needsStrict, rankCandidates, strictText } from '../tools/pick.mjs';

const ok = { contract: 0.2, twin: 0.1, twinChapter: 0.05, ally: 0.1, ground: 0.05 };
const cand = (n, score, margins = ok) => ({ n, score, margins, worst: Math.min(...Object.values(margins)) });

test('rank: a candidate inside the gates beats a higher score outside them, then score decides', () => {
  const outsideHigh = cand(1, 1.9, { ...ok, ground: -0.2 });
  const insideLow = cand(2, 0.8);
  const insideHigh = cand(3, 1.2);
  const hair = cand(4, 1.0, { ...ok, twin: -0.02 }); // inside, give or take a hair
  assert.deepEqual(rankCandidates([outsideHigh, insideLow, insideHigh, hair]).map((c) => c.n), [3, 4, 2, 1]);
  assert.deepEqual(rankCandidates([cand(5, 1), cand(6, 1)]).map((c) => c.n), [5, 6], 'ties keep their order');
  assert.deepEqual(rankCandidates([]), []);
});

test('tolerance: worst >= -0.03 is inside; just past it, or unscored, is outside', () => {
  assert.equal(GATE_TOLERANCE, -0.03);
  assert.ok(insideTolerance({ worst: 0 }));
  assert.ok(insideTolerance({ worst: -0.03 }));
  assert.ok(!insideTolerance({ worst: -0.031 }));
  assert.ok(!insideTolerance({}));
  assert.ok(!insideTolerance(null));
});

test('the strict round runs only when no candidate is inside the gates', () => {
  assert.equal(needsStrict([cand(1, 2, { ...ok, contract: -0.3 }), cand(2, 1, { ...ok, ground: -0.04 })]), true);
  assert.equal(needsStrict([cand(1, 2, { ...ok, contract: -0.3 }), cand(2, 0.5, { ...ok, ground: -0.01 })]), false, 'a weak score inside tolerance is enough');
  assert.equal(needsStrict([]), true, 'nothing usable: try the strict round');
});

test('failing gates, worst first', () => {
  assert.deepEqual(failingGates({ contract: -0.01, twin: 0.2, ground: -0.1, ally: 0 }), ['ground', 'contract']);
  assert.deepEqual(failingGates(undefined), []);
});

test('the strict text answers the gates the candidates missed', () => {
  const pick = { animal: 'beetle', pose: 'the two wing cases lifted up into a V' };
  const only = (margins) => strictText([cand(1, 1, { ...ok, ...margins })], pick);
  assert.equal(only({ contract: -0.2 }), STRICT.contract, 'contract → fill the silhouette exactly');
  const values = only({ ground: -0.05 });
  assert.equal(values, STRICT.values);
  assert.match(values, /cream zone bigger/);
  assert.match(values, /dark mass darker/);
  const twin = only({ twinChapter: -0.04 });
  assert.match(twin, /Exaggerate this beetle’s own distinctive features \(the two wing cases lifted up into a V\)/);
  assert.equal(only({ twin: -0.04 }), twin, 'a twin in any chapter or in its own: the same answer');
  // the ally gate compares outlines with the pets, so its answer is a shape, not a colour
  const ally = only({ ally: -0.02 });
  assert.equal(ally, STRICT.ally('beetle', pick.pose));
  assert.match(ally, /outline of one of the player’s pets \(a dragon, a bird/);
  assert.match(ally, /Exaggerate this beetle’s own distinctive features/);
  assert.doesNotMatch(ally, /muted|rim/, 'colour and rim do not change an outline');
  assert.equal(only({ twin: -0.04, ally: -0.02 }), STRICT.twin('beetle', pick.pose) + STRICT.allyToo, 'twin and ally: one shape line, plus the pets');
  // several candidates: every way they failed, contract first
  const all = strictText([cand(1, 1, { ...ok, ground: -0.1 }), cand(2, 1, { ...ok, contract: -0.1, ally: -0.1 })], pick);
  assert.equal(all, STRICT.contract + STRICT.values + STRICT.ally('beetle', pick.pose));
  assert.equal(strictText([], pick), STRICT.contract, 'nothing scored: the contract line');
});

test('a fusion pet’s strict lines: its twins are the other pets, its allies the foes and the base pets, its values its own tones', () => {
  const grounds = { lane: '#D9C7A3', hedge: '#4A5A52' };
  const pick = { side: 'pet', animal: 'sugar glider', pose: 'seen from above in a glide', cel: '#8A5A33', light: '#fffbda', grounds };
  const only = (margins, p = pick, ground) => strictText([{ ...cand(1, 1, { ...ok, ...margins }), ...(ground ? { ground } : {}) }], p);
  assert.equal(only({ contract: -0.2 }), STRICT.contract, 'the contract line is the same');
  // blended into the sand: its darker cel tone grows
  const sand = only({ ground: -0.05 }, pick, { lane: 0.2, hedge: 0.7 });
  assert.equal(sand, PET_STRICT.values('#8A5A33', null));
  assert.match(sand, /blended into the pale sand\. Make the darker #8A5A33 zone bigger/);
  assert.doesNotMatch(sand, /cream zone|dark mass|hedges/, 'not the foes’ rule, not the hedge’s');
  // blended into the hedges: its light zone grows (its lift, else its light tone), never the dark one
  const hedge = only({ ground: -0.05 }, { ...pick, cel: '#532b72', lift: '#CDEFA2' }, { lane: 0.6, hedge: 0.2 });
  assert.match(hedge, /blended into the dark hedges\. Make the light #CDEFA2 zone bigger/);
  assert.doesNotMatch(hedge, /darker/);
  assert.match(only({ ground: -0.05 }, pick, { lane: 0.6, hedge: 0.2 }), /light #fffbda zone/);
  assert.match(only({ ground: -0.05 }, pick, { lane: 0.2, hedge: 0.2 }), /pale sand and the dark hedges\. Make the darker #8A5A33 zone and the light #fffbda zone bigger/);
  assert.match(only({ ground: -0.05 }), /darker #8A5A33 zone bigger/, 'no shares to read: the sand’s line');
  assert.ok(lstar('#D9C7A3') > 80 && lstar('#4A5A52') < 40);
  const twin = only({ twin: -0.04 });
  assert.equal(twin, PET_STRICT.twin('sugar glider', pick.pose));
  assert.match(twin, /another of the player’s fusion pets/);
  assert.doesNotMatch(twin, /army/);
  const ally = only({ ally: -0.02 });
  assert.match(ally, /an enemy animal or of a baby pet \(a dragon, a bird/);
  assert.equal(only({ twin: -0.04, ally: -0.02 }), PET_STRICT.twin('sugar glider', pick.pose) + PET_STRICT.allyToo);
});

test('gateBrief keeps the version, the verdicts and the margins; imagesFor counts candidates', () => {
  const b = gateBrief({ ...cand(2, 1.1, { ...ok, ally: -0.02 }), gateVersion: 3, contract40: 0.8, path: '/x', gates: {} });
  assert.equal(b.gateVersion, 3);
  assert.equal(gateBrief({ ...cand(1, 1), rimPx: 6 }).rimPx, 6, 'a pet keeps the rim it was measured with');
  assert.ok(!('rimPx' in b), 'a foe has none to keep');
  assert.equal(b.n, 2);
  assert.equal(b.pass, false);
  assert.equal(b.inside, true);
  assert.equal(b.margins.ally, -0.02);
  assert.equal(b.path, undefined, 'no local paths in the manifest');
  assert.deepEqual(imagesFor({ model: 'm', pick: { n: 3 } }), { first: 3, most: 6 });
  assert.deepEqual(imagesFor({ model: 'm' }), { first: 1, most: 1 });
  assert.deepEqual(imagesFor({ model: null, from: 'fusion.fire+ice' }), { first: 0, most: 0 }, 'a job made from another’s raw makes no image');
});

test('an accepted miss is only the reviewed one: the same gates, each no worse than reviewed (+ slack)', () => {
  const accepted = { margins: { twinChapter: -0.05, ally: -0.006 }, why: 'reviewed' };
  const gate = (margins) => ({ margins, worst: Math.min(...Object.values(margins)) });
  assert.equal(acceptedMiss(gate({ ...ok, twinChapter: -0.05 }), accepted), true, 'the reviewed miss');
  assert.equal(acceptedMiss(gate({ ...ok, twinChapter: -0.05 - ACCEPT_SLACK, ally: -0.01 }), accepted), true, 'within the slack, both accepted gates');
  assert.equal(acceptedMiss(gate({ ...ok, twinChapter: -0.07 }), accepted), false, 'a worse miss than reviewed');
  assert.equal(acceptedMiss(gate({ ...ok, ally: -0.06 }), accepted), false, 'a gate missed worse than its own reviewed margin, though above the worst one');
  assert.equal(acceptedMiss(gate({ ...ok, contract: -0.3 }), accepted), false, 'a new gate (a re-made pose that left its contract)');
  assert.equal(acceptedMiss(gate({ ...ok, twinChapter: -0.02, ground: -0.01 }), accepted), false, 'an accepted gate plus a new one');
  assert.equal(acceptedMiss(gate(ok), accepted), false, 'nothing missed: nothing to accept');
  assert.equal(acceptedMiss(gate({ ...ok, twinChapter: -0.05 }), undefined), false, 'no review: no acceptance');
});
