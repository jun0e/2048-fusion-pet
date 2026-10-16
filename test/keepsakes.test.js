import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, maxHpFor, killCoinsFor, swipeCostFor } from '../src/sim/run.js';
import { createGrid } from '../src/sim/grid.js';
import { createRng } from '../src/sim/rng.js';
import { turretDamage } from '../src/sim/classes.js';
import { KEEPSAKES, STARTER_KEEPSAKE, keepsakeById, newlyUnlocked, nextKeepsake, unlockedKeepsakes } from '../src/sim/keepsakes.js';
import { punchTargets, punchingSwipes, slidePaths } from '../src/sim/punch.js';
import { loadMeta, saveMeta, recordBest, isFirstRun, unseenKeepsakes, META_KEY } from '../src/ux/meta.js';
import { recordRun, replayRun, fingerprint, loadSaved, saveRun } from '../src/ux/resume.js';
import { createCoach, COACH, fistHint } from '../src/ux/coach.js';
import { ECONOMY, FIELD, GRID, PHYSICS, cellX, cellY } from '../src/config.js';

const DIRS = ['left', 'right', 'up', 'down'];
const fakeStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
/** A foe standing still at (col, y) on the board. */
function foeAt(r, col, y, hpScale = 1000) {
  const e = r.defense.spawn('pixie', { lane: col, hpScale, s: FIELD.spawnY - y });
  e.speed = 0;
  return e;
}

test('six keepsakes; Iron Fist is the starter; the biggest block ever unlocks the rest in order', () => {
  assert.equal(KEEPSAKES.length, 6);
  assert.equal(new Set(KEEPSAKES.map((k) => k.id)).size, 6);
  assert.equal(KEEPSAKES[0].id, STARTER_KEEPSAKE);
  assert.equal(KEEPSAKES[0].unlockTier, 0);
  for (let i = 1; i < KEEPSAKES.length; i++) assert.ok(KEEPSAKES[i].unlockTier > KEEPSAKES[i - 1].unlockTier);
  assert.deepEqual(
    unlockedKeepsakes(0).map((k) => k.id),
    ['ironFist'],
  );
  assert.deepEqual(
    unlockedKeepsakes(8).map((k) => k.id),
    ['ironFist', 'coinPurse', 'spikedCollar'],
  );
  assert.equal(nextKeepsake(8).id, 'luckyClover');
  assert.equal(nextKeepsake(16), null);
  assert.deepEqual(
    newlyUnlocked(6, 9).map((k) => k.id),
    ['coinPurse', 'spikedCollar', 'luckyClover'],
  );
  assert.deepEqual(newlyUnlocked(9, 9), []);
});

test("slidePaths predicts the grid's own swipe on random boards (where every block goes, merges too)", () => {
  const rng = createRng(77);
  for (let trial = 0; trial < 300; trial++) {
    const g = createGrid({ seed: trial, spawn: false });
    for (let row = 0; row < GRID.size; row++) {
      for (let col = 0; col < GRID.size; col++) if (rng.next() < 0.55) g.place(1 + Math.floor(rng.next() * 4), col, row);
    }
    const dir = DIRS[trial % 4];
    const before = g.tiles.map((t) => ({ id: t.id, col: t.col, row: t.row }));
    const paths = slidePaths(g.tiles, dir);
    g.move(dir);
    for (const p of paths) {
      const at = g.at(p.to.col, p.to.row);
      assert.ok(at, 'a block ends where the path ends');
      if (p.merged) assert.ok(at.mergedFrom?.some((m) => m.id === p.id), 'a merging block ends in the merged one');
      else assert.equal(at.id, p.id);
    }
    // every block that moved has a path, and no block that stayed has one
    for (const b of before) {
      const still = g.tiles.find((t) => t.id === b.id);
      const moved = still ? still.col !== b.col || still.row !== b.row : !g.tiles.some((t) => t.mergedFrom?.some((m) => m.id === b.id && m.col === t.col && m.row === t.row));
      assert.equal(paths.some((p) => p.id === b.id), moved, `block ${b.id} (${dir})`);
    }
  }
});

test('a punch lands on a monster ahead of a moving block, up to just past its new cell; not beside, not behind', () => {
  const paths = [{ id: 1, tier: 4, from: { col: 1, row: 0 }, to: { col: 1, row: 2 }, merged: false }];
  const x = cellX(1);
  const foe = (id, fx, fy) => ({ id, x: fx, y: fy, dead: false });
  const hit = (f) => punchTargets(paths, [f], 'up').length === 1;
  assert.ok(hit(foe(1, x, cellY(1))), 'in the path');
  assert.ok(hit(foe(2, x, cellY(2) + 1.15)), 'biting the new cell from above (contact range)');
  assert.ok(!hit(foe(3, x, cellY(2) + 1.6)), 'too far past it');
  assert.ok(!hit(foe(4, cellX(2), cellY(1))), 'the next column is safe');
  assert.ok(!hit(foe(5, x, cellY(0) - 0.5)), 'behind the block');
  assert.ok(!hit({ ...foe(6, x, cellY(1)), dead: true }), 'not a dead one');
  // two blocks through one monster: one punch, from the bigger block
  const two = [...paths, { id: 2, tier: 6, from: { col: 1, row: 1 }, to: { col: 1, row: 3 }, merged: false }];
  const got = punchTargets(two, [foe(7, x, cellY(2))], 'up');
  assert.equal(got.length, 1);
  assert.equal(got[0].path.tier, 6);
});

test('Iron Fist in a run: a block slid into a monster punches it with its base hit; a kill pays coins', () => {
  const r = createRun({ seed: 3, empty: true, keepsake: 'ironFist', levels: false });
  r.spawnDebug(4, 1, 0);
  const e = foeAt(r, 1, 5);
  const side = foeAt(r, 2, 5);
  r.drainEvents();
  assert.ok(r.move('up'));
  const punch = r.drainEvents().find((x) => x.type === 'punch');
  assert.ok(punch, 'a punch event');
  assert.equal(punch.id, e.id);
  assert.equal(punch.dir, 'up');
  assert.ok(Math.abs(punch.amount - turretDamage(4) * keepsakeById('ironFist').punch.mult) < 1e-6);
  assert.ok(Math.abs(e.maxHp - e.hp - punch.amount) < 1e-6);
  assert.equal(side.hp, side.maxHp, 'the monster in the next lane is not hit');

  // a weak monster dies to the punch; the coins come with the next step, like any kill
  const k = createRun({ seed: 3, empty: true, keepsake: 'ironFist', levels: false });
  k.spawnDebug(4, 1, 0);
  foeAt(k, 1, 5, 1);
  const coins = k.coins;
  assert.ok(k.move('up'));
  k.step();
  const ev = k.drainEvents();
  assert.ok(ev.some((x) => x.type === 'punch' && x.kill));
  assert.equal(k.coins, coins - swipeCostFor(0) + killCoinsFor(1, false));

  // no keepsake: no punch
  const n = createRun({ seed: 3, empty: true, levels: false });
  n.spawnDebug(4, 1, 0);
  const f = foeAt(n, 1, 5);
  assert.ok(n.move('up'));
  assert.equal(f.hp, f.maxHp);
});

test('the tutorial finds the swipe that punches now (and the block that would land it)', () => {
  const r = createRun({ seed: 3, empty: true, keepsake: 'ironFist', levels: false });
  const b = r.spawnDebug(4, 2, 0);
  foeAt(r, 2, 3.2);
  assert.deepEqual(punchingSwipes(r.tiles, r.enemies, keepsakeById('ironFist').punch), { up: 1 });
  const h = fistHint(r);
  assert.equal(h.dir, 'up');
  assert.match(h.text, /swipe up to punch/);
  assert.deepEqual(h.target, { tile: b.id });
  const none = fistHint({ keepsake: 'ironFist', tiles: r.tiles, enemies: [] });
  assert.equal(none.dir, null);
  assert.equal(none.hand, false);
});

test('Coin Purse: 60 more coins at the start, and kills pay 20% more', () => {
  const r = createRun({ seed: 3, empty: true, keepsake: 'coinPurse', levels: false });
  assert.equal(r.coins, ECONOMY.startCoins + 60);
  const e = foeAt(r, 0, 12, 1);
  r.drainEvents();
  r.defense.damage(e, 1e9, ['fire']);
  r.step();
  const coins = r.drainEvents().find((x) => x.type === 'coins' && x.reason === 'kill');
  assert.equal(coins.amount, Math.round(killCoinsFor(1, false) * 1.2));
});

test('Spiked Collar: every block has 30% more hidden health; Lucky Clover: spawns use 2 levels more', () => {
  const r = createRun({ seed: 3, empty: true, keepsake: 'spikedCollar' });
  const t = r.spawnDebug(4, 0, 0);
  assert.equal(t.maxHp, Math.round(maxHpFor(4) * 1.3));
  const c = createRun({ seed: 3, keepsake: 'luckyClover' });
  assert.equal(c.level, 1);
  assert.equal(c.spawnLevel, 3);
});

test('Phoenix Feather: the last block rises once, as the biggest block lost this run, and blasts the board clear', () => {
  const r = createRun({ seed: 3, empty: true, keepsake: 'phoenixFeather', levels: false, dice: ['fire', 'ice'], autoChoose: true });
  const big = r.spawnDebug(9, 0, 0);
  big.cls = { element: 'fire', fusion: 'ice' };
  const last = r.spawnDebug(1, 3, 3);
  const e = foeAt(r, 3, 5);
  e.mode = 'hunt';
  big.hp = 0;
  r.step(); // the 512 falls
  assert.ok(!r.tiles.includes(big));
  const coins = r.coins;
  last.hp = 0;
  r.step(); // the last block would fall: it rises
  const ev = r.drainEvents();
  assert.ok(ev.some((x) => x.type === 'phoenix' && x.tier === 9));
  assert.equal(r.over, false);
  assert.equal(last.tier, 9, 'it came back as the 512');
  assert.deepEqual(last.cls, { element: 'fire', fusion: 'ice' });
  assert.ok(['fire', 'ice'].every((e) => last.mats.includes(e)), 'with the lost block\'s material');
  assert.equal(last.hp, last.maxHp);
  assert.equal(e.mode, 'lane', 'the monster was thrown back up its lane');
  assert.ok(e.s <= 1.1, 'to the gates');
  assert.equal(r.coins, coins + 4 * swipeCostFor(r.swipes));
  assert.equal(r.phoenixReady, false);
  last.hp = 0;
  r.step(); // once a run
  assert.equal(r.over, true);
});

test('Quake Boots: a swipe with 2 merges stomps every monster on the board (damage and a stun)', () => {
  const r = createRun({ seed: 3, empty: true, keepsake: 'quakeBoots', levels: false });
  r.spawnDebug(1, 0, 0);
  r.spawnDebug(1, 1, 0);
  r.spawnDebug(2, 2, 0);
  r.spawnDebug(2, 3, 0);
  const e = foeAt(r, 2, 6);
  e.mode = 'hunt';
  const far = foeAt(r, 1, 14); // still walking down its lane: not on the board
  r.drainEvents();
  assert.ok(r.move('left')); // 2+2 and 4+4
  const stomp = r.drainEvents().find((x) => x.type === 'stomp');
  assert.ok(stomp && stomp.merges === 2 && stomp.stunned === 1);
  assert.ok(e.stunT > 0);
  assert.ok(Math.abs(e.maxHp - e.hp - turretDamage(3)) < 1e-6, 'the top block (an 8) stomps for its base hit');
  assert.equal(far.hp, far.maxHp);
  assert.equal(far.stunT, 0);
});

test('the keepsake record: a new player, a round trip, a broken store, new unlocks', () => {
  const s = fakeStorage();
  const fresh = loadMeta(s);
  assert.deepEqual(fresh, { bestTier: 0, keepsake: 'ironFist', seen: ['ironFist'], runs: 0 });
  assert.ok(isFirstRun(fresh));
  const unlocked = recordBest(fresh, 8);
  assert.deepEqual(
    unlocked.map((k) => k.id),
    ['coinPurse', 'spikedCollar'],
  );
  assert.deepEqual(recordBest(fresh, 8), [], 'the same block again unlocks nothing');
  assert.deepEqual(
    unseenKeepsakes(fresh).map((k) => k.id),
    ['coinPurse', 'spikedCollar'],
  );
  fresh.keepsake = 'spikedCollar';
  fresh.runs = 2;
  saveMeta(fresh, s);
  assert.deepEqual(loadMeta(s), fresh);
  s.setItem(META_KEY, '{nope');
  assert.deepEqual(loadMeta(s), loadMeta(fakeStorage()));
  s.setItem(META_KEY, JSON.stringify({ bestTier: 2, keepsake: 'quakeBoots', seen: ['x'], runs: 1 }));
  assert.equal(loadMeta(s).keepsake, 'ironFist', 'a keepsake not yet unlocked falls back to the starter');
  assert.deepEqual(loadMeta(s).seen, []);
  const blocked = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  assert.equal(loadMeta(blocked).runs, 0);
  assert.doesNotThrow(() => saveMeta(fresh, blocked));
});

test('a run with a keepsake and bought XP saves and replays exactly', () => {
  // debug helpers (coins, a 64 that lifts the level cap) are not inputs: the replay's factory does them too
  const setup = (run) => {
    run.addCoins(400);
    run.spawnDebug(6, 3, 3);
    return run;
  };
  const r = setup(createRun({ seed: 14, keepsake: 'ironFist', autoChoose: true }));
  const log = recordRun(r);
  assert.equal(log.keepsake, 'ironFist');
  for (let i = 0; i < 400; i++) {
    if (i % 60 === 0) ['down', 'left', 'right', 'up'].some((d) => r.move(d));
    if (i === 90) r.buyXp();
    if (i === 120) r.nextWave();
    r.step();
  }
  const s = fakeStorage();
  const copyLog = JSON.parse(JSON.stringify(log));
  saveRun(r, log, s);
  assert.equal(loadSaved(s).log.keepsake, 'ironFist');
  const copy = replayRun((opts) => setup(createRun({ ...opts, autoChoose: true })), copyLog);
  assert.equal(copy.keepsake, 'ironFist');
  assert.equal(fingerprint(copy), fingerprint(r));
  assert.ok(log.inputs.some((x) => x[1] === 'buyXp'), 'Buy XP is an input');
});

test('the coach: with Iron Fist, the first bite brings the punch tip in slow motion; the punch ends it', () => {
  const tiles = [{ id: 1, tier: 4, col: 0, row: 0, x: cellX(0), y: cellY(0) }];
  const enemies = [{ id: 9, x: cellX(0), y: cellY(0) + 1.2, dead: false, mode: 'hunt' }];
  const run = { keepsake: 'ironFist', tiles, enemies, waveNo: 1, phase: 'wave', pendingChoice: null, setHold() {}, setGuidedWave() {} };
  const c = createCoach({ getRun: () => run, store: { guided: true, seen: new Set() } });
  c.start(run);
  c.onEvent({ type: 'tileHit', id: 1 });
  for (let i = 0; i < 300 && !c.view; i++) c.update(1 / 60);
  assert.equal(c.view?.id, 'fist');
  assert.equal(c.view.dir, 'up');
  assert.equal(c.view.hand, true);
  assert.equal(c.slowmo, COACH.slowmo.fist);
  c.onEvent({ type: 'punch', id: 9 });
  assert.equal(c.view, null);
  assert.equal(c.slowmo, 1);
  for (let i = 0; i < 300 && !c.view; i++) c.update(1 / 60);
  assert.equal(c.view?.id, 'fistDone');

  // the tip goes stale once no monster is on the board (and comes back at the next bite)
  const late = createCoach({ getRun: () => run, store: { guided: true, seen: new Set() } });
  late.start(run);
  late.onEvent({ type: 'tileHit', id: 1 });
  enemies[0].dead = true;
  for (let i = 0; i < 300; i++) late.update(1 / 60);
  assert.notEqual(late.view?.id, 'fist');
  assert.equal(late.slowmo, 1);
  enemies[0].dead = false;

  // autoplay's punch doesn't use up the lesson
  const auto = createCoach({ getRun: () => run, store: { guided: true, seen: new Set() } });
  auto.start(run);
  auto.setMuted(true);
  auto.onEvent({ type: 'punch', id: 9 });
  auto.setMuted(false);
  auto.onEvent({ type: 'tileHit', id: 1 });
  for (let i = 0; i < 300 && !auto.view; i++) auto.update(1 / 60);
  assert.equal(auto.view?.id, 'fist');

  // no Iron Fist: no punch tip
  const plain = { ...run, keepsake: null };
  const p = createCoach({ getRun: () => plain, store: { guided: true, seen: new Set() } });
  p.start(plain);
  p.onEvent({ type: 'tileHit', id: 1 });
  for (let i = 0; i < 300 && !p.view; i++) p.update(1 / 60);
  assert.notEqual(p.view?.id, 'fist');
});

test('the first run names its keepsake in the opening; a run without Iron Fist skips that step', () => {
  const opening = (keepsake) => {
    const run = { keepsake, tiles: [], enemies: [], waveNo: 1, phase: 'prep', coins: 100, swipeCost: 5, pendingChoice: null, setHold() {}, setGuidedWave() {} };
    const c = createCoach({ getRun: () => run, store: { guided: false, seen: new Set() } });
    c.start(run);
    const seen = [c.view.id];
    c.onEvent({ type: 'classed', stage: 1 }); // the first 16
    seen.push(c.view.id);
    c.onSwipe(); // turret → grow
    seen.push(c.view.id);
    for (let i = 0; i < 3; i++) c.onSwipe(); // grow → next
    seen.push(c.view.id);
    return seen;
  };
  assert.deepEqual(opening('ironFist'), ['swipe', 'turret', 'grow', 'keepsake']);
  assert.deepEqual(opening(null), ['swipe', 'turret', 'grow', 'start']);
});

test('punches work the same in every direction (left, right, down)', () => {
  const foe = (fx, fy) => [{ id: 1, x: fx, y: fy, dead: false }];
  const right = [{ id: 1, tier: 4, from: { col: 0, row: 1 }, to: { col: 2, row: 1 }, merged: false }];
  assert.equal(punchTargets(right, foe(cellX(1), cellY(1)), 'right').length, 1);
  assert.equal(punchTargets(right, foe(cellX(1), cellY(2)), 'right').length, 0, 'the next row is safe');
  const left = [{ id: 1, tier: 4, from: { col: 3, row: 1 }, to: { col: 1, row: 1 }, merged: false }];
  assert.equal(punchTargets(left, foe(cellX(0) + 0.9, cellY(1)), 'left').length, 1, 'just past its new cell');
  assert.equal(punchTargets(left, foe(cellX(3) + 0.5, cellY(1)), 'left').length, 0, 'behind it');
  const down = [{ id: 1, tier: 4, from: { col: 2, row: 3 }, to: { col: 2, row: 0 }, merged: false }];
  assert.equal(punchTargets(down, foe(cellX(2), cellY(1)), 'down').length, 1);
});

test('a run whose punches land replays exactly (Iron Fist is deterministic)', () => {
  const setup = (run) => {
    run.spawnDebug(4, 1, 0);
    run.spawnDebug(3, 2, 3);
    for (const [col, y] of [
      [1, 5],
      [2, 3],
    ]) {
      const e = run.defense.spawn('pixie', { lane: col, hpScale: 50, s: FIELD.spawnY - y });
      e.speed = 0;
    }
    return run;
  };
  const r = setup(createRun({ seed: 8, empty: true, keepsake: 'ironFist', autoChoose: true }));
  const log = recordRun(r);
  let punches = 0;
  for (let i = 0; i < 240; i++) {
    if (i % 30 === 0) ['up', 'down', 'left', 'right'].some((d) => r.move(d));
    r.step();
    punches += r.drainEvents().filter((e) => e.type === 'punch').length;
  }
  assert.ok(punches >= 1, 'punches landed');
  const copy = replayRun((opts) => setup(createRun({ ...opts, empty: true, autoChoose: true })), JSON.parse(JSON.stringify(log)));
  assert.equal(fingerprint(copy), fingerprint(r));
  assert.deepEqual(
    copy.enemies.map((e) => Math.round(e.hp)),
    r.enemies.map((e) => Math.round(e.hp)),
  );
});

test('Quake Boots needs 2 merges; a refused Buy XP keeps the coins', () => {
  const r = createRun({ seed: 3, empty: true, keepsake: 'quakeBoots', levels: false });
  r.spawnDebug(1, 0, 0);
  r.spawnDebug(1, 1, 0);
  const e = foeAt(r, 2, 6);
  e.mode = 'hunt';
  r.drainEvents();
  assert.ok(r.move('left')); // one merge
  assert.ok(!r.drainEvents().some((x) => x.type === 'stomp'));
  assert.equal(e.stunT, 0);

  const b = createRun({ seed: 3, empty: true });
  b.spawnDebug(4, 0, 0); // a 16: level 1 is the cap
  const coins = b.coins;
  assert.equal(b.buyXp(), false);
  assert.equal(b.coins, coins);
});

test('Lucky Clover: no XP for sale once the odds are at the top; a punch kill pays at once, even as a die card opens', () => {
  const c = createRun({ seed: 3, empty: true, keepsake: 'luckyClover' });
  c.spawnDebug(12, 0, 0); // a 4096: the cap is level 9
  c.addCoins(1e6);
  while (c.buyXp());
  assert.equal(c.spawnLevel, 9);
  assert.equal(c.level, 7, 'level 7 + the clover = the top odds: buying stops there');
  assert.equal(c.buyXpPrice, null);

  // the swipe makes the first 64 (a die card opens) and punches a weak monster to death
  const r = createRun({ seed: 3, empty: true, keepsake: 'ironFist', levels: false });
  r.spawnDebug(5, 1, 0);
  r.spawnDebug(5, 1, 1);
  foeAt(r, 1, 6, 1);
  const coins = r.coins;
  r.drainEvents();
  assert.ok(r.move('up'));
  const ev = r.drainEvents();
  assert.ok(r.pendingChoice, 'a die card is up');
  assert.ok(ev.some((x) => x.type === 'kill'), 'the kill is in the same swipe');
  assert.equal(r.coins, coins - swipeCostFor(0) + killCoinsFor(1, false));
});
