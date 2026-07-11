# ADR 0004: Hardware Abstraction

Created: 2026-07-10

Status: Proposed

## Context

Vault Desk should support Apple, AMD, and NVIDIA hardware. No single vendor path should become the permanent product identity.

The local AI runtime market is changing quickly, and runtime support differs across platforms.

## Decision

Vault Desk will use a hardware-aware runtime adapter strategy.

The user-facing product should expose capability tiers and workload guarantees, not low-level model or runtime choices.

Planned initial runtime directions:

- Apple Silicon: MLX-family path first.
- Windows with NVIDIA: llama.cpp or Ollama-compatible path first.
- AMD desktop: llama.cpp with HIP or Vulkan first.
- Office appliance or stronger server: vLLM-class path where validated.

## Consequences

Positive:

- Keeps the community platform hardware-agnostic.
- Allows certified hardware tiers.
- Avoids vendor lock-in.

Negative:

- More testing work.
- More runtime adapter complexity.
- Different platforms may have different feature timing.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial ADR created. |
