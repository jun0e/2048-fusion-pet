#!/usr/bin/env python3
"""Silhouette and figure-ground gates for generated foes (the visual overhaul, proposal 7.2-7.3).

The pipeline (tools/pipeline.mjs) scores every candidate of a gated job with this script and keeps
the best. One JSON spec on stdin, one JSON result on stdout:

  {"contract": "tools/refs/foes/sil-moth.png", "view": "spread", "chapter": "forest",
   "chapters": ["forest", "fareast"],
   "grounds": {"lane": "#D9C7A3", "hedge": "#4A5A52", "keep": "#3E3C58", "fareast.hedge": "#3F5A48"},
   "others": [{"id": "enemy.ninja", "path": "...png", "mask": "dark" | "alpha", "chapters": ["fareast"]}],
   "allies": ["public/assets/gen/fusion.fire+ice.png", ...],
   "candidates": ["tools/.cache/pipeline/cand/enemy.pixie~1.png", ...]}

`chapters` lists every chapter the foe marches in (its pool, its boss, a boss's summons); without
it, `chapter` alone. The grounds are those of all of them.

Per candidate (a keyed sprite with alpha):
  contract    IoU against its own silhouette at 40 px and 120 px; `mirror` is true when the
              candidate matches its contract much better flipped (a profile drawn facing right).
              A flip mirrors the full-size mask before it is fitted, so it has no 1 px offset.
  twin        the closest other foe (sprite or sketch) at 40 px, flip allowed; `twinChapter` among
              the foes that march in a chapter with it
  ally        the closest roaming fusion at 40 px, flip allowed
  ground      per ground, the share of the body whose L* differs from it by >= 20
  light, dark the two-value shares of the body (L* >= 75, L* <= 40)
The body is the opaque pixels minus the outline band along the cut-out edge (OUTLINE_BAND of the
longest side: the plum outline measured 0.7-1.2 %).
Gates: contract40 >= 0.6, twin <= 0.60, twinChapter <= 0.55, ally <= 0.65, every ground >= 1/3.
The ground gate is the prompt's value rule ("at least a third of the creature is cream"): on the
dark grounds (the keep floor L* 27, the hedges L* 32-37) only the cream zone steps 20 L* away, so
a foe that is exactly a third cream scores about 1/3 there (it was 0.4, stricter than the prompt:
the Moonmoth, a third cream, failed the keep at 0.38).
`margins` gives each gate's slack (negative = overrun), `worst` the smallest and `pass` whether
all hold; `score` ranks the candidates (contract fit and the weakest ground, minus 4x every
overrun) and `best` is its argmax. A candidate that cannot be scored gets `error` instead, and
the others are still scored. `gateVersion` stamps the rules (2: this file).

usage: python3 tools/silhouette-check.py < spec.json
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

GATE_VERSION = 2
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


def body_lightness(path):
    """L* of the body: opaque pixels minus the outline band along the cut-out edge. The band is
    found by distance, not by darkness, so a dark navy or charcoal mass still counts as body."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float64)
    opaque = a[..., 3] > 200
    band = max(1, round(max(im.size) * OUTLINE_BAND))
    clear = Image.fromarray(((a[..., 3] <= 200) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * band + 1))
    return lightness(a[..., :3])[opaque & (np.asarray(clear) == 0)]


def chapters_of(o):
    return set(o.get("chapters") or ([o["chapter"]] if o.get("chapter") else []))


def score(path, spec, contract, others40, chapter_ids, allies40):
    (c40, c40m), (c120, c120m) = contract
    mask = raw_mask(path, "alpha")
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
    body = body_lightness(path)
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
    others40 = {o["id"]: fit_both(raw_mask(o["path"], o.get("mask", "alpha")), 40) for o in spec.get("others", [])}
    mine = chapters_of(spec)
    chapter_ids = {o["id"] for o in spec.get("others", []) if chapters_of(o) & mine}
    allies40 = {p.rsplit("/", 1)[-1][:-4]: fit_both(raw_mask(p, "alpha"), 40) for p in spec.get("allies", [])}
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
