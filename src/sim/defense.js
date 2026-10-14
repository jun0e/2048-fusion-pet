// Siege tower-defense simulation: enemies walk down the lanes (one per board
// column); once they reach the board they hunt the blocks: each one heads for the
// nearest block (its own column first), stops next to it and attacks its hidden
// health. Also: status effects, blocks firing as turrets, projectiles and ultimate
// signatures. There is no castle. Pure and deterministic (randomness from the rng).
// The 2048 board owns the blocks; this module reads them (id, x, y, tier, cls) and
// lowers their `hp`; the run removes blocks that reach 0.
//
// Position along a lane is `s` (0 = portal); on the board enemies move freely and `s` tracks how deep they are.
// Each block shoots by its class's spec (classes.js `shoot`): a range (reach up
// its lane from the wall across N neighbouring lanes, or a circle around the
// block), a target rule (front-most, strongest, weakest, unpoisoned, biggest
// crowd) and a pattern: single shot, 3-shot burst, slow lance, fast sniper round,
// homing dart, lobbed mortar, a blade that flies the whole lane, a 3-way seed
// spread or an instant chain. Enemies already doomed by shots in flight are skipped.

import { DEFENSE, FIELD, GRID, LANE_LENGTH, SIEGE, laneAt, laneX } from '../config.js';
import { ENEMY_TYPES } from './enemies.js';
import { profileFor } from './classes.js';

const HIT_RADIUS = 0.35;

export function createDefense({ rng }) {
  const enemies = [];
  const shots = [];
  const events = [];
  let blocksNow = []; // the board's blocks this step (enemies hunt them, Nature repairs them)
  const cool = new Map(); // block id → seconds until it can fire
  const sig = new Map(); // block id → seconds charged toward its ultimate signature
  const pendingSpawns = [];
  let nextEnemy = 1;
  let nextShot = 1;

  function place(e) {
    const p = laneAt(e.lane, e.s);
    e.x = p.x;
    e.y = p.y;
    e.dirX = p.dx;
    e.dirY = p.dy;
  }

  function spawn(type, { lane = 0, hpScale = DEFENSE.enemyBaseHp, s = 0, atkScale = 1 } = {}) {
    const def = ENEMY_TYPES[type];
    const hp = def.hp * hpScale;
    const e = {
      id: nextEnemy++,
      type,
      def,
      lane,
      s,
      x: 0,
      y: 0,
      dirX: 0,
      dirY: 1,
      hp,
      maxHp: hp,
      hpScale,
      incoming: 0, // damage of shots already flying at it
      speed: DEFENSE.enemyBaseSpeed * def.speed,
      boss: !!def.boss,
      element: def.element ?? null,
      physRes: def.physRes ?? 0,
      burn: { stacks: 0, dps: 0, t: 0 },
      poison: { stacks: 0, dps: 0, t: 0 },
      dot: { burn: 0, poison: 0 }, // running totals of damage-over-time dealt (for display)
      chillT: 0,
      chillSlow: 0,
      freezeT: 0,
      iceHits: 0,
      lootT: 0, // Metal's mark: seconds left
      lootPct: 0, // … and the coin bonus it pays on death
      healT: 0,
      mode: 'lane', // 'lane' while walking down the field, 'hunt' once on the board
      atk: def.castle * SIEGE.attackPerCastle * (def.boss ? SIEGE.bossAttack : 1) * atkScale, // damage per hit on a block
      attacking: false,
      wasAttacking: false,
      hitT: 0,
      flash: 0,
      dead: false,
      gone: false,
    };
    place(e);
    enemies.push(e);
    events.push({ type: 'spawn', id: e.id, enemy: e });
    return e;
  }

  // --- damage & statuses -----------------------------------------------------

  function damage(e, amount, kinds, { dot = false, source = null } = {}) {
    if (e.dead || e.gone) return 0;
    let m = 1;
    if (e.freezeT > 0) m *= 1 + DEFENSE.frozenVuln;
    if (e.physRes && kinds.every((k) => k === 'physical')) m *= 1 - e.physRes;
    if (e.element === 'fire') {
      if (kinds.includes('ice')) m *= 1.5;
      else if (kinds.length === 1 && kinds[0] === 'fire') m *= 0.5;
    }
    const dealt = amount * m;
    e.hp -= dealt;
    if (!dot) e.flash = 0.12;
    if (e.hp <= 0) kill(e, source);
    return dealt;
  }

  function kill(e) {
    e.dead = true;
    e.hp = 0;
    events.push({ type: 'kill', id: e.id, x: e.x, y: e.y, enemy: e, boss: e.boss, bounty: Math.round(e.maxHp / 3), loot: e.lootT > 0 ? e.lootPct : 0 });
    const sm = e.def.summonOnDeath;
    if (sm) {
      for (let i = 0; i < sm.count; i++) {
        const lane = Math.max(0, Math.min(FIELD.lanes - 1, e.lane - 1 + (i % 3)));
        pendingSpawns.push({ type: sm.type, lane, hpScale: e.hpScale, s: Math.max(0, e.s - 0.6 * Math.floor(i / 3)) });
      }
      events.push({ type: 'summon', id: e.id, x: e.x, y: e.y, count: sm.count });
    }
  }

  function addBurn(e, burn, hitDamage) {
    if (!burn || e.element === 'fire') return;
    e.burn.stacks = Math.min(burn.max, e.burn.stacks + 1);
    e.burn.t = burn.dur;
    e.burn.dps = Math.max(e.burn.dps, burn.dpsPct * hitDamage);
  }

  function addPoison(e, poison, hitDamage) {
    if (!poison) return;
    e.poison.stacks = Math.min(poison.max, e.poison.stacks + 1);
    e.poison.t = poison.dur;
    e.poison.dps = Math.max(e.poison.dps, poison.dpsPct * hitDamage);
  }

  function mark(e, pct, dur) {
    e.lootPct = e.lootT > 0 ? Math.max(e.lootPct, pct) : pct;
    e.lootT = Math.max(e.lootT, dur);
  }

  /** Nature: repair the most damaged block by `pct` of its max health (or every damaged block). */
  function healBlocks(pct, from, all = false) {
    const hurt = blocksNow.filter((t) => t.hp > 0 && t.hp < t.maxHp);
    if (!hurt.length) return;
    const list = all ? hurt : [hurt.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b))];
    for (const t of list) {
      const before = t.hp;
      t.hp = Math.min(t.maxHp, t.hp + t.maxHp * pct);
      events.push({ type: 'tileHeal', id: t.id, x: t.x, y: t.y, amount: t.hp - before, from: { x: from.x, y: from.y } });
    }
  }

  function knock(e, amount) {
    const a = e.boss ? amount * 0.3 : amount;
    if (e.mode === 'lane') {
      e.s = Math.max(0, e.s - a);
      place(e);
      return;
    }
    // on the board: shoved back up, off the block it was attacking
    e.y += a;
    if (e.y > SIEGE.boardTop) {
      e.mode = 'lane';
      e.lane = laneOfX(e.x);
      e.s = Math.max(0, FIELD.spawnY - e.y);
      place(e);
    } else e.s = FIELD.spawnY - e.y;
  }

  // --- the siege: enemies on the board hunt blocks ----------------------------

  /** The block an enemy goes for: the nearest one below it in its own column, else the nearest anywhere. */
  function pickBlock(e) {
    let best = null;
    let bestD = Infinity;
    for (const t of blocksNow) {
      if (t.hp <= 0 || Math.abs(t.x - e.x) >= GRID.cell * 0.5 || t.y > e.y + 0.5) continue;
      if (e.y - t.y < bestD) {
        best = t;
        bestD = e.y - t.y;
      }
    }
    if (best) return best;
    for (const t of blocksNow) {
      if (t.hp <= 0) continue;
      const d = Math.hypot(t.x - e.x, t.y - e.y);
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
    return best;
  }

  function hunt(e, speed, frozen, dt) {
    e.attacking = false;
    const t = pickBlock(e);
    if (t) {
      const dx = t.x - e.x;
      const dy = t.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > SIEGE.contact + 0.01) {
        const step = Math.min(speed * dt, d - SIEGE.contact);
        e.x += (dx / d) * step;
        e.y += (dy / d) * step;
        e.dirX = dx / d;
        e.dirY = dy / d;
      } else if (!frozen) {
        // bite the block's hidden health: one hit every biteEvery seconds
        if (!e.wasAttacking) e.hitT = SIEGE.biteEvery - SIEGE.firstBite;
        e.attacking = true;
        e.hitT += dt;
        if (e.hitT >= SIEGE.biteEvery) {
          e.hitT -= SIEGE.biteEvery;
          t.hp -= e.atk;
          events.push({ type: 'tileHit', id: t.id, x: t.x, y: t.y, amount: e.atk, from: { x: e.x, y: e.y } });
          if (t.hp <= 0 && !t.downed) {
            t.downed = true;
            events.push({ type: 'tileDown', id: t.id, x: t.x, y: t.y, tier: t.tier, by: e.id });
          }
        }
      }
    }
    e.wasAttacking = e.attacking;
    e.lane = laneOfX(e.x);
    e.s = FIELD.spawnY - e.y;
  }

  function applyStatuses(e, prof, hitDamage) {
    if (e.dead) return;
    addBurn(e, prof.burn, hitDamage);
    addPoison(e, prof.poison, hitDamage);
    if (prof.chill) {
      const slow = e.boss ? prof.chill.slow * 0.5 : prof.chill.slow;
      e.chillSlow = e.chillT > 0 ? Math.max(e.chillSlow, slow) : slow;
      e.chillT = Math.max(e.chillT, prof.chill.dur);
    }
    if (prof.freeze) {
      e.iceHits += 1;
      if (e.iceHits % prof.freeze.every === 0) {
        e.freezeT = Math.max(e.freezeT, e.boss ? prof.freeze.dur * 0.5 : prof.freeze.dur);
        events.push({ type: 'freeze', id: e.id, x: e.x, y: e.y });
      }
    }
    if (prof.knockback) knock(e, prof.knockback);
  }

  const alive = () => enemies.filter((e) => !e.dead && !e.gone);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /** One attack landing on `primary`: pierce → chain → splash, then damage + statuses. */
  function resolve(prof, dmg, primary, origin, kind, { heal = true } = {}) {
    const hits = [[primary, dmg]];
    const used = new Set([primary]);
    const pool = alive();
    if (prof.pierce && kind !== 'blade') {
      // the whole lane, within reach of the gust
      for (const e of pool) {
        if (!used.has(e) && e.lane === primary.lane && Math.abs(e.s - primary.s) <= prof.pierce.len * 2.5) {
          hits.push([e, dmg]);
          used.add(e);
        }
      }
    }
    let chainPts = null;
    if (prof.chain) {
      chainPts = [{ x: origin.x, y: origin.y }, { x: primary.x, y: primary.y }];
      let last = primary;
      let d = dmg;
      for (let k = 0; k < prof.chain.jumps; k++) {
        let best = null;
        let bestD = prof.chain.range;
        for (const e of pool) {
          if (used.has(e)) continue;
          const dd = dist(e, last);
          if (dd <= bestD) {
            best = e;
            bestD = dd;
          }
        }
        if (!best) break;
        d *= prof.chain.falloff;
        hits.push([best, d]);
        used.add(best);
        chainPts.push({ x: best.x, y: best.y });
        last = best;
      }
    }
    if (prof.splash) {
      const centres = hits.map((h) => h[0]);
      for (const c of centres) {
        for (const e of pool) {
          if (!used.has(e) && dist(e, c) <= prof.splash.radius) {
            hits.push([e, dmg * prof.splash.pct]);
            used.add(e);
          }
        }
      }
    }
    const impactX = primary.x;
    const impactY = primary.y;
    // Nature: each attack may repair a block (rolled once per attack, not per splash target)
    if (heal && prof.heal && rng.next() < prof.heal.chance) healBlocks(prof.heal.pct, primary);
    for (const [e, d] of hits) {
      if (prof.loot) mark(e, prof.loot.pct, prof.loot.dur); // before the damage, so Metal's own killing blow pays out
      const dealt = damage(e, d, prof.kinds);
      applyStatuses(e, prof, d);
      events.push({ type: 'hit', id: e.id, x: e.x, y: e.y, amount: dealt, colors: prof.colors, crit: d > dmg * 0.999 && e === primary });
    }
    events.push({
      type: 'impact',
      x: impactX,
      y: impactY,
      kind,
      element: prof.element,
      pattern: prof.shoot?.pattern,
      tier: origin.tier ?? 1,
      colors: prof.colors,
      splash: prof.splash?.radius ?? 0,
      pierce: prof.pierce && kind !== 'blade' ? { lane: primary.lane, s: primary.s, len: prof.pierce.len * 2.5 } : null,
      chain: chainPts,
    });
  }

  // --- turrets ---------------------------------------------------------------

  const laneOfX = (x) => Math.max(0, Math.min(FIELD.lanes - 1, Math.round((x - laneX(0)) / GRID.cell)));

  /**
   * Lane ranges reach `reach` up and down the lane from the block (enemies walk
   * through the board, so top-row blocks meet them first and bottom-row blocks
   * guard the wall); circle ranges are measured from the block too.
   */
  function inRange(e, b, shoot) {
    if (shoot.radius != null) return Math.hypot(e.x - b.x, e.y - b.y) <= shoot.radius;
    return Math.abs(e.lane - laneOfX(b.x)) <= shoot.lanes && Math.abs(e.y - b.y) <= shoot.reach + 1e-6;
  }

  const SORTS = {
    front: (a, b) => b.s - a.s,
    strongest: (a, b) => b.hp - b.incoming - (a.hp - a.incoming) || b.s - a.s,
    weakest: (a, b) => a.hp - a.incoming - (b.hp - b.incoming) || b.s - a.s,
    unpoisoned: (a, b) => (a.poison.stacks > 0) - (b.poison.stacks > 0) || b.s - a.s,
  };

  /** Up to `n` targets in range, best first by the class's target rule. */
  function pickTargets(pool, b, shoot, n = 1) {
    const inR = pool.filter((e) => inRange(e, b, shoot));
    if (!inR.length) return [];
    const live = inR.filter((e) => e.hp - e.incoming > 0);
    const list = live.length ? live : inR; // everything doomed: still shoot the best one
    if (shoot.target === 'crowd') {
      const crowd = (e) => list.reduce((k, o) => k + (dist(o, e) <= 1.3 ? 1 : 0), 0);
      list.sort((p, q) => crowd(q) - crowd(p) || q.s - p.s);
    } else list.sort(SORTS[shoot.target] ?? SORTS.front);
    return list.slice(0, n);
  }

  function launch(b, prof, target, extra = {}) {
    const sh = {
      id: nextShot++,
      kind: 'homing',
      pattern: prof.shoot.pattern,
      x: b.x,
      y: b.y,
      ox: b.x,
      oy: b.y,
      vx: 0,
      vy: 0,
      targetId: target.id,
      tx: target.x,
      ty: target.y,
      prof,
      damage: prof.damage,
      from: b.id,
      tier: b.tier,
      age: 0,
      delay: 0,
      speed: DEFENSE.turret.projectileSpeed * (prof.shoot.speed ?? 1),
      heal: true,
      ...extra,
    };
    if (sh.kind === 'homing') target.incoming += sh.damage;
    shots.push(sh);
    return sh;
  }

  function fireTurrets(dt, blocks) {
    const pool = alive();
    for (const tile of blocks) {
      // a fusion that roams the field (key-visual demo) shoots from where it stands
      const b = tile.roam ? { ...tile, x: tile.roam.x, y: tile.roam.y } : tile;
      const prof = profileFor(tile);
      if (!prof.shoots) continue; // blocks below 16 don't shoot
      const shoot = prof.shoot;
      let c = (cool.get(b.id) ?? 0) - dt;
      if (c <= 0 && pool.length) {
        const targets = pickTargets(pool, b, shoot, shoot.pattern === 'spread' ? shoot.count : 1);
        const target = targets[0];
        if (target) {
          switch (shoot.pattern) {
            case 'chain':
              resolve(prof, prof.damage, target, b, 'zap'); // lightning is instant
              break;
            case 'burst':
              // 3 fireballs in quick succession at the same foe
              for (let k = 0; k < shoot.count; k++) launch(b, prof, target, { delay: k * shoot.gap });
              break;
            case 'spread':
              // one seed per target (fewer foes: some get two); only the first can heal
              for (let k = 0; k < shoot.count; k++) launch(b, prof, targets[k % targets.length], { heal: k === 0, fan: k - (shoot.count - 1) / 2 });
              break;
            case 'homing': {
              // the dart leaves at an angle and curves in
              const dx = target.x - b.x;
              const dy = target.y - b.y;
              const d = Math.hypot(dx, dy) || 1;
              const side = nextShot % 2 ? 1 : -1;
              const a = Math.atan2(dy, dx) + side * 0.9;
              const sp = DEFENSE.turret.projectileSpeed * (shoot.speed ?? 1);
              launch(b, prof, target, { curve: true, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dist0: d });
              break;
            }
            case 'lob': {
              // aim where the foe will be when the boulder lands
              const T = shoot.flight;
              const lead = target.freezeT > 0 ? 0 : target.speed * (1 - (target.chillT > 0 ? target.chillSlow : 0)) * T;
              const land = laneAt(target.lane, Math.min(LANE_LENGTH, target.s + lead));
              launch(b, prof, target, { kind: 'lob', x1: land.x, y1: land.y, t: 0, T });
              break;
            }
            case 'blade': {
              // the blade leaves the block and sweeps along its lane toward the target
              const lane = laneOfX(b.x);
              const dir = target.y >= b.y ? 1 : -1;
              launch(b, prof, target, { kind: 'blade', lane, x: laneX(lane), y: b.y, y0: b.y, dir, hit: new Set(), reach: shoot.reach });
              break;
            }
            default:
              launch(b, prof, target); // single, lance, sniper: straight homing shots
          }
          events.push({ type: 'fire', id: b.id, x: b.x, y: b.y, colors: prof.colors, tier: b.tier, pattern: shoot.pattern, target: { x: target.x, y: target.y } });
          c = 1 / prof.rate;
        }
      }
      cool.set(b.id, Math.max(c, 0));
      if (prof.signature) chargeSignature(b, prof, dt, pool);
    }
  }

  function chargeSignature(b, prof, dt, pool) {
    if (!pool.length) return; // only charges while there is something to hit
    const sgn = prof.signature;
    let t = (sig.get(b.id) ?? 0) + dt;
    if (t >= sgn.period) {
      t -= sgn.period;
      triggerSignature(b, prof, sgn, pool);
    }
    sig.set(b.id, t);
  }

  function triggerSignature(b, prof, sgn, pool) {
    events.push({ type: 'signature', effect: sgn.effect, name: sgn.name, x: b.x, y: b.y, colors: prof.colors, id: b.id });
    switch (sgn.effect) {
      case 'globalBurn': {
        const burn = prof.burn ?? { dpsPct: 0.6, dur: 4, max: 5 };
        for (const e of pool) addBurn(e, burn, prof.damage);
        break;
      }
      case 'globalFreeze':
        for (const e of pool) e.freezeT = Math.max(e.freezeT, e.boss ? sgn.dur * 0.5 : sgn.dur);
        break;
      case 'strikes': {
        const targets = [...pool];
        for (let i = 0; i < sgn.count && targets.length; i++) {
          const e = targets.splice(Math.floor(rng.next() * targets.length), 1)[0];
          const d = prof.damage * sgn.pct;
          const dealt = damage(e, d, ['lightning']);
          applyStatuses(e, prof, d);
          events.push({ type: 'strike', x: e.x, y: e.y });
          events.push({ type: 'hit', id: e.id, x: e.x, y: e.y, amount: dealt, colors: ['#ffe14d'], crit: true });
        }
        break;
      }
      case 'contagion': {
        const sick = pool.filter((e) => e.poison.stacks > 0);
        for (const src of sick) {
          for (const e of pool) {
            if (e !== src && e.poison.stacks < src.poison.stacks && dist(e, src) <= sgn.radius) {
              e.poison.stacks += 1;
              e.poison.t = Math.max(e.poison.t, src.poison.t);
              e.poison.dps = Math.max(e.poison.dps, src.poison.dps);
              events.push({ type: 'spread', from: { x: src.x, y: src.y }, to: { x: e.x, y: e.y } });
            }
          }
        }
        break;
      }
      case 'meteor': {
        let best = pool[0];
        let bestN = -1;
        for (const e of pool) {
          const cnt = pool.filter((o) => dist(o, e) <= sgn.radius).length;
          if (cnt > bestN) {
            best = e;
            bestN = cnt;
          }
        }
        const cx = best.x;
        const cy = best.y;
        for (const e of pool) {
          if (dist(e, best) > sgn.radius) continue;
          const dealt = damage(e, prof.damage * sgn.pct, ['physical', 'fire']);
          events.push({ type: 'hit', id: e.id, x: e.x, y: e.y, amount: dealt, colors: ['#ff9a4d'], crit: true });
        }
        events.push({ type: 'meteor', x: cx, y: cy, radius: sgn.radius });
        break;
      }
      case 'gild':
        for (const e of pool) mark(e, prof.loot?.pct ?? 1, sgn.dur);
        break;
      case 'bloom':
        healBlocks(sgn.pct, b, true);
        break;
      case 'vortex':
        for (const e of pool) {
          if (e.boss) continue;
          knock(e, sgn.push);
          e.chillSlow = Math.max(e.chillSlow, 0.3);
          e.chillT = Math.max(e.chillT, 2);
        }
        break;
    }
  }

  // --- per-step update -------------------------------------------------------

  // A boulder lands: splash around the foe nearest the landing point (or a miss).
  function land(sh) {
    const r = Math.max(0.9, sh.prof.splash?.radius ?? 0.9);
    let best = null;
    let bestD = r;
    for (const e of alive()) {
      const d = Math.hypot(e.x - sh.x1, e.y - sh.y1);
      if (d <= bestD) {
        best = e;
        bestD = d;
      }
    }
    const t = enemies.find((e) => e.id === sh.targetId);
    if (best) resolve(sh.prof, sh.damage, best, sh, 'lob');
    else events.push({ type: 'impact', x: sh.x1, y: sh.y1, kind: 'lob', element: sh.prof.element, pattern: 'lob', tier: sh.tier, colors: sh.prof.colors, splash: r, miss: true });
    if (t) t.incoming = Math.max(0, t.incoming - sh.damage);
  }

  function moveShots(dt) {
    for (const sh of shots) {
      if (sh.delay > 0) {
        sh.delay -= dt;
        continue;
      }
      sh.age += dt;
      if (sh.kind === 'lob') {
        sh.t += dt;
        const u = Math.min(1, sh.t / sh.T);
        sh.x = sh.ox + (sh.x1 - sh.ox) * u;
        sh.y = sh.oy + (sh.y1 - sh.oy) * u;
        sh.h = 4 * u * (1 - u); // 0..1 arc height, for the renderer
        if (u >= 1) {
          land(sh);
          sh.dead = true;
        }
        continue;
      }
      if (sh.kind === 'blade') {
        // sweeps along its lane, hitting each foe once
        sh.y += sh.dir * sh.speed * dt;
        for (const e of alive()) {
          if (e.lane !== sh.lane || sh.hit.has(e.id) || Math.abs(e.y - sh.y) > 0.5) continue;
          sh.hit.add(e.id);
          resolve(sh.prof, sh.damage, e, sh, 'blade');
        }
        if (Math.abs(sh.y - sh.y0) > sh.reach + 0.5) sh.dead = true;
        continue;
      }
      const t = enemies.find((e) => e.id === sh.targetId);
      const alive_ = t && !t.dead && !t.gone;
      if (alive_) {
        sh.tx = t.x;
        sh.ty = t.y;
      }
      const dx = sh.tx - sh.x;
      const dy = sh.ty - sh.y;
      const d = Math.hypot(dx, dy);
      const step = sh.speed * dt;
      if (d <= step + HIT_RADIUS) {
        if (t) t.incoming = Math.max(0, t.incoming - sh.damage);
        if (alive_) resolve(sh.prof, sh.damage, t, sh, 'shot', { heal: sh.heal });
        else events.push({ type: 'impact', x: sh.tx, y: sh.ty, kind: 'shot', element: sh.prof.element, pattern: sh.pattern, tier: sh.tier, colors: sh.prof.colors, splash: 0, miss: true });
        sh.dead = true;
        continue;
      }
      if (sh.curve) {
        // steer toward the target, harder as the dart gets close, so it always arrives
        const k = Math.min(1, dt * (5 + 30 / Math.max(0.5, d)));
        sh.vx += ((dx / d) * sh.speed - sh.vx) * k;
        sh.vy += ((dy / d) * sh.speed - sh.vy) * k;
        const v = Math.hypot(sh.vx, sh.vy) || 1;
        sh.x += (sh.vx / v) * step;
        sh.y += (sh.vy / v) * step;
      } else {
        sh.vx = (dx / d) * sh.speed;
        sh.vy = (dy / d) * sh.speed;
        sh.x += (dx / d) * step;
        sh.y += (dy / d) * step;
      }
    }
    for (let i = shots.length - 1; i >= 0; i--) if (shots[i].dead) shots.splice(i, 1);
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      if (e.dead || e.gone) continue;
      e.flash = Math.max(0, e.flash - dt);
      if (e.burn.stacks > 0) {
        e.dot.burn += damage(e, e.burn.stacks * e.burn.dps * dt, ['fire'], { dot: true });
        e.burn.t -= dt;
        if (e.burn.t <= 0) e.burn = { stacks: 0, dps: 0, t: 0 };
      }
      if (e.poison.stacks > 0 && !e.dead) {
        e.dot.poison += damage(e, e.poison.stacks * e.poison.dps * dt, ['poison'], { dot: true });
        e.poison.t -= dt;
        if (e.poison.t <= 0) e.poison = { stacks: 0, dps: 0, t: 0 };
      }
      if (e.dead) continue;
      if (e.def.heal) {
        e.healT += dt;
        if (e.healT >= e.def.heal.every) {
          e.healT -= e.def.heal.every;
          for (const o of enemies) {
            if (o !== e && !o.dead && !o.gone && dist(o, e) <= e.def.heal.radius) {
              o.hp = Math.min(o.maxHp, o.hp + o.maxHp * e.def.heal.pct);
            }
          }
          events.push({ type: 'heal', id: e.id, x: e.x, y: e.y, radius: e.def.heal.radius });
        }
      }
      const frozen = e.freezeT > 0;
      if (frozen) e.freezeT = Math.max(0, e.freezeT - dt);
      const speed = frozen ? 0 : e.speed * (1 - (e.chillT > 0 ? e.chillSlow : 0));
      if (e.mode === 'lane') {
        e.s += speed * dt;
        place(e);
        if (e.y <= SIEGE.boardTop) e.mode = 'hunt'; // reached the board: go for the blocks
      } else hunt(e, speed, frozen, dt);
      if (e.chillT > 0) {
        e.chillT = Math.max(0, e.chillT - dt);
        if (e.chillT === 0) e.chillSlow = 0;
      }
      if (e.lootT > 0) {
        e.lootT = Math.max(0, e.lootT - dt);
        if (e.lootT === 0) e.lootPct = 0;
      }
    }
  }

  function step(dt, blocks) {
    blocksNow = blocks;
    fireTurrets(dt, blocks);
    moveShots(dt);
    updateEnemies(dt);
    for (const p of pendingSpawns.splice(0)) spawn(p.type, p);
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead || enemies[i].gone) enemies.splice(i, 1);
    if (blocks.length !== cool.size) {
      const ids = new Set(blocks.map((b) => b.id));
      for (const id of cool.keys()) if (!ids.has(id)) cool.delete(id);
      for (const id of sig.keys()) if (!ids.has(id)) sig.delete(id);
    }
  }

  /**
   * A block's active skill (the namecard button): every foe within `radius` of
   * the block (or of its roaming creature) takes `mult` × its hit, with all of
   * its element effects. Returns how many foes it caught.
   */
  function cast(tile, { radius = 2.8, mult = 5 } = {}) {
    const prof = profileFor(tile);
    if (!prof.shoots) return 0;
    const o = tile.roam ? { ...tile, x: tile.roam.x, y: tile.roam.y } : tile;
    const caught = alive().filter((e) => Math.hypot(e.x - o.x, e.y - o.y) <= radius);
    events.push({ type: 'skill', id: tile.id, x: o.x, y: o.y, radius, colors: prof.colors, name: prof.name, hits: caught.length });
    for (const e of caught) resolve(prof, prof.damage * mult, e, o, 'skill', { heal: false });
    return caught.length;
  }

  return {
    enemies,
    shots,
    spawn,
    damage,
    step,
    cast,
    sigCharge: (id) => sig.get(id) ?? 0,
    drainEvents: () => events.splice(0, events.length),
    get aliveCount() {
      return enemies.length + pendingSpawns.length;
    },
  };
}
