# Milestone M0 Status

Updated: 2026-07-17

Milestone M0 is active. The Mac checkpoint passes and the non-privileged Windows checkpoint passes. M0 remains open until the privileged Windows HCS certification and published cross-platform CI gates pass. M1 is not authorized.

## Change Brief

- Goal: establish the smallest reproducible Vault Desk workspace and validation surface required by M0.
- Active milestone and issue: M0, started by the repository owner's explicit 2026-07-16 request; no separate issue was supplied.
- Allowed scope: phase-rule updates, Apache 2.0 root license, pinned Node/pnpm/Rust and root tooling, M0-only `shared` and `eval` packages, model and compliance manifests, deterministic invoice corpora, test-only Tauri and microVM probes, guest-image recipe, ADR 0017, and macOS/Windows CI.
- Product boundaries: model manifests are canonical in `@vault/shared`; model fetching remains development-only in `@vault/eval`; Tauri exposes only a fixed test command and exact sidecar; hostile-work validation requires a no-NIC guest and typed host/guest IPC; no product UI or external integration is introduced.
- Explicitly not doing: M1 daemon/CLI/workspace/worker code, product UI, customer-document handling, external integrations, model redistribution, committed binaries, or contribution activation.

## Gate State

- Overall status: not ready; privileged Windows HCS certification and published CI evidence remain open.
- Mac checkpoint: pass on macOS 26.5.2 arm64.
- Windows checkpoint: all non-privileged gates pass on Windows x64; HCS guest creation is blocked by host-process elevation.
- M1 authorization: not granted.

| Gate | Evidence | State |
|---|---|---|
| Root license and compliance owners | `LICENSE`; `compliance/inventory.json`; unit inventory assertion | Pass |
| Deterministic development and held-out corpora | Both corpora cover all six required classes; anchors are checked against decoded fixture content | Pass |
| Model manifest and real load | Official Qwen Q8_0 exact bytes/SHA-256; 1,024-dimensional embedding smoke | Pass on Mac and Windows |
| Local pinned workspace | Locked install and complete non-privileged verification | Pass on Mac and Windows |
| macOS and Windows CI | Immutable action pins and `macos-26` / `windows-2025` jobs | First published run failed before install because the pnpm shim was not enabled; fix pending publish |
| Tauri packaging and capability shell | Signed Node SEA, fixed sidecar identity, capability assertions, Rust Clippy, no-bundle build, runtime webview denial | Pass on Mac and Windows |
| No-NIC microVM | Reproducible arm64/x86_64 hashes; exact guest boot; zero configured NICs; guest reports zero non-loopback devices; typed socket round trip | Certified on Mac; reproducible x86_64 guest passes, privileged Windows boot pending |
| Knowledge Bundle decision | ADR 0017; deterministic tar and Ed25519 validation; selected TUF library loads | Pass for M0 scope |
| M0 structural decisions | Owning manifests, configuration, ADR, and blueprint record each M0 decision | Pass |

## Mac Verification Report

- `VAULT_BUILDROOT_ARCHIVE=/tmp/buildroot-2026.05.tar.xz pnpm guest:build -- --arch aarch64` — two clean builds in disposable Docker volumes produced identical outputs; the second ran with Docker networking disabled.
  - Kernel SHA-256: `211d283fafe9e094e614629ef21f8616cdce24c5e4b43b936c4c73a3e447e7bd`.
  - Initramfs SHA-256: `d7ea5c8df6da1faa9fd6aaf7109833be45dc3b208515977b0021ea478715e3c9`.
- `pnpm model:fetch --id qwen3-embedding-0.6b-q8_0 --destination /tmp/qwen3-embedding-0.6b-q8_0.gguf` — downloaded the official immutable Qwen artifact and matched SHA-256 `06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439`.
- `pnpm test:gate --milestone 0 --model /tmp/qwen3-embedding-0.6b-q8_0.gguf` — passed source limits, Biome, TypeScript, 16 unit assertions, two native assertions, SEA packaging/signing, Rust formatting/Clippy, Tauri build, real model load, and certified macOS guest boot.
- Platform result: `classification: certified`, `noNetworkDeviceConfigured: true`, `typedSocketConfigured: true`, `guestBooted: true`, `socketRoundTrip: true`, and guest non-loopback count `0`.
- `pnpm verify` and `pnpm tauri:check` — passed again after checkpoint review and the generated-icon policy fix.
- `git diff --check` — passed before final staging.

## Windows Verification Report

- `pnpm guest:build -- --arch x86_64` plus an independent no-network rebuild produced byte-identical outputs.
  - Kernel SHA-256: `ec0364eab93e9a12e4f5ef3008207331b03ef32a23dd9b0fc0f8c197fb126e45`.
  - Initramfs SHA-256: `8cb33d5265fe1cbf4233154e2a93496d295275356409af19386e913334b61f89`.
- `pnpm verify` passed source limits, Biome, TypeScript, 16 unit assertions, two native assertions, Windows SEA signing, Rust formatting, and Clippy.
- `pnpm tauri:check` built the Windows Tauri shell. A real webview launch returned the fixed sidecar payload and `arbitraryCommandDenied: true`.
- `pnpm model:fetch --id qwen3-embedding-0.6b-q8_0 --destination packages/eval/.generated/qwen3-embedding-0.6b-q8_0.gguf` matched SHA-256 `06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439`.
- The real model smoke loaded that GGUF and produced a 1,024-dimensional embedding.
- `pnpm test:gate --milestone 0 --model packages/eval/.generated/qwen3-embedding-0.6b-q8_0.gguf` passed verification, Tauri build, and the real model smoke before stopping only at the privileged HCS gate.
- `pnpm test:platform` reached HCS compute-system creation but returned `0x8037011B` from the non-elevated Codex host process. The privileged `--require-certified` run remains required.

## Caveats And Remaining Evidence

- `node-llama-cpp` logged a Metal shader source compilation error, then successfully loaded the model and produced the expected embedding through fallback. M0 model correctness passes; accelerated Metal performance remains unproven.
- The first GitHub-hosted run failed before dependency installation on both platforms because `corepack prepare` did not create a `pnpm` shim. The workflow now explicitly enables and version-checks that shim; the fix still requires a published run.
- Windows HCS lifecycle, Hyper-V socket round trip, and zero-NIC evidence require one administrator-level run on this host.
- Guest artifacts and the model remain ignored development outputs and are not committed.

## Attempted Fixes Recorded

- Docker Desktop bind-mounted kernel extraction raced with a directory rename. Build trees now use isolated Linux-native Docker volumes; final artifacts and downloads remain inspectable, and volumes are removed after comparison.
- Virtualization.framework rejected the unsigned helper. The test-only binary is now ad-hoc signed with only `com.apple.security.virtualization`.
- The socket API asserted its dispatch queue. The Swift entrypoint and connection retry now run on the main actor.
- Buildroot's QEMU kernel config creates `dummy0` by default. The boot command sets `dummy.numdummies=0`; the unchanged hashed guest then reported zero non-loopback devices.

## Handoff

- Objective and current state: Mac and non-privileged Windows checkpoints pass; full M0 is not ready until the privileged Windows HCS and published CI evidence pass.
- Changed paths: root workspace and policy files, M0 `shared` and `eval` packages, the Tauri and microVM probes, Buildroot guest recipe, model/compliance manifests, CI, ADR 0017, and supporting M0 documentation.
- Decisions and source links: use the official immutable Qwen Q8_0 artifact recorded in `assets/models.json`; use a reproducible Buildroot no-NIC guest with typed VSOCK IPC; keep generated guests, models, executables, and icons out of Git.
- Commands and results: the exact Mac build, model, gate, platform, and post-review verification evidence is recorded above; all required Mac checks pass.
- Failures and attempted fixes: the Docker bind-mount race, Virtualization.framework signing and dispatch issues, Buildroot `dummy0`, and generated-icon policy issue are resolved as recorded above.
- Open risks or questions: privileged Windows HCS certification, published CI, and Metal acceleration evidence remain open.
- Windows next action: run `pnpm test:platform -- --require-certified` from an administrator PowerShell, then rerun the complete M0 gate.
- Published CI next action: publish the Windows checkpoint and inspect both jobs; any failure keeps M0 open.
- Completion rule: record M0 complete only after both supported platforms and CI pass. M1 still requires a separate explicit owner request.
