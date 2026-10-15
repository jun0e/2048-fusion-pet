#!/usr/bin/env python3
"""Slice a keyed concept sheet (concepts/<id>.keyed.png) into its sprites.

Connected opaque regions are grouped after a small dilation (so an ember splash made of
scattered dots stays one sprite), each group is cropped from the original alpha, and the
pieces are written to concepts/slices/<id>/NN.png with a JSON atlas (bounding boxes, sizes,
reading order top-to-bottom then left-to-right). This is the proof that a generated VFX or
frame-kit sheet needs no hand-cutting: the pipeline can do it. Needs Pillow + NumPy.

usage: /usr/bin/python3 slice-sheet.py <id> [<id> ...]      e.g. vfx-fire-sheet vfx-ice-sheet frame-kit-sheet
       options: --gap=14 (grouping distance in px) --min=24 (drop pieces smaller than this)
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CONCEPTS = os.path.join(os.path.dirname(HERE), "concepts")


def label(mask):
    """Two-pass-free BFS labelling (sheets are ~1 Mpx; fine in pure Python/NumPy)."""
    h, w = mask.shape
    labels = np.zeros((h, w), np.int32)
    n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if labels[y0, x0]:
            continue
        n += 1
        q = deque([(y0, x0)])
        labels[y0, x0] = n
        while q:
            y, x = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not labels[yy, xx]:
                    labels[yy, xx] = n
                    q.append((yy, xx))
    return labels, n


def slice_sheet(sid, gap=14, min_px=24):
    src = os.path.join(CONCEPTS, f"{sid}.keyed.png")
    im = Image.open(src).convert("RGBA")
    alpha = np.asarray(im.split()[3]) > 40
    grouped = np.asarray(Image.fromarray((alpha * 255).astype("uint8")).filter(ImageFilter.MaxFilter(gap | 1))) > 0
    labels, n = label(grouped)
    out_dir = os.path.join(CONCEPTS, "slices", sid)
    os.makedirs(out_dir, exist_ok=True)
    pieces = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero((labels == k) & alpha)
        if not len(ys):
            continue
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        if box[2] - box[0] < min_px and box[3] - box[1] < min_px:
            continue
        pieces.append({"box": box, "w": box[2] - box[0], "h": box[3] - box[1]})
    # reading order: rows by centre y (bands of ~ the median height), then x
    if pieces:
        band = max(24, int(np.median([p["h"] for p in pieces]) * 0.6))
        pieces.sort(key=lambda p: (round(((p["box"][1] + p["box"][3]) / 2) / band), p["box"][0]))
    atlas = []
    for i, p in enumerate(pieces):
        x0, y0, x1, y1 = p["box"]
        crop = im.crop((x0, y0, x1, y1))
        # keep only this group's pixels inside the box
        m = Image.fromarray(((labels[y0:y1, x0:x1] == labels[y0:y1, x0:x1][(np.asarray(crop.split()[3]) > 40)].max() if (np.asarray(crop.split()[3]) > 40).any() else 0) * 255).astype("uint8"))
        a = Image.fromarray(np.minimum(np.asarray(crop.split()[3]), np.asarray(m)).astype("uint8"))
        crop.putalpha(a)
        name = f"{i:02d}.png"
        crop.save(os.path.join(out_dir, name))
        atlas.append({"file": name, "x": x0, "y": y0, "w": p["w"], "h": p["h"]})
    json.dump({"sheet": f"{sid}.keyed.png", "pieces": atlas}, open(os.path.join(out_dir, "atlas.json"), "w"), indent=1)
    # a contact strip to eyeball the result
    if atlas:
        cell = 72
        strip = Image.new("RGBA", (min(16, len(atlas)) * cell, ((len(atlas) + 15) // 16) * cell), (240, 236, 228, 255))
        for i, p in enumerate(atlas):
            t = Image.open(os.path.join(out_dir, p["file"])).convert("RGBA")
            t.thumbnail((cell - 8, cell - 8))
            strip.paste(t, ((i % 16) * cell + 4, (i // 16) * cell + 4), t)
        strip.save(os.path.join(out_dir, "_strip.png"))
    print(f"{sid}: {len(atlas)} sprites -> {out_dir}")
    return atlas


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    gap = int(next((a.split("=")[1] for a in sys.argv[1:] if a.startswith("--gap=")), 14))
    mn = int(next((a.split("=")[1] for a in sys.argv[1:] if a.startswith("--min=")), 24))
    for sid in args:
        slice_sheet(sid, gap, mn)


if __name__ == "__main__":
    main()
