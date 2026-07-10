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
- [DiffusionGemma announcement](https://blog.google/innovation-and-ai/technology/developers-tools/diffusion-gemma-faster-text-generation/)
- [Microsoft MarkItDown](https://github.com/microsoft/markitdown)
- [Docling](https://github.com/docling-project/docling)
- [Unstructured partitioning docs](https://docs.unstructured.io/open-source/core-functionality/partitioning)
- [turbovec](https://github.com/RyanCodrai/turbovec)

## Research-Derived Claims

The following topics came from supplied research and should be revalidated before implementation or external publication:

- Current Gemma family capabilities and licensing.
- Gemma 4 QAT memory and runtime behavior on actual 16 GB and 64 GB targets.
- EmbeddingGemma retrieval quality on local professional corpora.
- DiffusionGemma suitability for cited, verified document work.
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
- Benchmark Gemma 4 12B QAT active context on 16 GB with document workers running.
- Benchmark Gemma 4 12B QAT, 26B A4B, and 31B dense on 64 GB systems.
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
