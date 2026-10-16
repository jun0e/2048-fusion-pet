#!/usr/bin/env python3
"""Silhouette and figure-ground gates for generated foes (the visual overhaul, proposal 7.2-7.3)
and fusion pets (reports/art/fusion-matrix/pipeline-plan.md).

The pipeline (tools/pipeline.mjs) scores every candidate of a gated job with this script and keeps
the best. One JSON spec on stdin, one JSON result on stdout:

  {"contract": "tools/refs/foes/sil-moth.png", "view": "spread", "chapter": "forest",
   "chapters": ["forest", "fareast"],
   "grounds": {"lane": "#D9C7A3", "hedge": "#4A5A52", "keep": "#3E3C58", "fareast.hedge": "#3F5A48"},
   "others": [{"id": "enemy.ninja", "path": "...png", "mask": "dark" | "alpha", "chapters": ["fareast"]}],
   "allies": ["public/assets/gen/fusion.fire+ice.png", ...],
   "candidates": ["tools/.cache/pipeline/cand/enemy.pixie~1.png", ...]}

`chapters` lists every chapter the foe marches in (its pool, its boss, a boss's summons); without
it, `chapter` alone. The grounds are those of all of them. A pet has no chapter (an empty
`twinChapter` pool), the other fusions as `others`, the foes and the base pets as `allies`,
`"band": 0.035` (its cream rim and outline are not body, for the ground gate) and `"rim": 0.02`:
a hero's cream sticker rim is not its silhouette, so its mask is shrunk by the rim before any
fitting (the sketches and the foes have none). The rim is measured on the sprite (its outer layers
while they are cream, past one soft fringe, at most `rim` of its longest side), so a sprite drawn
without one keeps its outline; `rimPx` reports what was stripped (0 on a hero is worth a look).
An `others` or `allies` entry may carry its own `rim` (an ally may also be {"path", "rim"}): the
pets made so far and the base pets do.

Per candidate (a keyed sprite with alpha):
  contract    IoU against its own silhouette at 40 px and 120 px; `mirror` is true when the
              candidate matches its contract much better flipped (a profile drawn facing right).
              A flip mirrors the full-size mask before it is fitted, so it has no 1 px offset.
  twin        the closest other foe (sprite or sketch) at 40 px, flip allowed; `twinChapter` among
              the foes that march in a chapter with it
  ally        the closest ally at 40 px, flip allowed (for a foe the roaming fusions; for a pet
              the foes and the base pets)
  ground      per ground, the share of the body whose L* differs from it by >= 20
  light, dark the two-value shares of the body (L* >= 75, L* <= 40)
The body is the opaque pixels minus the outline band along the cut-out edge (OUTLINE_BAND of the
longest side: the plum outline measured 0.7-1.2 %; `band` overrides it).
Gates: contract40 >= 0.6, twin <= 0.60, twinChapter <= 0.55, ally <= 0.65, every ground >= 1/3.
The ground gate is the prompt's value rule ("at least a third of the creature is cream"): on the
dark grounds (the keep floor L* 27, the hedges L* 32-37) only the cream zone steps 20 L* away, so
a foe that is exactly a third cream scores about 1/3 there (it was 0.4, stricter than the prompt:
the Moonmoth, a third cream, failed the keep at 0.38).
`margins` gives each gate's slack (negative = overrun), `worst` the smallest and `pass` whether
all hold; `score` ranks the candidates (contract fit and the weakest ground, minus 4x every
overrun) and `best` is its argmax. A candidate that cannot be scored gets `error` instead, and
the others are still scored. `gateVersion` stamps the rules (3: this file; 2 had no `rim` and
judged pets on the keep floor).

usage: python3 tools/silhouette-check.py < spec.json
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

GATE_VERSION = 3
GATES = {"contract": 0.6, "twin": 0.60, "twinChapter": 0.55, "ally": 0.65, "ground": 1 / 3}
SEP_DL = 20  # a body pixel separates from a ground when its L* differs by this much
OUTLINE_BAND = 0.01  # the plum outline: opaque pixels this close to the edge (share of the longest side)
LIGHT, DARK = 75, 40  # the two values (proposal 7.3): the cream zone L* >= 75, the dark mass L* <= 40


def fit(mask, box):
    ys, xs = np.where(mask)
    if not len(ys):
        return np.zeros((box, box), bool)
    m = mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    a = Image.fromarray((m * 255).astype("uint8"))
    k = box / max(a.size)
    a = a.resize((max(1, round(a.width * k)), max(1, round(a.height * k))), Image.LANCZOS)
    o = Image.new("L", (box, box), 0)
    o.paste(a, ((box - a.width) // 2, (box - a.height) // 2))
    return np.asarray(o) > 96


def fit_both(mask, box):
    """The mask fitted as it is and mirrored (mirrored at full size, then fitted)."""
    return fit(mask, box), fit(mask[:, ::-1], box)


def raw_mask(path, kind):
    im = Image.open(path)
    if kind == "dark":  # black-on-white silhouette sketches
        return np.asarray(im.convert("L")) < 100
    return np.asarray(im.convert("RGBA").split()[3]) > 96


def disk(r):
    """The offsets of a disk of radius r: a sticker rim is round, so it is stripped with a round tool."""
    return [(dy, dx) for dy in range(-r, r + 1) for dx in range(-r, r + 1) if dy * dy + dx * dx <= r * r]


def erode(mask, r):
    """The mask eroded by a disk of radius r."""
    if r <= 0:
        return mask
    h, w = mask.shape
    pad = np.pad(mask, r, constant_values=False)
    out = np.ones_like(mask)
    for dy, dx in disk(r):
        out &= pad[r + dy : r + dy + h, r + dx : r + dx + w]
    return out


RIM_LIGHT = 88  # a cream rim pixel is at least this light (the rim is #FFFAF2, L* 98)


def rim_width(rgb, mask, cap):
    """How many px of cream sticker rim a sprite's edge carries, at most `cap`: its outer 1-px layers
    are read while each is mostly cream, the plum outline under the rim stops them, and one soft
    layer outside the rim (a despilled key fringe) is passed over. A sprite drawn without a rim (or
    with a thin one) keeps its own outline."""
    light = lightness(rgb) >= RIM_LIGHT
    cream = []
    m = mask
    for _ in range(cap + 1):
        inner = erode(m, 1)
        layer = m & ~inner
        cream.append(bool(layer.any()) and light[layer].mean() >= 0.5)
        m = inner
    start = 1 if not cream[0] and cream[1] else 0
    k = start
    while k < cap and cream[k]:
        k += 1
    return k if k > start else 0


def strip_rim(mask, share, rgb=None):
    """The mask without a hero's cream sticker rim, and how wide the stripped rim was (px): eroded by
    a disk as wide as the rim it carries (measured on `rgb`; at most `share` of the creature's
    longest side, its bounding box), so a pet is compared by its own outline, as the sketches and
    the foes are. A square tool would cut diagonal limbs and tips too deep."""
    if not share or not mask.any():
        return mask, 0
    ys, xs = np.where(mask)
    cap = max(1, round(max(ys.max() - ys.min(), xs.max() - xs.min()) * share))
    px = rim_width(rgb, mask, cap) if rgb is not None else cap
    return erode(mask, px), px


def rgba_mask(path, share):
    """A sprite's alpha mask with its measured rim stripped (`share` caps it), and the rim's width in px."""
    im = np.asarray(Image.open(path).convert("RGBA")).astype(np.float64)
    return strip_rim(im[..., 3] > 96, share, im[..., :3])


def sprite_mask(entry):
    """A pool entry's mask: a path (a sketch or a sprite), or {"path", "mask", "rim"}."""
    if isinstance(entry, str):
        return raw_mask(entry, "alpha")
    if entry.get("mask", "alpha") != "alpha":
        return raw_mask(entry["path"], entry["mask"])
    return rgba_mask(entry["path"], entry.get("rim", 0))[0]


def entry_id(entry):
    return entry.rsplit("/", 1)[-1][:-4] if isinstance(entry, str) else entry.get("id") or entry["path"].rsplit("/", 1)[-1][:-4]


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


def closest(m, pool):
    """The pool entry most like m, either way round: [IoU, id]."""
    best = (0.0, None)
    for k, (straight, mirrored) in pool.items():
        x = max(iou(m, straight), iou(m, mirrored))
        if x > best[0]:
            best = (x, k)
    return [round(best[0], 3), best[1]]


def hex_rgb(h):
    return np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], dtype=np.float64)


def lightness(rgb):
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    y = c @ np.array([0.2126, 0.7152, 0.0722])
    f = np.where(y > 216 / 24389, np.cbrt(y), (24389 / 27 * y + 16) / 116)
    return 116 * f - 16


def body_lightness(path, band_share=OUTLINE_BAND):
    """L* of the body: opaque pixels minus the outline band along the cut-out edge. The band is
    found by distance, not by darkness, so a dark navy or charcoal mass still counts as body."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float64)
    opaque = a[..., 3] > 200
    band = max(1, round(max(im.size) * band_share))
    clear = Image.fromarray(((a[..., 3] <= 200) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * band + 1))
    return lightness(a[..., :3])[opaque & (np.asarray(clear) == 0)]


def chapters_of(o):
    return set(o.get("chapters") or ([o["chapter"]] if o.get("chapter") else []))


def score(path, spec, contract, others40, chapter_ids, allies40):
    (c40, c40m), (c120, c120m) = contract
    mask, rim_px = rgba_mask(path, spec.get("rim", 0))
    m40, m40m = fit_both(mask, 40)
    straight, flipped = iou(m40, c40), iou(m40m, c40)
    mirror = spec.get("view") == "profile" and flipped > straight + 0.05
    if mirror:  # judged as it will ship: mirrored
        m40 = m40m
        m120 = fit(mask[:, ::-1], 120)
    else:
        m120 = fit(mask, 120)
    k40 = iou(m40, c40)
    k120 = iou(m120, c120)
    twin = closest(m40, others40)
    twin_ch = closest(m40, {k: v for k, v in others40.items() if k in chapter_ids})
    ally = closest(m40, allies40)
    body = body_lightness(path, spec.get("band", OUTLINE_BAND))
    ground = {}
    for name, hx in spec.get("grounds", {}).items():
        g = float(lightness(hex_rgb(hx)))
        ground[name] = round(float((np.abs(body - g) >= SEP_DL).mean()) if len(body) else 0.0, 3)
    weakest = min(ground.values(), default=1.0)
    # slack per gate: positive = inside the gate, negative = how far past it
    margins = {
        "contract": round(k40 - GATES["contract"], 3),
        "twin": round(GATES["twin"] - twin[0], 3),
        "twinChapter": round(GATES["twinChapter"] - twin_ch[0], 3),
        "ally": round(GATES["ally"] - ally[0], 3),
        "ground": round(weakest - GATES["ground"], 3),
    }
    gates = {k: v >= 0 for k, v in margins.items()}
    # rank by how exactly the contract was filled and how well the weakest ground reads, minus a
    # penalty in proportion to each gate's overrun (a 0.01 miss costs 0.04, not a whole gate)
    penalty = 4 * sum(-v for v in margins.values() if v < 0)
    return {
        "path": path,
        "gateVersion": GATE_VERSION,
        "contract40": round(k40, 3),
        "contract120": round(k120, 3),
        "mirror": bool(mirror),
        "rimPx": int(rim_px),
        "twin": twin,
        "twinChapter": twin_ch,
        "ally": ally,
        "ground": ground,
        "light": round(float((body >= LIGHT).mean()) if len(body) else 0.0, 3),
        "dark": round(float((body <= DARK).mean()) if len(body) else 0.0, 3),
        "gates": gates,
        "margins": margins,
        "worst": min(margins.values()),
        "pass": all(gates.values()),
        "score": round(k40 + 0.5 * k120 + 0.25 * weakest - penalty, 4),
    }


def main():
    spec = json.load(sys.stdin)
    craw = raw_mask(spec["contract"], "dark")
    contract = (fit_both(craw, 40), fit_both(craw, 120))
    others40 = {o["id"]: fit_both(sprite_mask(o), 40) for o in spec.get("others", [])}
    mine = chapters_of(spec)
    chapter_ids = {o["id"] for o in spec.get("others", []) if chapters_of(o) & mine}
    allies40 = {entry_id(a): fit_both(sprite_mask(a), 40) for a in spec.get("allies", [])}
    results = []
    for p in spec["candidates"]:
        try:
            results.append(score(p, spec, contract, others40, chapter_ids, allies40))
        except Exception as e:  # one unreadable candidate must not cost the others their scores
            results.append({"path": p, "gateVersion": GATE_VERSION, "error": f"{type(e).__name__}: {e}"})
    ok = [i for i, r in enumerate(results) if "error" not in r]
    best = max(ok, key=lambda i: results[i]["score"]) if ok else None
    json.dump({"gateVersion": GATE_VERSION, "results": results, "best": best}, sys.stdout)
    print()


if __name__ == "__main__":
    main()
