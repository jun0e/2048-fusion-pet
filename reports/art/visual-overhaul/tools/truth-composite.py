#!/usr/bin/env python3
"""Truth composite (no API call): the generated, keyed concept foes at their real in-game size on the
proposed ground, with real tile values, at 390x844 CSS px x 2 DPR. The honest readability check: the
model's style frames prove composition only; this image shows what the player would actually see.

Sizes come from the game: a foe sprite spans size x 2.5 world units (x 2.6 for a boss), the generated
sprite's longest side fills 0.8 of that (src/render/foes.js), and U (px per world unit) is
min(390 / 9.5, (844 - insets) / 19.85) from src/render/stage.js, about 35 px at 390x844 with the
compact HUD. Layout geometry follows hud-layout.svg. Needs Pillow.

usage: /usr/bin/python3 truth-composite.py                       -> concepts/truth-composite.png (sizes as in the game today)
       /usr/bin/python3 truth-composite.py --fill=1.0 --floor=0.42 --out=truth-composite-sized.png
                                                                  (the proposed foe sizes: sprite fills its box, S class 0.42)
       --busy   draws the first composite's high-frequency cobbles across the whole lane (for the clutter comparison)
Also writes concepts/refs/ground-lane-calm.png and ground-lane-busy.png, the swatches the figure-ground clutter metric reads.
"""
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont

ARGS = {a.split("=")[0].lstrip("-"): (a.split("=")[1] if "=" in a else True) for a in sys.argv[1:] if a.startswith("--")}

HERE = os.path.dirname(os.path.abspath(__file__))
OVERHAUL = os.path.dirname(HERE)
CONCEPTS = os.path.join(OVERHAUL, "concepts")
WORKTREE = os.path.abspath(os.path.join(OVERHAUL, "..", "..", ".."))
GEN = os.path.join(WORKTREE, "public", "assets", "gen")
DPR = 2
W, H = 390 * DPR, 844 * DPR
U = 35.0  # px per world unit at 1x (measured for 390x844 with the compact HUD)
GEN_FILL = float(ARGS.get("fill", 0.8))  # src/render/foes.js GEN_FILL today; the proposal asks for 1.0
SIZE_FLOOR = float(ARGS.get("floor", 0))  # the proposal asks for an S-class floor of 0.42
BUSY = bool(ARGS.get("busy", False))
OUT_NAME = ARGS.get("out", "truth-composite.png")
SIZES = {"fox": 0.38, "pangolin": 0.50, "macaque": 0.46, "moth": 0.42, "hivequeen": 0.95}  # src/sim/enemies.js (ninja, armoredSoldier, ringMonk, pixie, elfRuler)
BOSS = {"hivequeen"}
INK = (43, 29, 46)
CREAM = (255, 250, 242)
STONE, STONE_SH, STONE_LT = (207, 202, 191), (169, 162, 149), (233, 228, 216)
LANE, COB_DK, COB_LT = (217, 199, 163), (201, 180, 142), (230, 215, 184)
HEDGE = (74, 90, 82)
KEEP, SLOT, SLOT_EDGE = (76, 74, 106), (62, 60, 88), (106, 103, 136)
SKY = (111, 119, 156)


def px(v):
    return int(round(v * DPR))


def font(size):
    for f in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/Library/Fonts/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        if os.path.exists(f):
            try:
                return ImageFont.truetype(f, size)
            except Exception:
                pass
    return ImageFont.load_default()


def outlined_text(d, xy, text, size, fill, stroke, anchor="mm"):
    d.text(xy, text, font=font(size), fill=fill, stroke_width=max(1, size // 9), stroke_fill=stroke, anchor=anchor)


def load(path):
    return Image.open(path).convert("RGBA")


def paste_fit(canvas, im, cx, cy, longest, anchor_bottom=False):
    k = longest / max(im.size)
    t = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    x = int(cx - t.width / 2)
    y = int(cy - t.height) if anchor_bottom else int(cy - t.height / 2)
    canvas.paste(t, (x, y), t)
    return t


def shadow(d, cx, cy, w, h, red=False):
    # contact shadows are plum-dark at 30% for everyone: red is the game's damage colour (Rev 2 review note 1)
    col = (43, 29, 46, 77)
    d.ellipse([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], fill=col)


def draw_lane(d, lx, y0, y1, busy):
    """The lane spec: a calm centre band (low contrast, low frequency) with cobble detail only in the
    outer 20% bands next to the hedges; `busy` draws the first composite's cobbles across the whole lane."""
    d.rectangle([px(lx), px(y0), px(lx + 50), px(y1)], fill=LANE)
    if busy:
        for _ in range(140):
            cx = lx + random.uniform(2, 48)
            cy = random.uniform(y0 + 2, y1 - 2)
            rw = random.uniform(4, 9)
            rh = rw * random.uniform(0.6, 0.9)
            d.ellipse([px(cx - rw / 2), px(cy - rh / 2), px(cx + rw / 2), px(cy + rh / 2)], fill=random.choice([COB_DK, COB_LT, LANE]), outline=(185, 165, 130), width=px(0.6))
        return
    # calm centre: a few very soft, large sand patches (<= 4 L* from the lane)
    for _ in range(10):
        cx = lx + random.uniform(10, 40)
        cy = random.uniform(y0 + 10, y1 - 10)
        rw = random.uniform(10, 18)
        d.ellipse([px(cx - rw / 2), px(cy - rw * 0.35), px(cx + rw / 2), px(cy + rw * 0.35)], fill=(222, 206, 172))
    # cobbles only in the outer bands (20% each side), low contrast
    for band in ((lx, lx + 10), (lx + 40, lx + 50)):
        for _ in range(26):
            cx = random.uniform(band[0] + 2, band[1] - 2)
            cy = random.uniform(y0 + 2, y1 - 2)
            rw = random.uniform(3, 6)
            d.ellipse([px(cx - rw / 2), px(cy - rw * 0.35), px(cx + rw / 2), px(cy + rw * 0.35)], fill=random.choice([(208, 190, 152), (226, 211, 178)]), outline=(196, 178, 142), width=px(0.5))


def save_ground_swatches():
    """48 px swatches of the busy and calm lane centres for the figure-ground clutter metric."""
    refs = os.path.join(CONCEPTS, "refs")
    os.makedirs(refs, exist_ok=True)
    for name, busy in (("busy", True), ("calm", False)):
        random.seed(11)
        sw = Image.new("RGB", (px(50), px(120)), LANE)
        draw_lane(ImageDraw.Draw(sw), 0, 0, 120, busy)
        # the swatch the metric reads is the centre band at 1x: 48x48 CSS px
        sw.crop((px(1), px(36), px(49), px(84))).resize((48, 48), Image.LANCZOS).save(os.path.join(refs, f"ground-lane-{name}.png"))


def main():
    random.seed(7)
    img = Image.new("RGB", (W, H), SKY)  # RGB base: Pillow blends RGBA fills (the shadows, the caption) only onto RGB
    d = ImageDraw.Draw(img, "RGBA")
    # painted valley hint
    d.polygon([(0, px(520)), (px(60), px(470)), (px(170), px(500)), (px(240), px(445)), (px(390), px(450)), (W, H), (0, H)], fill=(90, 98, 136, 255))

    # --- top bar (B) ---
    for cx in (34, 84):
        d.ellipse([px(cx - 22), px(52), px(cx + 22), px(96)], fill=STONE, outline=INK, width=px(1.5))
    outlined_text(d, (px(34), px(74)), "II", px(14), INK, STONE)
    outlined_text(d, (px(84), px(74)), "x1", px(14), INK, STONE)
    d.rounded_rectangle([px(118), px(52), px(274), px(96)], radius=px(14), fill=CREAM, outline=INK, width=px(1.5))
    outlined_text(d, (px(196), px(70)), "1,416", px(20), INK, CREAM)
    d.text((px(196), px(88)), "best 1,416", font=font(px(10)), fill=(92, 85, 96), anchor="mm")
    d.ellipse([px(334), px(52), px(378), px(96)], fill=CREAM, outline=INK, width=px(1.5))
    outlined_text(d, (px(356), px(74)), "2048", px(11), INK, CREAM)

    # --- chapter lintel (C) ---
    d.rounded_rectangle([px(8), px(102), px(382), px(132)], radius=px(6), fill=(195, 190, 179), outline=INK, width=px(1.5))
    d.ellipse([px(17), px(108), px(35), px(126)], fill=CREAM, outline=INK, width=px(1))
    d.text((px(40), px(117)), "Wave 6", font=font(px(12)), fill=INK, anchor="lm")
    d.text((px(88), px(117)), "Eternal Forest", font=font(px(10)), fill=(92, 85, 96), anchor="lm")
    d.rounded_rectangle([px(164), px(111), px(252), px(123)], radius=px(6), fill=CREAM, outline=INK, width=px(1))
    d.rounded_rectangle([px(164), px(111), px(200), px(123)], radius=px(6), fill=INK)
    d.text((px(258), px(117)), "5 left", font=font(px(10)), fill=INK, anchor="lm")
    d.rounded_rectangle([px(330), px(105), px(354), px(129)], radius=px(3), fill=CREAM, outline=INK, width=px(1))
    alive = [(0, 1), (1, 1), (2, 1), (0, 2), (1, 2), (3, 2), (0, 3), (1, 3), (2, 3), (3, 3)]
    for c, r in alive:
        d.rectangle([px(333 + c * 5), px(108 + r * 5), px(336 + c * 5), px(111 + r * 5)], fill=INK)
    d.text((px(360), px(117)), "10", font=font(px(12)), fill=INK, anchor="lm")

    # --- news ribbon (D) ---
    d.rounded_rectangle([px(70), px(138), px(320), px(162)], radius=px(12), fill=CREAM, outline=INK, width=px(1.5))
    d.text((px(195), px(150)), "Wave 5 cleared! +27", font=font(px(11)), fill=INK, anchor="mm")

    # --- field frame (E): tray, towers, gates, lanes, hedges, ticks, parapet ---
    d.rounded_rectangle([px(40), px(170), px(340), px(470)], radius=px(10), fill=(95, 102, 128), outline=INK, width=px(1.5))
    for x0 in (12, 352):
        d.rounded_rectangle([px(x0), px(166), px(x0 + 26), px(470)], radius=px(4), fill=STONE_SH, outline=INK, width=px(1.5))
        d.rectangle([px(x0 - 4), px(160), px(x0 + 30), px(172)], fill=STONE, outline=INK, width=px(1.5))
    lane_x = [65, 135, 205, 275]
    for i, lx in enumerate(lane_x):
        # gate arch
        d.rectangle([px(lx + 7), px(180), px(lx + 43), px(196)], fill=STONE, outline=INK, width=px(1.5))
        d.pieslice([px(lx + 7), px(162), px(lx + 43), px(198)], 180, 360, fill=STONE, outline=INK, width=px(1.5))
        d.rectangle([px(lx + 13), px(184), px(lx + 37), px(196)], fill=INK)
        d.pieslice([px(lx + 13), px(172), px(lx + 37), px(196)], 180, 360, fill=INK)
        if i in (1, 2):
            d.ellipse([px(lx + 18), px(176), px(lx + 32), px(192)], fill=(140, 90, 200))
        # lane: calm centre band, cobbles in the edge bands (or the first composite's busy cobbles with --busy)
        draw_lane(d, lx, 196, 458, BUSY)
        for ty in (266, 336, 406):
            d.line([px(lx + 3), px(ty), px(lx + 47), px(ty)], fill=(154, 147, 135), width=px(1))
        if i < 3:
            d.rounded_rectangle([px(lx + 52), px(200), px(lx + 68), px(454)], radius=px(6), fill=HEDGE, outline=INK, width=px(1))
    # parapet
    d.rectangle([px(40), px(456), px(340), px(470)], fill=STONE_SH, outline=INK, width=px(1.5))
    for i, lx in enumerate(lane_x):
        d.rectangle([px(lx + 11), px(446), px(lx + 39), px(458)], fill=STONE, outline=INK, width=px(1.5))
        d.ellipse([px(lx + 20), px(439), px(lx + 30), px(449)], fill=INK)
        if i == 2:
            d.ellipse([px(lx + 21), px(432), px(lx + 29), px(442)], fill=(242, 102, 45))

    # --- the keep (F) with real tiles ---
    d.rounded_rectangle([px(55), px(474), px(335), px(750)], radius=px(10), fill=KEEP, outline=INK, width=px(2))
    for (x0, y0) in ((47, 468), (321, 468), (47, 730), (321, 730)):
        d.rounded_rectangle([px(x0), px(y0), px(x0 + 22), px(y0 + 26)], radius=px(3), fill=STONE, outline=INK, width=px(1.5))
    board = [[2048, 256, 16, 8], [512, 128, 64, 2], [32, 64, 16, 4], [8, 2, 4, None]]
    elem = {2048: ("fire", "earth"), 256: ("ice", "nature"), 512: ("lightning", "metal")}
    pets = {16: "nature", 64: "fire", 128: "ice", 32: "lightning"}
    # the tile pick (Rev 2 review note 4): a LIGHT element tint on the plate (the game's tone(colour, 0.42)
    # today), the number on top in ink with a cream stroke, the creature over the sill, the glyph badge
    KEY = {"fire": (255, 122, 61), "ice": (127, 212, 255), "lightning": (255, 225, 77), "poison": (180, 108, 255), "earth": (199, 154, 98), "wind": (191, 247, 230), "metal": (201, 211, 223), "nature": (76, 217, 100)}
    FUSION = {2048: (255, 159, 28), 256: (127, 255, 212), 512: (255, 215, 0)}

    def tint(rgb, k):
        return tuple(int(c + (255 - c) * (1 - k)) for c in rgb)

    for r in range(4):
        for c in range(4):
            x = 61 + c * 70
            y = 480 + r * 70
            d.rounded_rectangle([px(x), px(y), px(x + 64), px(y + 64)], radius=px(8), fill=SLOT, outline=SLOT_EDGE, width=px(1))
            v = board[r][c]
            if v is None:
                continue
            plate = CREAM if v < 16 else tint(FUSION[v], 0.22) if v >= 256 else tint(KEY[pets.get(v, "fire")], 0.42)
            d.rounded_rectangle([px(x + 3), px(y + 3), px(x + 61), px(y + 61)], radius=px(8), fill=plate, outline=INK, width=px(2))
            if v >= 256:
                a, b = elem[v]
                outlined_text(d, (px(x + 32), px(y + 32)), str(v), px(17 if v < 1000 else 15), INK, CREAM)
                for bx, el in ((x + 13, a), (x + 51, b)):
                    bp = os.path.join(GEN, f"badge.{el}.png")
                    if os.path.exists(bp):
                        paste_fit(img, load(bp), px(bx), px(y + 52), px(16))
            elif v >= 16:
                sp = os.path.join(GEN, f"pet.{pets.get(v, 'fire')}.{v}.png")
                if os.path.exists(sp):
                    pet = load(sp)
                    crop = pet.crop((0, 0, pet.width, int(pet.height * 0.84)))
                    k = px(64 * 0.62) / crop.height
                    t = crop.resize((int(crop.width * k), int(crop.height * k)), Image.LANCZOS)
                    img.paste(t, (px(x + 32) - t.width // 2, px(y + 60) - t.height), t)
                outlined_text(d, (px(x + 32), px(y + 21)), str(v), px(19 if v < 100 else 17), INK, CREAM)
                bp = os.path.join(GEN, f"badge.{pets.get(v, 'fire')}.png")
                if os.path.exists(bp):
                    paste_fit(img, load(bp), px(x + 51), px(y + 51), px(16))
            else:
                ep = os.path.join(GEN, f"egg.{v}.png")
                if os.path.exists(ep):
                    paste_fit(img, load(ep), px(x + 32), px(y + 60), px(38), anchor_bottom=True)
                outlined_text(d, (px(x + 32), px(y + 19)), str(v), px(20), INK, CREAM)

    # --- deck (G) and bottom bar (H) ---
    d.text((px(104), px(777)), "DECK", font=font(px(9)), fill=(190, 200, 255), anchor="lm")
    for i, el in enumerate(["fire", "ice", "nature"]):
        bp = os.path.join(GEN, f"badge.{el}.png")
        if os.path.exists(bp):
            paste_fit(img, load(bp), px(153 + i * 32), px(773), px(26))
    d.rounded_rectangle([px(244), px(760), px(292), px(786)], radius=px(7), outline=INK, width=px(1))
    d.text((px(268), px(773)), "at 256", font=font(px(9)), fill=INK, anchor="mm")
    d.rounded_rectangle([px(12), px(794), px(162), px(834)], radius=px(20), fill=CREAM, outline=INK, width=px(1.5))
    d.ellipse([px(21), px(803), px(43), px(825)], fill=(255, 211, 74), outline=(168, 102, 15), width=px(2))
    d.text((px(50), px(814)), "978", font=font(px(16)), fill=INK, anchor="lm")
    d.rounded_rectangle([px(98), px(804), px(154), px(824)], radius=px(10), fill=(233, 228, 216), outline=INK, width=px(1))
    d.text((px(126), px(814)), "Swipe 5", font=font(px(9)), fill=INK, anchor="mm")
    d.rounded_rectangle([px(240), px(794), px(378), px(834)], radius=px(12), fill=STONE, outline=INK, width=px(1.5))
    d.text((px(309), px(814)), "Wave 7 now  12", font=font(px(11)), fill=INK, anchor="mm")

    # --- namecard rail with real portraits ---
    for i, key in enumerate(["fire+ice", "wind+nature", "lightning+metal", "poison+nature"]):
        y = 202 + i * 66
        d.rounded_rectangle([px(338), px(y), px(386), px(y + 58)], radius=px(8), fill=CREAM, outline=INK, width=px(1.5))
        pp = os.path.join(GEN, f"portrait.{key}.png")
        if os.path.exists(pp):
            t = load(pp).resize((px(42), px(42)), Image.LANCZOS)
            img.paste(t, (px(341), px(y + 3)))
        d.rounded_rectangle([px(338), px(y + 46), px(386), px(y + 58)], radius=px(4), fill=INK if i == 0 else (154, 147, 135))
        if i:
            d.rounded_rectangle([px(338), px(y + 46), px(338 + 48 * (0.75 - 0.2 * i)), px(y + 58)], radius=px(4), fill=INK)
        d.text((px(362), px(y + 52)), "READY" if i == 0 else "", font=font(px(8)), fill=CREAM, anchor="mm")

    # --- foes at the in-game size (today's, or the proposed one with --fill/--floor), plum contact shadows ---
    # the two-value candidates (moth-d, fox-c, macaque-c) when they exist, else the first ones
    def pick(name, *letters):
        for L in letters:
            if os.path.exists(os.path.join(CONCEPTS, f"foe-{name}-{L}.keyed.png")):
                return L
        return None

    placements = [("moth", pick("moth", "d", "b"), 0, 232), ("fox", pick("fox", "c", "b"), 1, 300), ("pangolin", "b", 1, 420), ("hivequeen", "b", 2, 262), ("macaque", pick("macaque", "c", "a"), 3, 350), ("fox", pick("fox", "c", "a"), None, None)]
    sizes_px = []
    for name, letter, lane, yc in placements:
        p = os.path.join(CONCEPTS, f"foe-{name}-{letter}.keyed.png") if letter else ""
        if not p or not os.path.exists(p):
            continue
        size_u = max(SIZES[name], SIZE_FLOOR if name not in BOSS else 0) * (2.6 if name in BOSS else 2.5)
        longest = size_u * U * GEN_FILL * DPR
        sizes_px.append((f"{name}-{letter}", round(longest / DPR)))
        if lane is None:
            cx, cy = px(96), px(478)  # a fox biting the top-left tile, over the keep floor
        else:
            cx, cy = px(lane_x[lane] + 25), px(yc)
        shadow(d, cx, cy + longest * 0.42, longest * 0.8, longest * 0.3)
        paste_fit(img, load(p), cx, cy, longest)
        # a thin HP bar above (as today's foes carry)
        bw = px(1.05 * U / DPR * 1.0) if name not in BOSS else px(2.2 * U / DPR)
        d.rectangle([cx - bw / 2, cy - longest * 0.62, cx + bw / 2, cy - longest * 0.62 + px(4)], fill=(27, 20, 38))
        d.rectangle([cx - bw / 2 + px(1), cy - longest * 0.62 + px(1), cx - bw / 2 + bw * 0.7, cy - longest * 0.62 + px(3)], fill=(123, 227, 106))

    # --- one roaming pet at the PROPOSED 1.0-cell size (today it is 1.18 cells) ---
    fp = os.path.join(GEN, "fusion.fire+ice.png")
    if os.path.exists(fp):
        cx, cy = px(lane_x[3] + 25), px(430)
        shadow(d, cx, cy + px(0.9 * U / DPR * 0.45), px(0.9 * U / DPR * 2), px(0.26 * U / DPR * 2), red=False)
        d.ellipse([cx - px(21), cy + px(6), cx + px(21), cy + px(18)], outline=(91, 140, 255), width=px(2))
        paste_fit(img, load(fp), cx, cy + px(14), px(2.0 * U / DPR), anchor_bottom=True)

    # caption
    d.rectangle([0, H - px(26), W, H], fill=(0, 0, 0, 160))
    d.text((px(8), H - px(13)), f"Truth composite: generated foes at {'the PROPOSED' if GEN_FILL >= 1 else 'TODAY’S'} in-game size (U=35 px/unit, size x 2.5 x {GEN_FILL:g}{', floor ' + str(SIZE_FLOOR) if SIZE_FLOOR else ''}), real tiles, planned tones. Style frames = composition only.", font=font(px(8)), fill=(255, 255, 255), anchor="lm")
    out = os.path.join(CONCEPTS, OUT_NAME)
    img.save(out)
    save_ground_swatches()
    print("wrote", out, img.size, "foe longest side (CSS px):", sizes_px)


if __name__ == "__main__":
    main()
