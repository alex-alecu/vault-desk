# ADR 0013: First Desktop Runtime

Date: 2026-07-11

## Status

Accepted as first certification target

## Context

The product strategy calls for one supported model/runtime stack before adding alternatives. Earlier documents described MLX-family serving as the first Apple Silicon direction while the implementation plan selected node-llama-cpp and official QAT GGUF assets. Leaving both as simultaneous first choices would double packaging, memory, context, structured-output, and correctness certification before the first workflow is proven.

Vault Desk also needs the same grammar-enforced structured-output and function-calling semantics on its initial Windows and macOS paths. Runtime-specific behavior must remain behind an adapter so later optimization does not change product contracts.

## Decision

The first Windows and macOS desktop certification target is node-llama-cpp running the pinned official Gemma 4 12B QAT Q4_0 GGUF inside a supervised inference worker.

The first retrieval path uses EmbeddingGemma through the same runtime family when redistribution and packaging review permits it.

The runtime adapter exposes model loading, structured generation, embeddings, cancellation, resource reporting, health, and disposal without exposing node-llama-cpp types to Vault Core.

Runtime builds, model hashes, grammar conversion behavior, context configuration, and memory-affecting options are pinned and recorded in benchmark reports.

MLX-family serving remains a later Apple Silicon optimization candidate. It may be added only behind the same adapter and must pass the complete workflow, citation, verification, compaction, offline, and package suite before becoming a certified alternative. It is not required for the first Community Desktop MVP.

## Consequences

Positive:

- Keeps the first certification matrix to one runtime and model format.
- Uses the same structured-output path on Windows and macOS.
- Avoids maintaining parallel GGUF and MLX model packages before product validation.
- Preserves future runtime replacement through a narrow adapter.

Negative:

- May leave Apple-specific performance improvements unrealized in the first release.
- Native build and GPU backend behavior still differ across Metal, CUDA, and Vulkan.
- The runtime must pass Electron packaging and worker-process validation on every certified platform.

## Required Validation

- Native load and structured-generation smoke tests on initial Windows and macOS targets in M2.
- Local 12 and Local 16 memory, context, cancellation, crash, and soak tests.
- Packaged offline first-launch tests with the exact pinned runtime and model artifacts.
- A superseding ADR before any second runtime is called certified.

## Revision History

| Date | Change |
|---|---|
| 2026-07-11 | Accepted node-llama-cpp and the official QAT GGUF as the first cross-platform desktop runtime target. |
