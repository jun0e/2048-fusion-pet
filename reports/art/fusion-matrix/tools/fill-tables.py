#!/usr/bin/env python3
"""Fill the generated tables in matrix.md from the JSON results, between the marker comments.

Markers: <!-- roster-table --> ... <!-- /roster-table -->, <!-- twin-table --> ... <!-- /twin-table -->,
<!-- palette-table --> ... <!-- /palette-table -->, <!-- today-table --> ... <!-- /today-table -->.
Reads fusion-roster.json, twin-test.json and palette-check.json; rewrites matrix.md in place.

usage: /usr/bin/python3 fill-tables.py
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = os.path.dirname(HERE)


def fill(text, name, body):
    pat = re.compile(rf"(<!-- {name} -->\n).*?(<!-- /{name} -->)", re.S)
    assert pat.search(text), name
    return pat.sub(lambda m: m.group(1) + body + "\n" + m.group(2), text)


def main():
    roster = json.load(open(os.path.join(MATRIX, "fusion-roster.json")))
    twin = json.load(open(os.path.join(MATRIX, "twin-test.json")))
    pal = json.load(open(os.path.join(MATRIX, "palette-check.json")))
    fus = roster["fusions"]
    by = {f["key"]: f for f in fus}
    nm = lambda k: by[k]["name"] if k in by else k

    rows = ["| # | Key | Pet (today) | Skill | Animal | Body plan | View | Why |", "|---|---|---|---|---|---|---|---|"]
    for i, f in enumerate(fus, 1):
        name = f["name"] if f["nameNote"] == "keep" else f"**{f['name']}** (today {f['nameToday']})"
        rows.append(f"| {i} | `{f['key']}` | {name} | {f['skill']} | {f['animal']} | {f['bodyPlan']} | {f['view']} | {f['why']} |")
    roster_table = "\n".join(rows)

    t = twin["targets"]
    rows = ["| Key | Animal | Closest fusion | Closest foe contract | Closest base pet | Pass |", "|---|---|---|---|---|---|"]
    for f in fus:
        r = twin["proposed"][f["key"]]
        cell = lambda pair, lim, label: f"{'**' if pair[0] > lim else ''}{pair[0]:.2f} {label}{'**' if pair[0] > lim else ''}"
        rows.append(f"| `{f['key']}` | {f['animal']} | {cell(r['twin'], t['twin'], nm(r['twin'][1]))} | {cell(r['foe'], t['foe'], r['foe'][1])} | {cell(r['pet'], t['pet'], r['pet'][1])} | {'yes' if r['pass'] else 'no'} |")
    s = twin["summary"]["proposed"]
    rows.append(f"| **max / median** | | **{s['twinMax']:.2f} / {s['twinMedian']:.2f}** | **{s['foeMax']:.2f} / {s['foeMedian']:.2f}** | **{s['petMax']:.2f} / {s['petMedian']:.2f}** | **{s['passing']}/{s['n']}** |")
    twin_table = "\n".join(rows)

    rows = ["| Key | Today's sprite: closest fusion | Closest foe contract | Closest base pet |", "|---|---|---|---|"]
    for f in fus:
        r = twin["today"].get(f["key"])
        if not r:
            continue
        rows.append(f"| `{f['key']}` | {r['twin'][0]:.2f} {r['twin'][1]} | {r['foe'][0]:.2f} {r['foe'][1]} | {r['pet'][0]:.2f} {r['pet'][1]} |")
    s2 = twin["summary"].get("today")
    if s2:
        rows.append(f"| **max / median** | **{s2['twinMax']:.2f} / {s2['twinMedian']:.2f}** | **{s2['foeMax']:.2f} / {s2['foeMedian']:.2f}** | **{s2['petMax']:.2f} / {s2['petMedian']:.2f}** |")
    today_table = "\n".join(rows)

    rows = ["| Key | Dominant | L* | Keep: ratio · ΔL* · carrier | Lane: ratio · ΔL* · carrier | Separating colours (keep / lane, of 6) |", "|---|---|---|---|---|---|"]
    for f in fus:
        r = pal["fusions"][f["key"]]
        k, l = r["keep"], r["lane"]
        fmt = lambda g: f"{g['ratio']:.2f} · {g['dL']:+.0f} · {g['carrier']['role']} `{g['carrier']['hex'].upper()}` ({g['carrier']['dL']:+.0f})"
        nk, nl = len(k["separating"]), len(l["separating"])
        rows.append(f"| `{f['key']}` | `{r['dominant'].upper()}` | {r['lstar']:.0f} | {fmt(k)} | {fmt(l)} | {nk} / {'**' if nl < 2 else ''}{nl}{'**' if nl < 2 else ''} |")
    palette_table = "\n".join(rows)

    p = os.path.join(MATRIX, "matrix.md")
    text = open(p, encoding="utf-8").read()
    text = fill(text, "roster-table", roster_table)
    text = fill(text, "twin-table", twin_table)
    text = fill(text, "today-table", today_table)
    text = fill(text, "palette-table", palette_table)
    open(p, "w", encoding="utf-8").write(text)
    print("filled", p)


if __name__ == "__main__":
    main()
