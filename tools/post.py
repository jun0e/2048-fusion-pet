"""Post-process one generated image for the game (used by tools/pipeline.mjs).

usage: python3 tools/post.py IN OUT --bg green|magenta|none --size N
                             [--fit trim|square|cover] [--palette HEX,HEX,...] [--snap]

  --bg       key out a flat chroma background (estimated from the border), despill
  --fit      trim: crop to the subject + small pad (sprites, feet at the bottom)
             square: trim, then centre on a square canvas
             cover: no keying/trim, just resize (portraits, backgrounds)
  --size     longest side of the output in px
  --palette  allowed colours (the element palette + universal colours)
  --snap     enforce the palette hard limit: every visible pixel takes its nearest
             allowed colour (perceptual distance), alpha kept

Prints one JSON line of QA metrics (coverage, share of pixels already inside the
palette before snapping, leftover chroma fringe, size) for the pipeline log.
"""
import argparse
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def srgb_to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def key_out(img, mode):
    """Remove the flat chroma background.

    Background = key-coloured pixels connected to the image edge, plus pure key colour
    anywhere (enclosed holes such as the middle of a halo). Everything else is opaque, so a
    purple body on a magenta key stays solid: the sticker's cream rim always separates the
    body from the background. Only a 2 px band next to the background gets a soft edge
    from the colour distance, and only that band is despilled.
    """
    a = np.asarray(img.convert("RGBA")).astype(np.float32)
    rgb = a[..., :3]
    h, w = rgb.shape[:2]
    b = 6
    border = np.concatenate([rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3), rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3)])
    key = np.median(border, axis=0)
    dist = np.sqrt(((rgb - key) ** 2).sum(axis=-1))
    m = Image.fromarray(((dist < 100) * 255).astype(np.uint8))
    for x in range(0, w, 4):
        for y in (0, h - 1):
            if m.getpixel((x, y)) == 255:
                ImageDraw.floodfill(m, (x, y), 128)
    for y in range(0, h, 4):
        for x in (0, w - 1):
            if m.getpixel((x, y)) == 255:
                ImageDraw.floodfill(m, (x, y), 128)
    bg = (np.asarray(m) == 128) | (dist < 60)
    near = np.asarray(Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    band = near & ~bg
    r, g, bl = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    chroma = (g - np.maximum(r, bl)) if mode == "green" else (np.minimum(r, bl) - g)
    soft = np.clip((dist - 30.0) / 60.0, 0.0, 1.0)
    alpha = np.where(bg, 0.0, np.where(band, np.where(chroma > 90, 0.0, soft), 1.0))
    if mode == "green":
        cap = np.maximum(r, bl)
        rgb[..., 1] = np.where(band, np.minimum(g, cap + 10), g)
    else:
        lim = g + 10
        rgb[..., 0] = np.where(band, np.minimum(r, np.maximum(lim, bl * 0.6)), r)
        rgb[..., 2] = np.where(band, np.minimum(bl, np.maximum(lim, r * 0.6)), bl)
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out), key, chroma


def trim(img, pad_frac=0.03):
    bbox = img.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        img = img.crop(bbox)
    pad = max(2, int(max(img.size) * pad_frac))
    canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(img, (pad, pad), img)
    return canvas, bbox


def fit_longest(img, size):
    s = size / max(img.size)
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--bg", default="none")
    ap.add_argument("--size", type=int, default=320)
    ap.add_argument("--fit", default="trim")
    ap.add_argument("--palette", default="")
    ap.add_argument("--snap", action="store_true")
    o = ap.parse_args()

    img = Image.open(o.src)
    qa = {"src": img.size}
    key = None
    if o.bg in ("green", "magenta") and o.fit != "cover":
        img, key, _ = key_out(img, o.bg)
        qa["key"] = key.astype(int).tolist()
    else:
        img = img.convert("RGBA")

    if o.fit == "cover":
        img = fit_longest(img, o.size)
    else:
        img, bbox = trim(img)
        if o.fit == "square":
            side = max(img.size)
            sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            sq.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
            img = sq
        img = fit_longest(img, o.size)

    arr = np.asarray(img).astype(np.float32)
    alpha = arr[..., 3]
    vis = alpha > 127
    qa["coverage"] = round(float(vis.mean()), 3)
    qa["size"] = list(img.size)

    if o.palette:
        pal = np.array([[int(h[i : i + 2], 16) for i in (1, 3, 5)] for h in o.palette.split(",") if h], dtype=np.float32)
        lab_pal = srgb_to_lab(pal)
        px = arr[..., :3][alpha > 8]
        if len(px):
            lab = srgb_to_lab(px)
            d = np.sqrt(((lab[:, None, :] - lab_pal[None, :, :]) ** 2).sum(-1))
            nearest = d.argmin(1)
            qa["in_palette"] = round(float((d.min(1) < 15).mean()), 3)
            if o.snap:
                rgb = arr[..., :3]
                rgb[alpha > 8] = pal[nearest]
                arr[..., :3] = rgb
                img = Image.fromarray(arr.astype(np.uint8))
                qa["snapped"] = True
                used = np.bincount(nearest, minlength=len(pal))
                qa["colours_used"] = int((used > len(px) * 0.01).sum())

    if key is not None:
        # leftover key chroma on the cut-out edge only (a purple body is not magenta fringe)
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
        fringe = ((g - np.maximum(r, b)) > 60) if o.bg == "green" else ((np.minimum(r, b) - g) > 60)
        clear = Image.fromarray(((alpha <= 20) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
        edge = (np.asarray(clear) > 0) & (alpha > 20)
        qa["fringe"] = round(float((fringe & edge).mean()), 4)

    # full-frame images (portraits, backgrounds) are opaque by design: no coverage check
    ok = o.fit == "cover" or (0.04 < qa["coverage"] < 0.97 and qa.get("fringe", 0) < 0.01)
    qa["ok"] = bool(ok)
    img.save(o.dst, optimize=True)
    print(json.dumps(qa))


if __name__ == "__main__":
    main()
