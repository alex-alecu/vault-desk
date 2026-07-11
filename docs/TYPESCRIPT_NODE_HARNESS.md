# TypeScript Node Harness

Created: 2026-07-10

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
- Context compaction orchestration.
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

The Node harness should call local inference runtimes through stable adapter interfaces rather than embedding one vendor runtime deeply into the product.

Candidate adapter families (support status verified 2026-07-11; see [research/local-ai-runtimes.md](research/local-ai-runtimes.md)):

- node-llama-cpp (MIT) as the first in-process adapter: loads Gemma 4 QAT GGUFs, enforces JSON-schema output via grammar-constrained sampling, and supports function calling, embeddings, reranking, and speculative decoding, with Metal, CUDA, and Vulkan builds and explicit Electron support.
- A supervised llama-server child process as the companion adapter for vision workloads (Gemma 4 multimodal, PaddleOCR-VL, Granite-Docling GGUF), because node-llama-cpp does not yet support image input.
- MLX-family local serving on macOS.
- Ollama-compatible serving.
- Google LiteRT-LM's OpenAI-compatible local server as an emerging Google-first adapter to track.
- vLLM-compatible serving for appliances or stronger local servers.
- Hosted fallback adapters only when explicitly enabled.

ONNX Runtime GenAI has no official Node.js bindings as of July 2026 and is not a candidate primary runtime.

The first certified adapters should be evaluated against the Local 12 and Local 16 Gemma 4 12B QAT profiles documented in [MODEL_STRATEGY.md](MODEL_STRATEGY.md) and [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md).

## Structured Output Principle

Structured output from local models must be enforced at the sampler, not requested in the prompt. llama.cpp converts JSON Schema to GBNF grammar and masks invalid tokens, making malformed JSON mechanically impossible. The harness should:

- Define every tool and extraction schema once, in TypeScript (Zod or equivalent), and derive both the grammar and the validator from it.
- Also describe the schema in the prompt, because the grammar is not visible to the model.
- Keep validate-and-retry as a semantic backstop for content that is syntactically valid but wrong.
- Track first-attempt schema validity as a benchmark metric.

## Document Pipeline Principle

The Node harness should coordinate document processing without becoming the parser itself.

Planned adapter categories (tool choices verified 2026-07-11; see [research/document-tools-2026.md](research/document-tools-2026.md)):

- Native Node adapters for born-digital files: pdf.js text layer, mammoth for DOCX, ExcelJS or SheetJS for spreadsheets, officeParser, and mailparser. These run in-process and cover most files without heavy tooling.
- Granite-Docling GGUF adapter for layout-aware PDFs and complex documents, served by the same llama.cpp runtime family as Gemma.
- PaddleOCR-VL adapter for scanned pages and low-confidence extraction, also served under llama.cpp.
- One sandboxed Python document-worker sidecar hosting the remaining Python parsers (Docling full pipeline, MarkItDown, Unstructured) behind a single process boundary, packaged with PyInstaller onedir or python-build-standalone and spawned as a managed child process.
- Native spreadsheet adapter for XLSX, XLS, CSV, formulas, sheets, rows, and cells.
- Gemma multimodal inspection adapter for ambiguous page regions.

Sidecar rule: at most one Python worker process, sandboxed, with typed IPC. Python dependencies must never leak into the harness's own runtime requirements.

The harness should persist a document-set manifest so huge folder jobs can resume after failure.

## Agent Loop Principle

The tool loop should be built on a maintained framework rather than fully hand-rolled, provided the framework preserves the approval boundary. Verified 2026-07-11: Vercel AI SDK 6 (Apache 2.0) is the primary candidate — its tool loop supports per-tool approval gating (execution pauses and emits an approval request that the application answers), typed tool schemas, and streaming, which maps directly onto the model-proposes-application-decides security default. The fallback is a thin hand-rolled loop over node-llama-cpp's function-calling and grammar APIs if the framework's provider abstraction fights the local runtime.

Framework rule: policy checks, approval decisions, audit events, and rollback stay in Vault Desk code behind the tool registry contract. The framework only drives the propose-approve-execute-observe cycle; it must not own policy.

Audit shape: structure trace records after the OpenTelemetry GenAI semantic conventions (agent invocation, model call, tool execution span tree), persisted to a local append-only audit log with content hashes so sessions are replayable, while noting those conventions are still pre-stability and must be version-pinned.

## Retrieval And Verification Principle

The harness should coordinate:

- EmbeddingGemma indexing (via node-llama-cpp GGUF embeddings or the Transformers.js ONNX path).
- Lexical indexing.
- An embedded hybrid index (LanceDB is the verified primary candidate: in-process for Node, hybrid lexical-plus-dense search, binary quantization), with TurboQuant-based acceleration only if benchmarks justify it. See [RETRIEVAL_AND_VERIFICATION.md](RETRIEVAL_AND_VERIFICATION.md).
- Evidence pack assembly.
- Claim parsing.
- Citation checks.
- Deterministic spreadsheet and arithmetic checks.
- Contradiction search.
- Human review queues.

The verifier must be a separate workflow stage. It must not rely on a single "please verify" model prompt as proof of correctness.

## Context Compaction Principle

The harness should treat model context as a temporary working set, not durable application memory.

The harness should persist:

- Session summary.
- Task ledger.
- Evidence ledger.
- Artifact ledger.
- Preference ledger.
- Warning ledger.
- Compaction events.

Compaction should be triggered before active context pressure causes quality loss. Compacted state must be structured, inspectable, auditable, and safe to replay. It must not preserve hidden model reasoning.

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
- Compaction state preservation.
- Export correctness.
- Runtime adapter failure handling.
- Offline mode.

See [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md) for the minimal-code and minimal-test policy.

## No-Code Constraint

Do not add:

- package.json.
- tsconfig.json.
- source directories.
- test files.
- scripts.
- lockfiles.
- generated templates.

Those belong to a future implementation phase. The step-by-step plan for that phase is [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); its milestone M0 is what formally lifts this constraint.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial future TypeScript/Node harness direction created. |
| 2026-07-10 | Added future harness responsibilities for folder manifests, document adapters, retrieval acceleration, summary trees, and claim verification. |
| 2026-07-10 | Added context compaction ownership and linked Local 12 and Local 16 profile validation to the future harness plan. |
| 2026-07-11 | Added verified component choices: node-llama-cpp primary runtime adapter with llama-server vision companion, grammar-enforced structured output principle, native-Node-first parser adapters with a single Python sidecar rule, LanceDB as primary embedded index candidate, and the agent-loop principle around Vercel AI SDK 6 with policy kept in Vault Desk code. |
| 2026-07-11 | Linked the No-Code Constraint to IMPLEMENTATION_PLAN.md, whose milestone M0 formally lifts it. |
