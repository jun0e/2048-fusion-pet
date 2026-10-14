# General-purpose image-generation APIs (non-Gemini) for a batch 2D game-art pipeline — state as of October 2026

*Research date: 2026-10-14. Scope: API-scriptable models that could replace or complement the Gemini image API in the "2048 Siege" Node.js pipeline (~117 core images: 32 baby sprites that are chained edits, 28 two-parent fusions + golden style ref, 28 namecard portraits, eggs, halos, 17 enemies, one 9:16 background). "(search snippet)" means the fact came from a search-result summary and the full page was not opened; treat it as less certain than fetched pages. Nothing was purchased or called.*

---

## Q1. Can one request take 2–3 reference images (character + style) and keep identity/style consistent? Does it support "edit the previous image" workflows?

### Takeaway
By October 2026 almost every frontier API accepts several reference images in one call and supports instruction edits of a prior image. Fits for the 3-image fusion step (2 parents + golden style ref): GPT Image 2.5 (OpenAI), FLUX 3 Image / FLUX.2 (BFL), Seedream 5.0 (ByteDance), MAI-Image-2.6 (Microsoft), Qwen-Image-3.0 (Alibaba, 3 images is its maximum), Grok Imagine Image 2.0 (xAI, also capped at 3), Meta Muse Image (accepts a "small set"; the maximum isn't published), and Reve 2.1 (official API reportedly shut down). Recraft V4 Styles takes 1–10 *style* references but explicitly does not edit or preserve identity. Stability exposes no multi-reference identity endpoint, and Midjourney still has no official API.

### Cited Findings

**Provider snapshot (newest models, Oct 2026)**

| Provider / model (release) | Refs per request | Edit-previous-image | Source |
|---|---|---|---|
| OpenAI gpt-image-2.5-sunburst / -flare (Sept 8, 2026) | Multiple. The official example uses 4. No max stated in the 2026 guide | Yes: `/v1/images/edits`, plus multi-turn edits in the Responses API | [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation), [Grida](https://grida.co/docs/models/gpt-image-2.5) |
| OpenAI gpt-image-2 (snapshot 2026-04-21) | Multiple (edits endpoint) | Yes, edits + inpainting | [gpt-image-2 model page](https://developers.openai.com/api/docs/models/gpt-image-2) |
| BFL FLUX 3 Image (2026) | 1–10, flat price | Yes: "precise, local edits" | [fal FLUX 3 edit](https://fal.ai/models/blackforestlabs/flux-3/edit-image) |
| BFL FLUX.2 [pro]/[flex]/[max] (Nov 2025) | Up to 8 via API | Yes | [OpenRouter FLUX.2 flex](https://openrouter.ai/black-forest-labs/flux.2-flex), [Together FLUX.2 pro](https://www.together.ai/models/flux-2-pro) |
| ByteDance Seedream 5.0 Pro (Jul 8, 2026) | 2–10 for fusion | Yes: local edits via masks, boxes, coordinates | [mer.vin](https://mer.vin/2026/07/seedream-5-0-pro-api-on-byteplus-precision-image-generation-and-multi-reference-editing/) |
| Seedream 5.0 Lite / Flash (2026) | Up to 14 (BytePlus); fal Lite edit takes up to 10 | Yes | [Atlas Cloud](https://www.atlascloud.ai/blog/ai-updates/seedream-5-0-pro-price) (search snippet), [Treza Labs](https://www.trezalabs.com/blog/seedream-5-0-flash-api-pricing-through-a-pipeline) |
| Alibaba Qwen-Image-3.0 / 3.0-Pro (Aug 4, 2026) | 1–3 | Yes, same model ID | [LLM Reference](https://www.llmreference.com/model/qwen-image-3.0) |
| Microsoft MAI-Image-2.6 (Sept 4, 2026) | Up to 5 | Yes, image-guided editing | [OpenRouter MAI-Image-2.6](https://openrouter.ai/microsoft/mai-image-2.6) (search snippet) |
| Meta Muse Image (consumer launch ~Jul 2026; API Aug 28, 2026) | "small set" (max not published) | Yes: edit, multi-turn | [Meta dev page](https://dev.meta.ai/models/muse-image/), [Let's Data Science](https://letsdatascience.com/news/fal-opens-access-to-meta-muse-image-0fef298a) (search snippet) |
| xAI Grok Imagine Image 2.0 (2026) | Max 3 (`image_urls`) | Yes: a chained edit endpoint for follow-up edits | [muapi](https://muapi.ai/comparison/grok-imagine-image-2), [Opper](https://opper.ai/xai/grok-imagine-image-2-0) (search snippets) |
| Reve 2.1 (2026) | 1 (edit) or 2–8 (remix) | Yes | [GMI Cloud docs](https://docs.gmicloud.ai/model-quickstarts/image/reve-2-1) |
| Ideogram 4.5 / 4.0 / 3.0 | 3.0 Character Reference (priced for 3.0 only). The 4.5 aggregator page says 1–5 refs | Edit/Remix (the 3.0 Edit endpoint is now "legacy") | [Puter pricing](https://developer.puter.com/tutorials/ideogram-api-pricing/), [Puter 4.5](https://developer.puter.com/ai/ideogram/ideogram-4-5/) (search snippet) |
| Recraft V4 Styles (snapshot 2026-08-26) | 1–10 **style** refs | No: "rather than editing it" | [OpenRouter Recraft V4 Styles](https://openrouter.ai/recraft/recraft-v4-styles) |
| Stability AI (SD 3.5 / Stable Image) | No multi-reference identity endpoint | Inpaint, search & replace, style control | [Puter Stability pricing](https://developer.puter.com/tutorials/stability-ai-api-pricing/) |
| Adobe Firefly Services (Image5) | Not verified | Object Composite, Generative Fill | [Adobe Firefly API docs](https://developer.adobe.com/firefly-services/docs/firefly-api/) |
| Midjourney (V7/V8) | No official API | — | [Unifically](https://unifically.com/blogs/midjourney-api) |

**OpenAI (GPT Image family)**
- OpenAI's 2026 image guide documents gpt-image-2.5-sunburst and gpt-image-2.5-flare. Edits can combine several input images; the guide's example builds a gift-basket image from 4 references. The Image API takes file uploads, and the Responses API takes file IDs, base64 or URLs. The guide states no explicit maximum — [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- The Responses API supports "multi-turn editing" with `previous_response_id` or image-ID references. The Image API is single-request — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- Flare is "our fastest model for high-quality, everyday image generation" (snapshot `gpt-image-2.5-flare-2026-09-08`) — [OpenAI flare model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare). Sunburst targets "precise edits and fine-detail creative work", trading "greater editing precision, with longer generation times". Both were released Sept 8, 2026 — [Grida](https://grida.co/docs/models/gpt-image-2.5)
- gpt-image-2 (default snapshot `gpt-image-2-2026-04-21`) supports `v1/images/generations`, `v1/images/edits`, `v1/batch` and inpainting. The model page marks Responses/Chat Completions as "Not supported" — [gpt-image-2 model page](https://developers.openai.com/api/docs/models/gpt-image-2)
- OpenAI lists these limitations itself: "occasional struggle to maintain visual consistency for recurring characters", and difficulty placing elements precisely — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- The 2026 guide never mentions `input_fidelity` (a 2025-era parameter of gpt-image-1) — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- gpt-image-1 (2025) retires Oct 23, 2026, and DALL·E 2/3 were removed May 12, 2026 — [CostGoat](https://costgoat.com/pricing/openai-images); retirement also stated by [PricePerToken](https://pricepertoken.com/gpt-image-pricing)

**Black Forest Labs (FLUX)**
- FLUX 3 Image edit (on fal): "Make precise, local edits (add, replace, remove or restyle one element) without changing the rest of the image, or combine up to 10 reference images into one well-composed result". It takes 1–10 image URLs at "one flat price per image, whatever the number of references", and each reference must be ≥256 px per side and ≤4 MP — [fal FLUX 3 edit](https://fal.ai/models/blackforestlabs/flux-3/edit-image)
- FLUX 3 also takes layouts specified with bounding boxes, five resolution classes from 768² to 4K, and references as URL or base64 — [Treza Labs](https://www.trezalabs.com/blog/flux-3-image-api-pricing-through-a-pipeline) (search snippet). Conflict: one snippet gives a ≤16 MP per-reference limit; fal says ≤4 MP.
- FLUX.2 [flex]/[max]: up to 8 reference images per request via the API — [OpenRouter FLUX.2 flex](https://openrouter.ai/black-forest-labs/flux.2-flex), [OpenRouter FLUX.2 max](https://openrouter.ai/black-forest-labs/flux.2-max). FLUX.2 [pro]: "up to 8 reference images via API" — [Together](https://www.together.ai/models/flux-2-pro). Search summaries also say "up to 10 input images on FLUX.2", so the counts conflict.
- FLUX.1 Kontext [pro]/[max] (2025-era) are still sold — [BFL pricing docs](https://docs.bfl.ml/quick_start/pricing)

**ByteDance Seedream**
- Seedream 5.0 Pro (`seedream-5-0-pro-260628`, launched 8 Jul 2026): multi-reference fusion "up to 10" images, with 2–10 refs passed as an array. One output per call, no batch or streaming mode. Built for precise local changes using coordinates, masks, bounding boxes, sketches and material/colour instructions — [mer.vin](https://mer.vin/2026/07/seedream-5-0-pro-api-on-byteplus-precision-image-generation-and-multi-reference-editing/)
- Seedream 5.0 Lite supports up to 14 reference images on BytePlus — [Atlas Cloud](https://www.atlascloud.ai/blog/ai-updates/seedream-5-0-pro-price) / [The Rundown](https://www.therundown.ai/tools/seedream-5-0-pro) (search snippet). fal's Lite edit endpoint takes up to 10 — [Moda](https://moda.app/resources/models/seedream-5-lite) (search snippet)
- Seedream 5.0 Flash takes "up to 14 reference images at no extra charge" — [Treza Labs](https://www.trezalabs.com/blog/seedream-5-0-flash-api-pricing-through-a-pipeline) (search snippet)

**Alibaba Qwen**
- Qwen-Image-3.0 and 3.0-Pro launched Aug 4, 2026 on Model Studio / Qwen Cloud. One model ID covers text-to-image and editing, with "one to three input images for edits, one to six outputs per request at up to 2048×2048 total pixels", aspect ratios from 1:8 to 8:1, ~4,500-token prompts and negative prompts — [LLM Reference](https://www.llmreference.com/model/qwen-image-3.0)
- Qwen-Image-Edit-Plus (2509, a 2025-era model) is a 20B MMDiT editor that supports multi-image edits. Edit-2511 is its successor; both run on fal and Replicate — [muapi](https://muapi.ai/comparison/qwen-image-edit-plus), [PricePerToken](https://pricepertoken.com/image/model/qwen-qwen-image-edit-2511)
- Qwen-Image-2.1 is open weights; Artificial Analysis lists it with "No API" — [AA text-to-image](https://artificialanalysis.ai/image/leaderboard/text-to-image)

**Microsoft, Meta, xAI, Reve**
- MAI-Image-2.6 (released Sept 4, 2026, Azure AI Foundry) takes text and image input, with "up to 5 reference images" per editing request and aspect ratios 1:1, 4:3, 3:4, 16:9, 9:16, 3:2 and one more — [OpenRouter MAI-Image-2.6](https://openrouter.ai/microsoft/mai-image-2.6) (search snippet). MAI-Image-2.6-Flash is the faster, cheaper variant for text-to-image and image-to-image editing — [LLM Reference](https://www.llmreference.com/model/mai-image-2-6-flash/microsoft-foundry)
- Meta Muse Image offers "Anchored composition": "Anchor a whole series of generations on a small set of reference images". It also does "agentic image generation, grounded by search". The maximum reference count is not stated — [Meta dev page](https://dev.meta.ai/models/muse-image/)
- fal exposes `meta/muse-image/text-to-image` and `meta/muse-image/edit`. The edit page describes targeted changes, multi-turn coherence and composition from multiple reference images — [Let's Data Science](https://letsdatascience.com/news/fal-opens-access-to-meta-muse-image-0fef298a) (search snippet)
- Grok Imagine Image 2.0 has a text-to-image endpoint and an edit endpoint "for applying targeted follow-up edits to a prior generation". It takes up to 3 input images (`image_urls`) and n = 1–10 outputs — [muapi](https://muapi.ai/comparison/grok-imagine-image-2), [Opper](https://opper.ai/xai/grok-imagine-image-2-0) (search snippets)
- Reve 2.1 uses one endpoint. One `reference_image` URL runs a plain edit; 2–8 `reference_images` run a remix, referenced in the prompt as `<frame>0</frame>`, `<frame>1</frame>` and so on — [GMI Cloud docs](https://docs.gmicloud.ai/model-quickstarts/image/reve-2-1). Reports say "Reve's official API was sunset on August 14, 2026", though hosted copies remain — [eesel](https://www.eesel.ai/blog/reve-2-1-pricing) / [AIreiter](https://aireiter.com/blog/reve-2-1-api-review-pricing) (search snippet; not verified on reve.com)

**Ideogram, Recraft, Stability, Adobe, Midjourney**
- Ideogram prices Character Reference only for 3.0: Turbo $0.10, Default $0.15, Quality $0.20 — [Puter, Jun 2026](https://developer.puter.com/tutorials/ideogram-api-pricing/). An aggregator page for Ideogram 4.5 says you can add "one to five clear images of the character" and tag them as `@img_1` — [Puter Ideogram 4.5](https://developer.puter.com/ai/ideogram/ideogram-4-5/) (search snippet; not confirmed on ideogram.ai). The Ideogram 3.0 Edit endpoint is now titled "Edit with Ideogram 3.0 (legacy)" — [Ideogram API reference](https://developer.ideogram.ai/api-reference/api-reference/edit-v3)
- Recraft V4 Styles needs at least one style reference (1–10; PNG/JPG/WEBP, ≥256 px on the short edge). It "generates a new image that reproduces the reference's rendering technique, colour, texture, and composition rather than editing it". V4 Styles outputs ≈1K and Pro ≈2K — [OpenRouter Recraft V4 Styles](https://openrouter.ai/recraft/recraft-v4-styles) (search snippet). Snapshot `recraft-v4-styles-20260826`, with references in an `input_references` array — [OpenRouter Recraft V4 Styles](https://openrouter.ai/recraft/recraft-v4-styles)
- Recraft V3 editing (image-to-image, inpainting, outpainting, background operations) costs $0.04 raster / $0.08 vector, and a "Create style" tool exists — [Recraft API pricing](https://www.recraft.ai/docs/api-reference/pricing.md)
- Stability's editing and control services are Erase, Inpaint, Remove Background, Search and Replace, Sketch, Structure and Style. No dedicated multi-reference or character-consistency endpoint appears in its June 2026 price table — [Puter Stability pricing](https://developer.puter.com/tutorials/stability-ai-api-pricing/)
- Adobe Firefly API: "The Image5 model is Firefly's latest model … with native 4 MP resolution". Object Composite blends "product shots and objects into generated scenes" — [Adobe Firefly API docs](https://developer.adobe.com/firefly-services/docs/firefly-api/)
- Midjourney: "There is no official Midjourney API in 2026"; access is only through midjourney.com or the Discord bot (from $10/month). The ToS prohibit automation, and every "Midjourney API" is a third-party wrapper that risks a ban — [Unifically](https://unifically.com/blogs/midjourney-api), [Apiframe](https://apiframe.ai/blog/best-midjourney-apis)

### Inferences
- **Fusion step (3 references):** models that fit natively are GPT Image 2.5, FLUX 3, FLUX.2, Seedream 5.0, MAI-Image-2.6, Qwen-Image-3.0 (exactly at its cap), Grok Imagine 2.0 (at its cap) and Muse Image (cap unknown). Recraft V4 Styles, Stability and Midjourney don't fit.
- **4-stage baby chain:** drift compounds when each stage edits the previous one. Models that take more than 3 references let the script send [previous stage, the stage-1 original, the golden style ref] on every call to anchor identity and style. That favours FLUX 3 (10, refs free), Seedream 5.0 (10–14), GPT Image 2.5 and MAI-2.6 (5) over Qwen-3.0 and Grok (3).
- **Recraft V4 Styles** suits non-identity assets that need a strict style lock (eggs, halo rings, the background). It can't be the fusion engine.
- **Ideogram** is weaker for this pipeline. Its documented character reference is a 3.0 feature at 2–3× base price, and the 4.x multi-reference details are only confirmed by aggregators.

### Gaps
- Maximum input images for gpt-image-2 / 2.5 edits is not stated. 2025 docs said 16 for gpt-image-1, not re-verified. The OpenAI edit API reference URL returned 404/403. Whether `input_fidelity` exists on 2.x is unknown.
- The maximum reference count for Meta Muse Image is unpublished.
- Ideogram 4.5's reference and transparency behaviour is confirmed only by an aggregator.
- Adobe Firefly style-reference and structure-reference image counts could not be verified; the docs overview page omits them.
- No published head-to-head test of identity preservation for stylised sticker creatures across these APIs was found.

---

## Q2. Native transparent background output, or must we chroma-key?

### Takeaway
Only OpenAI's **gpt-image-2.5 family** (and Ideogram's dedicated transparent endpoint) returns true alpha in one step. OpenAI **dropped transparency from gpt-image-2** in October 2026, and gpt-image-1 (which had it) retires Oct 23, 2026. FLUX 3, Seedream 5.0, Qwen-Image-3.0, MAI, Muse and Grok have no documented alpha output, so plan on chroma-keying or a cheap matting step (Recraft $0.01, Qwen-Image-Layered ~$0.05, Stability $0.05).

### Cited Findings
- GPT Image 2.5 (both variants): "For transparent backgrounds with either model, set `background: 'transparent'` and use `output_format: 'png'` or `'webp'`" — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation). Both support "native transparent-background generation" — [Grida](https://grida.co/docs/models/gpt-image-2.5)
- gpt-image-2 now returns `"Transparent background is not supported for this model."` (code `invalid_value`). An OpenAI staff member wrote on Oct 1, 2026: "Transparency preview in gpt-image-2 is discontinued. Gpt-image-2.5 family has more robust transparency support." Users said it had worked days earlier — [OpenAI community thread](https://community.openai.com/t/is-transparent-background-support-broken-in-gpt-image-2/1402707)
- For OpenAI inpainting, the mask "must contain an alpha channel", and image plus mask must be the same format and size (<50 MB) — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- Ideogram transparent generation (3.0) costs $0.04 / $0.07 / $0.10 (Turbo/Default/Quality) at 1×, $0.16–0.22 at 2× upscale and $0.20–0.26 at 4×. "Layerize" costs $0.09 per input image — [Puter, Jun 2026](https://developer.puter.com/tutorials/ideogram-api-pricing/). The aggregator 4.5 page says reference-based 4.5 generations come back with a transparent background as PNG — [Puter Ideogram 4.5](https://developer.puter.com/ai/ideogram/ideogram-4-5/) (search snippet)
- Recraft: Remove background $0.01 (10 units), Vectorize $0.01 — [Recraft API pricing](https://www.recraft.ai/docs/api-reference/pricing.md)
- Stability: Remove Background is 5 credits ($0.05) — [Puter Stability pricing](https://developer.puter.com/tutorials/stability-ai-api-pricing/)
- Qwen-Image-Layered splits an image into 1–10 RGBA layers for about $0.05 per image on fal (`fal-ai/qwen-image-layered`), taking 15–30 s — [fal llms.txt](https://fal.ai/models/fal-ai/qwen-image-layered/llms.txt), [PricePerToken](https://pricepertoken.com/image/model/fal-ai-qwen-image-layered)
- FLUX 3 outputs `jpeg` (default) or `png`; no transparency option is listed — [fal FLUX 3 edit](https://fal.ai/models/blackforestlabs/flux-3/edit-image)
- Seedream 5.0 Pro outputs `png` or `jpeg`; no alpha parameter is described — [mer.vin](https://mer.vin/2026/07/seedream-5-0-pro-api-on-byteplus-precision-image-generation-and-multi-reference-editing/)

### Inferences
- If the pipeline moves off Gemini to anything except GPT Image 2.5 or Ideogram's transparent endpoint, keep the current chroma-key path. The sticker style (thick dark outline plus cream rim) is easy to key against a flat colour absent from all six-colour palettes, such as #FF00FF. Despill the rim before palette snapping.
- Always request **PNG**. FLUX 3 defaults to JPEG, whose block artifacts damage both chroma-keying and palette snapping.
- **Halo rings** with soft glow or partial transparency are the one asset class that really needs alpha. Generate them with GPT Image 2.5 `background: "transparent"`, or design them as opaque flat rings that key cleanly.
- A hybrid works: generate on a cheap multi-reference model with a flat key background, then fall back to Recraft remove-background ($0.01) or Qwen-Image-Layered (~$0.05) only for images that fail the local keyer. That adds under $1–2 per pass.

### Gaps
- Whether gpt-image-1.5 and gpt-image-1-mini still accept `background: "transparent"` in October 2026 was not verified.
- No practitioner report was found on the edge quality of GPT Image 2.5 alpha (fringing on cream rims or thin outlines).
- MAI-Image-2.6, Muse Image, Grok Imagine 2.0 and Qwen-Image-3.0 transparency is undocumented in the sources found.

---

## Q3. Price per ~1024 px image, batch/async discounts, rate limits, and cost of one asset pass (~117 images + ~20% retries ≈ 140 images)

### Takeaway
Most credible options cost **$1.50–$10 per pass**, well inside the $10–20 budget. GPT Image 2.5 at "high" is about $0.053 per 1024² image, so roughly $7.4 output per pass before reference-image input tokens, and the Batch API halves that. FLUX 3 is a flat $0.048 with references included. Seedream 5.0 runs $0.018–0.045, MAI-Image-2.6 about $0.039 (Flash about $0.02), Qwen-Image-3.0 $0.03–0.04, and Meta Muse Image $0.01. Over budget or unworkable: GPT Image 2.5 "max" / gpt-image-2 "high" at standard rates (~$29.5), Reve 2.1 ($0.24/image), Adobe Firefly (enterprise minimums) and Midjourney (no API).

### Cited Findings
**OpenAI**
- Token prices per 1M (official): gpt-image-2.5-sunburst/-flare and gpt-image-2 charge text input $5, image input $8, cached input $2 and image output $30. gpt-image-1.5 charges $5 / $8 / $2, with text output $10 and image output $32. gpt-image-1 charges $5 / $10 / $2.50 / $40. gpt-image-1-mini charges $2 / $2.50 / $0.25 / $8. "chatgpt-image-latest" is priced like 1.5. **Batch is exactly 50% off on every image model** — [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- The flare model page gives image output as "$30 per million tokens with Standard processing or $15 with Batch". It lists cached text input at $1.25, which conflicts with the pricing page's $2.00 — [flare model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)
- GPT Image 2.5 at 1024×1024: medium 439 tokens = $0.01317, high 1,756 tokens = $0.05268 — [Grida](https://grida.co/docs/models/gpt-image-2.5). Low is $0.00588 — [Segmind / laozhang](https://blog.segmind.com/gpt-image-2-5-api-the-ultimate-guide-to-flare-and-sunburst/) (search snippet). Artificial Analysis prices 2.5 Sunburst/Flare at **max** quality at $210.7 per 1k images — [AA editing](https://artificialanalysis.ai/image/leaderboard/editing)
- gpt-image-2 at 1024×1024: low $0.006, medium $0.053, high $0.211 — [CostGoat (updated Sept 5, 2026)](https://costgoat.com/pricing/openai-images)
- gpt-image-1.5: $0.009 / $0.034 / $0.133. gpt-image-1-mini: $0.005 / $0.011 / $0.036. gpt-image-1: $0.011 / $0.042 / $0.167. Portrait 1024×1536 costs about 1.5× — [PricePerToken](https://pricepertoken.com/gpt-image-pricing). Conflict: CostGoat lists 1.5 high at $0.20 and mini high at $0.052, while AA's $133/1k for "GPT Image 1.5 (high)" matches $0.133 — [CostGoat](https://costgoat.com/pricing/openai-images), [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image)
- Rate limits for gpt-image-2 and gpt-image-2.5-flare: Build 250,000 TPM / **20 IPM**, Launch 3,000,000 TPM / 150 IPM, Grow 8,000,000 TPM / 250 IPM — [gpt-image-2 page](https://developers.openai.com/api/docs/models/gpt-image-2), [flare page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)
- "API organization verification required before using GPT Image models" — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)

**Black Forest Labs**
- FLUX.2 starting prices: [klein] 4B $0.014, [klein] 9B $0.015, [pro] $0.03 text-to-image / $0.045 editing, [max] $0.07, [flex] $0.05. The first megapixel is a flat rate and each extra MP adds to it. 1 credit = $0.01. Kontext [pro] $0.04, Kontext [max] $0.08, FLUX 1.1 [pro] $0.04. "Batch" just multiplies the base cost (4 × pro = $0.12); there is no discount — [BFL pricing docs](https://docs.bfl.ml/quick_start/pricing)
- FLUX.2 [flex] charges "$0.06 for each megapixel on both input and output side", and [max] is $0.07/MP — [OpenRouter flex](https://openrouter.ai/black-forest-labs/flux.2-flex), [OpenRouter max](https://openrouter.ai/black-forest-labs/flux.2-max) (search snippet)
- FLUX 3 Image: a 1K (1 MP) image costs $0.048 at the standard rate. fal ran a 50%-off launch price ($0.024) that "ends October 8" — [fal FLUX 3 edit](https://fal.ai/models/blackforestlabs/flux-3/edit-image). Tiers: $0.041 (768 px), $0.048 (1K), $0.07 (1.5K), $0.100 (2K), $0.607 (4K), with references free up to 10 — [Treza Labs](https://www.trezalabs.com/blog/flux-3-image-api-pricing-through-a-pipeline) (search snippet). FLUX 3 Image appears in BFL's own pricing calculator — [bfl.ai/pricing](https://bfl.ai/pricing)

**ByteDance, Alibaba, Microsoft, Meta, xAI**
- Seedream 5.0 Pro: $0.045 per output ≤2.36 MP, $0.09 above that. The first reference image is free; each extra one costs $0.003 — [The Rundown](https://www.therundown.ai/tools/seedream-5-0-pro) / [Atlas Cloud](https://www.atlascloud.ai/blog/ai-updates/seedream-5-0-pro-price) (search snippet). AA lists $90/1k — [AA](https://artificialanalysis.ai/image/leaderboard/editing). Seedream 5.0 Pro has no batch mode — [mer.vin](https://mer.vin/2026/07/seedream-5-0-pro-api-on-byteplus-precision-image-generation-and-multi-reference-editing/)
- Seedream 5.0 Lite costs $0.035 flat on fal and on Replicate — [Moda](https://moda.app/resources/models/seedream-5-lite), [Bifrost/Maxim](https://www.getmaxim.ai/bifrost/model-library/compare/replicate/seedream-5-lite) (search snippets). Seedream 5.0 Flash costs $0.018 per image (Oct 2026) — [Treza Labs](https://www.trezalabs.com/blog/seedream-5-0-flash-api-pricing-through-a-pipeline)
- Qwen-Image-3.0 costs $0.03 and 3.0-Pro $0.04 per image for international users on Qwen Cloud (about ¥0.18 in China) — [LLM Reference](https://www.llmreference.com/model/qwen-image-3.0). Qwen-Image-Edit-2511 costs $0.031 on fal and $0.040 on Replicate; Edit-Plus costs $0.031 on fal and $0.050 on Replicate — [PricePerToken](https://pricepertoken.com/image/model/qwen-qwen-image-edit-2511), [muapi](https://muapi.ai/comparison/qwen-image-edit-plus)
- MAI-Image-2.6 tokens: $5/M text in, $8/M image in, $38/M image out, about $0.039 per image ($38.90/1k) — [OpenRouter MAI-Image-2.6](https://openrouter.ai/microsoft/mai-image-2.6) (search snippet). MAI-Image-2.6-Flash is $19.5/1k — [AA](https://artificialanalysis.ai/image/leaderboard/editing)
- Meta Muse Image costs "$0.01 per generated image" on the Meta Model API (announced Aug 28, 2026) — [RuntimeWire](https://runtimewire.com/article/meta-ships-muse-image-api-at-one-cent-per-image), [Meta dev page](https://dev.meta.ai/models/muse-image/). It's $0.011 on WaveSpeed — [WaveSpeed](https://wavespeed.ai/blog/ai-models/meta-muse-image-api/)
- Grok Imagine Image 2.0: low·1k $0.04, low·2k $0.06, medium·1k $0.06, medium·2k $0.08. Input images cost $0.01 each (max 3), charged once per request — [muapi](https://muapi.ai/comparison/grok-imagine-image-2) (search snippet)

**Ideogram, Recraft, Stability, Adobe, Reve, Midjourney**
- Ideogram (Jun 2026), per image for generate/remix/edit/reframe/replace-background: 4.0 Turbo $0.03, Default $0.06, Quality $0.10; 3.0 Flash/Turbo $0.03, Default $0.06, Quality $0.09. 3.0 + Character Reference costs $0.10 / $0.15 / $0.20 — [Puter](https://developer.puter.com/tutorials/ideogram-api-pricing/). 4.5 is "$0.06 per image" — [Puter 4.5](https://developer.puter.com/ai/ideogram/ideogram-4-5/) (search snippet). That conflicts with AA's $220/1k for "Ideogram 4.5 (High)" — [AA](https://artificialanalysis.ai/image/leaderboard/editing). Default rate limit is "10 in-flight requests" — [Ideogram pricing page](http://ideogram.ai/pricing/?pricing_tab=api)
- Recraft: "$1 = 1,000 units", units don't expire. V4.1 Flash $0.007 (raster). V4.1 $0.035 raster / $0.08 vector. V4 Styles $0.035 raster / $0.05 vector plus $0.005 per request for style reference; Styles Pro $0.10 / $0.12. V4 $0.04, V3 $0.04. Remove background and vectorize $0.01 each. "No rate limits are specified" — [Recraft API pricing](https://www.recraft.ai/docs/api-reference/pricing.md)
- Stability (Jun 2026): Stable Image Ultra $0.08, SD 3.5 Large $0.065, SD 3.5 Large Turbo $0.04, SD 3.5 Medium $0.035, Stable Image Core $0.03; edit and control services $0.05 each. 1 credit = $0.01 — [Puter Stability](https://developer.puter.com/tutorials/stability-ai-api-pricing/)
- Adobe Firefly API: roughly $0.02–$0.10 per image, consumption-based, with "typically a $1,000 per month minimum commitment" for enterprise API access — [Redress Compliance](https://redresscompliance.com/adobe-firefly-enterprise-pricing-2026). This is a third-party licensing consultancy, not Adobe; unverified.
- Reve 2.1 costs $0.24 per image at native 4K — [GMI Cloud](https://docs.gmicloud.ai/model-quickstarts/image/reve-2-1) / [eesel](https://www.eesel.ai/blog/reve-2-1-pricing) (search snippet)
- Midjourney has "no per-image price list" because it has no API — [Unifically](https://unifically.com/blogs/midjourney-api)

### Inferences — estimated cost of one full pass (140 output images at ~1 MP; my arithmetic from the per-image prices above)
Reference-image load per pass is about 200–280 input images: 28 fusions × 3, 28 namecards × 2, 32 baby edits × 1–2, and 1 each for enemies, eggs and halos, plus 20% retries.

| Model | $/image (1K) | Output cost / pass | Notes |
|---|---|---|---|
| Meta Muse Image | 0.010 | **$1.40** | Ref cap unknown; no alpha |
| Recraft V4.1 Flash | 0.007 | $0.98 | No references; only for eggs, halos, background |
| GPT Image 2.5 medium | 0.0132 | $1.84 (+ref tokens) | Native alpha; Batch −50% |
| FLUX.2 [klein] 9B | from 0.015 | ~$2.10+ | Open-weights family |
| Seedream 5.0 Flash | 0.018 | $2.52 | Up to 14 refs free |
| MAI-Image-2.6-Flash | ~0.0195 | $2.73 | Up to 5 refs (2.6) |
| Qwen-Image-3.0 / Edit-2511 (fal) | 0.030 / 0.031 | $4.20 / $4.34 | 3 refs max (3.0) |
| Seedream 5.0 Lite | 0.035 | $4.90 | fal / Replicate / BytePlus |
| MAI-Image-2.6 | ~0.039 | $5.45 | #3 in AA editing |
| Recraft V4 Styles (+ remove BG) | 0.040 (+0.01) | $5.60 ($7.00) | Style lock only; vector option |
| Qwen-Image-3.0-Pro | 0.040 | $5.60 | |
| Seedream 5.0 Pro | 0.045 + $0.003/extra ref | ~$6.5 | No batch mode |
| FLUX.2 [pro] (edit) | from 0.045 | ~$6.30+ | Input MP adds cost |
| FLUX 3 Image | 0.048 | **$6.72** | Refs free (≤10) |
| GPT Image 2.5 high | 0.0527 | **$7.38** (Batch $3.69) (+ref tokens) | Native alpha, #1 on AA |
| Grok Imagine 2.0 (low, 1k) | 0.04 + $0.01/ref | ~$8.0 | 3 refs max |
| Ideogram 4.0 Default / 4.5 | 0.06 | $8.40 | Character ref (3.0 Turbo) → $14.00 |
| FLUX.2 [max] | from 0.07 | ~$9.80+ | |
| Stability Ultra (+ remove BG) | 0.08 (+0.05) | $11.20 ($18.20) | No multi-reference |
| gpt-image-1.5 high | 0.133 | $18.62 (+refs) | |
| FLUX.2 [flex] | 0.06/MP in+out | ~$23 (≈2.7 MP per call incl. refs) | Expensive with many refs |
| GPT Image 2.5 max / gpt-image-2 high | ~0.211 | $29.50 (Batch $14.75) | |
| Reve 2.1 | 0.24 | $33.60 | Official API reportedly sunset |
| Adobe Firefly Services | ~0.02–0.10 | Enterprise minimum (~$1,000/mo, unverified) | Out of budget |

- OpenAI reference inputs are billed as image-input tokens at $8/M ($4/M Batch). Every 1,000 tokens per reference adds about $1.9 per pass (≈240k tokens) at standard rates. The real per-reference token count wasn't found (see Gaps), but even generous assumptions keep GPT Image 2.5 high at roughly $10–15 standard and about $5–8 with Batch.
- At the default Build tier (20 IPM), a 140-image pass takes at least about 7 minutes of wall-clock time on OpenAI. Batch fits better for overnight full passes; the interactive API fits iteration.
- Cheapest credible "quality + references" combination: Seedream 5.0 Flash/Lite, MAI-2.6-Flash or Muse Image for drafts, then GPT Image 2.5 high for finals that need alpha. That comes in under $10 per pass.

### Gaps
- Image-input token counts for 1024² references on gpt-image-2.5 weren't found, nor whether cached-input pricing ($2/M) applies to a repeated golden reference.
- No published rate limits were found for the BFL direct API, fal, Replicate, BytePlus ModelArk, Qwen Cloud, Microsoft Foundry, the Meta Model API or xAI image endpoints.
- The OpenAI Batch completion window for image jobs was not re-verified.
- Ideogram 4.5 price conflicts ($0.06 per image vs AA's $220/1k at "High").

---

## Q4. Commercial-use rights, watermarking (visible / C2PA / invisible), and content restrictions that might block cute creature art

### Takeaway
No source found suggests that cute creature or chibi art would be blocked; filters target age-inappropriate and violent content, and each has a tunable lenient setting (OpenAI `moderation: "low"`, FLUX `safety_tolerance`). Three practical risks surfaced:
- Seedream on BytePlus has a `watermark` flag that adds a visible "AI generated" badge, and its default is ambiguous, so always send `false`.
- Midjourney automation violates its ToS.
- Adobe's indemnity reportedly does not cover outputs made from uploaded reference images, which removes its main advantage for a reference-driven pipeline.

Output-ownership terms for most API vendors weren't re-verified this session.

### Cited Findings
- fal labels the FLUX 3 edit endpoint "Commercial use" — [fal FLUX 3 edit](https://fal.ai/models/blackforestlabs/flux-3/edit-image). Muse Image endpoints on fal are "marked for commercial use" — [Let's Data Science](https://letsdatascience.com/news/fal-opens-access-to-meta-muse-image-0fef298a) (search snippet)
- Seedream 5.0 on BytePlus: the request body has a `watermark` field. Its description reads "false to omit 'AI generated' badge", which suggests true is the default, yet the example sets false — [mer.vin](https://mer.vin/2026/07/seedream-5-0-pro-api-on-byteplus-precision-image-generation-and-multi-reference-editing/). Another integration doc describes it as "a boolean (default false) that is forwarded to BytePlus" — [Invoke](https://invoke.ai/features/external-models/seedream/) / [Runware](https://runware.ai/docs/models/bytedance-seedream-5-0-pro) (search snippet; the attribution between these two is uncertain)
- OpenAI moderation: `auto` (default) is "standard filtering that seeks to limit creating certain categories of potentially age-inappropriate content", and `low` is "less restrictive filtering". Blocked requests return `error.code = "moderation_blocked"` — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- The 2026 OpenAI image guide does not mention C2PA or provenance metadata — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- FLUX 3 `safety_tolerance` runs from "0 (strictest) to 4, default 2" — [fal FLUX 3 edit](https://fal.ai/models/blackforestlabs/flux-3/edit-image)
- Adobe: "When users upload reference images, the indemnity may not apply to the generated output", and named-artist styles may fall outside it. Adobe is described as the only major provider offering formal contractual IP indemnity (as of May 2026), for enterprise customers — [Redress Compliance](https://redresscompliance.com/adobe-firefly-enterprise-pricing-2026) (third-party)
- Midjourney's terms of service prohibit automation, and wrappers that connect to your account risk a ToS violation — [Unifically](https://unifically.com/blogs/midjourney-api), [Wireflow](https://www.wireflow.ai/blog/best-midjourney-api-tools-in-2026)
- Reve's official API was reportedly sunset on Aug 14, 2026, a vendor-continuity risk — [eesel](https://www.eesel.ai/blog/reve-2-1-pricing) (search snippet)

### Inferences
- Content-filter risk for this art direction (cute pets, eggs, halos, chibi enemies) is low. The likeliest triggers are enemy prompts with words like "blood", "kill" or realistic weapons; neutral wording plus OpenAI `moderation: "low"` or FLUX `safety_tolerance` 2–4 should cover it.
- C2PA manifests, if any vendor embeds them, live in PNG/JPEG metadata. The pipeline's re-encode after palette snapping will normally drop them. Any invisible pixel watermark would probably be heavily degraded by six-colour quantization; this is speculative and untested. Neither affects how the assets look in-game.
- For a commercial mobile release, call official APIs or "commercial use" endpoints on reputable hosts (fal, Replicate, Together, OpenRouter, Vercel), keep each vendor's ToS snapshot on file, and avoid Midjourney wrappers.

### Gaps
- Output ownership and commercial-use clauses for OpenAI, the BFL direct API, BytePlus (Seedream), Qwen Cloud, Microsoft Foundry (MAI), the Meta Model API, xAI, Ideogram, Recraft and Stability were **not re-verified** this session.
- Whether OpenAI, BFL, Microsoft, Meta or ByteDance embed C2PA or invisible watermarks in 2026 API outputs was not verified.
- Licences for the open-weights options (Qwen-Image-2.1, HunyuanImage 3.0 Instruct, FLUX.2 klein/dev) were not checked.

---

## Q5. Quality signals for consistent character/sprite work (leaderboards, practitioner reports)

### Takeaway
On Artificial Analysis's v2.0 arenas, OpenAI's GPT Image 2.5 Sunburst/Flare lead both text-to-image and editing. The next cluster is MAI-Image-2.6, Google's Nano Banana 2.1 (out of scope, shown for reference), Grok Imagine 2.0, Meta Muse Image, Seedream 5.0 Pro and FLUX 3 Image (text-to-image only).
- FLUX.2 has slipped to mid-table (editing ranks 40–48).
- Ideogram 4.x and Recraft V4 rank lower.
- Midjourney V7 and SD 3.5 are far behind.
- Best price-quality: Muse Image ($10/1k, #7 editing) and MAI-Image-2.6-Flash ($19.5/1k, #5 editing).

Practitioners report GPT Image models still need frame-by-frame generation and retries for consistent sprites. These arenas measure general preference, not set-wide identity consistency.

### Cited Findings
**Artificial Analysis Text-to-Image v2.0** (Elo, price per 1k images) — [AA text-to-image](https://artificialanalysis.ai/image/leaderboard/text-to-image)
1. GPT Image 2.5 Sunburst (max) 1199, $210.7
2. GPT Image 2.5 Flare (max) 1192, $210.7
3. GPT Image 2 (high) 1172, $211
4. Nano Banana 2.1 (Google) 1159, $33.6
5. Grok Imagine Image 2.0 1155, $60
6. MAI-Image-2.6 1152, $38.9
7. Nano Banana 2 1125, $67
8. Muse Image (Meta) 1115, $10
9. FLUX 3 Image (BFL) 1115, $48
10. GPT Image 1.5 (high) 1109, $133
11. MAI-Image-2.6-Flash 1108, $19.5

Further down: 16 Qwen-Image-3.0-Pro 1089 ($40); 17 Seedream 5.0 Pro 1082 ($90); 18 Qwen-Image-3.0 1074 ($30); 20 Qwen-Image-2.1 1037 (open weights); 24 FLUX.2 [flex] 1029; 25 Krea 2 Large 1027; 28 Recraft V4.1 Utility 1022; 31 FLUX.2 [max] 1020; 34 Ideogram 4.5 (High) 1015; 37 Seedream 5.0 Lite 1013; 43 FLUX.2 [pro] 1003; 97 Reve Image (Halfmoon) 913; 115 Midjourney v7 Alpha 879; 133 SD 3.5 Large 840.

**Artificial Analysis Image Editing v2.0** — [AA editing](https://artificialanalysis.ai/image/leaderboard/editing)
1. GPT Image 2.5 Sunburst (max) 1186
2. GPT Image 2.5 Flare (max) 1167
3. MAI-Image-2.6 1143, $38.9
4. Nano Banana 2.1 1141
5. MAI-Image-2.6-Flash 1130, $19.5
6. GPT Image 2 (high) 1129
7. Muse Image 1123, $10
8. MAI-Image-2.5 1116
11. Grok Imagine Image 2.0 1113
12. Seedream 5.0 Pro 1113, $90
13. GPT Image 1.5 (high) 1106

Further down: 16 HunyuanImage 3.5 Preview 1089 ($24); 18 Qwen-Image-3.0-Pro 1082; 19 Luma UNI 1 Max 1076; 21 Qwen-Image-2.1 1074 (open weights, top open model); 22 HiDream-O1-Edit-1.5 1070; 23 HunyuanImage 3.0 Instruct 1068 (open); 24 Ideogram 4.5 (High) 1063 ($220); 25 Qwen-Image-3.0 1060; 26 Seedream 5.0 Lite 1059; 33 Seedream 4.5 1037; FLUX.2 variants at ranks 40–48 (1013–1000). Recraft is not in the top 81 shown, and FLUX 3 Image did not appear in the top 25 returned.

**Other leaderboard signals**
- AA's methodology note says rankings use blind comparisons by a recruited human panel plus public votes before January 1, 2026 — [AA editing](https://artificialanalysis.ai/image/leaderboard/editing)
- When GPT Image 2 launched, AA reported it "debuts at #1 on our Text to Image Leaderboard, surpassing Nano Banana 2, FLUX.2 [max], and Seedream 4.0" — [AA on X](https://x.com/ArtificialAnlys/status/2047184062012706980)
- An earlier or alternate snapshot in leaderboard mirrors showed a different scale and order: MAI-Image-2.5-Pro 1272, Reve 2.1 1263, GPT Image 2 (high) 1256 — [Magic Hour](https://magichour.ai/model-leaderboard/image-editing) / [BenchmarkList](https://benchmarklist.com/arenas/artificial_analysis_image_editing/) (search snippet; older version)
- An older open-weights editing snapshot: HunyuanImage 3.0 Instruct 1222, HiDream-O1-Image 1191, FLUX.2 [klein] 9B 1165 — [AA open weights](https://artificialanalysis.ai/image/leaderboard/editing/open-weights) (search snippet; older scale)

**Practitioner reports**
- OpenAI community thread on sprite sheets with gpt-image-2 (Apr 26, 2026):
  - Generating "frame by frame tends to produce better results" than whole sheets, and 3D mannequin-style pose references help.
  - The model confuses the character's left and right limbs.
  - Grid spacing and proportions drift across frames, and "each frame might need several tries".

  — [OpenAI community](https://community.openai.com/t/developing-sprite-sheets-with-gpt-image-2/1379831)
- A 2026 guide says FLUX.2, GPT Image 1.5 and Seedream 5.0 Lite "have substantially better inherent understanding of visual references than their predecessors", so reference-only approaches now perform close to trained (LoRA) models for most character types — [getimg.ai](https://getimg.ai/blog/how-to-create-consistent-characters-with-ai) (search snippet)
- FLUX.2 multi-reference advice: use a front-facing primary reference plus a three-quarter view; "four well-chosen references outperform ten mediocre ones" — [SelfieLab Studio](https://selfielabstudio.com/blog/flux2-multi-reference-build-seamless-character-sheets-20260218) (search snippet; vendor blog)

### Inferences
- Treat AA Elo as a coarse filter only. It rewards general aesthetics and prompt adherence (often photoreal) and doesn't test the hard parts here: identity carried across a 4-step edit chain, a fixed flat-colour sticker look, and a thick outline. A 10-image bake-off on real assets, such as two fusions, one baby-stage chain and one enemy, is the decisive test.
- Shortlist for a bake-off:
  - **GPT Image 2.5 Sunburst** (best ranked; native alpha)
  - **MAI-Image-2.6 / 2.6-Flash** (top-3 editing at $0.02–0.04)
  - **Meta Muse Image** (#7 editing at $0.01)
  - **Seedream 5.0 Pro/Lite** (10–14 refs)
  - **FLUX 3 Image** (#9 T2I, refs free, bounding-box layout)
  - **Qwen-Image-3.0** (cheap, but 3-ref cap)
- The OpenAI sprite-sheet reports match this pipeline's design, which already generates one creature per call. Budget about 20% retries, or more for edit chains.

### Gaps
- The LMArena (now arena.ai) text-to-image and image-edit leaderboards returned HTTP 403 and couldn't be checked.
- No benchmark measures multi-reference identity or style consistency for stylised 2D sprites.
- AA's "votes before January 1, 2026" note is ambiguous for models released after that date (presumably panel-only).
- No Reddit or HN practitioner reports specific to 2026 models (MAI, Muse, FLUX 3, Seedream 5) for sprites were found.

---

## Q6. How each is called (REST/SDK/async/webhooks) and how hard it is to slot into a Node script that already sends inlineData references and post-processes PNGs

### Takeaway
OpenAI is the most direct swap: synchronous REST, an official Node SDK, and an async Batch API at 50% off. Its one wrinkle is that the Images edit endpoint wants multipart file uploads, not inline base64; the Responses API does accept base64. BytePlus Seedream takes base64 references directly. For quick A/B testing, gateways (OpenRouter's Image API, fal, Vercel AI Gateway) put FLUX 3, FLUX.2, MAI-Image-2.6, Muse Image, Grok Imagine, Recraft V4 Styles, Seedream and Qwen behind one key. Some endpoints (fal FLUX 3, Reve) are documented as taking image URLs, which means uploading references first.

### Cited Findings
- OpenAI:
  - The Image API takes "file uploads only"; the Responses API takes "file IDs, base64, URLs". Both stream partial images (`partial_images` 0–3).
  - "Complex prompts may take up to 2 minutes".
  - Outputs are PNG (default), JPEG or WebP, with `output_compression` for JPEG/WebP.
  - Custom sizes must be "multiples of 16, aspect ratio between 1:3 and 3:1", "neither edge may exceed 3840 pixels", "total pixel count between 655,360 and 8,294,400", and resolutions "above 2560x1440 are experimental".
  - Quality levels on 2.5: low, medium, high, xhigh, max, auto.

  — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- `v1/batch` is a supported endpoint for gpt-image-2 and gpt-image-2.5-flare — [gpt-image-2 page](https://developers.openai.com/api/docs/models/gpt-image-2), [flare page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)
- BytePlus Seedream: `POST /api/v3/images/generations` with `Authorization: Bearer $ARK_API_KEY`. The image input is an "optional URL, Base64, or array (2–10 refs for fusion)". One endpoint handles text-to-image, editing and fusion — [mer.vin](https://mer.vin/2026/07/seedream-5-0-pro-api-on-byteplus-precision-image-generation-and-multi-reference-editing/)
- FLUX 3 on fal takes "1 to 10 image URLs" — [fal](https://fal.ai/models/blackforestlabs/flux-3/edit-image). References "can be supplied as URLs or base64" — [Treza Labs](https://www.trezalabs.com/blog/flux-3-image-api-pricing-through-a-pipeline) (search snippet)
- Qwen-Image-Layered on fal lives at `https://fal.run/fal-ai/qwen-image-layered` — [fal llms.txt](https://fal.ai/models/fal-ai/qwen-image-layered/llms.txt)
- OpenRouter's Image API takes an `input_references` array of up to 10 images and returns `image/png` base64 plus a `usage.cost` field — [OpenRouter Recraft V4 Styles](https://openrouter.ai/recraft/recraft-v4-styles). OpenRouter also lists FLUX.2 [pro/flex/max], FLUX.3 Image, MAI-Image-2.6 and Grok Imagine Image 2.0 — [OpenRouter FLUX.2 pro](https://openrouter.ai/black-forest-labs/flux.2-pro), [OpenRouter FLUX.3](https://openrouter.ai/black-forest-labs/flux-3-image), [OpenRouter MAI-Image-2.6](https://openrouter.ai/microsoft/mai-image-2.6), [OpenRouter Grok compare](https://openrouter.ai/compare/openai/gpt-image-2/x-ai/grok-imagine-image-2.0)
- Muse Image is reachable via REST through fal, Runway and OpenRouter, as well as the Meta Model API — [Meta dev page](https://dev.meta.ai/models/muse-image/)
- Vercel AI Gateway lists FLUX 3 Image and Seedream 5.0 Lite — [Vercel FLUX 3](https://vercel.com/ai-gateway/models/flux-3-image), [Vercel Seedream 5.0 Lite](https://vercel.com/ai-gateway/models/seedream-5.0-lite)
- Qwen-Image-3.0 is available through the Alibaba Cloud PAI-EAS REST API or SDK (`qwen-image-3.0`) and through Qwen Cloud — [LLM Reference](https://www.llmreference.com/model/qwen-image-3.0)
- Reve 2.1 takes reference URLs (`reference_image` / `reference_images`) with `<frame>N</frame>` prompt tags — [GMI Cloud](https://docs.gmicloud.ai/model-quickstarts/image/reve-2-1)
- Recraft bills in prepaid units ($1 = 1,000 units, no expiry) — [Recraft API pricing](https://www.recraft.ai/docs/api-reference/pricing.md)
- Ideogram's default rate limit is 10 in-flight requests — [Ideogram pricing page](http://ideogram.ai/pricing/?pricing_tab=api)
- Midjourney has "no official endpoint, no API key" — [Unifically](https://unifically.com/blogs/midjourney-api)

### Inferences
- **Effort ranking for the existing Node pipeline** (base64 inlineData refs → PNG → chroma-key → palette snap):
  1. **OpenAI GPT Image 2.5.** Use the official `openai` npm SDK; wrap reference Buffers as files for `images.edit`. Native alpha means the chroma-key step can be skipped for these assets, and Batch handles overnight passes. Requires organization verification.
  2. **BytePlus Seedream.** Same payload shape as now (base64 refs in JSON), synchronous, one image per call. Send `watermark: false`.
  3. **A gateway (OpenRouter / fal / Vercel).** One adapter covers several models for a bake-off. fal endpoints that take URLs need an upload step (fal storage), or data-URIs where accepted.
  4. **Reve (hosted only), Adobe (enterprise OAuth contracts) and Midjourney (no API)** aren't worth integrating.
- **9:16 background:** with OpenAI, use a custom size such as 1152×2048 (multiples of 16, 2.36 MP, within limits). MAI-Image-2.6 supports 9:16 natively, and Qwen-Image-3.0 allows 1:8 to 8:1.
- **Sprite resolution:** OpenAI's 655,360-pixel minimum (about 810² or more) means sprites are generated around 1024² and downscaled locally, which the palette-snapping step already accommodates.
- **Keep the model call behind one interface** (refs[] + prompt → PNG buffer). The 2026 market moves fast: gpt-image-2 lost transparency in October 2026, gpt-image-1 retires Oct 23, 2026, and Reve's API was reportedly sunset. Swapping vendors should be a config change.

### Gaps
- The async patterns for the BFL direct API (polling URL vs webhooks) and fal's queue/webhook client in Node weren't re-verified this session.
- Whether fal's FLUX 3 endpoint accepts data-URI or base64 references conflicts across sources (fal says URLs; Treza Labs says URLs or base64).
- The Microsoft Foundry (MAI) and Meta Model API request schemas weren't examined.
- OpenAI's `n` (multiple outputs per request) limits for 2.5 weren't checked.
