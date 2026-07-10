# Gemma Research 2026

Created: 2026-06-29

This document captures the current research baseline for the Gemma-family strategy. These claims should be revalidated before public marketing, packaging, or hardware certification.

## Sources Reviewed

- [Gemma core docs](https://ai.google.dev/gemma/docs/core)
- [Gemma 4 QAT announcement](https://blog.google/innovation-and-ai/technology/developers-tools/quantization-aware-training-gemma-4/)
- [EmbeddingGemma docs](https://ai.google.dev/gemma/docs/embeddinggemma)
- [Gemma function calling docs](https://ai.google.dev/gemma/docs/core/function-calling)
- [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- [Gemma 4 Multi-Token Prediction](https://ai.google.dev/gemma/docs/mtp/overview)
- [DiffusionGemma announcement](https://blog.google/innovation-and-ai/technology/developers-tools/diffusion-gemma-faster-text-generation/)

## Product Implications

Gemma 4 is a strong product anchor because the 12B QAT profile can plausibly serve both 12 GB and 16 GB local products while retaining a common model family story.

The QAT announcement matters because it makes the 12B profile plausible for 12 GB and 16 GB systems. Official memory claims for QAT weights do not remove KV cache, runtime overhead, multimodal components, indexing, OCR, or document workers from the product memory budget, so Vault Desk still needs retrieval-first prompting, bounded active context, and context compaction on local hardware.

Current official Gemma 4 documentation lists Q4_0 model-load memory estimates of:

- 6.7 GB for Gemma 4 12B.
- 14.4 GB for Gemma 4 26B A4B.
- 17.5 GB for Gemma 4 31B.

The same documentation describes 12B as a unified multimodal model and says the medium Gemma 4 models support up to 256K context. For Vault Desk, the practical interpretation is conservative: use the context window for selected evidence, cached summaries, compacted task state, and verification passes, not for raw ingestion of every page in a folder.

EmbeddingGemma is a 308M multilingual embedding model based on Gemma 3. The current docs describe 768-to-128 flexible output dimensions through Matryoshka Representation Learning, a 2K token input context, quantized memory under 200 MB, and offline local embedding generation.

Gemma 4 Multi-Token Prediction is relevant as a decode-latency optimization. It should not be a correctness dependency and should not reduce the certified Local 12 or Local 16 active-context target.

## Recommended Model Policy

Use:

- Gemma 4 12B QAT as the product default on Local 12 and Local 16.
- Context size as the only product capability difference between Local 12 and Local 16.
- EmbeddingGemma as the dense retrieval encoder.
- Gemma 4 native function calling for tool proposals.
- Multi-Token Prediction only as an optional latency optimization after validation.
- DiffusionGemma, Gemma 4 31B dense, and Gemma 4 26B A4B only as later research paths until the Local 12 and Local 16 workflow suite is stable.

## Validation Questions

- Which local runtimes support Gemma 4 12B QAT reliably on Windows, macOS, and AMD systems?
- Which QAT formats should be certified first: GGUF, native framework weights, or runtime-specific formats?
- What is the maximum stable active context on 12 GB after document workers, embedding, UI, and indexing are included?
- What is the maximum stable active context on 16 GB under the same workflow policy?
- Does the full product fit comfortably with Gemma 4 12B QAT, EmbeddingGemma, parser workers, compaction, and active KV cache on both targets?
- Does Multi-Token Prediction improve end-to-end document workflow latency enough to justify memory cost?
- Does KV-cache quantization preserve citation precision and structured-output validity?
- Can DiffusionGemma preserve citation discipline and structured output reliability?
- When the desktop workflow suite is stable, is 31B dense quality or 26B A4B throughput worth a 64 GB appliance SKU?

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial Gemma 2026 research note created. |
| 2026-06-29 | Added official Gemma 4 Q4_0 memory estimates, 256K-context caveat, and EmbeddingGemma profile details. |
| 2026-06-30 | Updated policy for Local 12 and Local 16, context compaction, Multi-Token Prediction, and deferred larger-model research. |
