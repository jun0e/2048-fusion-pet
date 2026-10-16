#!/usr/bin/env python3
"""Assemble matrix.html, the self-contained 8x8 fusion matrix page.

Inputs (all under <matrix>/): fusion-roster.json, silhouettes.svg (the symbols), twin-test.json,
palette-check.json; plus the base pets' sprites (public/assets/gen/pet.<el>.128.png), today's
fusion sprites (fusion.<key>.png) and the foe contracts (tools/refs/foes/sil-*.png), embedded as
base64 thumbnails so the page works from any server or from disk with no external files or
libraries. The element key colours and base animals are read from src/art/palettes.js.

usage: /usr/bin/python3 build-matrix.py   (then open http://localhost:5177/reports/art/fusion-matrix/matrix.html)
"""
import base64
import io
import json
import os
import re

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = os.path.dirname(HERE)
WORKTREE = os.path.abspath(os.path.join(MATRIX, "..", "..", ".."))
GEN = os.path.join(WORKTREE, "public", "assets", "gen")
FOES = os.path.join(WORKTREE, "tools", "refs", "foes")


def thumb(path, size, mode="RGBA"):
    im = Image.open(path).convert(mode)
    im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def element_info():
    src = open(os.path.join(WORKTREE, "src", "art", "palettes.js"), encoding="utf-8").read()
    out = {}
    for m in re.finditer(r"\n  (\w+): \{\s*key: '(#[0-9A-Fa-f]{6})'.*?animal: '([^']+)'", src, re.S):
        out[m.group(1)] = {"color": m.group(2), "animal": m.group(3)}
    return out


def symbols_svg():
    svg = open(os.path.join(MATRIX, "silhouettes.svg"), encoding="utf-8").read()
    defs = re.search(r"<defs>(.*?)</defs>", svg, re.S).group(1)
    defs = defs.replace('stroke="#15121a"', 'stroke="currentColor"')
    return defs


def main():
    roster = json.load(open(os.path.join(MATRIX, "fusion-roster.json")))
    twin = json.load(open(os.path.join(MATRIX, "twin-test.json")))
    pal = json.load(open(os.path.join(MATRIX, "palette-check.json")))
    els = roster["elements"]
    info = element_info()
    for e in els:
        p = os.path.join(GEN, f"pet.{e}.128.png")
        info[e]["sprite"] = thumb(p, 160) if os.path.exists(p) else None
        info[e]["name"] = e[0].upper() + e[1:]
    fusions = []
    for f in roster["fusions"]:
        k = f["key"]
        row = dict(f)
        row["twin"] = twin["proposed"].get(k)
        row["today"] = twin["today"].get(k)
        row["ground"] = pal["fusions"].get(k)
        p = os.path.join(GEN, f"fusion.{k}.png")
        row["todaySprite"] = thumb(p, 112) if os.path.exists(p) else None
        fusions.append(row)
    foes = {}
    for fn in sorted(os.listdir(FOES)):
        if fn.startswith("sil-") and fn.endswith(".png"):
            foes[fn[4:-4]] = thumb(os.path.join(FOES, fn), 72, "L")
    data = {
        "elements": els,
        "elementInfo": info,
        "universal": roster["universal"],
        "fusions": fusions,
        "foes": foes,
        "targets": twin["targets"],
        "summary": twin["summary"],
        "matrix": twin["matrix"],
        "grounds": pal["grounds"],
    }
    html = TEMPLATE.replace("/*DEFS*/", symbols_svg()).replace("/*DATA*/", json.dumps(data, separators=(",", ":")))
    out = os.path.join(MATRIX, "matrix.html")
    open(out, "w", encoding="utf-8").write(html)
    print("wrote", out, f"{os.path.getsize(out) / 1024:.0f} KB")


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>2048 Siege · Fusion matrix</title>
<style>
  :root {
    --cream: #fffaf2; --paper: #f6efe2; --ink: #2b1d2e; --mute: #6a6f7a; --line: #d9d2c4;
    --lane: #D9C7A3; --keep: #3E3C58; --ok: #2e8b57; --miss: #d6452f;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--paper); color: var(--ink); font: 14px/1.4 -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; }
  header { padding: 18px 16px 10px; }
  h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: .2px; }
  h1 small { font-weight: 400; color: var(--mute); font-size: 14px; margin-left: 8px; }
  .sub { color: var(--mute); margin: 0 0 10px; max-width: 980px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; padding: 0 16px 12px; font-size: 13px; }
  .bar .grp { display: inline-flex; gap: 4px; align-items: center; background: var(--cream); border: 1px solid var(--line); border-radius: 999px; padding: 3px 6px; }
  .bar .grp span.l { color: var(--mute); padding: 0 4px; }
  .bar button { border: 0; background: transparent; padding: 3px 9px; border-radius: 999px; font: inherit; cursor: pointer; color: var(--ink); }
  .bar button.on { background: var(--ink); color: var(--cream); }
  .stat { margin-left: auto; color: var(--mute); }
  .stat b { color: var(--ink); }
  .wrap { padding: 0 16px 24px; overflow-x: auto; }
  .grid { display: grid; grid-template-columns: 64px repeat(8, minmax(60px, 1fr)); gap: 4px; min-width: 560px; }
  .hd { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; padding: 4px 2px; font-size: 12px; font-weight: 700; text-align: center; }
  .hd.row { justify-content: center; align-items: flex-start; text-align: left; padding-left: 4px; }
  .hd .chip { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--ink); display: inline-block; }
  .hd small { font-weight: 400; color: var(--mute); font-size: 10px; }
  .cell { position: relative; background: var(--cream); border: 1px solid var(--line); border-radius: 10px; aspect-ratio: 1 / 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; cursor: pointer; transition: transform .08s ease, box-shadow .08s ease; overflow: hidden; }
  .cell:hover, .cell:focus-visible { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(43,29,46,.15); outline: none; z-index: 1; }
  .cell.sel { box-shadow: 0 0 0 3px var(--ink); }
  .cell.diag { background: var(--lane); cursor: default; }
  .cell.diag img { width: 78%; height: 78%; object-fit: contain; }
  .cell.diag .nm { font-size: 11px; font-weight: 700; }
  .cell.ghost { opacity: .42; background: transparent; border-style: dashed; }
  .cell.ghost:hover { opacity: .9; }
  .cell svg { width: 70%; height: 70%; display: block; }
  .cell.px40 svg { width: 40px; height: 40px; }
  .cell.flip svg { transform: scaleX(-1); }
  .sil { fill: currentColor; stroke: currentColor; }
  .sil path[fill="none"] { fill: none; }
  .cell .nm { font-size: 11px; font-weight: 700; line-height: 1.1; text-align: center; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cell .an { font-size: 10px; color: var(--mute); line-height: 1.1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .cell .sw { display: flex; gap: 2px; margin-top: 3px; }
  .cell .sw i { width: 9px; height: 9px; border-radius: 50%; border: 1px solid rgba(43,29,46,.5); display: block; }
  .cell .pf { position: absolute; top: 4px; right: 6px; font-size: 9px; font-weight: 700; color: var(--ok); }
  .cell .pf.miss { color: var(--miss); }
  .grid.g-lane .cell:not(.diag) { background: var(--lane); }
  .grid.g-keep .cell:not(.diag) { background: var(--keep); color: var(--cream); }
  .grid.g-keep .cell .an { color: #cfc9d8; }
  .grid.g-keep .cell.ghost { border-color: #8a86a8; }
  .grid.ink .cell svg { color: var(--ink) !important; }
  .grid.g-keep.ink .cell svg { color: #15121a !important; }
  .names-off .cell .nm, .names-off .cell .an, .names-off .cell .sw { display: none; }
  @media (max-width: 720px) {
    .grid { grid-template-columns: 34px repeat(8, minmax(34px, 1fr)); gap: 3px; min-width: 0; }
    .hd { font-size: 9px; } .hd small { display: none; } .hd .chip { width: 10px; height: 10px; }
    .cell { border-radius: 7px; padding: 2px; }
    .cell .nm, .cell .an, .cell .sw, .cell .pf { display: none; }
    .cell svg { width: 86%; height: 86%; }
    .cell.diag .nm { display: none; }
  }
  /* detail panel */
  .panel { position: fixed; top: 0; right: 0; width: min(440px, 100vw); height: 100vh; background: var(--cream); border-left: 1px solid var(--line); box-shadow: -8px 0 24px rgba(43,29,46,.15); transform: translateX(105%); transition: transform .18s ease; overflow-y: auto; z-index: 10; padding: 16px 18px 40px; }
  .panel.open { transform: none; }
  .panel .x { position: absolute; top: 10px; right: 12px; border: 0; background: var(--paper); width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer; color: var(--ink); }
  .panel h2 { margin: 4px 0 0; font-size: 22px; }
  .panel .k { color: var(--mute); font-size: 12px; }
  .panel .hero { display: flex; gap: 12px; align-items: center; margin: 10px 0; }
  .panel .hero .big { width: 150px; height: 150px; border-radius: 14px; background: var(--paper); display: flex; align-items: center; justify-content: center; flex: none; border: 1px solid var(--line); }
  .panel .hero .big.lane { background: var(--lane); } .panel .hero .big.keep { background: var(--keep); }
  .panel .hero .big svg { width: 84%; height: 84%; }
  .panel .hero .today { text-align: center; font-size: 11px; color: var(--mute); }
  .panel .hero .today img { width: 100px; height: 100px; object-fit: contain; display: block; margin: 0 auto 2px; }
  .panel .gsel { display: flex; gap: 4px; margin-top: 6px; }
  .panel .gsel button { font: inherit; font-size: 11px; border: 1px solid var(--line); background: var(--paper); border-radius: 999px; padding: 2px 8px; cursor: pointer; color: var(--ink); }
  .panel .gsel button.on { background: var(--ink); color: var(--cream); }
  .panel h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: var(--mute); margin: 16px 0 4px; }
  .panel p { margin: 4px 0; }
  .panel .pal { display: flex; flex-wrap: wrap; gap: 6px; }
  .panel .pal .c { display: flex; align-items: center; gap: 6px; font-size: 11px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 3px 7px 3px 3px; }
  .panel .pal .c i { width: 22px; height: 22px; border-radius: 6px; border: 1px solid rgba(43,29,46,.4); display: block; }
  .panel .pal .c code { font-size: 10px; color: var(--mute); }
  .panel .tw { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .panel .tw .t { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 6px; text-align: center; font-size: 11px; }
  .panel .tw .t .v { font-size: 18px; font-weight: 700; }
  .panel .tw .t .v.ok { color: var(--ok); } .panel .tw .t .v.miss { color: var(--miss); }
  .panel .tw .t .pic { height: 56px; display: flex; align-items: center; justify-content: center; margin: 4px 0; }
  .panel .tw .t .pic svg, .panel .tw .t .pic img { max-height: 56px; max-width: 70px; }
  .panel .tw .t .pic img.foe { filter: none; }
  .panel table { border-collapse: collapse; font-size: 12px; width: 100%; }
  .panel td, .panel th { border-bottom: 1px solid var(--line); padding: 3px 4px; text-align: left; }
  .panel th { color: var(--mute); font-weight: 600; font-size: 11px; }
  .panel .ok { color: var(--ok); font-weight: 700; } .panel .miss { color: var(--miss); font-weight: 700; }
  .panel .feat { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .panel .feat div { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 6px 8px; font-size: 12px; }
  .panel .feat b { display: flex; align-items: center; gap: 6px; }
  .panel .feat .chip { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--ink); display: inline-block; }
  .lineup { padding: 0 16px 20px; }
  .lineup h2, .heat h2 { font-size: 15px; margin: 0 0 6px; }
  .lineup .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-end; background: var(--lane); padding: 8px; border-radius: 12px; }
  .lineup .row.keep { background: var(--keep); }
  .lineup .row > div { width: 44px; text-align: center; font-size: 8px; color: var(--ink); }
  .lineup .row.keep > div { color: var(--cream); }
  .lineup .row svg { width: 40px; height: 40px; display: block; margin: 0 auto; }
  .lineup .row img { width: 40px; height: 40px; object-fit: contain; display: block; margin: 0 auto; }
  .heat { padding: 0 16px 30px; overflow-x: auto; }
  .heat table { border-collapse: collapse; font-size: 9px; }
  .heat td, .heat th { width: 22px; height: 18px; text-align: center; padding: 0; border: 1px solid #fff; }
  .heat th { font-weight: 600; color: var(--mute); writing-mode: vertical-rl; transform: rotate(180deg); height: 70px; width: 22px; }
  .heat th.r { writing-mode: horizontal-tb; transform: none; text-align: right; padding-right: 4px; width: auto; height: 18px; white-space: nowrap; }
  footer { padding: 0 16px 30px; color: var(--mute); font-size: 12px; max-width: 980px; }
  .scrim { position: fixed; inset: 0; background: rgba(43,29,46,.25); display: none; z-index: 9; }
  .scrim.open { display: block; }
  @media (min-width: 1100px) { .scrim.open { display: none; } }
  @media (max-width: 720px) {
    .panel { top: auto; bottom: 0; right: 0; left: 0; width: 100vw; height: 78vh; border-left: 0; border-top: 1px solid var(--line); border-radius: 16px 16px 0 0; transform: translateY(105%); }
    .panel.open { transform: none; }
  }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>/*DEFS*/</defs></svg>
<header>
  <h1>2048 Siege · Fusion matrix <small>28 fusion pets as 28 animals, one silhouette each</small></h1>
  <p class="sub">Rows are element A, columns element B. The upper triangle holds each fusion (click a cell for the full brief); the lower triangle ghosts it mirrored, the way the renderer flips a pet that turns round. The diagonal shows the eight base animals with the sprites they have today. Silhouettes are the generation contracts (black-on-white in <code>contracts/</code>); here they are tinted with each fusion's dominant colour.</p>
</header>
<div class="bar">
  <div class="grp"><span class="l">tint</span><button data-set="tint" data-v="colour" class="on">colour</button><button data-set="tint" data-v="ink">ink</button></div>
  <div class="grp"><span class="l">ground</span><button data-set="ground" data-v="cream" class="on">cream</button><button data-set="ground" data-v="lane">lane</button><button data-set="ground" data-v="keep">keep</button></div>
  <div class="grp"><span class="l">size</span><button data-set="size" data-v="fit" class="on">fit</button><button data-set="size" data-v="px40">40 px</button></div>
  <div class="grp"><span class="l">mirror</span><button data-set="flip" data-v="no" class="on">no</button><button data-set="flip" data-v="yes">yes</button></div>
  <div class="grp"><span class="l">names</span><button data-set="names" data-v="on" class="on">on</button><button data-set="names" data-v="off">off</button></div>
  <div class="stat" id="stat"></div>
</div>
<div class="wrap"><div class="grid" id="grid"></div></div>
<section class="lineup">
  <h2>The line-up at 40 px (the on-screen size of a roaming fusion), with the eight base pets</h2>
  <div class="row" id="lineup"></div>
  <div class="row keep" id="lineupKeep" style="margin-top:6px"></div>
</section>
<section class="heat">
  <h2>Fusion × fusion silhouette overlap at 40 px (IoU, flip allowed; target ≤ 0.60)</h2>
  <div id="heat"></div>
</section>
<footer id="foot"></footer>
<div class="scrim" id="scrim"></div>
<aside class="panel" id="panel" aria-live="polite"></aside>
<script>
const DATA = /*DATA*/;
const $ = (s, r = document) => r.querySelector(s);
const el = (t, a = {}, ...kids) => { const n = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'class') n.className = v; else if (k === 'html') n.innerHTML = v; else if (k === 'style') n.style.cssText = v; else n.setAttribute(k, v); } for (const c of kids) if (c != null) n.append(c); return n; };
const SVGNS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink';
const key = (a, b) => `${a}+${b}`;
const byKey = Object.fromEntries(DATA.fusions.map((f) => [f.key, f]));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
function sil(k, color) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 120 120');
  s.style.color = color;
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttributeNS(XLINK, 'xlink:href', '#sil-' + k.replace('+', '-'));
  u.setAttribute('href', '#sil-' + k.replace('+', '-'));
  s.append(u);
  return s;
}
const state = { tint: 'colour', ground: 'cream', size: 'fit', flip: 'no', names: 'on', sel: null };
const E = DATA.elements;

function buildGrid() {
  const g = $('#grid');
  g.innerHTML = '';
  g.append(el('div'));
  for (const b of E) g.append(el('div', { class: 'hd' }, el('span', { class: 'chip', style: `background:${DATA.elementInfo[b].color}` }), cap(b), el('small', {}, DATA.elementInfo[b].animal.toLowerCase())));
  for (const a of E) {
    g.append(el('div', { class: 'hd row' }, el('span', { class: 'chip', style: `background:${DATA.elementInfo[a].color}` }), cap(a)));
    for (const b of E) {
      const ia = E.indexOf(a), ib = E.indexOf(b);
      if (ia === ib) {
        const inf = DATA.elementInfo[a];
        const c = el('div', { class: 'cell diag', title: `${cap(a)}: ${inf.animal} (the base pet, today's sprite)` }, inf.sprite ? el('img', { src: inf.sprite, alt: inf.animal }) : null, el('div', { class: 'nm' }, inf.animal));
        g.append(c);
        continue;
      }
      const k = ia < ib ? key(a, b) : key(b, a);
      const f = byKey[k];
      const ghost = ia > ib;
      const c = el('div', { class: 'cell' + (ghost ? ' ghost' : ''), tabindex: '0', role: 'button', 'data-key': k, title: `${f.name} (${f.skill}): ${f.animal}` });
      c.append(sil(k, f.palette.dominant));
      c.append(el('div', { class: 'nm' }, f.name), el('div', { class: 'an' }, f.animal));
      const sw = el('div', { class: 'sw' });
      for (const h of [f.palette.dominant, f.palette.shade, f.palette.light, f.palette.accentA, f.palette.accentB, f.palette.extra]) sw.append(el('i', { style: `background:${h}` }));
      c.append(sw);
      if (f.twin && !ghost) c.append(el('span', { class: 'pf' + (f.twin.pass ? '' : ' miss') }, f.twin.pass ? 'ok' : 'miss'));
      c.addEventListener('click', () => open(k));
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k); } });
      g.append(c);
    }
  }
  applyState();
}
function applyState() {
  const g = $('#grid');
  g.classList.toggle('ink', state.tint === 'ink');
  g.classList.toggle('g-lane', state.ground === 'lane');
  g.classList.toggle('g-keep', state.ground === 'keep');
  document.body.classList.toggle('names-off', state.names === 'off');
  for (const c of g.querySelectorAll('.cell[data-key]')) {
    c.classList.toggle('px40', state.size === 'px40');
    const ghost = c.classList.contains('ghost');
    c.classList.toggle('flip', (state.flip === 'yes') !== ghost);
    c.classList.toggle('sel', c.dataset.key === state.sel);
  }
}
for (const b of document.querySelectorAll('.bar button')) b.addEventListener('click', () => {
  state[b.dataset.set] = b.dataset.v;
  for (const o of document.querySelectorAll(`.bar button[data-set="${b.dataset.set}"]`)) o.classList.toggle('on', o === b);
  applyState();
});

function swatch(h, label) { return el('div', { class: 'c' }, el('i', { style: `background:${h}` }), el('span', {}, label, ' ', el('code', {}, h.toUpperCase()))); }
function twinCard(label, pair, target, pic) {
  const ok = pair[0] <= target;
  return el('div', { class: 't' }, el('div', {}, label), el('div', { class: 'pic' }, pic), el('div', { class: 'v ' + (ok ? 'ok' : 'miss') }, pair[0].toFixed(2)), el('div', {}, pair[1] ? String(pair[1]) : '—', el('br'), el('small', { style: 'color:var(--mute)' }, `target ≤ ${target.toFixed(2)}`)));
}
function open(k) {
  const f = byKey[k];
  state.sel = k;
  applyState();
  const p = $('#panel');
  p.innerHTML = '';
  const [a, b] = f.key.split('+');
  const inf = DATA.elementInfo;
  p.append(el('button', { class: 'x', 'aria-label': 'close' }, '×'));
  p.append(el('div', { class: 'k' }, `${f.key} · skill: ${f.skill} · ${f.view} view · ${f.move}`));
  p.append(el('h2', {}, f.name, el('small', { style: 'font-weight:400;color:var(--mute);font-size:13px;margin-left:8px' }, f.nameNote === 'keep' ? 'name kept' : `today: ${f.nameToday}`)));
  p.append(el('div', {}, el('b', {}, cap(f.animal)), ` · ${f.species} · ${f.kind}`));
  const big = el('div', { class: 'big' }, sil(k, f.palette.dominant));
  const hero = el('div', { class: 'hero' }, big);
  if (f.todaySprite) hero.append(el('div', { class: 'today' }, el('img', { src: f.todaySprite, alt: 'today' }), `today: ${f.nameToday}`));
  p.append(hero);
  const gsel = el('div', { class: 'gsel' });
  for (const [v, label] of [['cream', 'cream'], ['lane', 'lane #D9C7A3'], ['keep', 'keep #3E3C58'], ['ink', 'ink contract']]) {
    const bt = el('button', { class: v === 'cream' ? 'on' : '' }, label);
    bt.addEventListener('click', () => {
      for (const o of gsel.children) o.classList.toggle('on', o === bt);
      big.className = 'big ' + (v === 'ink' ? '' : v);
      big.querySelector('svg').style.color = v === 'ink' ? '#15121a' : f.palette.dominant;
    });
    gsel.append(bt);
  }
  p.append(gsel);
  p.append(el('h3', {}, 'Why this animal'), el('p', {}, f.why));
  p.append(el('h3', {}, 'Body plan and pose'), el('p', {}, el('b', {}, f.bodyPlan), ' · ', f.pose));
  p.append(el('h3', {}, 'Description (the prompt’s creature line)'), el('p', {}, f.desc));
  p.append(el('h3', {}, 'What each parent gives'));
  p.append(el('div', { class: 'feat' },
    el('div', {}, el('b', {}, el('span', { class: 'chip', style: `background:${inf[a].color}` }), `${cap(a)} (${inf[a].animal.toLowerCase()})`), f.parents.a.feature),
    el('div', {}, el('b', {}, el('span', { class: 'chip', style: `background:${inf[b].color}` }), `${cap(b)} (${inf[b].animal.toLowerCase()})`), f.parents.b.feature)));
  p.append(el('h3', {}, 'Palette'));
  const pal = el('div', { class: 'pal' });
  pal.append(swatch(f.palette.dominant, 'dominant (FUSIONS colour)'), swatch(f.palette.shade, 'shade'), swatch(f.palette.light, 'light'), swatch(f.palette.accentA, `${a} accent`), swatch(f.palette.accentB, `${b} accent`), swatch(f.palette.extra, 'extra'), swatch(DATA.universal.outline, 'outline'), swatch(DATA.universal.rim, 'sticker rim'));
  p.append(pal);
  if (f.ground) {
    p.append(el('h3', {}, 'Figure-ground (dominant colour; the body also has the shade and light tones)'));
    const t = el('table');
    t.append(el('tr', {}, el('th', {}, 'ground'), el('th', {}, 'contrast'), el('th', {}, 'ΔL*'), el('th', {}, 'carrier (the cel tone or a big accent)'), el('th', {}, 'separating')));
    for (const g of ['keep', 'lane']) {
      const r = f.ground[g];
      const n = Object.keys(r.separating || {}).length;
      const car = r.carrier ? el('span', {}, el('i', { style: `display:inline-block;width:11px;height:11px;border-radius:3px;border:1px solid rgba(43,29,46,.4);background:${r.carrier.hex};vertical-align:-1px;margin-right:4px` }), `${r.carrier.role} ${r.carrier.hex.toUpperCase()} (${(r.carrier.dL > 0 ? '+' : '') + r.carrier.dL.toFixed(0)})`) : '—';
      t.append(el('tr', {}, el('td', {}, `${g} ${DATA.grounds[g]}`), el('td', {}, r.ratio.toFixed(2)), el('td', { class: r.dominantSeparates ? 'ok' : '' }, (r.dL > 0 ? '+' : '') + r.dL.toFixed(0)), el('td', {}, car), el('td', { class: n >= 2 ? 'ok' : n ? '' : 'miss' }, `${n} of 6`)));
    }
    p.append(t, el('p', { style: 'font-size:12px;color:var(--mute)' }, f.ground.note));
  }
  if (f.twin) {
    p.append(el('h3', {}, 'Twin test at 40 px (flip allowed)'));
    const tw = el('div', { class: 'tw' });
    const t = DATA.targets;
    const twinPic = f.twin.twin[1] ? sil(f.twin.twin[1], byKey[f.twin.twin[1]].palette.dominant) : null;
    const foePic = f.twin.foe[1] && DATA.foes[f.twin.foe[1]] ? el('img', { class: 'foe', src: DATA.foes[f.twin.foe[1]], alt: f.twin.foe[1] }) : null;
    const petPic = f.twin.pet[1] && inf[f.twin.pet[1]].sprite ? el('img', { src: inf[f.twin.pet[1]].sprite, alt: f.twin.pet[1] }) : null;
    tw.append(twinCard('closest fusion', [f.twin.twin[0], f.twin.twin[1] ? byKey[f.twin.twin[1]].name : null], t.twin, twinPic), twinCard('closest foe', f.twin.foe, t.foe, foePic), twinCard('closest base pet', f.twin.pet, t.pet, petPic));
    p.append(tw);
    if (f.today) p.append(el('p', { style: 'font-size:12px;color:var(--mute)' }, `Today's sprite: closest fusion ${f.today.twin[0].toFixed(2)} (${byKey[f.today.twin[1]]?.name ?? f.today.twin[1]}), closest foe ${f.today.foe[0].toFixed(2)} (${f.today.foe[1]}), closest base pet ${f.today.pet[0].toFixed(2)} (${f.today.pet[1]}).`));
  }
  p.append(el('h3', {}, 'IP note'), el('p', {}, f.ip));
  p.append(el('h3', {}, 'Fallback animal'), el('p', {}, f.alt));
  p.classList.add('open');
  $('#scrim').classList.add('open');
  $('.x', p).addEventListener('click', close);
}
function close() { $('#panel').classList.remove('open'); $('#scrim').classList.remove('open'); state.sel = null; applyState(); }
$('#scrim').addEventListener('click', close);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

function buildLineup() {
  for (const [id, dark] of [['#lineup', false], ['#lineupKeep', true]]) {
    const row = $(id);
    for (const e of E) row.append(el('div', {}, DATA.elementInfo[e].sprite ? el('img', { src: DATA.elementInfo[e].sprite, alt: e }) : null, cap(e)));
    for (const f of DATA.fusions) row.append(el('div', {}, sil(f.key, f.palette.dominant), f.name));
  }
}
function buildHeat() {
  const m = DATA.matrix;
  const t = el('table');
  const hr = el('tr', {}, el('th', { class: 'r' }));
  for (const k of m.keys) hr.append(el('th', {}, byKey[k].name));
  t.append(hr);
  m.keys.forEach((k, i) => {
    const r = el('tr', {}, el('th', { class: 'r' }, `${byKey[k].name} (${k})`));
    m.keys.forEach((k2, j) => {
      const v = m.iou[i][j];
      const bad = v > DATA.targets.twin && i !== j;
      const shade = i === j ? '#e8e2d6' : bad ? '#d6452f' : `rgba(43,29,46,${Math.max(0, (v - 0.2)) * 1.4})`;
      r.append(el('td', { style: `background:${shade};color:${v > 0.5 ? '#fff' : 'var(--ink)'}`, title: `${byKey[k].name} × ${byKey[k2].name}: ${v.toFixed(2)}` }, i === j ? '' : v.toFixed(2).slice(1)));
    });
    t.append(r);
  });
  $('#heat').append(t);
}
function buildStat() {
  const s = DATA.summary;
  const p = s.proposed, t = s.today;
  $('#stat').innerHTML = `twin max/median <b>${p.twinMax.toFixed(2)} / ${p.twinMedian.toFixed(2)}</b> (today ${t ? t.twinMax.toFixed(2) + ' / ' + t.twinMedian.toFixed(2) : '—'}) · vs foes max <b>${p.foeMax.toFixed(2)}</b> · vs base pets max <b>${p.petMax.toFixed(2)}</b> · passing <b>${p.passing}/${p.n}</b>`;
  $('#foot').innerHTML = `Method: each contract is trimmed to its bounding box, fitted into a 40 px square and compared by IoU with every other fusion contract, the 17 foe contracts in <code>tools/refs/foes/</code> and the 8 base pets' 128-stage sprites, either way round (the renderer flips a pet by its direction). Targets: closest fusion ≤ ${DATA.targets.twin}, closest foe ≤ ${DATA.targets.foe}, closest base pet ≤ ${DATA.targets.pet}. The figure-ground numbers are the WCAG contrast ratio and the L* difference of the dominant colour against the dark keep floor (${DATA.grounds.keep}) and the light lane (${DATA.grounds.lane}); a body pixel separates from a ground at ΔL* ≥ 20 (the pipeline's rule), and every pet also carries the plum outline and the cream sticker rim. Built by <code>tools/build-matrix.py</code> from <code>fusion-roster.json</code>, <code>silhouettes.svg</code>, <code>twin-test.json</code> and <code>palette-check.json</code>.`;
}
buildGrid(); buildLineup(); buildHeat(); buildStat();
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
