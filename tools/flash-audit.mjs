// Photosensitivity audit: plays bot games on the real sim (pets roaming, namecards tapped as
// soon as they are ready, a burst of taps when several are) and a stress board of
// legendaries, then counts the large flashes the screen would show per second of real time
// at x1, x2 and x4: the old effects against the rules in src/ux/photosafe.js.
// A large flash: a full-screen wash, the red edge pulse when a block falls, or an impact's
// flash dot at least 3 world units across (on a phone, about a quarter of the central 10° of
// vision). WCAG 2.3.1 allows at most 3 in any second; a block's red hit tint is counted per
// block.
//
//   node tools/flash-audit.mjs [--seeds=12] [--minutes=15]
import { pathToFileURL } from 'node:url';
import { createRun } from '../src/sim/run.js';
import { bestDir } from '../src/autoplay.js';
import { PHYSICS } from '../src/config.js';
import { FLASH_DOT, HIT_TINT, HURT_PULSE, SIGNATURE_TINT, createFlashGuard, isSaturatedRed, washAlpha } from '../src/ux/photosafe.js';

const LARGE_DOT = 3; // world units across
const TAP_GAP = 0.2; // seconds of real time between taps on cards that are ready together
const MERGE = 0.1; // large flashes closer than this (real time) read as one
const hex = (c) => parseInt(String(c).replace('#', ''), 16);

// The effects before the photosafe pass, as main.js, pets.js, fx.js and blocks.js had them.
const OLD = { signatureAlpha: 0.28, skillAlpha: 0.22, hurtAlpha: 0.53, dotScale: 1.3, destroyedDot: 2.6 * 1.3, hitHold: 0, hitDecay: 4 };

/** The explosion size src/render/shots.js gives an impact (world units). */
function impactSize(e) {
  const tierScale = 1 + Math.min(14, e.tier ?? 1) * 0.06;
  return (e.pattern === 'lob' ? 2.6 : e.pattern === 'lance' ? 2.2 : e.pattern === 'blade' ? 1.4 : e.kind === 'zap' ? 1.6 : 1.8) * tierScale * (e.miss ? 0.7 : 1);
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

/** Events with the sim time they came at. */
function play(run, { seconds, bot }) {
  const out = [];
  const cards = new Map();
  let t = 0;
  let next = 0;
  for (let i = 0; i < seconds / PHYSICS.dt && !run.over; i++) {
    t += PHYSICS.dt;
    run.step();
    for (const e of run.drainEvents()) out.push([run.time, e]);
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
  const guard = createFlashGuard();
  const large = []; // { w, red, alpha }
  const hits = new Map(); // block id → [real time of each new red pulse]
  const tint = new Map(); // block id → { w, level }
  let lastSim = null;
  let taps = 0;
  // a full-screen wash (capped below the thresholds) or the red edge pulse (above them): both take the budget
  const wash = (w, color, alpha) => {
    if (safe && !guard.take(w)) return;
    large.push({ w, red: isSaturatedRed(color), alpha: safe ? washAlpha(color, alpha) : alpha, wash: true });
  };
  const pulse = (w) => {
    if (safe && !guard.take(w)) return;
    large.push({ w, red: true, alpha: safe ? HURT_PULSE.alpha : OLD.hurtAlpha });
  };
  for (const [simT, e] of events) {
    let w = simT / speed;
    if (e.type === 'skill') {
      taps = simT === lastSim ? taps + 1 : 0; // cards ready together: tapped one after another
      lastSim = simT;
      w += taps * TAP_GAP;
    }
    if (e.type === 'signature' && SIGNATURE_TINT[e.effect]) wash(w, SIGNATURE_TINT[e.effect], OLD.signatureAlpha);
    else if (e.type === 'skill') wash(w, hex(e.colors.at(-1)), OLD.skillAlpha);
    else if (e.type === 'remove' && e.reason === 'destroyed') {
      pulse(w);
      const dot = safe ? Math.min(FLASH_DOT.maxSize, OLD.destroyedDot) : OLD.destroyedDot;
      if (dot >= LARGE_DOT) large.push({ w, red: isSaturatedRed(0xff6b6b), alpha: 1 });
    } else if (e.type === 'impact' && !e.area) {
      const size = impactSize(e) * OLD.dotScale;
      const dot = safe ? Math.min(FLASH_DOT.maxSize, size) : size;
      if (dot >= LARGE_DOT) large.push({ w, red: isSaturatedRed(hex(e.colors[0])), alpha: safe ? FLASH_DOT.alpha : 1 });
    } else if (e.type === 'tileHit') {
      const { hold, decay } = safe ? HIT_TINT : { hold: OLD.hitHold, decay: OLD.hitDecay };
      const last = tint.get(e.id) ?? -Infinity;
      const level = Math.max(0, 1 - Math.max(0, w - last - hold) * decay);
      if (level < 0.5) hits.set(e.id, [...(hits.get(e.id) ?? []), w]); // the tint had mostly faded: a new red pulse
      tint.set(e.id, w);
    }
  }
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
    redPerSecond: peak(merged.filter((f) => f.red).map((f) => f.w)),
    washPeak: Math.max(0, ...large.filter((f) => f.wash).map((f) => f.alpha)),
    pulsePeak: Math.max(0, ...large.filter((f) => !f.wash && f.alpha < 1).map((f) => f.alpha)),
    hitPerSecond: Math.max(0, ...[...hits.values()].map(peak)),
  };
}

/**
 * Audit the old effects and the photosafe ones: per policy and speed, the worst game's large
 * flashes in any 1 s (and the red ones), the peak wash and edge pulse alphas, and the most red
 * pulses one block shows in any 1 s.
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
      rows.push({ policy: safe ? 'photosafe' : 'before', speed, large: worst('perSecond'), red: worst('redPerSecond'), wash: Math.max(...r.map((x) => x.washPeak)), pulse: Math.max(...r.map((x) => x.pulsePeak)), hit: worst('hitPerSecond') });
    }
  }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name, d) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? d);
  const seeds = arg('seeds', 12);
  const minutes = arg('minutes', 15);
  const rows = audit({ seeds, minutes });
  console.log(`${seeds} bot games (up to ${minutes} min, pets roaming, namecards tapped when ready) + a stress board of 4 legendaries\n`);
  console.log('| effects | speed | large flashes in any 1 s | of them red | wash peak alpha | edge pulse alpha | red pulses of one block in any 1 s |');
  console.log('|---|---|---|---|---|---|---|');
  for (const x of rows) console.log(`| ${x.policy} | x${x.speed} | ${x.large.perSecond} (${x.large.name}) | ${x.red.redPerSecond} | ${x.wash.toFixed(2)} | ${x.pulse.toFixed(2)} | ${x.hit.hitPerSecond} |`);
}
