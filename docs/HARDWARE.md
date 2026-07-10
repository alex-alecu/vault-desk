# Hardware

Created: 2026-06-29

Vault Desk should avoid manufacturing hardware initially. The product should own the software, workflows, customer experience, validation process, and support relationship while using OEMs or specialist builders for assembly, warranty, shipping, and replacement.

## Hardware Principles

- Market capabilities and supported workloads, not VRAM or parameter counts.
- Keep the community platform hardware-agnostic.
- Certify a small number of configurations.
- Classify all other hardware honestly.
- Avoid large inventory.
- Separate manufacturer warranty from Vault Desk support.
- Treat performance guarantees as a product feature.

## Hardware Classes

### Certified

Tested by Vault Desk for specific model profiles and workflows.

Certified hardware should include:

- Known CPU, GPU, memory, storage, and OS configuration.
- Validated local inference runtime.
- Benchmark result.
- Supported workflow list.
- Support eligibility.
- Recovery path.

### Compatible

Expected to work based on specs and runtime support, but not fully validated for a support guarantee.

### Experimental

May work for technical users. No guarantee and limited support.

## Community Target

Earlier community targets:

- Useful operation on approximately 12-16 GB discrete VRAM.
- Better capability on larger unified-memory or workstation systems.
- Dynamic capability detection based on available memory and runtime support.

The product should degrade by reducing model size, active context, multimodal usage, or concurrency rather than exposing low-level choices to ordinary users.

## Personal Computer Target

Initial personal systems should be standard Windows desktops or mini-PCs with high memory and validated local runtimes.

They should:

- Work as ordinary computers.
- Include Vault Desk and validated models.
- Be encrypted and recoverable.
- Ship with benchmarked performance.
- Avoid user model selection.

Potential strategic fit:

- AMD high-memory unified-memory systems for compact personal or office boxes.
- NVIDIA systems for higher throughput office deployments.

## Office Appliance Target

Office appliances should be sized by workloads:

- Simultaneous users.
- Documents processed per hour.
- Maximum supported document sets.
- Expected report-generation time.
- Workflow packs enabled.
- Backup and storage needs.

Possible configurations:

- Compact AMD unified-memory mini workstation.
- NVIDIA GPU workstation for higher throughput.
- Larger NVIDIA appliance class for bigger models and concurrency.
- Later multi-node setups.

## Runtime Implications

Planned first-choice runtime directions:

- Apple Silicon: MLX-family path first.
- Windows with NVIDIA: llama.cpp or Ollama-style GGUF path first.
- AMD desktop: llama.cpp with HIP or Vulkan first.
- Shared appliance or Linux server: vLLM-class serving where validated.
- NVIDIA-specific optimization: later, after exact model support is proven.

## Benchmark Strategy

Benchmarks should measure:

- First-token latency.
- Inter-token latency.
- Tokens per second.
- End-to-end workflow latency.
- Peak VRAM and RAM.
- Indexing throughput.
- OCR throughput.
- Retrieval recall and citation precision.
- Tool-loop success rate.
- Crash and recovery behavior.

Tokens per second alone is not a product benchmark.

## Partnership Ladder

Recommended sequence:

1. Join vendor developer programs.
2. Request evaluation hardware and engineering contacts.
3. Build measurable workflow demonstrations.
4. Run small professional-office pilots.
5. Request pilot hardware, co-marketing, and OEM introductions.
6. Demonstrate that Vault Desk creates hardware demand.
7. Discuss strategic investment after traction.

Avoid company-wide exclusivity. Vendor-specific SKUs are acceptable, but the community product should remain hardware-agnostic.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial hardware strategy document created from supplied concept material. |
