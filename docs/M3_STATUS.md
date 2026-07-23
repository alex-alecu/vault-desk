# Milestone M3 Status

Updated: 2026-07-23

The persistent-workspace M3 implementation is complete and certified on physical Apple silicon. The cross-platform M3 and Community Desktop V1 launch gate remain open until Windows HCS Plan9 integration and physical Windows acceptance pass.

## Change Brief

- Goal: let the local agent inspect a selected folder live, work iteratively in a durable session workspace, and run Python, Node.js, or installed shell commands inside one reusable offline microVM.
- Authority: M3 was activated by the repository owner on 2026-07-20; the owner explicitly reopened ADR 0018 for the persistent-workspace revision on 2026-07-23.
- Product surface: New chat, immutable file attachments, folder groups, recent persistent sessions, drafts, durable messages and execution events, warm-session restoration, cancellation, artifacts, and Technical details.
- Security boundary: the webview has no host authority; Vault Core owns grants, policy, audit, inference mediation, VM lifecycle, and workspace manifests; the guest has zero NICs, an immutable root, a live read-only `/source`, and writable access only to bounded `/workspace` and ephemeral `/run/user`.
- Platform scope: certified macOS VirtioFS now; Windows HCS Plan9 with host and guest read-only enforcement remains the active platform handoff.
- Explicitly deferred: host shell, writable source mounts, networking, package installation, Git tooling, document intelligence, external integrations, and arbitrary downloadable libraries.

## Implemented Mac Product

- The Tauri and React desktop retains native folder and file selection, grouped sessions, newest-five pagination, drafts, conversation restoration, task activity, generated files, cancellation, keyboard and responsive behavior, and a Technical details view. The webview receives opaque identifiers and has no shell, process, filesystem, URL, or network plugin authority.
- Vault Core persists schema-versioned state at catalog version 6. Every user and assistant message, proposed source or command, workspace path, result, bounded stdout and stderr, termination, artifact, event, and summary remains durable even when later prompt compaction omits it.
- The Core-owned loop supports distinct Python and Node source actions plus shell command actions. It assigns `steps/NNNN.py` or `steps/NNNN.mjs` when needed, records the assigned path before execution, preserves failed repair chains, uses the actual allocated context or the certified 8K minimum, reserves 4,096 output tokens, and returns `agent_context_exhausted` rather than dropping mandatory repair context.
- A session starts or reuses the single warm no-NIC VM. One execution runs at a time. Selecting or restoring a session warms it in the background; another session, deletion, folder revocation, Core shutdown, helper failure, or memory pressure evicts it. Folder revocation retains the durable workspace, while session deletion removes it.
- macOS passes the exact canonical folder path to one read-only VirtioFS share mounted at `/source`. Vault Core does not enumerate, flatten, stage, copy, or impose count or size limits on folder contents. Live mounting trades snapshot reproducibility for visibility of host changes.
- `/workspace` is a 128 MiB writable tmpfs. After each responsive execution, Core atomically commits its regular files and directories through a content-addressed manifest and rehydrates that manifest after VM, application, or machine restart. Traversal, devices, sockets, escaping links, hash mismatches, and blob replacement are rejected.
- The version-2 guest protocol supports hello and capabilities, hydration, repeated execution, cancellation, workspace deltas, results, and graceful shutdown. Executed children run as the unprivileged guest user with process-group cancellation, closed control descriptors, sanitized environment, syscall socket denial, and process, time, memory, output, and storage limits.
- The reproducible guest contains Linux 6.18.7, BusyBox 1.38.0, Python 3.14.5, Node.js 24.18.0, Pillow 12.0.0, pypdf 6.14.2, openpyxl 3.1.5, et-xmlfile 2.0.0, defusedxml 0.7.1, lxml 6.0.2, typing-extensions 4.15.0, and python-docx 1.2.0. It exposes all 292 installed executable paths, including `/bin/sh`, `find`, `grep`, `sed`, `awk`, `diff`, `patch`, and `tar`, while omitting pip, npm, package managers, Git, compilers, and Python `ensurepip` payloads.

## Physical Mac Evidence

- Two clean Buildroot builds, with Docker networking disabled for the second, produced byte-identical outputs:
  - kernel SHA-256: `211d283fafe9e094e614629ef21f8616cdce24c5e4b43b936c4c73a3e447e7bd`.
  - initramfs SHA-256: `9800cf6a6f17cb1f4d87a25cc34d3065501aa4bfbde7a1561e925dbe750fd532`.
- `pnpm test:m3:macos` returned `certified` on the physical 48 GB Apple-silicon Mac. The guest recursively observed 65 nested files and a 537,919,488-byte sparse file without staging or copy limits, saw a live same-size host edit, and rejected writes to `/source`, the immutable root, `/tmp`, and other locations outside `/workspace` and `/run/user`.
- Python, Node.js 24, and shell pipelines succeeded in one reusable VM. A failed Python file was corrected at the same path, the corrected file and a 9 MiB workspace file survived VM closure and rehydration, and no reboot occurred between the primary execution steps.
- Runtime probes blocked IPv4, IPv6, DNS, VSOCK, Unix sockets, socket pairs, credentials, host paths, and package managers. Cancellation returned `cancelled`; timeout and output probes returned `timeout` and `resource_limit`; the process limit stopped at 31 children; memory and 128 MiB workspace exhaustion were blocked; a guest crash was contained; and an escaping workspace symlink was rejected.
- Real Gemma completed two successful Python executions in two attempts and produced `python-result.txt`. It completed two successful Node executions in three attempts and produced `node-result.txt`. Both runs used the 17,179,869,184-byte inference budget, 1,112,334,048 CPU RAM bytes, 12,396,953,088 GPU VRAM bytes, and the full 262,144-token context.
- For both real runs, folder revocation closed the VM while retaining the workspace manifest, and session deletion removed the manifest. The guest capability manifest reported 292 executable paths and the complete reviewed runtime set.
- The earlier macOS packaged-app stage passed strict ad-hoc signature validation, authenticated sidecar execution, copy-install restoration, and user-state preservation. The persistent-workspace revision is additionally covered by the current physical headless gate and current package/build verification; Developer ID signing and notarization remain release-credential work.
- `pnpm verify` passes the source limit, repository consistency, TypeScript, unit, native, Rust, helper, sidecar, and desktop build checks.

## Remaining Cross-Platform Work

- Windows M2 native inference confinement remains implemented and certified. Windows persistent agent integration must add an HCS Plan9 share with both host `ReadOnly` and guest read-only mount enforcement over Hyper-V sockets, with zero NICs and no folder-copy fallback.
- The physical Windows M3 gate must prove the same live hierarchy, large sparse source file, host-write denial, persistent workspace, Python, Node.js, shell, repair, cancellation, crash, quota, malformed-IPC, revocation, deletion, packaging, and install lifecycle evidence. None of that Windows M3 evidence was run on this Mac.
- The Windows full-VRAM canary remains implemented but has not run on physical Windows hardware for this stage.
- The authoritative `pnpm test:gate --milestone 3` remains intentionally red. macOS evidence must never be used to infer Windows certification or global M3 completion.

Conclusion: the persistent offline development workspace is implemented and physically certified on macOS. Global M3 and Community Desktop V1 remain open for Windows Plan9 integration and physical certification.
