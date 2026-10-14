"""Key out a flat chroma background, despill, trim and resize a generated sprite.

usage: python3 tools/chroma.py IN.png OUT.png [green|magenta] [max_size]

The background colour is estimated from the image border (generated images are
rarely exactly #00FF00 / #FF00FF), then alpha ramps with distance from it.
"""
import sys

import numpy as np
from PIL import Image


def main():
    src, dst = sys.argv[1], sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "green"
    max_size = int(sys.argv[4]) if len(sys.argv) > 4 else 256

    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    rgb = a[..., :3]
    h, w = rgb.shape[:2]

    # background estimate: median of a 6 px border
    b = 6
    border = np.concatenate([rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3), rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3)])
    key = np.median(border, axis=0)

    dist = np.sqrt(((rgb - key) ** 2).sum(axis=-1))
    t0, t1 = 70.0, 150.0
    alpha = np.clip((dist - t0) / (t1 - t0), 0.0, 1.0)

    # also treat strongly "chroma-coloured" pixels as background (handles gradients)
    r, g, bl = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if mode == "green":
        chroma = g - np.maximum(r, bl)
    else:
        chroma = np.minimum(r, bl) - g
    alpha = np.where(chroma > 90, 0.0, alpha)

    # despill on semi-transparent edges and near-key pixels
    edge = alpha < 0.999
    if mode == "green":
        cap = np.maximum(r, bl)
        rgb[..., 1] = np.where(edge | (g > cap + 30), np.minimum(g, cap + 10), g)
    else:
        lim = g + 10
        rgb[..., 0] = np.where(edge, np.minimum(r, np.maximum(lim, bl * 0.6)), r)
        rgb[..., 2] = np.where(edge, np.minimum(bl, np.maximum(lim, r * 0.6)), bl)

    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")

    # trim to content, pad, fit into max_size (square canvas, centred)
    bbox = img.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        img = img.crop(bbox)
    pad = max(4, int(max(img.size) * 0.04))
    side = max(img.size) + pad * 2
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    canvas = canvas.resize((max_size, max_size), Image.LANCZOS)
    canvas.save(dst, optimize=True)
    print(f"{dst}: key={key.astype(int).tolist()} bbox={bbox}")


if __name__ == "__main__":
    main()
