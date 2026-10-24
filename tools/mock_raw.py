"""Draw a labelled placeholder in place of a Gemini image (tools/pipeline.mjs --mock).

usage: python3 tools/mock_raw.py ID OUT --bg green|magenta|none --aspect 1:1|9:16

The shapes mimic what each asset kind looks like after generation (an oval egg, a
round baby with feet, a wide orca, a tall fusion standing on its feet, a ring halo,
a square portrait, a tall background), on the job's chroma background, so the whole
pipeline (keying, trim, palette snap, manifest, game placement) can be tested free.
"""
import argparse
import os
import hashlib

from PIL import Image, ImageDraw, ImageFont

INK = (43, 29, 46)
CREAM = (255, 250, 242)
KEY = {
    "fire": (242, 102, 45), "ice": (155, 231, 245), "lightning": (61, 139, 255), "poison": (163, 92, 240),
    "nature": (124, 209, 90), "earth": (156, 130, 104), "wind": (86, 184, 168), "metal": (247, 190, 30),
}
WIDE = {"ice", "poison"}  # orca and snake read wider than tall


def font(size):
    for f in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def blob(d, box, fill, rim=True):
    x0, y0, x1, y1 = box
    if rim:
        d.ellipse((x0 - 14, y0 - 14, x1 + 14, y1 + 14), fill=CREAM)
    d.ellipse((x0 - 8, y0 - 8, x1 + 8, y1 + 8), fill=INK)
    d.ellipse(box, fill=fill)


def eyes(d, cx, cy, s):
    for dx in (-s, s):
        d.ellipse((cx + dx - s * 0.35, cy - s * 0.45, cx + dx + s * 0.35, cy + s * 0.45), fill=(26, 20, 32))
        d.ellipse((cx + dx - s * 0.2, cy - s * 0.35, cx + dx - s * 0.02, cy - s * 0.15), fill=(255, 255, 255))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("out")
    ap.add_argument("--bg", default="green")
    ap.add_argument("--aspect", default="1:1")
    o = ap.parse_args()
    w, h = (1024, 1024) if o.aspect == "1:1" else (864, 1536)
    bg = {"green": (0, 255, 0), "magenta": (255, 0, 255)}.get(o.bg, (40, 60, 120))
    im = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(im)
    parts = o.id.split(".")
    kind = parts[0]
    els = [p for p in o.id.replace("+", ".").split(".") if p in KEY]
    col = KEY.get(els[0] if els else "", (230, 200, 160))
    col2 = KEY.get(els[1] if len(els) > 1 else "", col)
    seed = int(hashlib.md5(o.id.encode()).hexdigest()[:6], 16)

    box = (212, 212, 812, 812)
    if kind == "egg":
        box = (362, 260, 662, 700)
        blob(d, box, (255, 240, 218))
        if parts[1] != "2":
            d.line((470, 330, 510, 380, 540, 340, 580, 390), fill=INK, width=10)
    elif kind == "pet":
        v = int(parts[2]) if parts[2].isdigit() else 16
        grow = {16: 0, 32: 30, 64: 60, 128: 90}.get(v, 0)
        if els[0] in WIDE:
            box = (230 - grow, 400, 794 + grow, 720)
        else:
            box = (322 - grow // 2, 300 - grow, 702 + grow // 2, 720)
        for fx in (box[0] + 80, box[2] - 140):  # feet at the bottom
            blob(d, (fx, 690, fx + 60, 760), col, rim=False)
        blob(d, box, col)
        for i in range(v // 32 if v > 16 else 0):  # one spike per stage
            x = (box[0] + box[2]) / 2 - 60 + i * 60
            d.polygon([(x - 26, box[1] + 20), (x, box[1] - 50), (x + 26, box[1] + 20)], fill=INK)
        eyes(d, (box[0] + box[2]) / 2, box[1] + (box[3] - box[1]) * 0.42, 46)
    elif kind == "fusion":
        tall = els[0] not in WIDE
        box = (330, 170, 700, 830) if tall else (170, 380, 860, 800)
        for fx in (box[0] + 50, box[2] - 120):
            blob(d, (fx, box[3] - 40, fx + 70, box[3] + 60), col, rim=False)
        blob(d, box, col)
        d.polygon([(box[2] - 60, box[1] + 80), (box[2] + 110, box[1] - 10), (box[2] + 40, box[1] + 170)], fill=col2, outline=INK, width=8)
        eyes(d, box[0] + (box[2] - box[0]) * 0.36, box[1] + (box[3] - box[1]) * 0.3, 40)
    elif kind == "halo":
        d.ellipse((212, 212, 812, 812), outline=CREAM, width=76)
        d.ellipse((230, 230, 794, 794), outline=(247, 190, 30), width=40)
        for i in range(6):
            import math
            a = i * math.pi / 3
            cx, cy = 512 + 280 * math.cos(a), 512 + 280 * math.sin(a)
            blob(d, (cx - 40, cy - 40, cx + 40, cy + 40), col)
    elif kind == "portrait":
        for r in range(700, 0, -20):
            t = r / 700
            c = tuple(int(col[i] * (1 - t * 0.6) + 20 * t) for i in range(3))
            d.ellipse((512 - r, 512 - r, 512 + r, 512 + r), fill=c)
        blob(d, (260, 260, 800, 1100), col2 if "ascended" not in o.id else (255, 214, 90))
        eyes(d, 500, 520, 70)
        box = (0, 300, w, 900)
    elif kind == "enemy":
        boss = parts[1] in ("redDragon", "elfRuler", "kiteNinja", "dragonRider", "phoenix", "wyvern")
        c = ((seed >> 4) % 200 + 40, (seed >> 9) % 200 + 40, (seed >> 13) % 200 + 40)
        box = (300, 260, 724, 760) if not boss else (220, 200, 804, 820)
        blob(d, box, c, rim=False)
        eyes(d, 512, box[1] + 170, 50)
    elif kind == "env":
        for y in range(h):
            t = y / h
            d.line((0, y, w, y), fill=(int(47 - 21 * t), int(74 - 37 * t), int(138 - 56 * t)))
        box = (0, 0, w, h)

    # the label goes inside the subject, so keying and trimming never see it
    label = o.id.split(".", 1)[1] if kind in ("pet", "fusion", "enemy", "halo", "egg") else o.id
    bw = box[2] - box[0]
    size = 60
    f = font(size)
    while d.textlength(label, font=f) > bw * 0.8 and size > 18:
        size -= 4
        f = font(size)
    tw = d.textlength(label, font=f)
    cx = (box[0] + box[2]) / 2
    ty = box[1] + (box[3] - box[1]) * (0.5 if kind == "halo" else 0.66)
    d.rounded_rectangle((cx - tw / 2 - 16, ty - 8, cx + tw / 2 + 16, ty + size + 8), 20, fill=INK)
    d.text((cx - tw / 2, ty), label, font=f, fill=CREAM)
    salt = os.environ.get("MOCK_SALT")
    if salt:  # tests: a different drawing for each salt, as a real redraw would be
        ImageDraw.Draw(im).rectangle((8, 8, 8 + 4 * (sum(map(ord, salt)) % 40), 20), fill=(43, 29, 46))
    im.save(o.out)


if __name__ == "__main__":
    main()
