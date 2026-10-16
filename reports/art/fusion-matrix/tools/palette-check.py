#!/usr/bin/env python3
"""Figure-ground check of the 28 fusion palettes against the two grounds pets roam over.

For every fusion in fusion-roster.json: the WCAG contrast ratio and the L* difference of the
dominant colour against the dark keep floor (#3E3C58) and the light lane (#D9C7A3), and the best
separating tone of the body set (dominant, shade, light) per ground. The silhouette gate in
tools/silhouette-check.py counts a body pixel as separated from a ground when its L* differs by
20 or more, so dL >= 20 is the bar used here. Writes <matrix>/palette-check.json and prints a
table. Needs NumPy (/usr/bin/python3).

usage: /usr/bin/python3 palette-check.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = os.path.dirname(HERE)
GROUNDS = {"keep": "#3E3C58", "lane": "#D9C7A3"}
SEP_DL = 20


def rgb(h):
    return [int(h[i : i + 2], 16) / 255 for i in (1, 3, 5)]


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(h):
    r, g, b = [lin(c) for c in rgb(h)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def lstar(h):
    y = lum(h)
    f = y ** (1 / 3) if y > 216 / 24389 else (24389 / 27 * y + 16) / 116
    return 116 * f - 16


def contrast(a, b):
    hi, lo = sorted([lum(a), lum(b)], reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def main():
    roster = json.load(open(os.path.join(MATRIX, "fusion-roster.json")))
    out = {"grounds": GROUNDS, "sepDL": SEP_DL, "fusions": {}}
    print(f"{'fusion':18s} {'dominant':>8s} {'L*':>5s} | {'keep ratio':>10s} {'dL':>5s} {'carrier':>10s} | {'lane ratio':>10s} {'dL':>5s} {'carrier':>10s}  keep/lane")
    for f in roster["fusions"]:
        pal = f["palette"]
        dom = pal["dominant"]
        body = {"dominant": dom, "shade": pal["shade"], "light": pal["light"]}
        every = {**body, "accentA": pal["accentA"], "accentB": pal["accentB"], "extra": pal["extra"]}
        r = {"dominant": dom, "lstar": round(lstar(dom), 1)}
        notes = []
        for g, hx in GROUNDS.items():
            gl = lstar(hx)
            r[g] = {"ratio": round(contrast(dom, hx), 2), "dL": round(lstar(dom) - gl, 1)}
            best = max(body.items(), key=lambda kv: abs(lstar(kv[1]) - gl))
            r[g]["bestTone"] = best[0]
            r[g]["bestDL"] = round(lstar(best[1]) - gl, 1)
            r[g]["dominantSeparates"] = abs(r[g]["dL"]) >= SEP_DL
            r[g]["bodySeparates"] = abs(r[g]["bestDL"]) >= SEP_DL
            # every palette colour that separates from this ground (the cel tone or an accent can be any of them)
            seps = {k: round(lstar(v) - gl, 1) for k, v in every.items() if abs(lstar(v) - gl) >= SEP_DL}
            r[g]["separating"] = seps
            carrier = max(every.items(), key=lambda kv: abs(lstar(kv[1]) - gl))
            r[g]["carrier"] = {"role": carrier[0], "hex": carrier[1], "dL": round(lstar(carrier[1]) - gl, 1)}
            if not r[g]["dominantSeparates"]:
                notes.append(f"dominant weak on the {g}: {carrier[0]} {carrier[1]} ({carrier[1] and (lstar(carrier[1]) - gl):+.0f} L*) must be the cel tone or a large accent there, with the plum outline")
        r["note"] = "; ".join(notes) if notes else "the dominant colour reads on both grounds"
        out["fusions"][f["key"]] = r
        k, l = r["keep"], r["lane"]
        print(f"{f['key']:18s} {dom:>8s} {r['lstar']:5.1f} | {k['ratio']:10.2f} {k['dL']:5.0f} {k['carrier']['role']:>10s} | {l['ratio']:10.2f} {l['dL']:5.0f} {l['carrier']['role']:>10s}  {len(k['separating'])}/{len(l['separating'])} of 6 separate")
    json.dump(out, open(os.path.join(MATRIX, "palette-check.json"), "w"), indent=1)
    print("wrote", os.path.join(MATRIX, "palette-check.json"))


if __name__ == "__main__":
    main()
