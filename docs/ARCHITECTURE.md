# Architecture

Created: 2026-07-10

Vault Desk should be an offline-first, cross-vendor desktop and appliance platform for professional document work.

The architecture should separate the model, document reader, control plane, and tool loop. This prevents the product from becoming a fragile wrapper around one local model runtime.

The current strategic constraint: product contracts are model-agnostic with per-model certification and strong defaults, per [ADR 0016](adr/0016-model-agnostic-defaults-and-managed-downloads.md). The first certified profiles target 12 GB and 16 GB VRAM systems, both using Gemma 4 12B QAT as the default generation model and differing only by certified active context size.

The first desktop implementation decisions are recorded in [ADR 0010](adr/0010-electron-and-local-transport.md), [ADR 0011](adr/0011-workspace-state-and-recovery.md), [ADR 0012](adr/0012-worker-isolation-and-untrusted-documents.md), [ADR 0013](adr/0013-first-desktop-runtime.md), [ADR 0014](adr/0014-tauri-desktop-shell.md), and [ADR 0015](adr/0015-deterministic-document-tools-and-code-fallback.md). ADR 0014 supersedes the Electron portion of ADR 0010; its separate-daemon transport decision remains active.

## Architectural Goals

- Run useful workflows locally on Windows and macOS.
- Support heterogeneous Apple, NVIDIA, and AMD hardware.
- Keep documents private and local by default.
- Provide strong provenance through citations, audit trails, and replayable traces.
- Keep first-token latency and streaming responsiveness high.
- Degrade gracefully by reducing active context pressure, multimodal scope, and concurrency before changing model behavior.
- Support both single-user desktop and multi-user office appliance modes.
- Read, summarize, verify, and export work across folders containing tens of large PDFs, Office files, spreadsheets, CSVs, images, and mixed document sets.
- Install and use versioned domain reference libraries without internet access while preserving source provenance, rights, applicability, and exact bundle versions in citations.

## Four-Plane System

### Desktop Shell

The desktop shell uses Tauri v2 with a React/TypeScript frontend. It provides the user experience, native folder selection, workflow controls, evidence inspection, approvals, and export surfaces. The thin Rust host owns only window lifecycle, native dialogs, capability-scoped OS integration, Vault Core sidecar supervision, and connection bootstrap.

It contains no product workflows or policy. The webview has no generic shell, process, environment, network, or unrestricted filesystem access and talks to the local control plane through narrow typed Tauri commands and the versioned local daemon API. See [DESKTOP_DESIGN.md](DESKTOP_DESIGN.md) and [ADR 0014](adr/0014-tauri-desktop-shell.md).

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
- MicroVM lifecycle and guest-image verification.
- Typed external-connection brokering.
- Local configuration.

This is the core future TypeScript/Node harness area.

### Inference Plane

The inference plane hosts local model runtimes through model-agnostic adapter boundaries.

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
- Retrieval profile: Qwen3-Embedding-0.6B as the product-managed dense encoder, paired with lexical search and vector compression.

See [MODEL_STRATEGY.md](MODEL_STRATEGY.md), [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md), and [adr/0009-12-16gb-gemma-context-standard.md](adr/0009-12-16gb-gemma-context-standard.md).

### Document Plane

The document plane ingests, parses, indexes, retrieves, summarizes, verifies, and cites evidence from files and folders.

It also consumes installed Knowledge Bundles as a separate evidence scope. Knowledge Bundles are passive, immutable domain libraries; they do not add tools, prompts, workflows, approvals, or execution authority. Their source payloads and manifests are authoritative, while their chunks, embeddings, summaries, and indexes remain rebuildable derived state. See [KNOWLEDGE_BUNDLES.md](KNOWLEDGE_BUNDLES.md).

It should prefer:

1. File inventory, hashing, deduplication, and manifest creation.
2. Native extraction for Office, CSV, text, and digital PDFs.
3. Layout-aware parsing for complex PDFs, tables, forms, and reading order.
4. OCR fallback for scanned pages and low-confidence extraction.
5. Structured spreadsheet and CSV parsing for formulas, rows, sheets, and cell coordinates.
6. Deterministic typed search, filter, sort, join, comparison, aggregation, arithmetic, and export over canonical data.
7. Structure-aware chunking and hierarchical summaries.
8. Hybrid retrieval with source anchors.
9. Selective multimodal inspection only for pages or regions that need it.
10. Claim-level verification before export.
11. Evidence-linked response generation.
12. Generated code only as a policy-selected fallback for unsupported or novel transformations.

The document reader is not the model, and common document operations are not generated scripts. The model reasons over selected evidence and typed tool results. When deterministic capabilities are insufficient, a bounded code-interpreter job may generate and execute code in a fresh no-NIC microVM under [ADR 0015](adr/0015-deterministic-document-tools-and-code-fallback.md).

See [DOCUMENT_ENGINE.md](DOCUMENT_ENGINE.md) and [RETRIEVAL_AND_VERIFICATION.md](RETRIEVAL_AND_VERIFICATION.md).

### Hostile-Work Sandbox

Hostile document parsing and any future model-requested executable tool run inside a disposable microVM. The microVM has no virtual network device and receives only job-scoped read-only inputs, bounded ephemeral scratch storage, and a typed host/guest socket. It has no general proxy into the host network. This boundary is enforced by VM configuration rather than command, executable, destination, or protocol matching.

The code interpreter uses the same boundary but a distinct versioned guest role. It may run only pinned offline interpreters and libraries from the immutable image. Generated code, inputs, outputs, logs, resource use, and termination are audited. Its model requests are mediated through typed host/guest IPC to the host-native inference worker; no general model-server endpoint is exposed to the guest.

Vault Core owns a separate typed network broker for explicitly approved external integrations. The broker holds credentials, applies policy, validates destinations, and audits requests and results; it never exposes a general socket or fetch primitive to the model or microVM.

Hardware-accelerated inference remains a separate host-native supervised process for the first desktop runtime. It has no shell, tool execution, credentials, arbitrary workspace access, or network capability. See [ADR 0012](adr/0012-worker-isolation-and-untrusted-documents.md) and [ADR 0013](adr/0013-first-desktop-runtime.md).

## Core Services

Planned services and modules:

- Local API.
- Session manager.
- Workspace manager.
- Workspace store and migration manager.
- Document ingestion worker.
- Canonical document query service.
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
- Knowledge bundle catalog and importer.
- Diagnostics service.
- Worker supervisor and resource scheduler.
- MicroVM sandbox launcher.
- Bounded code-interpreter worker.
- External-connection broker.

These are logical modules. They are not implementation folders yet.

## Runtime Strategy

The runtime strategy should be hardware-aware without multiplying first-release runtimes:

- Apple Silicon: node-llama-cpp through Metal with the pinned official QAT GGUF for the first certification; MLX-family serving may be evaluated later behind the same adapter.
- Windows with NVIDIA: node-llama-cpp/llama.cpp-compatible GGUF through CUDA first, with Ollama-compatible serving only when model packaging and context behavior are explicit, telemetry is absent or provably disabled, and no telemetry network path exists.
- Windows with supported AMD hardware: node-llama-cpp/llama.cpp through HIP or Vulkan first.
- Shared office appliance or server: vLLM-class serving only after Local 12 and Local 16 are validated and appliance profiles are re-opened.
- Hosted or hybrid escalation: only for explicitly allowed hard tasks.

See [HARDWARE.md](HARDWARE.md) and [research/local-ai-runtimes.md](research/local-ai-runtimes.md).

## Data Flow

High-level flow:

1. User selects files, folders, a workflow, or installed domain libraries.
2. Control plane creates a job and applies workspace policy.
3. Document plane inventories files, records hashes, and creates a resumable processing manifest.
4. Vault Core stages authorized inputs and dispatches hostile parsing to a no-NIC microVM over typed host/guest IPC.
5. Document plane extracts text, structure, tables, cells, regions, and OCR where needed.
6. Deterministic document tools perform supported searches, filters, calculations, comparisons, and transformations over canonical data.
7. Chunk metadata is stored with document, page, section, table, cell, region, parser, and confidence information.
8. Summary tree builder creates page, section, document, and folder summaries with source anchors.
9. Retrieval applies workspace, bundle, jurisdiction, validity, source-authority, and permission filters, then selects evidence using dense vectors, lexical search, and optional compressed-vector acceleration.
10. Model router selects an installed, approved Gemma profile compatible with the build, hardware, and workflow.
11. Context manager compacts session, task, evidence, artifact, preference, and warning state when active context approaches the certified limit.
12. Prompt builder sends selected evidence, task instructions, current state, and output schema.
13. Model returns an answer, structured extraction, summary, or proposed tool call.
14. Policy selects deterministic tools by default and may route an unsupported transformation to the bounded code interpreter.
15. Verifier checks claims, citations, calculations, table references, generated-code results, and unsupported statements.
16. Policy engine validates consequential tool requests and may ask for approval.
17. Tool sandbox executes approved hostile work in a no-NIC microVM; approved external integrations go through the separate broker.
18. Audit log records request, evidence, verification results, compaction records, generated code, tools, timings, and outputs.
19. UI streams answer, citations, previews, diffs, verification warnings, and exports.

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
- Deterministic document tools handle supported operations; generated code handles only the bounded long tail.
- The verifier checks; the model does not certify itself.
- Tools are typed and policy-gated.
- Hostile parsing and executable tools cross a no-NIC microVM boundary.
- External connectivity exists only behind a typed Vault Core broker.
- Business controls are modular.
- Runtime adapters are replaceable.
- The live model context is a working set, not durable product memory.
- User-facing workflows hide infrastructure vocabulary.
- Knowledge Bundles provide passive evidence; Workflow Packs provide task and policy behavior.

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
| 2026-07-12 | Replaced process-only hostile-work isolation with a no-NIC microVM and separated approved external connectivity into a typed broker. |
| 2026-07-12 | Added installed offline Knowledge Bundles as a passive, separately scoped source for the document and retrieval planes. |
| 2026-07-13 | Replaced Electron with Tauri v2 and added deterministic document operations plus a no-NIC code-interpreter fallback. |
| 2026-07-15 | Applied ADR 0016: model-agnostic contracts with per-model certification, Gemma 4 12B QAT as the default generation model, and Qwen3-Embedding-0.6B as the product-managed encoder. |
