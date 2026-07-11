# Model Strategy

Created: 2026-07-10

Vault Desk should standardize on the Gemma family as the primary model family for generation, retrieval, tool routing, safety, and multimodal inspection. The first product should vary active context before it varies model family, model size, retrieval policy, verification policy, or workflow eligibility.

## Current Recommendation

Use a Gemma-family architecture:

- Gemma 4 12B QAT for both Local 12 and Local 16.
- Local 12 and Local 16 should differ only by certified active context size.
- EmbeddingGemma as the default dense encoder.
- Gemma 4 native function calling for tool proposals.
- ShieldGemma or Gemma-family safety classifiers for local safety gates where licensing and runtime support fit.
- Multi-Token Prediction as an optional latency optimization only after memory, context, and correctness validation.
- DiffusionGemma, Gemma 4 26B A4B, and Gemma 4 31B as later research paths, not first-product requirements.

The design goal is one product family with predictable behavior, not a marketplace of unrelated local models.

## Certified Profiles

| Profile | Hardware target | Main model | Intended use |
|---|---|---|---|
| Local 12 | 12 GB VRAM or equivalent tested unified-memory envelope | Gemma 4 12B QAT | Single-user desktop document QA, extraction, comparison, summaries, and exports with smaller active context |
| Local 16 | 16 GB VRAM or equivalent tested unified-memory envelope | Gemma 4 12B QAT | Same workflows, retrieval, verification, and safety behavior with larger active context |
| Retrieval | Desktop and appliance | EmbeddingGemma | Dense retrieval and semantic search over local document corpora |

Google's current Gemma 4 documentation lists approximate Q4_0 inference-load memory of 6.7 GB for 12B, 14.4 GB for 26B A4B, and 17.5 GB for 31B. Those numbers are model-load estimates, not whole-product budgets. Vault Desk still needs room for KV cache, runtime overhead, embeddings, document parsers, OCR, indexes, UI, and operating-system memory.

Gemma 4's medium models support up to 256K context according to the current docs. Vault Desk should treat that as a maximum capability to validate, not as the default active context for every folder workflow. Gemma 4's hybrid attention (interleaved local sliding-window plus global) keeps KV-cache growth sublinear at long context, which strengthens the Local 12 and Local 16 thesis but is still research-derived until measured under full product load.

Licensing (verified 2026-07-11): Gemma 4 is Apache 2.0. EmbeddingGemma remains under the Gemma Terms of Use. The open-source boundary must track that difference.

Packaging rule (verified 2026-07-11): ship or pin the official pre-converted QAT Q4_0 GGUF checkpoints. Self-converting QAT checkpoints to GGUF destroys the QAT quality benefit.

See [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md) and [adr/0009-12-16gb-gemma-context-standard.md](adr/0009-12-16gb-gemma-context-standard.md).

## Local 12 And Local 16 Profiles

Both profiles should use:

- Gemma 4 12B QAT as the main local model.
- Retrieval-first prompting.
- Bounded active context.
- Page, section, and table summary trees.
- Evidence packs rather than raw folder stuffing.
- Claim-level verification.
- One interactive job at a time by default.
- Conservative multimodal page inspection.
- The same supported workflows.
- The same citation and approval requirements.
- The same context-compaction architecture.

The only product capability difference should be certified active context:

- Local 12 initial target: 32K active context, with 64K as a stretch target.
- Local 16 initial target: 64K active context, with 128K as a stretch target.

These targets are validation goals, not public support claims until measured on real hardware under full document-worker load.

The goal is reliability on professional documents, not maximum context-window marketing.

## Deferred Larger Profiles

64 GB workstation and appliance profiles are deferred until the Local 12 and Local 16 document workflow suite is stable.

Later validation may revisit:

- Gemma 4 12B QAT with larger context and concurrency on 64 GB systems.
- Gemma 4 31B dense for higher-quality synthesis.
- Gemma 4 26B A4B for throughput and concurrent office use.

Those profiles should not change the first implementation architecture.

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

## Multi-Token Prediction Role

Gemma 4 Multi-Token Prediction is a first-party feature: each Gemma 4 size ships a paired lightweight drafter model, and draft-and-verify decoding produces output identical to standard decoding. Runtime support was verified on 2026-07-11: llama.cpp merged Gemma 4 MTP on 2026-06-07 (roughly 1.4x to 2.2x decode speedup for dense models), vLLM supports all variants, and Ollama supports it on the MLX backend.

For Vault Desk, MTP should be treated as:

- An optional decode-speed optimization.
- Not required for correctness (draft-and-verify output is provably identical, so the risk is memory and stability, not answer quality).
- A roughly 2 GB additional memory cost for the drafter, which competes directly with the certified active context target on Local 12.
- Not allowed to reduce the certified active context target.
- Not allowed to change citation, extraction, or verification behavior.
- Validated jointly with KV-cache quantization per pinned runtime build, because q8_0 KV-cache quantization initially broke MTP acceptance in llama.cpp.
- Disabled by default until it passes the same workflow benchmark suite as baseline decoding.

Open validation item: node-llama-cpp supports generic draft-model speculative decoding, but explicit Gemma 4 MTP drafter support through the Node bindings is unverified.

## Runtime Policy

Use runtime adapters:

- llama.cpp-compatible serving for the first Local 12 and Local 16 desktop path where GGUF support is stable. node-llama-cpp is the strongest verified in-process path for the planned TypeScript/Node harness: it loads Gemma 4 QAT GGUFs, enforces JSON-schema outputs, supports function calling, embeddings, and generic speculative decoding, and covers Metal, CUDA, and Vulkan.
- Ollama-compatible serving only when model packaging, context behavior, and telemetry controls are explicit. Ollama's MLX backend currently has the most mature Gemma 4 MTP support on Apple Silicon.
- MLX-family serving for supported Apple Silicon profiles.
- Google LiteRT-LM as an emerging Google-first alternative to track: it ships an OpenAI-compatible local server and a JS/WASM API, added Gemma 4 12B support, and is Google's own optimized MTP test surface. MediaPipe LLM Inference is maintenance-only; do not build on it.
- vLLM-class serving for later office appliances and high-throughput profiles after Gemma 4 QAT support is verified.
- Avoid runtime-specific features in core workflow logic.
- Pin runtime builds. QAT, KV-cache quantization, and MTP interact per build and must be certified together.

## Evaluation Gates

Each certified profile needs:

- First-token latency.
- Tokens per second.
- Peak VRAM and RAM.
- Context-length stability.
- Compaction stability over long sessions.
- Multimodal page inspection quality.
- Extraction accuracy.
- Citation precision.
- Unsupported-claim rate.
- Tool-call schema validity.
- Summary coverage.
- Folder-level report quality.
- Soak tests over repeated large-folder runs.

## Research Links

- [Gemma releases log](https://ai.google.dev/gemma/docs/releases)
- [Gemma core docs](https://ai.google.dev/gemma/docs/core)
- [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- [Gemma 4 QAT announcement](https://blog.google/innovation-and-ai/technology/developers-tools/quantization-aware-training-gemma-4/)
- [Gemma 4 Multi-Token Prediction](https://ai.google.dev/gemma/docs/mtp/overview)
- [llama.cpp Gemma 4 MTP PR](https://github.com/ggml-org/llama.cpp/pull/23398)
- [EmbeddingGemma docs](https://ai.google.dev/gemma/docs/embeddinggemma)
- [Gemma function calling docs](https://ai.google.dev/gemma/docs/core/function-calling)
- [DiffusionGemma announcement](https://blog.google/innovation-and-ai/technology/developers-tools/diffusion-gemma-faster-text-generation/)
- [node-llama-cpp](https://node-llama-cpp.withcat.ai)
- [LiteRT-LM overview](https://ai.google.dev/edge/litert-lm/overview)
- [research/gemma-2026.md](research/gemma-2026.md) for the full verified July 2026 baseline.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial Gemma-family model strategy created from current research. |
| 2026-07-10 | Added Gemma 4 Q4_0 memory numbers, 256K context caveat, and EmbeddingGemma dimensionality guidance. |
| 2026-07-10 | Recentered first certification on Local 12 and Local 16 using the same Gemma 4 12B QAT model, with context size as the only product capability difference. |
| 2026-07-11 | Revalidated against live sources: Apache 2.0 licensing, EmbeddingGemma license caveat, official QAT GGUF packaging rule, verified MTP runtime support and memory cost, node-llama-cpp and LiteRT-LM runtime guidance, and joint QAT/KV-quant/MTP certification rule. |
