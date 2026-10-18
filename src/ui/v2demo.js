// ?v2demo (a developer's page, never a normal game): a board with every kind of v2 block (docs/v2/SPEC.md
// section 1), mock choices in the SPEC's shapes, and a row of buttons that open each v2 card (a new
// element, a fusion's main element, the fusion to keep, the skill gained, the buff banner), so the cards
// can be checked in the browser before the sim's v2 rules land, and after. A run without the sim's
// summons yet gets a stand-in (shimSummons), so the namecards' charging, ready and out states show too.
import { PHYSICS, V2 } from '../config.js';
import { ELEMENTS, FUSIONS, fusionKey } from '../sim/classes.js';
import { esc } from './cards.js';

/** The demo's deck: four elements, so a new element's card shows its fusions with them. */
export const DEMO_DECK = ['fire', 'ice', 'lightning', 'nature'];

/** Every kind of v2 block on an empty board: run.spawnDebug(tier, col, row).cls = {…} (one single per element). */
export function presetBoard(run) {
  const put = (tier, col, row, cls) => {
    const t = run.spawnDebug(tier, col, row);
    t.cls = cls;
    t.prof = null;
    return t;
  };
  return {
    egg: put(2, 0, 0, { element: 'fire' }), // an elemental egg, 4
    plain: put(3, 1, 0, {}), // a plain stone block, 8
    single: put(5, 2, 0, { element: 'ice' }), // a single pet, 32
    fusionEgg: put(3, 3, 0, { element: 'lightning', fusion: 'nature', buffs: {} }), // a fusion egg, 8
    turret: put(4, 0, 1, {}), // a stone turret, 16
    fusion: put(10, 1, 1, { element: 'fire', fusion: 'lightning', buffs: { ice: 1, nature: 2 } }), // a fusion pet at 1024
    pure: put(12, 2, 1, { element: 'nature', fusion: 'ice', buffs: { fire: 1 }, pure: true }), // a pure pet at 4096
    young: put(8, 3, 1, { element: 'ice', fusion: 'fire', buffs: {} }), // a fusion pet at 256: its summon still locked
  };
}

const offerOf = (e) => ({ element: e, name: ELEMENTS[e].name, attack: ELEMENTS[e].attack, colors: [ELEMENTS[e].color], desc: ELEMENTS[e].desc, line: ELEMENTS[e].line });

/** The gain of keeping one fusion over another: the other's two elements and all its buffs. */
function gainOf(other) {
  const g = {};
  for (const e of [other.element, other.fusion]) g[e] = (g[e] ?? 0) + 1;
  for (const [e, n] of Object.entries(other.buffs ?? {})) g[e] = (g[e] ?? 0) + n;
  return g;
}
const keepOffer = (kept, other) => {
  const gain = gainOf(other);
  const buffs = { ...kept.buffs };
  for (const [e, n] of Object.entries(gain)) buffs[e] = (buffs[e] ?? 0) + n;
  return { cls: { element: kept.element, fusion: kept.fusion, buffs }, gain };
};

/** A mock choice of `kind` ('die' | 'fusion' | 'keep'), in the SPEC's shapes (section 3). */
export function mockChoice(kind, deck = DEMO_DECK) {
  if (kind === 'die') {
    const free = Object.keys(ELEMENTS).filter((e) => !deck.includes(e));
    return { kind: 'die', level: 3, offers: free.slice(0, V2.offers).map(offerOf) };
  }
  if (kind === 'fusion') {
    const key = fusionKey('fire', 'ice');
    const offer = (a, b) => ({ element: a, fusion: b, key, name: FUSIONS[key].name, color: FUSIONS[key].color });
    return { kind: 'fusion', tileId: -1, tier: 5, parts: [{ element: 'fire', tier: 4 }, { element: 'ice', tier: 4 }], offers: [offer('fire', 'ice'), offer('ice', 'fire')] };
  }
  const mover = { element: 'fire', fusion: 'ice', buffs: { lightning: 1 } };
  const stayer = { element: 'earth', fusion: 'metal', buffs: { poison: 2 } };
  return { kind: 'keep', tileId: -2, tier: 9, offers: [keepOffer(mover, stayer), keepOffer(stayer, mover)] };
}

/**
 * The sim's summons as a stand-in, for a run that has none yet (src/sim/run.js before v2's summons
 * land): charges over V2.summon.chargeS of wave time, run.castSkill sends the pet out for
 * V2.summon.durS (tile.summon), run.skillCharge / run.skillReady read it. The demo's first summoner
 * starts ready and the next half charged. Returns false when the run has the real ones.
 */
export function shimSummons(run) {
  if (typeof run.skillCharge === 'function') return false;
  const charge = new Map();
  const tileOf = (id) => run.tiles.find((t) => t.id === id);
  const can = (t) => t?.cls?.fusion && t.tier >= V2.summonTier;
  const step = run.step;
  run.step = () => {
    step();
    for (const t of run.tiles) {
      if (!can(t)) continue;
      if (t.summon) {
        const s = t.summon;
        s.t += PHYSICS.dt;
        s.phase = s.t < V2.summon.hopS ? 'out' : s.t > s.dur - V2.summon.hopS ? 'back' : 'act';
        if (s.t >= s.dur) delete t.summon;
      } else if (run.phase === 'wave') charge.set(t.id, Math.min(1, (charge.get(t.id) ?? 0) + PHYSICS.dt / V2.summon.chargeS));
    }
  };
  run.skillCharge = (id) => charge.get(id) ?? 0;
  run.skillReady = (id) => (charge.get(id) ?? 0) >= 1 && !tileOf(id)?.summon;
  run.castSkill = (id) => {
    const t = tileOf(id);
    if (!can(t) || !run.skillReady(id)) return false;
    charge.set(id, 0);
    t.summon = { key: fusionKey(t.cls.element, t.cls.fusion), t: 0, dur: V2.summon.durS, phase: 'out', x: t.x, y: t.y + 8, facing: 1, lane: t.col ?? 0 };
    return true;
  };
  run.tiles.filter(can).forEach((t, i) => charge.set(t.id, i === 0 ? 1 : 0.45));
  return true;
}

/** The row of buttons that opens each card (`open(kind)`): kinds 'die' | 'fusion' | 'keep' | 'result' | 'buffed'. */
export function createDemoPanel(root, { open }) {
  const el = document.createElement('div');
  el.className = 'v2demo';
  const kinds = [
    ['die', 'Element'],
    ['fusion', 'Fusion'],
    ['keep', 'Keep'],
    ['result', 'Skill'],
    ['buffed', 'Buff'],
  ];
  el.innerHTML = kinds.map(([k, label]) => `<button data-demo="${k}">${esc(label)}</button>`).join('');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-demo]');
    if (b) open(b.dataset.demo);
  });
  el.addEventListener('pointerdown', (e) => e.stopPropagation()); // a tap here never swipes the board
  root.appendChild(el);
  return el;
}
