# Milestone M2 Status

Updated: 2026-07-19

M2 is active. The macOS implementation stage is complete; Windows native-worker confinement and physical-platform evidence remain pending. M2 is not cross-platform complete, and M3 is not authorized.

## Change Brief

- Goal: add the smallest supervised local inference path for structured generation and embeddings, prove its macOS authority boundary, and leave an explicit Windows handoff.
- Authority: the repository owner activated M2 on 2026-07-19 and requested macOS implementation followed by Windows completion on a separate machine.
- Product boundaries: Vault Core resolves hash-pinned installed models, schedules profile memory, owns audit and cancellation, and receives only typed results. The worker receives one approved model path, sanitized environment, fixed stdio IPC, and no workspace, credential, approval, shell, tool, or external-network authority.
- Acceptance evidence: deterministic containment tests, macOS Seatbelt authority probes, Qwen embedding smoke, Gemma 4 E2B grammar output, and Gemma 4 12B grammar output under Local 12 and Local 16 memory caps.
- Dependencies: reuse the M0-reviewed and lockfile-pinned `node-llama-cpp` 3.19.0 runtime. No new dependency or network product capability is introduced.
- Explicitly excluded: Windows confinement implementation and evidence, M3 ingestion, runtime alternatives, model download product behavior, arbitrary model paths, product UI, and packaging.

## Implemented macOS Scope

- `@vault/shared` owns the versioned generation, embedding, native-boundary probe, memory-report, and typed-failure schemas.
- Vault Core requires an installed-model store and explicit profile, stages a verified immutable model snapshot for each job, and owns the scheduler, inference port, supervisor, audit records, and programmatic generation and embedding facade.
- `@vault/workers` owns one length-prefixed typed inference protocol, deterministic fake, supervised client, `node-llama-cpp` worker, and macOS launcher.
- The macOS launcher uses Seatbelt to deny external networking, user-home file content outside the fixed runtime and approved staged model, arbitrary workspace access, credential stores and Keychain lookup, every write outside job scratch, process forks, and executable launches except the initial fixed Node worker. It supplies a minimal environment with no inherited credentials or shell variable.
- Crash, cancellation, timeout, malformed IPC, missing or modified model, and resource-overlap cases have focused deterministic tests.
- The independent review findings were applied: child Node re-execution and out-of-scope writes are probed, typed worker failures and operation mismatches are audited accurately, verified model bytes are staged before launch, and production inference inputs are mandatory.
- Downloaded models and generated reports remain ignored local evidence and are never committed.

## Dependency Review

- Capability and milestone: grammar-enforced local generation and embeddings for M2.
- Existing repository alternative: none; a custom runtime is explicitly rejected. M0 already adopted `node-llama-cpp` for native load validation.
- Candidate: exact locked `node-llama-cpp` 3.19.0, MIT, with pinned platform packages in `pnpm-lock.yaml`.
- Offline and privacy: inference needs no runtime network access; the macOS sandbox denies it. The worker inherits no credential variables, telemetry configuration, shell, or general endpoint.
- Adapter fit: runtime-specific types remain in `@vault/workers`; Vault Core depends on its own inference port and shared schemas.
- Decision: adopt the existing pinned dependency for the M2 worker adapter. Windows loading, packaging, and performance remain platform evidence rather than assumptions.

## Gate State

- `pnpm test:gate --milestone 2`: pass after independent-review fixes on the 48 GiB Apple-silicon Mac used for this stage, including source limits, lint, typecheck, 46 unit tests with one platform skip, two native M1 tests, Rust formatting and clippy checks, macOS helper build/signing, the M2 Seatbelt probe, and all model canaries.
- Shared contracts, supervisor, scheduler, model resolver, fake, and deterministic containment tests: pass on macOS.
- macOS Seatbelt network, workspace, credential, shell, and executable-tool denial probe: pass.
- Qwen3-Embedding-0.6B smoke: pass with 1,024 dimensions, 1,007,274,336 GPU VRAM bytes, and 169,748,832 CPU RAM bytes under the 2 GiB embedding reservation.
- Gemma 4 E2B grammar-valid output: pass with `{ "status": "ok" }`, 3,906,235,488 GPU VRAM bytes, and 2,285,189,888 CPU RAM bytes under Local 12.
- Gemma 4 12B Local 12 and Local 16 capped loads, grammar-valid output, and clean one-shot worker exit: pass with `{ "status": "ok" }`, 8,139,500,736 GPU VRAM bytes, and 845,475,552 CPU RAM bytes under both profile caps.
- Physical 12 GiB and 16 GiB target hardware evidence: not run on this 48 GiB Mac; the profile-cap results are implementation evidence, not final Local 12 or Local 16 hardware certification.
- Windows native runtime and authority boundary: not implemented; the launcher returns an explicit unsupported result.
- Full cross-platform M2 milestone: not complete.

## Windows Handoff

- Implement `WindowsNativeWorkerLauncher` with an OS-enforced external-network denial boundary, a sanitized credential-free environment, the fixed Node worker executable, the approved model file only, fixed stdio IPC, and forced teardown.
- Extend the native authority probe to run on physical Windows and prove network, arbitrary workspace, credential, shell, and executable-tool denial without command or destination matching.
- Run the same Qwen, E2B, and 12B structured-output gates with the pinned runtime and model hashes, record Local 12 and Local 16 memory reports, and verify clean shutdown, cancellation, timeout, malformed IPC, crash, and out-of-memory containment.
- Run `pnpm verify`, the Windows M2 native project, `pnpm test:gate --milestone 2`, and `git diff --check`; record exact pass, failure, and not-run results here before claiming M2 complete.

Conclusion: ready for the macOS-stage pull request; M2 remains incomplete until the Windows handoff and cross-platform evidence pass.
