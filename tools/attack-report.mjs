#!/usr/bin/env node
// Renders reports/Element basic attacks.html: the reimagined basic attack of each
// element (src/art/attack-design.js) as a self-contained page (no external files)
// with the flat element icons inline and a range diagram per element.
//   node tools/attack-report.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASIC_ATTACKS, RANGE_BANDS, TARGETING } from '../src/art/attack-design.js';
import { ELEMENT_PALETTES } from '../src/art/palettes.js';
import { iconSvg, iconPathD } from '../src/art/element-icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'reports', 'Element basic attacks.html');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const key = (el) => ELEMENT_PALETTES[el].key;

// --- range diagrams (4 lanes above the board's top row; the tile sits in lane 2) ---------------------
const C = 40; // one cell
const LX = (i) => 30 + i * C; // lane left edge
const FIELD_TOP = 10;
const BOARD_Y = 170; // top of the board row
const TX = LX(1) + C / 2; // tile centre x
const foe = (x, y, r = 7, hp = null) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#ff8fa3" stroke="#2b1d2e" stroke-width="2"/>` +
  (hp == null ? '' : `<rect x="${x - 9}" y="${y - r - 7}" width="18" height="4" rx="2" fill="#2b1d2e"/><rect x="${x - 8}" y="${y - r - 6}" width="${16 * hp}" height="2" rx="1" fill="#7cd15a"/>`);

function diagram(a) {
  const k = key(a.el);
  const fillA = `${k}55`;
  let area = '';
  let foes = '';
  switch (a.el) {
    case 'fire':
      area = `<polygon points="${TX - 5},${BOARD_Y} ${TX + 5},${BOARD_Y} ${TX + 30},${BOARD_Y - 2 * C} ${TX - 30},${BOARD_Y - 2 * C}" fill="${fillA}" stroke="${k}" stroke-width="2"/>`;
      foes = foe(TX, 140) + foe(TX - 14, 112) + foe(TX + 15, 104) + foe(TX + 2, 52);
      break;
    case 'wind':
      area = `<rect x="${LX(1) + 2}" y="${FIELD_TOP}" width="${C - 4}" height="${BOARD_Y - FIELD_TOP}" rx="6" fill="${fillA}" stroke="${k}" stroke-width="2"/>`;
      for (const y of [130, 90, 50]) area += `<path d="M${TX - 8},${y + 8} L${TX},${y - 4} L${TX + 8},${y + 8}" fill="none" stroke="${k}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      foes = foe(TX, 118) + foe(TX, 78) + foe(TX, 38) + foe(LX(2) + C / 2, 100);
      break;
    case 'nature':
      area = `<circle cx="${TX}" cy="${BOARD_Y + C / 2}" r="${C / 2 + C}" fill="${fillA}" stroke="${k}" stroke-width="2"/>`;
      foes = foe(TX, 146) + foe(TX + 40, 160) + foe(TX - 38, 168) + foe(TX + 60, 70);
      for (const [x, y] of [
        [TX, 146],
        [TX + 40, 160],
      ])
        area += `<path d="M${x - 9},${y + 9} q4,-6 9,0 q5,6 9,0" fill="none" stroke="#2d9346" stroke-width="2.5"/>`;
      break;
    case 'ice': {
      const ty = 44;
      area = [1, 2, 3].map((i) => `<circle cx="${TX}" cy="${BOARD_Y}" r="${i * 10}" fill="none" stroke="${k}" stroke-width="1.5" opacity="${1 - i * 0.25}"/>`).join('');
      area += `<line x1="${TX}" y1="${BOARD_Y - 6}" x2="${TX}" y2="${ty + 14}" stroke="${k}" stroke-width="3" stroke-dasharray="6 5"/>`;
      area += `<circle cx="${TX}" cy="${ty}" r="17" fill="none" stroke="${k}" stroke-width="3"/>`;
      foes = foe(TX, ty, 11) + foe(TX, 110) + foe(TX, 136);
      break;
    }
    case 'poison': {
      const py = BOARD_Y - 3 * C + 10;
      area = `<path d="M${TX},${BOARD_Y - 4} Q${TX + 34},${(BOARD_Y + py) / 2 - 20} ${TX},${py}" fill="none" stroke="${k}" stroke-width="2.5" stroke-dasharray="5 4"/>`;
      area += `<ellipse cx="${TX}" cy="${py}" rx="${C / 2}" ry="11" fill="${fillA}" stroke="${k}" stroke-width="2"/>`;
      foes = foe(TX - 6, py - 4) + foe(TX + 9, py + 3) + foe(TX, py - 34);
      break;
    }
    case 'lightning': {
      const pts = [
        [TX, BOARD_Y - 4],
        [TX, 116],
        [TX + 38, 98],
        [TX + 58, 66],
      ];
      const zig = pts
        .slice(1)
        .map((p, i) => {
          const [x0, y0] = pts[i];
          const [x1, y1] = p;
          const mx = (x0 + x1) / 2 + (i % 2 ? 7 : -7);
          const my = (y0 + y1) / 2;
          return `M${x0},${y0} L${mx},${my} L${x1},${y1}`;
        })
        .join(' ');
      area = `<path d="${zig}" fill="none" stroke="#ffe14d" stroke-width="5" stroke-linejoin="round"/><path d="${zig}" fill="none" stroke="${k}" stroke-width="2.5" stroke-linejoin="round"/>`;
      foes = foe(TX, 116) + foe(TX + 38, 98) + foe(TX + 58, 66) + foe(LX(0) + 12, 50);
      break;
    }
    case 'metal': {
      const wy = 82;
      area = `<path d="M${TX - 6},${BOARD_Y - 4} Q${TX - 40},${(BOARD_Y + wy) / 2} ${TX - 4},${wy + 10}" fill="none" stroke="${k}" stroke-width="2.5" stroke-dasharray="5 4"/>`;
      area += `<path d="M${TX + 6},${wy + 10} Q${TX + 40},${(BOARD_Y + wy) / 2} ${TX + 6},${BOARD_Y - 4}" fill="none" stroke="${k}" stroke-width="2.5" stroke-dasharray="5 4"/>`;
      area += `<circle cx="${TX}" cy="${wy}" r="15" fill="none" stroke="${k}" stroke-width="3"/>`;
      foes = foe(TX, wy, 7, 0.25) + foe(TX, 40, 7, 1) + foe(TX + 40, 104, 7, 0.9);
      break;
    }
    case 'earth':
      area = `<rect x="${LX(0) + 3}" y="${BOARD_Y - 1.5 * C}" width="${3 * C - 6}" height="${1.5 * C - 3}" rx="8" fill="${fillA}" stroke="${k}" stroke-width="2"/>`;
      for (const x of [LX(0) + 20, LX(1) + 20, LX(2) + 20]) area += `<path d="M${x - 8},${BOARD_Y - 6} l4,-10 l4,6 l4,-10 l4,6" fill="none" stroke="${k}" stroke-width="2.5" stroke-linejoin="round"/>`;
      foes = foe(LX(0) + 20, 132) + foe(TX, 124) + foe(LX(2) + 20, 140) + foe(TX, 64);
      break;
  }
  const lanes = [0, 1, 2, 3]
    .map((i) => `<rect x="${LX(i) + 4}" y="${FIELD_TOP}" width="${C - 8}" height="${BOARD_Y - FIELD_TOP}" rx="6" fill="#efe1c4" opacity="${i === 1 ? 0.95 : 0.6}"/>`)
    .join('');
  const board = `<rect x="${LX(0) - 4}" y="${BOARD_Y}" width="${4 * C + 8}" height="${C + 6}" rx="8" fill="#2a2350"/>`;
  const tile = `<rect x="${LX(1) + 3}" y="${BOARD_Y + 3}" width="${C - 6}" height="${C - 6}" rx="8" fill="${k}" stroke="#2b1d2e" stroke-width="2.5"/>`;
  const glyph = `<g transform="translate(${LX(1) + 9},${BOARD_Y + 9}) scale(0.22)"><path d="${iconPathD(a.el)}" fill="#2b1d2e" fill-rule="evenodd"/></g>`;
  return `<svg viewBox="0 0 220 222" width="220" height="222" role="img" aria-label="${esc(a.attack)} range">
    <rect x="18" y="2" width="184" height="216" rx="12" fill="#26315f"/>${lanes}${board}${area}${tile}${glyph}${foes}</svg>`;
}

// --- page --------------------------------------------------------------------------------------------
const maxDps = Math.max(...BASIC_ATTACKS.map((a) => a.dps.crowd));
const bar = (v, k) => `<span class="bar"><i style="width:${(v / maxDps) * 100}%;background:${k}"></i></span><b>${v.toFixed(2)}</b>`;
const chip = (t, cls) => `<span class="chip ${cls}">${esc(t)}</span>`;

const rows = BASIC_ATTACKS.map(
  (a) => `<tr>
    <td class="who"><div class="ic">${iconSvg(a.el, 40)}</div><div><b>${cap(a.el)}</b><span>${esc(a.animal)}</span><em style="color:${key(a.el)}">${esc(a.role)}</em></div></td>
    <td><b class="atk">${esc(a.attack)}</b><span class="shape">${esc(a.shape)}</span></td>
    <td>${chip(cap(a.range), 'r-' + a.range)}<span class="sub">${esc(a.reach)}</span></td>
    <td>${chip(cap(a.targeting === 'aoe' ? 'Area' : a.targeting), 't-' + a.targeting)}<span class="sub">${esc(a.nums.targets)}</span></td>
    <td>${esc(a.effect)}</td>
    <td class="why">${esc(a.diegetic)}</td>
    <td>${esc(a.weak)}</td>
    <td>${esc(a.grows)}</td>
  </tr>`,
).join('');

const cards = BASIC_ATTACKS.map(
  (a) => `<figure class="card">
    <figcaption><span class="ic">${iconSvg(a.el, 26)}</span><b>${esc(a.attack)}</b><span>${esc(a.animal)}</span></figcaption>
    ${diagram(a)}
    <p>${esc(a.shape)}.</p>
  </figure>`,
).join('');

const numRows = BASIC_ATTACKS.map(
  (a) => `<tr>
    <td class="who sm"><div class="ic">${iconSvg(a.el, 24)}</div><b>${cap(a.el)}</b></td>
    <td>${a.nums.rate.toFixed(2)}/s</td><td>${a.nums.dmg.toFixed(2)} D</td><td>${esc(a.nums.targets)}</td><td>${esc(a.nums.extra)}</td>
    <td class="dps">${bar(a.dps.single, key(a.el))}</td><td class="dps">${bar(a.dps.crowd, key(a.el))}</td>
  </tr>`,
).join('');

const bands = Object.keys(RANGE_BANDS);
const types = Object.keys(TARGETING);
const matrix = `<table class="matrix"><tr><th></th>${types.map((t) => `<th>${esc(TARGETING[t])}</th>`).join('')}</tr>${bands
  .map(
    (b) =>
      `<tr><th>${esc(RANGE_BANDS[b])}</th>${types
        .map((t) => {
          const here = BASIC_ATTACKS.filter((a) => a.range === b && a.targeting === t);
          return `<td>${here.length ? here.map((a) => `<span class="m">${iconSvg(a.el, 22)}${cap(a.el)}</span>`).join('') : '<span class="gap">open</span>'}</td>`;
        })
        .join('')}</tr>`,
  )
  .join('')}</table>`;

const oldNew = BASIC_ATTACKS.map(
  (a) => `<tr><td class="who sm"><div class="ic">${iconSvg(a.el, 24)}</div><b>${cap(a.el)}</b></td><td class="old">${esc(a.was)}</td><td><b>${esc(a.attack)}</b>: ${esc(a.shape)}; ${esc(a.effect.charAt(0).toLowerCase() + a.effect.slice(1))}</td></tr>`,
).join('');

const strip = BASIC_ATTACKS.map(
  (a) => `<div class="tag"><div class="ic">${iconSvg(a.el, 46)}</div><b>${cap(a.el)}</b><span>${esc(a.animal)}</span><em style="color:${key(a.el)}">${esc(a.role)}</em></div>`,
).join('');

// head parts and the page body, assembled twice below: a standalone file for local viewing,
// and a fragment for publishing as a shareable artifact (the host adds doctype/head/body)
const headParts = `<title>2048 Siege element attacks</title>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet" />
<style>
  :root { --bg:#17203f; --panel:#1f2a55; --line:#34407a; --cream:#fffaf2; --soft:#c9d3ff; --muted:#93a0d6; --ink:#2b1d2e; color-scheme: dark; } /* one dark game-UI look by design */
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--cream); font: 600 14px/1.5 Nunito, system-ui, sans-serif; }
  main { max-width: 1320px; margin: 0 auto; padding: 22px 18px 48px; }
  h1 { font: 800 30px/1.1 'Baloo 2', sans-serif; margin: 0 0 6px; }
  h2 { font: 800 21px/1.2 'Baloo 2', sans-serif; margin: 30px 0 8px; color: #ffe27a; }
  p.lead { color: var(--soft); max-width: 900px; margin: 0 0 14px; }
  .strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
  .tag { background: var(--panel); border-radius: 14px; padding: 12px; display: grid; justify-items: center; text-align: center; gap: 2px; box-shadow: inset 0 0 0 1px var(--line); }
  .tag b { font: 800 16px 'Baloo 2', sans-serif; } .tag span { color: var(--soft); font-size: 12px; } .tag em { font-style: normal; font-weight: 800; font-size: 12px; }
  .ic svg { display: block; }
  .scroll { overflow-x: auto; border-radius: 14px; box-shadow: inset 0 0 0 1px var(--line); }
  table { border-collapse: collapse; width: 100%; background: var(--panel); }
  th, td { padding: 10px 12px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
  th { font: 800 12px 'Baloo 2', sans-serif; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; background: #1b2550; position: sticky; top: 0; }
  td { font-size: 13px; color: #e8ecff; }
  td.who { display: flex; gap: 10px; align-items: flex-start; min-width: 150px; }
  td.who b { display: block; font: 800 15px 'Baloo 2', sans-serif; } td.who span { display: block; color: var(--soft); font-size: 12px; } td.who em { font-style: normal; font-weight: 800; font-size: 12px; }
  td.who.sm { align-items: center; min-width: 110px; }
  .atk { display: block; font: 800 15px 'Baloo 2', sans-serif; color: var(--cream); } .shape, .sub { display: block; color: var(--soft); font-size: 12px; margin-top: 3px; }
  td.why { color: var(--cream); min-width: 230px; }
  .chip { display: inline-block; font: 800 11px 'Baloo 2', sans-serif; padding: 3px 9px 2px; border-radius: 999px; color: var(--ink); }
  .r-melee { background: #ffb3a8; } .r-short { background: #ffd59a; } .r-mid { background: #b8e6a8; } .r-long { background: #a8d8ff; }
  .t-single { background: #fff1bf; } .t-chain { background: #c8d4ff; } .t-aoe { background: #ffc9e0; } .t-line { background: #c8fff0; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .card { margin: 0; background: var(--panel); border-radius: 14px; padding: 10px 10px 12px; box-shadow: inset 0 0 0 1px var(--line); display: grid; justify-items: center; }
  .card figcaption { display: flex; align-items: center; gap: 8px; width: 100%; } .card figcaption b { font: 800 15px 'Baloo 2', sans-serif; } .card figcaption span:last-child { color: var(--soft); font-size: 12px; margin-left: auto; }
  .card p { margin: 6px 4px 0; color: var(--soft); font-size: 12px; text-align: center; }
  .bar { display: inline-block; width: 110px; height: 8px; border-radius: 4px; background: #12193a; vertical-align: middle; margin-right: 8px; overflow: hidden; } .bar i { display: block; height: 100%; }
  td.dps { white-space: nowrap; }
  .matrix th { text-transform: none; letter-spacing: 0; font-size: 12px; color: var(--soft); position: static; }
  .matrix td { min-width: 140px; } .m { display: inline-flex; align-items: center; gap: 4px; margin: 2px 8px 2px 0; font-weight: 800; } .gap { color: #6b77ad; font-style: italic; }
  td.old { color: var(--muted); }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--soft); font-size: 12px; margin: 6px 0 10px; }
  .note { color: var(--muted); font-size: 12px; margin-top: 8px; }
</style>`;

const bodyMain = `<main>
  <h1>Element basic attacks: base form (tiles 16 → 128)</h1>
  <p class="lead">Each element animal has one basic attack whose shape follows from what the animal does: the dragon breathes, the bird beats its wings, the turtle hides in a thorny shell, the orca hunts by echolocation, the snake spits venom, the unicorn’s horn draws lightning, the lion picks off the weak, and the ox stomps. Every element has a distinct role, and between them they cover all four ranges and all four targeting types. Fusions build on these later.</p>
  <div class="strip">${strip}</div>

  <h2>The table</h2>
  <div class="legend"><span>${chip('Melee', 'r-melee')} ≤1 cell</span><span>${chip('Short', 'r-short')} ≤2 cells</span><span>${chip('Mid', 'r-mid')} 3–3.5 cells</span><span>${chip('Long', 'r-long')} whole lane</span><span>${chip('Single', 't-single')} ${chip('Chain', 't-chain')} ${chip('Area', 't-aoe')} ${chip('Line', 't-line')}</span></div>
  <div class="scroll"><table>
    <tr><th>Element</th><th>Attack</th><th>Range</th><th>Targets</th><th>Effect</th><th>Why it fits the animal</th><th>Weak at</th><th>Grows 16 → 128</th></tr>
    ${rows}
  </table></div>

  <h2>Where each attack lands</h2>
  <p class="lead">The tile sits on the top row of the board, in lane 2. Pink dots are foes walking down the lanes; the shaded shape is what the attack hits.</p>
  <div class="cards">${cards}</div>

  <h2>Coverage: range × targeting</h2>
  <div class="scroll">${matrix}</div>
  <p class="note">The empty cells are deliberate room for the fusions (for example a long-range chain, or a melee single-target executioner).</p>

  <h2>Numbers, as tuned in the game</h2>
  <div class="scroll"><table>
    <tr><th>Element</th><th>Rate</th><th>Damage / hit</th><th>Max targets</th><th>Effect values</th><th>DPS vs 1 foe</th><th>DPS vs a crowd of 5</th></tr>
    ${numRows}
  </table></div>
  <p class="note">D = the tile’s base hit damage at its tier. The DPS figures are rough indices (single foe, then 5 foes standing in range) used to check that no element dominates. Poison and Fire reach their numbers only after their stacks ramp up. These are the values the game uses: the first pass ×0.45 after the autoplay balance probe (at that scale runs reach the same wave as with the old attacks: median 19 over 96 seeds), with Fire’s burn cap kept at 3 and Ice hitting harder so Ice leads on bosses and Fire on crowds. A foe that was just knocked back braces for 1.5 s and slides 40% as far; a foe that was just stunned or rooted is held only 40% as long.</p>

  <h2>Old → new</h2>
  <div class="scroll"><table><tr><th>Element</th><th>Before</th><th>Now</th></tr>${oldNew}</table></div>
</main>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${headParts}
</head>
<body>
${bodyMain}
</body>
</html>
`;
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
const artifactDir = join(root, 'reports', 'artifacts');
mkdirSync(artifactDir, { recursive: true });
writeFileSync(join(artifactDir, 'element-attacks.html'), `${headParts}\n${bodyMain}\n`);

// --- the same report as Markdown, with the icons as SVG files next to it ----------------------------
const iconDir = join(root, 'reports', 'icons');
mkdirSync(iconDir, { recursive: true });
for (const a of BASIC_ATTACKS) writeFileSync(join(iconDir, `${a.el}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${iconSvg(a.el, 96).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')}\n`);
const md = (s) => String(s).replace(/\|/g, '\\|');
const img = (el, size = 28) => `<img src="icons/${el}.svg" width="${size}" height="${size}" alt="${el}">`;
const lines = [
  '# Element basic attacks: base form (tiles 16 → 128)',
  '',
  'Each element animal has one basic attack whose shape follows from what the animal does: the dragon breathes, the bird beats its wings, the turtle hides in a thorny shell, the orca hunts by echolocation, the snake spits venom, the unicorn’s horn draws lightning, the lion picks off the weak, and the ox stomps. Every element has a distinct role, and between them they cover all four ranges and all four targeting types. Fusions build on these later.',
  '',
  'A rendered version with range diagrams is in [Element basic attacks.html](Element%20basic%20attacks.html).',
  '',
  '## The table',
  '',
  '| | Element | Attack | Range | Targets | Effect | Why it fits the animal | Weak at | Grows 16 → 128 |',
  '|---|---|---|---|---|---|---|---|---|',
  ...BASIC_ATTACKS.map(
    (a) =>
      `| ${img(a.el)} | **${cap(a.el)}**<br>${md(a.animal)}<br>*${md(a.role)}* | **${md(a.attack)}**<br>${md(a.shape)} | ${cap(a.range)}<br>${md(a.reach)} | ${a.targeting === 'aoe' ? 'Area' : cap(a.targeting)}<br>${md(a.nums.targets)} | ${md(a.effect)} | ${md(a.diegetic)} | ${md(a.weak)} | ${md(a.grows)} |`,
  ),
  '',
  '## Coverage: range × targeting',
  '',
  `| | ${types.map((t) => md(TARGETING[t])).join(' | ')} |`,
  `|---|${types.map(() => '---').join('|')}|`,
  ...bands.map(
    (b) =>
      `| ${md(RANGE_BANDS[b])} | ${types
        .map((t) => {
          const here = BASIC_ATTACKS.filter((a) => a.range === b && a.targeting === t);
          return here.length ? here.map((a) => `${img(a.el, 18)} ${cap(a.el)}`).join(', ') : '*open*';
        })
        .join(' | ')} |`,
  ),
  '',
  'The empty cells are deliberate room for the fusions (for example a long-range chain, or a melee single-target executioner).',
  '',
  '## Numbers, as tuned in the game',
  '',
  '| Element | Rate | Damage / hit | Max targets | Effect values | DPS vs 1 foe | DPS vs a crowd of 5 |',
  '|---|---|---|---|---|---|---|',
  ...BASIC_ATTACKS.map((a) => `| ${img(a.el, 18)} ${cap(a.el)} | ${a.nums.rate.toFixed(2)}/s | ${a.nums.dmg.toFixed(2)} D | ${md(a.nums.targets)} | ${md(a.nums.extra)} | ${a.dps.single.toFixed(2)} | ${a.dps.crowd.toFixed(2)} |`),
  '',
  'D = the tile’s base hit damage at its tier. The DPS figures are rough indices (single foe, then 5 foes standing in range) used to check that no element dominates. Poison and Fire reach their numbers only after their stacks ramp up. These are the values the game uses: the first pass ×0.45 after the autoplay balance probe (at that scale runs reach the same wave as with the old attacks: median 19 over 96 seeds), with Fire’s burn cap kept at 3 and Ice hitting harder so Ice leads on bosses and Fire on crowds. A foe that was just knocked back braces for 1.5 s and slides 40% as far; a foe that was just stunned or rooted is held only 40% as long.',
  '',
  '## Old → new',
  '',
  '| Element | Before | Now |',
  '|---|---|---|',
  ...BASIC_ATTACKS.map((a) => `| ${img(a.el, 18)} ${cap(a.el)} | ${md(a.was)} | **${md(a.attack)}**: ${md(a.shape)} |`),
  '',
];
const mdOut = join(root, 'reports', 'Element basic attacks.md');
writeFileSync(mdOut, lines.join('\n'));
console.log(`wrote ${mdOut} and reports/icons/*.svg`);
