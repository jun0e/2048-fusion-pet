#!/usr/bin/env python3
"""Home-screen icons for 2048 Fusion Pet (web app manifest and Apple touch icon).

A gold "2048" tile on the game's navy, with the lanes' chevrons above it.
Needs Pillow and the macOS font Arial Rounded Bold. Writes public/icons/.
Run: python3 tools/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
FONT = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
NAVY, GOLD, GOLD_D, INK, CHEVRON = "#1c2547", "#ffd34a", "#c47a10", "#4a2e12", "#ff8a6a"


def draw(size, maskable=False):
    """maskable: full-bleed navy, content inside the central 80% safe zone."""
    s = 1024
    img = Image.new("RGBA", (s, s), NAVY if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not maskable:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=220, fill=NAVY)
    scale = 0.8 if maskable else 1.0
    c = s / 2

    def box(x0, y0, x1, y1):
        return tuple(c + (v - c) * scale for v in (x0, y0, x1, y1))

    # lane chevrons above the tile
    for y in (150, 250):
        pts = [(c - 110 * scale, c + (y - c) * scale), (c, c + (y + 80 - c) * scale), (c + 110 * scale, c + (y - c) * scale)]
        d.line(pts, fill=CHEVRON, width=int(46 * scale), joint="curve")
    # the tile: a clay block with a darker base
    d.rounded_rectangle(box(170, 390, 854, 900), radius=int(120 * scale), fill=GOLD_D)
    d.rounded_rectangle(box(170, 360, 854, 860), radius=int(120 * scale), fill=GOLD)
    font = ImageFont.truetype(FONT, int(250 * scale))
    d.text((c, c + (610 - c) * scale), "2048", font=font, fill=INK, anchor="mm")
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(parents=True, exist_ok=True)
for name, size, mask in (("icon-192.png", 192, False), ("icon-512.png", 512, False), ("icon-maskable-512.png", 512, True), ("apple-touch-icon.png", 180, True)):
    draw(size, mask).save(OUT / name)
    print("wrote", OUT / name)
