# Research Sources

Created: 2026-06-29

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

## Research-Derived Claims

The following topics came from supplied research and should be revalidated before implementation or external publication:

- Current Gemma family capabilities and licensing.
- Gemma 4 QAT memory and runtime behavior on actual 12 GB and 16 GB targets.
- EmbeddingGemma retrieval quality on local professional corpora.
- DiffusionGemma suitability for cited, verified document work.
- Multi-Token Prediction memory, latency, and reproducibility behavior on Local 12 and Local 16.
- KV-cache and prompt-cache behavior under long evidence packs.
- Context compaction quality over long document sessions.
- Runtime support for MLX, llama.cpp, Ollama, vLLM, TensorRT-LLM, ROCm, and Metal.
- MarkItDown, Docling, Unstructured, and native parser behavior on real Vault Desk files.
- turbovec recall, latency, packaging, and update behavior.
- Competitive positioning of LM Studio, AnythingLLM, Open WebUI, Lemony, Unstract, and related products.
- Hardware roadmaps for AMD, NVIDIA, and OEM systems.
- Benchmark datasets and tools.
- Current cloud pricing and hosted inference options.

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
- Benchmark MarkItDown, Docling, Unstructured, OCR, and native spreadsheet parsing against the same files.
- Benchmark turbovec against uncompressed vector search for recall and latency.
- Verify competitor capabilities and pricing.
- Verify accounting workflow compliance requirements by country.
- Review IP ownership and employment agreement implications with counsel.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial research source document created from supplied file references. |
| 2026-06-29 | Added current Gemma, document tooling, and vector-search web sources and validation backlog. |
| 2026-06-30 | Added edge-AI, long-context, compaction, and Local 12 and Local 16 validation sources and backlog items. |
