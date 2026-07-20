# Milestone M3 Status

Updated: 2026-07-20

M3 Offline Dev-Agent Desktop V1 is active. It is the first full product milestone and replaces the former document-first pre-V1 sequence. The first implementation slice is working, but the product gate remains open.

## Change Brief

- Goal: ship a functional macOS and Windows desktop app whose local agent can write and execute Python and Node.js inside a disposable offline microVM over a user-selected read-only folder or explicit attachments.
- Authority: explicitly activated by the repository owner on 2026-07-20.
- Product surface: New chat, file attachments, folder groups, five recent sessions per folder, Show more, persistent conversations, agent activity, cancellation, and restart recovery.
- Security boundary: the webview has no host authority; Vault Core owns grants and policy; the guest has zero NICs, immutable root, read-only staged inputs, bounded scratch, typed inference mediation, and no host writes.
- Platform scope: physical Apple-silicon macOS and supported Windows x64 packages. The remaining Windows inference boundary from M2 is part of this gate.
- Explicitly deferred: canonical document ingestion, OCR/layout, retrieval, citations, specialized workflow packs, Knowledge Bundles, external integrations, and model downloads.

## Current Evidence

- M0 reproducible workspace, model, Tauri capability, and provisional no-NIC evidence: complete.
- M1 workspace, daemon, current-user transports, audit, recovery, staging, and certified macOS/Windows microVM foundations: complete.
- M2 macOS supervised inference, grammar generation, embeddings, resource scheduling, containment, and model canaries: implemented.
- M3 plan and ADR 0018: accepted.
- Product Tauri/React package: shell, fixed Tauri command bridge, exact signed Core sidecar build, supervision, and optimized macOS native build implemented; visual browser QA and a real macOS app launch pass; installer packaging is not implemented.
- Folder/session daemon contracts: implemented with schema migration 3, private folder grants, global sessions, newest-five pagination, Show more, safe summaries, persisted messages, restart recovery, and desktop wiring.
- Attachment contracts and UI: not implemented.
- Agent loop: typed bounded six-execution loop and deterministic coverage implemented; it is not yet wired to sessions or the desktop.
- Executable guest role: not implemented; the current certified guest remains the M1 no-NIC probe.
- Fixed offline guest library manifest and reproducible image: not implemented.
- Windows native inference boundary: not implemented.
- Packaged Core acceptance: the exact macOS Node SEA, packaged native SQLite addon, migration resources, private Unix socket, CLI status, Tauri supervision, and clean shutdown pass. This is development-package evidence, not installer certification.
- Windows desktop build logic: exact Core SEA, SQLite/migration resources, M1 pipe guard, signature replacement, and fixed Tauri launch arguments are implemented but not run on Windows.
- macOS and Windows installer acceptance: not run.

## First Implementation Stage

1. Complete attachment, run-event, and artifact contracts.
2. Extend the microVM protocol and guest image for real Python/Node execution.
3. Connect the bounded agent loop to host-native inference and disposable guest execution.
4. Complete Windows inference confinement, installers, and both physical-platform acceptance suites.

## Gate

The complete acceptance gate is authoritative in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md#m3--offline-dev-agent-desktop-v1--active). M3 remains open until every macOS and Windows item passes without a process-only or network-enabled fallback.

Conclusion: active; the supervised native shell, packaged Core, conversation persistence, daemon bridge, and bounded loop are implemented and repository verification passes. Attachments, real isolated execution, Windows proof, and installers remain the critical path.
