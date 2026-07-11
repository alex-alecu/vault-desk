# Research Sources

Created: 2026-07-10

This repository was initialized from supplied local materials rather than live web research.

## Supplied Materials

Primary source files used:

- `/Users/alex/.codex/attachments/10d6a267-9747-4f08-88fa-d711354c012a/pasted-text-1.txt`
- `/Users/alex/Desktop/deep-research-report.md`

The pasted text provided the product, market, business, hardware, roadmap, and private repository structure direction.

The deep research report provided the model, runtime, document pipeline, benchmark, and architecture recommendations.

## Current Web Sources Reviewed

- [Gemma core docs](https://ai.google.dev/gemma/docs/core)
- [Gemma 4 QAT announcement](https://blog.google/innovation-and-ai/technology/developers-tools/quantization-aware-training-gemma-4/)
- [EmbeddingGemma docs](https://ai.google.dev/gemma/docs/embeddinggemma)
- [Gemma function calling docs](https://ai.google.dev/gemma/docs/core/function-calling)
- [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- [Gemma 4 Multi-Token Prediction](https://ai.google.dev/gemma/docs/mtp/overview)
- [DiffusionGemma announcement](https://blog.google/innovation-and-ai/technology/developers-tools/diffusion-gemma-faster-text-generation/)
- [Microsoft MarkItDown](https://github.com/microsoft/markitdown)
- [Docling](https://github.com/docling-project/docling)
- [Unstructured partitioning docs](https://docs.unstructured.io/open-source/core-functionality/partitioning)
- [turbovec](https://github.com/RyanCodrai/turbovec)
- [PagedAttention paper](https://arxiv.org/abs/2309.06180)
- [StreamingLLM paper](https://arxiv.org/abs/2309.17453)
- [Lost in the Middle paper](https://arxiv.org/abs/2307.03172)
- [RULER benchmark paper](https://arxiv.org/abs/2404.06654)

## 2026-07-11 Live Revalidation

On 2026-07-11 a full live-web revalidation pass was run across the model stack, document tooling, retrieval components, agent-loop frameworks, and competitive landscape. Findings and source links were folded into:

- [research/gemma-2026.md](research/gemma-2026.md) — Gemma 4 timeline, licensing, QAT, MTP, EmbeddingGemma, and performance baselines.
- [research/local-ai-runtimes.md](research/local-ai-runtimes.md) — verified runtime support matrix including node-llama-cpp and LiteRT-LM.
- [research/document-tools-2026.md](research/document-tools-2026.md) — parser license posture, Granite-Docling GGUF, PaddleOCR-VL, native Node parsers, LanceDB and sqlite-vec.
- [research/competitive-landscape.md](research/competitive-landscape.md) — twelve incumbents and six newcomers with verified license, telemetry, OCR, approval, and audit findings.
- [RETRIEVAL_AND_VERIFICATION.md](RETRIEVAL_AND_VERIFICATION.md) — TurboQuant (Google Research, ICLR 2026) versus turbovec naming and index decision.
- [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md) — default component stack table.

## Research-Derived Claims

Now verified against primary sources (2026-07-11), still requiring validation on Vault Desk's own hardware and corpora:

- Gemma 4 licensing (Apache 2.0) and QAT checkpoint availability: verified. Memory and runtime behavior on actual 12 GB and 16 GB targets under full product load: still to benchmark.
- Multi-Token Prediction runtime support: verified. Its memory, latency, and stability on Local 12 and Local 16, and node-llama-cpp MTP drafter support: still to validate.
- EmbeddingGemma profile and license: verified. Retrieval quality on local professional corpora: still to benchmark.
- Parser quality rankings and OCR benchmark scores: vendor and community benchmarks only; must be re-run on Vault Desk accounting and legal corpora.
- Community tokens-per-second figures: research-derived, not lab results.

Still research-derived and unverified:

- DiffusionGemma suitability for cited, verified document work.
- KV-cache and prompt-cache behavior under long evidence packs.
- Context compaction quality over long document sessions.
- Hardware roadmaps for AMD, NVIDIA, and OEM systems.
- Current cloud pricing and hosted inference options.
- Market-signal statistics cited in the competitive landscape (legal AI adoption rates, HIPAA breach statistics).

## Source Handling Rules

- Keep original supplied materials separate from authored repository docs unless the user explicitly asks to import them.
- Do not copy long external source passages into repository files.
- Summarize research in original words.
- Mark unvalidated market or vendor claims as research-derived.
- Revalidate time-sensitive claims before business use.

## Validation Backlog

Before code or public claims:

- Confirm exact model licensing.
- Confirm allowed model redistribution terms.
- Confirm supported runtimes by platform.
- Benchmark chosen runtimes on actual target hardware.
- Benchmark Gemma 4 12B QAT active context on 12 GB and 16 GB with document workers running.
- Benchmark Local 12 and Local 16 through at least 30-minute sessions with multiple context compactions.
- Benchmark Gemma 4 12B QAT, 26B A4B, and 31B dense only after the Local 12 and Local 16 workflow suite is stable.
- Benchmark EmbeddingGemma plus lexical search against accounting and legal corpora.
- Benchmark native Node parsers, Granite-Docling GGUF, the Docling sidecar, PaddleOCR-VL, MarkItDown, Unstructured, and native spreadsheet parsing against the same files.
- Benchmark LanceDB hybrid search (with RaBitQ quantization) against sqlite-vec and against turbovec-in-sidecar for recall and latency.
- Validate node-llama-cpp with Gemma 4 QAT GGUF, grammar-constrained output, and the MTP drafter on all three GPU vendors.
- Re-verify competitor capabilities and pricing before any external marketing use.
- Verify accounting workflow compliance requirements by country.
- Review IP ownership and employment agreement implications with counsel.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial research source document created from supplied file references. |
| 2026-07-10 | Added current Gemma, document tooling, and vector-search web sources and validation backlog. |
| 2026-07-10 | Added edge-AI, long-context, compaction, and Local 12 and Local 16 validation sources and backlog items. |
| 2026-07-11 | Recorded the full live-web revalidation pass, moved verified claims out of the research-derived list, and updated the validation backlog to the revised component stack. |
