# Model Strategy

Created: 2026-06-29

Vault Desk should standardize on the Gemma family as the primary model family for generation, retrieval, tool routing, safety, and multimodal inspection. The product should vary hardware profile, active context, retrieval budget, verification depth, and concurrency before exposing model choice.

## Current Recommendation

Use a Gemma-family architecture:

- Gemma 4 12B QAT for the 16 GB profile.
- Gemma 4 12B QAT with larger context and wider retrieval for the base 64 GB profile.
- Gemma 4 31B dense as the likely 64 GB high-synthesis profile after benchmarking.
- Gemma 4 26B A4B as the likely 64 GB throughput profile if its mixture-of-experts behavior proves faster for office concurrency.
- EmbeddingGemma as the default dense encoder.
- Gemma 4 native function calling for tool proposals.
- ShieldGemma or Gemma-family safety classifiers for local safety gates where licensing and runtime support fit.
- DiffusionGemma as an experimental drafting and low-latency generation path, not the first correctness path.

The design goal is one product family with predictable behavior, not a marketplace of unrelated local models.

## Certified Profiles

| Profile | Hardware target | Main model | Intended use |
|---|---|---|---|
| Local 16 | 16 GB VRAM or equivalent tested unified-memory envelope | Gemma 4 12B QAT | Single-user desktop document QA, extraction, comparison, summaries, and exports |
| Local 64 Base | 64 GB VRAM or high-memory unified system | Gemma 4 12B QAT | Same model behavior with larger active context, wider retrieval, deeper verification, more concurrent jobs |
| Local 64 Synthesis | 64 GB VRAM or high-memory appliance | Gemma 4 31B dense QAT if validated | Better cross-document synthesis, legal summaries, large-folder reports |
| Local 64 Throughput | 64 GB VRAM or high-memory appliance | Gemma 4 26B A4B QAT if validated | Multi-user appliance work where activated-parameter efficiency matters |
| Retrieval | Desktop and appliance | EmbeddingGemma | Dense retrieval and semantic search over local document corpora |

Google's current Gemma 4 documentation lists approximate Q4_0 inference-load memory of 6.7 GB for 12B, 14.4 GB for 26B A4B, and 17.5 GB for 31B. Those numbers are model-load estimates, not whole-product budgets. Vault Desk still needs room for KV cache, runtime overhead, embeddings, document parsers, OCR, indexes, UI, and operating-system memory.

Gemma 4's medium models support up to 256K context according to the current docs. Vault Desk should treat that as a maximum capability to validate, not as the default active context for every folder workflow.

## 16 GB Profile

The 16 GB profile should not attempt to make the full advertised model context the default working set.

Instead, it should use:

- Gemma 4 12B QAT as the main local model.
- Retrieval-first prompting.
- Bounded active context.
- Page, section, and table summary trees.
- Evidence packs rather than raw folder stuffing.
- Claim-level verification.
- One interactive job at a time by default.
- Conservative multimodal page inspection.

The goal is reliability on professional documents, not maximum context-window marketing.

## 64 GB Profile

The 64 GB profile should initially prove the same 12B QAT model with:

- Larger active context.
- Wider retrieval candidate windows.
- More evidence per answer.
- Deeper verifier passes.
- More page-region inspection.
- More concurrent ingestion and summarization jobs.
- Better cache reuse for repeated folder questions.

The next 64 GB validation step is deciding between:

- Gemma 4 31B dense for higher-quality synthesis.
- Gemma 4 26B A4B for better throughput and concurrent office use.

Defaulting to 12B QAT on both 16 GB and 64 GB keeps behavior consistent while the document engine, verifier, and workflow evaluations mature.

## Encoder

EmbeddingGemma should be the default dense encoder because it stays inside the Gemma family and is designed for on-device retrieval use.

Recommended retrieval shape:

- Store canonical text chunks with stable source anchors.
- Embed title, heading, page, table, row, and paragraph-aware chunks.
- Use EmbeddingGemma dense vectors.
- Start with 768-dimensional embeddings for quality.
- Evaluate Matryoshka-dimension reductions from 768 toward 128 only after recall tests on Vault Desk corpora.
- Keep chunk text below EmbeddingGemma's 2K-token input context.
- Pair dense retrieval with lexical BM25 search.
- Use metadata filters for workspace, file type, date, page, sheet, table, and permission scope.
- Use vector compression only as an acceleration layer, not as the sole evidence store.

See [RETRIEVAL_AND_VERIFICATION.md](RETRIEVAL_AND_VERIFICATION.md).

## DiffusionGemma Role

DiffusionGemma is relevant because diffusion language models can generate text by iterative denoising rather than left-to-right token prediction and may improve latency for some generation workloads.

For Vault Desk, it should be treated as:

- An experimental fast-draft model.
- A possible local autocomplete or first-pass summarization model.
- Not the first model for audited extraction, legal summaries, accounting reconciliation, or final cited answers.

Correctness workflows should remain anchored on Gemma 4 QAT profiles until DiffusionGemma is validated against the same citation, extraction, and verifier suite.

## Runtime Policy

Use runtime adapters:

- llama.cpp or Ollama-compatible serving for the first 16 GB desktop path.
- MLX-family serving for supported Apple Silicon profiles.
- vLLM-class serving for 64 GB office appliances and high-throughput profiles after Gemma 4 QAT support is verified.
- Avoid runtime-specific features in core workflow logic.

## Evaluation Gates

Each certified profile needs:

- First-token latency.
- Tokens per second.
- Peak VRAM and RAM.
- Context-length stability.
- Multimodal page inspection quality.
- Extraction accuracy.
- Citation precision.
- Unsupported-claim rate.
- Tool-call schema validity.
- Summary coverage.
- Folder-level report quality.
- Soak tests over repeated large-folder runs.

## Research Links

- [Gemma core docs](https://ai.google.dev/gemma/docs/core)
- [Gemma 4 QAT announcement](https://blog.google/innovation-and-ai/technology/developers-tools/quantization-aware-training-gemma-4/)
- [EmbeddingGemma docs](https://ai.google.dev/gemma/docs/embeddinggemma)
- [Gemma function calling docs](https://ai.google.dev/gemma/docs/core/function-calling)
- [DiffusionGemma announcement](https://blog.google/innovation-and-ai/technology/developers-tools/diffusion-gemma-faster-text-generation/)

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial Gemma-family model strategy created from current research. |
| 2026-06-29 | Added Gemma 4 Q4_0 memory numbers, 256K context caveat, and EmbeddingGemma dimensionality guidance. |
