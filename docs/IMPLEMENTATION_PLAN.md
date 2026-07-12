# Implementation Plan

Created: 2026-07-11

This document is the milestone-by-milestone plan for the first Vault Desk implementation phase. It is planning material only. The repository remains documentation-only until a future user request explicitly starts milestone M0. Work then proceeds milestone by milestone from this file.

Component choices follow the verified default stack in [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md) and the principles in [TYPESCRIPT_NODE_HARNESS.md](TYPESCRIPT_NODE_HARNESS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DOCUMENT_ENGINE.md](DOCUMENT_ENGINE.md), [RETRIEVAL_AND_VERIFICATION.md](RETRIEVAL_AND_VERIFICATION.md), [SECURITY.md](SECURITY.md), and [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md).

## Pre-M0 Decisions

The following architecture decisions are resolved in documentation before implementation begins:

- [ADR 0010](adr/0010-electron-and-local-transport.md): Electron is the desktop shell; Vault Core is a separate process; macOS uses a Unix domain socket and Windows uses a named pipe behind one versioned local-transport contract. Neither platform transport is deferred.
- [ADR 0011](adr/0011-workspace-state-and-recovery.md): authoritative workspace state is schema-versioned, transactional, single-writer, migration-aware, and separate from rebuildable indexes and caches.
- [ADR 0012](adr/0012-worker-isolation-and-untrusted-documents.md): hostile document and executable-tool work uses a disposable no-NIC microVM with typed host/guest IPC; native GPU inference retains a narrower OS-sandboxed accelerator exception.
- [ADR 0013](adr/0013-first-desktop-runtime.md): node-llama-cpp with the pinned official QAT GGUF is the first runtime to certify on both Windows and macOS; MLX and other runtimes remain adapter-backed later candidates.

M0 may validate exact dependency packages behind these boundaries, but it must not reopen the boundaries without a superseding ADR.

M0 is also blocked until the repository owner selects the Community source license and records who is responsible for dependency, model, notice, and redistribution approval. Implementation code must not be published under an implicit or undecided license.

## Process Architecture

Three layers:

1. **Electron frontend** — React and TypeScript. Chat, files, previews, settings, task log, and approvals. Node integration is off, context isolation is on, and the preload exposes only a typed, schema-validated IPC surface.
2. **Vault Core backend** — a separate Node.js/TypeScript process. Sessions, jobs, workspace state, policy, audit, indexing, retrieval, verification, tools, approvals, and model scheduling. It is fully operable without Electron.
3. **Isolated workers** — no-NIC microVM workers for hostile document and executable-tool work, plus narrowly constrained host-native GPU workers where acceleration requires them. Workers receive job-scoped inputs and cannot directly decide permissions, approvals, exports, or network access.

The real local process boundary exists from M1. Unit tests may call the programmatic core API directly, but every milestone that adds a backend capability also exercises it through the daemon protocol.

## Sandbox Architecture

The certified hostile-work sandbox is a disposable microVM with an immutable guest image, job-scoped read-only inputs, bounded ephemeral scratch storage, and versioned typed host/guest socket IPC. The VM configuration contains no virtual network adapter and exposes no general host-network proxy. Network isolation must not depend on matching commands, executables, domains, URLs, addresses, or protocols.

The first platform launchers to validate are research-derived until M0 confirms them:

- macOS 26 on Apple silicon: Apple Containerization or Virtualization.framework without a network device.
- Windows Pro or Enterprise: HCS/Hyper-V without a virtual network adapter.
- Linux after desktop support opens: Firecracker/KVM without `virtio-net`.

Process-only fallbacks are compatibility modes and cannot satisfy certification gates. A separate Vault Core broker owns any approved external integration, including credentials, destination policy, approval, limits, and audit; neither the model nor the microVM receives a generic socket or fetch primitive.

The first node-llama-cpp inference worker remains host-native for Metal, CUDA, HIP, and Vulkan acceleration. It is supervised and OS-sandboxed and has no shell, executable tools, credentials, approval authority, arbitrary workspace access, or network capability. OCR and layout workers may use this exception only when required acceleration cannot be preserved inside the microVM and the exception passes the native-worker gates.

## Confirmed Product Slice

The first technical slice is cited folder Q&A. The first product slice is the accounting invoice-review workflow:

1. Ingest invoices and a reference spreadsheet.
2. Extract typed supplier, invoice number, date, total, tax, and line-item fields.
3. Identify duplicates, missing fields, inconsistent totals, and spreadsheet mismatches.
4. Produce a cited exception queue with supported, contradicted, low-confidence, and unsupported states.
5. Preview and approve a structured export.

The product slice, compaction, and recovery gates must pass before Local 12 or Local 16 can be called certified.

## Monorepo Layout (created incrementally from M0)

```text
packages/
  shared/   @vault/shared   Dependency-free schemas and types introduced only when their
                            consuming milestone begins.
  workers/  @vault/workers  MicroVM launchers and guest protocol, native accelerator
                            clients, parser/runtime adapters, resource budgets, and typed IPC.
  core/     @vault/core     Vault Core API and daemon: workspace state, policy, audit,
                            jobs, ingestion, index, retrieval, verification, workflows,
                            tools, approvals, and compaction.
  cli/      @vault/cli      Thin JSON-RPC client used for headless product operation and
                            process-boundary acceptance tests.
  desktop/  @vault/desktop  Electron main, preload, and renderer, introduced in M10.
  eval/     @vault/eval     Model manifest and fetcher, deterministic fixtures, held-out
                            acceptance corpus, assertions, and hardware bench harness.
```

Toolchain: pnpm monorepo, TypeScript strict with NodeNext modules, Biome, vitest, tsx for development commands, and tsc for builds. Package and native dependency versions are locked. Schemas are added just in time rather than designing every future contract in M1.

## Workspace State And Recovery

Vault Core owns one schema-versioned workspace format:

- A transactional catalog is authoritative for jobs, manifests, document identities, parser records, sessions, approvals, evidence-pack references, verification outcomes, and migrations.
- Canonical document payloads and evidence artifacts are immutable, content-addressed records written atomically.
- LanceDB indexes, embeddings, prompt caches, and summaries are derived state and must be reproducible or rebuildable from authoritative records.
- A per-workspace single-writer lock prevents concurrent mutation; read-only inspection may be concurrent.
- Every long job has an idempotency key, durable state transitions, cancellation state, resource accounting, and a resume cursor.
- Migrations are versioned, backup-before-migrate, forward-tested, and fail without partially upgrading a workspace.
- Cache cleanup, workspace deletion, retention, and orphan recovery are explicit operations.
- Audit records avoid raw sensitive content by default and record hashes, typed metadata, redacted previews, and artifact references where possible.

The MVP relies on operating-system account isolation and encrypted storage for data at rest. Application-managed encryption remains a separate future decision and must not be implied by product copy until implemented.

## Local API And Protocol

Three access layers share the same product contracts:

1. **Programmatic API** — `createVaultCore({ workspaceDir, modelsDir, profile })` returns a typed facade used by focused unit tests.
2. **Daemon** — `vault-cored --workspace <dir>` serves versioned JSON-RPC 2.0 over a Unix domain socket on macOS and a named pipe on Windows. The endpoint is restricted to the current operating-system user. TCP is not enabled for desktop mode.
3. **CLI** — `vault ingest`, `vault ask`, `vault workflow invoice-review`, `vault approvals`, `vault audit`, `vault compact`, and `vault status` speak only to the daemon.

Protocol contracts include request and job IDs, idempotency keys for mutations, cancellation, bounded streaming, backpressure, structured errors, protocol-version negotiation, reconnect behavior, and server-to-client notifications. `--json` writes exactly one final machine-readable document to stdout; progress and diagnostics use stderr or an explicit event-stream mode.

The daemon skeleton and CLI health command arrive in M1. Every later milestone grows the same protocol instead of delaying serialization, lifecycle, and cross-platform behavior until the UI milestone.

## Model And Asset Distribution

Development models are fetched by a hash-pinned tool into a local cache. The installed product has no downloader or network fallback and bundles every required runtime asset.

The model manifest distinguishes:

- `development`: E2B test model, never shipped.
- `candidate_to_ship`: asset intended for packaging but blocked on technical and redistribution review.
- `ships`: asset approved for redistribution, included in the installer, covered by notices, and verified by SHA-256 in the build.

EmbeddingGemma and every OCR or layout model begin as `candidate_to_ship`. They cannot become `ships` until redistribution terms, required notices, installer size, and offline operation are reviewed. M10 produces a third-party notice bundle, dependency and model SBOM, artifact manifest, and signed platform packages.

## Continuous Verification

CI begins in M0:

- macOS and Windows: install, typecheck, lint, unit tests, generated-fixture integration tests, daemon lifecycle, and native dependency load smoke tests.
- Linux: core unit and integration coverage where dependencies support it; Linux is not an initial desktop certification target.
- Hardware/model jobs: self-hosted or manually invoked, never silently skipped, with retained machine-readable reports.
- Packaged-build jobs: platform-native build, asset-manifest checks, protocol smoke, and no-network first-launch smoke.

The local `pnpm verify` command remains the fast developer entry point. CI and local verification must use the same underlying commands.

## Test Tiers

| Command | Purpose | Requires |
|---|---|---|
| `pnpm test` | Focused unit and contract tests | No models or native document corpus |
| `pnpm test:integration` | Real parsers, workspace store, daemon, and LanceDB over deterministic fixtures | Generated development corpus |
| `pnpm test:llm` | Fast LLM invariants and workflow development | Gemma 4 E2B QAT plus EmbeddingGemma |
| `pnpm test:gate --milestone <n>` | Product-model acceptance for the LLM-facing milestone | Gemma 4 12B QAT and required shipped-candidate workers |
| `pnpm test:package` | Packaged application and offline asset verification | Platform build plus all `ships` assets |
| `pnpm bench --profile local12\|local16` | Hardware certification and soak tests | Certified target hardware |

Missing required models, workers, target hardware, or packages fail with an instructive message. Acceptance tests never silently skip.

Every LLM-facing milestone runs a 12B gate before it closes. E2B is a fast development signal, not an acceptance substitute.

## Evaluation Design

Evaluation uses distinct data sets:

1. **Development fixtures** — small, byte-deterministic, generated documents used for fast parser and pipeline iteration.
2. **Held-out acceptance corpus** — different templates, values, layouts, and document combinations. It is not used to tune prompts, chunking, retrieval weights, or thresholds.
3. **Pilot corpus protocol** — customer-provided or publicly redistributable documents evaluated locally under explicit data-handling rules. Customer documents are never committed.

The development and held-out corpora cover:

- Multiple currencies, locales, decimal separators, date formats, and invoice layouts.
- Duplicates, near-duplicates, revisions, contradictions, missing values, negative amounts, and formula errors.
- Born-digital, scanned, rotated, low-contrast, table-heavy, and mixed PDF pages.
- Corrupt, password-protected, MIME-spoofed, oversized, deeply nested, and changing-during-ingest files.
- Document text that attempts prompt injection, requests tool use, or claims to override policy.
- Unsupported questions and plausible-but-absent facts.

Deterministic assertions cover typed extraction, normalized values, citation-anchor validity, identifier retrieval, calculations, approval behavior, and verifier states. Evaluation reports precision and recall, false-support rate, false-positive and false-negative exception rates, confidence intervals, latency, memory, and recovery behavior.

Exact matching is required for typed identifiers, amounts, dates, and enumerated fields. It is not treated as a complete quality measure for summaries or reports; those receive coverage checklists and blinded human review before pilot readiness.

## Milestones

Each milestone builds on previous gates, introduces only the contracts it consumes, leaves `pnpm verify` green, and records unresolved risks rather than hiding them.

### M0 — Phase change, minimal scaffold, CI, models, and evaluation corpora

Scope:

- Create the pnpm workspace, root TypeScript/Biome/vitest configuration, lockfile, and only the packages needed by M0 and M1.
- Add cross-platform CI and native dependency load smoke jobs.
- Validate the macOS and Windows microVM APIs, no-NIC configuration, host/guest socket, packaging, edition requirements, and guest-image lifecycle; record findings before choosing exact launcher dependencies.
- Add the model manifest and hash-pinned development fetcher. Redistribution status uses `development`, `candidate_to_ship`, and `ships`.
- Generate development and held-out fixture corpora with typed ground truth, permitted source anchors, and negative/adversarial cases.
- Record dependency licenses and create the first machine-readable dependency/model inventory.
- Update AGENTS.md and TYPESCRIPT_NODE_HARNESS.md to end the documentation-only phase only when the gate passes.

Gate:

- Fixture generation is byte-deterministic.
- Ground truth covers positive, negative, contradiction, locale, corruption, and prompt-injection cases.
- Hash mismatch and unapproved `ships` transitions fail.
- macOS and Windows CI run `pnpm verify` successfully.
- The selected macOS and Windows sandbox backends demonstrate a booted minimal guest with typed socket round-trip and zero virtual network adapters; unsupported editions or hardware fail with an explicit compatibility classification.
- AGENTS.md reflects the implementation phase.

### M1 — Workspace state, core security primitives, daemon skeleton, and CLI health

Scope:

- Introduce only the shared schemas needed for workspace identity, jobs, policy decisions, audit events, JSON-RPC envelopes, and typed errors.
- Implement the schema-versioned workspace catalog, immutable artifact writes, single-writer lock, migration harness, and rebuildable-state boundary.
- Implement `WorkspaceScope` and `ScopedFileSystem`; direct filesystem access is lint-forbidden outside approved storage and worker-broker adapters.
- Implement the redaction-aware hash-chained audit log.
- Implement the daemon lifecycle, macOS socket, Windows named pipe, endpoint permissions, version negotiation, request IDs, cancellation, and `vault status`.
- Implement the common microVM launcher contract, verified immutable guest image, job-scoped read-only input attachment, bounded ephemeral scratch storage, typed host/guest socket, resource limits, cancellation, termination, and cleanup.
- Implement the macOS and Windows no-NIC backends selected in M0. Do not create a virtual network adapter or expose a general host-network proxy.

Gate:

- Traversal, symlink escape, MIME confusion, out-of-scope paths, and time-of-check/time-of-use file replacement are rejected.
- Abrupt termination cannot leave partially committed authoritative state.
- Audit tampering is detected without requiring raw document content in routine records.
- Daemon start, health, restart, incompatible-version, and current-user endpoint tests pass on macOS and Windows.
- Sandbox configuration inspection proves zero virtual network adapters, and guest probes for DNS, IPv4, IPv6, LAN, multicast, and host-network reachability fail without command or destination matching.
- The host/guest socket accepts only the versioned worker protocol and cannot forward arbitrary traffic; process-only compatibility mode cannot report a certified result.

### M2 — Supervised inference worker and early 12B canary

Scope:

- Add the runtime adapter contract and a separate supervised inference-worker process.
- Apply the native accelerator boundary: OS-enforced network denial, no shell or executable tools, no credentials or approval authority, and only brokered model/evidence inputs.
- Implement node-llama-cpp behind worker IPC with model resolution, grammar-enforced structured output, embeddings, cancellation, timeout, memory-budget reporting, and typed failure states.
- Add a deterministic fake worker for unit tests.
- Add a resource scheduler that prevents generation, embeddings, and later vision work from exceeding the active profile budget.

Gate:

- Worker crash, cancellation, timeout, malformed IPC, missing model, and out-of-memory paths are contained and audited.
- E2B structured generation and EmbeddingGemma smoke tests pass.
- Gemma 4 12B loads, produces grammar-valid output, and shuts down cleanly on at least one Local 12-class and one Local 16-class target before later LLM work proceeds.
- Native runtime loading passes on the initial macOS and Windows paths.
- Native-worker probes prove network denial and absence of arbitrary workspace, credential, shell, and tool authority.

### M3 — Native document ingestion and crash-consistent manifests

Scope:

- Add SourceAnchor and CanonicalDocument schemas as consumed by ingestion.
- Implement inventory, hashing, deduplication, routing, canonical artifact storage, and durable resumable manifests.
- Run native PDF, DOCX, XLSX, CSV, and EML parsers inside the no-NIC microVM boundary.
- Preserve page, heading, paragraph, table, sheet, cell, formula, typed-value, and attachment anchors.
- Surface unsupported, corrupt, password-protected, excessive-size, and changed-during-ingest states.

Gate:

- Real parsers pass on both fixture corpora with no mocked parser at acceptance.
- Parser acceptance records the certified microVM backend and rejects process-only compatibility mode.
- Killing workers or Vault Core at every manifest transition resumes without duplicate or missing work.
- Originals remain immutable; identical content deduplicates while retaining all path references.
- Zip/decompression bombs, oversized outputs, and parser hangs are stopped by resource limits.

### M4 — OCR, layout, and low-confidence routing

Scope:

- Add supervised PaddleOCR-VL and Granite-Docling routes for scanned, mixed, table-heavy, and low-confidence pages.
- Preserve OCR regions, bounding boxes, parser/model versions, confidence, and warnings in CanonicalDocument.
- Unload or serialize GPU workers according to the profile resource scheduler; document workers must not silently steal the certified generation budget.
- Keep CPU parsing inside the microVM. Any GPU-backed OCR or layout worker that uses the native accelerator exception must pass the same OS-enforced network and authority-denial probes as inference.

Gate:

- Scanned and layout-complex held-out fixtures recover ground-truth fields and anchors at defined precision and recall.
- Worker crashes resume from page-level manifest cursors.
- Peak memory under OCR-to-generation handoff fits the provisional Local 12 and Local 16 budgets.
- OCR and layout assets remain `candidate_to_ship` until redistribution review completes.

### M5 — Chunking, hybrid index, and retrieval

Scope:

- Add Chunk and retrieval contracts.
- Implement structure-aware page, heading, paragraph, table, row-window, sheet, and OCR-region chunks under EmbeddingGemma's token limit.
- Cache embeddings by chunk hash, encoder version, dimension, and normalization version.
- Use LanceDB for full-text and dense retrieval with reciprocal-rank fusion and metadata filters.
- Provide exact identifier, date, amount, name, and clause search.

Gate:

- Every chunk resolves to an immutable source anchor.
- Index rebuild from authoritative state is deterministic and restart-safe.
- Held-out recall, citation-candidate precision, and exact-search thresholds are defined before measurement and pass on born-digital and scanned facts.
- File changes invalidate only affected canonical artifacts, chunks, embeddings, and index rows.

### M6 — Evidence packs, cited generation, and deterministic verification

Scope:

- Add EvidencePack, Claim, Citation, and VerificationResult schemas.
- Build reproducible, token-budgeted evidence packs containing exact matches, retrieved chunks, contradictions, and parser warnings.
- Generate task-specific typed answers with claim-level citations.
- Verify citation presence, evidence containment, normalized identifiers and quantities, exact re-search, spreadsheet arithmetic, contradictions, ambiguity, and low-confidence sources.
- Treat document content and tool output as untrusted evidence, never as control instructions.

Gate:

- Evidence packs replay from persisted inputs and explain invalidation when sources or configuration change.
- E2B passes strict schema, citation, and verifier invariants.
- The M6 12B gate passes held-out typed accuracy, citation precision, false-support, contradiction, and unsupported-question thresholds.
- No user-visible high-value answer path bypasses verification.

### M7 — Accounting invoice-review product workflow

Scope:

- Implement an explicit workflow, not a generic agent brain: ingest invoices and ledger, extract typed fields, detect duplicates and inconsistencies, compare against spreadsheet rows, and create a cited exception queue.
- Add human-review states for uncertain extraction, missing evidence, contradictions, and low-confidence OCR.
- Persist workflow state outside model context so it can resume after cancellation or restart.

Gate:

- Held-out field extraction, duplicate detection, ledger matching, exception precision/recall, calculation correctness, and citation precision pass defined thresholds.
- Every exception traces to source pages, regions, sheets, and cells.
- The M7 12B gate passes the entire workflow on born-digital and scanned cases.
- A blinded human-review checklist finds no unreported high-severity discrepancy in the pilot-readiness sample.

### M8 — Typed tools, approvals, export, bounded tool loop, and complete CLI slice

Scope:

- Add just-in-time ToolDefinition, PolicyDecision, Approval, Preview, and ToolResult schemas.
- Implement read-only search/open/table tools as typed Vault Core queries through scoped adapters, not shell commands, and add an approval-gated structured exception export.
- Route any later executable tool through the no-NIC microVM contract; do not add an executable-tool exception inside Vault Core.
- Export through ScopedFileSystem using preview, destination validation, atomic write, immutable originals, audit, and rollback where applicable.
- Complete CLI commands for ingest, ask, invoice-review, approvals, export, audit, cancellation, and resume.
- Evaluate the Vercel AI SDK provider only for bounded iterative read-tool use. Adopt it only if it preserves Vault Desk policy, approval, audit, cancellation, and structured-output contracts and reduces code versus the explicit workflow loop.

Gate:

- Schema-invalid or document-injected tool requests never reach policy or execution.
- Approval is durable across daemon restart; rejection and expiration cause no side effect.
- The daemon/CLI drives the full invoice-review and approved export flow on E2B and 12B.
- Export correctness is checked by parsing the exported artifact and reconciling it to verified workflow state.
- No worker or model has direct filesystem-write authority.
- No executable tool worker has a virtual NIC or a generic network broker; an external integration, when later introduced, must cross the separate typed Vault Core broker.

### M9 — Summary trees, structured compaction, recovery, and long-session acceptance

Scope:

- Build page, section, table, sheet, document, folder, and task summary nodes with source anchors, prompt/model versions, evidence IDs, warnings, and verification state.
- Implement session, task, evidence, artifact, preference, and warning ledgers.
- Compact at the documented 70/85/95 percent triggers and after long tools, approvals, and exports.
- Add manual compact, source-change invalidation, and post-compaction replay.

Gate:

- Run the required 30-minute mixed-folder scenario on Local 12 and Local 16 with at least three forced compactions.
- Pre-compaction decisions, citations, warnings, pending approvals, and tool results survive or explicitly report invalidation.
- Compaction loss rate, summary coverage, crash recovery time, and folder-level citation precision pass defined thresholds.
- The workflow continues after daemon and worker restarts without reloading the folder or restating decisions.

### M10 — Electron shell and self-contained cross-platform package

Scope:

- Implement Electron main, preload, and minimal React renderer over the existing daemon protocol.
- Provide folder selection, ingest progress, invoice review, chat, citation previews, human-review queue, approval dialog, export preview, audit/task log, cancellation, and settings without exposing model configuration.
- Build macOS and Windows packages containing the product generation model, embedding model, OCR/layout assets, and native runtimes only after every asset is approved as `ships`.
- Generate notices, SBOMs, artifact manifests, hashes, signatures, and platform packaging metadata.
- Add hardware capability detection that maps supported machines to Certified, Compatible, or Experimental without changing verification policy.

Gate:

- Renderer isolation and every IPC channel are schema-tested; no renderer Node access exists.
- Packaged builds complete first launch, microVM boot, ingestion, invoice review, citations, approval, and export with zero downloads.
- Packaged sandbox evidence proves that hostile parsing used the platform no-NIC microVM, not a process-only fallback, and that native accelerator workers had OS-enforced network denial.
- No development model or unapproved candidate asset leaks into the package.
- Windows and macOS packages pass install, launch, upgrade, uninstall, workspace-preservation, and crash-recovery smoke tests.

### M11 — Full 12B certification and pilot readiness

Scope:

- Run the complete package and workflow suite with Gemma 4 12B QAT on actual Local 12 and Local 16 target machines.
- Record cold/warm start, prefill latency by certified context, first-token latency, tokens per second, ingest/OCR throughput, time to first cited result, peak RAM/VRAM, retrieval and citation metrics, workflow accuracy, false-support, exception precision/recall, compaction loss, crash recovery, and export correctness.
- Run repeated-folder soak tests, forced cancellation, worker crashes, daemon restarts, low-disk conditions, and offline first launch.
- Run microVM escape, malformed guest IPC, guest crash, forced termination, scratch exhaustion, zero-NIC, and native-accelerator capability-denial tests on every certified platform.
- Execute the local pilot-corpus protocol and blinded human review without committing customer documents.

Thresholds are versioned before the final run. Minimum invariant thresholds remain 100 percent citation-ID validity, 100 percent approval enforcement, and 100 percent detection of constructed unsupported/traversal/policy-bypass cases. Accuracy, precision, recall, latency, and memory thresholds are workflow- and profile-specific and reported with corpus size and confidence intervals.

Gate:

- M0 through M10 gates remain green on the packaged product.
- Local 12 and Local 16 pass the full workflow, compaction, recovery, and memory suite with the same model, workflow eligibility, retrieval policy, verification policy, and approval policy.
- Hardware classifications and unsupported configurations are reported honestly.
- Known limitations, model/component notices, recovery instructions, and pilot support procedures are documented.

This is the first milestone allowed to move Local 12, Local 16, and Community Desktop MVP claims from research-derived to measured or pilot-ready.

## Explicitly Deferred After M11

1. Python sidecar for additional formats when the native/GGUF routes prove insufficient.
2. MTP and KV-cache-quantization certification as a pinned runtime combination.
3. turbovec evaluation against the LanceDB baseline.
4. MCP position ADR.
5. Additional accounting integrations and direct accounting-system connectors.
6. Legal workflow pack.
7. Application-managed workspace encryption, subject to a dedicated threat model and recovery design.
8. Appliance mode, backup orchestration, identity, multi-user governance, and permission-aware shared retrieval.

Never written in the first implementation: custom parser, custom OCR engine, custom vector database, unrestricted shell tool, broad plugin system, or generic agent brain.

## Change And Commit Policy

- Milestones are acceptance boundaries, not commit-size rules.
- Use small, reviewable commits that each leave relevant fast checks green.
- Tag or otherwise record milestone completion only after its full gate passes.
- Do not combine unrelated refactors with milestone behavior.
- Commit and pull-request authorship follows AGENTS.md: repository-owner authorship only and no AI attribution trailers or generated-by lines.

## Revision History

| Date | Change |
|---|---|
| 2026-07-11 | Initial milestone plan (M0-M11) created with the three-layer architecture, AI-drivable daemon/CLI, tiered Gemma test models, and ground-truth evaluation. |
| 2026-07-11 | Added model distribution policy for development downloads and self-contained offline packages. |
| 2026-07-11 | Reordered the plan after implementation-readiness review: moved accounting, OCR, summary trees, compaction, recovery, and 12B gates before certification; added cross-platform CI and transport, persistent-state and worker-isolation boundaries, held-out/adversarial evaluation, redistribution and supply-chain gates, hardware detection, and pilot-readiness criteria. |
| 2026-07-12 | Replaced command-level worker network policy with a certified no-NIC microVM, added platform launcher gates and typed socket confinement, and retained a narrow OS-sandboxed native GPU exception. |
