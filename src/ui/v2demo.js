// ?v2demo (a developer's page, never a normal game): a board with every kind of v2 block (docs/v2/SPEC.md
// section 1), mock choices in the SPEC's shapes, and a column of buttons that open each card (a new
// element, the fusion to keep, the skill gained, the buff banner, the level card at several levels) and
// play the v2.1 news (a level up, the board growing, the siege's ramp), plus a sheet of every stat icon,
// so the screens can be checked in the browser at rest. A run without the sim's summons gets a stand-in
// (shimSummons), so the namecards' charging, ready and out states show too.
import { PHYSICS, V2 } from '../config.js';
import { ELEMENTS, fusionKey } from '../sim/classes.js';
import { esc } from './cards.js';
import { ICON_KEYS, icon, iconWord } from './icons.js';

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

/**
 * A mock choice of `kind` ('die' | 'keep'), in the SPEC's shapes (section 3; v2.1 has no fusion pick).
 * `tileId`: the block a keep card is about (a demo block, so the board can highlight it).
 */
export function mockChoice(kind, deck = DEMO_DECK, { tileId = -2 } = {}) {
  if (kind === 'die') {
    const free = Object.keys(ELEMENTS).filter((e) => !deck.includes(e));
    return { kind: 'die', level: 3, offers: free.slice(0, V2.offers).map(offerOf) };
  }
  // a heavy merge (the most a keep card shows): five and four gains, buffs on both sides
  const mover = { element: 'fire', fusion: 'ice', buffs: { lightning: 1, wind: 1 } };
  const stayer = { element: 'earth', fusion: 'metal', buffs: { poison: 2, nature: 1, wind: 1 } };
  return { kind: 'keep', tileId, tier: 9, offers: [keepOffer(mover, stayer), keepOffer(stayer, mover)] };
}

/**
 * The levels the demo's level card shows in turn (each card shows what the NEXT level brings on the
 * run's road): an element pick, values that start spawning, the 5×5 board, values that stop, faster
 * summons, the top level, and the top reached.
 */
export const DEMO_LEVELS = [1, 2, 10, 11, 14, 19, 20];

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

/** Every stat icon at the sizes the screens use (14–20 px), and at 32 px, on clay and on the skill's slate. */
export function iconSheetHtml() {
  const row = (k) => `<div class="v2i-row"><span class="v2i-clay">${[14, 16, 20, 32].map((s) => icon(k, { size: s })).join('')}</span><span class="v2i-slate">${icon(k, { size: 18 })}</span><small>${esc(k)} · ${esc(iconWord(k))}</small></div>`;
  return `<div class="v2i-grid">${ICON_KEYS.map(row).join('')}</div>`;
}

/**
 * The row of buttons that opens each card (`open(kind)`): kinds 'die' | 'keep' | 'result' | 'buffed' |
 * 'level' (the level card at the next of DEMO_LEVELS) | 'levelUp' | 'grow' | 'steep' | 'dps' (the v2.1
 * news); 'icons' shows every stat icon.
 */
export function createDemoPanel(root, { open }) {
  const el = document.createElement('div');
  el.className = 'v2demo';
  const kinds = [
    ['die', 'Element'],
    ['keep', 'Keep'],
    ['result', 'Skill'],
    ['buffed', 'Buff'],
    ['level', 'Level'],
    ['levelUp', 'Lv up'],
    ['grow', 'Grow'],
    ['steep', 'Steep'],
    ['dps', 'DPS'],
    ['icons', 'Icons'],
  ];
  el.innerHTML = kinds.map(([k, label]) => `<button data-demo="${k}">${esc(label)}</button>`).join('');
  let sheet = null; // the icon sheet, over the field (a tap closes it)
  const toggleSheet = () => {
    if (sheet) {
      sheet.remove();
      sheet = null;
      return;
    }
    sheet = document.createElement('div');
    sheet.className = 'v2demo-icons';
    sheet.innerHTML = iconSheetHtml();
    sheet.addEventListener('click', toggleSheet);
    sheet.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.appendChild(sheet);
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-demo]');
    if (!b) return;
    if (b.dataset.demo === 'icons') toggleSheet();
    else open(b.dataset.demo);
  });
  el.addEventListener('pointerdown', (e) => e.stopPropagation()); // a tap here never swipes the board
  root.appendChild(el);
  return el;
}
