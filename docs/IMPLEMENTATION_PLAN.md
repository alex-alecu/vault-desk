# Implementation Plan

Updated: 2026-07-21

This is the authoritative implementation sequence for the first Vault Desk release. M0 and M1 are complete. The useful macOS portion of M2 is implemented and its unfinished Windows inference work is now part of the cross-platform M3 gate. The repository owner activated M3 on 2026-07-20 as the first full product milestone. The macOS M3 stage is implemented and physically certified; Windows remains required before M3 or Community Desktop V1 can close.

The shortest path to V1 is a generic offline desktop agent, not a format-specific document pipeline. The agent may write and run Python and Node.js programs inside a disposable no-NIC microVM. It receives only user-selected read-only inputs and bounded ephemeral scratch. It cannot write to the selected host folder, install packages, reach a network, inherit credentials, or call an unrestricted host service.

## Change Brief

- Goal: ship a functional macOS and Windows desktop application with a generic local coding agent inspired by the interaction model of OpenCode and the desktop structure of the Codex app.
- Active milestone: M3 — Offline Dev-Agent Desktop V1.
- Allowed scope: Tauri/React desktop, native folder and file selection, grouped persistent sessions, local daemon APIs, host-native model mediation, a disposable code-agent microVM, fixed offline Python/Node libraries, typed execution results, audit, cancellation, packaging, and platform evidence.
- Product boundaries: the webview has no direct filesystem, process, shell, environment, or network authority. Vault Core owns grants, sessions, policy, audit, inference mediation, worker limits, and lifecycle. The guest owns only code execution over staged read-only inputs and scratch.
- Risks: guest-image size and reproducibility, Windows/macOS packaging differences, multi-step agent-loop correctness, local-model latency, recovery, and accidental host authority.
- Acceptance evidence: a packaged app on physical macOS and Windows; folder and attachment flows; grouped session restoration; real multi-step Python and Node tasks; structural network denial; host-write and package-install denial; cancellation/restart recovery; and signed sidecar and guest-image verification.
- Dependencies affected: reviewed and pinned React/Tauri frontend packages plus a reviewed guest-library manifest. OpenCode is a design reference, not a required dependency.
- Explicitly not doing before V1: canonical document ingestion, OCR/layout routing, hybrid retrieval, citation verification, domain workflows, Knowledge Bundle import, external integrations, or model downloads.

## Product Architecture

Three layers remain mandatory:

1. **Tauri desktop** — React and TypeScript in the operating-system webview plus the minimum Rust needed for window lifecycle, native dialogs, exact Vault Core sidecar supervision, and connection bootstrap.
2. **Vault Core** — the separate Node.js/TypeScript authority for folder and attachment grants, sessions, jobs, policy, audit, model scheduling, inference mediation, worker supervision, and typed daemon methods.
3. **Workers** — a narrowly sandboxed host-native inference process and a disposable no-NIC microVM for agent-authored code.

The desktop communicates only through narrow typed Tauri commands and the current-user-only local daemon protocol. TCP is not enabled. Every M3 backend capability is exercised through both the programmatic facade and daemon protocol before the desktop consumes it.

## V1 User Experience

The left sidebar has one global **New chat** action followed by folder groups. Each folder group shows its five most recent sessions and a **Show more** control when older sessions exist. A folder selection creates a new session in that folder unless an existing session is selected.

A New chat session has no folder grant. Users may attach explicit files, which are copied into a session-owned read-only input set before agent execution. A folder session grants read-only access to the selected folder snapshot for that job. Switching sessions restores the conversation, selected context, tool activity, and draft text.

The main pane is conversation-first. It shows streamed assistant output, concise code/tool activity, generated artifacts, warnings, failures, and cancellation state. The composer remains anchored at the bottom. Infrastructure vocabulary and arbitrary model/runtime configuration stay out of the ordinary interface.

## Agent Execution Contract

Vault Core owns the agent loop. The model may propose a script or request the next bounded observation, but it never receives execution authority.

Each agent turn:

1. Resolves the session and its authorized folder snapshot or explicit attachments.
2. Starts a fresh verified microVM image with zero virtual NICs.
3. Attaches authorized inputs read-only and a bounded scratch disk writable only inside the guest.
4. Sends a typed task request over the fixed host/guest socket.
5. Mediates bounded model completions through typed IPC to the host-native inference worker.
6. Runs only the fixed Python or Node executables and libraries already present in the immutable guest image.
7. Returns bounded stdout, stderr, a structured result, generated scratch artifacts, code, resource use, and termination reason.
8. Validates and records the result, then destroys the microVM.

The guest has no package manager authority, credentials, user home, host shell, general Vault Core endpoint, generic model server, approval authority, export authority, or network broker. Host source folders are never writable. Generated artifacts remain session-owned proposals; an explicit future export capability must be separately authorized.

## Guest Image

The V1 image contains only a reviewed, pinned offline toolset:

- Python 3 and Node.js matching the product runtime major.
- Python standard-library support for text, JSON, CSV, SQLite, archives, and subprocess-free data work.
- A minimal reviewed set for PDF, DOCX, XLSX, and image inspection.
- A tiny guest agent entrypoint and typed IPC codec.

The exact library names, versions, licenses, notices, hashes, and purpose live in the machine-readable compliance and guest manifests. Package installation commands and package-manager network configuration are absent from the runtime image. Guest builds are reproducible and generated images are not committed.

## State And Recovery

Vault Core persists authoritative state in the existing schema-versioned workspace catalog and immutable artifact store. M3 adds only the session, turn, attachment, folder-grant, and agent-run records required by the desktop.

- Folder identity is canonical and stable across equivalent paths.
- A session belongs either to one folder grant or to the global New chat area.
- The newest five sessions per folder are one query, with cursor-based expansion for older sessions.
- Conversation turns and agent-run summaries commit atomically.
- A daemon or guest crash leaves the previous committed conversation readable and the interrupted run explicitly failed or resumable.
- Raw hidden model reasoning is never persisted.

## Model And Asset Distribution

The first V1 package is self-contained and performs zero downloads on first launch. It includes only approved runtime assets, one generation model, the guest image, and required native helpers whose hashes appear in the package manifest.

Downloaded development models, generated guest images, signed helpers, build output, coverage, reports, installers, and dependency directories remain ignored artifacts. Distribution requires notices, SBOMs, hashes, signatures, and platform package verification. A model-download build remains post-V1 work.

## Continuous Verification

`pnpm verify` remains the fast repository gate. `pnpm test:gate --milestone 3` is the V1 acceptance entrypoint and must fail rather than silently skip any required physical-platform, model, microVM, desktop, or packaging evidence.

Unit tests may use deterministic inference and guest fakes. Acceptance must use the real daemon, packaged sidecar, real host-native inference, real guest image, real microVM launchers, and real Tauri applications on macOS and Windows.

## Milestones

### M0 — Reproducible foundation — complete

M0 established the pinned workspace, CI, generic deterministic task fixtures, model manifest, dependency inventory, test-only Tauri capability probe, and provisional no-NIC guest validation. Its evidence remains in [M0_STATUS.md](M0_STATUS.md).

### M1 — Secure local control plane and microVMs — complete

M1 delivered workspace state, scoped files, atomic artifacts, audit, jobs, current-user daemon transports, CLI health, bounded worker staging, and certified no-NIC microVM launchers on macOS and Windows. Its evidence remains in [M1_STATUS.md](M1_STATUS.md).

### M2 — Supervised inference foundation — incorporated into M3

The macOS supervisor, model resolver, memory scheduler, typed inference worker, grammar generation, embeddings, containment tests, and real-model canaries are implemented. M3 reuses them and completes the Windows native inference boundary and daemon exposure as part of the product gate. [M2_STATUS.md](M2_STATUS.md) remains the historical stage record.

### M3 — Offline Dev-Agent Desktop V1 — active

Stage state: macOS implementation and physical acceptance pass; Windows implementation and physical acceptance remain open.

Scope:

- Add typed folder-grant, attachment, session, turn, agent-run, agent-event, and artifact contracts just in time.
- Add schema migrations and Core commands/queries for folder groups, the newest five sessions, cursor expansion, New chat, turns, attachments, drafts, and recovery.
- Add daemon methods and a typed desktop client for every M3 capability, including streaming or bounded event polling, cancellation, and reconnect.
- Build the product Tauri v2 and React desktop shell on macOS and Windows.
- Add native folder/file dialogs without exposing arbitrary paths to the webview.
- Implement the Vault Core-owned agent loop with bounded turns, typed inference mediation, cancellation, audit, and deterministic fake coverage.
- Build a reproducible agent guest image with Python, Node.js, the reviewed fixed library set, a typed guest entrypoint, immutable root, read-only inputs, and bounded scratch.
- Extend the common microVM protocol from the M1 probe to agent tasks, model-completion requests, observations, structured results, and generated scratch artifacts.
- Complete Windows native inference confinement and verify the real V1 model on both platforms.
- Package the exact Vault Core sidecar, native helpers, model assets, and guest image with zero-download first launch.

Gate:

- A fresh install launches on physical Apple-silicon macOS and supported Windows x64 and connects only to its authenticated current-user daemon endpoint.
- The desktop can add and remove folder grants, create a folder session, create a New chat session, attach files, restore sessions after restart, show exactly five recent sessions per folder, and expand older sessions with Show more.
- A real local model completes at least one multi-step Python task and one multi-step Node.js task over folder inputs on both platforms.
- The guest can recursively read the authorized staged folder snapshot and write only to its bounded scratch. It cannot mutate, create, rename, or delete anything in the host source folder.
- VM configuration and runtime probes prove zero virtual network adapters and denial of DNS, IPv4, IPv6, LAN, multicast, host reachability, package installation, credentials, host paths, arbitrary host services, and generic model endpoints without command or destination matching.
- Traversal, symlink/junction escape, time-of-check/time-of-use replacement, malformed IPC, oversized input/output, process storms, timeout, cancellation, guest crash, daemon crash, and low-disk cases are contained and produce typed durable outcomes.
- The webview cannot invoke arbitrary shell commands, processes, paths, URLs, local endpoints, environments, model files, or filesystem operations.
- The agent activity view exposes executed code, concise logs, generated artifacts, resource limits, and termination reason without persisting hidden reasoning.
- Keyboard navigation, visible focus, screen-reader labels, reduced motion, resizing, and 200 percent scaling pass on both platform webviews.
- Packaged application checks cover install, first launch with zero downloads, sidecar and helper identity, restart, upgrade, uninstall, and preservation of user workspace state.
- Required notices, SBOMs, artifact manifests, hashes, signatures, and unsupported-hardware messages are present and accurate.

M3 closes only when all macOS and Windows evidence passes. Closing M3 is the Community Desktop V1 launch gate.

## Post-V1 Follow-up: Document Intelligence

After V1, one combined follow-up may add the former document-specific sequence as a single measured capability:

- Native parsing and crash-consistent manifests.
- OCR and layout routing.
- Structure-aware chunking and hybrid retrieval.
- Evidence packs, claim-level citations, and deterministic verification.

The generic agent remains available for novel tasks, but supported deterministic document operations may be added when measurements show they improve speed, accuracy, evidence quality, or model cost. This follow-up must not weaken the V1 microVM, read-only-host, no-network, session, or desktop contracts.

## Explicitly Deferred After V1

- Specialized professional workflow packs.
- Knowledge Bundle distribution and import.
- External integrations and their typed network broker.
- Model downloads and alternate runtime adapters.
- Office appliance multi-user controls.
- Long-session compaction beyond the recovery needed for V1 sessions.
- Linux desktop certification.

## V1 Launch And Contribution Activation

The V1 launch follows M3 certification. Until then, the repository owner remains the sole commit author and develops each implementation stage through short-lived branches and pull requests. At launch, contribution activation remains a separate owner decision; it is not required to ship the desktop app.

AI assistants, models, coding agents, and tools are never commit authors or co-authors.

## Change And Commit Policy

- Keep commits small and leave `pnpm verify` green.
- Beginning with M1, implementation reaches `main` only through a pull request.
- Keep generated binaries, models, guest images, reports, packages, coverage, and dependency directories out of Git.
- Record exact pass, fail, and not-run evidence before closing a gate.

## Revision History

| Date | Change |
|---|---|
| 2026-07-11 | Created the original staged implementation plan. |
| 2026-07-17 | Closed M0 and began pull-request-only implementation stages. |
| 2026-07-18 | Closed cross-platform M1. |
| 2026-07-19 | Activated supervised inference and completed its macOS stage. |
| 2026-07-20 | Replaced the long pre-product sequence with M3 Offline Dev-Agent Desktop V1, moved document intelligence after V1, and made the generic no-NIC coding agent the first product. |
| 2026-07-21 | Completed the M3 macOS implementation and physical acceptance while keeping the cross-platform launch gate open for Windows. |
