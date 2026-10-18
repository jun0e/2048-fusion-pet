// Stat icons (docs/v2/SPEC-v2.1.md section 6): one small inline SVG per key, in the HUD's clay style
// (src/ui/hud.css): a thick round ink outline, flat fills, one soft highlight on the bigger shapes, drawn
// on a 24-unit grid so they read at 14–20 px. They stand in for the stat words wherever a stat is shown
// (the die card's buff line, the keep card's gains, the tile card, the buff banner, the level card), each
// with its word as its title and aria-label (src/i18n: icon.<key>). Pure: markup strings, so a test
// renders them in Node.
//   the element stats (src/sim/skills/data.js ELEMENT_STATS): dmg slow rate poison hp range crit regen
//   the attack strengths (SPEC-v2.1 section 3): far lanes area chain
//   the run: level xp coin summon charge grow resist dps
//   the level road's rewards (src/sim/levels.js LEVEL_ROAD): odds element grow charge top
//   and two more the screens use: aim (a block's targets), steep (the siege's ramp)
import { tr } from '../i18n/index.js';

const INK = '#2b1d2e';
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const n = (v) => String(Math.round(v * 100) / 100);

// --- the pieces every icon is made of --------------------------------------------------------------
// The root carries the ink outline (stroke, width 2, round joins and caps): a piece that names no stroke
// of its own gets it.
/** A flat shape with the ink outline. */
const shape = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
/** A circle with the ink outline. */
const dot = (cx, cy, r, fill) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"/>`;
/** An ellipse with the ink outline. */
const oval = (cx, cy, rx, ry, fill) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"/>`;
/** A soft highlight: a pale shape with no outline (the clay's lit side). */
const shine = (d, o = 0.55) => `<path d="${d}" fill="#fff" fill-opacity="${o}" stroke="none"/>`;
/** A small flat spot with no outline (a pip, a speck). */
const spot = (cx, cy, r, fill = INK) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" stroke="none"/>`;
/** An ink line. */
const ink = (d, w = 2) => `<path d="${d}" fill="none" stroke-width="${w}"/>`;
/** A coloured line inside an ink outline, as thick as the shapes' (an arc, a chevron, a bolt). */
const band = (d, color, w = 2.4) => `${ink(d, w + 2.2)}<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;

/** A point at `deg` degrees (clockwise from 3 o'clock, as the screen's y runs down) on a circle. */
const at = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
/** A star of `points` points (outer radius R, inner r), its first point straight up. */
function star(cx, cy, points, R, r) {
  const pts = [];
  for (let k = 0; k < points * 2; k++) pts.push(at(cx, cy, k % 2 ? r : R, -90 + (k * 180) / points));
  return `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')} Z`;
}
/** An arc from `a0` to `a1` degrees, clockwise. */
function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = at(cx, cy, r, a0);
  const [x1, y1] = at(cx, cy, r, a1);
  return `M${n(x0)} ${n(y0)} A${n(r)} ${n(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${n(x1)} ${n(y1)}`;
}

// the regen ring's arrowhead: a triangle at the arc's end, pointing along it
const RING = { cx: 12, cy: 12, r: 9.1, from: -48, to: 222 };
const ringHead = (() => {
  const [x, y] = at(RING.cx, RING.cy, RING.r, RING.to);
  const t = ((RING.to + 90) * Math.PI) / 180; // the way the arc runs at its end
  const [tx, ty] = [Math.cos(t), Math.sin(t)];
  const [nx, ny] = [-ty, tx];
  const p = (a, b) => `${n(x + tx * a + nx * b)} ${n(y + ty * a + ny * b)}`;
  return `M${p(3.4, 0)} L${p(-1.4, 3)} L${p(-1.4, -3)} Z`;
})();

/** Each icon's drawing, by key (24 × 24). */
const ART = {
  // --- the element stats ---------------------------------------------------------------------------
  // damage (fire): a sword, its guard and pommel in fire's colour
  dmg: [
    shape('M7.75 13.14 L16.23 4.66 L20 4 L19.35 7.77 L10.86 16.25 Z', '#eef1f7'),
    `<path d="M9.7 13.9 L17.7 5.9" stroke="#fff" stroke-width="1.3" fill="none"/>`,
    band('M5.1 18.9 L7.9 16.1', '#8a5a3c', 2.2),
    band('M5.6 12.05 L11.95 18.4', '#f2662d', 2.4),
    dot(4.4, 19.6, 1.8, '#f2662d'),
  ],
  // slow (ice): a snail with an ice-blue shell
  slow: [
    shape('M2.8 19.6 C2.8 17.9 4.2 17 6 17 H15.4 L17.5 12.4 C18.1 11.1 20.6 11.2 20.9 12.7 C21.3 14.5 21.2 16.9 20.6 18.2 C20.1 19.2 19.2 19.6 18 19.6 Z', '#f7dcc0'),
    ink('M18.4 12.2 L17.6 8.6 M20.3 12.3 L21.1 8.9', 1.6),
    spot(17.5, 8.1, 1.25),
    spot(21.2, 8.4, 1.25),
    dot(9.8, 11.6, 6.4, '#9be7f5'),
    ink('M10.5 12.3 a1.25 1.25 0 1 1 0.2 -2.3 a2.8 2.8 0 1 1 -3.3 2.4', 1.6),
    spot(6.9, 8.3, 1.2, '#fff'),
  ],
  // attack speed (lightning): fast forward
  rate: [
    shape('M3.2 6.2 C3.2 5.2 4.3 4.7 5.1 5.3 L12 10.6 C12.8 11.2 12.8 12.8 12 13.4 L5.1 18.7 C4.3 19.3 3.2 18.8 3.2 17.8 Z', '#5c9cff'),
    shape('M11.2 6.2 C11.2 5.2 12.3 4.7 13.1 5.3 L20 10.6 C20.8 11.2 20.8 12.8 20 13.4 L13.1 18.7 C12.3 19.3 11.2 18.8 11.2 17.8 Z', '#8fbcff'),
    spot(13.6, 8.6, 1, '#fff'),
  ],
  // poison stacks (poison): a venom drop with a bubble
  poison: [
    shape('M11.6 3 C13.2 5.6 18.4 10.4 18.4 14.6 A6.8 6.8 0 0 1 4.8 14.6 C4.8 10.4 10 5.6 11.6 3 Z', '#b47cf5'),
    spot(8.8, 15.2, 1.6, '#fff'),
    dot(18.4, 4.8, 1.8, '#d9bdfc'),
  ],
  // health (earth): a heart
  hp: [
    shape('M12 20.6 C5.5 16.2 3 12.7 3 9.3 C3 6.4 5.2 4.4 7.7 4.4 C9.6 4.4 11.1 5.5 12 7 C12.9 5.5 14.4 4.4 16.3 4.4 C18.8 4.4 21 6.4 21 9.3 C21 12.7 18.5 16.2 12 20.6 Z', '#ff6b81'),
    spot(7.4, 8.6, 1.6, '#fff'),
  ],
  // range (wind): reach rings from the block
  range: [band(arc(4.6, 19.4, 15.4, -90, 0), '#7fd3c4', 2.2), band(arc(4.6, 19.4, 9.8, -90, 0), '#7fd3c4', 2.2), dot(4.6, 19.4, 2.6, '#56b8a8')],
  // crit chance (metal): a gold starburst
  crit: [shape(star(12, 12, 8, 9.8, 5), '#f7be1e'), `<path d="${star(12, 12, 8, 5.2, 2.7)}" fill="#ffe58a" stroke="none"/>`],
  // regen (nature): a green plus in a turning ring
  regen: [band(arc(RING.cx, RING.cy, RING.r, RING.from, RING.to), '#a8e48c', 2), shape(ringHead, '#a8e48c'), shape('M10.2 6.9 H13.8 V10.2 H17.1 V13.8 H13.8 V17.1 H10.2 V13.8 H6.9 V10.2 H10.2 Z', '#7cd15a')],

  // --- the attack strengths ------------------------------------------------------------------------
  // far: it shoots deep up the field
  far: [
    shape('M7.4 16.6 H16.6 Q18.1 16.6 18.1 18.1 V19.9 Q18.1 21.4 16.6 21.4 H7.4 Q5.9 21.4 5.9 19.9 V18.1 Q5.9 16.6 7.4 16.6 Z', '#f8e3a0'),
    shape('M12 2.6 L17.3 8.3 H13.9 V14.6 H10.1 V8.3 H6.7 Z', '#7fc8ff'),
  ],
  // lanes: it hits the lanes either side of its own
  lanes: [ink('M8 3 V7.2 M16 3 V7.2 M8 16.8 V21 M16 16.8 V21', 1.8), shape('M2.4 12 L7.3 7.4 V10.1 H16.7 V7.4 L21.6 12 L16.7 16.6 V13.9 H7.3 V16.6 Z', '#9fdc8f')],
  // area: one hit lands on a crowd
  area: [dot(12, 12, 9.2, '#ffd2ad'), `<circle cx="12" cy="12" r="5.6" fill="#ffb27a" stroke="none"/>`, spot(8.2, 13.6, 1.8), spot(15.8, 13.6, 1.8), spot(12, 7.6, 1.8)],
  // chain: a bolt jumps from foe to foe
  chain: [band('M5.6 15.6 L9.8 12.8 L7.6 10.8 L10.6 7.9', '#ffe27a', 2.2), band('M13.4 7.9 L16.4 10.8 L14.2 12.8 L18.4 15.6', '#ffe27a', 2.2), dot(4.4, 17.8, 2.4, '#fff1c2'), dot(12, 5.8, 2.4, '#fff1c2'), dot(19.6, 17.8, 2.4, '#fff1c2')],

  // --- the run -------------------------------------------------------------------------------------
  // level: rank chevrons
  level: [band('M6 13.6 L12 8 L18 13.6', '#ffcf4a', 3), band('M6 19.6 L12 14 L18 19.6', '#ffcf4a', 3), spot(12, 4.2, 1.9, '#ffcf4a')],
  // XP: a gem
  xp: [shape('M7.6 4 H16.4 L20.6 9.4 L12 20.6 L3.4 9.4 Z', '#c39bff'), ink('M3.8 9.4 H20.2 M9.6 9.4 L12 19.4 L14.4 9.4', 1.3), shine('M7.9 4.8 H10.9 L9.6 8.6 H4.9 Z')],
  // coins: a gold coin
  coin: [dot(12, 12, 9, '#ffcf4a'), `<circle cx="12" cy="12" r="5.4" fill="#f7c234" stroke="#c98a0f" stroke-width="1.6"/>`, spot(8.2, 8, 1.5, '#fff')],
  // summon: a pet's paw
  summon: [
    shape('M12 11.4 C15.4 11.4 18.2 14.3 18.2 16.9 C18.2 19.1 16.6 20.5 14.6 20.5 C13.6 20.5 12.9 20 12 20 C11.1 20 10.4 20.5 9.4 20.5 C7.4 20.5 5.8 19.1 5.8 16.9 C5.8 14.3 8.6 11.4 12 11.4 Z', '#ffb8a0'),
    oval(4.8, 10.4, 2, 2.4, '#ffb8a0'),
    oval(8.9, 5.9, 2.1, 2.6, '#ffb8a0'),
    oval(15.1, 5.9, 2.1, 2.6, '#ffb8a0'),
    oval(19.2, 10.4, 2, 2.4, '#ffb8a0'),
  ],
  // summon charge: a stopwatch with a bolt
  charge: [
    shape('M10.4 2.4 H13.6 Q14.4 2.4 14.4 3.2 V5.4 H9.6 V3.2 Q9.6 2.4 10.4 2.4 Z', '#ffcf4a'),
    dot(12, 13.6, 8, '#fffaf2'),
    `<path d="M13 8.2 L9.4 14.4 H12 L11 19 L14.8 12.6 H12.2 Z" fill="#ffcf4a" stroke-width="1.4"/>`,
  ],
  // the board grows: a grid and an arrow out of its corner
  grow: [
    shape('M3 10 Q3 8.5 4.5 8.5 H14 Q15.5 8.5 15.5 10 V19.5 Q15.5 21 14 21 H4.5 Q3 21 3 19.5 Z', '#e8d9c2'),
    ink('M7.17 8.5 V21 M11.33 8.5 V21 M3 12.67 H15.5 M3 16.83 H15.5', 1.2),
    band('M12.6 11.4 L18.6 5.4', '#7fb97c', 2.4),
    shape('M21.2 2.8 V9.4 L14.6 2.8 Z', '#7fb97c'),
  ],
  // a foe's resistance: a shield
  resist: [
    shape('M12 2.6 L19.8 5.5 V11 C19.8 15.9 16.6 19.4 12 21.4 C7.4 19.4 4.2 15.9 4.2 11 V5.5 Z', '#b9c6dd'),
    shine('M12 4.7 V19.1 C8.7 17.4 6.3 14.6 6.3 11 V6.9 Z', 0.5),
  ],
  // damage per second: a gauge
  dps: [
    shape('M4.21 18.5 A9 9 0 1 1 19.79 18.5 Z', '#fffaf2'),
    ink('M6.98 11.1 L5.42 10.2 M12 8.2 V6.4 M17.02 11.1 L18.58 10.2', 1.6),
    band('M12 15 L16.4 9.8', '#f2662d', 1.8),
    dot(12, 15, 1.9, INK),
  ],

  // --- the level road's rewards (and the screens' two more) -----------------------------------------
  // better new blocks: a die
  odds: [shape('M7 3.6 H17 Q20.4 3.6 20.4 7 V17 Q20.4 20.4 17 20.4 H7 Q3.6 20.4 3.6 17 V7 Q3.6 3.6 7 3.6 Z', '#f8e3a0'), spot(8.3, 8.3, 1.7), spot(12, 12, 1.7), spot(15.7, 15.7, 1.7)],
  // a new element: an egg with spots of three elements
  element: [shape('M12 2.6 C16.4 2.6 19.4 9 19.4 13.8 C19.4 18.2 16.1 21.4 12 21.4 C7.9 21.4 4.6 18.2 4.6 13.8 C4.6 9 7.6 2.6 12 2.6 Z', '#fffaf2'), spot(9.2, 14.4, 2.2, '#f2662d'), spot(14.6, 9.4, 1.8, '#3d8bff'), spot(15, 16.4, 1.5, '#7cd15a')],
  // the top level: a crown
  top: [shape('M3.6 17.4 L4.6 7.6 L9.1 11.8 L12 5.4 L14.9 11.8 L19.4 7.6 L20.4 17.4 Z', '#ffcf4a'), `<rect x="3.6" y="17.2" width="16.8" height="3.6" rx="1.4" fill="#f2b51f"/>`, spot(12, 13.6, 1.5, '#ff6b81')],
  // targets: a crosshair
  aim: [dot(12, 12, 7.4, '#fde3df'), ink('M12 2.4 V7 M12 17 V21.6 M2.4 12 H7 M17 12 H21.6', 2), spot(12, 12, 2, '#ef6060')],
  // the siege grows fiercer: a steep trend
  steep: [band('M3.6 18.6 L9.4 12.8 L12.8 16.2 L19 10', '#ef6060', 2.4), shape('M21.4 6.6 V13.4 L14.6 6.6 Z', '#ef6060')],
};

/** Every icon's key. */
export const ICON_KEYS = Object.freeze(Object.keys(ART));

/** An icon's word in the current language: its title and aria-label. */
export const iconWord = (key) => tr(`icon.${key}`);

/**
 * An icon as inline SVG markup. `size` in px (CSS may size it instead); `title` the words a screen
 * reader says and a hover shows (the icon's own word by default); `title: null` makes it decorative
 * (aria-hidden), where words next to it already say it. An unknown key draws nothing.
 */
export function icon(key, { size = 18, title, cls = '' } = {}) {
  const art = ART[key];
  if (!art) return '';
  const say = title === undefined ? iconWord(key) : title;
  const a11y = say ? `role="img" aria-label="${esc(say)}"><title>${esc(say)}</title>` : 'aria-hidden="true">';
  return `<svg class="ico ico-${key}${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" focusable="false" ${a11y}${art.join('')}</svg>`;
}
