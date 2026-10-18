// Prints v2's skill matrix as markdown, in one language, from the same data and words the game uses
// (src/sim/skills/data.js + src/i18n/skills-*.js): the 8×8 matrix (a fusion's skill in each cell, the
// pure form on the diagonal), every fusion skill in the shape of a League of Legends tooltip, and the
// element table (attack, buff when fed to a fusion, pure aura). Usage: node tools/skill-matrix.mjs [vi|en]
import { ELEMENT_KEYS, fusionKey } from '../src/sim/classes.js';
import { FUSION_SKILLS, ELEMENT_STATS, PURE_SELF, FUSION_HIT, skillVars, summonHead } from '../src/sim/skills/data.js';
import { FUSION_ROSTER } from '../src/art/fusion-roster.js';
import { setLang, tr, num } from '../src/i18n/index.js';

const lang = process.argv[2] ?? 'vi';
setLang(lang);
const fmt = { num, tr };
const el = (e) => tr(`el.${e}`);
const pct = (v) => `${num(Math.round(v * 1000) / 10)}%`;
const statText = (e, v) => {
  const s = ELEMENT_STATS[e].stat;
  return tr(`stat.${s}`, { v: s === 'poison' ? num(v) : pct(v) });
};
const V = lang === 'vi';
const out = [];
const head = tr('skill.head', skillVars(summonHead(), fmt)).replace(/ · [^·]*$/, ''); // the unlock is said once, above

// the matrix: rows and columns are the elements; a cell is the fusion's skill, the diagonal its pure form
out.push(`| | ${ELEMENT_KEYS.map(el).join(' | ')} |`);
out.push(`|---|${ELEMENT_KEYS.map(() => '---').join('|')}|`);
for (const a of ELEMENT_KEYS) {
  const cells = ELEMENT_KEYS.map((b) => (a === b ? `*${tr(`pure.${a}.name`)}*` : tr(`skill.${fusionKey(a, b)}.name`)));
  out.push(`| **${el(a)}** | ${cells.join(' | ')} |`);
}
const matrix = out.splice(0).join('\n');

// every fusion skill, grouped by its first element in the matrix's order
const skills = [];
const done = new Set();
for (const a of ELEMENT_KEYS) {
  const rows = [];
  for (const b of ELEMENT_KEYS) {
    const k = fusionKey(a, b);
    if (a === b || done.has(k)) continue;
    done.add(k);
    const [p, q] = k.split('+');
    const pet = FUSION_ROSTER[k].name;
    rows.push(
      `**${tr(`skill.${k}.name`)}** · ${pet} (${tr(`fusion.${k}`)}: ${el(p)} + ${el(q)})\n*${head}*\n${tr('skill.active')}: ${tr('skill.summon', { pet })} ${tr(`skill.${k}.text`, skillVars(FUSION_SKILLS[k], fmt))}`,
    );
  }
  if (rows.length) skills.push(`### ${el(a)}\n\n${rows.join('\n\n')}`);
}

// the element table
const elRows = ELEMENT_KEYS.map((e) => {
  const s = ELEMENT_STATS[e];
  const scope = s.stat === 'hp' || s.stat === 'regen' ? 'pure.blocks' : 'pure.others';
  return `| **${el(e)}** | ${tr(`el.${e}.attack`)} | ${statText(e, s.buff)} | ${tr(`pure.${e}.name`)}: ${tr(scope, { stat: statText(e, s.pure) })} |`;
});
const elTable = [V ? '| Nguyên tố | Đòn đánh thường | Ghép vào pet dung hợp (mỗi lần) | Thuần khiết ở 4096 |' : '| Element | Normal attack | Fed to a fusion (each time) | Pure form at 4096 |', '|---|---|---|---|', ...elRows].join('\n');

const passive = tr('skill.fusionPassive', { main: V ? 'nguyên tố chính' : 'its main element', second: V ? 'nguyên tố phụ' : 'its second element', hit: pct(FUSION_HIT - 1) });
console.log(
  JSON.stringify({
    matrix,
    skills: skills.join('\n\n'),
    elements: elTable,
    passive,
    pureSelf: tr('pure.self', { v: pct(PURE_SELF - 1) }),
    unlock: num(2 ** 10),
  }),
);
