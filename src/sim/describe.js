// What a block does, in words and numbers, for the tile info popup (src/ui/inspect.js).
// Built from the same data the simulation uses (classes.js + profileFor), so the popup
// always shows the attack the block really has. The words come from the language's table
// (src/i18n, the card.* keys). Pure data; no rendering.
import { DEFENSE, GRID, tierValue } from '../config.js';
import { ELEMENTS, FUSIONS, APEX, TAGS, fusionKey, fusionOffers, materialOf, profileFor, stageFor, turretDamage } from './classes.js';
import { num as fmt, ordinal, orList, tr } from '../i18n/index.js';

const TARGET = { front: 'nearest', nearest: 'nearest', strongest: 'strongest', weakest: 'weakest', crowd: 'crowd', unpoisoned: 'unpoisoned' };
// area attacks hit everything in their shape
const AREA = { cone: 'cone', gust: 'gust', pulse: 'pulse', quake: 'quake' };
// skill numbers match src/kv/pets.js (cast) and src/kv/namecards.js (charge)
const SKILL = { radius: 2.8, mult: 5, charge: 9 };
const SKILL_LEGEND = { radius: 3.6, mult: 7, charge: 7 };

const pct = (v) => `${Math.round(v * 100)}%`;
const num = (v) => fmt(v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
const secs = (v) => tr('unit.s', { n: num(v) });
// attack speeds are design values with up to two decimals (Horn Arc 0.85, Quake Stomp 0.45): shown exactly
const perSec = (v) => tr('unit.perS', { n: v >= 10 ? num(v) : fmt(Math.round(v * 100) / 100) });
// game distances are world units; a cell (one board square, one lane wide) is GRID.cell of them
const inCells = (u) => u / GRID.cell;
const cells = (u) => tr('unit.cells', { n: num(inCells(u)), count: inCells(u) === 1 ? 1 : 2 });
const merges = (n) => tr('card.merges', { n });

function rangeText(shoot) {
  const lanes = 1 + 2 * (shoot.lanes ?? 0);
  const laneText = tr('unit.lanes', { n: lanes });
  if (shoot.pattern === 'cone') return tr('card.range.cone', { cells: cells(shoot.reach) });
  if (shoot.pattern === 'pulse') return tr('card.range.ring', { n: num(inCells(shoot.radius)) });
  if (shoot.radius != null) return tr('card.range.circle', { n: num(inCells(shoot.radius)) });
  if (shoot.pattern === 'quake') return tr('card.range.deep', { cells: cells(shoot.reach), lanes: laneText });
  return tr('card.range.line', { cells: cells(shoot.reach), lanes: laneText });
}

/** Each effect the profile carries, as one readable line. */
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
      title: tr('card.egg.title', { value }),
      subtitle: tr('card.egg.sub'),
      desc: tr('card.egg.desc'),
      stats: [],
      effects: [],
      next: value < 16 ? tr('card.egg.next', { merges: merges(Math.log2(16 / value)) }) : null,
      colors: ['#e6b98a'],
      elements: [],
    };
  }

  const hit = turretDamage(tile.tier) * p.dmgMult;
  const count = p.shoot.count ?? 1;
  const stats = [
    { label: tr('card.stat.damage'), value: count > 1 ? `${num(hit)} × ${count}` : num(hit) },
    { label: tr('card.stat.attacks'), value: perSec(p.rate) },
    { label: tr('card.stat.dps'), value: `≈ ${num(hit * count * p.rate)}` },
    { label: tr('card.stat.range'), value: rangeText(p.shoot) },
    { label: tr('card.stat.targets'), value: tr(`card.target.${AREA[p.shoot.pattern] ? `area.${AREA[p.shoot.pattern]}` : (TARGET[p.shoot.target] ?? 'nearest')}`) },
  ];
  const elements = [cls.element, cls.fusion, cls.ultimate].filter(Boolean);
  const effects = effectLines(p);

  if (!cls.fusion) {
    const e = ELEMENTS[cls.element];
    const toFuse = merges(Math.log2(256 / value));
    // the fusions its material allows so far (the player picks one at 256 when there are several)
    const material = materialOf(tile);
    const can = material.length >= 2 ? fusionOffers(cls, material, 8).map((o) => o.name) : [];
    return {
      kind: 'element',
      value,
      title: e.attack,
      subtitle: `${e.name} · ${value}`,
      desc: e.desc,
      stats,
      effects,
      next: can.length ? tr(can.length > 1 ? 'card.next.fusePick' : 'card.next.fuseTo', { merges: toFuse, options: orList(can) }) : tr('card.next.fuse', { merges: toFuse }),
      colors: [e.color],
      elements,
    };
  }

  const fu = FUSIONS[fusionKey(cls.element, cls.fusion)];
  const legend = !!cls.ultimate;
  const sk = legend ? SKILL_LEGEND : SKILL;
  const tags = [TAGS[cls.element], TAGS[cls.fusion], legend ? TAGS[cls.ultimate] : null].filter(Boolean).join(' + ');
  const out = {
    kind: legend ? 'legend' : 'fusion',
    value,
    title: p.name,
    subtitle: `${ELEMENTS[cls.element].name} + ${ELEMENTS[cls.fusion].name}${legend ? ` + ${ELEMENTS[cls.ultimate].name}` : ''} · ${value}`,
    petName: petNameFn ? petNameFn(cls.element, cls.fusion) : null,
    desc: tr('card.fusion.desc', { tags }),
    stats,
    effects,
    skill: tr('card.skill', { charge: secs(sk.charge), cells: cells(sk.radius), mult: sk.mult }),
    next: legend ? null : tr('card.next.ultimate', { merges: merges(Math.log2(4096 / value)) }),
    colors: legend ? [fu.color, ELEMENTS[cls.ultimate].color] : [fu.color],
    elements,
  };
  if (legend) out.signature = `${APEX[cls.ultimate].name}: ${APEX[cls.ultimate].desc}`;
  return out;
}
