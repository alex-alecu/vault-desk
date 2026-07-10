# Local AI Runtimes

Created: 2026-06-29

This document summarizes the supplied runtime research. Runtime support changes quickly and must be revalidated before implementation.

## Model Stack Direction

The supplied research recommends a tiered local model stack:

- Default interactive model for constrained systems.
- Enhanced model profile for stronger 16 GB or unified-memory systems.
- Local embedding model for retrieval.
- Tool-routing or function-calling model capability.
- Local safety model or classifier for guardrails.

The exact model family remains an implementation decision, though the supplied research focused on Gemma-family models.

## Runtime Direction By Platform

### macOS

Apple Silicon should prefer an Apple-native MLX-family runtime path first.

The main product reason is unified memory and platform fit.

### Windows With NVIDIA

Windows with NVIDIA should prefer llama.cpp or Ollama-compatible local serving first.

The main product reason is low-friction local deployment and a practical low-VRAM path.

### AMD Desktop

AMD desktop support should begin with llama.cpp-style serving through HIP or Vulkan where validated.

ROCm and advanced serving should be treated cautiously until specific hardware and OS combinations are proven.

### Office Appliance Or Server

For stronger office hardware, vLLM-class serving may become the better throughput and scheduling path.

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

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial runtime research summary created from supplied deep research report. |
