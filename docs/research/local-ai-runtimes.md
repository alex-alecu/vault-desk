# Local AI Runtimes

Created: 2026-06-29

This document summarizes the supplied runtime research. Runtime support changes quickly and must be revalidated before implementation.

## Model Stack Direction

The current architecture recommends a Gemma-family local model stack:

- Gemma 4 12B QAT for the first 16 GB certified local profile.
- Gemma 4 12B QAT, 26B A4B, or 31B dense for 64 GB certified profiles.
- EmbeddingGemma for retrieval.
- Gemma 4 native function calling for tool proposals.
- ShieldGemma or Gemma-family safety classification where validated.
- DiffusionGemma as an experimental fast-generation path, not the first correctness path.

The exact runtime remains an implementation decision. The product family should stay Gemma-centered unless a future ADR changes that direction.

## Runtime Direction By Platform

### macOS

Apple Silicon should prefer an Apple-native MLX-family runtime path first.

The main product reason is unified memory and platform fit.

### Windows With NVIDIA

Windows with NVIDIA should prefer llama.cpp or Ollama-compatible local serving first for the 16 GB Gemma 4 12B QAT profile.

The main product reason is low-friction local deployment and a practical low-VRAM path.

64 GB NVIDIA appliances should evaluate vLLM-class serving for larger context, stronger scheduling, and cache reuse.

### AMD Desktop

AMD desktop support should begin with llama.cpp-style serving through HIP or Vulkan where validated.

ROCm and advanced serving should be treated cautiously until specific hardware and OS combinations are proven.

### Office Appliance Or Server

For stronger office hardware, vLLM-class serving may become the better throughput and scheduling path. It should be benchmarked with Gemma 4 12B QAT, 26B A4B, and 31B dense before being certified.

### Hosted Escalation

Hosted escalation should be an explicit optional path for hard tasks, not a default product dependency.

## Performance Priorities

Suggested tuning order:

1. Use quantized main models for local profiles.
2. Keep active context small.
3. Lean on retrieval instead of raw-window stuffing.
4. Use prefix or prompt caching where supported.
5. Use chunked prefill where supported.
6. Use memory mapping carefully on desktop runners.
7. Add speculative decoding only after quality and stability are validated.
8. Treat DiffusionGemma as a separate speed experiment until it passes the same verification suite.

## Benchmark Priorities

Measure:

- First-token latency.
- Inter-token latency.
- Tokens per second.
- End-to-end workflow latency.
- Peak VRAM and RAM.
- Retrieval quality.
- Citation precision.
- Tool-loop success rate.
- Stability under repeated local jobs.
- Stable active context under document-worker memory load.
- Cache reuse on repeated folder questions.
- Citation and verifier failure rates.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial runtime research summary created from supplied deep research report. |
| 2026-06-29 | Updated around Gemma 4 QAT 16 GB and 64 GB profiles, EmbeddingGemma, and DiffusionGemma validation. |
