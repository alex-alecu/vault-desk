# ADR 0009: Local 12 And Local 16 Gemma Context Standard

Date: 2026-06-30

## Status

Accepted

## Context

Vault Desk is in a documentation-only phase. The previous model strategy centered the first validation work on 16 GB desktops and 64 GB workstations or appliances.

Current product direction is narrower: build the first performant document workflow on Gemma 4 12B QAT and make it fit 12 GB and 16 GB VRAM targets. The product should not become a hardware-tier maze or a larger-model benchmark project before the document pipeline, retrieval, verification, and compaction architecture are proven.

Official Gemma 4 documentation lists the 12B Q4_0 load estimate at 6.7 GB before KV cache and runtime overhead. The same documentation describes long-context capability, but the practical product constraint is stable active context under full workflow load.

## Decision

Vault Desk will treat Local 12 and Local 16 as the first certified performance profiles.

Both profiles use:

- Gemma 4 12B QAT as the main generation and reasoning model.
- EmbeddingGemma as the default dense retrieval encoder.
- The same parser routing strategy.
- The same hybrid retrieval strategy.
- The same citation and claim-verification policy.
- The same approval and audit policy.
- The same compaction architecture.
- The same workflow eligibility.

The only product capability difference is certified active context size.

Initial certification targets:

- Local 12: 32K active context, with 64K as a stretch target.
- Local 16: 64K active context, with 128K as a stretch target.

These targets must be validated on actual hardware with the full product workload before public support claims.

## Consequences

Positive:

- Keeps the first implementation focused.
- Makes product behavior predictable across hardware.
- Reduces test matrix size.
- Avoids premature 26B, 31B, and 64 GB appliance branching.
- Forces retrieval, verification, and compaction to solve document work instead of relying on larger context.

Negative:

- Some larger-folder workflows may require more retrieval and compaction passes on Local 12.
- 64 GB appliance positioning remains less detailed until after MVP validation.
- Larger Gemma models may provide quality gains that are intentionally deferred.

## Non-Decisions

This ADR does not decide:

- Exact runtime adapter to certify first.
- Exact GGUF, MLX, or other model packaging format.
- Whether later appliance products use Gemma 4 26B A4B, Gemma 4 31B, or another Gemma-family profile.
- Whether Multi-Token Prediction is enabled by default.
- Whether KV-cache quantization is enabled by default.

## Required Follow-Up

- Benchmark Gemma 4 12B QAT on 12 GB and 16 GB targets.
- Validate active context targets with document workers, embeddings, OCR, indexing, and UI loaded.
- Validate context compaction through long-running folder workflows.
- Keep future profile docs aligned with this ADR unless a later ADR supersedes it.

## References

- [MODEL_STRATEGY.md](../MODEL_STRATEGY.md)
- [PERFORMANCE_AND_CONTEXT.md](../PERFORMANCE_AND_CONTEXT.md)
- [research/edge-ai-2026.md](../research/edge-ai-2026.md)

## Revision History

| Date | Change |
|---|---|
| 2026-06-30 | Accepted Local 12 and Local 16 as first Gemma 4 12B QAT certification profiles. |
