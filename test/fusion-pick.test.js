import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/sim/run.js';
import { fusionKey, fusionOffers, materialOf, mergeMaterial } from '../src/sim/classes.js';
import { describeTile } from '../src/sim/describe.js';
import { recordRun, replayRun, fingerprint } from '../src/ux/resume.js';

/** A block placed with its element and the material that went into it. */
function block(r, tier, col, row, element, mats) {
  const t = r.spawnDebug(tier, col, row);
  t.cls = { element };
  t.mats = mats;
  return t;
}
const run = (opts = {}) => createRun({ seed: 1, empty: true, levels: false, dice: ['fire', 'ice', 'lightning'], ...opts });

test('a block keeps its material: the elements of every elemental block merged into it', () => {
  assert.deepEqual(mergeMaterial(['ice'], ['fire', 'metal'], ['ice']), ['fire', 'ice', 'metal']);
  assert.deepEqual(materialOf({ cls: { element: 'fire', fusion: 'ice' } }), ['fire', 'ice'], 'a block without a record counts its own elements');
  assert.deepEqual(materialOf({ mats: [], cls: { element: 'fire' } }), ['fire'], 'and so does a block given its class directly (presets, ?debug)');
  const r = run();
  block(r, 4, 0, 0, 'fire', ['fire']);
  block(r, 4, 1, 0, 'ice', ['ice']);
  assert.ok(r.move('left'));
  const t = r.tiles.find((x) => x.tier === 5);
  assert.equal(t.cls.element, 'ice', 'the block that slid in keeps its element (as before)');
  assert.deepEqual(t.mats, ['fire', 'ice'], 'but the fire is remembered');
});

test('fusion offers come from the material only: the merge rule\'s pick first, then the other pairs', () => {
  const offers = fusionOffers({ element: 'ice', fusion: 'fire' }, ['fire', 'ice', 'lightning']);
  assert.deepEqual(
    offers.map((o) => [o.element, o.fusion]),
    [
      ['ice', 'fire'],
      ['ice', 'lightning'],
      ['fire', 'lightning'],
    ],
  );
  assert.equal(offers[0].name, 'Frostnova');
  assert.equal(offers[0].key, fusionKey('fire', 'ice'));
  assert.deepEqual(
    fusionOffers({ element: 'fire', fusion: 'ice' }, ['fire', 'poison']).map((o) => o.fusion),
    ['poison'],
    'an element that is not in the material is never offered',
  );
  assert.equal(fusionOffers({ element: 'fire' }, ['fire', 'ice', 'lightning', 'poison', 'earth']).length, 4, 'at most 4 cards');
});

test('reaching 256 with three elements in the material opens a fusion pick; the pick sets the fusion', () => {
  const r = run();
  block(r, 7, 0, 0, 'fire', ['fire', 'lightning']);
  block(r, 7, 1, 0, 'ice', ['ice']);
  r.drainEvents();
  assert.ok(r.move('left'));
  const ev = r.drainEvents();
  assert.ok(!ev.some((e) => e.type === 'classed' && e.stage === 2), 'not announced before the pick');
  assert.ok(!ev.some((e) => e.type === 'override'), 'no "Ice over Fire" while the player is choosing');
  const pick = r.pendingChoice;
  assert.equal(pick.kind, 'fusion');
  assert.equal(pick.offers.length, 3);
  assert.ok(ev.some((e) => e.type === 'choice' && e.kind === 'fusion'));
  const t = r.tiles.find((x) => x.id === pick.tileId);
  assert.deepEqual([t.cls.element, t.cls.fusion], ['ice', 'fire'], 'meanwhile it holds the merge rule\'s pick');
  assert.equal(r.move('right'), false, 'the game waits for the pick');

  assert.ok(r.choose(2)); // Plasma: fire + lightning
  assert.deepEqual(t.cls, { element: 'fire', fusion: 'lightning' });
  const classed = r.drainEvents().find((e) => e.type === 'classed');
  assert.ok(classed && classed.stage === 2 && classed.chosen && classed.info.name === 'Plasma');
  // the first 256 also unlocked dice: those cards come after the fusion pick
  assert.equal(r.pendingChoice?.kind, 'die');
});

test('no pick when the material allows one fusion; a same-element merge still fuses from the material', () => {
  const r = run();
  block(r, 7, 0, 0, 'fire', ['fire', 'poison']);
  block(r, 7, 1, 0, 'fire', ['fire']);
  r.drainEvents();
  assert.ok(r.move('left'));
  const t = r.tiles.find((x) => x.tier === 8);
  assert.deepEqual(t.cls, { element: 'fire', fusion: 'poison' }, 'the poison it was built from, not a rolled die');
  assert.ok(r.drainEvents().some((e) => e.type === 'classed' && e.stage === 2 && e.info.name === 'Brimstone'));
  assert.notEqual(r.pendingChoice?.kind, 'fusion');
});

test('a block made of one element only fuses with a rolled die, as before', () => {
  const r = run({ dice: ['fire', 'ice'] });
  block(r, 7, 0, 0, 'fire', ['fire']);
  block(r, 7, 1, 0, 'fire', ['fire']);
  assert.ok(r.move('left'));
  const t = r.tiles.find((x) => x.tier === 8);
  assert.deepEqual(t.cls, { element: 'fire', fusion: 'ice' }, 'the only other die');
  assert.deepEqual(t.mats, ['fire', 'ice']);
});

test('autoplay and tests (autoChoose) take the first card: the merge rule\'s own pick', () => {
  const r = run({ autoChoose: true });
  block(r, 7, 0, 0, 'fire', ['fire', 'lightning']);
  block(r, 7, 1, 0, 'ice', ['ice']);
  assert.ok(r.move('left'));
  r.step();
  const t = r.tiles.find((x) => x.tier === 8);
  assert.deepEqual(t.cls, { element: 'ice', fusion: 'fire' });
  assert.equal(r.pendingChoice, null);
});

test('a boss x2 that lifts a block to 256 also offers the pick from its material', () => {
  const r = createRun({ seed: 4, empty: true, levels: false, dice: ['fire', 'ice', 'lightning'] });
  r.spawnDebug(8, 0, 0).cls = { element: 'metal', fusion: 'earth' }; // the biggest block: the reward grows the others up to it
  block(r, 7, 3, 3, 'fire', ['fire', 'ice', 'lightning']);
  r.nextWave();
  r.step(); // the 256 already on the board unlocks dice: their cards first
  while (r.pendingChoice) r.choose(0);
  const boss = r.defense.spawn('elfRuler', { hpScale: 1 });
  r.defense.damage(boss, 1e9, ['fire']);
  r.step();
  const pick = r.pendingChoice;
  assert.equal(pick?.kind, 'fusion');
  assert.ok(pick.promoted);
  assert.ok(pick.offers.every((o) => ['fire', 'ice', 'lightning'].includes(o.element) && ['fire', 'ice', 'lightning'].includes(o.fusion)));
  assert.ok(r.choose(1));
  const t = r.tiles.find((x) => x.id === pick.tileId);
  assert.equal(t.tier, 8);
  assert.deepEqual([t.cls.element, t.cls.fusion], [pick.offers[1].element, pick.offers[1].fusion]);
});

test('the block card lists the fusions its material allows', () => {
  const d = describeTile({ tier: 6, cls: { element: 'ice' }, mats: ['fire', 'ice', 'lightning'] });
  assert.match(d.next, /it can become Frostnova, .+ or Plasma, from the elements merged into it \(you pick\)/);
  const one = describeTile({ tier: 6, cls: { element: 'ice' }, mats: ['ice'] });
  assert.match(one.next, /Fuses with a second element at 256/);
});

test('a run with a fusion pick saves and replays exactly', () => {
  const setup = (r) => {
    block(r, 7, 0, 0, 'fire', ['fire', 'lightning']);
    block(r, 7, 1, 0, 'ice', ['ice']);
    return r;
  };
  const r = setup(run());
  const log = recordRun(r);
  assert.ok(r.move('left'));
  r.choose(2);
  while (r.pendingChoice) r.choose(0);
  for (let i = 0; i < 120; i++) r.step();
  const copy = replayRun((opts) => setup(createRun({ ...opts, empty: true, levels: false, dice: ['fire', 'ice', 'lightning'] })), JSON.parse(JSON.stringify(log)));
  assert.equal(fingerprint(copy), fingerprint(r));
  assert.ok(copy.tiles.some((t) => t.cls.element === 'fire' && t.cls.fusion === 'lightning'));
});
