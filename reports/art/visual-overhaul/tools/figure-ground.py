#!/usr/bin/env python3
"""Figure-ground check for the concept foes: does each foe separate from the ground it will walk on?

Every keyed concept foe (concepts/foe-*.keyed.png) is scaled to 48 px tall and composited on the
tones the proposal plans for its chapter (lane cobbles, hedge, the keep's stone, plus the current
cream lane and a warm-brown stand-in for reference). For each pair it reports, in CIELAB:
  bodyDL    |L*(body median, outline excluded) - L*(ground)|   the value step of the mass
  outlineDL |L*(outline median) - L*(ground)|                   what the plum line alone gives
  dE        CIE76 distance body vs ground                        hue/chroma help
A foe PASSES a ground when bodyDL >= 20, or bodyDL >= 12 with dE >= 35; "outline only" means the
line separates it but the mass does not (the coordinator's brown-pangolin case). Writes
concepts/figure-ground.png (the grid, 48 px foes at 2x) and concepts/figure-ground.json.

usage: /usr/bin/python3 figure-ground.py
"""
import glob
import json
import os
import re

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OVERHAUL = os.path.dirname(HERE)
CONCEPTS = os.path.join(OVERHAUL, "concepts")
FOE_PX = 48

# Planned tones per chapter (section 4.2 of the proposal) + references
GROUNDS = {
    "forest": [("lane cobble", "#D9C7A3"), ("hedge", "#4A5A52"), ("keep floor", "#3E3C58"), ("keep floor (alt)", "#7A778E")],
    "fareast": [("lane cobble", "#D9C7A3"), ("lacquer plank", "#B2574E"), ("hedge", "#4A5A52"), ("keep floor", "#3E3C58"), ("keep floor (alt)", "#7A778E")],
    "peaks": [("basalt lane", "#7A7A86"), ("ash lane (alt)", "#A6A6B0"), ("thorn hedge", "#4A4A52"), ("keep floor", "#3E3C58"), ("keep floor (alt)", "#7A778E")],
}
SEP_DL = 20  # a body pixel "separates" from a ground when its L* differs by this much
SEP_PASS = 0.4  # ... and a foe passes a ground when at least this share of its body separates
REFERENCE = [("current cream lane", "#E9DCC0"), ("brown stand-in", "#8A6A43")]
CHAPTER = {"moth": "forest", "dormouse": "forest", "beetle": "forest", "axolotl": "forest", "owl": "forest", "salamander": "forest", "hivequeen": "forest",
           "fox": "fareast", "pangolin": "fareast", "macaque": "fareast", "kitecarp": "fareast", "pagodacrab": "fareast",
           "ibex": "peaks", "wyvern": "peaks", "bat": "peaks", "toad": "peaks", "snail": "peaks", "wyrm": "peaks"}


def hex_rgb(h):
    return np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], dtype=np.float64)


def srgb_to_lab(rgb):
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def foe_colours(path):
    """Median Lab of the body (opaque, not outline) and of the outline (opaque, dark)."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float64)
    opaque = a[..., 3] > 200
    lab = srgb_to_lab(a[..., :3])
    L = lab[..., 0]
    outline = opaque & (L < 28)
    body = opaque & (L >= 28)
    return lab[body].reshape(-1, 3), lab[outline].reshape(-1, 3), im


def verdict(sep_share, body_dl):
    """pass: enough of the body steps >= SEP_DL in value from the ground (a two-value foe passes on
    either a light or a dark ground); weak: some of it does; outline only: the plum line is all that separates it."""
    if sep_share >= SEP_PASS:
        return "pass"
    return "weak" if sep_share >= 0.2 or body_dl >= 12 else "outline only"


def clutter(swatch_path):
    """Ground clutter under a 48 px foe footprint: the standard deviation of L* over the swatch and the
    mean absolute L* step between neighbouring pixels (high-frequency detail). The mean-value test above
    cannot see this; a busy ground steals a small foe's edges even when its mean value steps far enough."""
    L = srgb_to_lab(np.asarray(Image.open(swatch_path).convert("RGB")).astype(np.float64))[..., 0]
    return round(float(L.std()), 1), round(float(np.abs(np.diff(L, axis=1)).mean()), 2)


def main():
    files = sorted(glob.glob(os.path.join(CONCEPTS, "foe-*.keyed.png")))
    if not files:
        print("no keyed concept foes yet")
        return
    for sw in sorted(glob.glob(os.path.join(CONCEPTS, "refs", "ground-*.png"))):
        sd, step = clutter(sw)
        print(f"ground clutter {os.path.basename(sw)[7:-4]:12s} L* std {sd:4.1f}  neighbour step {step:4.2f}  {'calm (<= 4)' if sd <= 4 else 'busy'}")
    rows = []
    out = {}
    for f in files:
        cid = os.path.basename(f)[4:-10]
        name = re.sub(r"-[a-z]$", "", cid)
        chapter = CHAPTER.get(name, "forest")
        body, outline, im = foe_colours(f)
        bl = np.median(body, axis=0) if len(body) else np.zeros(3)
        ol = np.median(outline, axis=0) if len(outline) else np.array([14.0, 0, 0])
        grounds = GROUNDS[chapter] + REFERENCE
        res = []
        light_share = float((body[:, 0] >= 75).mean()) if len(body) else 0.0
        dark_share = float((body[:, 0] <= 45).mean()) if len(body) else 0.0
        for gname, ghex in grounds:
            g = srgb_to_lab(hex_rgb(ghex)[None, :])[0]
            body_dl = abs(bl[0] - g[0])
            outline_dl = abs(ol[0] - g[0])
            de = float(np.sqrt(((bl - g) ** 2).sum()))
            sep = float((np.abs(body[:, 0] - g[0]) >= SEP_DL).mean()) if len(body) else 0.0
            res.append({"ground": gname, "hex": ghex, "bodyDL": round(float(body_dl), 1), "outlineDL": round(float(outline_dl), 1), "dE": round(de, 1), "sepShare": round(sep, 2), "verdict": verdict(sep, body_dl)})
        out[cid] = {"name": name, "chapter": chapter, "bodyL": round(float(bl[0]), 1), "outlineL": round(float(ol[0]), 1), "lightShare": round(light_share, 2), "darkShare": round(dark_share, 2), "grounds": res}
        rows.append((cid, chapter, im, grounds, res))
        print(f"{cid:14s} {chapter:7s} L*{bl[0]:5.1f} light {light_share:.2f} dark {dark_share:.2f} | " + " | ".join(f"{r['ground'][:12]} sep {r['sepShare']:.2f} {r['verdict']}" for r in res))
    # the grid: one row per foe, ONE GLOBAL COLUMN PER GROUND (a ground that does not apply to the foe's
    # chapter leaves a hatched cell, so every verdict sits under its own header); foe 48 px tall, drawn at 2x
    columns = []
    for g in [*GROUNDS["forest"], *GROUNDS["fareast"], *GROUNDS["peaks"], *REFERENCE]:
        if g[0] not in [c[0] for c in columns]:
            columns.append(g)
    cell = 96
    cellw = 132
    sheet = Image.new("RGB", (130 + len(columns) * cellw, len(rows) * cell + 24), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for j, (gname, ghex) in enumerate(columns):
        d.text((130 + j * cellw + 2, 4), gname, fill=(0, 0, 0))
    for i, (cid, chapter, im, grounds, res) in enumerate(rows):
        y = 24 + i * cell
        d.text((4, y + 40), cid, fill=(0, 0, 0))
        foe = im.copy()
        k = FOE_PX / foe.height
        foe = foe.resize((max(1, round(foe.width * k)), FOE_PX), Image.LANCZOS)
        byname = {r["ground"]: r for r in res}
        for j, (gname, ghex) in enumerate(columns):
            x = 130 + j * cellw
            if gname not in byname:
                for hx in range(x, x + cellw, 8):
                    d.line([hx, y, hx + 8, y + 8], fill=(200, 200, 200))
                d.rectangle([x, y, x + cellw - 1, y + cell - 1], outline=(220, 220, 220))
                continue
            d.rectangle([x, y, x + cellw - 1, y + cell - 1], fill=tuple(int(v) for v in hex_rgb(ghex)))
            sheet.paste(foe, (x + (cellw - foe.width) // 2, y + (cell - FOE_PX) // 2), foe)
            v = byname[gname]["verdict"]
            d.text((x + 2, y + cell - 12), f"{v} ({byname[gname]['sepShare']:.2f})", fill=(200, 0, 0) if v != "pass" else (0, 120, 0))
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST)
    sheet.save(os.path.join(CONCEPTS, "figure-ground.png"))
    # JSON: verdicts keyed by ground name, never by column
    for cid in out:
        out[cid]["grounds"] = {r["ground"]: {k: v for k, v in r.items() if k != "ground"} for r in out[cid]["grounds"]}
    json.dump(out, open(os.path.join(CONCEPTS, "figure-ground.json"), "w"), indent=1)
    print("wrote", os.path.join(CONCEPTS, "figure-ground.png"))


if __name__ == "__main__":
    main()
