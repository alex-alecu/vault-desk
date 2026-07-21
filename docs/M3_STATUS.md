# Milestone M3 Status

Updated: 2026-07-21

The M3 macOS implementation is complete and passes physical Apple-silicon acceptance. The cross-platform M3 and Community Desktop V1 launch gate remain open until the Windows implementation and physical evidence pass.

## Change Brief

- Goal: ship a functional macOS and Windows desktop app whose local agent can write and execute Python and Node.js inside a disposable offline microVM over a user-selected read-only folder or explicit attachments.
- Authority: explicitly activated by the repository owner on 2026-07-20; the owner requested completion of the Mac stage on 2026-07-21.
- Product surface: New chat, file attachments, folder groups, five recent sessions per folder, Show more, persistent conversations and drafts, agent activity, artifacts, cancellation, and restart recovery.
- Security boundary: the webview has no host authority; Vault Core owns grants and policy; the guest has zero NICs, immutable root, read-only staged inputs, bounded scratch, typed inference mediation, and no host writes.
- Platform scope: physical Apple-silicon macOS and supported Windows x64 packages. The remaining Windows inference boundary from M2 is part of this gate.
- Explicitly deferred: canonical document ingestion, OCR and layout, retrieval, citations, workflow packs, Knowledge Bundles, external integrations, and model downloads.

## Implemented Mac Product

- The Tauri and React desktop provides native folder and file selection, global and folder sessions, newest-five pagination, Show more, drafts, attachments, conversation restoration, activity details, generated artifacts, cancellation, keyboard focus, reduced motion, and responsive scaling.
- Typed Tauri commands are the webview's only product bridge. The capability file grants `core:default` only; it grants no shell, process, filesystem, URL, or network plugin command.
- Vault Core persists schema-versioned state with the Node 24 built-in `node:sqlite`, immutable content-addressed attachments and artifacts, atomic run transitions, durable events, cancellation, and interrupted-run recovery.
- The bounded Core-owned agent loop mediates the real Gemma model, records code and concise observations without hidden reasoning, and executes only fixed Python or Node.js programs through typed worker requests.
- The reproducible Buildroot guest contains Python 3.14.5, Node.js 24.18.0, Pillow 12.0.0, pypdf 6.14.2, openpyxl 3.1.5, python-docx 1.2.0, and lxml. It contains no pip, npm, shell, credentials, or network device.
- The macOS package contains the exact Core SEA sidecar, inference runtime, model, Swift Virtualization helper, guest image, migrations, notices, SPDX SBOM, hashes, and resource manifest. It performs no first-launch download.

## Physical Mac Evidence

- Two independent agent-guest builds produced identical outputs:
  - kernel SHA-256: `211d283fafe9e094e614629ef21f8616cdce24c5e4b43b936c4c73a3e447e7bd`.
  - initramfs SHA-256: `bae6d164a807a88a5648ba3dd2f68607023b12ec0e66a07f5c16f219adff9b50`.
- `pnpm test:m3:macos` returned `certified` on physical Apple silicon. Runtime probes passed read-only input, host-write, DNS, IPv4, IPv6, package-manager, shell, credential, host-path, timeout, and output-limit controls. The real Gemma model completed multi-step Python and Node.js tasks, each with two successful guest executions and an artifact.
- The hardened app bundle passes strict deep `codesign` verification with an ad-hoc development identity. Core runs its Node SEA with `--jitless`, has no entitlement exceptions, and packages no native SQLite addon.
- A real two-step Python task was submitted through the running packaged app's authenticated Core sidecar. The packaged Gemma worker planned both executions, the no-NIC guest completed them, and the run persisted `result.txt` with SHA-256 `73475cb40a568e8da8a045ced110137e159f890ac4da883b6b17dc651b3a8049`.
- A copy-installed app bundle passed strict signature validation, restarted against schema version 4, restored the successful run and artifact, shut down its sidecar, and was removed without removing the preserved workspace state.
- `pnpm verify` passes the source limit, repository consistency, TypeScript, unit, native, Rust, helper, sidecar, and desktop build checks.

## Remaining Cross-Platform Work

- Windows native inference confinement, executable agent guest integration, desktop packaging, install lifecycle, and physical acceptance are not implemented or run in this Mac stage.
- The authoritative `pnpm test:gate --milestone 3` therefore remains intentionally red after repository verification and reports the Windows handoff. It must not be used to claim global M3 completion until Windows passes.
- Developer ID signing and Apple notarization were not run because release credentials are not part of this development branch. The verified artifact is an ad-hoc-signed development app bundle, not a notarized public distribution.

Conclusion: the actual M3 product implementation is complete for macOS. Global M3 and Community Desktop V1 remain open for Windows only.
