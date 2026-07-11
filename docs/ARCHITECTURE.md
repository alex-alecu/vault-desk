# Architecture

Created: 2026-07-10

Vault Desk should be an offline-first, cross-vendor desktop and appliance platform for professional document work.

The architecture should separate the model, document reader, control plane, and tool loop. This prevents the product from becoming a fragile wrapper around one local model runtime.

The current strategic constraint is stronger than the initial architecture: Vault Desk should standardize on one primary model family, the Gemma family, with first certified profiles for 12 GB and 16 GB VRAM systems. Local 12 and Local 16 should use the same Gemma 4 12B QAT model and differ only by certified active context size.

The first desktop implementation decisions are now recorded in [ADR 0010](adr/0010-electron-and-local-transport.md), [ADR 0011](adr/0011-workspace-state-and-recovery.md), [ADR 0012](adr/0012-worker-isolation-and-untrusted-documents.md), and [ADR 0013](adr/0013-first-desktop-runtime.md).

## Architectural Goals

- Run useful workflows locally on Windows and macOS.
- Support heterogeneous Apple, NVIDIA, and AMD hardware.
- Keep documents private and local by default.
- Provide strong provenance through citations, audit trails, and replayable traces.
- Keep first-token latency and streaming responsiveness high.
- Degrade gracefully by reducing active context pressure, multimodal scope, and concurrency before changing model behavior.
- Support both single-user desktop and multi-user office appliance modes.
- Read, summarize, verify, and export work across folders containing tens of large PDFs, Office files, spreadsheets, CSVs, images, and mixed document sets.

## Four-Plane System

### Desktop Shell

The desktop shell provides the user experience, document selection, workflow controls, evidence inspection, approvals, and export surfaces.

It should not contain privileged business logic. It talks to the local control plane through a typed local API.

### Local Control Plane

The control plane owns:

- Sessions.
- Workspaces.
- Job queues.
- Schema-versioned workspace state and migrations.
- Tool registry.
- Policy checks.
- Approval flow.
- Audit events.
- Model routing.
- Health checks.
- Worker supervision and resource scheduling.
- Local configuration.

This is the core future TypeScript/Node harness area.

### Inference Plane

The inference plane hosts local Gemma-family model runtimes through adapter boundaries.

The first desktop certification target is node-llama-cpp with the official Gemma 4 QAT GGUF in a supervised worker on both Windows and macOS. MLX-family serving remains a later adapter-backed Apple Silicon optimization rather than a parallel first implementation. See [ADR 0013](adr/0013-first-desktop-runtime.md).

Expected model roles:

- Interactive chat and synthesis.
- Embeddings for retrieval.
- Tool routing or function calling.
- Safety classification.
- Selective multimodal page inspection.

Current target profiles:

- Local 12 profile: Gemma 4 12B QAT as the default reasoning and synthesis model, with bounded active context and retrieval-first prompting.
- Local 16 profile: the same Gemma 4 12B QAT model, workflows, retrieval, verification, safety, and approval policy with a larger certified active context.
- Retrieval profile: EmbeddingGemma as the default dense encoder, paired with lexical search and vector compression.

See [MODEL_STRATEGY.md](MODEL_STRATEGY.md), [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md), and [adr/0009-12-16gb-gemma-context-standard.md](adr/0009-12-16gb-gemma-context-standard.md).

### Document Plane

The document plane ingests, parses, indexes, retrieves, summarizes, verifies, and cites evidence from files and folders.

It should prefer:

1. File inventory, hashing, deduplication, and manifest creation.
2. Native extraction for Office, CSV, text, and digital PDFs.
3. Layout-aware parsing for complex PDFs, tables, forms, and reading order.
4. OCR fallback for scanned pages and low-confidence extraction.
5. Structured spreadsheet and CSV parsing for formulas, rows, sheets, and cell coordinates.
6. Structure-aware chunking and hierarchical summaries.
7. Hybrid retrieval with source anchors.
8. Selective multimodal inspection only for pages or regions that need it.
9. Claim-level verification before export.
10. Evidence-linked response generation.

The document reader is not the model. The model reasons over selected evidence and tool results.

See [DOCUMENT_ENGINE.md](DOCUMENT_ENGINE.md) and [RETRIEVAL_AND_VERIFICATION.md](RETRIEVAL_AND_VERIFICATION.md).

## Core Services

Planned services and modules:

- Local API.
- Session manager.
- Workspace manager.
- Workspace store and migration manager.
- Document ingestion worker.
- OCR and layout worker.
- Indexing and retrieval service.
- Summary tree builder.
- Claim and citation verifier.
- Model router.
- Prompt and context builder.
- Context compaction manager.
- Tool policy engine.
- Approval service.
- Tool sandbox.
- Export service.
- Audit log.
- Backup and restore service.
- Update manager.
- Diagnostics service.
- Worker supervisor and resource scheduler.

These are logical modules. They are not implementation folders yet.

## Runtime Strategy

The runtime strategy should be hardware-aware without multiplying first-release runtimes:

- Apple Silicon: node-llama-cpp through Metal with the pinned official QAT GGUF for the first certification; MLX-family serving may be evaluated later behind the same adapter.
- Windows with NVIDIA: node-llama-cpp/llama.cpp-compatible GGUF through CUDA first, with Ollama-compatible serving only when model packaging, context behavior, and telemetry controls are explicit.
- Windows with supported AMD hardware: node-llama-cpp/llama.cpp through HIP or Vulkan first.
- Shared office appliance or server: vLLM-class serving only after Local 12 and Local 16 are validated and appliance profiles are re-opened.
- Hosted or hybrid escalation: only for explicitly allowed hard tasks.

See [HARDWARE.md](HARDWARE.md) and [research/local-ai-runtimes.md](research/local-ai-runtimes.md).

## Data Flow

High-level flow:

1. User selects files, folders, or a workflow.
2. Control plane creates a job and applies workspace policy.
3. Document plane inventories files, records hashes, and creates a resumable processing manifest.
4. Document plane extracts text, structure, tables, cells, regions, and OCR where needed.
5. Chunk metadata is stored with document, page, section, table, cell, region, parser, and confidence information.
6. Summary tree builder creates page, section, document, and folder summaries with source anchors.
7. Retrieval selects evidence using dense vectors, lexical search, filters, and optional compressed-vector acceleration.
8. Model router selects the appropriate Gemma profile for hardware and task risk.
9. Context manager compacts session, task, evidence, artifact, preference, and warning state when active context approaches the certified limit.
10. Prompt builder sends selected evidence, task instructions, current state, and output schema.
11. Model returns an answer, structured extraction, summary, or proposed tool call.
12. Verifier checks claims, citations, calculations, table references, and unsupported statements.
13. Policy engine validates tool requests and may ask for approval.
14. Tool sandbox executes approved actions.
15. Audit log records request, evidence, verification results, compaction records, tools, timings, and outputs.
16. UI streams answer, citations, previews, diffs, verification warnings, and exports.

## Desktop And Appliance Compatibility

The same architecture should support:

- Single-user desktop mode.
- Personal computer bundle mode.
- Office appliance mode.

The difference is deployment and governance, not a completely separate product.

For the first desktop MVP, local workspace protection relies on operating-system accounts, per-user permissions, and encrypted system storage. Application-managed encryption requires a later threat model covering keys, recovery, backup, and migration. Office mode adds organization management, identity, shared storage, central backup, permission-aware retrieval, and administrative controls.

## Key Boundaries

- The model proposes; the application decides.
- The document plane extracts and cites; the model synthesizes.
- The verifier checks; the model does not certify itself.
- Tools are typed and policy-gated.
- Business controls are modular.
- Runtime adapters are replaceable.
- The live model context is a working set, not durable product memory.
- User-facing workflows hide infrastructure vocabulary.

## Open Architecture Questions

- Exact open-source license.
- Position on MCP (Model Context Protocol): every major incumbent now speaks MCP; Vault Desk must either adopt it behind the policy and approval layer or deliberately exclude it, with the rationale recorded in an ADR. The typed, policy-gated tool boundary must not be weakened either way.
- Exact community versus business module boundary.
- Gemma 4 runtime validation matrix for 12B QAT on 12 GB and 16 GB targets.
- Exact certified active-context targets after real hardware benchmarks.
- Whether and when to re-open 64 GB appliance profiles.
- Whether office documents remain on NAS storage or are copied into appliance-managed storage.
- Backup design and future application-managed encryption.
- Initial accounting integrations.
- Country-specific compliance needs.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial architecture document created from supplied concept and research material. |
| 2026-07-10 | Updated architecture around Gemma-family model profiles, huge-document processing, summary trees, and claim verification. |
| 2026-07-10 | Recentered first architecture target on Local 12 and Local 16 Gemma 4 12B QAT profiles and added context compaction as a core service. |
| 2026-07-11 | Added the MCP position as an open architecture question following competitor research. |
| 2026-07-11 | Closed the first desktop shell, local transport, runtime, workspace-state, and worker-isolation decisions through ADRs 0010-0013. |
