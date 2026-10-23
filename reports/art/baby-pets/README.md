# Baby fusion pets (2026-10-23)

The user asked: "check all avatar and remove all 3d art for fusion pet, leave all at 2d, and turn all into cute art style, similar to the narwhal and babies".

## What changed

- **The 28 fusion pets are babies.** Each roster animal (`src/art/fusion-roster.js`) is redrawn in the exact style and proportions of the eight base babies: a huge head, a tiny chubby body, the thick plum outline, the cream sticker rim and flat cel colours.
  - Sparkfrost ships Trailer C's narwhal (`tools/refs/fusions/approved/ice+lightning.png`) as drawn. It is side-on, so its roster `view` is now `profile`, and the field flips it as it turns.
- **No 3D avatar is left for a pet.**
  - A namecard portrait is the pet's own sticker on a flat 2D plate: its fusion colour lightened, with a lighter disc behind it.
  - A pure form's portrait (`.ascended`) is an edit of that sticker: a gold halo, sparkles and a proud smile, on a gold plate with flat rays.
  - The tile, the roaming pet and every card (namecards, the die pick's fusion chips, the keep choice, the result card, the cut-in) now show one drawing.
- **Palettes:** each pet keeps its roster palette, snapped in post (`tools/post.py --snap`). Only the ascended halo adds its gold (`ASCENDED_GOLD`).

## The avatars, checked

| Avatar | Asset | Before | Now |
| --- | --- | --- | --- |
| Namecards, fusion chips, keep and result cards, cut-in | `portrait.<a>+<b>` (28) | 3D soft-vinyl render | 2D: the pet's sticker on a flat plate |
| A pure form's card | `portrait.<a>+<b>.ascended` (28) | 3D soft-vinyl render | 2D: halo edit on a gold plate |
| `?style=classic` namecards | code-drawn vinyl stand-in | 3D look | the generated 2D portrait (every style) |
| Roaming pet, its tile at 256+ | `fusion.<a>+<b>` (28) | 2D, grown-up proportions | 2D baby |
| Die pick, tiles 16 to 128 | `pet.<el>.<value>`, moods | 2D babies | unchanged (the style reference) |
| Eggs, halos, badges, foes, attacks | various | 2D | unchanged |
| Boss intro card | `enemy.<boss>.portrait` (3) | 3D soft-vinyl render | 2D: a half-body sticker of the boss (a casual-game villain: cute, smug, clearly a boss) on a dark flat plate, its own palette |

## How it is made

`tools/pipeline.mjs` makes all of it, and the recipes live in `tools/pipeline-jobs.mjs`.

| Asset | How it is made | Inputs |
| --- | --- | --- |
| `fusion.<a>+<b>` | Gemini 3 Pro | images: `tools/refs/babies-line.png` (the eight babies, the style) and `tools/refs/fusions/grown/<key>.png` (the grown sprite: the species, its markings and colours); text: the roster's description, both parents in words, the value rule, the hard colour rule |
| `portrait.<a>+<b>` | no new image | the fusion's raw, keyed, snapped and placed on its plate (`tools/post.py --fit plate`) |
| `portrait.<a>+<b>.ascended` | Gemini 3 Pro edit of the fusion sticker | a gold plate (`ASCENDED_PLATE`) |
| `enemy.<boss>.portrait` | Gemini 3 Pro, drawn from the boss's own sprite | the foes' style (no cream rim, `--strip-rim`), on a plate of its colour darkened toward the ink with a disc in its accent (`bossPlate`) |

To redo one pet:

```bash
node tools/pipeline.mjs --priority=P0,P1,P2 --only=fusion.fire+ice,portrait.fire+ice,portrait.fire+ice.ascended --force --concurrency=1
```

**Records of the grown pass:** the silhouette contracts (`tools/refs/fusions/sil-*.png`) and their gates belonged to the grown sprites. The grown sprites are kept in `tools/refs/fusions/grown/`.

**The comparison:**
- `python3 reports/art/baby-pets/contact-sheet.py` writes `contact-sheet-1.png`, `contact-sheet-2.png` and `contact-sheet-small.png`.
- These show the old art (git `470aff4`) next to the new, plus every portrait at 48 px.
