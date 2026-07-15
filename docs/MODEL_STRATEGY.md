# Model Strategy

Created: 2026-07-10

Vault Desk's product contracts are model-agnostic, with per-model certification and strong defaults, per [ADR 0016](adr/0016-model-agnostic-defaults-and-managed-downloads.md). Gemma 4 12B QAT is the default and first certified generation model. The first product should vary active context before it varies model, model size, retrieval policy, verification policy, or workflow eligibility.

## Current Recommendation

- Gemma 4 12B QAT as the default generation model for both Local 12 and Local 16.
- Local 12 and Local 16 should differ only by certified active context size.
- Qwen3-Embedding-0.6B (Apache 2.0, official GGUF) as the product-managed dense encoder in every build flavor. EmbeddingGemma remains a validated alternative but carries Gemma Terms of Use distribution obligations and must not ship without a dedicated review.
- Gemma 4 native function calling for tool proposals on the default model; tool-proposal contracts remain model-agnostic.
- ShieldGemma or Gemma-family safety classifiers for local safety gates where licensing and runtime support fit.
- Multi-Token Prediction as an optional latency optimization only after memory, context, and correctness validation.
- DiffusionGemma, Gemma 4 26B A4B, and Gemma 4 31B as later research paths, not first-product requirements.

The design goal is a small set of certified, hardware-fit models with predictable behavior — defaults chosen for the user, additional models installable through the managed download experience defined in ADR 0016, and never a marketplace of arbitrary local models.

The first cross-platform desktop runtime is also singular: node-llama-cpp with the pinned official Gemma 4 12B QAT GGUF on Windows and macOS. MLX remains a later adapter-backed Apple Silicon optimization. See [ADR 0013](adr/0013-first-desktop-runtime.md).

## Certified Profiles

| Profile | Hardware target | Main model | Intended use |
|---|---|---|---|
| Local 12 | 12 GB VRAM or equivalent tested unified-memory envelope | Gemma 4 12B QAT (default) | Single-user desktop document QA, extraction, comparison, summaries, and exports with smaller active context |
| Local 16 | 16 GB VRAM or equivalent tested unified-memory envelope | Gemma 4 12B QAT (default) | Same workflows, retrieval, verification, and safety behavior with larger active context |
| Retrieval | Desktop and appliance | Qwen3-Embedding-0.6B | Dense retrieval and semantic search over local document corpora |

Google's current Gemma 4 documentation lists approximate Q4_0 inference-load memory of 6.7 GB for 12B, 14.4 GB for 26B A4B, and 17.5 GB for 31B. Those numbers are model-load estimates, not whole-product budgets. Vault Desk still needs room for KV cache, runtime overhead, embeddings, document parsers, OCR, indexes, UI, and operating-system memory.

Gemma 4's medium models support up to 256K context according to the current docs. Vault Desk should treat that as a maximum capability to validate, not as the default active context for every folder workflow. Gemma 4's hybrid attention (interleaved local sliding-window plus global) keeps KV-cache growth sublinear at long context, which strengthens the Local 12 and Local 16 thesis but is still research-derived until measured under full product load.

Licensing (verified 2026-07-15): Gemma 4 is Apache 2.0 and Qwen3-Embedding-0.6B is Apache 2.0, so the default shipped stack is fully Apache 2.0. EmbeddingGemma remains under the Gemma Terms of Use; that burden is why it is no longer the default encoder (ADR 0016).

Packaging rule (verified 2026-07-11): ship or pin the official pre-converted QAT Q4_0 GGUF checkpoints. Self-converting QAT checkpoints to GGUF destroys the QAT quality benefit.

Development fetch sources (verified 2026-07-15): the hash-pinned development fetcher pulls from the official publisher repositories on Hugging Face and from no other host. All three repositories are Apache 2.0 and ungated; anonymous download was verified live (HTTP 200 without a token), so neither developers nor CI need Hugging Face accounts.

### Pinned Default Assets

These exact repository names, file names, sizes, and SHA-256 digests were read from the Hugging Face API on 2026-07-15 and are the canonical values for the M0 machine-readable model manifest. Download URLs follow the pattern `https://huggingface.co/<repository>/resolve/main/<file>`.

| Role | Repository | File | Size | SHA-256 |
|---|---|---|---|---|
| Default generation (12B, manifest status `candidate_to_ship`) | `google/gemma-4-12B-it-qat-q4_0-gguf` | `gemma-4-12b-it-qat-q4_0.gguf` | 6.98 GB | `1e76e46623deaa4db97d4ef272ceab0dfb767c0f34c2c76524837edf2b57a510` |
| 12B multimodal projector (paired with the above) | `google/gemma-4-12B-it-qat-q4_0-gguf` | `mmproj-gemma-4-12b-it-qat-q4_0.gguf` | 0.18 GB | `e70b0e5cd80323d5d588b4ed06780356b7b1ba03995a4b8164c6ae9db0ff5989` |
| Development test model (E2B, manifest status `development`, never shipped) | `google/gemma-4-E2B-it-qat-q4_0-gguf` | `gemma-4-E2B_q4_0-it.gguf` | 3.35 GB | `25194efbf8a53268241e5ffa6d5490edc08b3faaa6ead24478c8b025a986d556` |
| E2B multimodal projector (paired with the above) | `google/gemma-4-E2B-it-qat-q4_0-gguf` | `gemma-4-E2B-it-mmproj.gguf` | 0.99 GB | `58c187648007cab392bd5678b87e862c3e8794017deb945feea2cf256195e96a` |
| Default encoder (manifest status `candidate_to_ship`) | `Qwen/Qwen3-Embedding-0.6B-GGUF` | `Qwen3-Embedding-0.6B-Q8_0.gguf` | 0.64 GB | `06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439` |

Notes:

- The E2B file name does not follow the 12B naming pattern (`gemma-4-E2B_q4_0-it.gguf`, underscore before `q4_0`); the manifest must use these literal file names, not a derived pattern.
- The Q8_0 encoder quantization is the pinned default (near-lossless, 0.64 GB). The f16 file (`Qwen3-Embedding-0.6B-f16.gguf`, 1.20 GB, `421a27e58d165478cc7acb984a688c2aa41404968b0203e7cd743ece44c54340`) is recorded as the comparison reference if M5 recall tests implicate quantization.
- The multimodal projectors ride along for the M4 page-inspection path and E2B vision smoke tests; text-only milestones may defer fetching them.
- A digest mismatch on fetch is a hard failure: the upstream file changed and the pin must be re-reviewed deliberately, never auto-updated.

Vault Desk does not mirror or rehost model weights during development. GitHub is unsuitable regardless of preference: release assets cap at 2 GiB and Git LFS at 2-5 GB per file, below the 12B GGUF. The official repositories also keep provenance verifiable: the fetcher pins the upstream SHA-256 per file, so a silent upstream change fails the fetch instead of entering the cache. The same official repositories later serve as the allowlisted sources for the ADR 0016 model-download build, behind the typed broker and signed catalog.

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

Qwen3-Embedding-0.6B is the product-managed dense encoder, per [ADR 0016](adr/0016-model-agnostic-defaults-and-managed-downloads.md): Apache 2.0, official GGUF, strong multilingual retrieval (100+ languages), 32K input context, and served by the same node-llama-cpp runtime as generation. It is bundled in every build flavor and never user-selected. EmbeddingGemma remains a validated alternative with a Gemma Terms of Use distribution burden.

Recommended retrieval shape:

- Store canonical text chunks with stable source anchors.
- Embed title, heading, page, table, row, and paragraph-aware chunks.
- Use Qwen3-Embedding-0.6B dense vectors.
- Start with 768-dimensional embeddings for quality (the encoder supports 32 to 1024 output dimensions).
- Evaluate dimension reductions from 768 toward 128 only after recall tests on Vault Desk corpora.
- Size chunks by retrieval quality tests, not by the encoder's 32K input maximum; structure-aware chunks in the sub-2K range remain the starting point.
- Pair dense retrieval with lexical BM25 search.
- Use metadata filters for workspace, file type, date, page, sheet, table, and permission scope.
- Use vector compression only as an acceleration layer, not as the sole evidence store.

Qwen3-Embedding retrieval quality on Vault Desk corpora is research-derived until the M5 held-out gate measures it.

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

- node-llama-cpp in a supervised inference worker is the first Local 12 and Local 16 desktop path on Windows and macOS. It loads the pinned official Gemma 4 QAT GGUFs, enforces JSON-schema outputs, supports function calling and embeddings, and covers Metal, CUDA, and Vulkan while keeping runtime-specific types outside Vault Core.
- Ollama-compatible serving only when model packaging, context behavior, and telemetry controls are explicit. Ollama's MLX backend currently has the most mature Gemma 4 MTP support on Apple Silicon.
- MLX-family serving is a later Apple Silicon optimization candidate and must pass the same packaged workflow, citation, verification, compaction, and offline suite before certification.
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
- [Qwen3-Embedding blog](https://qwenlm.github.io/blog/qwen3-embedding/)
- [Qwen3-Embedding-0.6B-GGUF](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF)
- [EmbeddingGemma docs](https://ai.google.dev/gemma/docs/embeddinggemma) (validated alternative)
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
| 2026-07-11 | Selected node-llama-cpp and the official QAT GGUF as the single first Windows/macOS runtime target through ADR 0013. |
| 2026-07-15 | Recorded the official Google Hugging Face repositories as the only development fetch sources, the per-identity EmbeddingGemma gating procedure, and the decision not to mirror weights on GitHub or elsewhere before the M10 packaging gate. |
| 2026-07-15 | Applied ADR 0016: model-agnostic contracts with Gemma 4 12B QAT as default generation model, Qwen3-Embedding-0.6B replacing EmbeddingGemma as the product-managed encoder (ungated fetch, fully Apache 2.0 shipped stack), and the managed model-download build flavor. |
| 2026-07-15 | Pinned the exact default assets for the M0 manifest — repository names, literal file names, sizes, and SHA-256 digests read from the Hugging Face API and verified anonymously downloadable — covering 12B QAT, E2B QAT, their multimodal projectors, and the Q8_0 encoder. |
