import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADDON, ATTACK_EVENT, IMPACT_DECAL, IMPACT_PIECE, LADDER, PET_POSE, PIECE_LIT, STAGES, VFX_IDS, VFX_PIECES, WIND_UP, attackClass, attackLight, attackOf, createSimRate, has, ladderStage, leapAt, petPose, pieceLit, windUpAt } from '../src/art/attack-vfx.js';
import { DEFENSE, PHYSICS, tierValue } from '../src/config.js';
import { ELEMENTS, ELEMENT_KEYS, FUSIONS, profileFor } from '../src/sim/classes.js';
import { POINT, VFX_MARGIN, createLightBudget, spriteLit } from '../src/ux/photosafe.js';
import { createRun } from '../src/sim/run.js';
import { createDefense } from '../src/sim/defense.js';
import { createRng } from '../src/sim/rng.js';
import { fingerprint } from '../src/ux/resume.js';
import { bestDir } from '../src/autoplay.js';
import { audit } from '../tools/flash-audit.mjs';
import { VFX_FALLBACK } from '../src/render/vfx-fallback.js';
import { cellY, laneX } from '../src/config.js';

/** A block of an element at a stage, and the colours its attack events carry (classes.js profileFor). */
const blockAt = (el, stage, i = ELEMENT_KEYS.indexOf(el)) => {
  const partner = ELEMENT_KEYS[(i + 1) % 8];
  const apex = ELEMENT_KEYS[(i + 2) % 8];
  const [tier, cls] = { 16: [4, { element: el }], 64: [6, { element: el }], 128: [7, { element: el }], 256: [8, { element: el, fusion: partner }], 4096: [12, { element: el, fusion: partner, ultimate: apex }] }[stage];
  const t = { id: 1, tier, cls, x: laneX(1), y: cellY(3) };
  return { t, prof: profileFor(t), partner, apex };
};

/** The event an element's attack makes at a stage (as defense.js pushes it). */
function attackEvent(el, stage) {
  const { t, prof } = blockAt(el, stage);
  const base = { x: t.x, y: t.y, colors: prof.colors, tier: t.tier };
  const foe = { x: t.x, y: t.y + 3 };
  switch (ATTACK_EVENT[el]) {
    case 'breath':
      return { type: 'breath', ...base, dir: 1, reach: prof.shoot.reach, lanes: prof.shoot.lanes ?? 0, hits: 3 };
    case 'gust':
      return { type: 'gust', ...base, lane: 1, lanes: prof.shoot.lanes, reach: prof.shoot.reach, hits: 3 };
    case 'pulse':
      return { type: 'pulse', ...base, radius: prof.shoot.radius, hits: 3 };
    case 'quake':
      return { type: 'quake', ...base, lane: 1, lanes: prof.shoot.lanes, reach: prof.shoot.reach, hits: 3 };
    case 'pounce':
      return { type: 'pounce', from: { x: t.x, y: t.y }, to: foe, colors: prof.colors, tier: t.tier };
    case 'ping':
      return { type: 'ping', id: 9, ...foe, from: { x: t.x, y: t.y }, colors: prof.colors, tier: t.tier };
    default: // impacts: Horn Arc's chain, Venom Spit's landing
      return el === 'lightning'
        ? { type: 'impact', kind: 'zap', element: el, pattern: 'chain', ...base, chain: [{ x: t.x, y: t.y }, foe, { x: foe.x + 1.5, y: foe.y + 1 }, { x: foe.x + 2.5, y: foe.y + 2 }], splash: 0 }
        : { type: 'impact', kind: 'lob', element: el, pattern: 'spit', ...base, ...foe, splash: 2, miss: false };
  }
}

test('the ladder covers every element at every stage, and each stage adds exactly one visible thing', () => {
  assert.deepEqual(Object.keys(LADDER).sort(), Object.keys(VFX_PIECES).sort(), 'one ladder per element');
  for (const [el, ladder] of Object.entries(LADDER)) {
    assert.deepEqual(Object.keys(ladder).sort(), [...STAGES].sort(), `${el}: 16, 64, 128, 256, 4096`);
    STAGES.forEach((st, i) => {
      const step = ladder[st];
      assert.ok(step.says && step.says.length > 10, `${el} ${st} says what the player sees`);
      assert.ok(step.layers.length >= 1);
      assert.equal(new Set(step.layers).size, step.layers.length, `${el} ${st}: no layer twice`);
      if (i === 0) return;
      const prev = ladder[STAGES[i - 1]];
      const added = step.layers.filter((l) => !prev.layers.includes(l));
      assert.deepEqual(added, [step.adds], `${el} ${st} adds exactly one thing (${step.adds})`);
      assert.ok(prev.layers.every((l) => step.layers.includes(l)), `${el} ${st} keeps everything below it`);
      for (const k of ['embers', 'feathers', 'sparks', 'ghosts', 'dust']) if (prev[k] != null) assert.ok(step[k] >= prev[k], `${el} ${st}: ${k} never shrink`);
      // sizes in world units: the body grows a little, the reach with the sim; nothing shrinks up the ladder
      assert.ok(step.scale >= prev.scale && step.reach >= prev.reach, `${el} ${st}: scale ${step.scale}, reach ${step.reach}`);
      step.size.forEach((v, k) => assert.ok(v > 0 && v >= prev.size[k] - 1e-9, `${el} ${st}: size ${step.size}`));
    });
    assert.equal(ladder[256].adds, 'addon', `${el}: a fusion adds its partner's add-on`);
    assert.equal(ladder[4096].adds, 'echo', `${el}: an apex echoes the attack in its colour`);
  }
  for (const st of STAGES) assert.ok(PET_POSE[st], `the pet sells stage ${st}`);
});

test('a stage comes from the tile value (tier = log2 of the value) and the class', () => {
  const at = (value, kind) => ladderStage(Math.log2(value), kind);
  assert.equal(at(16), '16');
  assert.equal(at(32), '64');
  assert.equal(at(64), '64');
  assert.equal(at(128), '128');
  assert.equal(at(512), '128', 'a single element is fully grown past 128');
  assert.equal(ladderStage(8, 'fusion'), '256');
  assert.equal(ladderStage(11, 'fusion'), '256');
  assert.equal(ladderStage(12, 'apex'), '4096');
  assert.equal(tierValue(DEFENSE.classTiers[0]), 16);
  assert.equal(tierValue(DEFENSE.classTiers[1]), 256);
  assert.equal(tierValue(DEFENSE.classTiers[2]), 4096);
  // from the colours the sim's events carry
  for (const el of ELEMENT_KEYS) {
    for (const st of STAGES) {
      const e = attackEvent(el, st);
      assert.deepEqual(attackOf(e), { el, stage: st }, `${el} at ${st}`);
    }
  }
});

test('the class behind an attack: the first element’s shape, the fusion colour, the partner’s add-on, the apex', () => {
  for (const [key, f] of Object.entries(FUSIONS)) {
    for (const first of f.parts) {
      const c = attackClass([f.color], first);
      assert.equal(c.kind, 'fusion', key);
      assert.equal(c.first, first);
      assert.equal(c.partner, f.parts.find((p) => p !== first));
      assert.equal(c.tint, parseInt(f.color.slice(1), 16));
      for (const apex of ELEMENT_KEYS.filter((k) => !f.parts.includes(k))) {
        const a = attackClass([f.color, ELEMENTS[apex].color], first);
        assert.equal(a.kind, 'apex');
        assert.equal(a.apex, apex);
        assert.equal(a.apexTint, parseInt(ELEMENTS[apex].color.slice(1), 16));
      }
    }
  }
  for (const el of ELEMENT_KEYS) assert.deepEqual(attackClass([ELEMENTS[el].color], el).kind, 'single');
  assert.equal(attackClass(['#d9d2c5'], null).kind, 'plain');
  // every piece the renderer names exists
  for (const [el, a] of Object.entries(ADDON)) assert.ok(VFX_PIECES[el][a.piece], `${el} add-on ${a.piece}`);
  for (const [el, p] of Object.entries(IMPACT_PIECE)) assert.ok(VFX_PIECES[el][p], `${el} impact ${p}`);
  for (const [el, p] of Object.entries(IMPACT_DECAL)) assert.equal(VFX_PIECES[el][p]?.kind, 'decal', `${el} decal ${p}`);
});

test('every generated attack sprite has a code-drawn fallback, in sticker style', () => {
  assert.deepEqual(Object.keys(VFX_FALLBACK).sort(), [...VFX_IDS].sort());
  for (const [id, [w, h, draw]] of Object.entries(VFX_FALLBACK)) {
    assert.ok(w >= 32 && h >= 32 && w <= 256 && h <= 256, `${id}: ${w}×${h}`);
    let inks = 0;
    let marks = 0;
    const g = new Proxy(
      {},
      {
        get: (o, k) => (k in o ? o[k] : k === 'fill' || k === 'stroke' ? () => (marks += 1) : () => {}),
        set: (o, k, v) => {
          if ((k === 'strokeStyle' || k === 'fillStyle') && /^#2b1d2e$/i.test(v)) inks += 1; // the plum ink
          if (k === 'globalCompositeOperation' && v !== 'source-over') throw new Error(`${id}: no glow blends`);
          o[k] = v;
          return true;
        },
      },
    );
    draw(g, w, h);
    assert.ok(marks >= 1, `${id} draws something`);
    if (VFX_PIECES[id.split('.')[1]][id.split('.')[2]].tint) assert.ok(inks >= 1, `${id}: a tinted body keeps its plum outline`);
  }
});

test('every attack plans what it books in the light budget, and a higher stage never books less', () => {
  for (const el of ELEMENT_KEYS) {
    let prev = null;
    for (const st of STAGES) {
      const plan = attackLight(attackEvent(el, st));
      assert.ok(plan, `${el} ${st} has a plan`);
      assert.equal(plan.stage, st);
      for (const it of plan.items) {
        assert.ok(Number.isFinite(it.lit) && it.lit >= 0, `${el} ${st} ${it.key}: lit ${it.lit}`);
        assert.ok(it.life > 0 && it.life < 3, `${el} ${st} ${it.key}: life ${it.life}`);
        assert.ok(['bits', 'sprite', 'decal', 'line', 'ring'].includes(it.kind));
        assert.ok(it.lit < POINT.cap, `${el} ${st} ${it.key} alone stays under the cap`);
      }
      const keys = new Set(plan.items.map((it) => it.key));
      if (prev) for (const k of prev) assert.ok(keys.has(k), `${el} ${st} still books ${k}`);
      prev = keys;
    }
  }
  // the stage's new piece shows in the plan where it lights (moving ribbons and ghosts are exempt)
  assert.ok(attackLight(attackEvent('fire', '64')).items.some((it) => it.key === 'tongue'));
  assert.ok(!attackLight(attackEvent('fire', '16')).items.some((it) => it.key === 'tongue'));
  assert.ok(attackLight(attackEvent('fire', '128')).items.some((it) => it.key === 'scorch'));
  assert.ok(attackLight(attackEvent('nature', '64')).items.some((it) => it.key === 'tendrils'));
  assert.ok(attackLight(attackEvent('metal', '128')).items.some((it) => it.key === 'glint'));
  assert.ok(attackLight(attackEvent('lightning', '4096')).items.some((it) => it.key === 'echo'));
  // Reduce motion: the gust's ribbons fade in place, so they book
  const gust = attackEvent('wind', '128');
  assert.ok(!attackLight(gust).items.some((it) => it.key === 'ribbonFade'));
  assert.ok(attackLight(gust, { reduced: true }).items.some((it) => it.key === 'ribbonFade'));
  assert.equal(spriteLit(2, 0.5, 0.4), 0.4);
  assert.equal(spriteLit(-1, 2, 1), 0);
  // every piece's measured share, with the margin for a fuller generated sprite
  for (const id of VFX_IDS) assert.ok(PIECE_LIT[id.slice(4)] > 0, `${id} has a measured share`);
  for (const id of Object.keys(PIECE_LIT)) {
    assert.ok(pieceLit(id) >= Math.min(1, PIECE_LIT[id] * VFX_MARGIN) - 1e-9 && pieceLit(id) <= 1, id);
  }
});

test('a frantic second of sprite attacks never lights more than the cap at once', () => {
  const budget = createLightBudget();
  const rng = createRng(5);
  let peak = 0;
  let drawn = 0;
  let asked = 0;
  const events = ELEMENT_KEYS.flatMap((el) => STAGES.map((st) => attackEvent(el, st)));
  for (let ms = 0; ms < 2500; ms++) {
    budget.tick(0.001);
    if (ms % 16 === 0 && ms < 1500) {
      for (let k = 0; k < 6; k++) {
        const plan = attackLight(events[Math.floor(rng.next() * events.length)]);
        for (const it of plan.items) {
          asked += 1;
          const ok = it.all ? budget.bookAll(it.lit, it.life) : budget.book(it.lit, it.life, it.min ?? 0) > 0;
          if (ok) drawn += 1;
        }
      }
    }
    peak = Math.max(peak, budget.used);
  }
  assert.ok(peak <= POINT.cap + 1e-3, `lit ${peak.toFixed(3)} at once`);
  assert.ok(drawn >= 40, `${drawn} of ${asked} pieces still drawn (6 attacks a frame: far busier than any game)`);
});

test('the pet sells its stage: hop, crouch, recoil, lunge; a legendary never squashes, its halo swells', () => {
  const aim = { x: 0, y: 1 };
  assert.ok(petPose('16', 0.5, 0, aim).y > 0, '16 hops');
  assert.ok(petPose('64', 1, 0, aim).sy < 0.9, '32–64 crouch');
  assert.ok(Math.abs(petPose('64', 0, 1, aim).y) < 1e-9, 'a crouch has no recoil');
  assert.ok(petPose('128', 0, 1, aim).y < 0, '128 recoils away from its target');
  assert.ok(petPose('256', 0, 1, aim).y > 0.2, '256 lunges at its target');
  assert.ok(petPose('256', 1, 0, aim).y < 0, '256 leans back first');
  const dial = petPose('4096', 1, 1, aim);
  assert.equal(dial.sx, 1);
  assert.equal(dial.sy, 1);
  assert.ok(Math.abs(dial.x) + Math.abs(dial.y) + Math.abs(dial.rot) < 1e-9, 'it does not move');
  assert.ok(dial.halo > 1.2, 'the halo swells as the charge dial');
  for (const st of ['256']) for (let w = 0; w <= 1; w += 0.25) assert.ok(Math.abs(petPose(st, w, 0, aim).sy - 1) <= 0.05, 'fusions squash 5% at most');
  assert.ok(leapAt(0.08).k > 0 && leapAt(0.08).lift > 0, 'the pounce leaps out');
  assert.equal(leapAt(10), null, 'and is over');
  assert.ok(WIND_UP > 0.05 && WIND_UP < 0.3);
});

test('defense.cooldownLeft is read only: probing it every step changes no run', () => {
  const play = (probe) => {
    const run = createRun({ seed: 9, autoChoose: true, roaming: true });
    const log = [];
    let next = 0;
    let t = 0;
    for (let i = 0; i < (150 / PHYSICS.dt) && !run.over; i++) {
      t += PHYSICS.dt;
      run.step();
      if (probe) for (const tile of run.tiles) assert.ok(run.defense.cooldownLeft(tile.id) >= 0);
      for (const e of run.drainEvents()) log.push(JSON.stringify(e, (k, v) => (k === 'enemy' || k === 'prof' || k === 'tileRef' || k === 'info' ? undefined : v)));
      if (t >= next && run.coins >= run.swipeCost) {
        const d = bestDir(run);
        if (d) run.move(d);
        next = t + 0.5;
      }
      if (run.phase === 'break' || run.phase === 'prep') run.nextWave();
    }
    return { fp: fingerprint(run), log };
  };
  const plain = play(false);
  const probed = play(true);
  assert.equal(probed.fp, plain.fp);
  assert.equal(probed.log.length, plain.log.length);
  assert.deepEqual(probed.log, plain.log);
});

test('cooldownLeft counts down to the next shot, so the wind-up starts WIND_UP before it', () => {
  const d = createDefense({ rng: createRng(1) });
  const tile = { id: 5, x: laneX(1), y: cellY(3), tier: 6, cls: { element: 'ice' }, hp: 1e6, maxHp: 1e6 };
  d.spawn('pixie', { lane: 1, hpScale: 1e6, s: 6 });
  const rate = profileFor(tile).rate;
  let fired = 0;
  let windups = 0;
  let last = d.cooldownLeft(tile.id);
  for (let i = 0; i < 600; i++) {
    d.step(PHYSICS.dt, [tile]);
    const left = d.cooldownLeft(tile.id);
    const shot = d.drainEvents().some((e) => e.type === 'fire' && e.id === tile.id);
    if (shot) {
      fired += 1;
      assert.ok(Math.abs(left - 1 / rate) < 1e-9, 'a shot resets it to the full cooldown');
      if (fired > 1) assert.ok(last <= PHYSICS.dt + 1e-9, 'the shot came as it ran out');
    } else if (left > 0 && left <= WIND_UP) windups += 1;
    last = left;
  }
  assert.ok(fired >= 5, `${fired} shots`);
  assert.ok(windups >= (fired - 1) * Math.floor(WIND_UP / PHYSICS.dt) - 1, `${windups} wind-up steps`);
  assert.equal(d.cooldownLeft(999), 0, 'an unknown block is ready');
});

test('a pushed foe reports its slide, who pushed it and at what stage', () => {
  const d = createDefense({ rng: createRng(2) });
  const tile = { id: 3, x: laneX(2), y: cellY(3), tier: 7, cls: { element: 'wind' }, hp: 1e6, maxHp: 1e6 };
  const foe = d.spawn('pixie', { lane: 2, hpScale: 1e6, s: 5 });
  let pushed = null;
  for (let i = 0; i < 240 && !pushed; i++) {
    d.step(PHYSICS.dt, [tile]);
    pushed = d.drainEvents().find((e) => e.type === 'pushed');
  }
  assert.ok(pushed, 'the gust pushed it');
  assert.equal(pushed.id, foe.id);
  assert.equal(pushed.by, 'wind');
  assert.equal(pushed.tier, 7);
  assert.deepEqual(pushed.colors, [ELEMENTS.wind.color]);
  assert.ok(Math.abs(pushed.y - pushed.from.y - profileFor(tile).knockback) < 1e-9, 'back up its lane by the knockback');
  assert.equal(pushed.x, pushed.from.x);
});

test('the flash audit: the sprite attacks at every stage keep the light budget (no large flash from local effects)', () => {
  const rows = audit({ seeds: 1, minutes: 3, stressSeconds: 40, speeds: [4], ladderSeconds: 45 });
  for (const list of [rows, rows.ladder]) {
    const safe = list.find((r) => r.policy === 'photosafe');
    assert.ok(safe.large.perSecond <= 2, `${safe.large.perSecond} large flashes in a second`);
    assert.ok(safe.above.flashPerSecond <= 1);
    assert.equal(safe.point.pointPerSecond, 0, 'no large flash from local effects');
    assert.ok(safe.pointPeak <= POINT.cap + 1e-3, `local effects lit ${safe.pointPeak.toFixed(3)} at once`);
    assert.ok(Object.keys(safe.trimmed.kinds).some((k) => k === 'attack sprites'), 'the sprite attacks were measured');
  }
  for (const el of ELEMENT_KEYS) for (const st of STAGES) assert.ok(rows.coverage[`${el}.${st}`] > 0, `${el} attacked at ${st}`);
});

test('a wind-up lasts WIND_UP s of real time at any game speed, and never more than half the shot period', () => {
  // in real seconds: how long the pet winds up before a shot, at a speed (sim s per real s), period in sim s
  const windUpReal = (rate, period) => {
    let shown = 0;
    for (let left = period; left > 0; left -= PHYSICS.dt * rate * 0.25) if (windUpAt(left, rate, period) > 0) shown += PHYSICS.dt * 0.25;
    return shown;
  };
  for (const rate of [1, 2, 4]) {
    const real = windUpReal(rate, 2);
    assert.ok(Math.abs(real - WIND_UP) < 0.01, `x${rate}: ${real.toFixed(3)} s of real time`);
  }
  assert.ok(windUpReal(4, 0.4) <= 0.5 * 0.4 / 4 + 0.01, 'a fast turret at x4: half its period at most, so its shot still shows');
  assert.equal(windUpAt(0, 4, 1), 0, 'none once the shot is ready');
  assert.ok(windUpAt(0.01, 1, 1) > 0.9, 'all the way up just before it');
  // the renderer's game speed: sim seconds per real second, from the sim clock
  for (const speed of [1, 2, 4]) {
    const r = createSimRate();
    let sim = 0;
    for (let i = 0; i < 120; i++) r.update((sim += speed / 60), 1 / 60);
    assert.ok(Math.abs(r.rate - speed) < 0.01, `x${speed} seen as ${r.rate.toFixed(3)}`);
  }
});

test('the pose and the leap fill the caller’s objects: nothing is allocated each frame', () => {
  const out = {};
  const aim = { x: 0, y: 1 };
  assert.equal(petPose('256', 0.5, 0.5, aim, out), out);
  const lunge = { ...out };
  assert.deepEqual(petPose('256', 0.5, 0.5, aim), lunge, 'the same pose as a fresh object');
  petPose('4096', 1, 0, aim, out);
  assert.equal(out.x, 0, 'every field is reset');
  assert.ok(out.halo > 1);
  const hop = {};
  assert.equal(leapAt(0.08, hop), hop);
  assert.equal(leapAt(9, hop), null);
});
