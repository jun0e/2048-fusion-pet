// Photosensitivity audit: plays bot games on the real sim (pets roaming, namecards tapped as
// soon as they are ready, a burst of taps when several are) and a stress board of
// legendaries, then counts the large flashes the screen would show per second of real time
// at x1, x2 and x4: the old effects against the rules in src/ux/photosafe.js.
// A large flash is one of these:
// - a full-screen wash;
// - the red edge pulse when a block falls (it shows only in danger: 3 or fewer blocks in a wave);
// - a pet skill's cut-in panel;
// - a moment when the rings, explosions and flash dots on screen together light POINT.large or
//   more to 10% or more (a quarter of 10° of vision on a phone; the lane field is about one 10°
//   patch, so the whole screen counts as one).
// WCAG 2.3.1 allows at most 3 in any second. A block's red hit tint is counted per block.
//
//   node tools/flash-audit.mjs [--seeds=12] [--minutes=15]
import { pathToFileURL } from 'node:url';
import { createRun } from '../src/sim/run.js';
import { bestDir } from '../src/autoplay.js';
import { FIELD, PHYSICS } from '../src/config.js';
import { HIT_TINT, HURT_PULSE, POINT, SIGNATURE_TINT, boomLit, createFlashGuard, createLightBudget, fitBoom, fitRing, isSaturatedRed, ringLit, washAlpha } from '../src/ux/photosafe.js';

const TAP_GAP = 0.2; // seconds of real time between taps on cards that are ready together
const MERGE = 0.1; // large flashes closer than this (real time) read as one
const hex = (c) => parseInt(String(c).replace('#', ''), 16);

// The effects before the photosafe pass, as main.js, pets.js, fx.js and blocks.js had them.
const OLD = { signatureAlpha: 0.28, skillAlpha: 0.22, hurtAlpha: 0.53, dotScale: 1.3, dotLife: 0.16, dotShare: 0.647, hitHold: 0, hitDecay: 4 };
// the old flash dot: 64.7% of its texture lit to 10% or more at alpha 1 (measured), growing by 0.6 over its life

/** The explosion size src/render/shots.js gives an impact (world units). */
function impactSize(e) {
  const tierScale = 1 + Math.min(14, e.tier ?? 1) * 0.06;
  return (e.pattern === 'lob' ? 2.6 : e.pattern === 'lance' ? 2.2 : e.pattern === 'blade' ? 1.4 : e.kind === 'zap' ? 1.6 : 1.8) * tierScale * (e.miss ? 0.7 : 1);
}

/** The rings [r0, r1, life], explosion and (old) flash dot an event draws at a point, as main.js, pets.js, shots.js and fx.js ask for them. */
function pointEffects(e) {
  switch (e.type) {
    case 'merge':
      return { rings: [[0.6, 1.6, 0.3]] };
    case 'promote':
      return { rings: [[0.6, 2.4, 0.5]] };
    case 'classed':
      return { rings: [[0.8, 3, 0.6]] };
    case 'breath':
      return { rings: [[0.2, 0.9, 0.2]] };
    case 'pulse':
      return { rings: [[0.3, e.radius, 0.45], [0.2, e.radius * 0.8, 0.35]] };
    case 'quake': {
      const rings = [];
      for (let l = e.lane - e.lanes; l <= e.lane + e.lanes; l++) if (l >= 0 && l < FIELD.lanes) rings.push([0.3, e.reach * 0.9, 0.4]);
      return { rings };
    }
    case 'ping':
      return { rings: [[0.15, 1.3, 0.35], [0.1, 0.8, 0.25]] };
    case 'bite':
      return { rings: [[0.2, 1.2, 0.25]] };
    case 'kill':
      return { rings: [[0.3, e.boss ? 3.5 : 1.3, 0.35]] };
    case 'signature':
      return { rings: [[0.8, 3.2, 0.5]] };
    case 'heal':
      return { rings: [[0.3, e.radius * 2, 0.6]] };
    case 'meteor':
      return { rings: [[0.3, e.radius * 2, 0.5]] }; // where it lands
    case 'skill':
      return { rings: [[0.4, e.radius * 2, 0.5], [0.3, e.radius * 1.6, 0.4]] };
    case 'impact': {
      if (e.area) return null; // area attacks draw their own shape (the cases above)
      const size = impactSize(e);
      const rings = [];
      if (e.colors.length > 1) rings.push([0.3, size * 0.9, 0.3]);
      if (e.splash && !e.miss) rings.push([0.2, e.splash * 2, 0.35]);
      return { rings, boom: size, dot: size * OLD.dotScale };
    }
    case 'remove':
      return e.reason === 'destroyed' ? { rings: [], boom: 2.6, dot: 2.6 * OLD.dotScale } : null;
    default:
      return null;
  }
}

/**
 * What the point effects light at the same moment, over real time. Before: every effect at its
 * full size for its whole life (and the old flash dots). Photosafe: as fx.js draws them, booked
 * in the light budget. → { peak, large: [real time of each rise to POINT.large or more], trim }
 */
function pointLight(items, safe) {
  const live = []; // before: [end, lit]
  const budget = createLightBudget();
  let now = 0;
  let used = 0;
  let peak = 0;
  let over = false;
  const large = [];
  const trim = { asked: 0, smaller: 0 }; // photosafe: effects drawn smaller or not at all
  for (const { w, p } of items) {
    if (safe) {
      budget.tick(w - now);
      now = w;
      if (p.boom) {
        const size = fitBoom(budget, p.boom, 0.36); // 0: no explosion
        trim.asked += 1;
        if (size < Math.min(p.boom, POINT.boomMax) - 1e-9) trim.smaller += 1;
      }
      for (const [r0, r1, life] of p.rings) {
        const r = fitRing(budget, r0, r1, life);
        trim.asked += 1;
        if (!r || r.r1 < Math.min(r1, POINT.ringMax) - 1e-9) trim.smaller += 1;
      }
      used = budget.used;
    } else {
      now = w;
      for (let i = live.length - 1; i >= 0; i--) {
        if (live[i][0] > now) continue;
        used -= live[i][1];
        live.splice(i, 1);
      }
      const add = (lit, life) => {
        live.push([now + life, lit]);
        used += lit;
      };
      if (p.boom) add(boomLit(p.boom), 0.36);
      if (p.dot) add(OLD.dotShare * (p.dot + 0.225) ** 2, OLD.dotLife);
      for (const [r0, r1, life] of p.rings) add(ringLit(r0, r1), life);
    }
    peak = Math.max(peak, used);
    if (used >= POINT.large && !over) large.push(w);
    over = used >= POINT.large;
  }
  return { peak, large, trim };
}

/** Namecards as src/kv/namecards.js runs them: the 4 biggest fusions, charged by wave time. */
function tapCards(run, cards, dt) {
  const fusions = run.tiles
    .filter((t) => t.tier >= 8 && t.cls.fusion)
    .sort((a, b) => b.tier - a.tier)
    .slice(0, 4);
  for (const t of fusions) {
    const legend = !!t.cls.ultimate;
    const max = legend ? 7 : 9;
    const c = cards.get(t.id) ?? { charge: 9 * 0.55 };
    if (run.phase === 'wave' && !run.over) c.charge = Math.min(max, c.charge + dt);
    if (c.charge >= max) {
      c.charge = 0;
      run.castSkill(t.id, { radius: legend ? 3.6 : 2.8, mult: legend ? 7 : 5 });
    }
    cards.set(t.id, c);
  }
}

/** Events with the sim time they came at and whether the red edge pulse would show (danger). */
function play(run, { seconds, bot }) {
  const out = [];
  const cards = new Map();
  let t = 0;
  let next = 0;
  for (let i = 0; i < seconds / PHYSICS.dt && !run.over; i++) {
    t += PHYSICS.dt;
    run.step();
    const danger = run.blocks <= 3 && run.phase === 'wave'; // as main.js decides it
    for (const e of run.drainEvents()) out.push([run.time, e, danger]);
    tapCards(run, cards, PHYSICS.dt);
    if (bot && t >= next && run.coins >= run.swipeCost) {
      const d = bestDir(run);
      if (d) run.move(d);
      next = t + 0.5;
    }
    if ((run.phase === 'break' || run.phase === 'prep') && (!bot || run.coins < run.swipeCost || run.locked)) run.nextWave();
  }
  return out;
}

/** A board of legendaries, one per washing apex (Plague every 1 s, Sun 2 s, Midas 4 s, Lifebloom 6 s). */
function stressRun() {
  const run = createRun({ seed: 7, autoChoose: true, roaming: true, empty: true });
  const apex = ['poison', 'fire', 'metal', 'nature'];
  apex.forEach((u, i) => (run.spawnDebug(12, i, 0).cls = { element: 'ice', fusion: 'wind', ultimate: u }));
  ['fire', 'earth', 'lightning', 'metal'].forEach((el, i) => (run.spawnDebug(8, i, 1).cls = { element: el, fusion: 'poison' }));
  return run;
}

/** The large flashes (real time) and the per-block hit pulses of one event list at one speed. */
function flashes(events, speed, safe) {
  const washes = createFlashGuard();
  const flashes = createFlashGuard(); // the large flashes above the thresholds
  const large = []; // { w, red, alpha, kind: 'wash' | 'flash' | 'point' }
  const hits = new Map(); // block id → [real time of each new red pulse]
  const tint = new Map(); // block id → real time of its last hit
  const points = []; // { w, p }: the point effects, in real time
  let lastSim = null;
  let taps = 0;
  // a full-screen wash (capped below the thresholds) takes the wash budget; the red edge pulse
  // and a skill's cut-in panel (above them) take the flash budget
  const wash = (w, color, alpha) => {
    if (safe && !washes.take(w)) return;
    large.push({ w, red: isSaturatedRed(color), alpha: safe ? washAlpha(color, alpha) : alpha, kind: 'wash' });
  };
  const flash = (w, red, alpha) => {
    if (safe && !flashes.take(w)) return;
    large.push({ w, red, alpha, kind: 'flash' });
  };
  for (const [simT, e, danger] of events) {
    let w = simT / speed;
    if (e.type === 'skill') {
      taps = simT === lastSim ? taps + 1 : 0; // cards ready together: tapped one after another
      lastSim = simT;
      w += taps * TAP_GAP;
    }
    const p = pointEffects(e);
    if (p) points.push({ w, p });
    if (e.type === 'signature' && SIGNATURE_TINT[e.effect]) wash(w, SIGNATURE_TINT[e.effect], OLD.signatureAlpha);
    else if (e.type === 'skill') {
      flash(w, isSaturatedRed(hex(e.colors.at(-1))), 1); // the cut-in panel (the tap plays it)
      wash(w, hex(e.colors.at(-1)), OLD.skillAlpha);
    } else if (e.type === 'remove' && e.reason === 'destroyed') {
      if (!safe || danger) flash(w, true, safe ? HURT_PULSE.alpha : OLD.hurtAlpha); // the red edge pulse (the old one also spent nothing)
    } else if (e.type === 'tileHit') {
      const { hold, decay } = safe ? HIT_TINT : { hold: OLD.hitHold, decay: OLD.hitDecay };
      const last = tint.get(e.id) ?? -Infinity;
      const level = Math.max(0, 1 - Math.max(0, w - last - hold) * decay);
      if (level < 0.5) hits.set(e.id, [...(hits.get(e.id) ?? []), w]); // the tint had mostly faded: a new red pulse
      tint.set(e.id, w);
    }
  }
  points.sort((a, b) => a.w - b.w);
  const light = pointLight(points, safe);
  for (const w of light.large) large.push({ w, red: false, alpha: 1, kind: 'point' });
  const pointPeak = light.peak;
  const trimmed = light.trim;
  large.sort((a, b) => a.w - b.w);
  const merged = [];
  for (const f of large) if (!merged.length || f.w - merged.at(-1).w >= MERGE) merged.push(f);
  const peak = (list) => {
    let best = 0;
    for (let i = 0, j = 0; i < list.length; i++) {
      while (list[i] - list[j] >= 1) j++;
      best = Math.max(best, i - j + 1);
    }
    return best;
  };
  return {
    total: merged.length,
    perSecond: peak(merged.map((f) => f.w)),
    flashPerSecond: peak(merged.filter((f) => !(f.kind === 'wash' && safe)).map((f) => f.w)), // the old washes were above the thresholds too
    pointPerSecond: peak(merged.filter((f) => f.kind === 'point').map((f) => f.w)),
    redPerSecond: peak(merged.filter((f) => f.red).map((f) => f.w)),
    washPeak: Math.max(0, ...large.filter((f) => f.kind === 'wash').map((f) => f.alpha)),
    pointPeak,
    hitPerSecond: Math.max(0, ...[...hits.values()].map(peak)),
    trimmed,
  };
}

/**
 * Audit the old effects and the photosafe ones: per policy and speed, the worst game's large
 * flashes in any 1 s (those above the thresholds, those from point effects, the red ones), the
 * peak wash alpha, the brightest frame of point effects, and the most red pulses one block shows
 * in any 1 s.
 */
export function audit({ seeds = 12, minutes = 15, stressSeconds = 180, speeds = [1, 2, 4] } = {}) {
  const scenarios = [];
  for (let seed = 1; seed <= seeds; seed++) scenarios.push({ name: `bot ${seed}`, events: play(createRun({ seed, autoChoose: true, roaming: true }), { seconds: minutes * 60, bot: true }) });
  scenarios.push({ name: 'stress', events: play(stressRun(), { seconds: stressSeconds, bot: false }) });
  const rows = [];
  for (const safe of [false, true]) {
    for (const speed of speeds) {
      const r = scenarios.map((s) => ({ name: s.name, ...flashes(s.events, speed, safe) }));
      const worst = (k) => r.reduce((m, x) => (x[k] > m[k] ? x : m));
      rows.push({
        policy: safe ? 'photosafe' : 'before',
        speed,
        large: worst('perSecond'),
        above: worst('flashPerSecond'),
        point: worst('pointPerSecond'),
        red: worst('redPerSecond'),
        wash: Math.max(...r.map((x) => x.washPeak)),
        pointPeak: Math.max(...r.map((x) => x.pointPeak)),
        hit: worst('hitPerSecond'),
        trimmed: r.reduce((t, x) => ({ asked: t.asked + x.trimmed.asked, smaller: t.smaller + x.trimmed.smaller }), { asked: 0, smaller: 0 }),
      });
    }
  }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name, d) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? d);
  const seeds = arg('seeds', 12);
  const minutes = arg('minutes', 15);
  const rows = audit({ seeds, minutes });
  console.log(`${seeds} bot games (up to ${minutes} min, pets roaming, namecards tapped when ready) + a stress board of 4 legendaries`);
  console.log(`a large point flash: the rings, explosions and flash dots on screen light ${POINT.large} units² or more to 10%; photosafe keeps them under ${POINT.cap}\n`);
  console.log('| effects | speed | large flashes in any 1 s | above the thresholds | from point effects | red | wash peak alpha | most lit by point effects at once (units²) | red pulses of one block in any 1 s |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const x of rows) console.log(`| ${x.policy} | x${x.speed} | ${x.large.perSecond} (${x.large.name}) | ${x.above.flashPerSecond} | ${x.point.pointPerSecond} | ${x.red.redPerSecond} | ${x.wash.toFixed(2)} | ${x.pointPeak.toFixed(1)} | ${x.hit.hitPerSecond} |`);
  for (const x of rows.filter((r) => r.policy === 'photosafe')) console.log(`\nx${x.speed}: ${((100 * x.trimmed.smaller) / Math.max(1, x.trimmed.asked)).toFixed(1)}% of rings and explosions drawn smaller or not at all (light budget), of ${x.trimmed.asked}`);
}
