# Consistency and Batch Workflows for AI-Generated 2D Game-Creature Sets (state of October 2026)

Research date: 2026-10-14. Markers:
- **[fetched]**: I opened the page myself.
- **[search summary]**: the claim comes only from a search-engine summary. The page was not opened, so confidence is lower.
- **[sibling]**: the fact comes from `../Art style for 2048 Siege pets/ai_pipeline_and_licensing.md`. A parallel researcher fetched it on the same day; I did not re-fetch it.

Other caveats:
- Arena.ai (formerly LMArena) leaderboard pages returned HTTP 403 to my fetch tool. Arena numbers therefore come from mirrors and search summaries, labelled each time.
- Reseller and vendor blogs (APIYI, Atlas Cloud, Runware, Scenario, Recraft, CometAPI) are flagged where cited. They sell access to the models they compare.
- Gemini-specific reference-slot limits, prices, quota problems and the Hoyle chroma-key recipe are covered in depth in the sibling file. Here they are only cross-referenced.
- Context: "2048 Siege" needs about 117 images:
  - 32 baby stages, each an edit of the previous stage (for example 8 lines × 4 stages)
  - 28 fusions, each made from two parent images
  - 28 soft-vinyl 3D portraits
  - 17 chibi enemies
  - halos, eggs and a background
  - All in sticker style with thick outlines, strict palettes and transparent backgrounds.

---

## 1. What do 2026 leaderboards and benchmarks say about the top models for editing, multi-image composition and identity preservation?

### Takeaway
As of mid-October 2026, OpenAI's GPT Image 2.5 tops every human-preference board relevant here, on both Arena and Artificial Analysis (AA). It ships as **Sunburst** (higher quality) and **Flare** (faster), both launched 8 Sep 2026, and leads text-to-image, single-image edit and **multi-image edit**.

- **Nano Banana 2.1** (Google, Oct 2026) is the best non-OpenAI model on Arena's multi-image edit board (#4, preliminary) and #4 on AA's editing board, at about one-sixth of GPT Image 2.5's max-quality price.
- **Next pack:** MAI-Image-2.6 (Microsoft), Seedream 5.0 Pro (ByteDance), Grok Imagine Image 2.0 (xAI, listed as "SpaceXAI") and Muse Image (Meta).
- **Academic multi-reference benchmarks** lag the market and do not yet include GPT Image 2.x. They show closed models (Nano Banana 2/Pro, GPT-Image-1.5) far ahead of open-weights models.
- **Main failure mode:** "attribute binding", meaning keeping track of which feature comes from which reference. That is exactly the skill a two-parent fusion needs.
- **No benchmark covers stylised creatures or sticker art.** Every identity benchmark I found measures human faces or photos.

### Cited Findings

**Arena (arena.ai, formerly LMArena): crowdsourced blind pairwise votes, Elo-style scores**
- **Text-to-image, 7 Oct 2026** (82 models, 6,604,125 votes) — [Arena T2I leaderboard](https://arena.ai/leaderboard/text-to-image) [search summary; page 403 to fetch]

  | Rank | Model | Score |
  |---|---|---|
  | 1 | gpt-image-2.5-sunburst | 1425±7 |
  | 2 | gpt-image-2.5-flare | 1398±7 |
  | 3 | gpt-image-2 (medium) | 1383±4 |

- Nano Banana 2.1 scores 1328 on text-to-image from 5,310 votes, against 17,752 votes for Sunburst. All entries for the new model were still preliminary — [Atlas Cloud, 9 Oct 2026](https://www.atlascloud.ai/blog/tips/nano-banana-2.1-vs-gpt-image-2.5) [fetched; reseller blog]
- Cross-check on a re-scaled aggregator, snapshot date not shown: Sunburst 1140 > Flare 1118 > GPT Image 2 medium 1106 > Grok Imagine 2.0 Canvas 1067 > MAI-Image-2.6 1066 > Nano Banana 2.1 1062 > Reve 2.1 1042 > … Seedream 5.0 Pro 1004, Qwen Image 3.0 Pro 1004, Nano Banana Pro (2K) 1002/998. The ordering matches Arena; the absolute scale differs — [Sophon mirror of Arena T2I](https://sophon.at/leaderboards/lmarena-text-to-image) [fetched]
- Arena text-to-image has style categories, including "Illustration & anime", "Concept art & fantasy" and "Prompt adherence". I did not retrieve the category leaders — [WaveSpeed summary of Arena categories](https://wavespeed.ai/blog/posts/lm-arena-text-to-image-rankings-2026/) [search summary]
- **Single-image edit, snapshot 28 Aug 2026** (taken before GPT Image 2.5 launched) — [benchmarklist mirror of Arena Image Edit](https://benchmarklist.com/benchmarks/arena_ai_image_edit/) [fetched; aggregator mirror]

  | Rank | Model | Score | Votes / note |
  |---|---|---|---|
  | 1 | gpt-image-2 (medium) | 1461.78±3.64 | 212,326 votes |
  | 2 | grok-imagine-image-2.0 (low) | 1438.99 | |
  | 3 | mai-image-2.6-preview | 1416.85 | |
  | 4 | muse-image | 1404.90 | |
  | 5 | mai-image-2.5 | 1399.45 | |
  | 6 | seedream-5.0-pro | 1395.20 | |
  | 7 | gemini-3-pro-image-2k (Nano Banana Pro) | 1390.20 | |
  | 9 | chatgpt-image-latest-high-fidelity | 1389.62 | |
  | 10 | gemini-3.1-flash-image (Nano Banana 2) | 1386.87 | |
  | 17 | nano-banana-2-lite | 1314.36 | |
  | 19 | qwen-image-2.0-pro | 1303.72 | |
  | 23 | seedream-4.5 | 1300.95 | |
  | 25 | gemini-2.5-flash-image (original Nano Banana) | 1293.05 | |
  | 27 | flux-2-max | 1261.78 | |
  | 30 | flux-2-pro | 1244.75 | |
  | 31 | qwen-image-edit | 1240.72 | top open model |
  | 34 | flux-2-dev | 1225.85 | |
  | 44–46 | flux-1-kontext max / pro / dev | 1180.64 / 1176.31 / 1149.09 | |
  | 47 | gpt-image-1 | 1138.87 | |

- **Single-image edit, 21 Sep 2026** — [benchmarklist / Arena](https://benchmarklist.com/benchmarks/arena_ai_image_edit/) [search summary]

  | Rank | Model | Score |
  |---|---|---|
  | 1 | gpt-image-2.5-sunburst | 1526±6 |
  | 2 | grok-imagine-image-2.0 (low) | 1430±6 |
  | 3 | mai-image-2.6 | 1429±6 |
  | 4 | muse-image | 1402±5 |
  | 5 | seedream-5.0-pro | 1394±3 |

- **Multi-image edit, 6 Oct 2026** (44 models). This is the board closest to "fuse parent A + parent B" — [Arena multi-image edit leaderboard](https://arena.ai/leaderboard/image-edit/multi-image-edit) [search summary]

  | Rank | Model | Score |
  |---|---|---|
  | 1 | gpt-image-2.5-sunburst | 1527±6 |
  | 2 | gpt-image-2.5-flare | 1476±6 |
  | 3 | gpt-image-2 (medium) | 1454±4 |

- Nano Banana 2.1 entered the multi-image edit board at **#4 with 1431** (preliminary; 5,310 votes) — [Atlas Cloud, localized versions](https://www.atlascloud.ai/blog/tips/nano-banana-2.1-vs-gpt-image-2.5) [search summary; reseller]
- Arena has added category breakdowns to its Single- and Multi-Image Edit arenas — [Arena on X](https://x.com/arena/status/2082866489649152326) [search result title; post date not retrieved]
- Recent additions per the Arena changelog:
  - ideogram-4.0-quality and reve-2.0 (3 Jun 2026)
  - qwen-image-2.0-pro (25 Jun)
  - muse-image (9 Jul)
  - seedream-5.0-pro (11 Jul)
  - qwen-image-2.1 (22 Sep)
  - ideogram-4.5 to Image Edit (30 Sep)
  - gemini-nano-banana-2.1 to both arenas (2 Oct)
  - grok-imagine-image-2.0 (canvas) (6 Oct)

  — [Arena leaderboard changelog](https://arena.ai/company/leaderboard-changelog/) [fetched]. Minor conflict: Atlas says Nano Banana 2.1 was "welcomed to Arena on October 6".

**Artificial Analysis (AA), fetched 14 Oct 2026**

AA's Elo comes from "blind comparisons judged by our recruited human panel, together with public Image Arena votes cast before 1 January 2026".

- **AA-Image-Editing v2.0** (FLUX.2 [dev] is anchored at Elo 1000) — [AA editing leaderboard](https://artificialanalysis.ai/image/leaderboard/editing) [fetched]

  | # | Model | Creator | Elo | Released | $/1k images |
  |---|---|---|---|---|---|
  | 1 | GPT Image 2.5 Sunburst (max) | OpenAI | 1186 | Sep 2026 | 210.7 |
  | 2 | GPT Image 2.5 Flare (max) | OpenAI | 1167 | Sep 2026 | 210.7 |
  | 3 | MAI-Image-2.6 | Microsoft AI | 1143 | Aug 2026 | 38.9 |
  | 4 | Nano Banana 2.1 | Google | 1141 | Oct 2026 | 33.6 |
  | 5 | MAI-Image-2.6-Flash | Microsoft AI | 1130 | Sep 2026 | 19.5 |
  | 6 | GPT Image 2 (high) | OpenAI | 1129 | Apr 2026 | 211.0 |
  | 7 | Muse Image | Meta | 1123 | Jul 2026 | 10.0 |
  | 9 | Nano Banana 2 (Gemini 3.1 Flash) | Google | 1114 | Feb 2026 | 67.0 |
  | 11 | Grok Imagine Image 2.0 | SpaceXAI | 1113 | Aug 2026 | 60.0 |
  | 12 | Seedream 5.0 Pro | ByteDance | 1113 | Jul 2026 | 90.0 |
  | 13 | GPT Image 1.5 (high) | OpenAI | 1106 | Dec 2025 | 133.0 |
  | 14 | Nano Banana Pro (Gemini 3 Pro) | Google | 1105 | Nov 2025 | 134.0 |
  | 16 | HunyuanImage 3.5 (Preview) | Tencent | 1089 | Sep 2026 | 24.0 |
  | 18 | Qwen-Image-3.0-Pro | Alibaba | 1082 | Jul 2026 | 40.0 |

  Best open-weights editors: Qwen-Image-2.1 (1074), then HunyuanImage 3.0 Instruct (1068).

- **AA-Image-T2I v2.0** — [AA T2I leaderboard](https://artificialanalysis.ai/image/leaderboard/text-to-image) [fetched]

  | Rank | Model | Elo | $/1k images |
  |---|---|---|---|
  | 1 | GPT Image 2.5 Sunburst | 1199 | |
  | 2 | GPT Image 2.5 Flare | 1192 | |
  | 3 | GPT Image 2 (high) | 1172 | |
  | 4 | Nano Banana 2.1 | 1159 | |
  | 5 | Grok Imagine Image 2.0 | 1155 | |
  | 6 | MAI-Image-2.6 | 1152 | |
  | 7 | Nano Banana 2 | 1125 | |
  | 8 | Muse Image | 1115 | |
  | 9 | FLUX 3 Image (BFL, Oct 2026) | 1115 | 48 |
  | 12 | Nano Banana Pro | 1104 | |
  | 17 | Seedream 5.0 Pro | 1082 | |
  | 20 | Qwen-Image-2.1 | 1037 | no API |

- The sibling file reports Midjourney models at rank 115+ (Elo ≈848–879) on the same board. I did not re-verify this — [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image) [sibling]
- **AA rebuilt its editing arena into 17 category boards** (article dated **2 Sep 2026**, before GPT Image 2.5 and Nano Banana 2.1 existed) — [AlphaSignal](https://alphasignal.ai/news/artificial-analysis-rebuilds-its-image-editing-arena-across-17-specialized) [fetched; secondary]
  - The boards are 7 editing actions plus 10 use cases. The actions include "Identity-Preserving Edit" and "Scene and Style Edit"; the use cases include "Animation and Gaming".
  - MAI-Image-2.6-Preview "leads the overall leaderboard and tops 7 of 17 category boards", including Scene and Style Edit.
  - GPT Image 2 (high) was #2 overall and first on Object-Level Edit and on Composition and Framing.
  - **Seedream 5.0 Pro ranked first on Identity-Preserving Edit.**

**Academic multi-reference, identity and multi-turn benchmarks**
- **TRACE-Bench** (Wang, Ma, Yi, Ma; submitted 17 Aug 2026) — [arXiv 2608.16765](https://arxiv.org/html/2608.16765) [fetched]
  - About 1,600 cases with 1–8 reference "slots", scored on four operators: Anchor, Disentangle, Apply, Compose.
  - Results:

    | Rank | Model | Overall | Disentangle |
    |---|---|---|---|
    | 1 | Nano Banana 2 | 0.8205 | 0.7384 |
    | 2 | Nano Banana Pro | 0.8172 | 0.7148 |
    | 3 | GPT-Image-1.5 | 0.8118 | 0.6890 |
    | 4 | Nano Banana | 0.7981 | — |
    | 5 | Emu3.5 | 0.6561 | — |
    | 6 | Qwen-Image-Edit-2511 | 0.5858 | — |
    | 7 | FireRed Image Edit 1.1 | 0.5889 | — |
    | 8 | Qwen-Image-Edit-2509 | 0.5483 | — |
    | 9 | OmniGen2 | 0.5348 | — |

    The table as I fetched it ranks FireRed 7th despite a slightly higher overall score than Qwen-2511. I am reporting the order as given; it may be a summarisation artefact.

  - "The primary bottleneck lies in disentanglement and attribute binding rather than scene-level composition", with "even the best model scoring only 0.74 on attribute fidelity".
  - Anchoring degrades more with the number of entities *inside* the reference images than with the number of slots.
  - Composition failures are "most frequently localized to global-reference interference", meaning style or global references disturbing the composition.
  - GPT Image 2/2.5, Seedream and FLUX were not tested.
- **MultiBanana** (U. Tokyo and **Google DeepMind** co-authors; v2 26 Mar 2026; evaluates 2025-era models) — [arXiv 2511.22989](https://arxiv.org/html/2511.22989) [fetched]
  - Scored 0–10, with text alignment and reference consistency weighted ×3.
  - Two-reference category averages:

    | Model | Two-reference score |
    |---|---|
    | GPT-Image-1 | 6.585 |
    | Nano Banana | 4.891 |
    | DreamOmni2 | 4.069 |
    | Qwen-Image-Edit-2509 | 3.699 |
    | OmniGen2 | 3.442 |

  - "For cross-domain … tasks, every model shows lower scores." Cross-domain means mixing domains such as cartoon and photo.
  - Closed models keep instruction and reference adherence, but "increasing the number of subjects often degrades overall visual quality". Open models instead "frequently ignore multiple subjects".
- **EdiVal-Agent** (multi-turn editing; v1 Sep 2025, latest Mar 2026): 16 editors measured over 3 turns. Numbers are in Q2 — [arXiv 2509.13399](https://arxiv.org/html/2509.13399) [fetched]
- **Persistent Identity Preservation benchmark** (Ren, Zhang, Xia; 3 Sep 2026, revised 10 Sep): measures GPT-Image-2 and NB2 over four iterative edits. Numbers are in Q2. Human faces only (ArcFace) — [arXiv 2609.04151](https://arxiv.org/html/2609.04151) [fetched]
- Other 2026 multi-subject benchmarks (CogCanvas, Jun 2026, 100 celebrity identities; MultiHuman-Testbench) also measure human identity — [CogCanvas arXiv 2606.15867](https://arxiv.org/abs/2606.15867); [MultiHuman-Testbench arXiv 2506.20879](https://arxiv.org/html/2506.20879) [search summary]
- GenAI-Bench (compositional text-to-image, VQAScore) results date from **2024**, with DALL-E 3 and Midjourney v6 on top. They do not cover 2026 models, so they are not useful for model choice now — [GenAI-Bench, arXiv 2406.13743](https://arxiv.org/pdf/2406.13743) [search summary]

**Per-model capabilities relevant to multi-reference and sticker work**

| Model (date) | Reference inputs | Native alpha | Notes | Source |
|---|---|---|---|---|
| GPT Image 2.5 Sunburst / Flare (8 Sep 2026) | Up to 16 refs plus optional mask | Yes (png/webp) | Supports Batch API; token-priced | [Atlas Cloud](https://www.atlascloud.ai/blog/tips/nano-banana-2.1-vs-gpt-image-2.5) [fetched, reseller]; [Runware guide](https://runware.ai/docs/models/openai-gpt-image-2-5-flare/guides/transparent-backgrounds) [fetched]; [OpenAI Batch guide](https://developers.openai.com/api/docs/guides/batch) [fetched] |
| Nano Banana 2.1 (Oct 2026) | Up to 14 refs: ≤4 characters, ≤10 objects, ≤3 style refs | No | $0.0336 per 1K image; Batch 50% off | [Gemini docs](https://ai.google.dev/gemini-api/docs/image-generation) [sibling]; [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) [sibling] |
| Nano Banana Pro (GA May 2026) | ≤5 characters, ≤6 objects, 14 total; no style-ref slot listed | No | $0.134 per image at 1K/2K | [Gemini docs](https://ai.google.dev/gemini-api/docs/image-generation) [sibling] |
| FLUX 3 Image (BFL, Oct 2026) | "Combine up to ten references" | Not stated | $0.048 at 1K | [BFL docs](https://docs.bfl.ai/flux_3/flux3_image_overview) [fetched]; [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image) [fetched] |
| Seedream 5.0 Pro (8 Jul 2026) | Up to 10 refs; "multi-image fusion" | Not stated | $90/1k (AA) | [ByteDance Seed](https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro) [fetched]; [Artlist help](https://help.artlist.io/hc/en-us/articles/37481273737757-Seedream-5-0-Pro) [search summary] |
| Qwen-Image-Edit-2511 (open weights) | Multi-image input (`"image": [image1, image2]`) | No | "Character consistency has been significantly improved"; bundles popular community LoRAs | [HF model card](https://huggingface.co/qwen/qwen-image-edit-2511) [search summary] |
| Midjourney V8.x | `--oref` (Omni Reference) plus `--sref` and moodboards | — | Omni Reference renders on V7 even when V8 is selected | [UD Hong Kong, Aug 2026](https://www.ud.hk/en/blogs/insight/article/midjourney-consistent-look-2026-08-07) [search summary; MJ docs 403] |
| Ideogram Character (API) | One reference image; "Realistic"/"Fiction" toggle | — | Ideogram 4.5 joined the Arena edit board 30 Sep 2026 | [The Decoder](https://the-decoder.com/ideogram-now-lets-developers-create-characters-with-a-consistent-look-directly-through-its-api/) [search summary]; [Arena changelog](https://arena.ai/company/leaderboard-changelog/) [fetched] |
| Recraft V4.1 | Reusable custom styles from reference images; exact palette via `rgb_colors` | — | True SVG vector output; about $0.035 raster / $0.08 vector | [Recraft blog](https://www.recraft.ai/blog/best-ai-image-generation-api) [fetched, vendor]; [Recraft API docs](https://www.recraft.ai/docs/api-reference/getting-started) [fetched] |

### Inferences
- **Fusion win rates.** On Arena's multi-image edit board, Sunburst leads Nano Banana 2.1 by about 96 points and Flare by about 45. Under standard Elo maths that means roughly a 63% and 56% pairwise preference rate. That is a real but not overwhelming edge for two-parent fusion, and the Nano Banana 2.1 figure is still preliminary.
- **Limits of arena votes.** Arena and AA votes measure general preference on user prompts, mostly photos and scenes. They do not measure "stays the same creature" or "keeps a 4 px outline". Treat them as a prior for shortlisting, not as a verdict for sticker creatures.
- **Fusion prompts need explicit roles.** TRACE-Bench finds attribute binding is the weakest skill even for the best models, with a top Disentangle score of only 0.74. A fusion prompt therefore has to state, per parent, what to take: for example body plan and silhouette from parent A, element colours and motifs from parent B, line and palette from the golden style ref. Its "global-reference interference" finding also suggests a style ref can disturb the composition. Test fusions both with and without a separate style image.
- **Open-weights models lag.** Qwen-Image-Edit/2.1 and FLUX.2 [dev] are one to two tiers behind on multi-reference work (AA: FLUX.2 [dev] at 1000 vs Sunburst at 1186; TRACE-Bench: Qwen-Image-Edit-2511 at 0.586 vs NB2 at 0.821). Their main value here is LoRA style-locking or free local runs, not fusion quality.
- **Seedream 5.0 Pro deserves a test.** It was AA's #1 on "Identity-Preserving Edit" as of 2 Sep 2026, so include it in a fusion and baby-chain bake-off even though it ranks lower overall.

### Gaps
- Arena category leaders (text-to-image "Illustration & anime"; edit categories) could not be read because the pages return 403.
- AA category boards after the GPT Image 2.5 and Nano Banana 2.1 launches were not visible; the "Animation and Gaming" leader is unknown.
- No benchmark measures identity on stylised or cartoon non-human characters, or fusion of two non-human characters. All identity benchmarks found use human faces or photo subjects.
- GPT Image 2/2.5, Seedream 5.0, FLUX 3 and MAI-Image-2.6 have not appeared in any academic multi-reference benchmark yet.
- I did not check third-party API availability of MAI-Image-2.6, Muse Image and Grok Imagine 2.0.

---

## 2. Practitioner reports: drift across edit chains, colour/palette and outline drift, and which models handle "combine these two creatures" best

### Takeaway
**Drift compounds with every edit hop.** The only four-step identity measurement I found (human faces) shows GPT-Image-2 losing about 25% ArcFace similarity and Nano Banana 2 about 23% over four successive edits. Multi-turn benchmarks show the same compounding. They blame "exposure bias": editors are trained on clean inputs, not on their own outputs.

**Colour.** Older OpenAI models added a warm/yellow cast that stacked with each edit, and GPT-Image-1.5 largely fixed it.

**What drifts first.** Practitioners agree on proportions, small facial details (eyes) and line thickness. Forbidden colours also sneak back in.

**Fusion.** There is no rigorous creature-fusion test.
- Arena's multi-image board favours GPT Image 2.5.
- Reseller hands-on tests favour Nano Banana for "natural fusion" and briefs, and GPT for strict detail fidelity.
- Every source agrees that each reference image needs an explicit role in the prompt.

### Cited Findings

**Edit-chain drift (quantified)**
- **Four successive edits** (ArcFace identity similarity, faces) — [arXiv 2609.04151](https://arxiv.org/html/2609.04151) [fetched]

  | Model | Step 1 | After 4 edits |
  |---|---|---|
  | GPT-Image-2 | ≈0.71 | ≈0.53 |
  | NB2 | ≈0.65 | ≈0.50 |
  | Authors' "Phota" persistent-identity layer + GPT-2 | ≈0.79 | ≈0.70 |
  | Phota layer + NB2 | ≈0.77 | ≈0.67 |

  - The paper says "identity degradation becomes more pronounced under iterative edits, small subject scales, severe image degradation, and multi-subject composition."
  - Caveats: faces only, and the paper evaluates its own method.
- **EdiVal-Agent, three turns.** Scores are instruction following / content consistency (unchanged objects preserved) / overall, at T1 → T3 — [arXiv 2509.13399](https://arxiv.org/html/2509.13399) [fetched]

  | Model | T1 | T3 |
  |---|---|---|
  | Seedream 4.0 | 75.93 / 92.51 / 83.81 | 41.59 / 85.86 / 59.76 |
  | GPT-Image-1.5 | 75.19 / 94.49 / 84.29 | 40.08 / 88.49 / 59.55 |
  | Nano Banana 2 | 73.89 / 93.54 / 83.14 | 38.61 / 88.61 / 58.49 |
  | FLUX.2-max | 75.55 / 92.91 / 83.78 | 39.36 / 85.78 / 58.10 |
  | FLUX.1-Kontext-max | 69.49 / 93.93 / 80.79 | 31.83 / 88.40 / 53.04 |
  | Nano Banana | 70.70 / 93.91 / 81.48 | 35.35 / 89.48 / 56.24 |
  | GPT-Image-1 | 73.12 / 81.00 / 76.96 | 38.35 / 75.50 / 53.81 |
  | Qwen-Image-Edit | 72.90 / 84.22 / 78.36 | 22.55 / 77.98 / 41.93 |
  | FLUX.1-Kontext-dev | 59.97 / 95.32 / 75.61 | 16.61 / 90.22 / 38.71 |

  - Qwen-Image-Edit shows "pronounced error accumulation". The paper attributes this to exposure bias: "many single-turn editors are trained to operate on real images and ground-truth inputs rather than on their own previous outputs."
  - GPT-Image-1 has "the largest Δ, indicating a substantial stylistic shift" in visual quality across turns. GPT-Image-1.5 "reduces Δ from 2.18 to 0.15".
  - FLUX.1-Kontext-dev keeps the most content but often fails to apply the edit at all.
- **ChatGPT-editor yellowing (GPT-Image-1 era):** "by the third or fourth edit, the image can look like a dusty desert" — [unyellowgpt blog](https://unyellowgpt.com/blog/fix-yellow-tint-chatgpt-sora-unyellowgpt) [search summary; the site sells a fix tool]
- **OpenAI's own anti-drift guidance** (cookbook dated 21 Apr 2026, covers gpt-image-2) — [OpenAI cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) [fetched]
  - Edit with "change only X" plus "keep everything else the same".
  - "Repeat the preserve list on each iteration to reduce drift."
  - Anchor to the first generation with "Same character… Character appearance must remain unchanged" and "Do not redesign the character".

**Sprite and character-set reports**
- **OpenAI developer forum, 26–27 Apr 2026, gpt-image-2 sprite sheets** — [OpenAI community thread](https://community.openai.com/t/developing-sprite-sheets-with-gpt-image-2/1379831) [fetched]
  - "The model is optimized for visual quality, but it doesn't fully understand body positioning with consistent spatial awareness."
  - Frames show "a wider range of variations" that need reconciling, and left/right limbs get confused.
  - "Working frame by frame tends to produce better results."
  - "Retrying the same prompt 2–3 times often fixes the issue."
  - 3D-mannequin pose references and numbered frames help.
- **Hoyle, Nano Banana Pro, March 2026** — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/) [sibling]
  - Good at "consistent cartoon style across a sheet" and identity across poses "(mostly)".
  - Struggles with "exact proportions across separate generation calls".
  - A forbidden colour ("green occasionally sneaked in") came back.
  - "Style consistency drops with complexity."
- **Little Might, Jun 2026, Nano Banana 2 at about $0.07/image** — [Little Might](https://www.littlemight.com/how-to-stop-your-ai-images-from-drifting-across-a-series/) [fetched]
  - Use two references: a style anchor plus "a clean, plain-background turnaround of the character by himself: front, three-quarter, side".
  - Keep "one fixed wrapper and dropped a different scene into it".
  - Pin features in text rather than writing "the same robot".
  - Normalise backgrounds with ImageMagick.
  - QA the first 5 images against a checklist before running the batch.
- **Sticker-set advice** (LINE sticker sets of up to 40 stickers per character) — [stampo.jp](https://stampo.jp/en/blog/ai-line-sticker-prompts) [search summary; vendor blog]
  - Drift "usually starts with the eyes, hair, and line thickness". Lock them with "same eye shape, same hair silhouette, same line weight".
  - Use "consistent line weight" or "monoline" plus a stated weight.
  - Write the fixed description once and reuse it word for word.
- **GPT Image 2 game-asset guides** claim "80–90% consistency on first try", with drift such as eye-colour shifts. These are SEO pages with no method — [SeaGames guide](https://www.seagames.com/blog/gpt-image-2-game-character-design-seagames); [Converge guide](https://combos.converge.ai/page/en-US/blog/gpt-image-2-game-development) [search summary]

**Combining two references (closest available evidence to creature fusion)**
- **APIYI, 15 Jun 2026, Nano Banana Pro vs gpt-image-2** — [APIYI](https://help.apiyi.com/en/nano-banana-vs-gpt-image-2-multi-reference-editing-en.html) [fetched; reseller]
  - Setup: three references (base, object to insert, colour/atmosphere).
  - Without explicit roles, "the model can't distinguish between the subject and the color reference", which produces "color overshadowing the subject".
  - The fix is role statements such as "Use the first image as overall composition" and "Adopt color palette of the third image".
  - gpt-image-2's high-fidelity mode "strictly preserves object details"; Nano Banana "emphasizes natural fusion".
- **Atlas Cloud, 9 Oct 2026, Nano Banana 2.1 vs GPT Image 2.5 Flare/Sunburst** — [Atlas Cloud](https://www.atlascloud.ai/blog/tips/nano-banana-2.1-vs-gpt-image-2.5) [fetched; reseller]
  - Four single-attempt briefs. Nano Banana 2.1 won or tied 3 of 4. Sunburst "invented signage" the prompt never asked for, and only Nano Banana 2.1 honoured a specified portrait layout.
  - It recommends Nano Banana 2.1 for "layout specs, reference fusion, or high-volume" work, and GPT Image 2.5 for "surface polish" and mask-based edits.
- The benchmark evidence (TRACE-Bench and MultiBanana in Q1) says binding is the bottleneck and that cross-domain references hurt every model.
- Consumer "AI Fusion: Merge Character" apps exist on iOS and Android, but publish no quality data — [App Store example](https://apps.apple.com/us/app/id6745208835) [search result]

### Inferences
- **Do not chain the 32 baby stages blindly.** Making stage n only from stage n−1 is the worst case: three hops to stage 4 means about three hops of compounding drift. Face data suggests roughly a fifth to a quarter of identity similarity can be gone by step 4. Instead, generate each stage from:
  1. the approved **stage-1 golden** (identity anchor),
  2. the approved previous stage (size and growth cue),
  3. one family style golden,

  with the preserve list repeated verbatim: palette hexes, outline weight, eye shape and signature markings. Only the "growth delta" text should change.
- **Pick the stronger chain model.** On EdiVal, the newest closed models (GPT-Image-1.5, Nano Banana 2, Seedream 4.0, FLUX.2-max) hold about 86–89 content consistency at turn 3. Qwen-Image-Edit falls to about 78. Chains belong on GPT Image 2.5, Nano Banana 2.1 or Seedream 5.0 Pro, not on open editors.
- **Colour.** Give hex palettes and neutral, flat lighting in every prompt to avoid the old warm drift, then palette-snap afterwards (Q3, Q5). Verify that GPT Image 2.5 inherited 1.5's fix for cumulative tint; no 2.5-specific measurement exists.
- **Outline weight.** It is a known early-drift feature, and no model guarantees it. For thick-outline stickers it is more reliable to enforce the outline in post-processing (re-stroke from the alpha mask) than to trust the prompt. See Q3.
- **Fusion model choice.** Run a bake-off on the 3–4 hardest pairs, for example very different body plans, with GPT Image 2.5 Flare vs Nano Banana 2.1, and optionally Seedream 5.0 Pro. Arena favours GPT 2.5, reseller anecdotes favour Nano Banana 2.1 for fusion, and no creature-specific evidence exists.

### Gaps
- No quantitative measurement of outline-weight variance or palette drift across a generated set exists for any model.
- No edit-chain identity measurement exists for cartoon or creature subjects; all quantified data is faces (ArcFace) or photo objects.
- No controlled "fuse creature A + creature B" evaluation was found, for Pokémon-style fusion or otherwise.
- Google's claimed "multi-turn consistency" improvement in Nano Banana 2.1 (see sibling) has no independent measurement yet.

---

## 3. Workflow patterns (golden refs, sheets vs one-per-request, style LoRA vs multi-image input) and their cost/time trade-offs

### Takeaway
**The consensus 2026 recipe for a closed-model pipeline:**
1. Approve a small golden set first: one hero per family plus a style or turnaround sheet.
2. Generate every later asset as an image-conditioned call that re-sends the golden references inside a fixed prompt wrapper, **one creature per request**.
3. QA a small pilot before scaling.

**Sheets.** Putting a whole sheet in one image helps style unity for exploration, but you lose control of poses and proportions, and quality drops as sheets get more complex.

**LoRAs.** A trained style LoRA is still the strongest style lock, and training is cheap: about $6.40 per 1,000 steps on fal for FLUX.2 [dev], using 9–50 images. But LoRAs exist only for open models, which rank well below the closed leaders at multi-reference editing. Studio platforms such as Scenario and Layer package the same LoRA idea.

**Cost.** For about 117 assets, generation costs tens of dollars under any option. The real cost is human curation and QA time.

### Cited Findings

**Golden references and anchors**
- Dual-anchor pattern: a style reference plus a character turnaround sheet, a fixed wrapper, and pilot QA on 5 images — [Little Might](https://www.littlemight.com/how-to-stop-your-ai-images-from-drifting-across-a-series/) [fetched]
- OpenAI recommends anchoring on the first generation and referencing each input "by index and description" and "describe how they interact". For style transfer: "Use the same style from the input image and generate…" — [OpenAI cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) [fetched]
- Gemini has explicit style-reference slots on Nano Banana 2.1 and 3.1 Flash (≤3) but none listed for Pro — [Gemini docs](https://ai.google.dev/gemini-api/docs/image-generation) [sibling]
- **Midjourney** — [UD Hong Kong](https://www.ud.hk/en/blogs/insight/article/midjourney-consistent-look-2026-08-07) [search summary; secondary, MJ docs 403]
  - V8.1 (30 Apr 2026) "makes style references and moodboards behave consistently".
  - `--oref` with `--ow` 0–1000: 400–600 for a strong lock, but "values above 400 tend to be unpredictable".
  - A style ref carries "palette, tonal range, grain, lighting mood"; an omni ref carries the subject. "Combining both is what produces consistent sequences."
  - Supplying an omni reference runs the prompt on V7.
- **Recraft** — [Recraft blog](https://www.recraft.ai/blog/best-ai-image-generation-api); [Recraft API docs](https://www.recraft.ai/docs/api-reference/getting-started) [fetched; vendor]
  - "You can create reusable custom styles, pass an exact color palette through the `rgb_colors` parameter."
  - "Genuine vector output with clean geometry you can edit node by node."
  - Prices: about $0.035 raster, $0.08 vector, $0.007 for V4.1 Flash.
  - A claim that Recraft's August 2026 "V4 Styles" release was built to stop later images in a batch drifting from the first appears only in a search summary. I could not find it on Recraft's blog, so it is **unverified**.
- **Seedream 5.0 Pro** (8 Jul 2026) supports multi-image fusion and multi-person compositing "with consistent lighting and cohesive texture" — [ByteDance Seed](https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro) [fetched]. The Seedream 4.0 paper says it "allows for multi-image reference, and can generate multiple output images" — [arXiv 2509.20427](https://arxiv.org/abs/2509.20427) [fetched abstract; output count not stated]

**Sheet in one image vs one asset per request**
- Frame-by-frame beat whole sheets for gpt-image-2 — [OpenAI community thread](https://community.openai.com/t/developing-sprite-sheets-with-gpt-image-2/1379831) [fetched]
- Hoyle (Nano Banana Pro) found sheets work only with one character per sheet, 3–6 items per row and at most 2–3 rows — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/) [sibling]
- Benchmarks agree. More subjects per image degrades closed-model visual quality ([MultiBanana](https://arxiv.org/html/2511.22989) [fetched]). Entity count inside references hurts anchoring ([TRACE-Bench](https://arxiv.org/html/2608.16765) [fetched]).
- Marketing claims say GPT Image 2.5 can now produce a "complete, coordinated sprite sheet in a single pass" from one reference — [Indie Hackers](https://www.indiehackers.com/post/gpt-image-2-5-a-full-sprite-sheet-from-one-reference-110562d19f) [search summary; page 403; promotional]

**Trained LoRA / fine-tuning**
- **fal FLUX.2 [dev] Trainer V2** — [fal](https://fal.ai/models/fal-ai/flux-2-trainer-v2) [fetched]
  - "$0.0064 per step" ("$6.40 for 1000 steps").
  - For style, "9-50 images typically sufficient". Images must be at least 1024 px with no compression artefacts.
  - The output LoRA works on FLUX.2 [dev] LoRA endpoints.
  - Conflict: a search summary quoted $0.0255/step and "15–30 minutes … about $12". I treat the page price as authoritative and training time as unverified.
- Typical FLUX style-LoRA settings: 12–25 images, 1000–2000 steps, LR 1e-4, rank 16 — [fal blog](https://blog.fal.ai/training-flux-style-lora-on-fal-ai) [sibling]
- **Scenario + Mighty Bear Games:** custom models trained on the studio's existing assets for pose and seasonal variants. Claims "+80%" workflow efficiency and "−90%" tool complexity. No training-set size or consistency metric disclosed — [Scenario case study](https://www.scenario.com/case-studies/mighty-bear-games) [fetched; vendor marketing]
- **Open models trail closed ones on references:**
  - Qwen-Image-Edit-2511 scores 0.586 vs Nano Banana 2 at 0.821 on TRACE-Bench ([arXiv 2608.16765](https://arxiv.org/html/2608.16765) [fetched]).
  - FLUX.2 [dev] sits at 1000 vs Sunburst at 1186 on AA editing ([AA](https://artificialanalysis.ai/image/leaderboard/editing) [fetched]).
  - Qwen-Image-Edit shows strong error accumulation over turns ([EdiVal](https://arxiv.org/html/2509.13399) [fetched]).

**Cost and time datapoints**
- **Price per 1,000 images** (AA, Oct 2026) — [AA editing](https://artificialanalysis.ai/image/leaderboard/editing); [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image) [fetched]

  | Model | $/1k |
  |---|---|
  | GPT Image 2.5 (max quality) | 210.7 |
  | GPT Image 2 (high) | 211 |
  | Nano Banana Pro | 134 |
  | Seedream 5.0 Pro | 90 |
  | Nano Banana 2 | 67 |
  | FLUX 3 | 48 |
  | Qwen-Image-3.0-Pro | 40 |
  | MAI-Image-2.6 | 38.9 |
  | Nano Banana 2.1 | 33.6 |
  | Muse Image | 10 |

- **GPT Image 2.5 token prices** (same for both variants): text input $5/1M; image input $8/1M ($2 cached); image output $30/1M Standard or **$15/1M Batch** — [OpenAI Sunburst model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md) [fetched]. Reported per-image cost runs from about $0.006 at low quality to $0.211 at "max", 1024² — [CometAPI](https://www.cometapi.com/what-is-gpt-image-2-5/) [search summary; reseller]
- **Nano Banana 2.1:** $0.0336 per 1K image Standard, $0.0168 Batch — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) [sibling]
- **Time:** Hoyle needed about half a day per full sprite set, with 1–2 regenerations per sheet expected ([roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/) [sibling]). Forum users needed 2–3 retries per problem frame ([OpenAI community thread](https://community.openai.com/t/developing-sprite-sheets-with-gpt-image-2/1379831) [fetched]).

### Inferences
- **Suggested pipeline for 2048 Siege's ~117 images** (my synthesis of the evidence above):
  1. **Style bible and goldens first.**
     - Approve 8 base creatures (stage 1) plus one "style sheet" image per family showing the palette swatches and the outline sample.
     - Approve one golden soft-vinyl portrait and one golden chibi enemy, because those classes use different rendering.
     - Freeze a fixed prompt wrapper with the style rules, hex palette, outline weight, camera, framing and "no ground shadow".
  2. **Baby stages 2–4:** run each stage as an edit with three references (stage-1 golden, previous approved stage, family style sheet) and repeat the preserve list. See Q2.
  3. **Fusions:** pass the two parent goldens as character refs. In Nano Banana 2.1, add a style ref; in GPT 2.5, an extra reference image. Use explicit role text, mirroring the game rule "first element's shape in the second element's colour". Make 3–4 candidates per pair.
  4. **Vinyl portraits:** condition on the approved sprite (identity) plus the golden vinyl portrait (rendering style). This is a cross-domain conversion, which MultiBanana shows is harder for every model, so budget more candidates.
  5. **Normalise in code after generation:**
     - key or alpha cleanup (Q4)
     - bounding-box or head-size normalisation
     - palette snap of flat-fill regions only
     - outline re-stroke: dilate the alpha mask by N px and fill with the outline colour, which makes outline weight identical across all 117 images
     - sticker border
  6. **Automated QA plus human approval** (Q5). Use sheets only for early exploration and thumbnails, never for final assets.
- **Generation cost is not the deciding factor.** Assume about 470 generations (117 assets × about 4 candidates, retries included):

  | Model | Standard | Batch |
  |---|---|---|
  | GPT Image 2.5 at max quality | ≈ $99 | ≈ half (plus reference-image input tokens) |
  | Nano Banana 2.1 at 1K | ≈ $16 | ≈ $8 |
  | Nano Banana Pro | ≈ $63 | |
  | Seedream 5.0 Pro | ≈ $42 | |
  | FLUX 3 at 1K | ≈ $23 | |
  | FLUX.2 [dev] style-LoRA training run (1–2k steps on fal) | ≈ $6–13 per run | |

  Human review time dominates: Hoyle's half-day per set, multiplied across about 8 families and 4 asset classes.
- **When a LoRA is worth it.** Train one only if (a) the golden-ref approach still gives visible style drift after post-normalisation, or (b) the team wants local, quota-free generation. It requires moving generation to an open model (FLUX.2 [dev] or the Qwen-Image family) that is clearly weaker at fusions. One option, which I have not seen tested, is a hybrid: closed model for fusions and chains, then a low-strength img2img "harmonisation" pass through an open-model style LoRA. Its identity cost is unknown.
- **Do not mix models within an asset class.** Using GPT 2.5 for some fusions and Nano Banana 2.1 for others adds a style seam. Pick one per class after the bake-off, and let deterministic post-processing (outline re-stroke, palette snap, scale) carry the cross-class consistency.

### Gaps
- No head-to-head comparison of style-LoRA vs reference-image consistency on the same game-asset set was found.
- Seed and determinism controls: none documented for Gemini (sibling). For OpenAI and BFL I did not verify in this pass.
- Training time for fal FLUX.2 LoRAs is unverified (conflicting summaries). Inference price for FLUX.2 [dev] with a LoRA was not collected.
- No source quantifies the human curation time per accepted asset for AI-generated creature sets.
- I did not verify that Recraft custom styles cope with creature identity (as opposed to style only).

---

## 4. Native transparency vs chroma key vs matting models (BiRefNet, rembg, BRIA RMBG 2.0): which gives the cleanest edges for outlined sticker art?

### Takeaway
**Native alpha is now real on OpenAI.** GPT Image 2.5 supports `background: "transparent"`; GPT Image 2 had it removed at launch and then restored as a preview on 21 Aug 2026. Flat illustration "with hard color boundaries" is the case it handles best. Its weak spots are semi-transparent material and glows, which come back as near-opaque pixels rather than true transparency.

**Gemini, FLUX and Seedream give no alpha.** Nano Banana Pro can even paint a fake checkerboard.

**Chroma key.** For thick-outlined flat stickers, the best-documented route is a pure key colour kept outside the palette, plus a light "die-cut" border as a buffer, HSV keying and despill. The outline itself gives the keyer a hard boundary.

**Matting models.**
- BiRefNet is the best general-purpose model and much better than rembg on fine edges.
- Both BiRefNet and BRIA RMBG-2.0 are trained mainly on photos and are reported to struggle on 2D anime/cartoon characters. BRIA has also retrained the same architecture under a restrictive licence.
- ToonOut, a BiRefNet fine-tune on anime, cuts pixel errors from 4.7% to 0.5%.

**For glowing halos**, none of these beats rendering on black for additive blending, or white/black triangulation matting.

### Cited Findings

**Native alpha (OpenAI)**
- **GPT Image 2.5 Flare transparency guide** — [Runware guide](https://runware.ai/docs/models/openai-gpt-image-2-5-flare/guides/transparent-backgrounds) [fetched; aggregator docs]
  - Set background to "transparent" with PNG or WEBP output, and "send `outputFormat` with every transparent request".
  - What works: "Floating with no background, no surface, no shadow, clean crisp edges all the way around"; "**Flat illustration styles with hard color boundaries produce the cleanest results.**"
  - What fails: scene words ("a marble worktop or soft window light gives the model a room to render") and baked-in shadows ("Generate without the shadow…").
  - Glass and semi-transparent material come back as "a picture of transparency rather than as transparency", with opacity 0.83–0.99.
  - Fallback: generate opaque on a contrasting background, then run background removal. Always "Check the result on black."
- **GPT Image 2 timeline**
  - A reseller test on **8 May 2026** found gpt-image-2's `background` accepted only `auto`/`opaque`. Forcing it produced a painted "checkerboard pattern", white or grey checkerboard "sticker" looks. Nano Banana Pro produced images where "the checkerboard pattern is actually rendered as solid pixels" — [APIYI test](https://help.apiyi.com/en/gpt-image-2-transparent-background-not-supported-en.html) [fetched; reseller]
  - On **21 Aug 2026** OpenAI put transparent output for GPT-Image-2 in preview. OpenAI says "baking the alpha channel in during generation produces better results than conventional background removal, especially on tricky areas like transparent glass or thin fibers" — [The Decoder](https://the-decoder.com/openais-gpt-image-2-can-now-generate-images-without-a-background/) [fetched]
- **OpenAI cookbook on transparent workflows** — [OpenAI cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) [fetched]
  - Request "an isolated subject on a fully transparent background".
  - For edits, "explicitly preserve the transparent background in each prompt so later steps do not introduce a new background".
  - Ask for "clean alpha edges, and no solid backdrop" and "clean, vector-like shapes, a strong silhouette".
- OpenAI's official 2.5 model pages, as fetched, did not mention transparency. The 2.5 transparency claim therefore rests on aggregator docs (Runware, APIYI) and the 2.x preview history — [OpenAI Flare model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md) [fetched]

**No alpha (Gemini) and chroma key**
- "Nano Banana doesn't output alpha channels." Google's image docs never mention transparent output — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/); [Gemini docs](https://ai.google.dev/gemini-api/docs/image-generation) [sibling]
- **Hoyle's chroma-key results** — [roboticape.com](https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/) [sibling]
  - Dark or magenta keys with brightness thresholding were "catastrophic" with black outlines, because anti-aliasing "baked background color into edge pixels".
  - What worked: pure #00FF00 demanded emphatically, a 2–3 px **white outline** buffer, and **HSV** keying (hue ±22°, saturation ≥0.3, value ≥0.3).
- The project's `tools/chroma.py` already estimates the key colour from a 6 px border median, because outputs are "rarely exactly #00FF00 / #FF00FF". It ramps alpha on RGB distance (70–150) and suppresses spill — [tools/chroma.py](file:///Users/lap14657/merge-ball-td-siege/tools/chroma.py) [sibling]
- **Triangulation (difference) matting:** render on white, make a constrained edit to black, then compute alpha = 1 − (white − black)/255. It recovers true semi-transparency at the cost of 2× inference and a risk that the two renders do not line up — [Replicate "nano-banana-2-transparent" readme](https://replicate.com/jide/nano-banana-2-transparent/readme) [sibling]. APIYI also lists it among four workarounds — [APIYI](https://help.apiyi.com/en/gpt-image-2-transparent-background-not-supported-en.html) [fetched]

**Matting models**
- **BiRefNet vs rembg** (15 Apr 2026; test set was **12 product photos**, no illustrations) — [ice-ice-bear blog](https://ice-ice-bear.github.io/posts/2026-04-15-birefnet/) [fetched]
  - BiRefNet: "Hair and fur don't get averaged into a gray halo." rembg "loses ~40% of fine strands".
  - rembg "downsamples internally and upsamples, which is where edge mush comes from".
  - BiRefNet runs natively up to 2048² and takes under 1 s per 1024² image on an RTX A5000; several seconds on CPU.
  - rembg is better suited to "batch CPU work and low-stakes removal".
- **BRIA RMBG-2.0**
  - BRIA (19 Nov 2024): "The architecture used for the model is the same [as BiRefNet]… We trained the model from scratch… on our own high quality curated training set."
  - A user in the same thread: "one thing it sort of struggles with sometimes is **mainly 2D anime characters**". The problems were characters filling much of the frame, **solid colour backgrounds**, and telling hair from background.
  - Licence is "bria-rmbg-2.0" (restrictive), vs MIT for BiRefNet.

  — [HF RMBG-2.0 discussion #9](https://huggingface.co/briaai/RMBG-2.0/discussions/9) [fetched]. BRIA says its model "shows higher success rate over BirefNet model on our benchmark" — [HF discussion #17](https://huggingface.co/briaai/RMBG-2.0/discussions/17) [fetched; vendor claim, Dec 2024–Jan 2025, older evidence]
- **ToonOut** (Muratori and Seytre, 8 Sep 2025; older evidence) — [arXiv 2509.06839](https://arxiv.org/abs/2509.06839); [GitHub MatteoKartoon/BiRefNet](https://github.com/MatteoKartoon/BiRefNet) [fetched]
  - State-of-the-art background removers underperform on anime, where "complex features like hair and transparency present unique challenges".
  - Fine-tuning BiRefNet on 1,228 annotated anime character and object images raised pixel accuracy **from 95.3% to 99.5%**.
  - Code, weights and dataset are open-sourced.
- APIYI's comparison rates BiRefNet precision on complex edges "very high" and rembg "med" at about 0.5 s latency — [APIYI](https://help.apiyi.com/en/gpt-image-2-transparent-background-not-supported-en.html) [fetched; reseller]

**Halo and glow assets**
- Effects drawn on solid black can be composited additively: "the black background actually works like a transparent background" — [gamedev.net thread](https://gamedev.net/forums/topic/265455-particle-explosions/) [sibling]

### Inferences
- **Ranking for flat, thick-outlined sticker creatures** (no controlled test exists; this is reasoned from the evidence above):
  1. **Native alpha** from GPT Image 2.5, if GPT is the chosen model for that asset class. Flat hard-edged art is its best case, and it avoids keying entirely. It still needs a "check on black/magenta" QA pass and an alpha-threshold cleanup of stray near-transparent pixels.
  2. **Chroma key** for Nano Banana, Seedream or FLUX outputs. Use a key hue absent from the creature's palette: green for most, magenta for green families. Add a light die-cut sticker border as a buffer, then HSV key, despill, and finally the outline re-stroke from Q3.
     - With thick dark outlines, the anti-aliased fringe sits between outline and key, so despill toward the outline colour cleans it.
     - Enclosed gaps, such as between a tail and the body, key out naturally. Salient-object matting models can leave enclosed background islands.
  3. **BiRefNet, preferably the ToonOut fine-tune**, as a fallback for outputs where the key colour bled. It can also double as a QA cross-check: compare its mask with the chroma mask and flag large disagreements. Baseline BiRefNet's roughly 4.7% pixel error on anime would show at sticker zoom. Avoid rembg for final assets.
  4. **Halos, auras and glow FX:** do not key them. Render on pure black and use additive blending, or use white/black triangulation. Native alpha and keyers both handle semi-transparency poorly (GPT returns 0.83–0.99 opacity; chroma kills glows).
- **Watch the RMBG-2.0 licence.** It is "bria-rmbg-2.0", not MIT, so check it before using it in a commercial game build pipeline. BiRefNet and ToonOut are the open-licence route.

### Gaps
- No controlled comparison of native alpha vs chroma key vs matting on outlined sticker or cartoon art exists. The edge-quality evidence is photos (BiRefNet vs rembg) or anime (ToonOut).
- I did not verify on an official OpenAI page that GPT Image 2.5 transparency works on the **edits** endpoint with reference images and inside **Batch**. Aggregator docs imply it does.
- No newer anime/cartoon-specific matting benchmark covering 2026 models (BiRefNet updates, BEN2, etc.) was found.
- Whether the ToonOut weights' licence permits commercial use was not checked; only the paper's CC BY 4.0 licence was visible.

---

## 5. Batch-processing features, rate limits and QA automation (automatic scoring, CLIP/DINO similarity for identity drift)

### Takeaway
**Batch APIs.**
- **OpenAI** and **Google** both offer a 24-hour Batch API at 50% off that now covers image generation. OpenAI's explicitly includes `/v1/images/edits` with GPT Image 2.5, and its official rate limits are 20 images per minute at the entry tier.
- **BFL** has no batch API or discount: 24 concurrent requests, and result URLs expire after 10 minutes.
- **fal** offers an unlimited-length queue with webhooks and automatic retries, but no batch discount.

For about 470 generations, the discount saves only a few to a few dozen dollars. The practical value of batching is throughput, and it fits "waves" of independent jobs. Edit chains still need a human approval gate between waves.

**QA metrics.**
- Standard identity metrics (CLIP-I, DINO cosine) correlate poorly with humans unless masked to the subject.
- The standard style metric (CSD) needs a calibration step before its raw cosine scores mean anything.
- VLM-as-judge correlates moderately with humans (r ≈ 0.57–0.69).

So automated QA should rank and filter candidates, with a human approving the final pick.

### Cited Findings

**OpenAI Batch and limits**
- **Batch API** — [OpenAI Batch guide](https://developers.openai.com/api/docs/guides/batch) [fetched]
  - Supported endpoints include `/v1/images/generations` and `/v1/images/edits`.
  - "GPT Image 2.5 supports batch image generation and editing with `gpt-image-2.5-flare` and `gpt-image-2.5-sunburst`, including their `2026-09-08` snapshots."
  - "50% cost discount", "24h" completion window, "up to 50,000 requests" per batch, files "up to 200 MB".
  - It recommends remote asset references instead of base64 to stay under the 200 MB limit.
- **Official rate limits** (both 2.5 variants) — [OpenAI Flare model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md); [OpenAI Sunburst model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst.md) [fetched]

  | Tier | Tokens per minute | Images per minute |
  |---|---|---|
  | Build | 250,000 | 20 |
  | Launch | 3,000,000 | 150 |
  | Grow | 8,000,000 | 250 |

  Image output costs $30/1M Standard vs $15/1M Batch. Conflict: a reseller says "Tier 1 … 5 IPM" up to "250 images per minute at Tier 5" — [Atlas Cloud](https://www.atlascloud.ai/blog/tips/gpt-image-2.5-rate-limits) [search summary]. I take the official page as authoritative.

**Gemini Batch**
- **Gemini Batch API** — [Gemini Batch docs](https://ai.google.dev/gemini-api/docs/batch-mode) [fetched]
  - "50% of the standard cost"; target "24 hours, but in majority of cases, it is much quicker".
  - Inline requests must keep the total under 20 MB; JSONL input files can be up to 2 GB.
  - Jobs expire if "running or pending for more than 48 hours".
  - Images return as base64 `inlineData`.
  - The docs' image example still uses `gemini-3-pro-image-preview`, which the sibling reports was **shut down 25 Jun 2026**, so the example is stale.
- Batch limits (100 concurrent batch requests, 2 GB per file, 20 GB storage, enqueued-token caps per tier) and the "billing-linked project required" quota issues are in the sibling — [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) [sibling]

**BFL (FLUX) and fal**
- **BFL** — [BFL integration guidelines](https://docs.bfl.ai/api_integration/integration_guidelines) [fetched]
  - "Maximum 24 concurrent requests for most endpoints"; "Maximum 6 concurrent requests for `flux-kontext-max`".
  - Results arrive via a `polling_url` or webhooks. "Generated images expire after 10 minutes."
  - Use exponential backoff on 429s. Regional endpoints: global, EU, US.
  - "No explicit batch-processing API exists."
- **FLUX 3 Image pricing:** $0.041 (768²), $0.048 (1K), $0.100 (2K), $0.607 (4K). Reference images are not charged, and failed or moderated generations are not billed — [OpenRouter FLUX.3 page](https://openrouter.ai/black-forest-labs/flux-3-image); [Vercel AI Gateway](https://vercel.com/ai-gateway/models/flux-3-image) [search summary]
- **fal queue** — [fal queue docs](https://fal.ai/docs/model-apis/model-endpoints/queue) [fetched]
  - "Requests in the queue are never dropped… There is no queue size limit."
  - States are IN_QUEUE, IN_PROGRESS, COMPLETED. Webhooks are retried, so use `request_id` for idempotency.
  - Priority can be "normal" or "low"; failures are retried automatically up to 10 times.
  - No batch endpoint or discount, and no account concurrency limits documented on that page.

**Automated QA: what the metrics literature says**
- **Identity metrics** — [MaSC, arXiv 2605.22469](https://www.alphaxiv.org/abs/2605.22469) [fetched]
  - CLIP-I and DINO cosine (the standard subject-fidelity metrics) use "global image pooling", so background differences distort the score.
  - Their agreement with humans is low: Krippendorff α ≈ 0.3.
  - Masked patch matching (MaSC "masked-maxcos") reaches α = 0.471. GPT-4V scores 0.432 and **GPT-4o 0.499**.
- **Style metric**
  - CSD (Contrastive Style Descriptors; Somepalli et al. 2024) is a ViT-L/14 fine-tuned for style similarity — [arXiv 2404.01292](https://arxiv.org/abs/2404.01292) [search summary]
  - Raw CSD cosine "yields negative point-estimate gaps for 23/91 artists at the pairwise level", i.e. it ranks same-style pairs below different-style pairs for about a quarter of artists. A CSLS readout cuts the failures from 15 to 4. The same failure appears with CLIP, SigLIP and DINOv2 backbones. Advice: "run the diagnostic on the candidate corpus" — [arXiv 2605.09030](https://arxiv.org/abs/2605.09030) [fetched]
- **VLM judges**
  - MultiBanana: GPT-5 judge vs humans Pearson **0.69**; Gemini 2.5 **0.57** — [arXiv 2511.22989](https://arxiv.org/html/2511.22989) [fetched]
  - EdiVal-Agent (object detectors plus VLM): **81.3%** agreement with humans on instruction following, vs 75.2% for VLM-only — [arXiv 2509.13399](https://arxiv.org/html/2509.13399) [fetched]
- **Best-of-N reranking:** ranking candidates from the same prompt by VQAScore improves text alignment "in a black-box manner", with no fine-tuning. This is 2024 evidence — [GenAI-Bench](https://arxiv.org/pdf/2406.13743) [search summary]
- **Practitioner QA habits:**
  - Pilot 5 images against a checklist before the full batch ([Little Might](https://www.littlemight.com/how-to-stop-your-ai-images-from-drifting-across-a-series/) [fetched]).
  - Check transparent assets on black, near-black and saturated magenta/cyan, because halos invisible on white show up there ([Runware guide](https://runware.ai/docs/models/openai-gpt-image-2-5-flare/guides/transparent-backgrounds) [fetched]; [Atlas Cloud transparency guide](https://www.atlascloud.ai/blog/tips/gpt-image-2-api-transparent-background) [search summary]).

### Inferences
- **Suggested automated QA gate for 2048 Siege.** None of these thresholds is published; calibrate each on the approved golden set and on deliberately bad samples.
  1. **Hard checks** (deterministic):
     - alpha present
     - no opaque border pixels
     - no key-colour residue (hue histogram)
     - bounding box and head size within tolerance
     - **palette conformance**: share of flat-fill pixels within ΔE of the family palette
     - **outline check**: measure dark-outline thickness with a distance transform on the outline mask, or skip this by re-stroking (Q3)
  2. **Identity score:** DINOv2 cosine on **alpha-masked** crops, applied to stage n vs the stage-1 golden and to fusion vs each parent. Masking matters because global-pool scores are distorted by backgrounds. Use it to rank candidates, never as the sole pass/fail.
  3. **Style score:** CSD with a CSLS readout against the family's golden set, after checking that the metric separates approved from rejected images on your own corpus.
  4. **VLM rubric judge** (GPT-class or Gemini), asking concrete yes/no questions: "same creature as reference A?", "body plan from parent A and colours from parent B?", "single subject, no background, no text?".
  5. A **human picks** from the top 1–2 candidates.
- **Schedule batches in waves.** The 32 baby stages are sequential, so run waves:
  - Wave 1: all stage-1 creatures, 17 enemies, eggs and the background.
  - Wave 2: all stage-2 edits plus fusions whose parents are approved.
  - Then later waves.

  Each wave is a single OpenAI or Gemini Batch job. The 24-hour target, often much faster, fits one human review per day, and batching sidesteps OpenAI Build-tier limits (20 images per minute) and Gemini quota issues.
- **If using FLUX:** stay at or under 24 concurrent requests on BFL and download results immediately because of the 10-minute expiry. Or use fal's queue with webhooks and `request_id` idempotency.

### Gaps
- I found no published game-studio pipeline that auto-scores sprite identity or style with DINO/CSD and reports thresholds or false-reject rates.
- I did not verify whether OpenAI Batch accepts multi-image edit requests with uploaded files, or only remote URLs. The docs recommend remote references.
- Not documented publicly: per-model image-per-minute limits for Gemini image models (shown only in AI Studio, per sibling) and fal account concurrency limits.
- No evidence was found on how well VLM judges detect outline-weight or palette deviations in sticker art specifically.
