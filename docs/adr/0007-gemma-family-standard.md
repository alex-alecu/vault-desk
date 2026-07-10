# ADR 0007: Gemma Family Standard

Created: 2026-06-29

Status: Accepted, amended by [ADR 0009](0009-12-16gb-gemma-context-standard.md)

## Context

The original architecture allowed broad model abstraction. That remains useful internally, but Vault Desk needs a simpler and more supportable product identity.

The current research focus is Gemma 4 12B QAT for Local 12 and Local 16 systems, with EmbeddingGemma for retrieval and Gemma-family tool and safety capabilities where validated.

## Decision

Vault Desk will standardize its first certified architecture around the Gemma family.

The first product profiles are:

- Gemma 4 12B QAT on 12 GB systems.
- Gemma 4 12B QAT on 16 GB systems.
- Context size as the only product capability difference between Local 12 and Local 16.
- EmbeddingGemma as the default dense encoder.

Gemma 4 31B dense, Gemma 4 26B A4B, and larger-context appliance profiles are deferred research paths.

The runtime adapter layer remains replaceable, but the product should not expose arbitrary model-family selection to ordinary users.

## Consequences

Positive:

- Clearer support matrix.
- Easier benchmarking and certification.
- More consistent behavior across hardware tiers.
- Simpler product message.
- Better chance of building robust document-specific evaluations.

Negative:

- Less flexibility for users who prefer other model families.
- Gemma runtime support becomes a gating risk.
- The product must validate whether Gemma 4 12B QAT fits Local 12 and Local 16 with enough active context, latency, and compaction stability.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial ADR created. |
| 2026-06-30 | Accepted Gemma-family standard and amended first certified profiles through ADR 0009. |
