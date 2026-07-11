# Implementation Plan

Created: 2026-07-11

This document is the milestone-by-milestone plan for the first Vault Desk implementation phase. It is planning material only. The repository remains documentation-only until a future user request explicitly starts implementation; when that happens, work proceeds milestone by milestone from this file.

Component choices follow the verified default stack in [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md) and the principles in [TYPESCRIPT_NODE_HARNESS.md](TYPESCRIPT_NODE_HARNESS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DOCUMENT_ENGINE.md](DOCUMENT_ENGINE.md), [RETRIEVAL_AND_VERIFICATION.md](RETRIEVAL_AND_VERIFICATION.md), [SECURITY.md](SECURITY.md), and [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md).

## Process Architecture

Three layers, from the product decision that shaped this plan:

1. **Electron frontend** — React and TypeScript. Chat, files, previews, settings, task log. No Node access in the renderer: context isolation on, node integration off, typed IPC only.
2. **Vault Core backend** — a separate Node.js/TypeScript process. Agent loop, model lifecycle, indexing and embeddings, filesystem policy, tool permissions, audit log. Talks to the frontend over typed IPC / a local socket.
3. **Sandboxed workers** — llama.cpp-family runtimes and document processors under Vault Core, behind tightly constrained IPC.

The backend must be fully operable without the frontend. Every milestone ends in tests an AI agent can run headlessly, and the backend gains a daemon plus CLI so the whole product loop can be driven programmatically.

## Confirmed Plan Decisions

- **Tiered test models**: fast tests run Gemma 4 E2B QAT GGUF (small, same family); each milestone's acceptance gate re-runs against Gemma 4 12B QAT, the real product model. Real files are used at gates — no mocked parsers or mocked models in acceptance tests.
- **First vertical slice**: cited folder Q&A — ingest a real mixed folder, ask questions, get page-anchored cited answers, pass verification.
- **Repo layout**: pnpm monorepo in this repository, `packages/` alongside `docs/`. AGENTS.md is updated in milestone M0 to end the documentation-only phase.
- **Model distribution policy**: during development, both the small Gemma 4 E2B QAT GGUF and the big Gemma 4 12B QAT GGUF are downloaded from Hugging Face by the hash-pinned model fetcher into a local cache. The final build bundles Gemma 4 12B QAT as its only generation model — E2B is a development and test tool and never ships. The installed product must require **no additional downloads**: every model the product needs at runtime (Gemma 4 12B QAT, EmbeddingGemma, and from M9 the OCR and layout GGUFs) is packaged inside the installer, and the product must start and complete the full workflow offline on first launch. This matches the no-mandatory-cloud and offline-update product principles.

## Monorepo Layout (to be created in M0)

```
packages/
  shared/   @vault/shared   Zod schemas and types only: canonical document object, source
                            anchors, chunks, evidence packs, claims, tool contracts,
                            policy decisions, audit events, JSON-RPC protocol messages.
                            Depends on nothing; everything depends on it.
  workers/  @vault/workers  Adapters: node-llama-cpp inference; later a supervised
                            llama-server child process for vision GGUFs; document parsers
                            (pdfjs-dist, mammoth, ExcelJS, officeParser, mailparser).
  core/     @vault/core     Vault Core daemon: policy kernel, audit log, manifest store,
                            ingestion orchestration, LanceDB index, retrieval, evidence
                            packs, verifier, tool registry, approvals, agent loop,
                            vault-cored daemon entry. Exposes a programmatic API
                            (createVaultCore) used directly by vitest.
  cli/      @vault/cli      Thin `vault` CLI speaking only JSON-RPC over the socket —
                            proof the backend is fully drivable without the frontend.
  desktop/  @vault/desktop  Electron shell (last milestone).
  eval/     @vault/eval     Model fetcher (hash-pinned GGUFs), fixture corpus generator
                            plus ground-truth.json, eval assertion library, Local 12 and
                            Local 16 bench harness.
```

Toolchain: TypeScript strict with NodeNext modules, Biome for lint and format, vitest, tsx for scripts, tsc for build. No CI initially; one local command `pnpm verify` runs typecheck, lint, and unit tests.

## How An AI Agent Drives The Backend

Three access layers over one core:

1. **Programmatic API** — `createVaultCore({ workspaceDir, modelsDir, profile })` returns a typed facade (`ingest`, `ask`, `approvals`, `audit`, `close`). Used by vitest suites from M1 onward; no socket needed for tests.
2. **Daemon** — `vault-cored --workspace <dir>` serves JSON-RPC 2.0 over a Unix domain socket (`.vault/core.sock`; Windows named pipe deferred), newline-delimited JSON. Server-to-client notifications stream `answer.delta`, `citation`, `approval.request`, `verification.result`, and `ingest.progress`. Methods: `workspace.open`, `ingest.start/status/resume`, `ask`, `approval.respond`, `audit.tail`, `health`.
3. **CLI** — `vault ingest <dir>`, `vault ask "<q>" --json`, `vault approvals list|respond`, `vault audit tail`, `vault status`. The `--json` flag emits one machine-readable JSON document on stdout so an AI agent can smoke-test the full slice headlessly.

The Electron main process (M10) is just another JSON-RPC client. Protocol message schemas live in `@vault/shared` so both sides validate both directions.

## Test Tiers

Vitest projects selected by filename suffix. Missing models fail with an instructive message; tests never silently skip.

| Command | Suffix | Requires |
|---|---|---|
| `pnpm test` | `*.test.ts` | Nothing (FakeRuntime/FakeEmbedder behind contracts allowed) |
| `pnpm test:integration` | `*.int.test.ts` | Generated fixture corpus, real parsers, real LanceDB — no LLM |
| `pnpm test:llm` | `*.llm.test.ts` | Gemma 4 E2B QAT + EmbeddingGemma GGUFs (`VAULT_MODEL_TIER=e2b`) |
| `pnpm test:gate` | `*.gate.test.ts` | Gemma 4 12B QAT (`VAULT_MODEL_TIER=12b`) — milestone acceptance only |

## Ground-Truth Eval Design

No fuzzy text matching anywhere. Every LLM-facing test asserts deterministic properties:

- **Schema validity**: output is grammar-enforced at the sampler; the assertion is a Zod parse of the semantic schema. First-attempt validity is tracked as a metric.
- **Field exact-match**: questions in `ground-truth.json` carry typed expected values (for example `{type: "number", value: 1234.56}`); the answer schema has a typed value field; assert normalized equality (numbers parsed, dates ISO-normalized, strings case- and whitespace-normalized).
- **Citation anchor existence**: every claim's citation IDs must exist in the evidence pack presented to the model and resolve to a chunk whose source anchor is in the fact's allowed-anchor set.
- **Trap questions**: facts absent from the corpus must come back `unsupported` from the deterministic verifier — the gate is on the verifier, not on the model choosing to abstain.
- E2B tier asserts pipeline invariants strictly (schema, citation existence, verifier behavior at 100 percent) and accuracy loosely (at least 70 percent field match). 12B gates assert accuracy strictly.

## Milestones

Each milestone builds only on previous ones, ends in AI-runnable tests, and keeps the model-proposes/application-decides boundary and the audit trail present from the start.

### M0 — Scaffolding, model fetcher, fixture corpus, phase change

Scope:

- pnpm workspace, `tsconfig.base.json`, Biome, vitest workspace; empty `@vault/shared` and `@vault/eval` packages.
- Model fetcher (`packages/eval`) with `models.lock.json`: Hugging Face URLs plus SHA-256 pins for the official Gemma 4 E2B QAT Q4_0 GGUF (development and fast tests), Gemma 4 12B QAT Q4_0 GGUF (the product model), and EmbeddingGemma GGUF. `pnpm models:fetch --tier e2b` and `--tier 12b` download the respective tier plus shared models into the cache directory `~/.cache/vault-desk/models`, overridable via `VAULT_MODELS_DIR`. Hash mismatch discards the download and fails loudly. This fetcher is a development tool only; the shipped product never downloads models (see M10).
- The lock file marks each model as `ships: true` (Gemma 4 12B QAT, EmbeddingGemma, later the OCR and layout GGUFs) or `ships: false` (Gemma 4 E2B QAT — development only). This flag drives the M10 bundling step and its tests.
- Fixture corpus generator writing to `packages/eval/fixtures/generated/` (gitignored) with a checked-in `ground-truth.json`: three digital invoice PDFs (known invoice numbers, totals, dates), one byte-identical duplicate, a contract DOCX with a known clause, a ledger XLSX with formulas and known sums, a transactions CSV, an email EML, and one image-only scanned invoice PDF (exercised from M9).
- Update AGENTS.md: replace documentation-only phase rules with implementation-phase rules (commands, test tiers, package map); keep Clean Code rules and security defaults. Update the No-Code Constraint section of TYPESCRIPT_NODE_HARNESS.md.

Tests: fixture generator is byte-deterministic (hash equality across two runs); `models.lock.json` schema-valid; fetcher rejects a SHA-256 mismatch (tested against a small local file, not a live download).

Gate: `pnpm fixtures:generate && pnpm verify` green; every ground-truth fact names its file, expected typed value, and allowed anchors; AGENTS.md reflects the new phase.

### M1 — Shared contracts, audit log, policy kernel

Scope:

- `@vault/shared`: Zod schemas for SourceAnchor, CanonicalDocument (per DOCUMENT_ENGINE.md), Chunk, EvidencePack, Claim/Citation, ToolDefinition (name, version, input/output schemas, permissions, preview, approval, limits), PolicyDecision, AuditEvent (OpenTelemetry GenAI semantic-convention shape, version-pinned), and the JSON-RPC envelope.
- `@vault/core`: append-only JSONL audit log with a per-record previous-hash chain; policy kernel: `WorkspaceScope` (realpath root plus prefix check, extension/MIME allowlist) and `ScopedFileSystem` — the only filesystem entry point core code may use, enforced by a lint rule banning `node:fs` imports elsewhere in core.

Tests: path traversal and symlink escape rejected; out-of-scope absolute paths rejected; audit chain verifies and detects tampering; audit events round-trip through Zod.

Gate: lint enforcement in place; chain verification tests green.

### M2 — Inference runtime adapter (node-llama-cpp, E2B smoke)

Scope:

- `@vault/shared`: RuntimeAdapter contract (loadModel, generate, generateStructured(schema), embed, dispose; typed errors for missing model, out of memory, aborted).
- `@vault/workers`: node-llama-cpp implementation — GGUF resolution via `models.lock.json`, grammar-enforced structured generation (Zod to JSON Schema to GBNF), EmbeddingGemma embeddings, tier selection via `VAULT_MODEL_TIER`. A deterministic FakeRuntime for the unit tier.

Tests: unit — typed error on missing model file, abort mid-generation. `pnpm test:llm` — E2B loads; structured generation parses first-attempt across five varied prompts; embeddings are 768-dimensional, finite, and deterministic for identical text.

Gate: `pnpm test:llm` green with the real E2B model; no package other than workers imports node-llama-cpp.

### M3 — Document ingestion: manifest, hashing, native parsers

Scope:

- `@vault/core`: document-set manifest store (per-file hash, size, MIME, parser route, status, timings per the DOCUMENT_ENGINE performance records); inventory → hash → dedupe → route pipeline; canonical-object store.
- `@vault/workers`: parser adapters producing CanonicalDocument: pdfjs-dist text layer (pages, paragraph anchors), mammoth (headings, paragraphs, tables), ExcelJS (sheets, cell coordinates, formulas, typed and display values), CSV (dialect, row/column coordinates), mailparser (headers, body, attachment list). A scanned PDF (no text layer) is recorded as `needs_ocr` — never silently dropped.

Tests: unit — routing decisions per MIME/extension; manifest resumability (kill mid-ingest, resume parses only the remainder); duplicate hash yields one canonical document with two path references. `pnpm test:integration` on the generated corpus — every born-digital fixture yields a schema-valid CanonicalDocument; the invoice number appears at its ground-truth page anchor; the ledger cell has the ground-truth formula and typed value; EML fields match; the scanned PDF is `needs_ocr` with a manifest warning.

Gate: integration suite green with zero mocked parsers; re-running ingest with unchanged files parses nothing (hash cache).

### M4 — Chunking, LanceDB hybrid index, retrieval

Scope:

- Structure-aware chunker (page, heading, paragraph, table, row-window, sheet chunks, each carrying full anchor metadata; chunk text under 2K tokens for EmbeddingGemma).
- Embedding cache keyed by chunk hash plus encoder version.
- LanceDB table: canonical text, anchors, full-text index, EmbeddingGemma dense vectors.
- Retriever contract: hybrid query (full-text plus dense with reciprocal-rank fusion), metadata filters, and an exact-identifier search API (invoice numbers, amounts, dates).

Tests: unit with a fake embedder — every chunk resolves back to its document/page/cell anchor; cache hits on unchanged chunks. `pnpm test:llm` with real EmbeddingGemma — recall gate: for every ground-truth fact, hybrid top-8 contains a chunk from the allowed-anchor set; exact identifier search returns its anchor chunk at rank 1; the index is reproducible and survives a process restart.

Gate: recall 100 percent on born-digital fixture facts at k=8; identifier exact-match 100 percent.

### M5 — Evidence packs and grammar-enforced cited generation

Scope:

- Evidence-pack assembler: task instruction, output schema description, retrieved chunks with citation IDs, exact matches, parser warnings; token-budgeted per profile; persisted by ID for reproducibility.
- `answerQuestion(q)` pipeline: retrieve → pack → generateStructured with the cited-answer schema `{ value, value_type, claims: [{ text, citation_ids }] }` → persist answer plus pack reference; audit spans for retrieval and the model call.

Tests: unit — packs respect the token budget, always include exact identifier matches and warnings, and are reproducible (same corpus and query produce the same pack ID). `pnpm test:llm` on E2B — schema validity, citation existence, and anchor resolution 100 percent strict; field match at least 70 percent advisory; audit log completeness.

Gate: strict invariants at 100 percent on E2B; answers replayable from persisted packs.

### M6 — Verification pipeline

Scope — a deterministic verifier as an explicit workflow stage:

1. Citation-presence check on structured claims.
2. Evidence containment: the cited chunk must contain the claimed identifier, number, or date under deterministic normalization.
3. Exact re-search of identifiers and amounts across the index.
4. Deterministic arithmetic and spreadsheet recomputation for numeric claims referencing ledger cells (ExcelJS typed values, never model math).
5. Contradiction search (same identifier, conflicting value elsewhere).
6. Low-confidence-source flagging.

Per-claim result: supported, unsupported, contradicted, or low_confidence — persisted and audited. `ask` always returns a verification result.

Tests: unit on constructed defects (bogus citation ID, wrong amount, planted contradiction) — 100 percent caught. `pnpm test:llm` — trap questions come back 100 percent unsupported.

Gate: no answer path bypasses verification.

### M7 — Tool registry, policy engine, approvals

Scope:

- Tool registry per the harness principles: typed schemas, permissions, preview, approval behavior, resource limits, audit, rollback.
- Policy engine mapping tool plus workspace scope plus risk to allow, require_approval, or deny; persisted approval queue resolvable via the API.
- First tools: `search_documents`, `open_document_region`, `read_table_cells` (read-only, policy-allowed) and `export_answer` (writes a file — preview plus approval required, writes only through ScopedFileSystem, originals immutable).

Tests: schema-invalid tool calls rejected before policy; out-of-scope export path denied; export without approval never touches disk (filesystem spy); approve writes the file with a full proposal→decision→result audit trail; reject is audited with no side effect.

Gate: a consequential action without approval is impossible by construction; audit replay reconstructs the decision sequence.

### M8 — Agent loop, daemon, and CLI — first vertical slice

Scope:

- Vercel AI SDK 6 LanguageModel provider over the runtime adapter (streaming, tool calls via Gemma function calling).
- Agent session: question → tool calls (search/open/read) → cited answer schema → verifier. The SDK's `needsApproval` delegates to the M7 policy engine — the framework drives propose-approve-execute; policy stays in Vault Desk code.
- `vault-cored` JSON-RPC daemon and the `vault` CLI as specified above.

Tests: unit — provider conformance with FakeRuntime; JSON-RPC schema round-trips; an approval request blocks execution until `approval.respond`. `pnpm test:llm` on E2B — the first-slice test: spawn the real daemon on a temp workspace, drive it via CLI subprocess (`vault ingest`, then `vault ask` for every ground-truth question with `--json`), assert the eval criteria; the export flow pauses on approval and resumes on `vault approvals respond --approve`; `vault audit tail` shows the full span tree.

Gate: the full vertical slice (ingest mixed folder → question → page-anchored cited answer → verification) passes headlessly via CLI on E2B — one command sequence an AI agent can run, no frontend.

### M9 — OCR and vision workers (PaddleOCR-VL, Granite-Docling)

Scope:

- Supervised llama-server child process (bound to 127.0.0.1, health-checked, killed on dispose, restarted on crash) serving vision GGUFs.
- PaddleOCR-VL adapter for `needs_ocr` pages, producing OCR regions with confidence and bounding boxes into the CanonicalDocument.
- Granite-Docling adapter route for table-heavy and layout-complex pages, per the DOCUMENT_ENGINE page classification.
- Model fetcher extended with hash-pinned OCR and layout GGUFs, marked `ships: true` so the M10 bundle includes them.

Tests: unit — worker supervision (crash, restart, job resumes from the manifest); OCR route chosen only when the text layer is missing or low-confidence. `pnpm test:llm` — the scanned invoice ingests with the ground-truth invoice number in its OCR text; asking a scanned-only question returns the correct value with a citation anchored to the OCR region and a confidence note in verification.

Gate: the first slice passes with the scanned fixture included; killing llama-server mid-ingest leaves a resumable manifest.

### M10 — Electron shell (typed IPC, minimal chat UI) and self-contained packaged build

Scope:

- Electron main process spawns or attaches `vault-cored` and relays JSON-RPC.
- Renderer: React and TypeScript, context isolation on, node integration off; the preload exposes only a typed, schema-validated IPC surface mirroring the shared protocol.
- Screens: folder picker with ingest progress, chat with streamed answers and clickable citations (opens the source page or cell preview), approval dialog, audit/task log view, settings (workspace; no model selection — the product model is fixed).
- **Self-contained packaged build**: the installer bundles every runtime asset the product needs — Gemma 4 12B QAT as the only generation model, EmbeddingGemma, the OCR and layout GGUFs from M9, and the native runtime binaries — as Electron extra resources. The bundling step reads `models.lock.json`, includes exactly the `ships: true` models, verifies each bundled file against its pinned SHA-256, and fails the build if any `ships: true` model is missing or any `ships: false` model (E2B) leaks in. The packaged app resolves models only from its bundled resources path; it contains no downloader, and model resolution has no network fallback.

Tests: every renderer-reachable channel validates against the shared schemas; out-of-protocol messages are rejected; window configuration tests assert the isolation flags. A minimal Playwright-for-Electron smoke test (optional-hardware tier): launch, ingest fixtures, ask one question, citation renders. No broad UI snapshots (quality-bar rule). Build-output tests: the packaged app contains all `ships: true` GGUFs with matching hashes and does not contain the E2B model; a first-launch smoke run on the packaged build with networking disabled (no network permission or a blocked-network environment) completes ingest and one cited answer.

Gate: the renderer provably has no Node access; every backend capability used by the UI is also reachable via the CLI — no UI-only endpoints; the packaged build runs the full first slice offline on first launch with zero downloads, with Gemma 4 12B QAT as its only generation model.

### M11 — 12B acceptance gate and Local 12 / Local 16 bench harness

Scope:

- Bench harness `pnpm bench --profile local12|local16`: runs the full slice on the fixture corpus with Gemma 4 12B QAT and records the software-measurable PERFORMANCE_AND_CONTEXT.md gate metrics (cold and warm start, first-token latency, tokens per second, ingest time, time to first cited answer, retrieval recall, citation precision, unsupported-claim rate, spreadsheet check accuracy, peak RSS; VRAM where the platform exposes it) into a versioned JSON report.
- `pnpm test:gate` re-runs the M5, M6, M8, and M9 LLM suites against 12B.

Thresholds: schema validity at least 95 percent first attempt; citation anchor existence 100 percent; field exact-match at least 90 percent born-digital and 80 percent scanned; trap questions 100 percent unsupported.

Gate: gate suite green plus committed bench reports for local12 (32K active context) and local16 (64K) — the milestone that moves Local 12 and Local 16 claims from research-derived to measured.

## Explicitly Deferred (post-M11, in likely order)

1. Compaction manager (session, task, evidence, artifact, preference, and warning ledgers; 70/85/95 percent triggers; the long-running session acceptance test). State stores from M5 and M7 already live outside the prompt, so nothing blocks it.
2. Summary tree builder (the first slice is retrieval-only).
3. MTP and KV-cache-quantization certification as a pinned combination per PERFORMANCE_AND_CONTEXT.md.
4. Python sidecar (Docling full pipeline, MarkItDown, Unstructured).
5. turbovec evaluation against the LanceDB baseline.
6. MCP position ADR.
7. Accounting workflow pack (builds directly on the M6 verifier and M7 export).
8. Appliance mode and multi-user governance.

Never written: custom parsers, custom OCR, custom vector database, plugin system, generic agent brain.

## Overall Verification

- Per milestone: the listed `pnpm test` / `test:integration` / `test:llm` commands green, then the milestone gate criteria.
- System-level proof at M8: an AI agent runs `pnpm fixtures:generate && pnpm models:fetch --tier e2b`, starts the daemon, and drives `vault ingest` / `vault ask --json` / `vault approvals respond` end to end, with assertions on real model output against checked-in ground truth.
- Final proof at M11: the same suites on Gemma 4 12B QAT plus bench reports for both certified profiles.
- One commit per milestone; every commit leaves `pnpm verify` green.

## Revision History

| Date | Change |
|---|---|
| 2026-07-11 | Initial milestone plan (M0–M11) created: three-layer process architecture, AI-drivable daemon/CLI test harness, tiered Gemma 4 E2B/12B test model policy, ground-truth eval design, and deferred list. |
| 2026-07-11 | Added the model distribution policy: E2B and 12B QAT downloaded from Hugging Face for development via the hash-pinned fetcher; the final build bundles only 12B QAT (plus EmbeddingGemma and OCR/layout models) with a ships flag in models.lock.json, an offline first-launch test, and no downloader in the packaged product. |
