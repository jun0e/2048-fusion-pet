#!/usr/bin/env node
// 2048 Siege mood board: every art asset of the game, new and old, on one static page.
//
//   node reports/art/moodboard/build.mjs
//
// Writes index.html and data.json next to this script. On the way it extracts the pre-overhaul
// version of every generated sprite that changed or went away since BASE (`git show BASE:<path>`
// into old/), and copies a handful of phone captures of the new game into captures/ (from
// MOODBOARD_CAPTURES, by default the session scratchpad below; an earlier copy is kept when the
// source is gone). Both folders are reproducible, so they are gitignored. Names and descriptions
// come from the game's own data in src/ (imported, never edited); pixel sizes come from the image
// headers. Needs only node and git, and writes nothing outside this folder.
import { execFileSync } from 'node:child_process';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const BASE = '8c50a1e'; // the last commit before the visual overhaul replaced sprites in public/assets/gen
const GEN = 'public/assets/gen';
const OLD_DIR = join(HERE, 'old');
const CAP_DIR = join(HERE, 'captures');
const CAP_SRC =
  process.env.MOODBOARD_CAPTURES ||
  '/private/tmp/claude-501/-Users-lap14657-merge-ball-td-siege/33d132d0-7532-475a-8e38-7a2fe13ad0ee/scratchpad';

// Phone captures of the new game: [source under CAP_SRC, file in captures/, caption, CSS viewport]
const CAPTURES = [
  ['cap-int2/390x844-fight.png', 'int2-390x844-fight.png', 'A wave in the Eternal Forest', '390×844'],
  ['cap-int2/390x844-boss.png', 'int2-390x844-boss.png', 'The Hive Queen at the gate', '390×844'],
  ['cap-int2/390x844-brk.png', 'int2-390x844-brk.png', 'The wave banner over the keep', '390×844'],
  ['fix/cap-final/412x915-pose.png', 'final-412x915-pose.png', 'A 2,048 combo', '412×915'],
  ['fix/cap-final/430x932-bossbrk.png', 'final-430x932-bossbrk.png', 'Wave cleared, boss next', '430×932'],
  ['fix/cap-final/375x667-idle.png', 'final-375x667-idle.png', 'A new die unlocks', '375×667'],
  ['fix/cap-final/360x640-range.png', 'final-360x640-range.png', 'The inspect card and its range ring', '360×640'],
];
// Phone captures from before the overhaul: the inputs of its proposal
const INPUTS = [
  ['01-gameplay-wave6.jpg', 'Wave 6'],
  ['02-legendaries-rings-popups.jpg', 'Legendaries, rings and popups'],
  ['03-gust-streaks-banner.jpg', 'Gust streaks and the wave banner'],
  ['04-fusion-roam-namecard.jpg', 'A roaming fusion and its namecard'],
  ['05-inspect-card.jpg', 'The inspect card'],
];

// --- helpers ------------------------------------------------------------------------------------
const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.warn(`warn: ${msg}`);
};
const toPosix = (p) => p.split(sep).join('/');
const repoPath = (abs) => toPosix(relative(ROOT, abs));
// A URL relative to the page. '+' stays literal: Vite does not decode %2B, and fusion ids contain '+'.
const pageUrl = (file) =>
  toPosix(relative(HERE, join(ROOT, file)))
    .split('/')
    .map((s) => encodeURIComponent(s).replace(/%2B/gi, '+'))
    .join('/');
const git = (args, encoding = 'utf8') => execFileSync('git', ['-C', ROOT, ...args], { encoding, maxBuffer: 1 << 28 });
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ls = (dir, re) => (existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).filter((f) => re.test(f)).sort() : []);
const kb = (n) => (n >= 1 << 20 ? `${(n / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** The size in a JPEG's SOFn marker, or null when `b` ends before it. */
function jpegSize(b) {
  for (let o = 2; o + 9 < b.length; ) {
    if (b[o] !== 0xff) {
      o++;
      continue;
    }
    const m = b[o + 1];
    if (m === 0xff) o++;
    else if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) o += 2;
    else if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(o + 7), h: b.readUInt16BE(o + 5) };
    else o += 2 + b.readUInt16BE(o + 2);
  }
  return null;
}
/** Pixel size from the file header (its first 64 KB): PNG IHDR, JPEG SOFn, or an SVG's width/height or viewBox. */
function imageSize(abs) {
  const fd = openSync(abs, 'r');
  const head = Buffer.alloc(1 << 16);
  const b = head.subarray(0, readSync(fd, head, 0, head.length, 0));
  closeSync(fd);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) return jpegSize(b) ?? jpegSize(readFileSync(abs));
  if (extname(abs).toLowerCase() === '.svg') {
    const tag = b.toString('utf8', 0, 8192).match(/<svg\b[^>]*>/i)?.[0] ?? '';
    const attr = (n) => parseFloat(tag.match(new RegExp(`\\s${n}\\s*=\\s*["']\\s*([\\d.]+)(?:px)?\\s*["']`, 'i'))?.[1]);
    const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    const w = attr('width') || Number(vb?.[1]);
    const h = attr('height') || Number(vb?.[2]);
    if (w && h) return { w: Math.round(w), h: Math.round(h) };
  }
  return null;
}

// --- the game's own data (read only) ------------------------------------------------------------
async function load(path) {
  try {
    return await import(pathToFileURL(join(ROOT, path)).href);
  } catch (e) {
    warn(`${path} did not load (${e.message}); its captions fall back to ids`);
    return {};
  }
}
const { FOE_ROSTER = {} } = await load('src/art/foe-roster.js');
const { ELEMENTS = {}, FUSIONS = {} } = await load('src/sim/classes.js');
const { petName } = await load('src/art/tokens.js');
const { VFX_PIECES = {} } = await load('src/art/attack-vfx.js');
const { FRAME_ASSETS = {}, CHAPTER_SKINS = {} } = await load('src/art/frame-kit.js');
// animals.js pulls in the renderer (PixiJS) through creatures.js, about 10 s in node, so its
// ANIMAL_NAMES table is read from the source text instead of imported.
const ANIMAL_NAMES = (() => {
  try {
    const block = readFileSync(join(ROOT, 'src/art/animals.js'), 'utf8').match(/export const ANIMAL_NAMES = \{([\s\S]*?)\};/)?.[1] ?? '';
    return Object.fromEntries([...block.matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
  } catch (e) {
    warn(`src/art/animals.js could not be read (${e.message})`);
    return {};
  }
})();
const { CHAPTERS = [] } = await load('src/sim/enemies.js');
const { buildAssetRows } = await load('src/art/asset-catalog.js');
let CATALOG = new Map();
try {
  CATALOG = new Map((buildAssetRows?.() ?? []).map((r) => [r.id, r]));
} catch (e) {
  warn(`the asset catalog did not build (${e.message})`);
}

const manifest = JSON.parse(readFileSync(join(ROOT, 'public/assets/manifest.json'), 'utf8'));
let oldManifest = { files: {}, meta: {} };
try {
  oldManifest = JSON.parse(git(['show', `${BASE}:public/assets/manifest.json`]));
} catch (e) {
  warn(`no manifest at ${BASE} (${e.message})`);
}
const has = (id) => Boolean(manifest.files?.[id]);

/** The latest commit that touched each file under `paths` (as of `rev`, default HEAD). */
function lastCommits(rev, paths) {
  const map = new Map();
  let cur = null;
  for (const line of git(['log', ...(rev ? [rev] : []), '--format=@%h%x09%as%x09%s', '--name-only', '--', ...paths]).split('\n')) {
    if (line.startsWith('@')) {
      const [commit, date, subject] = line.slice(1).split('\t');
      cur = { commit, date, subject };
    } else if (line && cur && !map.has(line)) map.set(line, cur);
  }
  return map;
}
const ORIGIN = lastCommits(null, [GEN, 'reports', 'tools/refs', 'public/icons']);
const ORIGIN_AT_BASE = lastCommits(BASE, [GEN]);
const HEAD = git(['rev-parse', '--short', 'HEAD']).trim();
const dirty = git(['status', '--porcelain', '--', GEN]).trim().length > 0;

// --- old sprites: every generated sprite changed or deleted since BASE ---------------------------
mkdirSync(OLD_DIR, { recursive: true });
const OLD = new Map(); // sprite id -> { file, deleted, origin }
const changed = git(['diff', '--no-renames', '--name-status', BASE, 'HEAD', '--', GEN])
  .split('\n')
  .filter(Boolean)
  .map((l) => l.split('\t'))
  .filter(([status, path]) => /^[MDT]/.test(status) && /\.(png|jpe?g|webp)$/i.test(path));
// One `git cat-file --batch` for every old blob (the same bytes as `git show BASE:<path>`): it
// answers "<oid> blob <size>\n<bytes>\n" per request, or "<request> missing\n".
const batch = changed.length
  ? execFileSync('git', ['-C', ROOT, 'cat-file', '--batch'], { input: changed.map(([, path]) => `${BASE}:${path}\n`).join(''), maxBuffer: 1 << 28 })
  : Buffer.alloc(0);
let at = 0;
for (const [status, path] of changed) {
  const eol = batch.indexOf(10, at);
  const [, type, size] = batch.toString('utf8', at, eol).split(' ');
  at = eol + 1;
  if (type !== 'blob') {
    warn(`${BASE}:${path} is not in git`);
    continue;
  }
  const name = basename(path);
  writeFileSync(join(OLD_DIR, name), batch.subarray(at, at + Number(size)));
  at += Number(size) + 1;
  OLD.set(name.replace(/\.[^.]+$/, ''), { file: repoPath(join(OLD_DIR, name)), deleted: status === 'D', origin: ORIGIN_AT_BASE.get(path) ?? null });
}
const oldFiles = new Set([...OLD.values()].map((o) => basename(o.file)));
for (const f of readdirSync(OLD_DIR)) if (!oldFiles.has(f)) unlinkSync(join(OLD_DIR, f)); // left over from an earlier BASE

// The old foe names and boss cards, from the sim as it was at BASE
const OLD_FOES = {};
try {
  const src = git(['show', `${BASE}:src/sim/enemies.js`]);
  const block = src.slice(src.indexOf('export const ENEMY_TYPES'), src.indexOf('export const CHAPTERS'));
  let key = null;
  for (const line of block.split('\n')) {
    key = line.match(/^ {2}(\w+):\s*\{/)?.[1] ?? key;
    if (!key) continue;
    const o = (OLD_FOES[key] ??= {});
    o.name ??= line.match(/\bname:\s*'([^']+)'/)?.[1];
    o.intro ??= line.match(/\bintro:\s*'([^']+)'/)?.[1];
  }
} catch (e) {
  warn(`old foe names (${e.message})`);
}

// --- captures of the new game --------------------------------------------------------------------
mkdirSync(CAP_DIR, { recursive: true });
const captures = [];
for (const [from, to, name, device] of CAPTURES) {
  const src = join(CAP_SRC, from);
  const dest = join(CAP_DIR, to);
  if (existsSync(src)) copyFileSync(src, dest);
  else if (existsSync(dest)) warn(`capture ${from} is no longer in ${CAP_SRC}; kept the copy from an earlier build`);
  else {
    warn(`capture ${from} not found in ${CAP_SRC} (set MOODBOARD_CAPTURES to the capture folder)`);
    continue;
  }
  const date = statSync(existsSync(src) ? src : dest).mtime.toISOString().slice(0, 10);
  captures.push({ file: repoPath(dest), name, device, from, date });
}
const capFiles = new Set(CAPTURES.map((c) => c[1]));
for (const f of readdirSync(CAP_DIR)) if (!capFiles.has(f)) unlinkSync(join(CAP_DIR, f));

// --- the items and the board ---------------------------------------------------------------------
const items = [];
const missing = [];
function add(cat, file, o = {}) {
  const abs = join(ROOT, file);
  if (!existsSync(abs)) {
    missing.push(file);
    warn(`missing ${file}`);
    return null;
  }
  const size = imageSize(abs);
  if (!size) warn(`no pixel size for ${file}`);
  const it = {
    i: items.length,
    id: o.id ?? basename(file),
    cat,
    status: o.status ?? 'new',
    name: o.name ?? basename(file),
    label: o.label ?? null,
    note: o.note ?? null,
    file,
    src: pageUrl(file),
    w: size?.w ?? null,
    h: size?.h ?? null,
    bytes: statSync(abs).size,
    origin: o.origin !== undefined ? o.origin : (ORIGIN.get(file) ?? null),
    model: o.model ?? null,
    desc: o.desc ?? '',
    pair: null,
  };
  items.push(it);
  return it;
}
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));
const link = (a, b) => {
  a.pair = b.i;
  b.pair = a.i;
};

const USED = new Set();
function genTile(id, cat, o = {}) {
  if (!has(id)) return null;
  USED.add(id);
  const row = CATALOG.get(id) ?? {};
  return add(cat, `public/assets/${manifest.files[id]}`, { id, name: row.name ?? id, desc: row.desc ?? '', model: manifest.meta?.[id]?.model, ...defined(o) });
}
function oldTile(id, cat, o = {}) {
  const was = OLD.get(id);
  if (!was) return null;
  return add(cat, was.file, { id, status: 'old', origin: was.origin, model: oldManifest.meta?.[id]?.model, name: CATALOG.get(id)?.name ?? id, ...defined(o) });
}
/** One generated sprite: an old → new pair when the overhaul replaced it, else one tile. */
function genEntry(id, cat, o = {}, oldO = {}) {
  const { pairTitle, pairSub, tag, ...now } = o;
  const b = genTile(id, cat, now);
  const a = b && OLD.has(id) && !OLD.get(id).deleted ? oldTile(id, cat, { name: now.name, label: now.label, ...oldO }) : null;
  if (a && b) {
    link(a, b);
    return { pair: [a, b], title: pairTitle ?? [a.name, b.name], sub: pairSub ?? '', tag, id };
  }
  return b ? { tile: b } : null;
}
const tiles = (list) => list.filter(Boolean).map((t) => ({ tile: t }));
const others = (re) => Object.keys(manifest.files).filter((id) => re.test(id) && !USED.has(id));

const SECTIONS = [];
const section = (key, chip, title, intro) => {
  const s = { key, chip, title, intro, groups: [] };
  SECTIONS.push(s);
  return s;
};
const group = (s, title, note, layout, entries, extra = {}) => {
  const list = entries.filter(Boolean);
  if (list.length) s.groups.push({ title, note, layout, entries: list, ...extra });
};

const EL = Object.keys(ELEMENTS).length ? Object.keys(ELEMENTS) : ['fire', 'ice', 'lightning', 'poison', 'earth', 'wind', 'metal', 'nature'];
const elName = (el) => ELEMENTS[el]?.name ?? cap(el);
const elColor = (el) => ELEMENTS[el]?.color ?? '#9a8f9c';
const chapterName = Object.fromEntries(
  (CHAPTERS.length ? CHAPTERS : [{ key: 'forest', name: 'Eternal Forest' }, { key: 'fareast', name: 'Fareast Kingdom' }, { key: 'peaks', name: 'Dragon Peaks' }]).map((c) => [c.key, c.name]),
);
const chapterRank = (key) => (key in chapterName ? Object.keys(chapterName).indexOf(key) : 99);

// The look: before and after captures (the first pair is the page's opener)
let hero = null;
{
  const s = section('look', 'Look', 'The look', 'Phone captures from before the visual overhaul, and the new keep, lanes and animal foes after it.');
  const before = INPUTS.map(([f, name]) =>
    add('look', `reports/art/visual-overhaul/inputs/${f}`, { status: 'old', name, desc: 'A phone capture of the game before the visual overhaul: one of the inputs to its proposal.' }),
  ).filter(Boolean);
  const after = captures
    .map((c) =>
      add('look', c.file, {
        name: c.name,
        note: `${c.device} phone`,
        origin: { commit: null, date: c.date, subject: `a capture of the new game, not in git (${c.from})` },
        desc: `The game after the overhaul on a ${c.device} CSS px viewport.`,
      }),
    )
    .filter(Boolean);
  if (before.length && after.length) {
    const [b0, a0] = [before.shift(), after.shift()];
    link(b0, a0);
    hero = { pair: [b0, a0], title: 'Before and after', sub: `A wave on a ${a0.note ?? 'phone'}` };
  }
  group(s, 'Before the overhaul', 'The captures its proposal started from', 'phones', tiles(before));
  group(s, 'After the overhaul', `The new game at ${[...new Set(after.map((t) => t.note.replace(' phone', '')))].join(', ')}`, 'phones', tiles(after));
}

// Foes: old → new pairs, by chapter
{
  const s = section('foes', 'Foes', 'Foes', 'Every foe kept its rules and became one animal with its own silhouette. Left: the first generated set. Right: the overhaul.');
  const VIEW = { profile: 'side view', front: 'front view', spread: 'wings spread' };
  const MOVE = { walk: 'walks', crawl: 'crawls', hover: 'hovers', swim: 'swims', float: 'floats' };
  const oldDesc = (key, portrait) => {
    const o = OLD_FOES[key] ?? {};
    if (portrait) return `The first set’s boss banner bust of the ${o.name ?? key}.`;
    return `The first set’s ${o.name ?? key}: a chibi fantasy figure with a dark outline, no cream rim and a red-tinted shadow.${o.intro ? ` Its boss card: “${o.intro}”` : ''}`;
  };
  for (const [ch, chName] of Object.entries(chapterName)) {
    const roster = Object.entries(FOE_ROSTER).filter(([, f]) => f.chapter === ch);
    const entries = [];
    for (const [key, f] of roster) {
      const was = OLD_FOES[key]?.name ?? key;
      const sub = [cap(f.animal), VIEW[f.view], MOVE[f.move]].filter(Boolean).join(', ');
      const tag = f.boss ? 'boss' : undefined;
      entries.push(genEntry(`enemy.${key}`, 'foes', { name: f.name, desc: `${cap(f.desc)}. Pose: ${f.pose}.`, pairTitle: [was, f.name], pairSub: sub, tag }, { name: was, desc: oldDesc(key) }));
      if (f.boss)
        entries.push(
          genEntry(
            `enemy.${key}.portrait`,
            'foes',
            { name: `${f.name} portrait`, desc: 'The boss banner bust shown when the boss approaches.', pairTitle: [was, f.name], pairSub: 'Boss banner portrait', tag },
            { name: `${was} portrait`, desc: oldDesc(key, true) },
          ),
        );
    }
    const boss = roster.find(([, f]) => f.boss)?.[1];
    group(s, chName, boss ? `Boss: ${boss.name}` : '', 'pairs', entries);
  }
  group(s, 'Other foes', 'Not in the foe roster', 'pairs', others(/^enemy\./).map((id) => genEntry(id, 'foes')));
}

// Pets and eggs: one growth line per element
{
  const s = section('pets', 'Pets', 'Pets and eggs', 'One baby per element, growing through 16, 32, 64 and 128, with the scared and blink expressions.');
  group(s, 'Eggs', 'Rolled at 2, cracked at 4, hatching at 8', 'sprites', ['egg.2', 'egg.4', 'egg.8'].map((id) => genEntry(id, 'pets', { label: `Egg ${id.split('.')[1]}` })));
  const STAGES = ['16', '32', '64', '128', 'scared', 'blink'];
  for (const el of EL) {
    const ids = [...STAGES.map((k) => `pet.${el}.${k}`), ...others(new RegExp(`^pet\\.${el}\\.`)).filter((id) => !STAGES.includes(id.split('.')[2]))];
    const label = (id) => (/^\d+$/.test(id.split('.')[2]) ? id.split('.')[2] : cap(id.split('.')[2]));
    const note = [ANIMAL_NAMES[el], ELEMENTS[el]?.attack && `Attack: ${ELEMENTS[el].attack}`].filter(Boolean);
    group(s, elName(el), note, 'line', ids.map((id) => genEntry(id, 'pets', { label: label(id) })), { color: elColor(el) });
  }
  group(s, 'Other pet art', '', 'sprites', others(/^(pet|egg)\./).map((id) => genEntry(id, 'pets')));
}

// Fusions and portraits: one set per fusion
{
  const s = section('fusions', 'Fusions', 'Fusions and portraits', 'The 28 fusions: the body that roams the field from 256, the namecard portrait, and its ascended edit.');
  const sets = Object.entries(FUSIONS).map(([k, f]) => {
    const [a, b] = f.parts;
    const set = [];
    for (const [id, label] of [
      [`fusion.${k}`, 'Body'],
      [`portrait.${k}`, 'Portrait'],
      [`portrait.${k}.ascended`, 'Ascended'],
    ]) {
      const e = genEntry(id, 'fusions', { label });
      if (e?.pair) set.push(...e.pair);
      else if (e?.tile) set.push(e.tile);
    }
    return set.length ? { set, title: petName ? petName(a, b) : k, sub: `${elName(a)} + ${elName(b)}`, skill: f.name, dots: [elColor(a), elColor(b)], id: k } : null;
  });
  group(s, '', '', 'sets', sets);
  group(s, 'Other fusion art', '', 'sprites', others(/^(fusion|portrait)\./).map((id) => genEntry(id, 'fusions')));
}

// Halos and badges
{
  const s = section('halos', 'Halos & badges', 'Halos and badges', 'The apex halo kits composited over a fusion at 4096, and the element badges on the dice and tiles.');
  group(s, 'Apex halos', 'A gold ring of motif pieces for each element', 'sprites', EL.map((el) => genEntry(`halo.${el}`, 'halos', { note: elName(el) })));
  group(s, 'Element badges', 'The element icon on the dice and tiles', 'sprites', EL.map((el) => genEntry(`badge.${el}`, 'halos')));
  group(s, 'Other', '', 'sprites', others(/^(halo|badge)\./).map((id) => genEntry(id, 'halos')));
}

// Attack sprites, per element
{
  const s = section('attacks', 'Attacks', 'Attack sprites', 'The pieces of each element’s basic attack. The pale pieces are tinted with the element or fusion colour in the game.');
  const KIND = { body: 'travelling shape', bit: 'particle', burst: 'impact', decal: 'ground mark' };
  for (const [el, pieces] of Object.entries(VFX_PIECES))
    group(
      s,
      elName(el),
      [ELEMENTS[el]?.attack].filter(Boolean),
      'line',
      Object.entries(pieces).map(([p, v]) => genEntry(`vfx.${el}.${p}`, 'attacks', { label: cap(p), note: `${KIND[v.kind] ?? v.kind}${v.tint ? ', tinted' : ''}`, desc: cap(v.desc) })),
      { color: elColor(el) },
    );
  group(s, 'Other attack sprites', '', 'sprites', others(/^vfx\./).map((id) => genEntry(id, 'attacks')));
}

// Frame pieces and backdrops
{
  const s = section('frame', 'Frame', 'Frame pieces and backdrops', 'The siege frame is drawn in code. These are the generated pieces it uses: chapter backdrops, far ridges and props.');
  const chapterOf = {};
  for (const [k, skin] of Object.entries(CHAPTER_SKINS)) for (const id of [skin.backdrop, skin.ridge, ...(skin.decor ?? [])]) if (id) chapterOf[id] = k;
  const kind = (id) => FRAME_ASSETS[id]?.kind ?? (/backdrop|background/.test(id) ? 'backdrop' : /ridge/.test(id) ? 'strip' : 'sprite');
  const order = (id) => (id === 'env.background' ? 99 : chapterOf[id] ? Object.keys(chapterName).indexOf(chapterOf[id]) : -1);
  const name = (id) => {
    if (id === 'env.background') return 'Night sky';
    const parts = id.split('.').slice(1);
    return parts.length > 1 ? `${chapterName[parts[0]] ?? cap(parts[0])} ${parts.slice(1).join(' ')}` : cap(parts[0]);
  };
  const entry = (id) =>
    genEntry(id, 'frame', {
      name: name(id),
      note: id === 'env.background' ? 'First set, now the fallback sky' : kind(id) === 'sprite' && chapterOf[id] ? `${chapterName[chapterOf[id]]} decor` : undefined,
      desc: FRAME_ASSETS[id]?.desc ? `${cap(FRAME_ASSETS[id].desc)}.` : id === 'env.background' ? 'The first set’s night-sky backdrop; now the fallback behind a chapter without its own.' : undefined,
    });
  const env = Object.keys(manifest.files).filter((id) => id.startsWith('env.'));
  const by = (k) => env.filter((id) => kind(id) === k).sort((a, b) => order(a) - order(b));
  group(s, 'Backdrops', 'A painted 9:16 sky behind the keep for each chapter, and the first set’s night sky', 'phones', by('backdrop').map(entry));
  group(s, 'Far ridges', 'Silhouette strips on the horizon', 'strips', by('strip').map(entry));
  group(s, 'Props', 'The brazier and its flame, the gate banner, and chapter decor', 'sprites', by('sprite').map(entry));
}

// Concepts and silhouettes (the overhaul's concept record and the silhouette contracts)
{
  const VO = 'reports/art/visual-overhaul';
  const CO = `${VO}/concepts`;
  const s = section(
    'concepts',
    'Concepts',
    'Concepts and silhouettes',
    'The visual overhaul’s concept record: style frames, foe candidates, sheets, the composites that set the value rules, and the silhouette contracts every foe is checked against.',
  );
  const c = (file, name, desc, o = {}) => add('concepts', file, { name, desc, ...o });
  const byAnimal = Object.fromEntries(Object.values(FOE_ROSTER).map((f) => [f.animal, f.name]));
  const STYLE = {
    forest: 'The whole composition at once: the stone keep with corner towers, the parapet with four braziers, cobbled lanes with hedges, four gate arches and the lintel.',
    fareast: 'Chapter skinning: lacquer planks, lanterns on the hedges, red gate banners, the boss HP bar in the lintel and the pagoda crab at the gate.',
    peaks: 'Basalt lanes with ember cracks, the ibex, bat and snail as distinct animals, a legendary pet with its halo and lightning as a link chain.',
  };
  const CANDIDATE = {
    'foe-fox-a': 'Contract 0.42–0.47: a trotting pose with the tail up.',
    'foe-fox-b': 'Contract 0.42–0.47: a trotting pose with the tail up.',
    'foe-fox-c': 'The pose in words and a cream chest: fills the contract at 0.92; the candidate in the composites.',
    'foe-pangolin-a': 'A compact body that fills the contract (0.65–0.71): scales, a hooked tail, a jade accent.',
    'foe-pangolin-b': 'A compact body that fills the contract (0.65–0.71): scales, a hooked tail, a jade accent.',
    'foe-macaque-a': 'Pale fur: contract 0.61–0.80, but weak on the lane.',
    'foe-macaque-b': 'Pale fur, weak on the lane, and close to the poison + metal fusion (0.73).',
    'foe-macaque-c': 'Slate fur and a cream belly: contract 0.87, and it reads on the lane.',
    'foe-hivequeen-a': 'Gold on cream, a single value: weak on the lane.',
    'foe-hivequeen-b': 'Two values, black bands and amber: contract 0.97, and it reads on every planned ground.',
    'foe-moth-a': 'A 3/4 view and pale on the lane: the moth’s contract was rewritten (the view and two values).',
    'foe-moth-b': 'A 3/4 view and pale on the lane: the moth’s contract was rewritten (the view and two values).',
    'foe-moth-c': 'After the rewrite: dusty dark teal wing fields with a mint edge band.',
    'foe-moth-d': 'After the rewrite: dusty dark teal wing fields with a mint edge band.',
  };
  const TESTS = {
    'fusion-smogpup-coil': ['Smogpup coil, body-plan test', 'The silhouette contract works for fusions (0.66–0.73 against the fire fusions), but this plan collides with the poison serpents (0.79).'],
    'pose-fire-windup': ['Fire wind-up, pose edit', 'Pose edits keep identity: horns, wings, spikes and rim.'],
    'pose-ice-tailslap': ['Ice tail-slap, pose edit', 'Pose compliance varies: the tail-slap came back as a sonar call.'],
  };
  const SHEETS = {
    'vfx-fire-sheet': ['Fire VFX sheet', 'Flame tongues, embers, smoke, a scorch decal, a ribbon segment, a sun-ray add-on and an 8-frame splash, as solid outlined shapes.'],
    'vfx-ice-sheet': ['Ice VFX sheet', 'Harpoon, shards, tether, pings, an ice block, a frost ring, a crack and an 8-frame shatter.'],
    'frame-kit-sheet': ['Frame kit sheet', 'The kit as a set: keep corner, parapet with an unlit and a lit brazier, hedge, closed and open gates, pillar and road.'],
  };
  const CHECKS = {
    'figure-ground.png': ['Figure-ground check', 'Every foe at 48 px on its chapter’s grounds, scored by the share of its body that differs from the ground by 20 L* or more: the source of the two-value rule.'],
    'truth-composite.png': ['Truth composite', 'Generated foes at their real 27–35 px on a ground built from real tile values.'],
    'truth-composite-sized.png': ['Truth composite at the proposed sizes', 'The proposed foe sizes, 37–54 px, on the calm lane.'],
  };
  const SVGS = {
    'silhouettes.svg': ['Roster silhouettes', 'The proposed roster as solid black shapes, with the 40 px on-screen copy of each.'],
    'hud-layout.svg': ['HUD layout', 'The 390×844 phone wireframe with its zones and rules.'],
    'attack-ladder.svg': ['Attack ladder strip', 'The progression strip for Fire, Ice and Wind, 16 to 4096.'],
  };
  group(
    s,
    'Style frames',
    'Composition only: their foes are model-invented and their numbers are fake',
    'phones',
    tiles(
      ls(CO, /^style-.*\.jpg$/)
        .sort((a, b) => chapterRank(a.slice(6, -4)) - chapterRank(b.slice(6, -4)))
        .map((f) => c(`${CO}/${f}`, `${chapterName[f.slice(6, -4)] ?? cap(f.slice(6, -4))} style frame`, STYLE[f.slice(6, -4)] ?? '')),
    ),
  );
  group(
    s,
    'Ladders, road tile and contact sheet',
    '',
    'masonry',
    tiles([
      ...ls(CO, /^ladder-.*\.jpg$/).map((f) =>
        c(`${CO}/${f}`, `${cap(f.slice(7, -4))} attack ladder`, 'The attack from 16 to the 4096 apex, left to right, with the fusion colour step and the apex halo. The model added a glow at the fusion panel; the game’s effects never glow.'),
      ),
      ...ls(CO, /^frame-road-tile\.jpg$/).map((f) => c(`${CO}/${f}`, 'Road tile', 'A seamless cobble texture in the stone palette. Too busy for the lane centre, so the lanes got a calm centre band.')),
      ...ls(CO, /^_index\.jpg$/).map((f) => c(`${CO}/${f}`, 'Contact sheet', 'Every concept image of the record on one sheet.')),
    ]),
  );
  group(
    s,
    'Foe candidates',
    'Keyed cut-outs; the shipped sprites are under Foes',
    'sprites',
    tiles(
      ls(CO, /^foe-.*\.keyed\.png$/).map((f) => {
        const [, animal = f, v = ''] = f.match(/^foe-(.+)-([a-z])\.keyed\.png$/) ?? [];
        return c(`${CO}/${f}`, `${byAnimal[animal] ?? cap(animal)}, candidate ${v}`, CANDIDATE[`foe-${animal}-${v}`] ?? '');
      }),
    ),
  );
  group(
    s,
    'Fusion and pose tests',
    '',
    'sprites',
    tiles(ls(CO, /^(fusion|pose)-.*\.keyed\.png$/).map((f) => c(`${CO}/${f}`, ...(TESTS[f.replace('.keyed.png', '')] ?? [f, '']))),
    ),
  );
  group(
    s,
    'Sheets and slices',
    'Generated as sheets, keyed, then sliced into single sprites',
    'masonry',
    tiles([
      ...ls(CO, /-sheet\.keyed\.png$/).map((f) => c(`${CO}/${f}`, ...(SHEETS[f.replace('.keyed.png', '')] ?? [f, '']))),
      ...ls(`${CO}/slices`, /^[^.]+$/).flatMap((d) =>
        ls(`${CO}/slices/${d}`, /^_strip\.png$/).map((f) =>
          c(`${CO}/slices/${d}/${f}`, `${SHEETS[d]?.[0] ?? d}, sliced`, `The sheet sliced into ${ls(`${CO}/slices/${d}`, /^\d+\.png$/).length} sprites (slice-sheet.py), shown as one strip.`, { id: `${d}/${f}` }),
        ),
      ),
    ]),
  );
  group(s, 'Value and size checks', 'The figure-ground check and the truth composites', 'masonry', tiles(Object.keys(CHECKS).filter((f) => existsSync(join(ROOT, CO, f))).map((f) => c(`${CO}/${f}`, ...CHECKS[f]))));
  const rosterOrder = Object.values(FOE_ROSTER).map((f) => f.animal);
  const rank = (f) => {
    const i = rosterOrder.indexOf(f.slice(4, -4));
    return i < 0 ? 99 : i;
  };
  group(
    s,
    'Silhouette contracts',
    'The outline each shipped foe must fill, and the rendering reference every foe prompt passes',
    'sprites',
    tiles([
      ...ls('tools/refs/foes', /^sil-.*\.png$/)
        .sort((a, b) => rank(a) - rank(b))
        .map((f) =>
          c(
            `tools/refs/foes/${f}`,
            `${byAnimal[f.slice(4, -4)] ?? cap(f.slice(4, -4))} contract`,
            'The silhouette contract: tools/silhouette-check.py gates the generated foe against this outline (contract, twin and figure-ground).',
          ),
        ),
      ...ls('tools/refs/foes', /^render-ref\.png$/).map((f) =>
        c(`tools/refs/foes/${f}`, 'Foe rendering reference', 'A frozen copy of the first foe set’s ninja raw: every foe prompt passes it for the outline weight, cel shading and eye style, not for its species or pose.'),
      ),
    ]),
  );
  group(
    s,
    'Concept references',
    'The roster sketch as silhouettes, the lane swatches and the phone wireframe the concepts were made from',
    'sprites',
    tiles(
      ls(`${CO}/refs`, /\.png$/).map((f) => {
        const stem = f.slice(0, -4);
        const file = `${CO}/refs/${f}`;
        if (stem === 'sil-smogpup') return c(file, 'Smogpup body plan', 'One fusion body-plan silhouette, a serpent coil with a dragon head, for the fusion test.');
        if (stem.startsWith('sil-')) return c(file, `${cap(stem.slice(4))} silhouette`, 'The roster sketch (silhouettes.svg) as a black-on-white silhouette: the contract the concepts were generated against.');
        if (stem.startsWith('ground-lane-')) return c(file, `Lane swatch, ${stem.slice(12)}`, 'A lane swatch that the figure-ground check scores foes against.');
        if (stem === 'wireframe-phone') return c(file, 'Phone wireframe', 'The phone from hud-layout.svg: the layout reference for the style frames.');
        return c(file, stem, '');
      }),
    ),
  );
  group(s, 'Sketches', 'Hand-made SVGs from the proposal', 'masonry', tiles(ls(VO, /\.svg$/).map((f) => c(`${VO}/${f}`, ...(SVGS[f] ?? [f, ''])))));
}

// Key visual, guides and icons
{
  const s = section('kv', 'Key visual', 'Key visual, guides and icons', 'The first key visual and the creature sheets, drawn in code before any generated art; the style guides; and the icons.');
  const KV = {
    'key-visual.png': ['Key visual demo', 'old', 'kv', 'The recommended direction running in the real game before any generated art: the sticker map, the pixel map and the namecard skill, with code-drawn stand-ins in the first frame.'],
    'map-sticker.jpg': ['Sticker map', 'old', 'kv', 'The board, lanes and creatures in the sticker style, with code-drawn stand-ins.'],
    'map-pixel.jpg': ['Pixel map', 'old', 'kv', 'The same designs on a pixel grid, palette-locked, with a 1 px outline.'],
    'namecard-cutin.jpg': ['Namecard cut-in', 'old', 'kv', 'The soft-vinyl portrait cut-in when a ready card is cast.'],
    'art-sheet.png': ['Creature art sheet', 'old', 'sheets', 'Every code-drawn stand-in: babies and eggs, fusions, the pixel versions and the vinyl portraits.'],
    'sheet-babies.jpg': ['Babies and eggs sheet', 'old', 'sheets', 'The code-drawn babies, 16 to 128, and the eggs.'],
    'sheet-fusions.jpg': ['Fusions sheet', 'old', 'sheets', 'The code-drawn fusions in the sticker style.'],
    'sheet-portraits.jpg': ['Pixel fusions and portraits sheet', 'old', 'sheets', 'The pixel fusions, the soft-vinyl namecard portraits and two vinyl full bodies.'],
    'fusion-silhouettes.png': ['Fusion body-plan candidates', 'old', 'sheets', 'Thirteen divergent fusion body plans as silhouettes, with the closest overlap of each.'],
    'proportion-guide.png': ['Proportion guide', 'old', 'guides', 'The growth arc, baby and fusion construction, the tile layout, the roaming scale, the namecard portrait and the line and colour rules.'],
    'element-palettes.png': ['Element palettes', 'new', 'guides', 'The hard limit: a creature uses only its element’s colours plus the four universal ones. Still the rule for the pets.'],
  };
  const kvTile = (f) => {
    const [name, status, , desc] = KV[f] ?? [f, 'new', 'other', ''];
    return add('kv', `reports/kv/${f}`, { name, status, desc });
  };
  const kvFiles = ls('reports/kv', /\.(png|jpe?g)$/);
  for (const [g, title, note] of [
    ['kv', 'First key visual', 'Code-drawn stand-ins in the first frame'],
    ['sheets', 'Creature sheets', 'The code-drawn stand-ins: sticker, pixel and vinyl'],
    ['guides', 'Style guides', ''],
    ['other', 'Other key visual images', ''],
  ])
    group(s, title, note, 'masonry', tiles(kvFiles.filter((f) => (KV[f]?.[2] ?? 'other') === g).map(kvTile)));
  group(
    s,
    'Element icons',
    'Flat SVG icons, one per element',
    'sprites',
    tiles(ls('reports/icons', /\.svg$/).map((f) => add('kv', `reports/icons/${f}`, { name: `${elName(f.slice(0, -4))} icon`, desc: 'A flat element icon, written by tools/attack-report.mjs.' }))),
  );
  const APP = { 'icon-512.png': 'App icon, 512', 'icon-192.png': 'App icon, 192', 'icon-maskable-512.png': 'Maskable app icon', 'apple-touch-icon.png': 'Apple touch icon' };
  group(s, 'App icons', 'The home-screen and touch icons', 'sprites', tiles(ls('public/icons', /\.png$/).map((f) => add('kv', `public/icons/${f}`, { name: APP[f] ?? f, desc: 'A home-screen icon of the web app.' }))));
}

// Anything the sections above did not place: generated sprites, and sprites deleted since BASE
{
  const sec = (key) => SECTIONS.find((s) => s.key === key);
  const SECTION_OF = { egg: 'pets', pet: 'pets', fusion: 'fusions', portrait: 'fusions', halo: 'halos', badge: 'halos', enemy: 'foes', vfx: 'attacks', env: 'frame' };
  const left = Object.keys(manifest.files).filter((id) => !USED.has(id));
  if (left.length) {
    warn(`${left.length} generated sprites had no section: ${left.join(', ')}`);
    group(sec('kv'), 'Other generated sprites', '', 'sprites', left.map((id) => genEntry(id, 'kv')));
  }
  const retired = {};
  for (const [id, o] of OLD) if (o.deleted) (retired[SECTION_OF[id.split('.')[0]] ?? 'kv'] ??= []).push(id);
  for (const [key, ids] of Object.entries(retired)) group(sec(key), 'Retired sprites', `Deleted since ${BASE}`, 'sprites', tiles(ids.map((id) => oldTile(id, key))));
}

// --- every other image on disk: on the board under "More", or listed with the reason it is left out --
const IMG = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
function walk(dir, out = []) {
  if (!existsSync(join(ROOT, dir))) return out;
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (!['node_modules', 'dist', 'dist-single', '.git'].includes(e.name) && p !== repoPath(HERE)) walk(p, out);
    } else if (IMG.test(e.name)) out.push(p);
  }
  return out;
}
const REASONS = [
  [/^reports\/ux\/shots\//, 'UX flow screenshots (tutorial, menus and dialogs), not art'],
  [/^reports\/art\/visual-overhaul\/concepts\/slices\//, 'single slices of the concept sheets; each sheet’s strip is shown'],
  [/^reports\/art\/visual-overhaul\/concepts\/[^/]+\.png$/, 'raw 1024 px concept generations (gitignored); their keyed cut-outs are shown'],
  [/^public\/assets\/_mock\//, 'placeholder sprites from the pipeline’s mock mode (gitignored)'],
  [/^tools\/\.cache\//, 'the pipeline cache: candidates and raw generations (gitignored)'],
];
const shownFiles = new Set(items.map((it) => it.file));
const found = [...walk('reports'), ...walk('public'), ...walk('tools/refs'), ...walk('tools/.cache')].filter((f) => !shownFiles.has(f));
// Images no section above places (art that is new since this script was written, or still being
// made): one group per folder, so a rebuild always shows everything.
const unplaced = found.filter((p) => !REASONS.some(([re]) => re.test(p)));
if (unplaced.length) {
  const s = section('more', 'More', 'More from reports', 'Images in reports/ and public/ that the sections above do not place yet, one group per folder.');
  const FOLDER = {
    'reports/art/fusion-matrix': 'The fusion roster sketch',
    'reports/art/fusion-matrix/contracts': 'Fusion silhouette contracts, one per fusion',
    'reports/art/tiles/sections': 'Sections of the tile sample sheet (samples.html)',
  };
  const niceName = (p) => {
    const stem = basename(p).replace(/\.[^.]+$/, '');
    const [, a, b] = stem.match(/^sil-(\w+)\+(\w+)$/) ?? [];
    if (a && FUSIONS[`${a}+${b}`] && petName) return `${petName(a, b)} contract`;
    return cap(stem.replace(/[-_.]+/g, ' '));
  };
  const byDir = new Map();
  for (const p of unplaced.sort()) byDir.set(dirname(p), [...(byDir.get(dirname(p)) ?? []), p]);
  for (const [dir, files] of [...byDir].sort(([x], [y]) => x.localeCompare(y))) {
    const its = files
      .map((p) =>
        add('more', p, {
          name: niceName(p),
          origin: ORIGIN.get(p) ?? { commit: null, date: statSync(join(ROOT, p)).mtime.toISOString().slice(0, 10), subject: 'not in git yet' },
        }),
      )
      .filter(Boolean);
    const big = its.filter((it) => (it.w ?? 0) > 640).length * 2 > its.length;
    group(s, dir, FOLDER[dir] ?? `${its.length} ${its.length === 1 ? 'image' : 'images'}`, big ? 'masonry' : 'sprites', tiles(its));
  }
}
const skipped = [];
for (const p of found) {
  const reason = REASONS.find(([re]) => re.test(p))?.[1];
  if (!reason) continue;
  let row = skipped.find((r) => r.reason === reason);
  if (!row) skipped.push((row = { reason, count: 0, dirs: new Set() }));
  row.count++;
  row.dirs.add(dirname(p));
}

// --- counts ------------------------------------------------------------------------------------
const counts = {};
for (const s of SECTIONS) {
  const its = items.filter((it) => it.cat === s.key);
  counts[s.key] = {
    images: its.length,
    new: its.filter((it) => it.status === 'new').length,
    old: its.filter((it) => it.status === 'old').length,
    pairs: its.filter((it) => it.status === 'new' && it.pair != null).length,
  };
}
const total = items.length;
const nNew = items.filter((it) => it.status === 'new').length;
const nOld = total - nNew;
const nPairs = items.filter((it) => it.status === 'new' && it.pair != null).length;
const today = new Date().toISOString().slice(0, 10);

// --- the page ----------------------------------------------------------------------------------
const CSS = `
:root{--ink:#2b1d2e;--ink-2:#36283a;--keep:#3e3c58;--cream:#fffaf2;--cream-2:#e9dccb;--muted:#bba9b8;--gold:#ffcf4a;--sage:#bfe3bd;--peach:#f7c4a8;--line:rgba(255,250,242,.13);
--checker:repeating-conic-gradient(#efe7da 0 25%,#dcd1c0 0 50%) 0 0/18px 18px;
--display:'Baloo 2',ui-rounded,'SF Pro Rounded','Arial Rounded MT Bold','Nunito',system-ui,sans-serif;
--body:'Nunito',ui-rounded,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
--mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
html{scroll-padding-top:calc(var(--top-h,128px) + 8px);-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ink);color:var(--cream);font:500 16px/1.5 var(--body);-webkit-font-smoothing:antialiased}
body,body[data-bd=checker]{--bd:var(--checker)}
body[data-bd=cream]{--bd:var(--cream)}
body[data-bd=keep]{--bd:var(--keep)}
a{color:inherit}
code{font-family:var(--mono)}
button{font:inherit;color:inherit}
h1,h2,h3,h4,.lede{font-family:var(--display);font-weight:800;font-synthesis:none}
:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.wrap{width:100%;max-width:1560px;margin:0 auto;padding-left:32px;padding-right:32px}

.top{position:sticky;top:0;z-index:10;background:rgba(43,29,46,.95);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.tb{display:flex;align-items:center;gap:14px;padding-top:12px;padding-bottom:6px}
h1{margin:0;font-size:1.5rem;line-height:1.1;white-space:nowrap}
.stat{margin:0;color:var(--muted);font-size:.85rem;font-weight:700;white-space:nowrap}
.seg{margin-left:auto;display:inline-flex;flex:none;gap:2px;padding:3px;border-radius:999px;background:var(--ink-2);border:1px solid var(--line)}
.seg button{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:6px 11px;background:none;color:var(--cream-2);font-weight:700;font-size:.8rem;line-height:1;cursor:pointer}
.seg button[aria-pressed=true]{background:var(--cream);color:var(--ink)}
.sw{width:14px;height:14px;border-radius:4px;flex:none;box-shadow:inset 0 0 0 1px rgba(43,29,46,.35)}
.sw.checker{background:repeating-conic-gradient(#efe7da 0 25%,#dcd1c0 0 50%) 0 0/7px 7px}
.sw.cream{background:var(--cream)}
.sw.keep{background:var(--keep);box-shadow:inset 0 0 0 1px rgba(255,250,242,.45)}
.chips{display:flex;flex-wrap:wrap;gap:6px;padding-top:6px;padding-bottom:12px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;border:1.5px solid rgba(255,250,242,.26);background:none;font-weight:800;font-size:.82rem;line-height:1;cursor:pointer;white-space:nowrap}
.chip b{font-weight:800;font-size:.75rem;color:var(--muted)}
.chip:hover{border-color:var(--cream)}
.chip[aria-pressed=true]{background:var(--cream);border-color:var(--cream);color:var(--ink)}
.chip[aria-pressed=true] b{color:#6b5868}
.chip.zero{opacity:.45}
.chips .sep{width:1.5px;align-self:stretch;background:var(--line);margin:2px 4px}

.opener{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,700px);gap:28px 48px;align-items:start;padding-top:32px;padding-bottom:8px}
.lede{margin:0;max-width:24ch;font-size:clamp(1.5rem,1.1rem + 1.5vw,2.3rem);line-height:1.15}
.totals{margin:14px 0 0;color:var(--cream-2);font-weight:700}
.legend{display:grid;gap:8px;margin:18px 0 0;padding:0;list-style:none;color:var(--cream-2);font-size:.92rem}
.legend li{display:flex;align-items:baseline;gap:10px}
.hint{margin:16px 0 0;max-width:52ch;color:var(--muted);font-size:.88rem}

.sec{padding-top:44px;padding-bottom:12px;scroll-margin-top:calc(var(--top-h,128px) + 8px)}
.sec+.sec{border-top:1px solid var(--line);margin-top:20px}
.sh{margin:0 0 22px;max-width:75ch}
.sh h2{margin:0 0 6px;font-size:clamp(1.75rem,1.2rem + 1.9vw,2.75rem);line-height:1.05}
.sh p{margin:0;color:var(--cream-2)}
.sh .sc{margin-top:6px;color:var(--muted);font-weight:700;font-size:.85rem}
.sh .sc b{color:var(--cream)}
.group{margin:0 0 30px}
.gh{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:0 0 12px}
.gh h3{margin:0;font-size:1.25rem;line-height:1.2;display:flex;align-items:center;gap:10px}
.gh p{margin:0;color:var(--muted);font-size:.9rem}
.dot{display:inline-block;width:13px;height:13px;border-radius:50%;background:var(--c);box-shadow:0 0 0 2px var(--ink),0 0 0 3.5px rgba(255,250,242,.55);flex:none}

.grid{display:grid;gap:18px 16px;align-items:start}
.sprites{grid-template-columns:repeat(auto-fill,minmax(min(100%,138px),1fr))}
.phones{grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr))}
.pairs{grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:18px}
.sets{grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:18px}
.strips{grid-template-columns:minmax(0,1024px)}
.masonry{columns:300px;column-gap:16px}
.masonry>.tile{break-inside:avoid;margin-bottom:18px}

.tile{margin:0;min-width:0;display:flex;flex-direction:column}
.th{display:block;aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--bd);cursor:zoom-in}
.th img{display:block;width:100%;height:100%;object-fit:contain;padding:9%}
.nat .th{aspect-ratio:auto}
.nat .th img{height:auto;padding:0}
.strips .th img{padding:14px 18px}
.tile figcaption{display:grid;gap:1px;padding:8px 2px 0;min-width:0}
.nm{font-weight:800;font-size:.92rem;line-height:1.25}
.nt{color:var(--cream-2);font-size:.8rem;line-height:1.3}
.id{color:var(--muted);font-size:.72rem;line-height:1.35;overflow-wrap:anywhere}
.mt{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:3px;color:var(--muted);font-size:.75rem;font-weight:700}
.badge{display:inline-block;padding:3px 8px 4px;border-radius:999px;font-size:.7rem;font-weight:800;line-height:1;color:var(--ink)}
.badge.new{background:var(--sage)}
.badge.old{background:var(--peach)}

.pair,.set{background:var(--ink-2);border:1px solid var(--line);border-radius:20px;padding:14px 14px 16px;min-width:0}
.ph{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ph h4{margin:0;font-size:1.2rem;line-height:1.2}
.arw{color:var(--gold)}
.tag{flex:none;padding:4px 9px 5px;border-radius:999px;background:var(--gold);color:var(--ink);font-size:.72rem;font-weight:800;line-height:1}
.pn{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin:3px 0 12px;color:var(--muted);font-size:.85rem}
.pn code{font-size:.72rem}
.els{display:inline-flex;align-items:center;gap:8px;color:var(--cream-2)}
.pr{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px}
.parr{color:var(--gold);font:800 1.6rem/1 var(--display);margin-top:-36px}
.pair.one .parr{display:none}
.sr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.hero{padding:18px 18px 20px;border-color:rgba(255,207,74,.4)}
.hero .ph h4{font-size:clamp(1.3rem,1rem + 1.2vw,1.9rem)}
.hero .parr{font-size:2.2rem}

.group.line{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:12px 24px;margin:0;padding:18px 0;border-top:1px dashed var(--line)}
.line .gh{flex-direction:column;align-items:flex-start;gap:3px;margin:0}

.foot{padding-top:28px;padding-bottom:48px;margin-top:28px;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
.foot p{margin:0 0 8px;max-width:90ch}
.foot code{color:var(--cream-2);overflow-wrap:anywhere}
.foot summary{cursor:pointer;color:var(--cream-2);font-weight:700}
.foot ul{margin:8px 0 0;padding-left:18px}

.lb{width:100%;max-width:none;height:100%;max-height:none;margin:0;padding:0;border:0;background:#1f1522;color:var(--cream)}
.lb::backdrop{background:#1f1522}
.lb[open]{display:grid;grid-template-rows:auto minmax(0,1fr) auto}
.lb-bar{display:flex;align-items:center;gap:12px;padding:12px 16px}
.lb-t{margin:0;display:flex;align-items:center;gap:10px;min-width:0;font:800 1.15rem/1.2 var(--display)}
.lb-t b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-x{flex:none;width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(255,250,242,.3);background:none;font-size:1.4rem;line-height:1;cursor:pointer}
.lb-stage{position:relative;display:grid;place-items:center;min-height:0;padding:8px 68px}
.lb-pad{background:var(--bd);border-radius:16px;padding:12px;line-height:0}
.lb-pad img{display:block;max-width:100%}
.lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(255,250,242,.3);background:var(--ink-2);font-size:1.6rem;line-height:1;cursor:pointer}
.lb-nav.prev{left:12px}
.lb-nav.next{right:12px}
.lb-info{display:grid;gap:4px;width:100%;max-width:100ch;margin:0 auto;padding:10px 16px 18px}
.lb-info p{margin:0}
.lb-meta{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--cream-2);font-size:.85rem}
.lb-meta code{color:var(--cream);overflow-wrap:anywhere}
.lb-o{color:var(--muted);font-size:.8rem}
.lb-d{color:var(--cream-2);font-size:.9rem;max-width:80ch}
.lb-acts{display:flex;flex-wrap:wrap;gap:8px;padding-top:6px}
.btn{display:inline-flex;align-items:center;padding:8px 14px;border-radius:999px;border:1.5px solid rgba(255,250,242,.3);background:none;font-weight:800;font-size:.85rem;line-height:1;text-decoration:none;cursor:pointer}
.btn:hover,.lb-x:hover,.lb-nav:hover{border-color:var(--cream)}
@media (prefers-reduced-motion:no-preference){.lb[open]{animation:lb-in .14s ease-out}}
@keyframes lb-in{from{opacity:0}to{opacity:1}}

@media (max-width:1100px){.opener{grid-template-columns:minmax(0,1fr)}.lede{max-width:28ch}}
@media (max-width:760px){
.wrap{padding-left:16px;padding-right:16px}
.tb{gap:10px}
h1{font-size:1.15rem}
.stat{display:none}
.seg .lbl{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.seg button{padding:7px 9px}
.chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-left:-16px;margin-right:-16px;padding-left:16px;padding-right:16px}
.chips::-webkit-scrollbar{display:none}
.opener{padding-top:22px}
.grid{gap:14px 10px}
.sprites{grid-template-columns:repeat(auto-fill,minmax(min(100%,100px),1fr))}
.phones{grid-template-columns:repeat(2,minmax(0,1fr))}
.masonry{columns:2;column-gap:10px}
.group.line{grid-template-columns:minmax(0,1fr);padding:14px 0}
.pair,.set{padding:12px}
.pr{gap:6px}
.sr{gap:8px}
.lb-stage{padding:6px 8px 58px}
.lb-nav{top:auto;bottom:6px;transform:none}
.lb-nav.prev{left:calc(50% - 52px)}
.lb-nav.next{right:calc(50% - 52px)}
}
`;

/** The page's script: filters, the backdrop switch and the lightbox. Inlined with toString(). */
function client() {
  const ITEMS = JSON.parse(document.getElementById('mb-data').textContent);
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const tiles = $$('.tile');
  const boxes = $$('[data-box]');
  const pairs = $$('.pair');
  const chips = $$('.chip');
  const sections = $$('.sec');
  const st = { status: '', cat: '' };
  const pass = (t, s, c) => (!s || t.dataset.status === s) && (!c || t.dataset.cat === c);

  const top = $('.top');
  const setTop = () => document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
  setTop();
  addEventListener('resize', setTop);

  function apply(byUser) {
    let shown = 0;
    for (const t of tiles) {
      const ok = pass(t, st.status, st.cat);
      t.hidden = !ok;
      if (ok) shown++;
    }
    for (const b of boxes) b.hidden = !b.querySelector('.tile:not([hidden])');
    for (const p of pairs) p.classList.toggle('one', p.querySelectorAll('.tile:not([hidden])').length < 2);
    for (const c of chips) {
      const [k, v] = c.dataset.f.split(':');
      const on = k === 'all' ? !st.status && !st.cat : st[k] === v;
      const n = k === 'all' ? tiles.length : tiles.filter((t) => (k === 'status' ? pass(t, v, st.cat) : pass(t, st.status, v))).length;
      c.setAttribute('aria-pressed', String(on));
      c.querySelector('b').textContent = n;
      c.classList.toggle('zero', n === 0);
    }
    for (const s of sections) s.querySelector('[data-count]').textContent = tiles.filter((t) => !t.hidden && t.dataset.cat === s.id).length;
    $('#stat').textContent = shown === tiles.length ? shown + ' images' : shown + ' of ' + tiles.length + ' images';
    if (byUser) {
      const h = [st.status && 'status=' + st.status, st.cat && 'cat=' + st.cat].filter(Boolean).join('&');
      history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
      scrollTo({ top: 0 });
    }
  }
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.get('status') === 'new' || q.get('status') === 'old') st.status = q.get('status');
  if (sections.some((s) => s.id === q.get('cat'))) st.cat = q.get('cat');
  apply(false);
  $('.chips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    const [k, v] = c.dataset.f.split(':');
    if (k === 'all') st.status = st.cat = '';
    else st[k] = st[k] === v ? '' : v;
    apply(true);
  });

  const setBd = (v) => {
    if (!['checker', 'cream', 'keep'].includes(v)) v = 'checker';
    document.body.dataset.bd = v;
    for (const b of $$('button[data-bd]')) b.setAttribute('aria-pressed', String(b.dataset.bd === v));
    try {
      localStorage.setItem('mb-bd', v);
    } catch (e) {
      /* storage may be blocked; the switch still works for this visit */
    }
  };
  let saved = null;
  try {
    saved = localStorage.getItem('mb-bd');
  } catch (e) {
    /* no stored choice */
  }
  setBd(saved);

  const lb = $('#lb');
  const img = $('#lb-img');
  const stage = $('#lb-stage');
  const swap = $('#lb-swap');
  let cur = -1;
  let opener = null;
  const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  function fit() {
    const it = ITEMS[cur];
    if (!it || !lb.open) return;
    if (!it.w || !it.h) {
      img.style.width = img.style.height = '';
      return;
    }
    const cs = getComputedStyle(stage);
    const mw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 24;
    const mh = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 24;
    const s = Math.min(mw / it.w, mh / it.h, Math.max(1, 360 / Math.max(it.w, it.h)));
    img.style.width = Math.max(1, Math.floor(it.w * s)) + 'px';
    img.style.height = Math.max(1, Math.floor(it.h * s)) + 'px';
  }
  function show(i) {
    const it = ITEMS[i];
    if (!it) return;
    cur = i;
    $('#lb-name').textContent = it.name;
    const b = $('#lb-badge');
    b.className = 'badge ' + it.status;
    b.textContent = it.status;
    $('#lb-file').textContent = it.file;
    $('#lb-size').textContent = [it.w ? it.w + '×' + it.h + ' px' : '', kb(it.bytes), it.model || ''].filter(Boolean).join(', ');
    const o = it.origin;
    $('#lb-origin').textContent = o ? (o.commit ? o.commit + ', ' : '') + o.date + ': ' + o.subject : '';
    $('#lb-desc').textContent = it.desc || '';
    swap.hidden = it.pair == null;
    swap.textContent = it.status === 'new' ? 'Show the old version' : 'Show the new version';
    $('#lb-open').href = it.src;
    img.alt = it.name;
    img.src = it.src;
    fit();
  }
  function step(d) {
    const n = tiles.length;
    const k = tiles.findIndex((t) => +t.dataset.i === cur);
    for (let j = 1; j <= n; j++) {
      const t = tiles[(((k + d * j) % n) + n) % n];
      if (!t.hidden) return show(+t.dataset.i);
    }
  }
  document.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;
    const bd = el.closest('button[data-bd]');
    if (bd) {
      setBd(bd.dataset.bd);
      return;
    }
    const a = el.closest('a.th');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    opener = a;
    if (!lb.open) lb.showModal();
    show(+a.closest('.tile').dataset.i);
  });
  $('#lb-prev').addEventListener('click', () => step(-1));
  $('#lb-next').addEventListener('click', () => step(1));
  $('#lb-x').addEventListener('click', () => lb.close());
  swap.addEventListener('click', () => {
    const it = ITEMS[cur];
    if (it && it.pair != null) show(it.pair);
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  });
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target === stage) lb.close();
  });
  lb.addEventListener('close', () => {
    if (lb.open) return; // the close event is async: the viewer may already be open on another image
    img.removeAttribute('src');
    cur = -1;
    if (opener) opener.focus();
  });
  addEventListener('resize', fit);
}

function tileHtml(it, compact = false) {
  const size = it.w ? `${it.w}×${it.h}` : '';
  const tip = [it.file, size && `${size} px`, kb(it.bytes), it.origin?.commit && `${it.origin.commit} ${it.origin.date}`].filter(Boolean).join(', ');
  return (
    `<figure class="tile" data-i="${it.i}" data-status="${it.status}" data-cat="${it.cat}">` +
    `<a class="th" href="${esc(it.src)}" title="${esc(tip)}"><img src="${esc(it.src)}" alt="${esc(it.name)}" loading="lazy" decoding="async"${it.w ? ` width="${it.w}" height="${it.h}"` : ''}></a>` +
    `<figcaption><span class="nm">${esc(it.label ?? it.name)}</span>` +
    (it.note ? `<span class="nt">${esc(it.note)}</span>` : '') +
    (compact ? '' : `<code class="id">${esc(it.id)}</code>`) +
    `<span class="mt"><span>${size}</span><span class="badge ${it.status}">${it.status}</span></span></figcaption></figure>`
  );
}
const dotHtml = (c) => `<i class="dot" style="--c:${esc(c)}"></i>`;
function entryHtml(e, layout) {
  if (e.tile) return tileHtml(e.tile);
  if (e.pair) {
    const [a, b] = e.pair;
    const title = Array.isArray(e.title) ? `${esc(e.title[0])} <span class="arw">→</span> ${esc(e.title[1])}` : esc(e.title);
    return (
      `<article class="pair${layout === 'hero' ? ' hero' : ''}" data-box>` +
      `<header class="ph"><h4>${title}</h4>${e.tag ? `<span class="tag">${esc(e.tag)}</span>` : ''}</header>` +
      `<p class="pn">${e.sub ? `<span>${esc(e.sub)}</span>` : ''}${e.id ? `<code>${esc(e.id)}</code>` : ''}</p>` +
      `<div class="pr${layout === 'hero' ? ' nat' : ''}">${tileHtml(a, true)}<span class="parr" aria-hidden="true">→</span>${tileHtml(b, true)}</div></article>`
    );
  }
  if (e.set)
    return (
      `<article class="set" data-box><header class="ph"><h4>${esc(e.title)}</h4></header>` +
      `<p class="pn"><span class="els">${e.dots.map(dotHtml).join('')}${esc(e.sub)}</span>${e.skill ? `<span>Skill: ${esc(e.skill)}</span>` : ''}<code>${esc(e.id)}</code></p>` +
      `<div class="sr">${e.set.map((t) => tileHtml(t, true)).join('')}</div></article>`
    );
  return '';
}
const LAYOUT = { pairs: 'grid pairs', sets: 'grid sets', sprites: 'grid sprites', line: 'grid sprites', phones: 'grid phones nat', strips: 'grid strips nat', masonry: 'masonry nat' };
function groupHtml(g) {
  const notes = [g.note]
    .flat()
    .filter(Boolean)
    .map((n) => `<p>${esc(n)}</p>`)
    .join('');
  const head = g.title ? `<header class="gh"><h3>${g.color ? dotHtml(g.color) : ''}${esc(g.title)}</h3>${notes}</header>` : '';
  return `<div class="group${g.layout === 'line' ? ' line' : ''}" data-box>${head}<div class="${LAYOUT[g.layout]}">${g.entries.map((e) => entryHtml(e, g.layout)).join('')}</div></div>`;
}
function sectionHtml(s) {
  const c = counts[s.key];
  return (
    `<section class="sec" id="${s.key}" data-box><header class="sh"><h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p>` +
    `<p class="sc"><b data-count>${c.images}</b> images${c.pairs ? `, ${c.pairs} old-to-new ${c.pairs === 1 ? 'pair' : 'pairs'}` : ''}</p></header>` +
    s.groups.map(groupHtml).join('') +
    `</section>`
  );
}

const seg = `<div class="seg" role="group" aria-label="Backdrop behind the art">${[
  ['checker', 'Checker', 'Checkerboard'],
  ['cream', 'Cream', 'Light cream #fffaf2'],
  ['keep', 'Keep', 'Dark keep floor #3e3c58'],
]
  .map(([k, l, t]) => `<button type="button" data-bd="${k}" aria-pressed="${k === 'checker'}" title="${t}"><i class="sw ${k}"></i><span class="lbl">${l}</span></button>`)
  .join('')}</div>`;
const chips = [
  `<button type="button" class="chip" data-f="all" aria-pressed="true">All <b>${total}</b></button>`,
  `<button type="button" class="chip" data-f="status:new" aria-pressed="false">New <b>${nNew}</b></button>`,
  `<button type="button" class="chip" data-f="status:old" aria-pressed="false">Old <b>${nOld}</b></button>`,
  `<span class="sep" aria-hidden="true"></span>`,
  ...SECTIONS.filter((s) => s.groups.length).map((s) => `<button type="button" class="chip" data-f="cat:${s.key}" aria-pressed="false">${esc(s.chip)} <b>${counts[s.key].images}</b></button>`),
].join('');
const skippedTotal = skipped.reduce((n, r) => n + r.count, 0);
const skippedHtml = skipped
  .map((r) => {
    const dirs = [...r.dirs];
    return `<li>${r.count} ${r.count === 1 ? 'image' : 'images'}: ${esc(r.reason)} (${dirs
      .slice(0, 3)
      .map((d) => `<code>${esc(d)}</code>`)
      .join(', ')}${dirs.length > 3 ? ', and more' : ''})</li>`;
  })
  .join('');
const icon = existsSync(join(ROOT, 'public/icons/icon-192.png')) ? `<link rel="icon" href="${pageUrl('public/icons/icon-192.png')}">` : '';
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>2048 Siege Mood Board</title>
<meta name="description" content="Every art asset of 2048 Siege, new and old: foes, pets, fusions, attacks, the siege frame and the visual overhaul's concepts.">
${icon}
<style>${CSS}</style>
</head>
<body data-bd="checker">
<header class="top"><div class="wrap">
<div class="tb"><h1>2048 Siege Mood Board</h1><p class="stat" id="stat">${total} images</p>${seg}</div>
<nav class="chips" aria-label="Filter the board">${chips}</nav>
</div></header>
<main>
<div class="wrap opener">
<div>
<p class="lede">Every art asset in the game, the visual overhaul’s concepts, and the art the overhaul replaced.</p>
<p class="totals">${total} images: ${nNew} new, ${nOld} old, ${nPairs} old-to-new pairs.</p>
<ul class="legend"><li><span class="badge new">new</span>in the game today, or made for the overhaul</li><li><span class="badge old">old</span>replaced by the overhaul, or from before it</li></ul>
<p class="hint">Click an image to enlarge it, then step through with the arrow keys. The switch at the top right changes the backdrop behind every image.</p>
</div>
${hero ? entryHtml(hero, 'hero') : ''}
</div>
<div class="wrap">
${SECTIONS.filter((s) => s.groups.length).map(sectionHtml).join('\n')}
</div>
</main>
<footer class="wrap foot">
<p>Built by <code>reports/art/moodboard/build.mjs</code> from <code>${HEAD}</code>${dirty ? ' with uncommitted sprite changes' : ''} on ${today}. The old sprites come from <code>git show ${BASE}:public/assets/gen/…</code>, the captures are copies in <code>captures/</code>. Rebuild with <code>node reports/art/moodboard/build.mjs</code>.</p>
${skipped.length ? `<details><summary>Not on the board: ${skippedTotal} images</summary><ul>${skippedHtml}</ul></details>` : ''}
</footer>
<dialog class="lb" id="lb" aria-labelledby="lb-name">
<div class="lb-bar"><p class="lb-t"><b id="lb-name"></b><span class="badge" id="lb-badge"></span></p>${seg}<button type="button" class="lb-x" id="lb-x" aria-label="Close" autofocus>×</button></div>
<div class="lb-stage" id="lb-stage"><button type="button" class="lb-nav prev" id="lb-prev" aria-label="Previous image">‹</button><div class="lb-pad"><img id="lb-img" alt=""></div><button type="button" class="lb-nav next" id="lb-next" aria-label="Next image">›</button></div>
<div class="lb-info"><p class="lb-meta"><code id="lb-file"></code><span id="lb-size"></span></p><p class="lb-o" id="lb-origin"></p><p class="lb-d" id="lb-desc"></p><p class="lb-acts"><button type="button" class="btn" id="lb-swap" hidden></button><a class="btn" id="lb-open" target="_blank" rel="noopener">Open the file</a></p></div>
</dialog>
<script type="application/json" id="mb-data">${JSON.stringify(items).replace(/</g, '\\u003c')}</script>
<script>(${client.toString()})();</script>
</body>
</html>
`;
writeFileSync(join(HERE, 'index.html'), html);

const data = {
  title: '2048 Siege Mood Board',
  generatedAt: new Date().toISOString(),
  head: HEAD,
  base: BASE,
  dirty,
  rebuild: 'node reports/art/moodboard/build.mjs',
  totals: { images: total, new: nNew, old: nOld, pairs: nPairs },
  counts,
  sections: SECTIONS.map((s) => ({
    key: s.key,
    title: s.title,
    groups: s.groups.map((g) => ({
      title: g.title || (s.key === 'fusions' ? 'Fusion sets' : ''),
      layout: g.layout,
      items: g.entries.flatMap((e) => (e.tile ? [e.tile.i] : (e.pair ?? e.set).map((t) => t.i))),
    })),
  })),
  hero: hero ? hero.pair.map((t) => t.i) : [],
  items,
  old: [...OLD].map(([id, o]) => ({ id, ...o })),
  captures: captures.map(({ file, from }) => ({ file, from })),
  skipped: skipped.map((r) => ({ reason: r.reason, count: r.count, dirs: [...r.dirs] })),
  missing,
  warnings,
};
writeFileSync(join(HERE, 'data.json'), `${JSON.stringify(data, null, 2)}\n`);

const pad = (v, n) => String(v).padEnd(n);
console.log(`\n2048 Siege mood board: ${total} images (${nNew} new, ${nOld} old, ${nPairs} old-to-new pairs)`);
console.log(`  ${pad('section', 10)} ${pad('images', 7)} ${pad('new', 5)} ${pad('old', 5)} pairs`);
for (const s of SECTIONS) {
  const c = counts[s.key];
  console.log(`  ${pad(s.key, 10)} ${pad(c.images, 7)} ${pad(c.new, 5)} ${pad(c.old, 5)} ${c.pairs}`);
}
console.log(`  old/: ${OLD.size} sprites from ${BASE}; captures/: ${captures.length} of ${CAPTURES.length}`);
for (const r of skipped) console.log(`  not shown: ${r.count} ${r.reason}`);
console.log(`  wrote ${repoPath(join(HERE, 'index.html'))} and data.json${warnings.length ? ` (${warnings.length} warnings)` : ''}`);
