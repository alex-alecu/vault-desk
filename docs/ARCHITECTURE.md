# Architecture

Created: 2026-06-29

Vault Desk should be an offline-first, cross-vendor desktop and appliance platform for professional document work.

The architecture should separate the model, document reader, control plane, and tool loop. This prevents the product from becoming a fragile wrapper around one local model runtime.

The current strategic constraint is stronger than the initial architecture: Vault Desk should standardize on one primary model family, the Gemma family, with different certified profiles for 16 GB and 64 GB systems. The product should vary quantization, active context, retrieval budget, verification depth, and concurrency before it varies model families.

## Architectural Goals

- Run useful workflows locally on Windows and macOS.
- Support heterogeneous Apple, NVIDIA, and AMD hardware.
- Keep documents private and local by default.
- Provide strong provenance through citations, audit trails, and replayable traces.
- Keep first-token latency and streaming responsiveness high.
- Degrade gracefully within the Gemma family from 12B QAT to larger 26B or 31B profiles only when hardware supports it.
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
- Tool registry.
- Policy checks.
- Approval flow.
- Audit events.
- Model routing.
- Health checks.
- Local configuration.

This is the core future TypeScript/Node harness area.

### Inference Plane

The inference plane hosts local Gemma-family model runtimes through adapter boundaries.

Expected model roles:

- Interactive chat and synthesis.
- Embeddings for retrieval.
- Tool routing or function calling.
- Safety classification.
- Selective multimodal page inspection.

Current target profiles:

- 16 GB local profile: Gemma 4 12B QAT as the default reasoning and synthesis model, with bounded active context and retrieval-first prompting.
- 64 GB workstation or appliance profile: the same Gemma 4 12B QAT with larger context, wider retrieval, deeper verification, and more concurrency; optionally Gemma 4 26B A4B or 31B for certified higher-synthesis tiers.
- Retrieval profile: EmbeddingGemma as the default dense encoder, paired with lexical search and vector compression.

See [MODEL_STRATEGY.md](MODEL_STRATEGY.md).

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
- Document ingestion worker.
- OCR and layout worker.
- Indexing and retrieval service.
- Summary tree builder.
- Claim and citation verifier.
- Model router.
- Prompt and context builder.
- Tool policy engine.
- Approval service.
- Tool sandbox.
- Export service.
- Audit log.
- Backup and restore service.
- Update manager.
- Diagnostics service.

These are logical modules. They are not implementation folders yet.

## Runtime Strategy

The runtime strategy should be hardware-aware:

- Apple Silicon: MLX-family local serving first for supported Gemma profiles.
- Windows with NVIDIA: llama.cpp or Ollama-style GGUF serving first for 12B QAT, with a vLLM-class path for certified 64 GB appliances where validated.
- AMD desktop: llama.cpp through HIP or Vulkan first for 12B QAT.
- Shared office appliance or server: vLLM-class serving where validated for 12B, 26B, or 31B profiles.
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
9. Prompt builder sends selected evidence, task instructions, and output schema.
10. Model returns an answer, structured extraction, summary, or proposed tool call.
11. Verifier checks claims, citations, calculations, table references, and unsupported statements.
12. Policy engine validates tool requests and may ask for approval.
13. Tool sandbox executes approved actions.
14. Audit log records request, evidence, verification results, tools, timings, and outputs.
15. UI streams answer, citations, previews, diffs, verification warnings, and exports.

## Desktop And Appliance Compatibility

The same architecture should support:

- Single-user desktop mode.
- Personal computer bundle mode.
- Office appliance mode.

The difference is deployment and governance, not a completely separate product.

Desktop mode can use local encrypted state and local workspaces. Office mode adds organization management, identity, shared storage, central backup, permission-aware retrieval, and administrative controls.

## Key Boundaries

- The model proposes; the application decides.
- The document plane extracts and cites; the model synthesizes.
- The verifier checks; the model does not certify itself.
- Tools are typed and policy-gated.
- Business controls are modular.
- Runtime adapters are replaceable.
- User-facing workflows hide infrastructure vocabulary.

## Open Architecture Questions

- Exact open-source license.
- Exact community versus business module boundary.
- Gemma 4 runtime validation matrix for 12B QAT on 16 GB and 12B/26B/31B on 64 GB.
- Exact 64 GB default profile: larger-context 12B QAT, 26B A4B, or 31B dense.
- Whether desktop shell should be Tauri, Electron, or another native shell.
- Whether office documents remain on NAS storage or are copied into appliance-managed storage.
- Backup and encryption design.
- Initial accounting integrations.
- Country-specific compliance needs.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial architecture document created from supplied concept and research material. |
| 2026-06-29 | Updated architecture around Gemma-family model profiles, huge-document processing, summary trees, and claim verification. |
