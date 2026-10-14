# AI Image Pipeline and Licensing for 2048 Siege Pet Sprites (Gemini / Nano Banana focus)

Research date: 2026-10-14. Model landscape changes fast; every Google doc below was fetched on this date (doc "last updated" stamps: image-generation 2026-10-09, pricing 2026-10-13, rate-limits 2026-10-13, deprecations 2026-10-12, Gemini API terms 2026-04-28). Project facts were read from local files in `/Users/lap14657/merge-ball-td-siege/tools/`.

## Q1. Which art styles do current image models reproduce most consistently across many characters?

### Takeaway
The best-documented, most consistent style for Gemini image models is bold-outline, flat/cel-shaded cartoon ("sticker"/chibi): Google's own prompt guide gives a sticker template built on "bold, clean outlines, simple cel-shading", and the one detailed Nano Banana Pro sprite case study (March 2026) got a consistent set with "bold black outlines... flat colors". Pixel art is the worst fit: models output a picture *of* pixel art (tens of thousands of colours, a drifting grid) that needs heavy repair. Soft 3D/clay renders look good one at a time, but I found no evidence on how consistent they stay across a set, and their soft edges are hard to key out. No source benchmarks consistency by style, so the per-style ranking below is my inference from practitioner evidence.

### Cited Findings
**Model landscape (Oct 2026)**
- The Gemini API's current Nano Banana line-up: `gemini-nano-banana-2.1` (released Oct 6, 2026; Google calls it "the primary high-efficiency workhorse"), `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite, released Jun 30, 2026), `gemini-3.1-flash-image` (Nano Banana 2, GA May 28, 2026), `gemini-3-pro-image` (Nano Banana Pro, GA May 28, 2026) and the legacy `gemini-2.5-flash-image`. Google says new projects should use Nano Banana 2.1 — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation); [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
- Google describes Nano Banana 2.1 as delivering "improved visual quality, text rendering, multi-turn consistency". It describes Pro as "the premium choice for the most complex visual tasks… accurate brand consistency, and precision creative control" — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- On the Artificial Analysis text-to-image arena (AA-Image-T2I v2.0, ~Sept 2026, blind human preference Elo), the top three are GPT Image 2.5 Sunburst (1199), GPT Image 2.5 Flare (1192) and GPT Image 2 high (1172). Nano Banana 2.1 is #4 (1159), Nano Banana 2 / 3.1 Flash Image #7 (1125), Nano Banana Pro #12 (1104), Nano Banana 2 Lite #15 (1096), FLUX 3 #9 (1115). Midjourney models sit at ranks 115+ (≈848–879). These scores measure general preference, not consistency or game-sprite fitness — [Artificial Analysis leaderboard](https://artificialanalysis.ai/text-to-image/arena/leaderboard-text). Conflict: a search snippet citing the same site gave GPT Image 2 at Elo 1339 leading Nano Banana 2 at 1255. That looks like an older or different leaderboard version, and the live page fetched today is authoritative — [Artificial Analysis leaderboard](https://artificialanalysis.ai/text-to-image/arena/leaderboard-text)

**Bold-outline cartoon / sticker / chibi**
- Google's official prompt guide has a dedicated "Stylized illustrations & stickers" template: "Be specific about the visual detail (bold lines, colors, etc.) for consistent results." Its example: "A kawaii-style sticker of a happy red panda… The design features bold, clean outlines, simple cel-shading, and a vibrant color palette. The background must be white." — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Case study by Ben Hoyle (7 Mar 2026; Nano Banana Pro; ~48 clothing sprites plus 26 character sprites). Style: "2D cartoon, bold black outlines 2-3 pixels wide, flat colors". Nano Banana is good at "consistent cartoon style across a sheet" and "maintaining character identity across poses (mostly)". It struggles with "exact proportions across separate generation calls", "perfectly uniform grids", "exact pixel dimensions per sprite" and avoiding forbidden colours ("green occasionally sneaked in"). Also: "Style consistency drops with complexity" — keep to one character per sheet, 3–6 items per row, at most 2–3 rows — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/)
- Practitioner style-guide advice: put the full style rules in every prompt (e.g., "black 1px outline, PICO-8 palette, 2-tone cel shading"), lock a palette, and "standardize outlines (always 1px black, or always none, never mix)". Palette transfer after generation is called "the killer feature" for AI sprite consistency — [sprite-ai.art style guide](https://www.sprite-ai.art/blog/2d-pixel-art-style-guide) (vendor blog; treat as practitioner opinion)
- A user report: AI "often changes design details with each generation" (outfits drift when the pose changes) — [itch.io thread via search](https://itch.io/post/12949813) (forum anecdote)

**Pixel art**
- Test on GPT Image 2 at 2K (article dated 14 Aug 2026). The prompt asked for 12 colours; the output had 44,725 unique colours. "Only 2% of color changes aligned with a true 32×32 grid." Apparent "pixels" varied between 26 and 32 image pixels wide. "The model matched the style and honoured none of the constraints literally." — [rangy.ai](https://rangy.ai/blog/ai-pixel-art)
- The same article: at 64×64 a converted AI sprite keeps its facial detail; at 32×32 the silhouette survives but facial features are lost; 16×16 needs hand-redrawing. Rule of thumb: about one colour per four pixels of width (16 colours at 64×64, 12 at 32×32, 8 at 16×16) — [rangy.ai](https://rangy.ai/blog/ai-pixel-art)
- Eugeniy Smirnov (Jul/Aug 2025) shows AI "pixel art" with ~1,500 colours against the 4–8 typical of retro sprites, a pixel grid that is "all over the place", and anti-aliasing plus noise speckles — [dev.to](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5)
- A general indie-dev guide says AI can approximate pixel art "but results often need heavy cleanup" — [Wayline](https://www.wayline.io/blog/ai-art-generation-game-assets-workflow-tools-indie-developers) (secondary/marketing-adjacent)

**Soft 3D / clay / toy render**
- Prompt galleries show the clay-toy look ("matte clay material", "soft ambient lighting, subtle shadow", "soft oval shadow on the ground", "clean white background") as a popular, well-supported style — [carat.im prompt gallery](https://carat.im/en/prompt-gallery/designer-toy); [oomol prompt](https://prompts.oomol.com/p/3d-kneaded-clay-runner-icon-cute-toy-like-render-b29548f2). These are prompt showcases, not consistency tests.
- Google advertises Nano Banana Pro's control over lighting (switching day to night "while the model correctly recalculates shadows and light sources") — [delante.co summary](https://delante.co/nano-banana-pro/) (secondary). I found no test of lighting consistency across dozens of separate characters.

**Unverified marketing claims (do not rely on them)**
- "Nano Banana Pro delivers 93% character consistency… according to ZDNET benchmarks" and "reference sheets… reducing variation by 90%+" appear only on SEO blogs, with no methodology — [selfielab.me](https://selfielab.me/blog/nano-banana-pro-master-character-consistency-prompts-20260219). One search summary also wrongly called Nano Banana Pro "a prompt framework for Gemini 2.5 Flash Image". Google's docs show it is the separate `gemini-3-pro-image` model — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)

**Project status quo**
- The current `STYLE` prompt is: "cute chibi sprite… in the style of Random Dice and Clash Royale icons: bold clean dark outline, flat cel shading with soft highlights, vibrant saturated colours, simple readable silhouette… no ground, no cast shadow…". Projectiles are prompted as "glowing" and some enemies have "translucent wings" — [tools/assets.config.mjs](file:///Users/lap14657/merge-ball-td-siege/tools/assets.config.mjs)

### Inferences
- My ranking for generating ~100 assets with Gemini (inference from the evidence above; no source benchmarks styles head-to-head):
  1. **Chibi "sticker" with thick dark outline + flat/cel shading.** Highest consistency and pipeline fit. It is the style Google's own template targets, the case study shipped with it, the outline gives a clean boundary for keying, and fixed outline/palette rules are easy to enforce. Main risks: line weight and proportions drift between calls. Fix by generating at a fixed size, then normalising scale and running a palette-snap pass.
  2. **Flat vector (no outline, or a thin outline).** Very clean keying and easy palette locking. But with little detail, 28 fusions may look alike, and the output is raster, not real vector, so true SVG needs a vectorisation step (untested here).
  3. **Cel-shaded anime/kawaii without a thick outline.** Similar to #1 but with weaker edge separation for keying.
  4. **Soft 3D toy/clay.** Attractive, and Gemini renders it well per image. But soft shadows, ambient occlusion, rim light and subsurface glow create semi-transparent edges that chroma key handles badly (see Q3). Lighting direction and material gloss are extra variables that can drift, and soft shading lowers silhouette contrast at small mobile sizes.
  5. **Pixel art.** Lowest raw-generation fidelity. Needs grid detection, downscaling and quantisation for every asset, plus hand cleanup. Readability of fusions (two parents visible) suffers at 32×32 or smaller. Once fixed, though, palette consistency is the *strongest* of all styles because every sprite is snapped to one shared palette.
  6. **Painterly / textured illustration.** Worst for both consistency and keying (gradients, soft edges, texture noise).
- Separate sprite sheets per creature family (base pet, its fusions, its legendary overlay), each with 1–2 characters, fit the "consistency drops with complexity" finding better than one giant sheet.

### Gaps
- No quantitative cross-model benchmark of *style* consistency (line-weight variance, palette drift, lighting drift) across many characters was found for any model.
- No independent tests yet of Nano Banana 2.1 (released 8 days before this research) for game sprites.
- No reliable practitioner data comparing GPT Image 2/2.5, Midjourney V8 or FLUX on multi-character game sprite sets.

## Q2. Techniques for character and style consistency (references, templates, palettes, seeds, edits, fusion, LoRA)

### Takeaway
Gemini's main consistency tool is multi-image reference input. Nano Banana 2.1 and 3.1 Flash take up to 10 object refs, 4 character refs and (2.1/3.1 Flash only) up to 3 *style* refs. Pro takes 6 object and 5 character refs; Google's per-model table lists no style-ref slot for Pro, though style transfer is still available by prompting. Combine refs with a fixed prompt template, one character per call, and post-hoc palette locking. For open models, a style LoRA trained on 12–30 curated images is the standard alternative. I found no documented seed control for Gemini image models.

### Cited Findings
**Reference limits by model**

| Model | Object refs | Character refs | Style refs | Notes |
|---|---|---|---|---|
| Nano Banana 2.1 / 3.1 Flash | ≤10 | ≤4 | ≤3 | Docs: "character resemblance of up to 4 characters and the fidelity of up to 10 objects" |
| Gemini 3 Pro Image | ≤6 | ≤5 | none listed | "supports 5 images with high fidelity, and up to 14 images in total" |
| 3.1 Flash Lite | ≤14 | n/a | n/a | |
| Gemini 2.5 Flash Image | — | — | — | "works best with up to 3 images as input" |

The docs headline is "mix up to 14 reference images" — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)

**Other model behaviour from Google's docs**
- Nano Banana 2 Lite is "not optimized for" multi-reference consistency (doc text truncated after "Not optimized for mul…") — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Thinking: the models generate interim "thought images" (not charged) before the final output. Thinking levels: Nano Banana 2.1 supports minimal/medium/high (default medium); 3.1 Flash supports minimal/high (default minimal). Thinking tokens are billed by default for thinking models — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Google lists style transfer as a supported edit ("Transform the provided photograph of [subject] into the artistic style of [art style]. Preserve the original composition…"), along with targeted edits that change one element while keeping the rest unchanged ("change only the blue sofa…") — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Limitation: "The model won't always follow the exact number of image outputs that the user explicitly asks for." — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Third-party docs say Nano Banana 2 keeps "reasonable visual consistency for one or two primary characters across a generation workflow when you use reference images and detailed character descriptions together" — [zilliz FAQ](https://zilliz.com/ai-faq/how-many-consistent-characters-can-nano-banana-2-maintain-across-a-workflow) (secondary). Runware also has a character-consistency guide for Nano Banana 2 — [Runware docs](https://runware.ai/docs/models/google-nano-banana-2/guides/character-consistency)

**Prompt templates and palette control**
- Hoyle's working recipe: very specific row-by-row sprite descriptions, capitalised emphatic constraints ("CRITICAL BACKGROUND REQUIREMENT…", "CRITICAL EDGE REQUIREMENT…"), and one character per sheet. Colour variants were made by generating a neutral grey (#CCCCCC) base and applying luminance-preserving tints offline: "Pre-generating colored variants is more files but zero runtime cost and looks much better." — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/)
- Saved style templates (a "style library" holding palette, rendering style and aesthetic per project) are the main consistency feature commercial tools like Layer pitch — [Wayline](https://www.wayline.io/blog/ai-art-generation-game-assets-workflow-tools-indie-developers); [Layer](https://layer.ai/for/indie-game-developers)

**LoRA (open models)**
- FLUX style LoRAs: commonly 12–25 images for style ("as long as each example expresses a distinct visual rule") or 15–50 clean, consistent images in general. Starting parameters: 1000–2000 steps, LR 1e-4, rank 16. Tools: Kohya SS, SimpleTuner, fal.ai. "Twenty sharp, well-captioned images beat one hundred blurry ones." — [fal.ai FLUX style LoRA](https://blog.fal.ai/training-flux-style-lora-on-fal-ai); [fal.ai FLUX.2 LoRAs](https://blog.fal.ai/training-flux-2-loras); [Segmind](https://blog.segmind.com/fine-tune-flux-custom-ai-images/) (search-summary figures; vendor blogs)
- Layer lets you train a custom style model (LoRA) inside its platform — [Layer help](https://help.layer.ai/en/articles/14094114-how-to-train-a-custom-model-lora)

**Fusion of two parents**
- Gemini's documented multi-image composition ("merge multiple input images", "fuse images with a single prompt") is the native way to combine two parent designs — [Vertex AI Gemini 2.5 Flash Image docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image); [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Consumer "fusion generators" (cat + eagle, etc.) built on Nano Banana exist, but they are marketing pages with no quality data — [peerlist magic animal generator](https://peerlist.io/silicon_body/project/magic-animal-generator); [media.io](https://www.media.io/ai/zh/text-to-image/ai-fusion-generator)

### Inferences
- Suggested flow for 8 base, 28 fusion and 8 legendary pets:
  1. Generate and hand-approve 8 base pets with a locked template (style rules, palette list, camera angle, framing, outline spec).
  2. Use 2–3 approved bases as **style refs** (Nano Banana 2.1 / 3.1 Flash only).
  3. For each fusion, pass both parents as **character refs**, plus a prompt naming which body plan comes from parent A and which elemental features/colours from parent B. This mirrors the game's own rule ("Fusions keep the first element's shape in the second element's colour") — [README.md](file:///Users/lap14657/merge-ball-td-siege/README.md)
  4. Make legendary overlays and egg stages as image *edits* of the approved sprite ("same creature, add X, keep everything else unchanged").
  5. Snap every output to a master palette afterwards.
- Pro allows 5 character refs but has no listed style-ref slot. Nano Banana 2.1 has explicit style refs at roughly a quarter of the per-image price (see Q4), so it is the natural default; use Pro for hard fusions.
- Because exact proportions drift between calls, normalise by bounding box or a head-size target in post rather than trusting the prompt.
- LoRA is only relevant if the project moves to FLUX/SD: it gives the strongest style lock and runs locally (no quotas), but costs dataset curation and GPU time.

### Gaps
- Whether Gemini image models accept a `seed` (deterministic output) parameter was not confirmed in the docs I fetched. I found no source.
- No published quality evaluation of "fuse creature A + creature B" with Gemini (or any model). Fusion fidelity has to be tested in-house.
- How style refs interact with character refs in one call (priority and conflicts) is undocumented.

## Q3. Background removal and post-processing: which styles survive chroma key best

### Takeaway
Gemini outputs no alpha channel (opaque RGB only), so every sprite needs keying. Hard, thick outlines on a pure green field key cleanly, especially with a white or light outer stroke as a buffer. Soft glows, translucent wings, soft shadows and anti-aliased dark outlines on dark or similar backgrounds key badly, because the background colour gets baked into edge pixels. Pixel art keys easily *after* grid snapping and quantisation, but must be resized with nearest-neighbour, never Lanczos. Effects (explosions, glows) are better generated on black and drawn with additive blending, or matted with a white/black pair, than chroma-keyed.

### Cited Findings
**No native transparency in Gemini**
- "Nano Banana doesn't output alpha channels. You get a flat RGB image regardless." Google's image-generation docs never mention transparent output (0 occurrences of "transparent") — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/); [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)

**Hoyle's three keying attempts**
- Dark or magenta backgrounds with brightness thresholding were "catastrophic". Black outlines matched the background brightness, and anti-aliasing "baked background color into edge pixels". "You cannot cleanly remove a background that shares color space with your sprite content." — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/)
- What worked: pure #00FF00 demanded emphatically ("EXACT hex #00FF00… NO gradients, NO noise, NO texture"), a 2–3 px **white outline** around every sprite as a buffer, and **HSV** keying (hue ±22°, saturation ≥0.3, value ≥0.3) followed by light edge softening. Sprites are not placed on a uniform grid, so slicing must be content-aware (connected components) — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/)

**The project's current keyer**
- `chroma.py` estimates the key colour as the median of a 6 px border ("generated images are rarely exactly #00FF00 / #FF00FF"). Alpha ramps on RGB distance between 70 and 150; strongly chroma-coloured pixels are forced transparent; spill is suppressed on edges; then it trims, pads and resizes with `Image.LANCZOS` — [tools/chroma.py](file:///Users/lap14657/merge-ball-td-siege/tools/chroma.py)

**Matting and native-alpha alternatives**
- Triangulation matting for Nano Banana 2 (Replicate model by "jide"): generate the subject on white, make a constrained edit onto black, then compute `alpha = 1 - (white - black)/255`. This gives "clean edges, proper semi-transparency, and correct color recovery that background removers can't match". Costs: 2× inference, plus a risk that the two renders misalign — [Replicate readme](https://replicate.com/jide/nano-banana-2-transparent/readme)
- GPT Image 2 offers native transparent output in preview: `background: "transparent"` with `output_format` png or webp (jpeg returns HTTP 400), at no extra token cost. OpenAI reportedly says baking alpha in during generation beats background removal "on tricky areas like transparent glass or thin fibers" — [The Decoder](https://the-decoder.com/openais-gpt-image-2-can-now-generate-images-without-a-background/); [Atlas Cloud guide](https://www.atlascloud.ai/blog/guides/gpt-image-2-api-transparent-background) (secondary; OpenAI primary docs not fetched)

**Pixel-art cleanup**
- Correct order: detect the grid → downscale to native resolution (nearest-neighbour) → quantise the palette with dithering **off** → nearest-neighbour upscale. "Downsample first, quantise second. Reducing colours on the full-size image then shrinking re-introduces blends." Bilinear or Lanczos resampling creates soft edges — [rangy.ai](https://rangy.ai/blog/ai-pixel-art)
- Tools: unfake.js / `unfake` on PyPI (Sobel-based scale detection, grid alignment, Wu quantisation, dominant-colour block downscaling) — [dev.to](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5); [PyPI unfake](https://pypi.org/project/unfake/). Also Scenario's open-source Pixel Snapper — [Scenario help](https://help.scenario.com/en/articles/pixel-snapper-the-essentials) — and Phaser's "Tidy Pixel Art" tool — [Phaser](https://phaser.io/tools/tidy-pixel-art)

**Effects on black with additive blending**
- Effects drawn on solid black can be composited with additive ("Add"/Screen) blending: "the black background actually works like a transparent background and the colors work like emitted light". Use additive for fire and alpha blending for smoke. Additive effects wash out over light backgrounds — [gamedev.net thread](https://gamedev.net/forums/topic/265455-particle-explosions/); [Unity discussions](https://discussions.unity.com/t/particle-effects-against-light-backgrounds/86497); [Godot Q&A](https://ask.godotengine.org/138538/particles-doesnt-display-correctly-running-background-image)

### Inferences
- How each style survives keying (inference):
  - **Thick-outline sticker:** best, especially with a light outer stroke ("sticker border") between a dark outline and the green field.
  - **Flat vector:** very good.
  - **Pixel art (after cleanup):** very good, with hard binary alpha. But the project's Lanczos resize would blur it, so switch to nearest-neighbour and integer scales.
  - **Soft 3D/clay:** poor to fair. Contact shadows, AO falloff and glossy rim reflections pick up green spill. "No ground shadow" plus triangulation matting would help, at 2× cost.
  - **Glow-heavy VFX:** poor with chroma key. The current projectile prompt asks for "glowing" sprites on magenta, which bakes a magenta-tinted halo into the glow.
- Concrete improvements: always demand a light outer stroke; use HSV keying; key pets on green (pets don't need magenta); generate projectiles and explosions as solid shapes on chroma (no glow) and add the glow in code with tint and additive sprites; or generate VFX on pure black and render them additively.
- Keep sprite and outline colours out of the key hue: green-themed (Forest/Leaf) pets should be keyed on magenta, as `assets.config.mjs` already does per asset.

### Gaps
- No controlled comparison of AI background removers (rembg/BiRefNet/etc.) against chroma key on stylised game art was found.
- Whether Gemini 2.1/Pro reliably return an *exact* flat key colour (vs. a slight gradient) at different thinking levels is undocumented. The project's border-median estimate exists because they often don't.

## Q4. Cost, speed, rate limits and batch strategy for Gemini image models

### Takeaway
None of Gemini's image models has a free tier ("Not available" on the pricing page). That explains the 429 / `limit: 0` errors on a free key: a billing-linked project (Tier 1+) is required. Per-image prices at 1K run from ~$0.017 (Nano Banana 2.1 or Lite, Batch) to $0.134 (Pro, Standard). A ~100-asset set with ~4 tries per asset costs roughly $7–$55 total, so cost is not the constraint; quota, spend caps and model churn are.

### Cited Findings
**Per-image prices (Paid tier, USD, from the pricing page)** — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)

| Model | Standard | Batch (50% off) | Notes |
|---|---|---|---|
| Nano Banana 2.1 (`gemini-nano-banana-2.1`) | $0.0336 at 1K / $0.0504 at 2K / $0.113 at 4K ($30 per 1M image tokens; 1K = 1120 tokens) | $0.0168 at 1K / $0.0252 at 2K / $0.0567 at 4K | Input $1.50 per 1M tokens |
| Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`) | $0.0336 at 1K | $0.0168 at 1K | |
| Nano Banana 2 (`gemini-3.1-flash-image`) | $0.045 at 0.5K / $0.067 at 1K / $0.101 at 2K / $0.151 at 4K | $0.022 / $0.034 / $0.050 / $0.076 | |
| Nano Banana Pro (`gemini-3-pro-image`) | $0.134 at 1K/2K / $0.24 at 4K | $0.067 at 1K/2K / $0.12 at 4K | Image input 560 tokens ≈ $0.0011 per ref image; Flex tier also offered at the Batch price |
| Gemini 2.5 Flash Image | $0.039 per image (≤1024 px, 1290 tokens) | $0.0195 | |

- All of the above: Free Tier = "Not available" — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- "Used to improve our products": the free tier is marked Yes where it exists, the paid tier No — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)

**Deprecation dates**
- Conflict on Gemini 2.5 Flash Image: the pricing page says it "is deprecated and will be shut down on October 2, 2026". The deprecations page gives an earliest shutdown of March 15, 2027 (replacement `gemini-3.1-flash-lite-image`) and notes that listed dates are "the earliest possible dates" — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing); [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
- The preview IDs `gemini-3-pro-image-preview` and `gemini-3.1-flash-image-preview` were shut down June 25, 2026 (replaced by `gemini-3-pro-image` and `gemini-nano-banana-2.1`). Imagen 4 shut down Aug 17, 2026 ("Imagen is shut down and no longer available through the Gemini API") — [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations); [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)

**Rate limits and tiers**
- Limits are per project, not per API key, and are measured in RPM, TPM and RPD; image models use IPM (images per minute). RPD resets at midnight Pacific. Preview and experimental models get tighter limits — [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

| Tier | Qualification | Billing tier cap | Spend limit per rolling 10 min |
|---|---|---|---|
| Free | Active project or free trial | N/A | N/A |
| Tier 1 | Link an active billing account | $250 | $10 |
| Tier 2 | $100+ paid and 3 days since first payment | $2,000 | $50 |
| Tier 3 | $1,000+ paid and 30 days since first payment | $20k–$100k+ | $200 |

- Hitting a spend limit also returns 429 RESOURCE_EXHAUSTED. Exact per-model limits are shown only in AI Studio — [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- Batch API: separate limits (100 concurrent batch requests, 2 GB input file, 20 GB storage). Tier 1 enqueued-token caps: 3.1 Flash Image Preview 1,000,000; 3.1 Flash Lite Image 2,000,000; 3 Pro Image Preview 2,000,000. Turnaround is "up to 24 hours" in exchange for higher limits — [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits); [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)

**Developer reports on 429s**
- Free-tier image quota reported as 0 since ~Dec 2025 — [laozhang blog](https://blog.laozhang.ai/en/posts/gemini-image-429-rate-limit) (third-party)
- Multiple Google forum threads report *paid* Tier 1 projects still getting `limit: 0` free-tier quota on image models (gemini-2.5-flash-image, 3-pro-image-preview, 3.1-flash-image, 3.1-flash-lite-image), as a recurring issue. The commonly reported fix: create a **new API key after enabling billing**, or use Vertex AI — [Google AI forum](https://discuss.ai.google.dev/t/gemini-api-tier-1-project-incorrectly-enforced-as-free-tier-for-gemini-3-1-flash-image/176192); [Google AI forum](https://discuss.ai.google.dev/t/gemini-3-1-flash-lite-image-suddenly-changed-to-free-tier-quota-limit-0/179208); [laozhang blog](https://blog.laozhang.ai/en/posts/paid-tier-getting-free-tier-requests-limit-0)

**Speed**
- Hoyle (Pro, March 2026): generation took 5–10 minutes per sheet with 1–2 regenerations expected, prompt writing 30–60 min, QA 30–60 min. A full sprite set took about half a day — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/)

**Project status quo**
- The project falls back through `gemini-3-pro-image` → `gemini-3.1-flash-image` → `gemini-2.5-flash-image` via `v1beta/models/{model}:generateContent`, overridable with `GEMINI_IMAGE_MODEL` — [tools/gen-assets.mjs](file:///Users/lap14657/merge-ball-td-siege/tools/gen-assets.mjs). Google's current examples use a newer `client.interactions.create` (Interactions API) — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)

### Inferences
- Budget estimate for ~100 assets × ~4 attempts = ~400 images at 1K (my arithmetic from the prices above):

| Model | Standard | Batch |
|---|---|---|
| Nano Banana 2.1 | ≈ $13 | ≈ $7 |
| 3.1 Flash | ≈ $27 | ≈ $14 |
| Pro | ≈ $54 | ≈ $27 |

  Reference-image inputs add well under $1. The Tier 1 spend limit of $10 per 10 min caps Pro at about 74 images per 10 minutes, which is fine for this scale. The Tier 1 billing cap of $250 is far above the need.
- Recommended changes:
  1. Enable billing on the project.
  2. Make a fresh API key after enabling billing.
  3. Put `gemini-nano-banana-2.1` first in the fallback list. It is cheaper than 3.1 Flash, ranks higher on the AA arena than Pro, and has style refs.
  4. Keep Pro for hard fusions.
  5. Drop `gemini-2.5-flash-image`: it is deprecated, weak at multiple refs, and may be shut down any time from Oct 2, 2026.
  6. Use the Batch API (50% off) for bulk re-generations where a 24-hour turnaround is acceptable.
  7. Add exponential-backoff retries on 429s instead of immediately falling through to a lower-quality model, because the fallback silently mixes model styles within one asset set.
- A model swap partway through production is itself a consistency risk: preview IDs died within ~7 months. Keep cached raws plus the approved reference set so assets can be regenerated on a successor model.

### Gaps
- Exact IPM/RPD numbers per image model and tier are only visible inside AI Studio, not on the public docs page.
- Whether `generateContent` (v1beta) keeps working for `gemini-nano-banana-2.1` alongside the Interactions API was not verified.
- No first-party latency figures (seconds per image) were found for the 2026 models.

## Q5. Licensing and legal: ownership, SynthID, copyright, app stores, IP-similarity risk

### Takeaway
Under the Gemini API terms Google claims no ownership of outputs, and paid-tier prompts and outputs are not used for training, but Google offers no IP indemnity in those terms. In the US, raw AI-generated sprites are likely *not* copyrightable without meaningful human authorship. The Copyright Office's Jan 2025 report holds this, and the Supreme Court declined *Thaler* on March 2, 2026. Competitors could therefore copy unedited sprites; human redrawing and arrangement creates protectable layers. Every Gemini image carries an invisible SynthID watermark. Apple's and Google Play's rules do not ban pre-generated AI art: Play's AI policy targets in-app generation, and Apple's guidelines (June 2026) contain no AI-asset rule beyond general IP and copycat rules. The biggest practical legal risk is outputs resembling existing IP (Pokémon-like creatures). The project's style prompt currently names two commercial games, which should be removed.

### Cited Findings
**Gemini API terms (last updated 2026-04-28)** — [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms)
- "Google won't claim ownership over that content." But Google may "generate the same or similar content for others" (no uniqueness guarantee).
- Unpaid services: "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services." Paid services: "Google doesn't use your prompts… or responses to improve our products."
- You must be 18+. "You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom."
- You may not use the Services to develop competing models.
- I found no indemnification language in the fetched terms (via the WebFetch summary).

**Indemnity**
- Google Cloud's generative AI indemnity (Oct 13, 2023 post) has two parts:
  - The training-data indemnity covers Google's generative models broadly.
  - The *generated-output* indemnity was listed for specific Cloud and Workspace products (Duet AI, Vertex AI Search/Conversation, embeddings, visual captioning, Codey).
  - Conditions: no intentional infringement, and responsible-AI practices followed.
  - The post does not mention the Gemini API in AI Studio — [Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/protecting-customers-with-generative-ai-indemnification)

**SynthID**
- "All generated images include a SynthID watermark" — [Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- SynthID is imperceptible, designed to survive compression, resizing, cropping and common transformations, and detectable through the SynthID Detector portal and the Gemini app ("Was this created with Google AI?") — [Google blog](https://blog.google/technology/ai/ai-image-verification-gemini-app/); [KDnuggets](https://www.kdnuggets.com/synthid-what-it-is-and-how-it-works) (secondary for the robustness claims)
- By May 19, 2026, more than 100 billion images and videos had been watermarked, and in-app verification had been used 50 million times — [search summary citing Google](https://blog.google/innovation-and-ai/products/ai-image-verification-gemini-app/) (figure not directly verified on the page)

**US copyright**
- US Copyright Office, *Copyright and AI Part 2: Copyrightability* (Jan 29, 2025):
  - "the outputs of generative AI can be protected by copyright only where a human author has determined sufficient expressive elements"
  - Protection does not come from "the mere provision of prompts"
  - Human "creative arrangements or modifications of the output" can be protected
  - "the use of AI to assist in the process of creation or the inclusion of AI-generated material in a larger human-generated work does not bar copyrightability"
  - Sources: [copyright.gov NewsNet](https://www.copyright.gov/newsnet/2025/1060.html); [Library of Congress blog](https://blogs.loc.gov/copyright/2025/02/inside-the-copyright-offices-report-copyright-and-artificial-intelligence-part-2-copyrightability/)
- *Thaler v. Perlmutter*: the Supreme Court denied certiorari on March 2, 2026, leaving in place rulings that works made solely by AI without human authorship cannot be copyrighted — [Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/03/the-final-word-supreme-court-refuses-to-hear-case-on-ai-authorship); [Reed Smith](https://www.reedsmith.com/our-insights/blogs/viewpoints/102mlpl/supreme-court-denies-certiorari-in-thaler-v-perlmutter-human-only-rule-for-ai/)
- *Allen v. Perlmutter* (D. Colo.): a Midjourney image made over 624 prompt iterations plus edits was refused registration. Summary-judgment briefing ran Aug 2025 – Jan 2026, and I found no final ruling — [The Fashion Law](https://www.thefashionlaw.com/resource-center-snapshot-jason-allen-v-perlmutter-et-al/); [Law360](https://www.law360.com/technology/articles/2432068)

**App stores**
- Apple App Store Review Guidelines (last updated June 8, 2026):
  - The only explicit AI text I found is 5.1.2(i): disclose and get explicit permission before sharing personal data "with third-party AI"
  - 5.2.1: "Don't use protected third-party material such as trademarks, copyrighted works… without permission"
  - 4.1 Copycats: "Come up with your own ideas… Don't simply copy the latest popular app"
  - Source: [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)
  - Conflict: secondary sites claim Apple added AI-content disclosure rules in Nov 2025. I could not find such text in the current primary guidelines — [ppc.land](https://ppc.land/apple-tightens-app-store-age-controls-and-data-sharing-disclosure/); [appsops.store](https://appsops.store/news/app-store-review-guidelines-ios26-ai-disclosure)
- Google Play "AI-Generated Content" policy:
  - Defines AI-generated content as "content that is created by generative AI models based on user prompts" (chatbots, image/video generated from prompts)
  - Such apps must prevent Restricted Content and include in-app reporting/flagging — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en)
- Steam (relevant only for a PC release):
  - AI disclosure since 2024
  - Rules rewritten Jan 16, 2026 to focus on content players see, separating "pre-generated" from "live-generated" AI content
  - ~8,000 titles disclosed AI use in H1 2025 vs ~1,000 in all of 2024
  - Sources: [VGC](https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use); [Gigazine](https://gigazine.net/gsc_news/en/20260120-steam-updates-ai-disclosure-guidelines)
- EU AI Act Art. 50(4) labelling obligations apply from Aug 2, 2026. They target "deepfake" content (AI content resembling real persons, objects, places or events that could be mistaken for genuine), and commentary says they can reach games — [Heuking](https://www.heuking.de/en/news-events/newsletter-articles/detail/labelling-obligations-for-ai-generated-content-implications-for-advertising-and-marketing.html); [Lausen](https://lausen.com/en/section-504-of-the-ai-act-what-organisations-must-label-as-ai-content-from-august-2026/); [gamedev.net](https://gamedev.net/news/4691/)

**IP-reproduction risk**
- *Fantastic Copyrighted Beasts and How (Not) to Generate Them* (He et al., arXiv 2406.14526v2, Mar 2025):
  - Models tested: Playground v2.5, SDXL, PixArt-α, DeepFloyd IF, DALL·E 3, VideoFusion
  - Models produce copyrighted characters from indirect "anchoring" keywords, e.g., "videogame, plumber" gives Mario-like images
  - Detection rate: ~60% with character names, ~48% with 60-word descriptions that avoid names
  - A few co-occurrence keywords nearly match full descriptions
  - Mitigation: prompt rewriting alone cut detections 47% (30 → 14); rewriting plus negative prompts (name + 10 keywords) cut them 86% (30 → 4.33)
  - Source: [arXiv](https://arxiv.org/html/2406.14526v2)
- IEEE Spectrum (Marcus & Southen, Jan 2024): Midjourney and DALL-E 3 produced near-copies of film and game characters, sometimes without being asked — [IEEE Spectrum](https://spectrum.ieee.org/midjourney-copyright)
- ICML 2025 work: SDXL and DALL·E 3 generate content resembling Nintendo, Sony and Marvel characters from names or descriptive details alone — [ICML 2025 poster](https://icml.cc/virtual/2025/poster/44267)
- The project's `STYLE` string says "in the style of Random Dice and Clash Royale icons" — [tools/assets.config.mjs](file:///Users/lap14657/merge-ball-td-siege/tools/assets.config.mjs)

### Inferences
- Commercial use of Gemini outputs is permitted under the API terms. But (a) there is no ownership exclusivity (Google may produce similar images for others), (b) there is no indemnity on the AI Studio API, and (c) a free key sends prompts and outputs into Google's training. Use a paid key for anything shipping.
- Copyright strategy: treat raw Gemini sprites as likely unprotectable. Get protection from documented human work: redrawing or editing outlines and faces, composing fusions by hand, final colour design. The game as a whole (code, level design, compiled sprite arrangement, names and logo via trademark) is protected anyway. Keep prompt logs and edit history (PSD/Krita layers) as evidence of human authorship.
- SynthID will stay in shipped PNGs. Nothing I found in Apple or Play policy forbids watermarked AI art, but it means anyone can verify the art is Google-AI-made. Plan honest disclosure (e.g., a store-page note) rather than trying to strip it.
- Store risk is low for pre-generated assets. Play's AI policy is aimed at in-app generation from user prompts, and Apple has no AI-asset ban. The real store risk is 5.2.1 / 4.1 (IP or copycat look), so reject any sprite that reads as a known franchise character.
- Pokémon-adjacency risk is real for an "elemental pet creatures that fuse and evolve" game. Mitigations:
  - Remove franchise names from prompts. "Random Dice"/"Clash Royale" act exactly as anchoring keywords; replace them with the explicit attribute list.
  - Avoid signature keyword combos (e.g., "yellow electric mouse with red cheeks", "fire lizard with flame tail").
  - Add negative-style instructions ("must not resemble any existing Pokémon, Digimon or Nintendo character"). Gemini has no negative-prompt field, so put this in the text.
  - Reverse-image-search each approved sprite.
  - Keep a human art pass on the 8 base pets, since all 28 fusions inherit from them.
- EU AI Act deepfake labelling is unlikely to apply to fantasy creatures, which don't depict real people, places or events (inference; not legal advice).

### Gaps
- Whether Gemini image generation on **Vertex AI** (vs. AI Studio) is currently on Google Cloud's generated-output indemnity list was not verified. The 2023 list predates Nano Banana.
- No case law yet on SynthID-watermarked assets in commercial games, and no store policy mentioning SynthID was found.
- Copyright status outside the US (EU, Vietnam, Japan, China) was not researched. Rules differ; China's Beijing Internet Court has granted protection to some AI images, which was not verified here.
- No study specifically measuring how often Gemini/Nano Banana outputs resemble Pokémon was found; the evidence covers other models (SDXL, DALL·E 3, Midjourney, Playground).
- The Allen v. Perlmutter outcome (if decided after Jan 2026) was not found.
