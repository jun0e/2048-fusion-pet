#!/usr/bin/env python3
"""Rasterise the 28 fusion silhouette symbols into black-on-white contracts.

Reads <matrix>/silhouettes.svg and writes <matrix>/contracts/sil-<a>+<b>.png: a 512 px square,
white, with the 120-unit symbol drawn at 4x (480 px) inside a 16 px margin, the same way the foe
contracts in tools/refs/foes/ were made (reports/art/visual-overhaul/tools/make-refs.py), so the
files can move to tools/refs/fusions/ unchanged after approval.

The symbols use only the subset that rasteriser understands: circle, ellipse (with an optional
rotate(a cx cy)), polygon, filled paths of M/L/C/Z, and stroked paths (fill="none") with round
caps. Needs Pillow + NumPy (/usr/bin/python3).

usage: /usr/bin/python3 make-contracts.py
"""
import math
import os
import re
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = os.path.dirname(HERE)
OUT = os.path.join(MATRIX, "contracts")
S = 4
BOX = 120
MARGIN = 16
NS = "{http://www.w3.org/2000/svg}"


def nums(s):
    return [float(v) for v in re.findall(r"-?\d*\.?\d+", s)]


def flatten_path(d):
    """Absolute M/L/C/Z only (the foe rasteriser's subset); curves are flattened to 16 steps."""
    if re.search(r"[QqAaHhVvSsTt]", d):
        raise SystemExit(f"unsupported path command in {d!r}: use M/L/C/Z only")
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
                if not m:
                    raise SystemExit(f"unsupported transform {tr!r}: use rotate(a cx cy)")
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


def write_contract(key, sym):
    mask = draw_symbol(sym)
    out = Image.new("L", (BOX * S + 2 * MARGIN, BOX * S + 2 * MARGIN), 255)
    out.paste(Image.eval(mask, lambda v: 255 - v), (MARGIN, MARGIN))
    p = os.path.join(OUT, f"sil-{key}.png")
    out.convert("RGB").save(p)
    return p


def parse_svg(path):
    text = open(path, encoding="utf-8").read()
    if "<!DOCTYPE" in text or "<!ENTITY" in text:
        raise SystemExit(f"{path}: DOCTYPE/ENTITY declarations are not allowed here")
    return ET.fromstring(text)


def symbols(path):
    """{fusion key: symbol element} from the sheet: symbol ids are the keys with '+' as '-'."""
    root = parse_svg(path)
    out = {}
    for s in root.iter(f"{NS}symbol"):
        sid = s.get("id")
        if sid.startswith("sil-"):
            a, b = sid[4:].split("-", 1)
            out[f"{a}+{b}"] = s
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    syms = symbols(os.path.join(MATRIX, "silhouettes.svg"))
    for key, sym in syms.items():
        print("wrote", write_contract(key, sym))
    print(len(syms), "contracts")


if __name__ == "__main__":
    main()
