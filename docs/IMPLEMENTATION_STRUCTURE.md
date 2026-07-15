# Implementation Structure

Created: 2026-07-13

This document is the companion to [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). The plan defines the sequence and the acceptance gates; this document defines the concrete repository shape: which folders exist, which module owns which responsibility, when each file appears, and how much code we allow ourselves to write. It is planning material only. The repository remains documentation-only until milestone M0 explicitly begins.

## Startup Working Agreement

We work as a startup. The scarce resource is maintained code, and every line written before its milestone is a liability, not progress. The default agent instinct is to catch every case; here we do the opposite on purpose:

1. **Minimum code that passes the gate.** The milestone gates in IMPLEMENTATION_PLAN.md define "enough". Code beyond what a gate exercises is scope creep and gets cut in review.
2. **Handle named cases, refuse the rest.** The security invariants and fixture-corpus cases enumerated in [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md) get exhaustive handling. Every other unexpected input maps to one typed `unsupported` outcome with a reason string. An explicit refusal is a passing result, not a bug.
3. **One implementation file per responsibility until it needs two.** Stable architecture-boundary folders may exist before they have multiple files, but they are not pre-populated with speculative siblings. A second implementation file appears only when a current milestone introduces a distinct responsibility, platform implementation, or third-party adapter.
4. **No abstraction before the second implementation.** The only exception is an ADR-mandated adapter contract, which stays a one-page interface with exactly one default implementation.
5. **No option until two call sites disagree.** No boolean flags, config keys, or extension points for hypothetical callers.
6. **Delete the requirement before coding around it.** If a requirement forces disproportionate code, propose cutting the requirement first and record the cut here.
7. **Boundaries are not negotiable.** The ADR-fixed security boundaries — no-NIC microVM, typed tools, approvals, audit, scoped filesystem — are the product and get real code and real tests. Minimalism applies to breadth (formats, runtimes, configuration, UI polish), never to these boundaries.

Even inside the always-handled list, "handling" usually means detect, refuse with a typed state, and audit — not feature work. A password-protected workbook gets an explicit `password_protected` outcome, not a password-recovery flow.

## Clean Code Priorities

The twenty Clean Code-derived principles in AGENTS.md (canonical list, mirrored in [IMPLEMENTATION_QUALITY_BAR.md](IMPLEMENTATION_QUALITY_BAR.md)) are the top-priority review bar for every line of implementation code. Priority order for any implementation decision: the ADR security boundaries first, the milestone gate second, these principles third, and delivery speed last. The principles and the startup working agreement never conflict: minimal code here means the smallest *clear* solution, and clean code here never means more code — principle 17 forbids exactly the speculative structure the working agreement cuts.

How each principle binds to this blueprint:

1. **Intention-revealing names** — modules are named for the product responsibility they own (`invoice-review.ts`, `approvals.ts`), never for a pattern (`manager.ts`, `handler.ts`, `utils.ts`); audit event names read as facts that happened.
2. **Small functions, one decision each** — a function that parses and also routes gets split; ingest routing, policy decisions, and verification checks are each their own function. TypeScript tripwires enforce 40 lines, cognitive complexity ≤ 10, and parameters ≤ 4; control-flow nesting remains an explicit human review rule.
3. **One level of abstraction per function** — `daemon/methods.ts` translates envelopes and delegates to the facade; it never does workspace or model work inline. Same rule for CLI subcommands and Tauri commands.
4. **One reason to change per module** — the per-package blueprints assign each file exactly one responsibility; a file that would change for two unrelated gates is split at that moment, not before.
5. **Remove duplication before adding options** — one Zod schema source feeds types, validation, and grammars; one IPC frame protocol serves every worker; one transport contract hides the socket/pipe difference.
6. **Explicit typed boundaries over shared state** — canonical product payloads that cross a package or process boundary (daemon, worker, guest, webview) are `@vault/shared` schemas. Internal implementation options stay local rather than polluting `shared`; there are no ambient globals or imports of another package's private files.
7. **Command/query separation** — catalog reads return data and change nothing; mutations go through idempotency-keyed command functions that return an outcome, not data. Exact search (`search/exact.ts`) is query-only; export (`tools/export.ts`) is command-only.
8. **No boolean flag arguments** — two named functions instead of one flagged one; this is also how the working agreement's "no options until two call sites disagree" stays enforceable.
9. **Deliberate errors, handled at the recovering boundary** — every cross-package or cross-process failure uses the `shared/errors.ts` envelope; local modules may use narrower typed results. Recovery lives only where recovery is possible (worker supervisor restarts, daemon reconnect, migration rollback); everywhere else refuses with a typed state.
10. **Rare, useful comments** — comments state constraints the code cannot show (why zero-NIC is proven by configuration, why a write must be temp-then-rename); never narration.
11. **Conventional, boring formatting** — use Biome formatter defaults. Lint configuration contains only the documented quality rules and path-scoped boundary exceptions; it does not introduce formatting variants or per-package style dialects.
12. **Tests readable as behavior specifications** — gate tests in `eval/gates/` are named after the invariant they prove ("traversal outside scope is rejected"), not after the function they call.
13. **Test behavior, not implementation** — tests exercise the programmatic facade, the daemon protocol, or a worker boundary; no test imports a private helper or mocks a sibling module inside the same package.
14. **Thin adapters around third-party tools** — `index/lance.ts`, the node-llama-cpp worker, and the native parsers stay translation-only; replacing a row of the default component stack must not ripple past its adapter file.
15. **Policy separate from model output** — model proposals are data until `policy/policy.ts` decides; nothing in `evidence/` or `tools/` executes a model-suggested action directly.
16. **Stable structures at persistence and audit boundaries** — catalog schema changes only through numbered migrations; audit records and artifact formats are versioned and append-only; no in-place reshaping of persisted data.
17. **No speculative generality** — the What We Do Not Write list is this principle applied; unused extension points are deleted in review, not deprecated.
18. **Refactor only against current complexity or a proven boundary** — the one-implementation-file-until-two rule; restructuring is justified by a change that is happening now, never by an anticipated one.
19. **Dependencies point inward** — product modules in `core` depend on local ports and `shared` contracts. Only `core/compose.ts` may import public host-side worker clients to bind those ports; no package imports another package's private files.
20. **Leave it easier to reason about** — the enforced size limits are the mechanical tripwire and the indicative package totals the human one; when the file count or a package's line budget outgrows the blueprint, the next change simplifies before it adds.

## Review: Minimal Interpretation Of The Current Plan

Reviewed 2026-07-13 against IMPLEMENTATION_PLAN.md, TYPESCRIPT_NODE_HARNESS.md, IMPLEMENTATION_QUALITY_BAR.md, and ADRs 0010–0015. The milestone sequence, the package boundaries, and the security boundaries stand unchanged. What this review fixes is how small each subsystem is allowed to be:

- **Daemon protocol** — hand-rolled JSON-RPC 2.0 over `node:net`; the Unix socket and named pipe differ only in the endpoint path behind one connect function. No RPC or IPC framework. One server file plus one method table.
- **Workspace catalog** — one embedded SQLite binding (selected in M0; better-sqlite3 is the candidate) with numbered `.sql` migration files applied in order inside a transaction, backup-before-migrate. `catalog.ts` owns the connection, transaction, migration, lock, and idempotency primitives; typed persistence commands and queries live with the product module that owns the records. There is no ORM, migration framework, or generic repository layer.
- **Schemas** — defined once as Zod schemas in `@vault/shared`; TypeScript types, JSON-RPC validation, and llama.cpp grammars all derive from the same definition. No parallel JSON Schema files.
- **Workers** — host-native accelerator processes use `child_process` only through `NativeWorkerLauncher`; microVM workers use the selected platform launcher. Vault Desk-owned worker and guest entries use one length-prefixed typed JSON frame protocol over their constrained channels. Supervised llama-server is the sole fixed local-HTTP exception and is translated immediately to shared vision payloads inside `workers/vision/client.ts`; its endpoint is not exposed beyond that adapter. No worker framework, message bus, dependency-injection container, or event-emitter hierarchy.
- **MicroVM launchers** — the thinnest per-OS shim that satisfies the common launcher contract. M0 decides whether macOS requires a small signed helper binary for Virtualization.framework; if so, that helper owns lifecycle only and no policy, recorded as a narrow exception like the Tauri Rust host.
- **Read-tool loop** — `core/tools/loop.ts` owns Vault Desk policy and orchestration. M8 starts with Vercel AI SDK over a thin local `InferencePort` adapter, with no cloud provider, telemetry, or network path, compares it with a thin explicit loop, and keeps the SDK only if it preserves policy, approval, audit, and cancellation while deleting more maintained code than it adds.
- **Code-interpreter guest loop** — `workers/microvm/guest/interpreter.ts` is a separate bounded guest responsibility. OpenCode is evaluated once at M8 against that guest loop and adopted only if it passes the no-NIC, typed-inference, resource, audit, and packaging gates while deleting more maintained code than it adds.
- **External-connection broker** — not built. No external integration ships in M0 through M11, so the boundary is satisfied by writing no external-network product code at all. The only application-authored fetcher in this implementation is development-only code in `@vault/eval`; package managers and CI acquisition are build tooling, not product capabilities. The broker module is created when the first real integration is approved after M11, not before.
- **Python parser worker** — not built (already deferred after M11 by the plan).
- **Desktop** — the M0 Tauri shell is a committed test-only capability harness under `@vault/eval`, not product UI. M10 replaces its coverage with small responsibility-specific React components, with state held in plain React context over the daemon client. No state-management or component library is added unless M10 proves the need.

## Minimal Ports And Adapter Contracts

Only the following adapter seams exist in the first implementation. Each is justified by multiple platform implementations, a third-party dependency fixed behind a replacement boundary, or an ADR-mandated security seam:

- **Local RPC contract** in `shared/rpc.ts` (M1): versioned request, response, notification, cancellation, backpressure, and local-endpoint records used by `core/daemon/server.ts` and `cli/client.ts`. The operating-system endpoint changes; the product protocol does not.
- **`ScopedFileSystem`** in `core/workspace/scope.ts` (M1): initially resolves authorized workspace paths and stages scoped inputs. M8 adds validated atomic writes to explicit export destinations; M10 adds staging from an explicit user-selected bundle-import path. Every operation canonicalizes and rechecks its path at use time, and the adapter never exposes a generic filesystem object to a model or worker.
- **`MicrovmLauncher`** in `workers/microvm/launcher.ts` (M1): start one immutable guest role with staged inputs and limits, exchange typed frames, cancel it, and tear it down. The macOS and Windows launchers implement it.
- **`NativeWorkerLauncher`** in `workers/native/launcher.ts` (M2): start one allowlisted host-native accelerator process under the platform capability boundary, expose only typed stdio or a private supervisor-created local endpoint, report termination and resource state, and force teardown. The macOS and Windows launchers implement it.
- **`InferencePort`** in `core/runtime/inference.ts` (M2): structured generation, embeddings, cancellation, and memory reporting. The supervised worker client and deterministic fake satisfy it.
- **`DocumentParserPort`** in `core/ingest/parser.ts` (M3): parse one authorized staged input into a typed parser outcome. The microVM parse client satisfies the host port; guest format adapters remain private to `@vault/workers`.
- **`VisionPort`** in `core/ingest/vision.ts` (M4): analyze an authorized page into typed OCR/layout regions with versions, confidence, and warnings. The supervised vision client satisfies it.
- **`RetrievalIndexPort`** in `core/index/port.ts` (M5): update, delete, query, and rebuild derived retrieval rows. The LanceDB adapter satisfies it.
- **`BundleReader`** in `core/bundles/reader.ts` (M5): expose immutable bundle manifests and resources from an authorized unpacked fixture root. At M10, production composition supplies the active installed version from the bundle catalog; trust verification and installation remain separate commands rather than expanding the read port into a lifecycle manager.
- **`CodeInterpreterPort`** in `core/tools/interpreter.ts` (M8): submit one bounded transformation job, surface only declared typed completion requests to the Core-owned inference mediator, and receive a typed proposal, logs, resource use, and source references. The microVM interpreter client satisfies it; policy, approval, verification, and authoritative writes remain in Core.
- **`BundleInspectorPort`** in `core/bundles/inspect.ts` (M10): inspect one staged hostile archive into a bounded typed inventory without activating it. The microVM bundle client satisfies it; Core owns trust policy, catalog mutation, and activation.

These are constructor-injected with plain object parameters. Production construction happens only in `core/compose.ts`; `core/harness.ts` accepts explicit test implementations and returns the same facade. There is no DI container, service locator, generic adapter registry, or interface for an implementation that has neither an ADR boundary nor a second implementation.

This document together with IMPLEMENTATION_PLAN.md satisfies the Future Implementation Gate in IMPLEMENTATION_QUALITY_BAR.md: the first workflow is invoice review (M7, completed with approval and export in M8), the product contracts are the `shared` blueprint, the minimal adapter interfaces are listed above, the invariants are the milestone gates, the dependencies are the default component stack, and the intentionally unwritten code is the final section.

## Repository Root (created incrementally from M0)

```text
LICENSE                owner-selected Community source license; present before source
package.json           private root with exact packageManager pin; verify, lint,
                       typecheck, test, and test:gate at M0;
                       test:integration M1; test:llm M2; test:package M10; bench M11
.node-version          exact Node runtime used by CI and packaged-sidecar builds
pnpm-workspace.yaml
pnpm-lock.yaml
tsconfig.base.json     strict, NodeNext
biome.json
vitest.workspace.ts
rust-toolchain.toml    pinned for the M0 test Tauri shell, M10 product shell,
                       and any M0-approved native microVM helper
assets/models.json     canonical machine-readable model and redistribution manifest
assets/bundles/trust-root.json  provisioned offline bundle trust root                 M10
compliance/inventory.json  machine-readable dependency/model ownership and license inventory
scripts/check-source-limits.ts  hand-written source-file length gate
docs/adr/0017-knowledge-bundle-format-and-trust.md  M0 transport/trust decision
.github/workflows/ci.yml   one evolving workflow: M0 macOS/Windows matrix; just-in-time
                           Linux, hardware/model, and package jobs
packages/
```

Generated fixture corpora, model files, guest images, packaged sidecar executables, SBOMs, signatures, installers, and benchmark reports are build or CI outputs and are not committed source files. Their hand-written manifests, generators, policies, and build recipes are listed here.

## Package Blueprints

Each file is annotated with the milestone in which it first appears. A file must not be created before its milestone. Each pnpm package receives its minimal `package.json` and `tsconfig.json` with its first executable or contract source (`shared` and `eval` in M0; `core`, `workers`, and `cli` in M1; `desktop` in M10); those two conventional files are not repeated in every tree.

### `packages/shared` — `@vault/shared`, contracts only

Depends on Zod and nothing else. Flat `src/`, one file per contract family.

```text
src/
  index.ts        public contract re-exports                                  M0
  model.ts        model manifest, redistribution state, installed identity    M0
  ids.ts          branded IDs and content-hash contracts                      M1
  errors.ts       one boundary error envelope (code, message, details)         M1
  rpc.ts          JSON-RPC, local endpoint, request/job IDs, version negotiation M1
  workspace.ts    workspace identity and scope records                        M1
  jobs.ts         durable job states, transitions, cancellation               M1
  audit.ts        versioned audit event records                               M1
  policy.ts       PolicyDecision and typed refusal reasons                    M1
  worker.ts       generic worker frames, guest roles, limits, termination     M1
  inference.ts    generation, embedding, memory, and worker IPC payloads      M2
  document.ts     SourceAnchor, CanonicalDocument, parser outcome states       M3
  chunk.ts        Chunk and retrieval query/result contracts                  M5
  bundle.ts       immutable Knowledge Bundle identity and resource contracts  M5
  evidence.ts     EvidencePack, Claim, Citation, VerificationResult            M6
  session.ts      cited session-turn records and evidence references           M6
  workflow.ts     invoice-review typed fields and exception states             M7
  tools.ts        ToolDefinition, Approval, Preview, ToolResult                M8
  compaction.ts   SummaryNode, replay cursor, and compaction events            M9
  hardware.ts     hardware class and model/workflow eligibility                M10
  desktop.ts      fixed Tauri command and native-capability result contracts  M10
```

### `packages/core` — `@vault/core`, Vault Core API and daemon

```text
src/
  index.ts                    public package exports only                             M1
  compose.ts                  createVaultCore and sole concrete adapter binding       M1
  facade.ts                   typed programmatic Vault Core API over injected ports   M1
  harness.ts                  public test constructor over explicit port implementations M1
  daemon/
    main.ts                   daemon arguments, signals, and composition-root startup M1
    server.ts                 socket/pipe lifecycle, framing, current-user check     M1
    methods.ts                RPC method table mapping requests to facade calls      M1
  workspace/
    catalog.ts                SQLite connection, transactions, migrations, writer lock M1
    migrations/NNNN-*.sql     numbered forward migrations                            M1
    workspaces.ts             workspace identity commands and queries                M1
    artifacts.ts              content-addressed atomic artifact store                M1
    scope.ts                  WorkspaceScope + ScopedFileSystem; all path validation M1
    preferences.ts            typed user preference commands and queries             M9
  audit/
    log.ts                    typed audit commands/queries, hash chain, redaction     M1
  jobs/
    jobs.ts                   typed job commands/queries, cancellation, resume cursors M1
  policy/
    policy.ts                 pure policy decision functions                         M1
    approvals.ts              durable approval records, rejection, expiry            M8
  runtime/
    inference.ts              InferencePort consumed by product modules               M2
    supervisor.ts             lifecycle, restart, cancellation, and audit orchestration M2
    scheduler.ts              profile memory budgets across generation/embedding/vision  M2
    models.ts                 scoped installed-manifest reads and approved model resolution M2
    hardware.ts               hardware classification and model/workflow eligibility M10
  ingest/
    ingest.ts                 one ingest-job orchestration                           M3
    inventory.ts              scoped traversal, hashing, and deduplication plan      M3
    manifest.ts               resumable ingest manifests                             M3
    parser.ts                 DocumentParserPort only                                 M3
    vision.ts                 VisionPort consumed by OCR/layout routing               M4
    ocr.ts                    OCR/layout routing and low-confidence policy            M4
  search/
    exact.ts                  deterministic exact and case-normalized search over canonical cells  M3
  index/
    port.ts                    RetrievalIndexPort used by product modules              M5
    chunks.ts                 structure-aware chunking                               M5
    embeddings.ts             embedding cache keyed by chunk hash + encoder version  M5
    lance.ts                  LanceDB adapter: full-text, dense, reciprocal-rank fusion  M5
  bundles/
    reader.ts                 authorized fixture roots; active installed version at M10 M5
    inspect.ts                BundleInspectorPort for staged hostile archives          M10
    trust.ts                  offline signature, expiry, rollback, and policy checks  M10
    catalog.ts                schema-versioned installed manifests, refs, active versions M10
    migrations/NNNN-*.sql     installed-bundle catalog migrations                     M10
    store.ts                  content-addressed objects and reference-safe cleanup     M10
    install.ts                stage, commit, and atomically activate verified bundles M10
  evidence/
    pack.ts                   reproducible token-budgeted evidence packs             M6
    generate.ts               cited typed generation through the runtime adapter     M6
    verify.ts                 deterministic claim, citation, and arithmetic checks   M6
  sessions/
    sessions.ts               cited turn persistence and replay references            M6
    warnings.ts               durable user-visible warning commands and queries        M9
  workflows/
    invoice-review.ts         explicit resumable workflow state machine              M7
  tools/
    registry.ts               tool lookup and input schema validation                M8
    read-tools.ts             typed search/open adapters over existing core queries  M8
    table/
      filter.ts               deterministic row selection                             M8
      sort.ts                 deterministic stable ordering                           M8
      join.ts                 deterministic keyed table joins                         M8
      compare.ts              deterministic value and row comparison                  M8
      aggregate.ts            deterministic grouped aggregation                       M8
      arithmetic.ts           deterministic typed numeric operations                  M8
      extract.ts              deterministic structured field extraction               M8
    export.ts                 named preview and approved-export commands through scope.ts M8
    interpreter.ts            CodeInterpreterPort for bounded transformation proposals M8
    code-fallback.ts          route unsupported transforms to the interpreter guest, recheck results  M8
    loop.ts                   policy-owned read-tool orchestration over selected implementation M8
    vercel-adapter.ts         production InferencePort/AI SDK translation if selected M8
  compaction/
    replay.ts                 assemble replay views from domain-owned authoritative records M9
    summaries.ts              anchored summary-tree construction and invalidation    M9
    compact.ts                threshold triggers, replay, invalidation               M9
tests/                        public-surface integration tests added with each milestone M1+
```

### `packages/workers` — `@vault/workers`, process entries and isolation

```text
src/
  index.ts                    public host-side launcher/client exports only           M1
  ipc.ts                      length-prefixed typed JSON frames for owned workers/guests M1
  microvm/
    launcher.ts               common contract: boot, attach inputs, limits, teardown M1
    macos.ts                  M0-selected Apple microVM backend                       M1
    windows.ts                M0-selected HCS/Hyper-V backend                         M1
    parse-client.ts           host client matching DocumentParserPort shared payloads M3
    interpreter-client.ts     host client for bounded code jobs                      M8
    bundle-client.ts          host client for hostile bundle inspection              M10
    guest/
      io.ts                   only guest filesystem/socket boundary: staged input, scratch, result M1
      probe.ts                typed round-trip, resource, and zero-NIC probe role     M1
      parse.ts                parser-role entry and format dispatch only             M3
      parsers/
        pdf.ts                pdf.js translation to CanonicalDocument                M3
        docx.ts               mammoth translation to CanonicalDocument               M3
        spreadsheet.ts        ExcelJS XLSX/CSV translation to canonical cells        M3
        email.ts              mailparser EML translation to canonical messages       M3
      interpreter.ts          code-interpreter guest loop, typed result contract     M8
      opencode-adapter.ts     production OpenCode boundary only if selected            M8
      bundle-import.ts        bounded archive inspection and typed inventory result  M10
  native/
    launcher.ts               common native accelerator capability contract          M2
    macos.ts                  macOS network/filesystem/process confinement            M2
    windows.ts                Windows network/filesystem/process confinement          M2
  inference/
    worker.ts                 node-llama-cpp child-process entry                     M2
    client.ts                 host-side typed inference client                       M2
    fake.ts                   deterministic fake for unit tests                      M2
  vision/
    client.ts                 VisionPort adapter over supervised private llama-server IPC M4
images/
  README.md                   selected tooling, lifecycle, and reproducibility notes M0
  manifest.json               machine-readable pinned contents and input/image hashes M0
  build.ts                    deterministic guest-image build orchestration           M1
```

The M8 comparisons do not leave parallel production stacks. Reproducible comparison adapters stay development-only under `eval/src/selection/`. If an explicit loop wins, its conditional product adapter is not added. If Vercel AI SDK or OpenCode wins, only the selected thin production translation file remains beside the Vault Desk policy/orchestration module; the unselected runtime is absent from product dependencies and packages.

### `packages/cli` — `@vault/cli`, thin daemon client

```text
src/
  main.ts                     subcommand dispatch, argument parsing, exit codes      M1
  client.ts                   JSON-RPC client over socket/pipe, streaming            M1
  output.ts                   --json single-document stdout, progress on stderr      M1
  commands.ts                 full-slice command functions once M8 forces the split  M8
```

`vault status` lives in `main.ts` at M1. The M8 full command slice is the current change that forces `commands.ts`; `vault compact` is added in M9, and `vault bundles install` / `vault bundles list` are added in M10. The CLI passes the explicit user-selected import path to the daemon; Core canonicalizes and stages it through `ScopedFileSystem`, and bundle inspection remains a Core/worker responsibility.

### `packages/eval` — `@vault/eval`, models, fixtures, gates

```text
src/
  models.ts                   validate canonical manifest + hash-pinned dev fetcher M0
  fixtures/
    invoices.ts               byte-deterministic development corpus generator        M0
    heldout.ts                held-out corpus generator with separate templates      M0
    bundles.ts                dev/held-out unpacked bundles; hostile archives at M10 M5
  gates/
    mN-*.test.ts              focused files named for milestone invariants            from M0
  selection/
    read-loop.ts              reproducible Vercel-versus-explicit comparison          M8
    code-loop.ts              reproducible OpenCode-versus-owned comparison            M8
  platform/
    microvm-smoke/
      README.md               findings and selected launcher/image-build decision     M0
      build.ts                provisional minimal probe-image build                   M0
      probe.ts                macOS/Windows boot, socket, and zero-NIC checks          M0
    tauri-smoke/
      README.md               pinned Node sidecar packaging/signing decision          M0
      index.html, main.ts     no-product-UI capability test webview                   M0
      sidecar.ts              source for the minimal generated sidecar fixture         M0
      build.ts                deterministic package/sign orchestration for the fixture M0
      src-tauri/
        Cargo.toml, Cargo.lock, build.rs, tauri.conf.json
        capabilities/default.json
        src/main.rs           minimal allowlisted sidecar and command harness         M0
  bench.ts                    hardware bench and soak harness for Local 12/16        M11
```

The provisional microVM smoke tree is removed only after the M1 production launcher and guest-image build gates cover the same assertions. The entire test-only Tauri tree is removed only after M10 reaches equivalent product-shell coverage.

### `packages/desktop` — `@vault/desktop`, Tauri shell (all M10)

```text
src-tauri/
  Cargo.toml, Cargo.lock, build.rs, tauri.conf.json
  capabilities/default.json   narrow command allowlist
  src/main.rs                 window lifecycle, dialogs, sidecar supervision, connection bootstrap
src/
  main.tsx                    React bootstrap only
  app.tsx                     component composition only
  context.tsx                 plain React context for daemon/session view state
  layout.tsx                  header, sidebar, main pane, and composer frame
  sidebar.tsx                 chats first, working folders below
  conversation.tsx            messages, tool activity, citations, warnings
  composer.tsx                bottom-anchored chat input
  approvals.tsx               approval cards and decision controls
  export-preview.tsx          structured export preview and destination summary
  citations.tsx               evidence preview panel
  settings.tsx                support settings only; no runtime configuration
  daemon.ts                   typed client over Tauri invoke
```

The M10 product shell must cover every M0 Tauri capability assertion before the test-only shell is deleted. Product payload schemas remain canonical in `@vault/shared`; the Rust host has only the small fixed command surface required for native capabilities, with shared conformance fixtures preventing drift.

## Module Rules

- **Dependency direction:** `shared` depends only on Zod. `workers`, `cli`, and `desktop` depend on public `shared` contracts and never on `core`. Product modules inside `core` depend on `shared` plus local ports; only `core/src/compose.ts` may import public host-side clients from `workers`. `eval` may import public exports from any package for gates, but never private source paths. Package export maps, TypeScript project references, and path-scoped Biome restricted-import rules enforce these edges without a custom dependency checker.
- **Filesystem, local transport, and process access:** direct Node `fs`, `net`, and `child_process` imports are denied by default. Approved host `fs`/`net` boundaries are `core/workspace/{scope,artifacts,catalog}.ts`, `core/runtime/models.ts`, `core/bundles/{reader,catalog,store}.ts`, `core/daemon/server.ts`, `cli/client.ts`, `workers/ipc.ts`, `workers/microvm/{launcher,macos,windows}.ts`, the files under `workers/native`, `workers/images/build.ts`, the development-only model fetcher and fixture/platform harnesses under `eval`, and the root verification scripts. Host `child_process` is narrower: only the microVM/native launchers, guest-image build, and development platform harnesses may spawn. Inside a guest, only `workers/microvm/guest/io.ts` may touch staged input, bounded scratch, or the typed socket; parser and bundle code receive typed handles or bytes from it. `workers/microvm/guest/interpreter.ts` is the sole product exception allowed to spawn pinned offline interpreters, and only inside the disposable guest. The M0 Tauri harness and M10 Rust host are instead constrained by their Cargo dependencies, Tauri capability allowlist, fixed commands, and capability-denial gates.
- **External network access:** no product module may call a generic fetch primitive or accept an arbitrary HTTP destination. The hash-pinned `eval/models.ts` fetcher is the only application-authored development exception. `workers/vision/client.ts` may use the standard-library HTTP client only for the opaque loopback endpoint returned by `NativeWorkerLauncher`, with a fixed API path and OS-enforced external-network denial; this is local worker IPC, not an integration surface. Package-manager, CI, code-signing, and release-upload traffic belongs to build infrastructure, not a runtime capability. A future approved integration requires the separately designed broker.
- **Mechanical tripwires and review limits:**
  - **File length:** `scripts/check-source-limits.ts` enforces a 300-line maximum for every committed hand-written `.ts`, `.tsx`, and `.rs` file, including tests and platform harnesses. Generated outputs are not committed. Hitting the cap forces a responsibility split; there are no product-code exemptions.
  - **TypeScript functions:** M0 pins a Biome version only after confirming its restricted-import, function-line, cognitive-complexity, and maximum-parameter rules. The resulting config enforces 40 body lines maximum, cognitive complexity ≤ 10, and parameters ≤ 4 for `.ts` and `.tsx`. More than four inputs normally becomes a typed local parameter object; it belongs in `@vault/shared` only when it is itself a package/process product contract.
  - **Nesting:** control-flow nesting depth ≤ 3 is a human review rule. The research-derived tooling check on 2026-07-13 found no general control-flow-depth rule in current Biome; M0 revalidates the pinned version, and callback- or test-suite-specific rules do not substitute for a general claim.
  - **Rust:** the same 300-line file cap is mechanical. `cargo fmt --check`, `cargo clippy -- -D warnings`, focused capability tests, and human review cover the small Rust surfaces; this plan does not falsely claim that Biome enforces Rust function metrics.
  - `pnpm verify` runs the source-limit checker, Biome boundary/quality rules, TypeScript project checks, fast tests, and—when a Rust surface exists—`cargo fmt --check` plus `cargo clippy -- -D warnings`. CI calls the same underlying commands.
- **Readability review bar** (human-enforced in every PR, on top of the mechanical limits): each function states one decision at one level of abstraction; early-return over nested conditionals; no clever one-liners where three plain lines are clearer; names long enough to be unambiguous and no longer. A reviewer who has to re-read a function to see what it does requests a split — line count alone passing is not approval.
- **Indicative package totals** through M9 (smell thresholds, not gates): `shared` ≤ 1.5k lines, `core` ≤ 12k, `workers` ≤ 4k, `cli` ≤ 0.6k, and `eval` ≤ 4k excluding generated fixtures. The files enumerated in this blueprint are the file-count baseline; adding a module not named or forced by a recorded conditional decision requires a responsibility-seam explanation and a blueprint update. A package over ~10 runtime dependencies requires written justification in the PR. Growth beyond this pace is the signal to stop and simplify.
- **Tests:** unit tests are colocated `*.test.ts`; integration tests live in each package's `tests/`; milestone acceptance lives in `eval/gates/`. Every test must protect a named milestone gate or answer yes to one question in the quality bar's test selection policy; framework-wiring coverage with neither justification is not written.
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
- Model-dependent workflows on hardware that cannot meet any declared profile. Other unvalidated hardware is classified Compatible or Experimental rather than presented as certified.
- Concurrent writers on one workspace (the single-writer lock refuses; there is no merge logic).
- Recovery of encrypted or damaged inputs beyond detection and classification.
- Any model runtime, OS, or accelerator not named in the current certification targets.

## What We Do Not Write

Consolidated from the plan and this review: the first four are first-implementation prohibitions, the next two are explicit post-M11 deferrals, and the final item is startup discipline:

- Custom parser, custom OCR engine, custom vector database, custom model runtime.
- Unrestricted shell tool or persistent coding workspace.
- Broad plugin system or generic agent brain.
- Additional RPC/IPC frameworks around the hand-written daemon and worker protocols, ORMs, migration frameworks, DI containers, event buses, or state-management libraries.
- The external-connection broker, until the first approved integration exists.
- The Python parser worker image, until a real format gap forces it (post-M11).
- Speculative configuration surfaces, retry frameworks, or graceful-degradation features for inputs we can refuse.

## Milestone-To-Folder Map

| Milestone | New folders and files |
|---|---|
| M0 | Phase-rule update and selected root `LICENSE`; root configs and source-limit check; canonical model and compliance manifests; ADR 0017; `shared/model.ts`; `eval` models, fixtures, M0 gates, provisional microVM smoke harness, and test-only Tauri shell; worker guest-image README/manifest; CI workflow |
| M1 | Split `shared` workspace/job/audit/policy/RPC/error/worker contracts; core composition root/facade/test harness, daemon entry/server/methods, workspace state/storage, audit, jobs, and policy; worker public exports, IPC, microVM launchers, guest I/O/probe, and image build; `cli` |
| M2 | `shared/inference.ts`; core inference port, supervisor, scheduler, and model resolver; native-worker platform launchers; inference worker/client/fake |
| M3 | `shared/document.ts`; core ingest orchestration, inventory, manifest, parser port, and exact search; microVM parse client, guest router, and per-format adapters |
| M4 | Core vision port and OCR/layout routing; supervised llama-server vision client/adapter |
| M5 | `shared/chunk.ts`, `shared/bundle.ts`; core retrieval port/chunking/embedding/LanceDB adapter and bundle reader; unpacked bundle fixtures |
| M6 | `shared/evidence.ts`, `shared/session.ts`; core evidence and session modules |
| M7 | `shared/workflow.ts`; `core/workflows/invoice-review.ts` |
| M8 | `shared/tools.ts`; core tools/read-loop/export/code-fallback port and approvals; CLI `commands.ts`; interpreter guest/client; development-only read/code loop selection harnesses; only selected product adapters |
| M9 | `shared/compaction.ts` plus just-in-time preference/warning additions to existing workspace/session contracts; domain-owned records, replay views, summary trees, compaction, and `vault compact` |
| M10 | Provisioned bundle trust root; trust/import additions to `shared/bundle.ts`; `shared/hardware.ts`, `shared/desktop.ts`; core bundle inspection port, trust/catalog/store/install, and hardware classification; hostile bundle archives; bundle-inspection guest/client; CLI bundle commands; product `desktop`; remove the test-only Tauri shell after coverage parity |
| M11 | `eval/src/bench.ts` and M11 gate specifications only — no new product modules |

M11 deliberately adds no product code: certification runs against what already exists.

## Open Items For M0

- Confirm the SQLite binding (better-sqlite3 candidate) packages cleanly on Windows and macOS with the pinned Node version.
- Pin a Biome version after verifying the exact restricted-import, function-line, cognitive-complexity, and maximum-parameter rules used by `pnpm verify`.
- Select and validate the Node sidecar packaging method that produces an exact executable for Tauri on macOS and Windows; record its runtime inclusion, lockfile inputs, hashes, signing identity checks, and release-signing handoff in `eval/src/platform/tauri-smoke/README.md`.
- Decide whether the macOS microVM launcher needs a small signed helper binary for Virtualization.framework. If it does, update AGENTS.md and this blueprint with the exact source path, language, Cargo/native lockfile boundary, and lifecycle-only contract before adding helper code; without that recorded exception, no helper is permitted.
- Choose hand-rolled CLI argument dispatch versus one small dependency; default is hand-rolled.
- Select guest-image build tooling, record its rationale in `workers/images/README.md`, and pin machine-readable inputs in `workers/images/manifest.json`.
- Select maintained archive, TUF-style metadata, and signature-verification libraries for Knowledge Bundles, then record the M5 reader and M10 import/trust decision in ADR 0017.

## Revision History

| Date | Change |
|---|---|
| 2026-07-13 | Initial folder/module blueprint, startup working agreement, minimal-interpretation review, edge-case policy, and milestone-to-folder map. |
| 2026-07-13 | Elevated the twenty Clean Code principles to the top-priority implementation bar and bound each principle to a concrete rule in this blueprint. |
| 2026-07-13 | Added a 300-line file cap, TypeScript function-length/complexity/parameter thresholds, a nesting-depth review rule, and an explicit human readability bar. |
| 2026-07-13 | Reconciled the blueprint with all M0-M11 gates: added repeatable M0 platform harnesses, split shared contracts and parser adapters, named the minimal ports, restored native/vision/bundle/summary ownership, corrected dependency and I/O boundaries, and limited mechanical enforcement claims to supported tooling. |
