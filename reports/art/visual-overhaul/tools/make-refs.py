#!/usr/bin/env python3
"""Reference images for the concept generation (Revision 2 of the proposal).

Writes to <overhaul>/concepts/refs/ only:
  sil-<name>.png        black-on-white silhouette of each roster sketch symbol (the generation contract)
  sil-smogpup.png       one fusion body-plan silhouette (serpent coil + dragon head) for the W5 test
  wireframe-phone.png   the phone from hud-layout.svg, rendered and cropped (a layout reference for style frames)

The silhouettes are rasterised straight from the SVG geometry (M/L/C/Z paths, ellipses, circles,
polygons, stroked polylines), the same way the twin test does it, so they match the numbers in the
proposal. Needs Pillow + NumPy (/usr/bin/python3 has both).

usage: /usr/bin/python3 make-refs.py
"""
import math
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OVERHAUL = os.path.dirname(HERE)
REFS = os.path.join(OVERHAUL, "concepts", "refs")
S = 4
BOX = 120
MARGIN = 16  # px around the 480 px drawing: a 512 px square

SMOGPUP = """<svg xmlns="http://www.w3.org/2000/svg"><symbol id="smogpup" viewBox="0 0 120 120"><g>
  <circle cx="44" cy="88" r="14"/><circle cx="70" cy="92" r="16"/><circle cx="94" cy="82" r="13"/>
  <path d="M36,76 C30,58 34,44 46,34" stroke="#000" stroke-width="12" stroke-linecap="round" fill="none"/>
  <ellipse cx="38" cy="30" rx="17" ry="11"/>
  <polygon points="22,34 10,42 24,40"/>
  <polygon points="44,22 50,6 52,24"/><polygon points="34,22 26,8 40,24"/>
  <polygon points="60,80 62,64 70,80"/><polygon points="76,78 80,62 86,80"/><polygon points="92,70 98,56 102,72"/>
  <polygon points="104,86 118,80 116,96"/>
</g></symbol></svg>"""


def nums(s):
    return [float(v) for v in re.findall(r"-?\d*\.?\d+", s)]


def flatten_path(d):
    toks = re.findall(r"[MLCZmlcz]|-?\d*\.?\d+", d)
    subs, cur, i, cmd, pt = [], [], 0, None, (0, 0)
    while i < len(toks):
        t = toks[i]
        if t in "MLCZmlcz":
            cmd = t
            i += 1
            if cmd in "Zz" and cur:
                subs.append(cur)
                cur = []
            continue
        if cmd in "Mm":
            pt = (float(toks[i]), float(toks[i + 1]))
            i += 2
            if cur:
                subs.append(cur)
            cur = [pt]
            cmd = "L"
        elif cmd in "Ll":
            pt = (float(toks[i]), float(toks[i + 1]))
            i += 2
            cur.append(pt)
        elif cmd in "Cc":
            x1, y1, x2, y2, x, y = [float(v) for v in toks[i : i + 6]]
            i += 6
            p0 = pt
            for k in range(1, 17):
                u = k / 16
                w = 1 - u
                cur.append((w * w * w * p0[0] + 3 * w * w * u * x1 + 3 * w * u * u * x2 + u * u * u * x, w * w * w * p0[1] + 3 * w * w * u * y1 + 3 * w * u * u * y2 + u * u * u * y))
            pt = (x, y)
        else:
            i += 1
    if cur:
        subs.append(cur)
    return subs


def draw_symbol(sym):
    im = Image.new("L", (BOX * S, BOX * S), 0)
    d = ImageDraw.Draw(im)
    sc = lambda p: (p[0] * S, p[1] * S)
    for el in sym.iter():
        tag = el.tag.split("}")[-1]
        if tag == "circle":
            cx, cy, r = float(el.get("cx")), float(el.get("cy")), float(el.get("r"))
            d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=255)
        elif tag == "ellipse":
            cx, cy, rx, ry = [float(el.get(k)) for k in ("cx", "cy", "rx", "ry")]
            ang = 0
            tr = el.get("transform")
            if tr:
                m = re.match(r"rotate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)", tr)
                ang = math.radians(float(m.group(1)))
            pts = []
            for k in range(72):
                a = 2 * math.pi * k / 72
                x, y = rx * math.cos(a), ry * math.sin(a)
                pts.append(((cx + x * math.cos(ang) - y * math.sin(ang)) * S, (cy + x * math.sin(ang) + y * math.cos(ang)) * S))
            d.polygon(pts, fill=255)
        elif tag == "polygon":
            v = nums(el.get("points"))
            d.polygon([(v[i] * S, v[i + 1] * S) for i in range(0, len(v), 2)], fill=255)
        elif tag == "path":
            stroked = el.get("stroke") is not None and el.get("fill") == "none"
            subs = flatten_path(el.get("d"))
            if stroked:
                w = float(el.get("stroke-width", 1)) * S
                for pts in subs:
                    P = [sc(p) for p in pts]
                    for a, b in zip(P, P[1:]):
                        d.line([a, b], fill=255, width=int(round(w)))
                    for p in P:
                        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=255)
            else:
                for pts in subs:
                    if len(pts) >= 3:
                        d.polygon([sc(p) for p in pts], fill=255)
    return im


def write_silhouette(name, sym):
    mask = draw_symbol(sym)
    out = Image.new("L", (BOX * S + 2 * MARGIN, BOX * S + 2 * MARGIN), 255)
    out.paste(Image.eval(mask, lambda v: 255 - v), (MARGIN, MARGIN))
    p = os.path.join(REFS, f"sil-{name}.png")
    out.convert("RGB").save(p)
    return p


def wireframe_phone():
    """Render hud-layout.svg through Quick Look (padded to a square so nothing is cropped) and cut out the phone."""
    svg = open(os.path.join(OVERHAUL, "hud-layout.svg")).read()
    # pad the drawing to a square (Quick Look renders a square thumbnail and crops otherwise)
    svg = re.sub(r'viewBox="0 0 (\d+) (\d+)" width="\d+" height="\d+"', lambda m: (lambda W: f'viewBox="0 0 {W} {W}" width="{W}" height="{W}"')(max(int(m.group(1)), int(m.group(2)))), svg, count=1)
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "hud-sq.svg")
        open(src, "w").write(svg)
        subprocess.run(["qlmanage", "-t", "-s", "2600", "-o", tmp, src], capture_output=True)
        png = os.path.join(tmp, "hud-sq.svg.png")
        if not os.path.exists(png):
            print("wireframe render failed (qlmanage); skipping", file=sys.stderr)
            return None
        im = Image.open(png).convert("RGB")
        sc = im.width / 1000.0
        box = (int(24 * sc), int(22 * sc), int(426 * sc), int(878 * sc))
        crop = im.crop(box).resize((780, int(780 * (box[3] - box[1]) / (box[2] - box[0]))), Image.LANCZOS)
        p = os.path.join(REFS, "wireframe-phone.png")
        crop.save(p)
        return p


def parse_svg(path):
    """Parse one of this folder's own SVGs; refuse anything with a DOCTYPE or entities (XXE / billion-laughs guard)."""
    text = open(path, encoding="utf-8").read()
    if "<!DOCTYPE" in text or "<!ENTITY" in text:
        raise SystemExit(f"{path}: DOCTYPE/ENTITY declarations are not allowed here")
    return ET.fromstring(text)


def main():
    os.makedirs(REFS, exist_ok=True)
    root = parse_svg(os.path.join(OVERHAUL, "silhouettes.svg"))
    syms = {s.get("id"): s for s in root.iter("{http://www.w3.org/2000/svg}symbol")}
    for name, sym in syms.items():
        print("wrote", write_silhouette(name, sym))
    extra = ET.fromstring(SMOGPUP)
    print("wrote", write_silhouette("smogpup", extra.find("{http://www.w3.org/2000/svg}symbol")))
    print("wrote", wireframe_phone())


if __name__ == "__main__":
    main()
