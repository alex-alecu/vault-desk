# Hardware

Created: 2026-07-10

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

- Useful operation on 12 GB and 16 GB discrete VRAM targets.
- Better capability on larger unified-memory or workstation systems.
- Dynamic capability detection based on available memory and runtime support.

The product should degrade by reducing active context pressure, multimodal usage, or concurrency rather than exposing low-level runtime choices to ordinary users. Local 12 and Local 16 should not differ by verification strictness, citation requirements, supported workflows, or safety policy.

Current model target:

- Gemma 4 12B QAT as the first Local 12 and Local 16 certified profile.
- Approximate Q4_0 model-load memory target: 6.7 GB before KV cache and product overhead.
- Retrieval-first prompting and bounded active context.
- One foreground reasoning job by default.
- Background ingestion throttled around available memory.
- Local 12 initial active-context target: 32K, with 64K as a stretch target.
- Local 16 initial active-context target: 64K, with 128K as a stretch target.
- One first desktop runtime and model format across Windows and macOS: node-llama-cpp with the pinned official Gemma 4 QAT GGUF, per [ADR 0013](adr/0013-first-desktop-runtime.md).
- A hardware capability check that classifies the current machine as Certified, Compatible, or Experimental before the user starts a model-dependent workflow.

See [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md).

## Personal Computer Target

Initial personal systems should be standard Windows desktops or mini-PCs with high memory and validated local runtimes.

They should:

- Work as ordinary computers.
- Include Vault Desk and validated models.
- Be encrypted and recoverable.
- Ship with benchmarked performance.
- Default automatically to the validated bundled model. If a build includes multiple approved models, expose only those installed choices; a single-model build shows static model text with no selector.

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

Current appliance stance:

- Do not choose a 64 GB default SKU before Local 12 and Local 16 are validated.
- Treat Gemma 4 12B QAT with larger context and concurrency as the conservative later appliance baseline.
- Treat Gemma 4 31B dense QAT and Gemma 4 26B A4B QAT as later research candidates.
- Do not let larger-model appliance work change the desktop architecture.

The first office appliance should benchmark from real workflow demand, not from model-size appeal.

## Runtime Implications

Planned first-choice runtime directions:

- Apple Silicon: node-llama-cpp through Metal with the pinned official QAT GGUF first; MLX-family serving is a later adapter-backed optimization candidate.
- Windows with NVIDIA: node-llama-cpp/llama.cpp-compatible GGUF through CUDA first, with Ollama-compatible serving only when model packaging and context behavior are explicit, telemetry is absent or provably disabled, and no telemetry network path exists.
- Windows with supported AMD hardware: node-llama-cpp/llama.cpp with HIP or Vulkan first.
- Shared appliance or Linux server: vLLM-class serving only after Local 12 and Local 16 are validated and appliance profiles are re-opened.
- NVIDIA-specific optimization: later, after exact model support is proven.

Runtime certification must include the model format, quantization type, maximum stable active context, KV-cache behavior, multimodal behavior, and document-worker memory overhead.

Local 12 and Local 16 certification must also include context-compaction stability. A profile is not certified if it works only until the first context window fills.

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
- Claim verification failure rate.
- Folder-level summary coverage.
- Large-folder resumability.
- Stable multi-compaction behavior over long folder sessions.

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
| 2026-07-10 | Initial hardware strategy document created from supplied concept material. |
| 2026-07-10 | Added Gemma 4 12B QAT 16 GB target and 64 GB Gemma-family validation profiles. |
| 2026-07-10 | Added Q4_0 model-load memory caveats for Gemma 4 12B, 26B A4B, and 31B. |
| 2026-07-10 | Recentered certification on Local 12 and Local 16 with Gemma 4 12B QAT and context size as the only product capability difference. |
| 2026-07-11 | Aligned the first desktop runtime with ADR 0013 and made hardware capability classification an implementation gate. |
