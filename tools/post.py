"""Post-process one generated image for the game (used by tools/pipeline.mjs).

usage: python3 tools/post.py IN OUT --bg green|magenta|none --size N
                             [--fit trim|square|cover|plate] [--plate HEX,HEX[,HEX]]
                             [--palette HEX,HEX,...] [--snap] [--strip-rim]

  --bg       key out a flat chroma background (estimated from the border), despill
  --fit      trim: crop to the subject + small pad (sprites, feet at the bottom)
             square: trim, then centre on a square canvas
             cover: no keying/trim, just resize (backgrounds)
             plate: trim, then centre on a square flat plate (the 2D namecard portraits):
             the sticker keyed, trimmed and snapped as a sprite is, on --plate's colours
  --plate    the plate's flat colours: the plate, a lighter disc behind the subject, and
             optionally flat rays round the disc (the ascended portraits)
  --size     longest side of the output in px
  --palette  allowed colours (the element palette + universal colours)
  --snap     enforce the palette hard limit: every visible pixel takes its nearest
             allowed colour (perceptual distance), alpha kept
  --strip-rim  remove a light sticker rim outside the dark outline (foes have no cream rim:
             it is the heroes' cue); see strip_rim

Prints one JSON line of QA metrics (coverage, share of pixels already inside the
palette before snapping, leftover chroma fringe, size; with --strip-rim the rim removed:
rim_mode flood|peel|none, rim_share of the opaque pixels, rim_px its depth) for the pipeline log.
"""
import argparse
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RIM_DARK = 35  # L*: the plum outline (and a dark mass) stops the rim flood
RIM_LEAK = 0.30  # a "rim" larger than this share of the opaque pixels leaked through a gap in the outline
RIM_THICK = 0.06  # of the longest side: a flooded band that holds a disc this wide (radius) is not a rim (rims and the notches they fill are a few % across) but a body part reached through a wide gap
RIM_BODY = 0.002  # of the visible pixels: a region behind a neck at least this big is a body part, smaller ones are notch rim
RIM_NECK = 0.008  # of the longest side (about the outline's width): a gap in the outline up to about twice this wide is a neck the rim flood does not take
RIM_SOFT = (20, 90)  # L* of the outline and of the cream rim: a blend pixel between them keeps that share of outline


def srgb_to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def grow4(m):
    """m plus its 4-neighbours."""
    g = m.copy()
    g[1:, :] |= m[:-1, :]
    g[:-1, :] |= m[1:, :]
    g[:, 1:] |= m[:, :-1]
    g[:, :-1] |= m[:, 1:]
    return g


def grow8(m):
    """m plus its 8-neighbours."""
    g = grow4(m)
    g[1:, 1:] |= m[:-1, :-1]
    g[1:, :-1] |= m[:-1, 1:]
    g[:-1, 1:] |= m[1:, :-1]
    g[:-1, :-1] |= m[1:, 1:]
    return g


def peel_rim(img, max_px):
    """The fallback: peel light pixels (L* > 70) that touch the transparent background, one ring
    at a time, at most max_px rings. Used when the outline has a gap and a flood would leak."""
    a = np.asarray(img).astype(np.float32).copy()
    L = srgb_to_lab(a[..., :3])[..., 0]
    peeled = 0
    for _ in range(max_px):
        clear = Image.fromarray(((a[..., 3] <= 20) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
        ring = (a[..., 3] > 20) & (np.asarray(clear) > 0) & (L > 70)
        if not ring.any():
            break
        a[..., 3][ring] = 0
        peeled += 1
    return Image.fromarray(a.astype(np.uint8)), peeled


def large_regions(m, min_area):
    """The 4-connected regions of m with at least min_area pixels."""
    left = m.copy()
    keep = np.zeros_like(m)
    while left.any():
        y, x = np.argwhere(left)[0]
        region = np.zeros_like(m)
        region[y, x] = True
        while True:
            grown = grow4(region) & left
            if (grown == region).all():
                break
            region = grown
        left &= ~region
        if region.sum() >= min_area:
            keep |= region
    return keep


def strip_rim(img, max_px):
    """Remove the sticker rim: the visible pixels reachable from the transparent background
    (4-connected) without crossing the dark outline (L* < RIM_DARK). That takes the whole rim,
    the wedges it fills in concave notches and the despilled specks on its edge, and leaves
    the outline as the edge. The blend pixels between the rim and the outline stay as outline
    with the alpha of their outline share, so the new edge keeps its anti-aliasing.
    Leak guards: a light part that the flood reached through a narrow gap in the outline (a neck)
    stays in the sprite (rim_kept); a band broad enough to hold a disc of RIM_THICK of the longest
    side reached a body part through a gap too wide for that guard (rim_body: peeled, QA fails); and a
    band over RIM_LEAK of the visible pixels means the outline
    is missing along a whole side, so the old capped peel runs instead.
    -> (image, {"rim_mode": "flood" | "peel" | "none", "rim_share": ..., "rim_px": depth, "rim_kept": ...})"""
    a = np.asarray(img).astype(np.float32).copy()
    L = srgb_to_lab(a[..., :3])[..., 0]
    seen = a[..., 3] > 20
    clear = ~seen
    passable = clear | (L >= RIM_DARK)
    limit = RIM_LEAK * seen.sum()
    reach = clear.copy()
    dist = np.zeros(seen.shape, np.int32)  # flood steps from the background, for the visible pixels it reaches
    layer = 0
    while True:
        grown = grow4(reach) & passable
        new = grown & ~reach
        if not new.any():
            break
        reach = grown
        if (new & seen).any():
            layer += 1
            dist[new & seen] = layer
    rim = reach & seen
    if not rim.any():
        return img, {"rim_mode": "none", "rim_share": 0.0, "rim_px": 0}
    # Neck guard: a rim is a band along the background; a leak enters a light body part through a
    # narrow gap in the outline. Open the flooded mask (necks up to about 2 * neck px wide break), keep
    # what still connects to the background and grow it back inside the flood. A large region that
    # hung on a neck is a body part and stays in the sprite; a small one is rim caught in a narrow
    # notch and goes with the rim. A flood too thin to survive the opening (specks, a hairline rim)
    # goes as it is.
    neck = max(2, round(max(img.size) * RIM_NECK))
    inside = rim | clear  # the background counts as inside, so only the outline side erodes
    opened = inside
    for _ in range(neck):
        opened = ~grow8(~opened)  # erode
    for _ in range(neck):
        opened = grow8(opened) & inside  # dilate back: the opening
    opened &= rim
    band = opened & grow8(clear)  # seeds: the opened rim along the background
    leak = np.zeros_like(rim)
    if band.any():
        while True:  # the part of the opened mask that touches the background
            grown = grow4(band) & opened
            if (grown == band).all():
                break
            band = grown
        for _ in range(neck + 1):
            band = grow8(band) & rim
        leak = large_regions(rim & ~band, max(64, round(RIM_BODY * seen.sum())))
        rim = rim & ~leak
    depth = int(dist[rim].max()) if rim.any() else 0
    core = rim
    for _ in range(max(2, round(max(img.size) * RIM_THICK))):
        core = ~grow8(~core)  # erode: what survives is wider than any rim
        if not core.any():
            break
    if core.any():
        # a gap too wide for the neck guard: the flood reached a broad light body part. Peel what a
        # rim could be (capped) and fail QA: the pipeline retries the image or flags the asset.
        out, peeled = peel_rim(img, max_px)
        cut = (np.asarray(out)[..., 3] <= 20) & seen
        return out, {"rim_mode": "peel", "rim_share": round(float(cut.sum() / max(1, seen.sum())), 4), "rim_px": peeled, "rim_body": int(core.sum())}
    if rim.sum() > limit:
        out, peeled = peel_rim(img, max_px)
        cut = (np.asarray(out)[..., 3] <= 20) & seen
        return out, {"rim_mode": "peel", "rim_share": round(float(cut.sum() / max(1, seen.sum())), 4), "rim_px": peeled}
    kept = seen & ~rim
    edge = rim & grow8(kept)  # the blend band against the outline
    lo, hi = RIM_SOFT
    share = np.clip((hi - L) / (hi - lo), 0.0, 1.0)
    ink = kept & grow8(rim) & (L < RIM_DARK)  # the outline's outer pixels
    alpha = a[..., 3]
    if ink.any():
        a[..., :3][edge] = np.median(a[..., :3][ink], axis=0)
        alpha[edge] = alpha[edge] * share[edge]
    else:
        alpha[edge] = 0
    alpha[rim & ~edge] = 0
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), {
        "rim_mode": "flood",
        "rim_share": round(float(rim.sum() / max(1, seen.sum())), 4),
        "rim_px": depth,
        "rim_kept": int(leak.sum()),  # light pixels behind a neck: a gap in the outline, kept in the sprite
    }


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
    canvas.paste(img, (pad, pad))  # a plain copy: the image as its own mask would square its alpha and darken its edges
    return canvas, bbox


def fit_longest(img, size):
    s = size / max(img.size)
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


PLATE_BOX = 0.86  # the subject's longest side, as a share of the plate's
PLATE_DISC = 0.44  # the disc's radius, as a share of the plate's side
PLATE_RAYS = 16  # flat rays round the disc (every other one in the ray colour)


def hex_rgba(h):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5)) + (255,)


def plate_card(sticker, size, colours):
    """A square 2D avatar: the sticker centred on a flat plate (flat fills only, no gradient): the
    plate colour, a lighter disc behind the subject and, with a third colour, flat rays round it."""
    card = Image.new("RGBA", (size, size), hex_rgba(colours[0]))
    d = ImageDraw.Draw(card)
    c = size / 2
    if len(colours) > 2:
        step = 360 / PLATE_RAYS
        for i in range(0, PLATE_RAYS, 2):
            d.pieslice((c - size, c - size, c + size, c + size), i * step - 90, (i + 1) * step - 90, fill=hex_rgba(colours[2]))
    r = size * PLATE_DISC
    d.ellipse((c - r, c - r, c + r, c + r), fill=hex_rgba(colours[1]))
    card.alpha_composite(sticker, ((size - sticker.width) // 2, (size - sticker.height) // 2))
    return card


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--bg", default="none")
    ap.add_argument("--size", type=int, default=320)
    ap.add_argument("--fit", default="trim")
    ap.add_argument("--plate", default="")
    ap.add_argument("--palette", default="")
    ap.add_argument("--snap", action="store_true")
    ap.add_argument("--strip-rim", action="store_true")
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
            sq.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
            img = sq
        # a plate's subject is sized for the plate: snapped and checked at the size it ships
        img = fit_longest(img, round(o.size * PLATE_BOX) if o.fit == "plate" else o.size)

    if o.strip_rim and o.fit != "cover":
        img, rim = strip_rim(img, max(2, round(max(img.size) * 0.025)))
        qa.update(rim)
        img, _ = trim(img)
        img = fit_longest(img, round(o.size * PLATE_BOX) if o.fit == "plate" else o.size)

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

    # full-frame images (backgrounds) are opaque by design: no coverage check; a plate's subject
    # is checked as a sprite is, before it goes on the plate
    ok = o.fit == "cover" or (0.04 < qa["coverage"] < 0.97 and qa.get("fringe", 0) < 0.01 and not qa.get("rim_body"))
    qa["ok"] = bool(ok)
    if o.fit == "plate":
        colours = [h for h in o.plate.split(",") if h]
        if len(colours) < 2:
            raise SystemExit("--fit plate needs --plate PLATE,DISC[,RAYS]")
        img = plate_card(img, o.size, colours)
        qa["size"] = list(img.size)
    img.save(o.dst, optimize=True)
    print(json.dumps(qa))


if __name__ == "__main__":
    main()
