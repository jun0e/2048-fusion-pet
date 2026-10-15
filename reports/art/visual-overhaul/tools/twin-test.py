#!/usr/bin/env python3
"""The 40 px silhouette twin test, run on the generated concept foes.

For every keyed concept foe in <overhaul>/concepts/ (foe-*.keyed.png) it reports:
  contract   IoU of the generated sprite's silhouette against its own reference silhouette
             (sil-<name>.png), at 40 px and at 120 px: did the model fill the contract?
  twin       the closest other generated foe (IoU at 40 px, flip allowed)
  roster     the closest sketch silhouette of the other roster members
  current    the closest of the 17 current enemy sprites in public/assets/gen
  ally       the closest of the 28 roaming fusion sprites
Masks: alpha (or darkness, for the black-on-white references) trimmed and fitted into a square box.
Writes concepts/twin-test.json and prints a table. Needs Pillow + NumPy (/usr/bin/python3).

usage: /usr/bin/python3 twin-test.py
"""
import glob
import json
import os
import re
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OVERHAUL = os.path.dirname(HERE)
CONCEPTS = os.path.join(OVERHAUL, "concepts")
REFS = os.path.join(CONCEPTS, "refs")
WORKTREE = os.path.abspath(os.path.join(OVERHAUL, "..", "..", ".."))
GEN = os.path.join(WORKTREE, "public", "assets", "gen")
ROSTER = ["moth", "dormouse", "beetle", "axolotl", "owl", "salamander", "hivequeen", "fox", "pangolin", "macaque", "kitecarp", "pagodacrab", "ibex", "wyvern", "bat", "toad", "wyrm"]


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


def mask_alpha(path, box=40):
    return fit(np.asarray(Image.open(path).convert("RGBA").split()[3]) > 96, box)


def mask_dark(path, box=40):
    return fit(np.asarray(Image.open(path).convert("L")) < 100, box)


def iou(a, b):
    return max((a & b).sum() / max(1, (a | b).sum()), (a & b[:, ::-1]).sum() / max(1, (a | b[:, ::-1]).sum()))


def closest(m, pool):
    best = (0.0, None)
    for k, v in pool.items():
        x = iou(m, v)
        if x > best[0]:
            best = (round(float(x), 2), k)
    return best


def main():
    files = sorted(glob.glob(os.path.join(CONCEPTS, "foe-*.keyed.png")))
    if not files:
        print("no keyed concept foes yet")
        return
    gen40 = {os.path.basename(f)[4:-10]: mask_alpha(f) for f in files}
    gen120 = {os.path.basename(f)[4:-10]: mask_alpha(f, 120) for f in files}
    roster40 = {n: mask_dark(os.path.join(REFS, f"sil-{n}.png")) for n in ROSTER if os.path.exists(os.path.join(REFS, f"sil-{n}.png"))}
    roster120 = {n: mask_dark(os.path.join(REFS, f"sil-{n}.png"), 120) for n in roster40}
    current = {os.path.basename(p)[6:-4]: mask_alpha(p) for p in sorted(glob.glob(os.path.join(GEN, "enemy.*.png"))) if ".portrait." not in p}
    allies = {os.path.basename(p)[7:-4]: mask_alpha(p) for p in sorted(glob.glob(os.path.join(GEN, "fusion.*.png")))}
    out = {}
    print(f"{'concept':22s} {'contract40':>10s} {'contract120':>11s} {'twin(gen)':>18s} {'roster':>18s} {'current':>22s} {'ally':>26s}")
    for cid, m in gen40.items():
        name = re.sub(r"-[a-z]$", "", cid)
        c40 = round(float(iou(m, roster40[name])), 2) if name in roster40 else None
        c120 = round(float(iou(gen120[cid], roster120[name])), 2) if name in roster120 else None
        twin = closest(m, {k: v for k, v in gen40.items() if re.sub(r"-[a-z]$", "", k) != name})
        ros = closest(m, {k: v for k, v in roster40.items() if k != name})
        cur = closest(m, current)
        ally = closest(m, allies)
        out[cid] = {"name": name, "contract40": c40, "contract120": c120, "twin": twin, "roster": ros, "current": cur, "ally": ally}
        print(f"{cid:22s} {str(c40):>10s} {str(c120):>11s} {twin[0]:>6.2f} {str(twin[1]):>11s} {ros[0]:>6.2f} {str(ros[1]):>11s} {cur[0]:>6.2f} {str(cur[1]):>15s} {ally[0]:>6.2f} {str(ally[1]):>19s}")
    json.dump(out, open(os.path.join(CONCEPTS, "twin-test.json"), "w"), indent=1)
    print("wrote", os.path.join(CONCEPTS, "twin-test.json"))


if __name__ == "__main__":
    main()
