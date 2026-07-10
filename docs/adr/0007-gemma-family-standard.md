# ADR 0007: Gemma Family Standard

Created: 2026-06-29

Status: Proposed

## Context

The original architecture allowed broad model abstraction. That remains useful internally, but Vault Desk needs a simpler and more supportable product identity.

The current research focus is Gemma 4 12B QAT for 16 GB systems and Gemma 4 12B, 26B, or 31B on 64 GB systems, with EmbeddingGemma for retrieval and Gemma-family tool and safety capabilities where validated.

## Decision

Vault Desk will standardize its first certified architecture around the Gemma family.

The first product profiles are:

- Gemma 4 12B QAT on 16 GB systems.
- Gemma 4 12B QAT with larger context and deeper verification on 64 GB systems.
- Gemma 4 31B dense as a 64 GB high-synthesis candidate.
- Gemma 4 26B A4B as a 64 GB throughput candidate.
- EmbeddingGemma as the default dense encoder.

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
- The product must validate whether 26B or 31B adds enough value on 64 GB systems.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial ADR created. |
