"""Old next to new for the baby fusion pets (2026-10-23): each fusion's grown sprite and its 3D
namecard portraits (base, ascended) as they were at the git revision OLD, beside its baby sprite
and its 2D portraits as they are on disk now.

usage: python3 reports/art/baby-pets/contact-sheet.py [--old 470aff4] [--out reports/art/baby-pets]

Writes contact-sheet-1.png and contact-sheet-2.png (14 pets each) and contact-sheet-small.png
(the portraits at the size a phone's namecard shows them, 48 px).
"""
import argparse
import io
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
GEN = ROOT / "public" / "assets" / "gen"
CELL = 220
GAP = 14
LABEL = 150
BG = (238, 234, 228, 255)
INK = (43, 29, 46, 255)


def font(size, bold=False):
    for f in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def old_file(rev, rel):
    """The file as it was at `rev` (None when it did not exist)."""
    r = subprocess.run(["git", "-C", str(ROOT), "show", f"{rev}:{rel}"], capture_output=True)
    return Image.open(io.BytesIO(r.stdout)).convert("RGBA") if r.returncode == 0 else None


def new_file(rel):
    p = ROOT / rel
    return Image.open(p).convert("RGBA") if p.exists() else None


def fit(im, box):
    s = box / max(im.size)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def roster():
    """The 28 pets in the game's order: key, name, animal (from src/art/fusion-roster.js, via node)."""
    js = "import('./src/art/fusion-roster.js').then(m => console.log(JSON.stringify(Object.entries(m.FUSION_ROSTER).map(([k, r]) => [k, r.name, r.animal]))))"
    return json.loads(subprocess.run(["node", "--input-type=module", "-e", js], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def sheet(rows, rev, title):
    cols = 6
    w = LABEL + cols * (CELL + GAP) + GAP * 3
    head = 70
    h = head + len(rows) * (CELL + GAP) + GAP
    out = Image.new("RGBA", (w, h), BG)
    d = ImageDraw.Draw(out)
    d.text((GAP, 14), title, font=font(26, True), fill=INK)
    x0 = LABEL + GAP
    for i, t in enumerate(["OLD sprite", "OLD portrait (3D)", "OLD ascended (3D)", "NEW sprite", "NEW portrait (2D)", "NEW ascended (2D)"]):
        d.text((x0 + i * (CELL + GAP) + (GAP * 2 if i >= 3 else 0), 46), t, font=font(16, True), fill=INK)
    # the old and new halves
    d.rectangle((x0 + 3 * (CELL + GAP) + GAP // 2, head - 4, x0 + 3 * (CELL + GAP) + GAP + 2, h - GAP // 2), fill=(43, 29, 46, 90))
    for r, (key, name, animal) in enumerate(rows):
        y = head + r * (CELL + GAP)
        d.text((GAP, y + CELL // 2 - 22), name, font=font(20, True), fill=INK)
        d.text((GAP, y + CELL // 2 + 4), animal[:18], font=font(15), fill=INK)
        cells = [
            old_file(rev, f"public/assets/gen/fusion.{key}.png"),
            old_file(rev, f"public/assets/gen/portrait.{key}.png"),
            old_file(rev, f"public/assets/gen/portrait.{key}.ascended.png"),
            new_file(f"public/assets/gen/fusion.{key}.png"),
            new_file(f"public/assets/gen/portrait.{key}.png"),
            new_file(f"public/assets/gen/portrait.{key}.ascended.png"),
        ]
        for c, im in enumerate(cells):
            x = x0 + c * (CELL + GAP) + (GAP * 2 if c >= 3 else 0)
            if c in (0, 3):  # a sprite on the lane's sand, as it roams
                d.rounded_rectangle((x, y, x + CELL, y + CELL), 18, fill=(217, 199, 163, 255))
            if im is None:
                d.text((x + 12, y + CELL // 2), "missing", font=font(16), fill=INK)
                continue
            im = fit(im, CELL - (16 if c in (0, 3) else 0))
            out.alpha_composite(im, (x + (CELL - im.width) // 2, y + (CELL - im.height) // 2))
    return out


def small(rows, rev):
    """Every portrait at 48 px, old over new: how a phone's namecard shows it."""
    s = 48
    w = GAP + len(rows) * (s + 8)
    out = Image.new("RGBA", (w, 2 * (s + 8) + 34 + GAP), BG)
    d = ImageDraw.Draw(out)
    d.text((GAP, 8), "Portraits at 48 px (a phone's namecard): old (3D) above, new (2D) below", font=font(14, True), fill=INK)
    for i, (key, _, _) in enumerate(rows):
        for j, im in enumerate([old_file(rev, f"public/assets/gen/portrait.{key}.png"), new_file(f"public/assets/gen/portrait.{key}.png")]):
            if im is not None:
                out.alpha_composite(im.resize((s, s), Image.LANCZOS), (GAP + i * (s + 8), 32 + j * (s + 8)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--old", default="470aff4")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent))
    o = ap.parse_args()
    rows = roster()
    out = Path(o.out)
    for n, part in enumerate([rows[:14], rows[14:]], 1):
        sheet(part, o.old, f"Fusion pets: old ({o.old}) next to new, the baby style ({n}/2)").convert("RGB").save(out / f"contact-sheet-{n}.png", optimize=True)
    small(rows, o.old).convert("RGB").save(out / "contact-sheet-small.png", optimize=True)
    print(f"wrote {out}/contact-sheet-1.png, contact-sheet-2.png, contact-sheet-small.png")


if __name__ == "__main__":
    main()
