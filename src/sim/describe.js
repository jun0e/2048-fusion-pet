// What a block does, in words and numbers, for the tile card (src/ui/inspect.js) and the v2 cards
// (src/ui/cards.js), as docs/v2/SPEC.md has it: a plain stone block, an elemental egg (or a fusion egg),
// a single pet, a fusion pet (its main and second element, its buffs, its summon skill and how charged
// it is, its pure aura at 4096). Built from the same data the simulation uses (classes.js profileFor,
// src/sim/skills/data.js), so the card always shows the attack the block really has. The words come
// from the language's table (src/i18n). Pure data; no rendering.
import { DEFENSE, GRID, V2, tierValue } from '../config.js';
import { ELEMENTS, FUSIONS, fusionKey, profileFor, turretDamage } from './classes.js';
import { ELEMENT_STATS, FUSION_HIT, FUSION_SKILLS, PURE_SELF, skillVars, summonHead } from './skills/data.js';
import { num as fmt, ordinal, tr } from '../i18n/index.js';

const FMT = { num: fmt, tr };
/** The elements in the game's order (buffs and lists read in it). */
const KEYS = Object.keys(ELEMENTS);
/** The values a fusion's summon unlocks at and a pet turns pure at, as the blocks show them (1024, 4096). */
export const SUMMON_AT = 2 ** V2.summonTier;
export const PURE_AT = 2 ** V2.pureTier;
/** A block hatches (and shoots) from tier 4: 16. */
const HATCH_TIER = 4;

const TARGET = { front: 'nearest', nearest: 'nearest', strongest: 'strongest', weakest: 'weakest', crowd: 'crowd', unpoisoned: 'unpoisoned' };
// area attacks hit everything in their shape
const AREA = { cone: 'cone', gust: 'gust', pulse: 'pulse', quake: 'quake' };

const pct = (v) => `${fmt(Math.round(v * 1000) / 10)}%`;
const num = (v) => fmt(v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
const secs = (v) => tr('unit.s', { n: num(v) });
// attack speeds are design values with up to two decimals (Horn Arc 0.85, Quake Stomp 0.45): shown exactly
const perSec = (v) => tr('unit.perS', { n: v >= 10 ? num(v) : fmt(Math.round(v * 100) / 100) });
// game distances are world units; a cell (one board square, one lane wide) is GRID.cell of them
const inCells = (u) => u / GRID.cell;
const cells = (u) => tr('unit.cells', { n: num(inCells(u)), count: inCells(u) === 1 ? 1 : 2 });
/** The merges from a block's tier up to `goalTier`, as words: "2 more merges". */
export const mergesTo = (tier, goalTier) => tr('card.merges', { n: Math.max(0, goalTier - tier) });
// an element's and a fusion's words, from the language's table (the same words classes.js gives them)
export const elName = (e) => tr(`el.${e}`);
export const elAttack = (e) => tr(`el.${e}.attack`);
export const elLine = (e) => tr(`el.${e}.line`);
export const fusionName = (a, b) => tr(`fusion.${fusionKey(a, b)}`);

// --- the element stats, buffs and the pure aura (src/sim/skills/data.js ELEMENT_STATS) ---------------

/** An element's stat at `v` as the language writes it: "+20% damage", "+1 poison stack per hit". */
export function statText(element, v) {
  const s = ELEMENT_STATS[element]?.stat;
  if (!s) return '';
  return tr(`stat.${s}`, { v: s === 'poison' ? fmt(Math.round(v * 100) / 100) : pct(v) });
}
/** What `n` single pets of an element fed into a fusion give it: "+40% damage". */
export const buffStat = (element, n = 1) => statText(element, ELEMENT_STATS[element].buff * n);
/** "Fed to a fusion: +20% damage" */
export const buffLine = (element) => tr('buff.line', { stat: buffStat(element) });
/** "Pure Fire" */
export const pureName = (element) => tr(`pure.${element}.name`);
/** A pure pet's aura, who it reaches and what it gives: "Every other pet: +25% damage." */
export function pureAura(element) {
  const s = ELEMENT_STATS[element];
  return tr(s.stat === 'hp' || s.stat === 'regen' ? 'pure.blocks' : 'pure.others', { stat: statText(element, s.pure) });
}
/** What a pure pet gains itself: "Itself: +60% damage." */
export const pureSelf = () => tr('pure.self', { v: pct(PURE_SELF - 1) });
/** "+Fire", "+Fire ×2" */
export const gainTag = (element, n = 1) => tr(n > 1 ? 'buff.tagN' : 'buff.tag', { name: elName(element), n });
/** "+Fire: +20% damage", "+Fire ×2: +40% damage" */
export const gainLine = (element, n = 1) => tr(n > 1 ? 'buff.gainN' : 'buff.gain', { name: elName(element), n, stat: buffStat(element, n) });
/** A buffs map ({ fire: 2 }) as a list in element order: [{ element, n }]. */
export const buffList = (buffs) => KEYS.filter((k) => buffs?.[k] > 0).map((k) => ({ element: k, n: buffs[k] }));

/**
 * The buff banner of a `buffed` event: { title: "Novakit +Fire", sub: "+20% damage", gains: "+Fire" }.
 * Several gains are joined with commas: the ribbon pages a long line at its words, and a page never
 * starts with a dot. `gains` alone is the popup over the block.
 */
export function buffBanner(gain, pet) {
  const g = buffList(gain);
  const gains = g.map((x) => gainTag(x.element, x.n)).join(' ');
  return {
    title: tr('ban.buffed', { pet, gains }).trim(),
    sub: g.map((x) => buffStat(x.element, x.n)).join(', '),
    gains,
  };
}

// --- a fusion's summon skill (src/sim/skills/data.js FUSION_SKILLS) ---------------------------------

/**
 * The common header of a summon skill (its charge, its time out) with the value it unlocks at, or
 * without it (`unlock: false`) where the card says the unlock on a line of its own.
 */
export function skillHead({ unlock = true } = {}) {
  const h = summonHead();
  const full = tr('skill.head', { ...skillVars(h, FMT), unlock: String(h.unlock) });
  if (unlock) return full;
  // the part that says the unlock goes, wherever the language puts it among the ' · ' parts
  const parts = full.split(' · ');
  const rest = parts.filter((p) => !p.includes(String(h.unlock)));
  return rest.length && rest.length < parts.length ? rest.join(' · ') : full;
}

/**
 * A fusion's skill in words, the same for either main element (the skill belongs to the pair), with
 * its pet's name (`pet`): { key, pet, name, head, summon, text, passive, locked }. The passive names
 * the main element's attack and the second element's effects.
 */
export function skillWords(cls, pet) {
  const key = fusionKey(cls.element, cls.fusion);
  return {
    key,
    pet,
    name: tr(`skill.${key}.name`),
    head: skillHead({ unlock: false }),
    summon: tr('skill.summon', { pet }),
    text: tr(`skill.${key}.text`, skillVars(FUSION_SKILLS[key] ?? {}, FMT)),
    passive: tr('skill.fusionPassive', { main: elAttack(cls.element), second: `${elName(cls.fusion)} (${tr(`tag.${cls.fusion}`)})`, hit: pct(FUSION_HIT - 1) }),
    locked: tr('skill.locked', { unlock: String(SUMMON_AT) }),
  };
}

/** The passive while the main element is still to pick (the fusion choice): "Attacks like the main element you pick, …". */
export const anyMainPassive = () => tr('skill.fusionPassive', { main: tr('fuse.anyMain'), second: tr('fuse.anySecond'), hit: pct(FUSION_HIT - 1) });

/** Seconds a summoned pet still has out on the field (tile.summon: `t` seconds out of `dur`). */
export const summonLeft = (s) => (s ? Math.max(0, s.left ?? (s.dur ?? V2.summon.durS) - (s.t ?? 0)) : 0);

/**
 * Where a fusion's summon stands: { state: 'locked' | 'charging' | 'ready' | 'out', charge (0–1), left
 * (seconds out), text }. `skill` = { charge, ready } from the run (run.skillCharge, run.skillReady);
 * none (a run without summons yet): charging from empty.
 */
export function skillState(tile, skill = null) {
  if (tile.tier < V2.summonTier) return { state: 'locked', charge: 0, left: 0, text: tr('card.skill.lockedIn', { unlock: String(SUMMON_AT), merges: mergesTo(tile.tier, V2.summonTier) }) };
  if (tile.summon) {
    const left = summonLeft(tile.summon);
    return { state: 'out', charge: 0, left, text: tr('card.skill.out', { s: secs(Math.ceil(left)) }) };
  }
  const charge = Math.max(0, Math.min(1, skill?.charge ?? 0));
  if (skill?.ready ?? charge >= 1) return { state: 'ready', charge: 1, left: 0, text: tr('card.skill.ready') };
  return { state: 'charging', charge, left: 0, text: tr('card.skill.charging', { pct: `${Math.floor(charge * 100)}%` }) };
}

/** The elements with a single (an egg or a pet with one element) on the board, but `except` (a tile): the one-single-per-element rule. */
export const singlesOf = (tiles, except = null) => new Set(tiles.filter((t) => t !== except && t.cls?.element && !t.cls.fusion).map((t) => t.cls.element));

// --- the attack -------------------------------------------------------------------------------------

function rangeText(shoot) {
  const lanes = 1 + 2 * (shoot.lanes ?? 0);
  const laneText = tr('unit.lanes', { n: lanes });
  if (shoot.pattern === 'cone') return tr('card.range.cone', { cells: cells(shoot.reach) });
  if (shoot.pattern === 'pulse') return tr('card.range.ring', { n: num(inCells(shoot.radius)) });
  if (shoot.radius != null) return tr('card.range.circle', { n: num(inCells(shoot.radius)) });
  if (shoot.pattern === 'quake') return tr('card.range.deep', { cells: cells(shoot.reach), lanes: laneText });
  return tr('card.range.line', { cells: cells(shoot.reach), lanes: laneText });
}

/** Each effect the profile carries, as one readable line (the v2 stats too: crit, regen, health). */
export function effectLines(p) {
  const out = [];
  if (p.burn) out.push(tr('card.fx.burn', { pct: pct(p.burn.dpsPct), dur: secs(p.burn.dur), max: p.burn.max }));
  if (p.poison) out.push(tr(p.poison.weaken ? 'card.fx.poisonWeaken' : 'card.fx.poison', { pct: pct(p.poison.dpsPct), dur: secs(p.poison.dur), max: p.poison.max, weaken: pct(p.poison.weaken ?? 0) }));
  if (p.puddle && p.shoot?.pattern === 'spit') out.push(tr('card.fx.puddle', { r: num(inCells(p.puddle.radius)), dur: secs(p.puddle.dur), every: secs(p.puddle.every) }));
  if (p.chill) out.push(tr('card.fx.slow', { pct: pct(p.chill.slow), dur: secs(p.chill.dur) }));
  if (p.freeze) out.push(tr('card.fx.freeze', { nth: ordinal(p.freeze.every), dur: secs(p.freeze.dur) }));
  if (p.chain) out.push(tr('card.fx.chain', { jumps: p.chain.jumps, cells: cells(p.chain.range), pct: pct(1 - p.chain.falloff) }));
  if (p.splash) out.push(tr('card.fx.splash', { pct: pct(p.splash.pct), cells: cells(p.splash.radius) }));
  if (p.pierce) out.push(tr('card.fx.pierce'));
  if (p.knockback) {
    const steps = DEFENSE.bossPushResist.map((r) => r.after);
    out.push(tr('card.fx.knockback', { cells: cells(p.knockback), steps: steps.slice(0, -1).join(', '), last: steps.at(-1) }));
  }
  if (p.stun) out.push(p.stun.chance >= 1 ? tr('card.fx.stun', { dur: secs(p.stun.dur) }) : tr('card.fx.stunChance', { pct: pct(p.stun.chance), dur: secs(p.stun.dur) }));
  if (p.root) out.push(tr('card.fx.root', { dur: secs(p.root.dur) }));
  if (p.thorns) out.push(tr('card.fx.thorns', { pct: pct(p.thorns.pct) }));
  if (p.regrow) out.push(tr('card.fx.regrow', { pct: pct(p.regrow.pct) }));
  if (p.bite) out.push(tr('card.fx.bite', { pct: pct(p.bite.chance), mult: p.bite.mult, below: pct(p.bite.below) }));
  if (p.loot) out.push(tr('card.fx.loot', { pct: pct(p.loot.pct), dur: secs(p.loot.dur) }));
  if (p.heal) out.push(tr('card.fx.heal', { pct: pct(p.heal.chance), by: pct(p.heal.pct) }));
  // v2: the element stats a fusion's buffs and the pure auras add (docs/v2/SPEC.md section 4)
  if (p.critChance) out.push(tr('card.fx.crit', { pct: pct(p.critChance), mult: p.critMult ?? 2 }));
  if (p.regen) out.push(tr('card.fx.regen', { pct: pct(p.regen) }));
  if (p.hpMult > 1) out.push(tr('card.fx.hp', { pct: pct(p.hpMult - 1) }));
  return out;
}

/** The attack's numbers: damage, attacks, DPS, range, targets (a block that shoots). */
function statsOf(tile, p) {
  const hit = p.damage ?? turretDamage(tile.tier) * p.dmgMult;
  const count = p.shoot.count ?? 1;
  return [
    { label: tr('card.stat.damage'), value: count > 1 ? `${num(hit)} × ${count}` : num(hit) },
    { label: tr('card.stat.attacks'), value: perSec(p.rate) },
    { label: tr('card.stat.dps'), value: `≈ ${num(hit * count * p.rate)}` },
    { label: tr('card.stat.range'), value: rangeText(p.shoot) },
    { label: tr('card.stat.targets'), value: tr(`card.target.${AREA[p.shoot.pattern] ? `area.${AREA[p.shoot.pattern]}` : (TARGET[p.shoot.target] ?? 'nearest')}`) },
  ];
}

/**
 * The auras a block takes from the pure pets on the board (tile.aura, set by the run: { [element]: v },
 * every OTHER pure pet's value by its main element): health and regen reach every block, the rest only
 * pets. → [{ element, text: "Pure Fire: +25% damage" }]
 */
export function auraLines(tile) {
  const pet = !!tile.cls?.element;
  return KEYS.filter((k) => tile.aura?.[k] > 0)
    .filter((k) => pet || ['hp', 'regen'].includes(ELEMENT_STATS[k].stat))
    .map((k) => ({ element: k, text: tr('card.aura', { name: pureName(k), stat: statText(k, tile.aura[k]) }) }));
}

/** A pet's pure form: its name, its aura, what it gains itself, and whether it is pure now (else when: "Pure Fire at 4096 (2 more merges)"). */
const pureOf = (element, tile, active) => ({
  element,
  active,
  name: pureName(element),
  aura: pureAura(element),
  self: pureSelf(),
  at: active ? null : tr('card.pure.at', { name: pureName(element), value: PURE_AT, merges: mergesTo(tile.tier, V2.pureTier) }),
});

// --- the tile card ----------------------------------------------------------------------------------

/**
 * The tile card's content for a block (docs/v2/SPEC.md section 7):
 *   { kind: plain | egg | single | fusion, value, title, subtitle?, petName?, desc, hint?, elements: [{ element, main }],
 *     stats: [{ label, value }], effects: [string], auras: [{ element, text }], feed?, fuses?, buffs?, skill?, pure?, next, colors }
 * skill: skillWords + { cls, state, charge, left, stateText } (skillState); pure: { name, aura, self, active, at }
 * ctx: { petName (a, b) → name, tiles (the board, for the singles a pet can fuse with), skill: { charge, ready } }
 */
export function describeTile(tile, ctx = {}) {
  if (typeof ctx === 'function') ctx = { petName: ctx };
  ctx ??= {};
  const pet = ctx.petName ?? fusionName;
  const value = tierValue(tile.tier);
  const cls = tile.cls ?? {};
  const hatched = tile.tier >= HATCH_TIER;
  const p = profileFor(tile);
  const shoots = p.shoots !== false && hatched;
  const stats = shoots && p.shoot ? statsOf(tile, p) : [];
  const effects = shoots ? effectLines(p) : [];
  const base = { value, tier: tile.tier, stats, effects, elements: [], auras: auraLines(tile), next: null };

  // a plain stone block: never an element; from 16 it shoots pebbles
  if (!cls.element) {
    return {
      ...base,
      kind: 'plain',
      title: tr(hatched ? 'card.plain.turret' : 'card.plain'),
      desc: tr(hatched ? 'card.plain.turretDesc' : 'card.plain.desc'),
      next: hatched ? null : tr('card.plain.next', { merges: mergesTo(tile.tier, HATCH_TIER) }),
      colors: ['#c9b08a'],
    };
  }

  const e = ELEMENTS[cls.element];
  const elements = [{ element: cls.element, main: !!cls.fusion }, ...(cls.fusion ? [{ element: cls.fusion, main: false }] : [])];

  // a fusion (an egg below 16, a pet from 16): its skill, its buffs, its pure form at 4096
  if (cls.fusion) {
    const key = fusionKey(cls.element, cls.fusion);
    const fu = FUSIONS[key];
    const name = pet(cls.element, cls.fusion);
    const words = skillWords(cls, name);
    const pure = !!cls.pure;
    const st = skillState(tile, ctx.skill);
    const skill = { ...words, cls: { element: cls.element, fusion: cls.fusion }, state: st.state, charge: st.charge, left: st.left, stateText: st.text };
    const buffs = buffList(cls.buffs).map((b) => ({ ...b, text: gainLine(b.element, b.n) }));
    const egg = !hatched;
    return {
      ...base,
      kind: egg ? 'egg' : 'fusion',
      fusion: true,
      title: egg ? tr('card.fegg.title', { pet: name }) : name,
      subtitle: fusionName(cls.element, cls.fusion),
      petName: name,
      desc: egg ? tr('card.fegg.desc', { pet: name, fusion: fusionName(cls.element, cls.fusion), a: elName(cls.element), b: elName(cls.fusion) }) : '', // a pet's attack: its skill's PASSIVE
      elements,
      buffs,
      skill,
      pure: pureOf(cls.element, tile, pure),
      next: egg ? tr('card.egg.next', { merges: mergesTo(tile.tier, HATCH_TIER) }) : null, // (the pure form says when it comes)
      colors: [fu.color],
    };
  }

  // an elemental egg: the pet it hatches into, and how it fuses
  if (!hatched) {
    return {
      ...base,
      kind: 'egg',
      title: tr('card.egg.title', { name: elName(cls.element) }),
      desc: tr('card.egg.desc', { name: elName(cls.element), attack: elAttack(cls.element), line: elLine(cls.element) }),
      hint: tr('card.egg.fuse'),
      elements,
      feed: buffLine(cls.element),
      next: tr('card.egg.next', { merges: mergesTo(tile.tier, HATCH_TIER) }),
      colors: [e.color],
    };
  }

  // a single pet: its attack, what it gives a fusion, the fusions it makes with the other singles on the board
  const others = ctx.tiles ? [...singlesOf(ctx.tiles, tile)].filter((x) => x !== cls.element) : [];
  const fuses = KEYS.filter((k) => others.includes(k)).map((k) => {
    const c = { element: cls.element, fusion: k };
    const name = pet(cls.element, k);
    return { partner: k, key: fusionKey(cls.element, k), pet: name, skill: skillWords(c, name).name, color: FUSIONS[fusionKey(cls.element, k)].color };
  });
  return {
    ...base,
    kind: 'single',
    title: elAttack(cls.element),
    subtitle: tr('card.single', { name: elName(cls.element) }),
    desc: tr(`el.${cls.element}.desc`),
    elements,
    feed: buffLine(cls.element),
    fuses,
    pure: pureOf(cls.element, tile, !!cls.pure),
    colors: [e.color],
  };
}
