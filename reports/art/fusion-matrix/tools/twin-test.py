#!/usr/bin/env python3
"""The 40 px silhouette twin test for the 28 fusion contracts (and the 28 sprites that ship today).

Masks are trimmed to their bounding box and fitted into a 40 px square (the twin size of
tools/silhouette-check.py); IoU is taken either way round (flip allowed), as the renderer flips
pets by direction. For every fusion contract it reports the closest:
  twin     other fusion contract                              target <= 0.60
  foe      foe contract in tools/refs/foes/sil-*.png           target <= 0.65
  pet      base pet sprite public/assets/gen/pet.<el>.128.png  target <= 0.65
and, as the baseline, the same test on today's public/assets/gen/fusion.*.png sprites (twin among
themselves, closest foe contract, closest base pet). Writes <matrix>/twin-test.json and prints
the two tables. Needs Pillow + NumPy (/usr/bin/python3).

usage: /usr/bin/python3 twin-test.py
"""
import glob
import json
import os
import statistics

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = os.path.dirname(HERE)
WORKTREE = os.path.abspath(os.path.join(MATRIX, "..", "..", ".."))
CONTRACTS = os.path.join(MATRIX, "contracts")
FOES = os.path.join(WORKTREE, "tools", "refs", "foes")
GEN = os.path.join(WORKTREE, "public", "assets", "gen")
ELEMENTS = ["fire", "ice", "lightning", "poison", "earth", "wind", "metal", "nature"]
TARGETS = {"twin": 0.60, "foe": 0.65, "pet": 0.65}


def fit(mask, box=40):
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


def mask_alpha(path):
    return np.asarray(Image.open(path).convert("RGBA").split()[3]) > 96


def mask_dark(path):
    return np.asarray(Image.open(path).convert("L")) < 100


def both(mask):
    return fit(mask), fit(mask[:, ::-1])


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


def closest(m, pool, skip=None):
    best = (0.0, None)
    for k, (s, f) in pool.items():
        if k == skip:
            continue
        x = max(iou(m, s), iou(m, f))
        if x > best[0]:
            best = (round(x, 3), k)
    return list(best)


def main():
    fus = {}
    for p in sorted(glob.glob(os.path.join(CONTRACTS, "sil-*.png"))):
        fus[os.path.basename(p)[4:-4]] = both(mask_dark(p))
    foes = {os.path.basename(p)[4:-4]: both(mask_dark(p)) for p in sorted(glob.glob(os.path.join(FOES, "sil-*.png")))}
    pets = {e: both(mask_alpha(os.path.join(GEN, f"pet.{e}.128.png"))) for e in ELEMENTS if os.path.exists(os.path.join(GEN, f"pet.{e}.128.png"))}
    today = {os.path.basename(p)[7:-4]: both(mask_alpha(p)) for p in sorted(glob.glob(os.path.join(GEN, "fusion.*.png")))}

    out = {"targets": TARGETS, "proposed": {}, "today": {}}
    print(f"{'fusion':18s} {'twin (fusion)':>26s} {'foe contract':>24s} {'base pet':>18s}  pass")
    for k, (s, _) in fus.items():
        r = {"twin": closest(s, fus, skip=k), "foe": closest(s, foes), "pet": closest(s, pets)}
        r["pass"] = all(r[g][0] <= TARGETS[g] for g in TARGETS)
        out["proposed"][k] = r
        flag = "ok" if r["pass"] else "MISS " + ",".join(g for g in TARGETS if r[g][0] > TARGETS[g])
        print(f"{k:18s} {r['twin'][0]:6.2f} {str(r['twin'][1]):>19s} {r['foe'][0]:6.2f} {str(r['foe'][1]):>17s} {r['pet'][0]:6.2f} {str(r['pet'][1]):>11s}  {flag}")
    tw = [v["twin"][0] for v in out["proposed"].values()]
    fo = [v["foe"][0] for v in out["proposed"].values()]
    pe = [v["pet"][0] for v in out["proposed"].values()]
    out["summary"] = {
        "proposed": {"twinMax": max(tw), "twinMedian": statistics.median(tw), "foeMax": max(fo), "foeMedian": statistics.median(fo), "petMax": max(pe), "petMedian": statistics.median(pe), "passing": sum(v["pass"] for v in out["proposed"].values()), "n": len(tw)},
    }
    print(f"{'max / median':18s} {max(tw):6.2f} / {statistics.median(tw):.2f}{'':13s} {max(fo):6.2f} / {statistics.median(fo):.2f}{'':11s} {max(pe):6.2f} / {statistics.median(pe):.2f}")

    if today:
        print()
        print(f"{'today (sprite)':18s} {'twin (fusion)':>26s} {'foe contract':>24s} {'base pet':>18s}")
        for k, (s, _) in today.items():
            r = {"twin": closest(s, today, skip=k), "foe": closest(s, foes), "pet": closest(s, pets)}
            out["today"][k] = r
            print(f"{k:18s} {r['twin'][0]:6.2f} {str(r['twin'][1]):>19s} {r['foe'][0]:6.2f} {str(r['foe'][1]):>17s} {r['pet'][0]:6.2f} {str(r['pet'][1]):>11s}")
        tw = [v["twin"][0] for v in out["today"].values()]
        fo = [v["foe"][0] for v in out["today"].values()]
        pe = [v["pet"][0] for v in out["today"].values()]
        out["summary"]["today"] = {"twinMax": max(tw), "twinMedian": statistics.median(tw), "foeMax": max(fo), "foeMedian": statistics.median(fo), "petMax": max(pe), "petMedian": statistics.median(pe), "n": len(tw)}
        print(f"{'max / median':18s} {max(tw):6.2f} / {statistics.median(tw):.2f}{'':13s} {max(fo):6.2f} / {statistics.median(fo):.2f}{'':11s} {max(pe):6.2f} / {statistics.median(pe):.2f}")

    # the full fusion x fusion matrix (flip allowed), for the report's heat map
    keys = list(fus)
    out["matrix"] = {"keys": keys, "iou": [[round(max(iou(fus[a][0], fus[b][0]), iou(fus[a][0], fus[b][1])), 3) if a != b else 1.0 for b in keys] for a in keys]}
    json.dump(out, open(os.path.join(MATRIX, "twin-test.json"), "w"), indent=1)
    print("wrote", os.path.join(MATRIX, "twin-test.json"))


if __name__ == "__main__":
    main()
