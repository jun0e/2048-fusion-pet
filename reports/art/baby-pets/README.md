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
| `fusion.<a>+<b>` | Gemini, a new image | images: `tools/refs/babies-line.png` (the eight babies, the style) and `tools/refs/fusions/grown/<key>.png` (the grown sprite: the species, its markings and colours); text: the roster's description, both parents in words, the baby proportions (`CHIBI`), the facing, the value rule, the hard colour rule |
| `portrait.<a>+<b>` | no new image | the fusion's sprite as it shipped, on its plate at 372 px, so the 320 px sprite fills the plate box without enlarging (`tools/post.py --fit plate`) |
| `portrait.<a>+<b>.ascended` | Gemini edit of the shipped sticker | a gold halo and sparkles, on a gold plate (`ASCENDED_PLATE`) |
| `enemy.<boss>.portrait` | Gemini, drawn from the boss's sprite as it shipped | the foes' style (no cream rim, `--strip-rim`), on a plate of its colour darkened toward the ink, with a disc in its accent (`bossPlate`) |

**Models.**
- The first eight pets were drawn on Gemini 3 Pro.
- Its quota ran out, so the other twenty pets, every halo and the busts are on the fast model (gemini-3.1-flash-image). A side-by-side test showed the fast model kept the style once the baby proportions were stated outright.
- The fast model is now the recipe's default.

**Facing.** Each side-view pet faces left, checked by eye on a review sheet; a pet that faced right was drawn again. There is no automatic flip: one flipped a sheep that already faced left.

**Bookkeeping.** What is current is decided from committed files only, never from the gitignored raw cache, which differs in every checkout.
- Every output records `meta.ask`. For a generated output this is the hash of its prompt and its references as committed. For a portrait it is the hash of its source sprite and its post-processing.
- A generated output also records `meta.post`, its post-processing. If that changes, the output is re-posted from its raw for free.
- A job made from one in the run waits for it and is checked again at its turn: it is made only if it is stale by then. A pet's portrait follows its pet, and the halo edit is drawn again when the pet's pixels changed. A stale halo edit outside the run is listed with the command to make it.
- Older assets that record no ask (the babies' later stages, the element halo kits) are kept, restored from their raw when lost, and listed when they were drawn before their reference; `--force` redraws them.
- The plan line gives the assets the run makes (and may make), those it will check and keep, and the images it draws for sure and at most, counted the way the run decides them.
- A model is sent a reference's cached raw only when that raw is the drawing that shipped; otherwise it is sent the shipped output.
- A raw from before these records is re-posted only for an older asset whose output records no ask either, and only if the raw is the drawing that shipped (stamped within the hour). It is never labelled with an ask.
- `--repost --adopt --only=<ids>` records cached raws that were checked by eye as drawn for today's ask. It never takes a raw from before the recipe date.

To redo one pet (its portrait follows on its own; its halo is an edit of the new sticker):

```bash
node tools/pipeline.mjs --priority=P0,P1,P2 --only=fusion.fire+ice,portrait.fire+ice.ascended --force --concurrency=1
```

**Records of the grown pass:** the silhouette contracts (`tools/refs/fusions/sil-*.png`) and their gates belonged to the grown sprites. The grown sprites are kept in `tools/refs/fusions/grown/`.

**The comparison:**
- `python3 reports/art/baby-pets/contact-sheet.py` writes `contact-sheet-1.jpg`, `contact-sheet-2.jpg`, `contact-sheet-small.png` and `contact-sheet-busts.jpg`.
- They show the old art (git `470aff4`) next to the new, every portrait at 48 px, and the boss busts.
