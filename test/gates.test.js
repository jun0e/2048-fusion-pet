// tools/silhouette-check.py and tools/post.py --strip-rim on synthetic sprites: an inline PIL
// script draws them in a temp dir. Skipped when python3 with Pillow and NumPy is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const probe = spawnSync('python3', ['-c', 'import PIL, numpy'], { encoding: 'utf8' });
const skip = probe.status === 0 ? false : 'needs python3 with Pillow and NumPy';

// the sprites (512 px): a tall asymmetric profile facing left (its fitted width leaves an odd
// margin at 40 px, so a flip after fitting would be 1 px off), the same mirrored, another animal,
// and framed boards: an ink frame of w px around one or two tones, for the outline band and values
const DRAW = String.raw`
import sys
from PIL import Image, ImageDraw
out = sys.argv[1]
W = 512
def tall():
    m = Image.new('L', (W, W), 0); d = ImageDraw.Draw(m)
    d.ellipse([150, 100, 330, 420], fill=255)
    d.ellipse([100, 60, 230, 170], fill=255)
    d.rectangle([300, 380, 430, 410], fill=255)
    return m
def bar():
    m = Image.new('L', (W, W), 0); d = ImageDraw.Draw(m)
    d.rectangle([40, 230, 470, 290], fill=255)
    d.polygon([(200, 230), (260, 120), (300, 230)], fill=255)
    return m
def sprite(mask):
    im = Image.new('RGBA', (W, W), (58, 52, 54, 0)); im.putalpha(mask); return im
def sketch(mask):
    return Image.eval(mask, lambda v: 255 - v).convert('RGB')
sketch(tall()).save(out + '/contract.png')
sprite(tall()).save(out + '/same.png')
sprite(tall()).transpose(Image.FLIP_LEFT_RIGHT).save(out + '/flipped.png')
sprite(bar()).save(out + '/other.png')
sketch(bar()).save(out + '/other-sil.png')
CREAM = (243, 234, 220)
def board(name, w, top, bottom=None):
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([20, 20, 491, 491], fill=(43, 29, 46, 255))
    d.rectangle([20 + w, 20 + w, 491 - w, 255], fill=top + (255,))
    d.rectangle([20 + w, 256, 491 - w, 491 - w], fill=(bottom or top) + (255,))
    im.save(out + '/' + name + '.png')
# a thin-limbed animal (4 legs 9 px wide, an antenna 7 px), its sketch, the sprite with a round 2 %
# cream rim (a disk of 9 px for its 431 px height, as a hero's sticker rim) and without one; and the
# same animal turned 45 degrees, whose limbs run diagonally
import numpy as np
def legs():
    m = Image.new('L', (W, W), 0); d = ImageDraw.Draw(m)
    d.ellipse([140, 120, 380, 300], fill=255)
    for x in (170, 220, 290, 340):
        d.rectangle([x, 280, x + 8, 470], fill=255)
    d.rectangle([200, 40, 206, 140], fill=255)
    return m
def turned():
    m = legs().rotate(45, resample=Image.NEAREST, expand=True)
    return m.resize((W, W), Image.NEAREST)
def rimmed(m, share=0.02):
    a = np.asarray(m) > 127
    ys, xs = np.where(a)
    r = max(1, round(max(ys.max() - ys.min(), xs.max() - xs.min()) * share))
    h, w = a.shape
    pad = np.pad(a, r)
    o = np.zeros_like(a)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy * dy + dx * dx <= r * r:
                o |= pad[r + dy:r + dy + h, r + dx:r + dx + w]
    return Image.fromarray((o * 255).astype('uint8'))
def rim_sprite(m):
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    im.paste((255, 250, 242, 255), mask=rimmed(m))  # the cream sticker rim
    im.paste((58, 52, 54, 255), mask=m)  # the creature, as sprite() draws it
    return im
sketch(legs()).save(out + '/legs-sil.png')
sprite(legs()).save(out + '/legs.png')
rim_sprite(legs()).save(out + '/legs-rim.png')
# the same with a 1 px non-cream fringe outside the rim (a despilled key edge)
fr = rim_sprite(legs())
edge = rimmed(rimmed(legs()), 0.0023)
fr2 = Image.new('RGBA', (W, W), (0, 0, 0, 0)); fr2.paste((140, 170, 120, 255), mask=edge); fr2.alpha_composite(fr)
fr2.save(out + '/legs-fringe.png')
sketch(turned()).save(out + '/legs45-sil.png')
rim_sprite(turned()).save(out + '/legs45-rim.png')
board('band5', 5, CREAM)
board('band7', 7, CREAM)
board('mass43', 5, (102, 102, 102), CREAM)
board('mass38', 5, (90, 90, 90), CREAM)
board('halves', 5, (47, 47, 55), CREAM)

# raws for post.py, keyed on green: a U (two fronds joined at the bottom) of cream body in a 6 px
# ink outline in a 12 px white sticker rim; the rim fills the notch between the fronds
def grow(m, px):
    from PIL import ImageFilter
    return m.filter(ImageFilter.MaxFilter(2 * px + 1))
u = Image.new('L', (400, 400), 0); d = ImageDraw.Draw(u)
d.rectangle([110, 80, 175, 300], fill=255)
d.rectangle([195, 80, 260, 300], fill=255)
d.rectangle([110, 250, 260, 300], fill=255)
raw = Image.new('RGB', (400, 400), (0, 255, 0))
raw.paste((255, 250, 242), (0, 0), grow(u, 18))
raw.paste((43, 29, 46), (0, 0), grow(u, 6))
raw.paste((243, 234, 220), (0, 0), u)
raw.save(out + '/rim-u.png')
# no outline at all: a cream disc in a white rim (a flood would eat it whole)
disc = Image.new('L', (400, 400), 0); ImageDraw.Draw(disc).ellipse([100, 100, 300, 300], fill=255)
raw = Image.new('RGB', (400, 400), (0, 255, 0))
raw.paste((255, 250, 242), (0, 0), grow(disc, 12))
raw.paste((243, 234, 220), (0, 0), disc)
raw.save(out + '/rim-disc.png')
# a soft edge for trim: an opaque block and one row at alpha 128 (on a transparent canvas)
im = Image.new('RGBA', (100, 100), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rectangle([20, 20, 69, 69], fill=(200, 100, 50, 255))
d.rectangle([20, 70, 69, 70], fill=(200, 100, 50, 128))
im.save(out + '/soft.png')
# a dark foe in a 6 px ink outline and a white sticker rim, with a cream belly that meets the
# outline where a 4 px slot is missing from it (a missed stroke): the rim flood reaches the belly
import numpy as np
from PIL import ImageFilter
shape = Image.new('L', (600, 600), 0); ImageDraw.Draw(shape).ellipse([120, 150, 480, 450], fill=255)
belly = Image.new('L', (600, 600), 0); ImageDraw.Draw(belly).ellipse([200, 330, 400, 470], fill=255)
inner = shape.filter(ImageFilter.MinFilter(13))
raw = Image.new('RGB', (600, 600), (0, 255, 0))
raw.paste((255, 250, 242), (0, 0), grow(shape, 14))
raw.paste((43, 29, 46), (0, 0), shape)
raw.paste((58, 52, 54), (0, 0), inner)
raw.paste((243, 234, 220), (0, 0), Image.fromarray(((np.asarray(belly) > 0) & (np.asarray(inner) > 0)).astype('uint8') * 255))
ImageDraw.Draw(raw).rectangle([298, 440, 302, 452], fill=(243, 234, 220))
raw.save(out + '/rim-gap.png')
# the same foe without a rim and with a gap as wide as the belly's tip: too wide for the neck guard
raw = Image.new('RGB', (600, 600), (0, 255, 0))
raw.paste((43, 29, 46), (0, 0), shape)
raw.paste((58, 52, 54), (0, 0), inner)
raw.paste((243, 234, 220), (0, 0), Image.fromarray(((np.asarray(belly) > 0) & (np.asarray(inner) > 0)).astype('uint8') * 255))
ImageDraw.Draw(raw).rectangle([288, 438, 312, 453], fill=(243, 234, 220))
raw.save(out + '/rim-widegap.png')
`;

// read back pixels: a tiny PIL helper prints JSON
const PEEK = String.raw`
import sys, json
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float)
rgb = a[..., :3] / 255.0
lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
y = lin @ np.array([0.2126, 0.7152, 0.0722])
L = np.where(y > 216 / 24389, np.cbrt(y), (24389 / 27 * y + 16) / 116) * 116 - 16
seen = a[..., 3] > 20
clear = ~seen
near = np.zeros_like(clear)
near[1:, :] |= clear[:-1, :]; near[:-1, :] |= clear[1:, :]; near[:, 1:] |= clear[:, :-1]; near[:, :-1] |= clear[:, 1:]
edge = seen & near
h, w = seen.shape
print(json.dumps({
    "size": [w, h],
    "edgeLight": int((edge & (L > 70)).sum()),
    "edgeDark": round(float((edge & (L < 50)).sum() / max(1, edge.sum())), 3),
    "light": round(float((seen & (L > 70)).sum() / max(1, seen.sum())), 3),
    "centre": a[h // 2, w // 2].tolist(),
    "pixel": a[int(sys.argv[3]), int(sys.argv[2])].tolist() if len(sys.argv) > 3 else None,
}))
`;

let dir;
const py = (code, ...args) => JSON.parse(execFileSync('python3', ['-c', code, ...args], { encoding: 'utf8' }));
const gate = (spec) => JSON.parse(execFileSync('python3', [join(root, 'tools', 'silhouette-check.py')], { input: JSON.stringify(spec), encoding: 'utf8' }));
const post = (src, dst, ...flags) => JSON.parse(execFileSync('python3', [join(root, 'tools', 'post.py'), join(dir, src), join(dir, dst), ...flags], { encoding: 'utf8' }).trim().split('\n').pop());
const f = (name) => join(dir, `${name}.png`);

test.before(() => {
  if (skip) return;
  dir = mkdtempSync(join(tmpdir(), 'gates-'));
  writeFileSync(join(dir, 'draw.py'), DRAW);
  execFileSync('python3', [join(dir, 'draw.py'), dir]);
});
test.after(() => dir && rmSync(dir, { recursive: true, force: true }));

test('silhouette-check: contract IoU, mirror fitted without an offset, twins per marching chapter, one bad candidate', { skip }, () => {
  const spec = {
    contract: f('contract'),
    view: 'profile',
    chapter: 'forest',
    chapters: ['forest'],
    grounds: { lane: '#D9C7A3', keep: '#3E3C58' },
    others: [
      { id: 'enemy.mirrorTwin', path: f('flipped'), mask: 'alpha', chapters: ['peaks'] },
      { id: 'enemy.bar', path: f('other-sil'), mask: 'dark', chapters: ['forest'] },
    ],
    allies: [],
    candidates: [f('same'), f('flipped'), f('other'), f('missing')],
  };
  const res = gate(spec);
  assert.equal(res.gateVersion, 3);
  const [same, flipped, other, missing] = res.results;
  assert.equal(same.contract40, 1, 'its own silhouette fills the contract');
  assert.equal(same.mirror, false);
  assert.equal(flipped.mirror, true, 'a profile drawn facing right is caught');
  assert.equal(flipped.contract40, 1, 'and mirrored before it is fitted, it matches exactly (no 1 px offset)');
  assert.equal(flipped.contract120, 1);
  assert.ok(other.contract40 < 0.5, `another animal misses the contract (${other.contract40})`);
  assert.ok(other.margins.contract < 0 && other.pass === false);
  assert.deepEqual(same.twin, [1, 'enemy.mirrorTwin'], 'a twin counts either way round');
  assert.equal(same.twinChapter[1], 'enemy.bar', 'the mirror twin marches in another chapter');
  assert.ok(same.twinChapter[0] < 0.5);
  assert.match(missing.error, /FileNotFoundError|No such file/);
  assert.equal(res.best, 0, 'the unreadable candidate is skipped, the others still scored');
  // the same foe also marching in the peaks now shares a wave with its mirror twin
  const both = gate({ ...spec, chapters: ['forest', 'peaks'], candidates: [f('same')] }).results[0];
  assert.deepEqual(both.twinChapter, [1, 'enemy.mirrorTwin']);
  assert.ok(both.margins.twinChapter < 0);
  // a front view is never mirrored
  const front = gate({ ...spec, view: 'front', candidates: [f('flipped')] }).results[0];
  assert.equal(front.mirror, false);
  assert.ok(front.contract40 < 1);
  // an ally with the same outline
  const ally = gate({ ...spec, allies: [f('same')], candidates: [f('flipped')] }).results[0];
  assert.deepEqual(ally.ally, [1, 'same']);
  assert.ok(ally.margins.ally < 0);
});

test('silhouette-check: the outline band is about the outline (1%), dark is L* <= 40, grounds count what steps 20 L* away', { skip }, () => {
  const spec = { contract: f('contract'), view: 'front', chapter: 'forest', grounds: { lane: '#D9C7A3', keep: '#3E3C58' }, others: [], allies: [] };
  const [band5, band7, mass43, mass38, halves] = gate({ ...spec, candidates: ['band5', 'band7', 'mass43', 'mass38', 'halves'].map(f) }).results;
  // 512 px: the band is 5 px, so a 5 px ink frame is all outline and a 7 px one leaves 2 px of ink in the body
  assert.ok(band5.dark < 0.002, `a 5 px outline is not body (${band5.dark})`);
  assert.ok(band5.light > 0.99);
  assert.ok(band7.dark > 0.005, `a 7 px outline is wider than the band (${band7.dark})`);
  assert.ok(mass43.dark < 0.01 && Math.abs(mass43.light - 0.5) < 0.02, `L* 43 is not the dark mass (${mass43.dark})`);
  assert.ok(Math.abs(mass38.dark - 0.5) < 0.02, `L* 38 is (${mass38.dark})`);
  // half ink-dark (L* 20), half cream (L* 93): on the keep only the cream separates, on the lane only the dark
  assert.ok(Math.abs(halves.ground.keep - 0.5) < 0.02, `keep ${halves.ground.keep}`);
  assert.ok(Math.abs(halves.ground.lane - 0.5) < 0.02, `lane ${halves.ground.lane}`);
  assert.equal(halves.margins.ground, Math.round((halves.ground.keep - 1 / 3) * 1000) / 1000, 'the ground gate is a third (the prompt: a third cream)');
});

test('silhouette-check: a hero’s cream rim is not its silhouette (`rim`), for it, for the pets made so far and for hero allies', { skip }, () => {
  const spec = { contract: f('legs-sil'), view: 'front', chapters: [], grounds: {}, others: [], allies: [] };
  const [bare] = gate({ ...spec, candidates: [f('legs-rim')] }).results;
  const [stripped] = gate({ ...spec, rim: 0.02, candidates: [f('legs-rim')] }).results;
  assert.ok(stripped.contract40 >= 0.95, `a perfect fill plus a round 2 % rim fills its contract once the rim goes (${stripped.contract40})`);
  assert.ok(bare.contract40 < stripped.contract40 - 0.1, `with the rim counted, thin legs read as thick ones (${bare.contract40})`);
  // the rim is round and is stripped with a round tool: diagonal limbs keep their width
  const [turned] = gate({ ...spec, contract: f('legs45-sil'), rim: 0.02, candidates: [f('legs45-rim')] }).results;
  assert.ok(turned.contract40 >= 0.95, `the same animal turned 45 degrees (${turned.contract40})`);
  // the rim is measured, not assumed: a sprite drawn without one keeps its own thin legs
  const [rimless] = gate({ ...spec, rim: 0.02, candidates: [f('legs')] }).results;
  assert.ok(rimless.contract40 >= 0.95, `a rimless perfect fill is not eroded (${rimless.contract40})`);
  assert.equal(rimless.rimPx, 0, 'and says so');
  assert.equal(stripped.rimPx, 9, 'the 9 px rim it carries');
  const [fringe] = gate({ ...spec, rim: 0.02, candidates: [f('legs-fringe')] }).results;
  assert.ok(fringe.rimPx >= 9 && fringe.contract40 >= 0.95, `a soft key fringe outside the rim is passed over (${fringe.rimPx} px, ${fringe.contract40})`);
  // pool entries carry their own rim: a pet made so far and a hero ally are compared without theirs
  const rimmed = { path: f('legs-rim'), mask: 'alpha', rim: 0.02 };
  const pools = gate({ ...spec, rim: 0.02, others: [{ id: 'fusion.made', chapters: [], ...rimmed }], allies: [{ id: 'pet.ice.128', ...rimmed }], candidates: [f('legs-rim')] }).results[0];
  assert.ok(pools.twin[0] >= 0.95 && pools.twin[1] === 'fusion.made', `the same pet, rims stripped on both sides (${pools.twin})`);
  assert.ok(pools.ally[0] >= 0.95 && pools.ally[1] === 'pet.ice.128', `a hero ally, its rim stripped (${pools.ally})`);
  const plain = gate({ ...spec, rim: 0.02, allies: [f('legs-rim')], candidates: [f('legs-rim')] }).results[0];
  assert.ok(plain.ally[0] < 0.9 && plain.ally[1] === 'legs-rim', `an ally given as a bare path keeps what it has (${plain.ally})`);
});

test('silhouette-check: a pet’s band covers its cream rim and outline; with no chapter its marching pool is empty', { skip }, () => {
  // band7 at 512 px: a 7 px ink frame; the pets' band (3.5 %, 18 px) takes all of it and 11 px of cream
  const spec = { contract: f('contract'), view: 'front', chapters: [], grounds: { lane: '#D9C7A3', keep: '#3E3C58' }, allies: [] };
  const others = [{ id: 'fusion.twin', path: f('same'), mask: 'alpha', chapters: [] }];
  const [pet] = gate({ ...spec, band: 0.035, others, candidates: [f('band7')] }).results;
  const [foe] = gate({ ...spec, others, candidates: [f('band7')] }).results;
  assert.ok(foe.dark > 0.005, `the foes' 1 % band leaves ink in the body (${foe.dark})`);
  assert.ok(pet.dark < 0.002, `the pets' band does not (${pet.dark})`);
  assert.deepEqual(pet.twinChapter, [0, null], 'no chapter: nothing marches with it');
  assert.equal(pet.margins.twinChapter, 0.55);
  assert.ok(pet.twin[1] === 'fusion.twin', 'the twin gate still sees every other pet');
});

test('post.py --strip-rim: the rim outside the outline goes, notch and all; a light body inside the outline stays', { skip }, () => {
  const qa = post('rim-u.png', 'rim-u.out.png', '--bg', 'green', '--size', '256', '--fit', 'trim', '--strip-rim');
  assert.equal(qa.rim_mode, 'flood');
  assert.ok(qa.rim_share > 0.2 && qa.rim_share < 0.3, `the rim is the band around the U (${qa.rim_share})`);
  const p = py(PEEK, join(dir, 'rim-u.out.png'));
  assert.equal(p.edgeLight, 0, 'no light pixel left on the cut-out edge');
  assert.ok(p.edgeDark > 0.95, `the ink outline is the edge (${p.edgeDark})`);
  assert.ok(p.centre[3] <= 20, 'the rim filling the notch between the fronds is gone');
  assert.ok(p.light > 0.6, `the cream body inside the outline is kept (${p.light} of the sprite)`);
});

test('post.py --strip-rim: a light belly behind a gap in the outline stays; the rim around it goes', { skip }, () => {
  const qa = post('rim-gap.png', 'rim-gap.out.png', '--bg', 'green', '--size', '512', '--fit', 'trim', '--strip-rim');
  assert.equal(qa.rim_mode, 'flood');
  assert.ok(qa.rim_kept > 10000, `the belly behind the neck is kept (${qa.rim_kept} px)`);
  assert.ok(qa.rim_share > 0.15 && qa.rim_share < 0.25, `only the rim band goes (${qa.rim_share})`);
  const p = py(PEEK, join(dir, 'rim-gap.out.png'));
  assert.ok(p.light > 0.15, `the cream belly is still in the sprite (light share ${p.light})`);
  assert.ok(p.edgeDark > 0.8, `the outline is the edge again (${p.edgeDark})`);
});

test('post.py --strip-rim: a belly behind a gap too wide for the neck guard is not taken for rim: peeled at most, and QA fails', { skip }, () => {
  const qa = post('rim-widegap.png', 'rim-widegap.out.png', '--bg', 'green', '--size', '512', '--fit', 'trim', '--strip-rim');
  assert.equal(qa.rim_mode, 'peel');
  assert.ok(qa.rim_body > 0, 'the band held a body-sized disc');
  assert.equal(qa.ok, false, 'QA fails: the pipeline retries the image or flags the asset');
  const p = py(PEEK, join(dir, 'rim-widegap.out.png'));
  assert.ok(p.light > 0.15, `the cream belly is still in the sprite (light share ${p.light})`);
});

test('post.py --strip-rim: without an outline the flood would eat the body, so the capped peel runs', { skip }, () => {
  const qa = post('rim-disc.png', 'rim-disc.out.png', '--bg', 'green', '--size', '256', '--fit', 'trim', '--strip-rim');
  assert.equal(qa.rim_mode, 'peel', 'the leak guard');
  const p = py(PEEK, join(dir, 'rim-disc.out.png'));
  assert.ok(p.centre[3] > 200 && p.light > 0.95, 'the cream disc is still there');
  assert.ok(qa.coverage > 0.5, `most of it (${qa.coverage})`);
});

test('post.py trim: a soft edge keeps its alpha and colour (no self-masked paste)', { skip }, () => {
  const qa = post('soft.png', 'soft.out.png', '--bg', 'none', '--size', '55', '--fit', 'trim');
  assert.deepEqual(qa.size, [54, 55], 'trimmed to 50 × 51 plus a 2 px pad, not resized');
  const p = py(PEEK, join(dir, 'soft.out.png'), '20', '52');
  const [r, g, b, a] = p.pixel;
  assert.equal(a, 128, 'the alpha is kept, not squared');
  assert.deepEqual([r, g, b], [200, 100, 50], 'the colour is kept, not darkened');
});

// The hit flash's light share (src/ux/photosafe.js FOE_FLASH) is measured on the foes as shipped:
// each sprite fills its square (foeDrawSize); its white silhouette at FOE_FLASH.alpha in normal
// blend (mixed in gamma space, as WebGL does) lights a pixel when its relative luminance rises by
// 10% or more from below 0.8 (WCAG's general flash). The share must cover every foe on every ground.
const FLASH = String.raw`
import sys, json
import numpy as np
from PIL import Image
alpha, grounds, paths = float(sys.argv[1]), json.loads(sys.argv[2]), sys.argv[3:]
def lum(srgb):
    c = srgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return c @ np.array([0.2126, 0.7152, 0.0722])
out = {}
for p in paths:
    a = np.asarray(Image.open(p).convert('RGBA')).astype(float)
    side = max(a.shape[0], a.shape[1])
    k = a[..., 3:] / 255.0
    worst = 0.0
    for g in grounds:
        ground = np.array([int(g[i:i + 2], 16) for i in (1, 3, 5)], float)
        before = a[..., :3] * k + ground * (1 - k)
        after = before * (1 - alpha * k) + 255.0 * alpha * k
        yb, ya = lum(before), lum(after)
        lit = ((ya - yb) >= 0.1) & (yb < 0.8)
        worst = max(worst, float(lit.sum()) / (side * side))
    out[p.rsplit('/', 1)[-1]] = round(worst, 4)
print(json.dumps(out))
`;

test('FOE_FLASH.share covers the hit flash of every shipped foe on every ground', { skip }, async () => {
  const { FOE_FLASH } = await import('../src/ux/photosafe.js');
  const { CHAPTER_SKINS } = await import('../src/art/frame-kit.js');
  const { FOE_ROSTER } = await import('../src/art/foe-roster.js');
  const grounds = [...new Set(Object.values(CHAPTER_SKINS).flatMap((s) => [s.lane, s.hedge, s.floor]))];
  const paths = Object.keys(FOE_ROSTER).map((k) => join(root, 'public', 'assets', 'gen', `enemy.${k}.png`));
  const shares = py(FLASH, String(FOE_FLASH.alpha), JSON.stringify(grounds), ...paths);
  const [worstFoe, worst] = Object.entries(shares).sort((x, y) => y[1] - x[1])[0];
  assert.ok(worst <= FOE_FLASH.share, `${worstFoe} lights ${worst} of its square; FOE_FLASH.share books ${FOE_FLASH.share}`);
  assert.ok(worst > FOE_FLASH.share - 0.1, `the share stays close to the brightest foe (${worst}), so the budget is not wasted`);
});
