# Implementation Plan

Created: 2026-07-11

This document is the milestone-by-milestone plan for the first Vault Desk implementation phase. It is planning material only. The repository remains documentation-only until a future user request explicitly starts milestone M0. Work then proceeds milestone by milestone from this file.

Component choices follow the verified default stack in [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md) and the principles in [TYPESCRIPT_NODE_HARNESS.md](TYPESCRIPT_NODE_HARNESS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DOCUMENT_ENGINE.md](DOCUMENT_ENGINE.md), [RETRIEVAL_AND_VERIFICATION.md](RETRIEVAL_AND_VERIFICATION.md), [SECURITY.md](SECURITY.md), [DESKTOP_DESIGN.md](DESKTOP_DESIGN.md), and [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md).

## Pre-M0 Decisions

The following architecture decisions are resolved in documentation before implementation begins:

- [ADR 0010](adr/0010-electron-and-local-transport.md): Vault Core is a separate process; macOS uses a Unix domain socket and Windows uses a named pipe behind one versioned local-transport contract. Neither platform transport is deferred. Its Electron decision is superseded by ADR 0014.
- [ADR 0011](adr/0011-workspace-state-and-recovery.md): authoritative workspace state is schema-versioned, transactional, single-writer, migration-aware, and separate from rebuildable indexes and caches.
- [ADR 0012](adr/0012-worker-isolation-and-untrusted-documents.md): hostile document and executable-tool work uses a disposable no-NIC microVM with typed host/guest IPC; native GPU inference retains a narrower OS-sandboxed accelerator exception.
- [ADR 0013](adr/0013-first-desktop-runtime.md): node-llama-cpp with the pinned official QAT GGUF is the first runtime to certify on both Windows and macOS; MLX and other runtimes remain adapter-backed later candidates.
- [ADR 0014](adr/0014-tauri-desktop-shell.md): Tauri v2 with React/TypeScript is the desktop shell; the minimal Rust host owns only native shell integration and supervision/bootstrap of the packaged Vault Core sidecar.
- [ADR 0015](adr/0015-deterministic-document-tools-and-code-fallback.md): supported document work uses deterministic typed operations; unsupported transformations may use generated code only in a disposable no-NIC microVM.

M0 may validate exact dependency packages behind these boundaries, but it must not reopen the boundaries without a superseding ADR.

The Community source license (Apache 2.0) and compliance ownership were recorded on 2026-07-15 in [OPEN_SOURCE_BOUNDARY.md](OPEN_SOURCE_BOUNDARY.md), and the root `LICENSE` is committed. Implementation code must not be published under an implicit or undecided license.

Development is platform-independent: work proceeds on whatever platform the developer uses, with cross-platform breadth covered by CI. Gate items that require a specific platform, GPU, or edition (microVM probes, sidecar signing, model loads) are milestone-closure checkpoints, not daily development blockers; when the required machine is not yet available, the item is recorded as an open gate item and the milestone stays open rather than the work stopping.

## Process Architecture

Three layers:

1. **Tauri desktop frontend** — React and TypeScript in an unprivileged operating-system webview plus a minimal Rust host. The host owns window lifecycle, native dialogs, capability-scoped OS integration, exact Vault Core sidecar supervision, and connection bootstrap; it owns no product workflow or policy.
2. **Vault Core backend** — a separate Node.js/TypeScript process. Sessions, jobs, workspace state, policy, audit, indexing, deterministic document operations, retrieval, verification, tools, approvals, model scheduling, and code-fallback routing. It is fully operable without Tauri.
3. **Isolated workers** — no-NIC microVM workers for hostile document parsing and generated-code execution, plus narrowly constrained host-native GPU workers where acceleration requires them. Workers receive job-scoped inputs and cannot directly decide permissions, approvals, exports, or network access.

The real local process boundary exists from M1. Unit tests may call the programmatic core API directly, but every milestone that adds a backend capability also exercises it through the daemon protocol.

## Sandbox Architecture

The certified hostile-work sandbox is a disposable microVM with an immutable guest image, job-scoped read-only inputs, bounded ephemeral scratch storage, and versioned typed host/guest socket IPC. The VM configuration contains no virtual network adapter and exposes no general host-network proxy. Network isolation must not depend on matching commands, executables, domains, URLs, addresses, or protocols.

The first platform launchers to validate are research-derived until M0 confirms them:

- macOS 26 on Apple silicon: Apple Containerization or Virtualization.framework without a network device.
- Windows Pro or Enterprise: HCS/Hyper-V without a virtual network adapter.
- Linux after desktop support opens: Firecracker/KVM without `virtio-net`.

Process-only fallbacks are compatibility modes and cannot satisfy certification gates. When the first external integration is approved after this implementation, a separate Vault Core broker will own its credentials, destination policy, approval, limits, and audit; neither the model nor the microVM will receive a generic socket or fetch primitive.

The first node-llama-cpp inference worker remains host-native for Metal, CUDA, HIP, and Vulkan acceleration. It is supervised and OS-sandboxed and has no shell, executable tools, credentials, approval authority, arbitrary workspace access, or external network capability. A runtime that requires local IPC may receive only a private supervisor-created endpoint with a fixed protocol; that endpoint is never exposed to a model, guest, webview, or arbitrary caller. OCR and layout workers may use this exception only when required acceleration cannot be preserved inside the microVM and the exception passes the native-worker gates.

The code-interpreter guest is a distinct immutable microVM role. Every job starts fresh with explicit read-only inputs, bounded scratch storage, pinned offline interpreters and libraries, no package installation, and a structured result contract. It can request only bounded model completions through typed host/guest IPC; it never receives a generic model-server socket. Code, environment, inputs, logs, outputs, resource use, and termination are audited, and results remain proposals until Vault Core verifies and approves any side effect.

## Confirmed Product Slice

The first technical slice is cited folder Q&A. The first product slice is the accounting invoice-review workflow:

1. Ingest invoices and a reference spreadsheet.
2. Extract typed supplier, invoice number, date, total, tax, and line-item fields.
3. Identify duplicates, missing fields, inconsistent totals, and spreadsheet mismatches.
4. Produce a cited exception queue with supported, contradicted, low-confidence, and unsupported states.
5. Preview and approve a structured export.

The product slice, compaction, and recovery gates must pass before Local 12 or Local 16 can be called certified.

M7 completes steps 1 through 4 of the product slice. M8 completes step 5 and is the first milestone where the whole slice is acceptance-complete.

## Monorepo Layout (created incrementally from M0)

```text
packages/
  shared/   @vault/shared   Contract-only Zod schemas and inferred types introduced only
                            when their consuming milestone begins; no product dependencies.
  workers/  @vault/workers  MicroVM launchers and guest protocol, native accelerator
                            clients, parser/runtime adapters, code-interpreter guest contract,
                            resource budgets, and typed IPC.
  core/     @vault/core     Vault Core API and daemon: workspace state, policy, audit,
                            jobs, ingestion, index, retrieval, verification, workflows,
                            tools, approvals, and compaction.
  cli/      @vault/cli      Thin JSON-RPC client used for headless product operation and
                            process-boundary acceptance tests.
  desktop/  @vault/desktop  Product Tauri v2 shell: React/TypeScript frontend and minimal
                            Rust host, introduced in M10 after the M0 test-only shell.
  eval/     @vault/eval     Development-only model fetcher, deterministic fixtures,
                            held-out corpus, platform/gate assertions, and bench harness.
```

Toolchain: pnpm monorepo, TypeScript strict with NodeNext modules, Biome, vitest, tsx for development commands, and tsc for builds. M0 pins the exact Node.js runtime and pnpm version used by CI and sidecar packaging. A pinned Rust toolchain and Cargo are used only by the M0 test-only Tauri shell, the M10 product Tauri host, and any narrow native microVM helper explicitly approved by the M0 platform decision. Package and native dependency versions are locked. Schemas are added just in time rather than designing every future contract in M1.

The file-level blueprint for these packages — which modules exist, the milestone each file first appears in, module dependency rules, and the minimal-code working agreement — is [IMPLEMENTATION_STRUCTURE.md](IMPLEMENTATION_STRUCTURE.md).

## Workspace State And Recovery

Vault Core owns one schema-versioned workspace format:

- A transactional catalog is authoritative for jobs, manifests, document identities, parser records, sessions, approvals, preferences, user-visible warnings, evidence-pack references, verification outcomes, and migrations.
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

1. **Programmatic API** — M1 starts with `createVaultCore({ workspaceDir })`. M2 adds the required model-store and profile inputs when inference first consumes them; M10 adds the installed-bundle store and provisioned trust-root inputs when bundle import exists. A separate public test-harness constructor accepts explicit port implementations and returns the same facade, allowing deterministic fakes without turning infrastructure selection into a product option.
2. **Daemon** — M1 starts with `vault-cored --workspace <dir>` and adds the same just-in-time asset inputs as the programmatic API. It serves versioned JSON-RPC 2.0 over a Unix domain socket on macOS and a named pipe on Windows. The endpoint is restricted to the current operating-system user. TCP is not enabled for desktop mode.
3. **CLI** — `vault ingest`, `vault ask`, `vault workflow invoice-review`, `vault approvals`, `vault export`, `vault audit`, `vault compact`, `vault bundles install`, `vault bundles list`, `vault jobs cancel`, `vault jobs resume`, and `vault status` speak only to the daemon.

Protocol contracts include request and job IDs, idempotency keys for mutations, cancellation, bounded streaming, backpressure, structured errors, protocol-version negotiation, reconnect behavior, and server-to-client notifications. `--json` writes exactly one final machine-readable document to stdout; progress and diagnostics use stderr or an explicit event-stream mode.

The daemon skeleton and CLI health command arrive in M1. Every later milestone grows the same protocol instead of delaying serialization, lifecycle, and cross-platform behavior until the UI milestone.

## Model And Asset Distribution

Development models are fetched by a hash-pinned tool into a local cache from the official publisher repositories on Hugging Face.

Per [ADR 0016](adr/0016-model-agnostic-defaults-and-managed-downloads.md), the product has two distribution flavors:

- **Bundled build** — the M10/M11 target: bundles every required runtime asset, has no downloader or network fallback, and completes first launch with zero downloads.
- **Model-download build** — sequenced after M11: ships every runtime asset except generation models (the encoder and OCR/layout assets stay bundled) and installs generation models through the typed Vault Core network broker from a signed catalog of allowlisted official repositories, with hash verification before a model becomes loadable. This flavor is the broker's first approved integration and follows the recommendations-first, search-by-name experience in [DESKTOP_DESIGN.md](DESKTOP_DESIGN.md).

The model manifest distinguishes:

- `development`: E2B test model, never shipped.
- `candidate_to_ship`: asset intended for packaging but blocked on technical and redistribution review.
- `ships`: asset approved for redistribution, included in the installer, covered by notices, and verified by SHA-256 in the build.

Qwen3-Embedding-0.6B and every OCR or layout model begin as `candidate_to_ship`. They cannot become `ships` until redistribution terms, required notices, installer size, and offline operation are reviewed. M10 produces a third-party notice bundle, dependency and model SBOM, artifact manifest, and signed platform packages.

The installed manifest also defines the user-visible generation models. A one-model build renders the model name as static text. A multi-model build exposes only installed `ships` models compatible with the detected hardware and selected workflow. It never accepts an arbitrary model path, runtime endpoint, or unsigned manifest entry.

## Continuous Verification

CI begins in M0 and grows only when the corresponding implementation exists:

- M0 macOS and Windows jobs run install, typecheck, lint, source-boundary checks, deterministic-fixture tests, the test-only Tauri shell gate, provisional microVM platform probes, and native dependency load smoke tests.
- M1 adds daemon lifecycle, workspace, CLI transport, and certified microVM-launcher jobs on macOS and Windows. Linux core unit and integration jobs begin when the core package exists; Linux remains outside initial desktop certification.
- Hardware/model jobs begin with M2. They are self-hosted or manually invoked, never silently skipped once required by a gate, and retain machine-readable reports.
- Parser, index, workflow, and long-session jobs are added with M3 through M9 rather than appearing as empty or skipped M0 jobs.
- Packaged-build jobs begin with M10 and cover platform-native build, asset-manifest checks, protocol smoke, and no-network first launch.

The local `pnpm verify` command remains the fast developer entry point. CI and local verification must use the same underlying commands.

## Test Tiers

| Command | Purpose | Requires |
|---|---|---|
| `pnpm test` | Focused unit and contract tests | No models or native document corpus |
| `pnpm test:integration` | Real parsers, workspace store, daemon, and LanceDB over deterministic fixtures | Generated development corpus |
| `pnpm test:llm` | Fast LLM invariants and workflow development | Gemma 4 E2B QAT plus Qwen3-Embedding-0.6B |
| `pnpm test:gate --milestone <n>` | Acceptance for one milestone, including platform and security gates | The platforms, assets, and workers named by that milestone; LLM-facing milestones require Gemma 4 12B QAT |
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

Deterministic assertions cover typed extraction, normalized values, citation-anchor validity, identifier and cell-text retrieval, calculations, deterministic-versus-code routing, approval behavior, and verifier states. Evaluation reports precision and recall, false-support rate, false-positive and false-negative exception rates, confidence intervals, latency, memory, and recovery behavior.

Exact matching is required for typed identifiers, amounts, dates, and enumerated fields. It is not treated as a complete quality measure for summaries or reports; those receive coverage checklists and blinded human review before pilot readiness.

## Milestones

Each milestone builds on previous gates, introduces only the contracts it consumes, leaves `pnpm verify` green, and records unresolved risks rather than hiding them.

Gate invariants are cumulative, but provisional harnesses are not permanent product dependencies. When M1 replaces the M0 microVM probe or M10 replaces the M0 Tauri shell, the corresponding `m0-*.test.ts` assertions are redirected to the production implementation before the provisional source is removed.

### M0 — Phase change, minimal scaffold, CI, models, and evaluation corpora

Scope:

- On the explicit user request that starts M0, first rewrite AGENTS.md and the no-code section of TYPESCRIPT_NODE_HARNESS.md to authorize only M0 scaffold and validation work. The documentation-only rules must not remain in force while M0 code is being written. After the gate, record M0 completion; M1 still begins only on an explicit user request.
- Pin Node.js and pnpm, then create the pnpm workspace, root TypeScript/Biome/vitest configuration, lockfile, source-limit and dependency-boundary checks, and only the package manifests M0 consumes. Add later package manifests when their first source file appears; hand-written worker-image metadata may exist before the workers package becomes executable in M1. Pin the Rust toolchain without creating product UI in M0.
- Add cross-platform CI and native dependency load smoke jobs.
- Add a committed test-only Tauri shell under `@vault/eval` and use it to select and validate the Node sidecar executable-packaging/signing path later used for Vault Core, pinned Tauri v2 licensing, capability configuration, platform webviews, and a minimal signed sidecar launch on Windows and macOS. It contains no product UI and is removed after the M10 product-shell tests cover the same boundary.
- Add committed test-only platform probes under `@vault/eval` for the macOS and Windows microVM APIs, no-NIC configuration, host/guest socket, packaging, edition requirements, and guest-image lifecycle; record findings before choosing the M1 launcher dependencies.
- Add the canonical machine-readable model manifest plus a hash-pinned development-only fetcher. Redistribution status uses `development`, `candidate_to_ship`, and `ships`; product code never depends on `@vault/eval` to read the installed manifest.
- Generate development and held-out fixture corpora with typed ground truth, permitted source anchors, and negative/adversarial cases.
- Record dependency licenses and create the first machine-readable dependency/model inventory.
- Validate maintained archive, TUF-style metadata, signature, and offline-verification libraries for Knowledge Bundles. Record the selected M5 reader and M10 import direction in `docs/adr/0017-knowledge-bundle-format-and-trust.md` and add it to the AGENTS.md documentation map; do not stabilize a transport format before that ADR is accepted.
- Contribution activation is deferred to the v1 launch (after M11). Through v1, the repository owner commits directly to `main` without pull-request gates, keeping each commit small and leaving `pnpm verify` green. Implementation contributions remain closed; enable GitHub private vulnerability reporting early since it costs nothing and gates nothing.
- Resolve every item in IMPLEMENTATION_STRUCTURE.md's M0 open-item list and record each decision in the owning manifest, configuration, ADR, or blueprint before the gate closes.

Gate:

- The root `LICENSE` is present, and the compliance inventory records the responsible owner for dependency, model, notice, and redistribution decisions.
- Fixture generation is byte-deterministic.
- Ground truth covers positive, negative, contradiction, locale, corruption, and prompt-injection cases.
- Hash mismatch and unapproved `ships` transitions fail.
- macOS and Windows CI use the pinned Node.js and pnpm versions and run `pnpm verify` successfully.
- A minimal Tauri test shell launches only the allowlisted signed executable produced by the selected Node sidecar packaging path; webview attempts to invoke arbitrary commands, arguments, paths, URLs, or endpoints fail.
- The selected macOS and Windows sandbox backends demonstrate a booted minimal guest with typed socket round-trip and zero virtual network adapters; unsupported editions or hardware fail with an explicit compatibility classification.
- ADR 0017 records the Knowledge Bundle dependency and transport/trust decision; any claim not proven by M0 remains explicitly research-derived.
- IMPLEMENTATION_STRUCTURE.md has no unresolved M0 item whose answer changes an M1 file, dependency, language, or security boundary.
- AGENTS.md reflects the active implementation phase and keeps work milestone-scoped.
- Implementation contributions remain closed; the contribution-activation checklist is deferred to the v1 launch gate below.

### M1 — Workspace state, core security primitives, daemon skeleton, and CLI health

Scope:

- Introduce only the shared schemas needed for workspace identity, jobs, policy decisions, audit events, JSON-RPC envelopes, worker frames/resource limits, and typed errors.
- Implement the schema-versioned workspace catalog, immutable artifact writes, single-writer lock, migration harness, and rebuildable-state boundary.
- Implement `WorkspaceScope` and `ScopedFileSystem`; direct filesystem, local-transport, and process-spawn imports are denied outside the explicit storage, daemon/client, worker-launch, guest-I/O/interpreter, development, and verification boundaries in IMPLEMENTATION_STRUCTURE.md.
- Implement the redaction-aware hash-chained audit log.
- Implement the daemon lifecycle, macOS socket, Windows named pipe, endpoint permissions, version negotiation, request IDs, cancellation, and `vault status`.
- Implement the common microVM launcher contract, verified immutable guest image, job-scoped read-only input attachment, bounded ephemeral scratch storage, typed host/guest socket, resource limits, cancellation, termination, and cleanup.
- Implement the macOS and Windows no-NIC backends selected in M0. Do not create a virtual network adapter or expose a general host-network proxy.

Gate:

- Traversal, symlink escape, out-of-scope paths, and time-of-check/time-of-use file replacement are rejected.
- Abrupt termination cannot leave partially committed authoritative state.
- Audit tampering is detected without requiring raw document content in routine records.
- Daemon start, health, restart, incompatible-version, and current-user endpoint tests pass on macOS and Windows.
- Sandbox configuration inspection proves zero virtual network adapters, and guest probes for DNS, IPv4, IPv6, LAN, multicast, and host-network reachability fail without command or destination matching.
- The host/guest socket accepts only the versioned worker protocol and cannot forward arbitrary traffic; process-only compatibility mode cannot report a certified result.

### M2 — Supervised inference worker and early 12B canary

Scope:

- Add the runtime adapter contract and a separate supervised inference-worker process.
- Apply the native accelerator boundary: OS-enforced external-network denial, no shell or executable tools, no credentials or approval authority, only fixed supervisor-owned local IPC where required, and only job-scoped model/evidence inputs resolved by Vault Core.
- Implement node-llama-cpp behind worker IPC with model resolution, grammar-enforced structured output, embeddings, cancellation, timeout, memory-budget reporting, and typed failure states.
- Add a deterministic fake worker for unit tests.
- Add a resource scheduler that prevents generation, embeddings, and later vision work from exceeding the active profile budget.

Gate:

- Worker crash, cancellation, timeout, malformed IPC, missing model, and out-of-memory paths are contained and audited.
- E2B structured generation and Qwen3-Embedding-0.6B smoke tests pass.
- Gemma 4 12B loads, produces grammar-valid output, and shuts down cleanly on at least one Local 12-class and one Local 16-class target before later LLM work proceeds.
- Native runtime loading passes on the initial macOS and Windows paths.
- Native-worker probes prove external-network denial and absence of arbitrary workspace, credential, shell, and tool authority; any supervisor-created local endpoint accepts only its fixed worker protocol.

### M3 — Native document ingestion and crash-consistent manifests

Scope:

- Add SourceAnchor and CanonicalDocument schemas as consumed by ingestion.
- Implement inventory, hashing, deduplication, routing, canonical artifact storage, and durable resumable manifests.
- Run native PDF, DOCX, XLSX, CSV, and EML parsers inside the no-NIC microVM boundary.
- Preserve page, heading, paragraph, table, sheet, cell, formula, typed-value, and attachment anchors.
- Implement deterministic exact and case-normalized spreadsheet text search over canonical cells and displayed values.
- Surface unsupported, corrupt, password-protected, MIME-spoofed, excessive-size, and changed-during-ingest states.

Gate:

- Real parsers pass on both fixture corpora with no mocked parser at acceptance.
- Parser acceptance records the certified microVM backend and rejects process-only compatibility mode.
- Killing workers or Vault Core at every manifest transition resumes without duplicate or missing work.
- Originals remain immutable; identical content deduplicates while retaining all path references.
- Zip/decompression bombs, oversized outputs, and parser hangs are stopped by resource limits.
- A nested folder of XLSX fixtures is searchable for `avans` across all sheets without a model call or generated code; every hit returns file, workbook, sheet, cell, value, and source hash.
- Formula/displayed-value, Unicode, blank, merged-cell, hidden-sheet, malformed, and password-protected workbook cases produce the specified results or explicit warnings.
- Declared-versus-detected media-type mismatches are rejected or classified before a parser can treat the declared type as authoritative.

### M4 — OCR, layout, and low-confidence routing

Scope:

- Add supervised PaddleOCR-VL and Granite-Docling routes for scanned, mixed, table-heavy, and low-confidence pages.
- Preserve OCR regions, bounding boxes, parser/model versions, confidence, and warnings in CanonicalDocument.
- Unload or serialize GPU workers according to the profile resource scheduler; document workers must not silently steal the certified generation budget.
- Keep CPU parsing inside the microVM. Any GPU-backed OCR or layout worker that uses the native accelerator exception must pass the same OS-enforced external-network and authority-denial probes as inference.

Gate:

- Scanned and layout-complex held-out fixtures recover ground-truth fields and anchors at defined precision and recall.
- Worker crashes resume from page-level manifest cursors.
- Peak memory under OCR-to-generation handoff fits the provisional Local 12 and Local 16 budgets.
- OCR and layout assets remain `candidate_to_ship` until redistribution review completes.

### M5 — Chunking, hybrid index, and retrieval

Scope:

- Add Chunk and retrieval contracts.
- Implement structure-aware page, heading, paragraph, table, row-window, sheet, and OCR-region chunks sized by retrieval quality tests within the encoder's input limit.
- Cache embeddings by chunk hash, encoder version, dimension, and normalization version.
- Use LanceDB for full-text and dense retrieval with reciprocal-rank fusion and metadata filters.
- Provide exact identifier, date, amount, name, and clause search.
- Add separate deterministic development and held-out unpacked Knowledge Bundle fixtures and the minimum reader contract they exercise: immutable manifest identity, source and normalized-resource roles, bundle digest, jurisdiction, validity interval, authority class, and separate evidence scope. Build retrieval indexes locally; do not implement bundle distribution or signing yet.
- Apply the M0-recorded bundle reader decision. M5 reads unpacked immutable fixture bundles only; archive import, signature policy, update metadata, and activation remain M10 responsibilities.

Gate:

- Every chunk resolves to an immutable source anchor.
- Index rebuild from authoritative state is deterministic and restart-safe.
- Held-out recall, citation-candidate precision, and exact-search thresholds are defined before measurement and pass on born-digital and scanned facts.
- File changes invalidate only affected canonical artifacts, chunks, embeddings, and index rows.
- Customer documents and Knowledge Bundle resources remain separately filterable; every bundle-derived candidate resolves to the exact bundle digest and immutable source anchor.

### M6 — Evidence packs, cited generation, and deterministic verification

Scope:

- Add EvidencePack, Claim, Citation, and VerificationResult schemas.
- Build reproducible, token-budgeted evidence packs containing exact matches, retrieved chunks, contradictions, and parser warnings.
- Generate task-specific typed answers with claim-level citations.
- Persist each cited Q&A turn as explicit session records that reference its evidence pack and verification result; do not persist hidden model reasoning.
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

### M8 — Typed tools, bounded code fallback, approvals, export, and complete CLI slice

Scope:

- Add just-in-time ToolDefinition, Approval, Preview, and ToolResult schemas. Reuse the PolicyDecision contract introduced in M1 and extend it only with tool-specific decision reasons when required.
- Implement read-only search/open/table tools as typed Vault Core queries through scoped adapters, not shell commands, and add an approval-gated structured exception export.
- Implement typed deterministic filter, sort, join, compare, aggregate, arithmetic, and extraction operations over canonical documents.
- Add the Core-side `CodeInterpreterPort`, then implement the bounded code-interpreter guest role for transformations that cannot be expressed through supported operations. It uses fresh no-NIC microVMs, read-only inputs, pinned offline libraries, typed model mediation, strict resources, structured results, full audit, and destruction after every job. The port returns proposals only; policy, verification, approval, and authoritative writes remain in Core.
- Benchmark OpenCode against a minimal Vault Desk-owned guest loop on the same offline functional, security, footprint, cancellation, packaging, and audit corpus. Adopt OpenCode only if it passes every boundary and materially reduces maintained code.
- Export through ScopedFileSystem using preview, destination validation, atomic write, immutable originals, audit, and rollback where applicable.
- Complete CLI commands for ingest, ask, invoice-review, approvals, export, audit, `vault jobs cancel`, and `vault jobs resume`; M9 adds `vault compact` when compaction exists.
- Start the bounded read-tool-loop evaluation with Vercel AI SDK over a thin local `InferencePort` adapter and compare it with the explicit loop. No SDK cloud provider, telemetry, or network path is configured. Keep the SDK only if it preserves Vault Desk policy, approval, audit, cancellation, and structured-output contracts and reduces maintained code.
- Keep the two comparison harnesses development-only and reproducible under `@vault/eval`, record both selection results, and include only the selected implementation and dependencies in product packages.

Gate:

- Schema-invalid or document-injected tool requests never reach policy or execution.
- Approval is durable across daemon restart; rejection and expiration cause no side effect.
- The daemon/CLI drives the full invoice-review and approved export flow on E2B and 12B.
- Export correctness is checked by parsing the exported artifact and reconciling it to verified workflow state.
- No worker or model can write authoritative workspace state or exports. A microVM guest may write only to its bounded ephemeral scratch and declared result channel; Vault Core validates and commits accepted results.
- No executable tool worker has a virtual NIC or a generic network broker; an external integration, when later introduced, must cross the separate typed Vault Core broker.
- Supported deterministic operations never route to generated code.
- Product dependency and export graphs contain only the selected read loop and code-interpreter implementation; comparison adapters remain reachable only from `@vault/eval`.
- Generated code cannot reach host paths, credentials, package managers, external or local networks, the general Vault Core API, approvals, or exports; loop, process, memory, disk, output, malformed-IPC, crash, and cancellation attacks are contained and audited.
- Code-produced numeric and tabular results are source-anchored and deterministically rechecked where applicable before presentation.

### M9 — Summary trees, structured compaction, recovery, and long-session acceptance

Scope:

- Build page, section, table, sheet, document, folder, and task summary nodes separately from the ledger store, with source anchors, prompt/model versions, evidence IDs, warnings, and verification state. Summaries are derived records; ledgers are replayable state.
- Complete the replayable ledger set without creating a central ledger owner: reuse the session/evidence records from M6 and the job/artifact/audit records from M1, add preference and user-visible warning records in their owning modules, and build compaction replay views over those authoritative records.
- Compact at the documented 70/85/95 percent triggers and after long tools, approvals, and exports.
- Add manual compact, source-change invalidation, post-compaction replay, and the `vault compact` daemon/CLI path.

Gate:

- Run the required 30-minute mixed-folder scenario on Local 12 and Local 16 with at least three forced compactions.
- Pre-compaction decisions, citations, warnings, pending approvals, and tool results survive or explicitly report invalidation.
- Compaction loss rate, summary coverage, crash recovery time, and folder-level citation precision pass defined thresholds.
- The workflow continues after daemon and worker restarts without reloading the folder or restating decisions.

### M10 — Tauri shell and self-contained cross-platform package

Scope:

- Add the minimal shared Tauri command/result contracts, then implement the minimal Tauri v2 Rust host and React/TypeScript frontend over the existing daemon protocol. The webview has no generic shell, process, environment, network, or unrestricted filesystem capability.
- Implement the layout in DESKTOP_DESIGN.md: a header spanning the full window with session name and active model; chats followed by working folders in the persistent left sidebar below it; conversation content in the main pane; and the chat composer anchored at the bottom of that pane.
- Provide folder selection, ingest progress, invoice review, chat, citation previews, human-review queue, approval dialog, export preview, audit/task log, cancellation, and support settings without exposing runtime infrastructure configuration.
- Render a single bundled model as static header text with no selector affordance. If a package contains multiple approved models, render a selector containing only installed compatible `ships` entries from the signed manifest.
- Build macOS and Windows packages containing the approved product generation model or models, embedding model, OCR/layout assets, and native runtimes only after every packaged asset is approved as `ships`.
- Generate notices, SBOMs, artifact manifests, hashes, signatures, and platform packaging metadata.
- Add the Core-side `BundleInspectorPort`, then implement the M0-selected Knowledge Bundle trust verifier, hostile-archive guest inspector, separate schema-versioned installed-bundle catalog, content-addressed object store, and atomic activation transaction. The guest returns a bounded inventory only; Core owns trust decisions and state changes. Bundle-catalog migrations are backup-before-migrate and leave the prior catalog usable on failure. Install new immutable versions beside old ones, retain any version referenced by evidence, audit, export, or retention policy, and collect objects only when the catalog proves no live reference. Validate offline imports including corrupt, expired, rolled-back, oversized, traversal, duplicate-path, and incompatible-accelerator cases.
- Expose bundle installation and installed-version listing through the versioned daemon protocol and `vault bundles install` / `vault bundles list`; Core canonicalizes and stages the explicit user-selected archive path through `ScopedFileSystem`, while the CLI never opens or validates the hostile archive itself.
- Add hardware capability detection that maps supported machines to Certified, Compatible, or Experimental without changing verification policy.

Gate:

- Every Tauri command and daemon message is schema-tested; the webview cannot invoke arbitrary shell commands, processes, paths, URLs, local endpoints, or model files.
- The required sidebar, header, model presentation, conversation, and bottom-composer layout passes keyboard, screen-reader, focus-restoration, resize, and 200 percent scaling checks.
- Single-model packages show no dropdown affordance; multi-model test packages reject uninstalled, unsigned, incompatible, and arbitrary-path models.
- Packaged builds complete first launch, microVM boot, ingestion, invoice review, citations, approval, and export with zero downloads.
- Packaged sandbox evidence proves that hostile parsing used the platform no-NIC microVM, not a process-only fallback, and that native accelerator workers had OS-enforced external-network denial and only fixed supervisor-owned local IPC.
- No development model, `@vault/eval` code/dependency, unselected loop implementation, or unapproved candidate asset leaks into the package.
- A bundled offline repository snapshot verifies from the provisioned root without network access; failed or interrupted bundle import leaves the prior active version intact.
- Bundle update and cleanup tests preserve every version/object referenced by evidence, audit, export, or retention policy and remove only proven orphans.
- Windows and macOS packages pass install, launch, upgrade, uninstall, workspace-preservation, and crash-recovery smoke tests.

### M11 — Full 12B certification and pilot readiness

Scope:

- Run the complete package and workflow suite with Gemma 4 12B QAT on actual Local 12 and Local 16 target machines.
- Record cold/warm start, prefill latency by certified context, first-token latency, tokens per second, ingest/OCR throughput, time to first cited result, peak RAM/VRAM, retrieval and citation metrics, workflow accuracy, false-support, exception precision/recall, compaction loss, crash recovery, and export correctness.
- Run repeated-folder soak tests, forced cancellation, worker crashes, daemon restarts, low-disk conditions, and offline first launch.
- Run microVM escape, malformed guest IPC, generated-code abuse, guest crash, forced termination, scratch exhaustion, zero-NIC, Tauri capability-denial, sidecar-identity, and native-accelerator capability-denial tests on every certified platform.
- Execute the local pilot-corpus protocol and blinded human review without committing customer documents.

Thresholds are versioned before the final run. Minimum invariant thresholds remain 100 percent citation-ID validity, 100 percent approval enforcement, and 100 percent detection of constructed unsupported/traversal/policy-bypass cases. Accuracy, precision, recall, latency, and memory thresholds are workflow- and profile-specific and reported with corpus size and confidence intervals.

Gate:

- M0 through M10 gate invariants remain green on the packaged product, including M0 assertions migrated from provisional harnesses to their production replacements.
- Local 12 and Local 16 pass the full workflow, compaction, recovery, and memory suite with the same model, workflow eligibility, retrieval policy, verification policy, and approval policy.
- Hardware classifications and unsupported configurations are reported honestly.
- Known limitations, model/component notices, recovery instructions, and pilot support procedures are documented.

This is the first milestone allowed to move Local 12, Local 16, and Community Desktop MVP claims from research-derived to measured or pilot-ready.

## V1 Launch And Contribution Activation

The v1 launch follows M11 certification and is when the repository opens to collaborators. At launch, activate [the contribution workflow](../CONTRIBUTING.md): replace owner-only direct commits with human contributor authorship and DCO 1.1 sign-off, install the repository-scoped DCO GitHub App, enable web commit sign-off, and protect `main` with pull requests, required DCO and applicable CI checks, resolved conversations, and force-push and deletion denial. Create the `ready-for-contribution` label and advertise only accepted, milestone-scoped issues with that label. Exercise contributor bootstrap, a failed and successful DCO check, the pull request template, `pnpm verify`, and one gate report without requiring an approval count until a second maintainer exists.

## Explicitly Deferred After M11

1. The model-download build flavor: managed generation-model installation through the typed Vault Core broker per ADR 0016, including the signed model catalog, allowlisted repositories, download UI, and broker audit. The bundled build certifies first.
2. Python sidecar for additional formats when the native/GGUF routes prove insufficient.
3. MTP and KV-cache-quantization certification as a pinned runtime combination.
4. turbovec evaluation against the LanceDB baseline.
5. [PrismML Bonsai](https://prismml.com/news/bonsai-8b) evaluation after its low-bit formats and required upstream runtime backends are stable in pinned releases. Treat it as research-derived and require the same license, redistribution, offline packaging, cross-platform, memory, context, structured-output, tool-use, workflow-quality, citation, and verification gates before changing any certified default.
6. MCP position ADR.
7. Additional accounting integrations and direct accounting-system connectors.
8. Legal workflow pack.
9. Application-managed workspace encryption, subject to a dedicated threat model and recovery design.
10. Appliance mode, backup orchestration, identity, multi-user governance, and permission-aware shared retrieval.

Never written in the first implementation: custom parser, custom OCR engine, custom vector database, unrestricted shell tool, persistent coding workspace, broad plugin system, or generic agent brain.

## Change And Commit Policy

- Milestones are acceptance boundaries, not commit-size rules.
- Use small, reviewable commits that each leave relevant fast checks green.
- Tag or otherwise record milestone completion only after its full gate passes.
- Do not combine unrelated refactors with milestone behavior.
- Through the v1 launch, the repository owner commits directly to `main` without pull-request gates, following AGENTS.md's repository-owner-only authorship rule. After v1 contribution activation, human contributors author and DCO-sign every commit through pull requests; AI authorship, co-authorship, attribution trailers, and generated-by lines remain prohibited in both phases.

## Revision History

| Date | Change |
|---|---|
| 2026-07-11 | Initial milestone plan (M0-M11) created with the three-layer architecture, AI-drivable daemon/CLI, tiered Gemma test models, and ground-truth evaluation. |
| 2026-07-11 | Added model distribution policy for development downloads and self-contained offline packages. |
| 2026-07-11 | Reordered the plan after implementation-readiness review: moved accounting, OCR, summary trees, compaction, recovery, and 12B gates before certification; added cross-platform CI and transport, persistent-state and worker-isolation boundaries, held-out/adversarial evaluation, redistribution and supply-chain gates, hardware detection, and pilot-readiness criteria. |
| 2026-07-12 | Replaced command-level worker network policy with a certified no-NIC microVM, added platform launcher gates and typed socket confinement, and retained a narrow OS-sandboxed native GPU exception. |
| 2026-07-12 | Added staged Knowledge Bundle contracts at M5 and signed offline import, rollback, and hostile-archive gates at M10. |
| 2026-07-13 | Replaced Electron with Tauri v2, specified the desktop layout and model selector behavior, and added deterministic document operations with a bounded no-NIC generated-code fallback. |
| 2026-07-13 | Linked IMPLEMENTATION_STRUCTURE.md as the file-level blueprint for the monorepo layout. |
| 2026-07-13 | Reconciled phase entry, just-in-time CI, M0 platform harnesses, schema ownership, MIME validation, session persistence, tool policy reuse, scratch-write authority, compaction ownership, and M10 bundle import with IMPLEMENTATION_STRUCTURE.md. |
| 2026-07-15 | Added the M0 contribution activation gate for licensing, human DCO authorship, GitHub protection, private reporting, and contribution-ready issues. |
| 2026-07-15 | Applied ADR 0016: Qwen3-Embedding-0.6B replaces EmbeddingGemma in test tiers and gates, two distribution flavors defined with the model-download build deferred after M11, and the Knowledge Bundle ADR renumbered to 0017. |
| 2026-07-15 | Added PrismML Bonsai as a research-derived post-M11 evaluation candidate, gated on stable upstream runtime support and the full model-certification suite. |
| 2026-07-15 | Recorded the committed Apache 2.0 license as resolved, made development platform-independent with platform-bound items as milestone-closure checkpoints, and moved contribution activation from M0 to the v1 launch with direct-to-main owner commits until then. |
