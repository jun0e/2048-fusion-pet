// Game rules on top of the physics world: dropping, the upcoming-ball queue,
// merging equal tiers, scoring/combos, and the danger line.
// Pure and deterministic: same seed + same calls → same result.
// Each ball is a plain object; the future tower-defense layer can hang turret
// state off `ball.tier` without touching this file's rules.

import { createWorld } from './physics.js';
import { createRng } from '../../../src/sim/rng.js';
import { BOARD, PHYSICS, RULES, MAX_TIER, tierRadius, tierMass, tierValue } from '../../../src/config.js';

const CONTACT_SLOP = 0.02; // balls closer than r1+r2+slop count as touching for merges

/**
 * @param seed       RNG seed for the upcoming-ball queue
 * @param queue      optional forced list of upcoming tiers (tests)
 * @param spawnTable optional [[tier, weight]…] or a function returning one (lets a run shift odds over time)
 * @param onMerge    optional (child, olderParent, youngerParent) hook, called before the parents are gone
 */
export function createGame({ seed = (Math.random() * 2 ** 32) >>> 0, queue = null, spawnTable = null, onMerge = null } = {}) {
  const world = createWorld({ halfWidth: BOARD.halfWidth, height: BOARD.height, ...PHYSICS });
  const rng = createRng(seed);
  const forced = queue ? [...queue] : null;
  const table = () => (typeof spawnTable === 'function' ? spawnTable() : spawnTable ?? RULES.spawnWeights);
  const draw = () => (forced && forced.length ? forced.shift() : rng.weighted(table()));

  const events = [];
  const s = {
    seed,
    time: 0,
    current: draw(),
    next: draw(),
    aimX: 0,
    cooldown: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    maxTier: 0,
    merges: 0,
    over: false,
    dangerLevel: 0,
  };
  s.maxTier = Math.max(s.current, s.next);

  function clampAim(x, tier) {
    const lim = BOARD.halfWidth - tierRadius(tier);
    return Math.max(-lim, Math.min(lim, x));
  }

  function setAim(x) {
    s.aimX = clampAim(x, s.current);
  }

  function spawnBall(tier, x, y, { vx = 0, vy = 0, fresh = false, growFrom = null } = {}) {
    const target = tierRadius(tier);
    return world.add({
      x,
      y,
      r: growFrom ?? target,
      mass: tierMass(tier),
      vx,
      vy,
      data: {
        tier,
        targetR: target,
        growFrom: growFrom ?? target,
        growT: growFrom == null ? 1 : 0,
        fresh,
        bornAt: s.time,
        dangerTime: 0,
        rx0: x,
        ry0: y,
        cls: {}, // turret class, filled in by the defense layer (src/sim/classes.js)
        affinity: [],
      },
    });
  }

  function drop() {
    if (s.over || s.cooldown > 0) return false;
    const tier = s.current;
    const ball = spawnBall(tier, s.aimX, BOARD.dropY, { fresh: true });
    events.push({ type: 'drop', id: ball.id, tier, x: ball.x, y: ball.y });
    s.current = s.next;
    s.next = draw();
    s.maxTier = Math.max(s.maxTier, s.next);
    s.cooldown = RULES.dropCooldown;
    s.aimX = clampAim(s.aimX, s.current);
    return true;
  }

  function mergePairs() {
    const balls = world.bodies;
    const used = new Set();
    const born = [];
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (used.has(a) || a.tier >= MAX_TIER) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (used.has(b) || b.tier !== a.tier) continue;
        const rr = a.r + b.r + CONTACT_SLOP;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx * dx + dy * dy > rr * rr) continue;
        used.add(a);
        used.add(b);
        born.push([a, b]);
        break;
      }
    }
    if (!born.length) return;

    const h = PHYSICS.dt / PHYSICS.substeps;
    for (const [a, b] of born) {
      const tier = a.tier + 1;
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const vx = ((a.x - a.px + b.x - b.px) / 2) / h;
      const vy = ((a.y - a.py + b.y - b.py) / 2) / h;
      world.remove(a);
      world.remove(b);
      const c = spawnBall(tier, clampAim(x, tier), Math.max(y, tierRadius(tier - 1)), {
        vx,
        vy,
        growFrom: tierRadius(tier - 1),
      });
      c.rx0 = x;
      c.ry0 = y;
      onMerge?.(c, a, b);

      s.combo = s.comboTimer > 0 ? s.combo + 1 : 1;
      s.comboTimer = RULES.comboWindow;
      const value = tierValue(tier);
      s.score += value;
      s.merges += 1;
      events.push({ type: 'merge', from: [a.id, b.id], id: c.id, tier, value, x, y, combo: s.combo });
      if (tier > s.maxTier) {
        s.maxTier = tier;
        if (tier >= RULES.milestoneTier) events.push({ type: 'milestone', tier, value });
      }
    }
  }

  function growBalls(dt) {
    for (const b of world.bodies) {
      if (b.growT >= 1) continue;
      b.growT = Math.min(1, b.growT + dt / PHYSICS.growSeconds);
      const t = 1 - (1 - b.growT) ** 3; // ease-out
      b.r = b.growFrom + (b.targetR - b.growFrom) * t;
    }
  }

  function updateFreshAndDanger(dt) {
    let worst = 0;
    for (const b of world.bodies) {
      if (b.fresh && (b.touching || s.time - b.bornAt > RULES.freshSeconds)) {
        b.fresh = false;
        events.push({ type: 'land', id: b.id, tier: b.tier, impact: b.impact });
      }
      if (b.fresh) continue;
      if (b.y + b.targetR > BOARD.dangerY) b.dangerTime += dt;
      else b.dangerTime = 0;
      worst = Math.max(worst, b.dangerTime);
    }
    s.dangerLevel = Math.min(1, worst / RULES.dangerSeconds);
    if (worst >= RULES.dangerSeconds) {
      s.over = true;
      events.push({ type: 'gameover', score: s.score, maxTier: s.maxTier });
    }
  }

  function step() {
    if (s.over) return;
    const dt = PHYSICS.dt;
    s.time += dt;
    s.cooldown = Math.max(0, s.cooldown - dt);
    if (s.comboTimer > 0) {
      s.comboTimer = Math.max(0, s.comboTimer - dt);
      if (s.comboTimer === 0) s.combo = 0;
    }
    for (const b of world.bodies) {
      b.rx0 = b.x;
      b.ry0 = b.y;
    }
    growBalls(dt);
    world.step(dt);
    mergePairs();
    updateFreshAndDanger(dt);
    if (world.bodies.length > PHYSICS.maxBalls && !s.over) {
      s.over = true;
      events.push({ type: 'gameover', score: s.score, maxTier: s.maxTier });
    }
  }

  function drainEvents() {
    return events.splice(0, events.length);
  }

  /** Raise a ball one tier in place (it grows into its new size, and may then merge). */
  function promote(ball) {
    if (!ball || ball.tier >= MAX_TIER) return false;
    ball.tier += 1;
    ball.growFrom = ball.r;
    ball.targetR = tierRadius(ball.tier);
    ball.growT = 0;
    ball.mass = tierMass(ball.tier);
    s.maxTier = Math.max(s.maxTier, ball.tier);
    events.push({ type: 'promote', id: ball.id, tier: ball.tier, x: ball.x, y: ball.y });
    return true;
  }

  /** Debug/test helper: place a ball of any tier. */
  function spawnDebug(tier, x = 0, y = BOARD.dropY) {
    return spawnBall(tier, clampAim(x, tier), y);
  }

  return {
    setAim,
    drop,
    step,
    drainEvents,
    spawnDebug,
    promote,
    get balls() {
      return world.bodies;
    },
    get current() {
      return s.current;
    },
    get next() {
      return s.next;
    },
    get aimX() {
      return s.aimX;
    },
    get cooldown() {
      return s.cooldown;
    },
    get score() {
      return s.score;
    },
    get combo() {
      return s.combo;
    },
    get maxTier() {
      return s.maxTier;
    },
    get over() {
      return s.over;
    },
    get dangerLevel() {
      return s.dangerLevel;
    },
    get time() {
      return s.time;
    },
    get seed() {
      return s.seed;
    },
  };
}
