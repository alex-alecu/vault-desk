# Architecture

Created: 2026-06-29

Vault Desk should be an offline-first, cross-vendor desktop and appliance platform for professional document work.

The architecture should separate the model, document reader, control plane, and tool loop. This prevents the product from becoming a fragile wrapper around one local model runtime.

## Architectural Goals

- Run useful workflows locally on Windows and macOS.
- Support heterogeneous Apple, NVIDIA, and AMD hardware.
- Keep documents private and local by default.
- Provide strong provenance through citations, audit trails, and replayable traces.
- Keep first-token latency and streaming responsiveness high.
- Degrade gracefully from smaller local models to stronger local or hosted options only when explicitly allowed.
- Support both single-user desktop and multi-user office appliance modes.

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

The inference plane hosts one or more local model runtimes. The initial research points toward a tiered Gemma-family stack, but the product should not permanently depend on one model family.

Expected model roles:

- Interactive chat and synthesis.
- Embeddings for retrieval.
- Tool routing or function calling.
- Safety classification.
- Selective multimodal page inspection.

### Document Plane

The document plane ingests, parses, indexes, retrieves, and cites evidence from files.

It should prefer:

1. Native extraction.
2. Layout-aware parsing.
3. OCR fallback.
4. Selective multimodal inspection only when needed.
5. Hybrid retrieval.
6. Evidence-linked response generation.

The document reader is not the model. The model reasons over selected evidence and tool results.

## Core Services

Planned services and modules:

- Local API.
- Session manager.
- Workspace manager.
- Document ingestion worker.
- OCR and layout worker.
- Indexing and retrieval service.
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

- Apple Silicon: MLX-family local serving first.
- Windows with NVIDIA: llama.cpp or Ollama-style GGUF serving first.
- AMD desktop: llama.cpp through HIP or Vulkan first.
- Shared office appliance or server: vLLM-class serving where validated.
- Hosted or hybrid escalation: only for explicitly allowed hard tasks.

See [HARDWARE.md](HARDWARE.md) and [research/local-ai-runtimes.md](research/local-ai-runtimes.md).

## Data Flow

High-level flow:

1. User selects files, folders, or a workflow.
2. Control plane creates a job and applies workspace policy.
3. Document plane extracts text, structure, tables, regions, and OCR where needed.
4. Chunk metadata is stored with page, section, table, region, parser, and confidence information.
5. Retrieval selects evidence using dense and lexical search.
6. Model router selects the appropriate model profile.
7. Prompt builder sends selected evidence and task instructions.
8. Model returns an answer or proposed tool call.
9. Policy engine validates and may ask for approval.
10. Tool sandbox executes approved actions.
11. Audit log records request, evidence, tools, timings, and outputs.
12. UI streams answer, citations, previews, diffs, and exports.

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
- Tools are typed and policy-gated.
- Business controls are modular.
- Runtime adapters are replaceable.
- User-facing workflows hide infrastructure vocabulary.

## Open Architecture Questions

- Exact open-source license.
- Exact community versus business module boundary.
- First model family and validation matrix.
- Whether desktop shell should be Tauri, Electron, or another native shell.
- Whether office documents remain on NAS storage or are copied into appliance-managed storage.
- Backup and encryption design.
- Initial accounting integrations.
- Country-specific compliance needs.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial architecture document created from supplied concept and research material. |
