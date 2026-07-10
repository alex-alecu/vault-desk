# TypeScript Node Harness

Created: 2026-06-29

This document prepares for future implementation. It is not implementation scaffolding.

When Vault Desk moves from documentation to code, the harness and local orchestration layer should be TypeScript running on Node.js.

## Scope Of The Harness

The TypeScript/Node harness should eventually own:

- Local API.
- Session orchestration.
- Workspace state.
- Job queue coordination.
- Resumable folder job manifests.
- Tool registry.
- Policy checks.
- Approval flow.
- Model runtime adapters.
- Document pipeline orchestration.
- Retrieval orchestration.
- Summary tree orchestration.
- Claim verification orchestration.
- Audit events.
- Export coordination.
- Diagnostics.

The harness should not directly become:

- A model runtime.
- An OCR engine.
- A vector database implementation.
- A UI framework.
- A privileged shell bridge.

Those should be adapters, services, or tools behind typed boundaries.

## Why TypeScript Under Node

TypeScript under Node is the planned baseline because it gives:

- Strong typing for tool schemas and policy decisions.
- Good desktop integration options.
- Mature local API patterns.
- Straightforward streaming support.
- Broad ecosystem support for document, filesystem, worker, and observability integration.
- Easier cross-platform packaging than a server-only stack.

## Future Package Direction

Do not create packages yet.

When code begins, likely logical package boundaries include:

- Desktop shell.
- Local API.
- Orchestrator.
- Tool registry.
- Policy engine.
- Audit events.
- Runtime adapters.
- Document adapters.
- Workflow definitions.
- Document-set manifests.
- Parser adapter contracts.
- Retrieval adapter contracts.
- Verifier contracts.
- Shared types.
- Test fixtures and evaluation harness.

These are logical boundaries only. They should be revisited before scaffolding.

## Runtime Adapter Principle

The Node harness should call local inference servers through stable adapter interfaces rather than embedding one vendor runtime deeply into the product.

Candidate adapter families:

- MLX-family local serving on macOS.
- llama.cpp-compatible serving.
- Ollama-compatible serving.
- vLLM-compatible serving for appliances or stronger local servers.
- Hosted fallback adapters only when explicitly enabled.

The first certified adapters should be evaluated against the Gemma 4 12B QAT 16 GB profile and the 64 GB Gemma-family profiles documented in [MODEL_STRATEGY.md](MODEL_STRATEGY.md).

## Document Pipeline Principle

The Node harness should coordinate document processing without becoming the parser itself.

Planned adapter categories:

- MarkItDown adapter for broad first-pass conversion.
- Docling adapter for layout-aware PDFs and complex documents.
- Unstructured adapter for fallback partitioning and parser comparison.
- Native spreadsheet adapter for XLSX, XLS, CSV, formulas, sheets, rows, and cells.
- OCR adapter for scanned pages and low-confidence extraction.
- Gemma multimodal inspection adapter for ambiguous page regions.

The harness should persist a document-set manifest so huge folder jobs can resume after failure.

## Retrieval And Verification Principle

The harness should coordinate:

- EmbeddingGemma indexing.
- Lexical indexing.
- Optional turbovec-style compressed vector acceleration.
- Evidence pack assembly.
- Claim parsing.
- Citation checks.
- Deterministic spreadsheet and arithmetic checks.
- Contradiction search.
- Human review queues.

The verifier must be a separate workflow stage. It must not rely on a single "please verify" model prompt as proof of correctness.

## Tool Registry Principle

Every tool should have:

- A name.
- A version.
- A typed input schema.
- A typed output schema.
- Required permissions.
- Preview behavior.
- Approval behavior.
- Resource limits.
- Audit behavior.
- Rollback behavior when applicable.

The model can request a tool. The harness decides whether it is valid, allowed, previewed, approved, executed, logged, or rejected.

## Testing Direction

Future tests should cover:

- Policy decisions.
- Path scope enforcement.
- Tool schema validation.
- Approval flow.
- Audit event creation.
- Document pipeline routing.
- Retrieval reproducibility.
- Summary tree invalidation.
- Claim verification.
- Export correctness.
- Runtime adapter failure handling.
- Offline mode.

## No-Code Constraint

Do not add:

- package.json.
- tsconfig.json.
- source directories.
- test files.
- scripts.
- lockfiles.
- generated templates.

Those belong to a future implementation phase.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial future TypeScript/Node harness direction created. |
| 2026-06-29 | Added future harness responsibilities for folder manifests, document adapters, retrieval acceleration, summary trees, and claim verification. |
