#!/usr/bin/env python3
"""One contact sheet of every concept image (concepts/_index.png), labelled with id, model and
what the proposal says it proves. Reads concepts/manifest.json. Needs Pillow.

usage: /usr/bin/python3 concept-index.py
"""
import json
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
CONCEPTS = os.path.join(os.path.dirname(HERE), "concepts")
CELL_W, CELL_H, PAD = 300, 330, 10
ORDER = ["style", "foes", "vfx", "ladder", "frame", "poses", "fusion"]


def main():
    m = json.load(open(os.path.join(CONCEPTS, "manifest.json")))
    items = sorted(m["images"].items(), key=lambda kv: (ORDER.index(kv[1]["group"]) if kv[1]["group"] in ORDER else 99, kv[0]))
    cols = 5
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * CELL_W + PAD, rows * CELL_H + PAD + 30), (246, 243, 236))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 8), f"2048 Siege visual overhaul: concept images ({len(items)}), {m.get('generatedAt', '')[:10]}; models and prompts in manifest.json", fill=(43, 29, 46))
    for i, (cid, e) in enumerate(items):
        x = PAD + (i % cols) * CELL_W
        y = PAD + 30 + (i // cols) * CELL_H
        src = os.path.join(CONCEPTS, e.get("keyed", f"{cid}.png")) if e.get("keyed") and "sheet" not in cid else os.path.join(CONCEPTS, f"{cid}.png")
        if not os.path.exists(src):
            src = os.path.join(CONCEPTS, f"{cid}.png")
        im = Image.open(src).convert("RGBA")
        im.thumbnail((CELL_W - 2 * PAD, CELL_H - 50))
        bg = Image.new("RGBA", im.size, (225, 220, 210, 255))
        bg.paste(im, (0, 0), im)
        sheet.paste(bg.convert("RGB"), (x + PAD + (CELL_W - 2 * PAD - im.width) // 2, y + (CELL_H - 50 - im.height) // 2))
        d.text((x + PAD, y + CELL_H - 44), cid, fill=(43, 29, 46))
        d.text((x + PAD, y + CELL_H - 30), f"{e['model']} · {e['aspect']} · {e.get('secs', '?')} s · ${e.get('usd', 0):.3f}", fill=(90, 85, 95))
        if e.get("qa"):
            d.text((x + PAD, y + CELL_H - 16), f"keyed: coverage {e['qa'].get('coverage')} fringe {e['qa'].get('fringe')}", fill=(90, 85, 95))
    out = os.path.join(CONCEPTS, "_index.png")
    sheet.save(out)
    print("wrote", out, sheet.size)


if __name__ == "__main__":
    main()
