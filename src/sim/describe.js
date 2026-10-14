// What a block does, in words and numbers, for the tile info popup (src/ui/inspect.js).
// Built from the same data the simulation uses (classes.js + profileFor), so the popup
// always shows the attack the block really has. Pure data; no rendering.
import { GRID, tierValue } from '../config.js';
import { ELEMENTS, FUSIONS, APEX, TAGS, fusionKey, profileFor, stageFor, turretDamage } from './classes.js';

const TARGET = {
  front: 'Nearest foe',
  nearest: 'Nearest foe',
  strongest: 'Toughest foe',
  weakest: 'Weakest foe',
  crowd: 'Biggest crowd',
  unpoisoned: 'Unpoisoned first',
};
// area attacks hit everything in their shape
const AREA = { cone: 'Every foe in the cone', gust: 'Every foe in the lane', pulse: 'Every foe in the ring', quake: 'Every foe in the wave' };
// skill numbers match src/kv/pets.js (cast) and src/kv/namecards.js (charge)
const SKILL = { radius: 2.8, mult: 5, charge: 9 };
const SKILL_LEGEND = { radius: 3.6, mult: 7, charge: 7 };

const pct = (v) => `${Math.round(v * 100)}%`;
const num = (v) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, ''));
const secs = (v) => `${num(v)} s`;
const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
// game distances are world units; a cell (one board square, one lane wide) is GRID.cell of them
const inCells = (u) => u / GRID.cell;
const cells = (u) => `${num(inCells(u))} ${inCells(u) === 1 ? 'cell' : 'cells'}`;

function rangeText(shoot) {
  const lanes = 1 + 2 * (shoot.lanes ?? 0);
  const laneText = `${lanes} ${lanes === 1 ? 'lane' : 'lanes'}`;
  if (shoot.pattern === 'cone') return `${cells(shoot.reach)} cone`;
  if (shoot.pattern === 'pulse') return `${num(inCells(shoot.radius))}-cell ring`;
  if (shoot.radius != null) return `${num(inCells(shoot.radius))}-cell circle`;
  if (shoot.pattern === 'quake') return `${cells(shoot.reach)} deep · ${laneText}`;
  return `${cells(shoot.reach)} · ${laneText}`;
}

/** Each effect the profile carries, as one readable line. */
export function effectLines(p) {
  const out = [];
  if (p.burn) out.push(`Burn: ${pct(p.burn.dpsPct)} of a hit per second for ${secs(p.burn.dur)}, stacks up to ${p.burn.max}`);
  if (p.poison)
    out.push(
      `Poison: ${pct(p.poison.dpsPct)} of a hit per second for ${secs(p.poison.dur)}, stacks up to ${p.poison.max}${p.poison.weaken ? `; at ${p.poison.max} stacks the foe bites ${pct(p.poison.weaken)} softer` : ''}`,
    );
  if (p.puddle && p.shoot?.pattern === 'spit') out.push(`Puddle: ${num(inCells(p.puddle.radius))}-cell radius for ${secs(p.puddle.dur)}; foes in it gain a stack every ${secs(p.puddle.every)}`);
  if (p.chill) out.push(`Slow: ${pct(p.chill.slow)} for ${secs(p.chill.dur)}`);
  if (p.freeze) out.push(`Freeze: every ${ordinal(p.freeze.every)} hit freezes the foe for ${secs(p.freeze.dur)}`);
  if (p.chain) out.push(`Chain: arcs to ${p.chain.jumps} more foes within ${cells(p.chain.range)}, ${pct(1 - p.chain.falloff)} less per jump`);
  if (p.splash) out.push(`Splash: ${pct(p.splash.pct)} damage to foes within ${cells(p.splash.radius)}`);
  if (p.pierce) out.push('Pierce: hits every foe it passes through');
  if (p.knockback) out.push(`Knockback: pushes foes ${cells(p.knockback)} back`);
  if (p.stun) out.push(p.stun.chance >= 1 ? `Stun: ${secs(p.stun.dur)} on every hit` : `Stun: ${pct(p.stun.chance)} chance to stun for ${secs(p.stun.dur)}`);
  if (p.root) out.push(`Root: holds foes in place for ${secs(p.root.dur)}`);
  if (p.thorns) out.push(`Thorns: a foe that bites the block takes ${pct(p.thorns.pct)} of a hit`);
  if (p.regrow) out.push(`Regrow: repairs the block and its neighbours by ${pct(p.regrow.pct)} when it attacks`);
  if (p.bite) out.push(`Killing bite: ${pct(p.bite.chance)} chance of ×${p.bite.mult} damage on foes below ${pct(p.bite.below)} health`);
  if (p.loot) out.push(`Bonus coins: foes it marks drop +${pct(p.loot.pct)} coins for ${secs(p.loot.dur)}`);
  if (p.heal) out.push(`Repair: ${pct(p.heal.chance)} chance per shot to repair the most damaged block by ${pct(p.heal.pct)}`);
  return out;
}

/**
 * The popup content for a tile:
 *   { kind: egg|element|fusion|legend, value, title, subtitle, petName?, desc,
 *     stats: [{label, value}], effects: [string], skill?, signature?, next, colors, elements }
 */
export function describeTile(tile, petNameFn = null) {
  const value = tierValue(tile.tier);
  const cls = tile.cls ?? {};
  const p = profileFor(tile);
  const stage = stageFor(tile.tier);

  if (stage < 1 || !cls.element) {
    return {
      kind: 'egg',
      value,
      title: `Egg ${value}`,
      subtitle: 'Dormant',
      desc: 'Doesn’t attack yet. Merge it up to 16 to hatch: it rolls an element from your deck and starts fighting.',
      stats: [],
      effects: [],
      next: value < 16 ? `Hatches at 16 (${Math.log2(16 / value)} more ${Math.log2(16 / value) === 1 ? 'merge' : 'merges'})` : null,
      colors: ['#e6b98a'],
      elements: [],
    };
  }

  const hit = turretDamage(tile.tier) * p.dmgMult;
  const count = p.shoot.count ?? 1;
  const stats = [
    { label: 'Damage', value: count > 1 ? `${num(hit)} × ${count}` : num(hit) },
    { label: 'Attacks', value: `${num(p.rate)} / s` },
    { label: 'DPS', value: `≈ ${num(hit * count * p.rate)}` },
    { label: 'Range', value: rangeText(p.shoot) },
    { label: 'Targets', value: AREA[p.shoot.pattern] ?? TARGET[p.shoot.target] ?? 'Nearest foe' },
  ];
  const elements = [cls.element, cls.fusion, cls.ultimate].filter(Boolean);
  const effects = effectLines(p);

  if (!cls.fusion) {
    const e = ELEMENTS[cls.element];
    const toFuse = Math.log2(256 / value);
    return {
      kind: 'element',
      value,
      title: e.attack,
      subtitle: `${e.name} · ${value}`,
      desc: e.desc,
      stats,
      effects,
      next: `Fuses with a second element at 256 (${toFuse} more ${toFuse === 1 ? 'merge' : 'merges'})`,
      colors: [e.color],
      elements,
    };
  }

  const fu = FUSIONS[fusionKey(cls.element, cls.fusion)];
  const legend = !!cls.ultimate;
  const sk = legend ? SKILL_LEGEND : SKILL;
  const out = {
    kind: legend ? 'legend' : 'fusion',
    value,
    title: p.name,
    subtitle: `${ELEMENTS[cls.element].name} + ${ELEMENTS[cls.fusion].name}${legend ? ` + ${ELEMENTS[cls.ultimate].name}` : ''} · ${value}`,
    petName: petNameFn ? petNameFn(cls.element, cls.fusion) : null,
    desc: `${TAGS[cls.element]} + ${TAGS[cls.fusion]}${legend ? ` + ${TAGS[cls.ultimate]}` : ''}, all stronger. Its pet roams the field and fights from where it stands.`,
    stats,
    effects,
    skill: `Skill: when its namecard is charged (${sk.charge} s of wave time), tap it to blast foes within ${cells(sk.radius)} of the pet for ×${sk.mult} damage.`,
    next: legend ? null : `Ultimate at 4096 (${Math.log2(4096 / value)} more ${Math.log2(4096 / value) === 1 ? 'merge' : 'merges'})`,
    colors: legend ? [fu.color, ELEMENTS[cls.ultimate].color] : [fu.color],
    elements,
  };
  if (legend) out.signature = `${APEX[cls.ultimate].name}: ${APEX[cls.ultimate].desc}`;
  return out;
}
