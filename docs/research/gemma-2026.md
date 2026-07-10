# Gemma Research 2026

Created: 2026-06-29

This document captures the current research baseline for the Gemma-family strategy. These claims should be revalidated before public marketing, packaging, or hardware certification.

## Sources Reviewed

- [Gemma core docs](https://ai.google.dev/gemma/docs/core)
- [Gemma 4 QAT announcement](https://blog.google/innovation-and-ai/technology/developers-tools/quantization-aware-training-gemma-4/)
- [EmbeddingGemma docs](https://ai.google.dev/gemma/docs/embeddinggemma)
- [Gemma function calling docs](https://ai.google.dev/gemma/docs/core/function-calling)
- [DiffusionGemma announcement](https://blog.google/innovation-and-ai/technology/developers-tools/diffusion-gemma-faster-text-generation/)

## Product Implications

Gemma 4 is a strong product anchor because the family spans small local profiles, 12B desktop profiles, and larger 26B or 31B profiles while retaining a common model family story.

The QAT announcement matters because it makes the 12B profile plausible for 16 GB systems. Official memory claims for QAT weights do not remove KV cache, runtime overhead, multimodal components, indexing, OCR, or document workers from the product memory budget, so Vault Desk still needs retrieval-first prompting and bounded active context on 16 GB hardware.

Current official Gemma 4 documentation lists Q4_0 model-load memory estimates of:

- 6.7 GB for Gemma 4 12B.
- 14.4 GB for Gemma 4 26B A4B.
- 17.5 GB for Gemma 4 31B.

The same documentation describes 12B as a unified multimodal model and says the medium Gemma 4 models support up to 256K context. For Vault Desk, the practical interpretation is conservative: use the context window for selected evidence, cached summaries, and verification passes, not for raw ingestion of every page in a folder.

EmbeddingGemma is a 308M multilingual embedding model based on Gemma 3. The current docs describe 768-to-128 flexible output dimensions through Matryoshka Representation Learning, a 2K token input context, quantized memory under 200 MB, and offline local embedding generation.

## Recommended Model Policy

Use:

- Gemma 4 12B QAT as the product default.
- The same 12B QAT model on 64 GB systems first, but with larger context and deeper verification.
- Gemma 4 31B dense for a high-synthesis 64 GB tier if benchmarks justify the added memory and latency.
- Gemma 4 26B A4B for an office-throughput tier if benchmarks show better concurrency.
- EmbeddingGemma as the dense retrieval encoder.
- Gemma 4 native function calling for tool proposals.
- DiffusionGemma only as an experimental fast generation path until it passes the same workflow evaluation suite.

## Validation Questions

- Which local runtimes support Gemma 4 12B QAT reliably on Windows, macOS, and AMD systems?
- Which QAT formats should be certified first: GGUF, native framework weights, or runtime-specific formats?
- What is the maximum stable active context on 16 GB after document workers, embedding, UI, and indexing are included?
- Does the full product fit comfortably with Gemma 4 12B QAT, EmbeddingGemma, parser workers, and active KV cache on a 16 GB target?
- On 64 GB, is 31B dense quality worth the latency and operational complexity compared with 12B QAT plus deeper retrieval and verification?
- Does 26B A4B provide enough office concurrency advantage to justify a separate SKU?
- Can DiffusionGemma preserve citation discipline and structured output reliability?

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial Gemma 2026 research note created. |
| 2026-06-29 | Added official Gemma 4 Q4_0 memory estimates, 256K-context caveat, and EmbeddingGemma profile details. |
