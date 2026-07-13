# Implementation Structure

Created: 2026-07-13

This document is the companion to [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). The plan defines the sequence and the acceptance gates; this document defines the concrete repository shape: which folders exist, which module owns which responsibility, when each file appears, and how much code we allow ourselves to write. It is planning material only. The repository remains documentation-only until milestone M0 explicitly begins.

## Startup Working Agreement

We work as a startup. The scarce resource is maintained code, and every line written before its milestone is a liability, not progress. The default agent instinct is to catch every case; here we do the opposite on purpose:

1. **Minimum code that passes the gate.** The milestone gates in IMPLEMENTATION_PLAN.md define "enough". Code beyond what a gate exercises is scope creep and gets cut in review.
2. **Handle named cases, refuse the rest.** The security invariants and fixture-corpus cases enumerated in [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md) get exhaustive handling. Every other unexpected input maps to one typed `unsupported` outcome with a reason string. An explicit refusal is a passing result, not a bug.
3. **One file until it needs two.** A module starts as a single file. It becomes a folder only when a second file is forced by a real change, not by anticipated growth.
4. **No abstraction before the second implementation.** The only exception is an ADR-mandated adapter contract, which stays a one-page interface with exactly one default implementation.
5. **No option until two call sites disagree.** No boolean flags, config keys, or extension points for hypothetical callers.
6. **Delete the requirement before coding around it.** If a requirement forces disproportionate code, propose cutting the requirement first and record the cut here.
7. **Boundaries are not negotiable.** The ADR-fixed security boundaries — no-NIC microVM, typed tools, approvals, audit, scoped filesystem — are the product and get real code and real tests. Minimalism applies to breadth (formats, runtimes, configuration, UI polish), never to these boundaries.

Even inside the always-handled list, "handling" usually means detect, refuse with a typed state, and audit — not feature work. A password-protected workbook gets an explicit `password_protected` outcome, not a password-recovery flow.

## Clean Code Priorities

The twenty Clean Code-derived principles in AGENTS.md (canonical list, mirrored in [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md)) are the top-priority review bar for every line of implementation code. Priority order for any implementation decision: the ADR security boundaries first, the milestone gate second, these principles third, and delivery speed last. The principles and the startup working agreement never conflict: minimal code here means the smallest *clear* solution, and clean code here never means more code — principle 17 forbids exactly the speculative structure the working agreement cuts.

How each principle binds to this blueprint:

1. **Intention-revealing names** — modules are named for the product responsibility they own (`invoice-review.ts`, `approvals.ts`), never for a pattern (`manager.ts`, `handler.ts`, `utils.ts`); audit event names read as facts that happened.
2. **Small functions, one decision each** — a function that parses and also routes gets split; ingest routing, policy decisions, and verification checks are each their own function. Mechanically backed by the enforced limits in Module Rules (40 lines, complexity ≤ 10, nesting ≤ 3, parameters ≤ 4).
3. **One level of abstraction per function** — `daemon/methods.ts` translates envelopes and delegates to the facade; it never does workspace or model work inline. Same rule for CLI subcommands and Tauri commands.
4. **One reason to change per module** — the per-package blueprints assign each file exactly one responsibility; a file that would change for two unrelated gates is split at that moment, not before.
5. **Remove duplication before adding options** — one Zod schema source feeds types, validation, and grammars; one IPC frame protocol serves every worker; one transport contract hides the socket/pipe difference.
6. **Explicit typed boundaries over shared state** — everything that crosses a process boundary (daemon, worker, guest, webview) is a `@vault/shared` schema; no ambient globals, no reaching into another package's internals.
7. **Command/query separation** — catalog reads return data and change nothing; mutations go through idempotency-keyed command functions that return an outcome, not data. Exact search (`search/exact.ts`) is pure query; export (`tools/export.ts`) is pure command.
8. **No boolean flag arguments** — two named functions instead of one flagged one; this is also how the working agreement's "no options until two call sites disagree" stays enforceable.
9. **Deliberate errors, handled at the recovering boundary** — every cross-module error is the `shared/errors.ts` envelope; recovery lives only where recovery is possible (worker supervisor restarts, daemon reconnect, migration rollback); everywhere else refuses with a typed state.
10. **Rare, useful comments** — comments state constraints the code cannot show (why zero-NIC is proven by configuration, why a write must be temp-then-rename); never narration.
11. **Conventional, boring formatting** — Biome defaults, no overrides, no style debate in review.
12. **Tests readable as behavior specifications** — gate tests in `eval/gates/` are named after the invariant they prove ("traversal outside scope is rejected"), not after the function they call.
13. **Test behavior, not implementation** — tests exercise the programmatic facade, the daemon protocol, or a worker boundary; no test imports a private helper or mocks a sibling module inside the same package.
14. **Thin adapters around third-party tools** — `index/lance.ts`, the node-llama-cpp worker, and the native parsers stay translation-only; replacing a row of the default component stack must not ripple past its adapter file.
15. **Policy separate from model output** — model proposals are data until `policy/policy.ts` decides; nothing in `evidence/` or `tools/` executes a model-suggested action directly.
16. **Stable structures at persistence and audit boundaries** — catalog schema changes only through numbered migrations; audit records and artifact formats are versioned and append-only; no in-place reshaping of persisted data.
17. **No speculative generality** — the What We Do Not Write list is this principle applied; unused extension points are deleted in review, not deprecated.
18. **Refactor only against current complexity or a proven boundary** — the one-file-until-two rule; restructuring is justified by a change that is happening now, never by an anticipated one.
19. **Dependencies point inward** — the dependency-direction rule in Module Rules: packages depend on `shared` contracts, never on each other's internals, and `core` is depended on by nothing but its own entry points.
20. **Leave it easier to reason about** — the enforced size limits are the mechanical tripwire and the indicative package totals the human one; when the file count or a package's line budget outgrows the blueprint, the next change simplifies before it adds.

## Review: Minimal Interpretation Of The Current Plan

Reviewed 2026-07-13 against IMPLEMENTATION_PLAN.md, TYPESCRIPT_NODE_HARNESS.md, IMPLEMENTATION_QUALITY_BAR.md, and ADRs 0010–0015. The milestone sequence, the package boundaries, and the security boundaries stand unchanged. What this review fixes is how small each subsystem is allowed to be:

- **Daemon protocol** — hand-rolled JSON-RPC 2.0 over `node:net`; the Unix socket and named pipe differ only in the endpoint path behind one connect function. No RPC or IPC framework. One server file plus one method table.
- **Workspace catalog** — one embedded SQLite binding (selected in M0; better-sqlite3 is the candidate) with numbered `.sql` migration files applied in order inside a transaction, backup-before-migrate. No ORM, no migration framework, no repository layer: typed query functions in `catalog.ts`.
- **Schemas** — defined once as Zod schemas in `@vault/shared`; TypeScript types, JSON-RPC validation, and llama.cpp grammars all derive from the same definition. No parallel JSON Schema files.
- **Workers** — plain `child_process` plus one length-prefixed JSON frame protocol shared by every worker. No worker framework, no message bus, no dependency-injection container, no event emitter hierarchy.
- **MicroVM launchers** — the thinnest per-OS shim that satisfies the common launcher contract. M0 decides whether macOS requires a small signed helper binary for Virtualization.framework; if so, that helper owns lifecycle only and no policy, recorded as a narrow exception like the Tauri Rust host.
- **Agent loop** — the default is a thin Vault Desk-owned loop of roughly one file. Vercel AI SDK and OpenCode are each evaluated exactly once, at M8, and adopted only if they delete more code than they add. The expected answer is no.
- **External-connection broker** — not built. No external integration ships before M11, so the boundary is satisfied by writing no outbound-network code at all outside the development-only model fetcher in `@vault/eval`. The broker module is created when the first real integration is approved, not before.
- **Python parser worker** — not built (already deferred after M11 by the plan).
- **Desktop** — roughly eight React components, state held in plain React context over the daemon client. No state-management library, no component library, unless M10 proves the need.

This document together with IMPLEMENTATION_PLAN.md satisfies the Future Implementation Gate in IMPLEMENTATION_QUALITY_BAR.md: the first workflow is invoice review (M7), the product contracts and minimal adapter interfaces are the per-package blueprints below, the invariants are the gate lists, the dependencies are the default component stack, and the intentionally unwritten code is the final section.

## Repository Root (created at M0)

```text
package.json           private root: verify, test, test:integration, test:llm, test:gate, bench scripts
pnpm-workspace.yaml
pnpm-lock.yaml
tsconfig.base.json     strict, NodeNext
biome.json
vitest.workspace.ts
rust-toolchain.toml    pinned for the M10 Tauri shell; no Rust code before M10 except an M0-approved microVM helper
.github/workflows/ci.yml   one workflow: macOS + Windows matrix running pnpm verify
packages/
```

## Package Blueprints

Each file is annotated with the milestone in which it first appears. A file must not be created before its milestone.

### `packages/shared` — `@vault/shared`, contracts only

Depends on Zod and nothing else. Flat `src/`, one file per contract family.

```text
src/
  index.ts        re-exports                                                  M0
  ids.ts          branded IDs, content-hash helpers                           M1
  errors.ts       one typed error envelope (code, message, details)           M1
  rpc.ts          JSON-RPC envelope, request/job IDs, version negotiation     M1
  workspace.ts    workspace identity, job states, audit events, policy decisions  M1
  document.ts     SourceAnchor, CanonicalDocument, parser outcome states      M3
  chunk.ts        Chunk and retrieval contracts                               M5
  evidence.ts     EvidencePack, Claim, Citation, VerificationResult           M6
  workflow.ts     invoice-review typed fields and exception states            M7
  tools.ts        ToolDefinition, Approval, Preview, ToolResult               M8
  compaction.ts   ledger records and compaction events                        M9
```

### `packages/core` — `@vault/core`, Vault Core API and daemon

```text
src/
  index.ts                    createVaultCore facade (programmatic API)              M1
  daemon/
    server.ts                 socket/pipe lifecycle, framing, current-user check     M1
    methods.ts                RPC method table mapping requests to facade calls      M1
  workspace/
    catalog.ts                SQLite transactions, single-writer lock, idempotency   M1
    migrations/NNNN-*.sql     numbered forward migrations                            M1
    artifacts.ts              content-addressed atomic artifact store                M1
    scope.ts                  WorkspaceScope + ScopedFileSystem; all path validation M1
  audit/
    log.ts                    hash-chained append-only log, redaction rules          M1
  jobs/
    jobs.ts                   durable job transitions, cancellation, resume cursors  M1
  policy/
    policy.ts                 pure policy decision functions                         M1
    approvals.ts              durable approval records, rejection, expiry            M8
  runtime/
    supervisor.ts             spawn, restart, and contain worker processes           M2
    scheduler.ts              profile memory budgets across generation/embedding/vision  M2
  ingest/
    ingest.ts                 inventory, hashing, dedup, parser routing              M3
    manifest.ts               resumable ingest manifests                             M3
    ocr.ts                    OCR/layout routing and low-confidence policy           M4
  search/
    exact.ts                  deterministic exact and case-normalized search over canonical cells  M3
  index/
    chunks.ts                 structure-aware chunking                               M5
    embeddings.ts             embedding cache keyed by chunk hash + encoder version  M5
    lance.ts                  LanceDB adapter: full-text, dense, reciprocal-rank fusion  M5
    bundles.ts                minimal Knowledge Bundle reader contract               M5
  evidence/
    pack.ts                   reproducible token-budgeted evidence packs             M6
    generate.ts               cited typed generation through the runtime adapter     M6
    verify.ts                 deterministic claim, citation, and arithmetic checks   M6
  workflows/
    invoice-review.ts         explicit resumable workflow state machine              M7
  tools/
    registry.ts               tool definitions, schema validation, policy gate       M8
    table-ops.ts              deterministic filter/sort/join/compare/aggregate/extract  M8
    export.ts                 previewed, approval-gated export through scope.ts      M8
    code-fallback.ts          route unsupported transforms to the interpreter guest, recheck results  M8
  compaction/
    ledgers.ts                session/task/evidence/artifact/preference/warning ledgers  M9
    compact.ts                threshold triggers, replay, invalidation               M9
tests/                        integration tests: real SQLite, daemon, LanceDB, fixtures
```

### `packages/workers` — `@vault/workers`, process entries and isolation

```text
src/
  ipc.ts                      length-prefixed typed JSON frames used by every worker M1
  microvm/
    launcher.ts               common contract: boot, attach inputs, limits, teardown M1
    macos.ts                  Virtualization.framework / Containerization backend    M1
    windows.ts                HCS/Hyper-V backend                                    M1
    guest/
      parse.ts                guest entry: pdf.js, mammoth, ExcelJS, mailparser → CanonicalDocument  M3
      interpreter.ts          code-interpreter guest loop, typed result contract     M8
  inference/
    worker.ts                 node-llama-cpp child-process entry                     M2
    client.ts                 host-side typed inference client                       M2
    fake.ts                   deterministic fake for unit tests                      M2
  vision/
    worker.ts                 supervised llama-server adapter for OCR/layout GGUFs   M4
images/
  manifest.md                 pinned guest-image contents and hashes; build tooling decided in M0
```

### `packages/cli` — `@vault/cli`, thin daemon client

```text
src/
  main.ts                     subcommand dispatch, argument parsing, exit codes      M1
  client.ts                   JSON-RPC client over socket/pipe, streaming            M1
  output.ts                   --json single-document stdout, progress on stderr      M1
```

Commands live as functions inside `main.ts` until the M8 full slice makes that painful; only then does a `commands.ts` split happen.

### `packages/eval` — `@vault/eval`, models, fixtures, gates

```text
src/
  models.ts                   manifest (development / candidate_to_ship / ships) + hash-pinned dev fetcher  M0
  fixtures/
    invoices.ts               byte-deterministic development corpus generator        M0
    heldout.ts                held-out corpus generator with separate templates      M0
  gates/
    mN-*.test.ts              one file per milestone acceptance gate                 from M1
  bench.ts                    hardware bench and soak harness for Local 12/16        M11
```

### `packages/desktop` — `@vault/desktop`, Tauri shell (all M10)

```text
src-tauri/
  Cargo.toml, tauri.conf.json
  capabilities/default.json   narrow command allowlist
  src/main.rs                 window lifecycle, dialogs, sidecar supervision, connection bootstrap
src/
  main.tsx, app.tsx           header with session name and active model, layout frame
  sidebar.tsx                 chats first, working folders below
  conversation.tsx            messages, tool activity, citations, warnings
  composer.tsx                bottom-anchored chat input
  approvals.tsx               approval cards and export preview
  citations.tsx               evidence preview panel
  settings.tsx                support settings only; no runtime configuration
  daemon.ts                   typed client over Tauri invoke
```

## Module Rules

- **Dependency direction:** `workers`, `cli`, and `desktop` depend on `shared`; `core` depends on `shared` and the host-side clients in `workers`; nothing depends on `core` except its own daemon entry, tests, and gates. `eval` may depend on anything.
- **Filesystem and network access:** direct `fs`/`net` use is lint-forbidden outside `core/workspace/scope.ts`, `core/workspace/artifacts.ts`, `core/daemon/server.ts`, `workers/src/ipc.ts`, the microVM launchers, and the dev-only fetcher in `eval`. This lint rule lands in M1 with the first code it protects.
- **Enforced size limits** (hard, mechanical, part of `pnpm verify` from the first M0 code — a violation fails CI exactly like a failing test):
  - **File length: 300 lines maximum** per source file (`.ts`, `.tsx`, `.rs`), no exemptions in committed product code. Generated fixture output is never committed, so it needs none. Hitting the cap *is* the "real change that forces two files" in working-agreement rule 3: split along a responsibility seam, and if no clean seam exists, that is a design smell to fix, not a limit to waive.
  - **Function length: 40 lines maximum**, and functions should read far smaller than the cap; the cap is the floor of acceptability, not the target.
  - **Cognitive complexity ≤ 10, nesting depth ≤ 3, parameters ≤ 4** per function. More than four inputs means the function wants a typed object from `@vault/shared` or is doing two jobs.
  - Enforcement mechanics: Biome lint rules cover the function-level limits; the file-length cap is one ~20-line check wired into `pnpm verify` (an allowed, permanent exception to the no-custom-infrastructure rule because it is trivially small). CI and local verification run the same commands, so the limits cannot be bypassed locally and discovered in CI.
- **Readability review bar** (human-enforced in every PR, on top of the mechanical limits): each function states one decision at one level of abstraction; early-return over nested conditionals; no clever one-liners where three plain lines are clearer; names long enough to be unambiguous and no longer. A reviewer who has to re-read a function to see what it does requests a split — line count alone passing is not approval.
- **Indicative package totals** through M9 (smell thresholds, not gates): `shared` ≤ 1.5k lines, `core` ≤ 12k, `workers` ≤ 4k, `cli` ≤ 0.6k, `eval` ≤ 4k excluding generated fixtures; roughly sixty source files total. A package over ~10 runtime dependencies requires written justification in the PR. Growth beyond this pace is the signal to stop and simplify.
- **Tests:** unit tests are colocated `*.test.ts`; integration tests live in each package's `tests/`; milestone acceptance lives in `eval/gates/`. Every test must answer yes to one question in the quality bar's test selection policy, or it is not written.
- **Style:** the Clean Code Priorities section above is the review bar; its bindings (command/query separation, the `shared/errors.ts` envelope, one level of abstraction per function) are checked in every PR.

## Edge-Case Policy

Always handled, exhaustively, with tests — the failure classes the gates name:

- Path traversal, symlink escape, out-of-scope paths, time-of-check/time-of-use replacement.
- Crash or kill at any manifest or job state transition; partial-write prevention.
- Audit-log tampering detection.
- Sandbox network probes (DNS, IPv4, IPv6, LAN, multicast, host reachability) and zero-NIC configuration proof.
- Prompt injection and policy-override text inside documents; schema-invalid tool requests.
- Corrupt, oversized, MIME-spoofed, deeply nested, password-protected, and changed-during-ingest files.
- Worker crash, hang, timeout, out-of-memory, malformed IPC, and resource-limit enforcement.
- Approval bypass, expiry, and rejection with no side effects.

Never specially handled — one typed `unsupported` refusal with a reason, and nothing else:

- File formats, encodings, and locales outside the fixture and held-out corpora.
- Hardware below the Local 12 profile.
- Concurrent writers on one workspace (the single-writer lock refuses; there is no merge logic).
- Recovery of encrypted or damaged inputs beyond detection and classification.
- Any model runtime, OS, or accelerator not named in the current certification targets.

## What We Do Not Write

Consolidated from the plan and this review; the first six are permanent plan rules, the rest are startup discipline:

- Custom parser, custom OCR engine, custom vector database, custom model runtime.
- Unrestricted shell tool or persistent coding workspace.
- Broad plugin system or generic agent brain.
- RPC/IPC frameworks, ORMs, migration frameworks, DI containers, event buses, state-management libraries.
- The external-connection broker, until the first approved integration exists.
- The Python parser worker image, until a real format gap forces it (post-M11).
- Speculative configuration surfaces, retry frameworks, or graceful-degradation features for inputs we can refuse.

## Milestone-To-Folder Map

| Milestone | New folders and files |
|---|---|
| M0 | Repository root, `shared` and `eval` skeletons, `eval/src/models.ts`, fixture generators, `workers/images/manifest.md`, CI workflow |
| M1 | `shared` core contracts; `core/daemon`, `core/workspace`, `core/audit`, `core/jobs`, `core/policy/policy.ts`; `workers/src/ipc.ts`, `workers/src/microvm`; `cli` |
| M2 | `core/runtime`; `workers/src/inference` |
| M3 | `shared/document.ts`; `core/ingest` (ingest, manifest), `core/search`; `workers/src/microvm/guest/parse.ts` |
| M4 | `core/ingest/ocr.ts`; `workers/src/vision` |
| M5 | `shared/chunk.ts`; `core/index` |
| M6 | `shared/evidence.ts`; `core/evidence` |
| M7 | `shared/workflow.ts`; `core/workflows/invoice-review.ts` |
| M8 | `shared/tools.ts`; `core/tools`, `core/policy/approvals.ts`; `workers/src/microvm/guest/interpreter.ts` |
| M9 | `shared/compaction.ts`; `core/compaction` |
| M10 | `packages/desktop` |
| M11 | `eval/src/bench.ts` only — no new product modules |

M11 deliberately adds no product code: certification runs against what already exists.

## Open Items For M0

- Confirm the SQLite binding (better-sqlite3 candidate) packages cleanly on Windows and macOS with the pinned Node version.
- Decide whether the macOS microVM launcher needs a small signed helper binary for Virtualization.framework, and if so, its language and its lifecycle-only contract.
- Choose hand-rolled CLI argument dispatch versus one small dependency; default is hand-rolled.
- Select guest-image build tooling and record it in `workers/images/manifest.md`.

## Revision History

| Date | Change |
|---|---|
| 2026-07-13 | Initial folder/module blueprint, startup working agreement, minimal-interpretation review, edge-case policy, and milestone-to-folder map. |
| 2026-07-13 | Elevated the twenty Clean Code principles to the top-priority implementation bar and bound each principle to a concrete rule in this blueprint. |
| 2026-07-13 | Hardened the size limits: 300-line file cap and 40-line/complexity-10/nesting-3/params-4 function limits enforced mechanically in pnpm verify and CI, plus an explicit human readability review bar. |
