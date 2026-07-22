# Architecture

Updated: 2026-07-22

Vault Desk V1 is a local desktop application with three isolated layers: a thin Tauri interface, an authoritative Node.js control plane, and disposable no-NIC agent microVMs plus a narrow host-native inference worker.

## System Shape

```text
┌───────────────────────────────────────────────────────────────┐
│ Tauri v2 desktop                                              │
│ React webview + minimal Rust host + native dialogs            │
└──────────────────────────┬────────────────────────────────────┘
                           │ typed commands / local RPC
┌──────────────────────────▼────────────────────────────────────┐
│ Vault Core                                                   │
│ grants · sessions · jobs · policy · audit · model mediation  │
│ limits · recovery · worker supervision                       │
└───────────────┬──────────────────────────────┬────────────────┘
                │ typed inference IPC          │ typed VM IPC
┌───────────────▼──────────────┐  ┌────────────▼────────────────┐
│ Native inference worker     │  │ Disposable agent microVM    │
│ approved model only         │  │ zero NICs · immutable root  │
│ no tools/workspace/network  │  │ read-only inputs · scratch  │
└──────────────────────────────┘  │ Python · Node · fixed libs  │
                                  └─────────────────────────────┘
```

## Desktop Plane

The first desktop uses Tauri v2 with React and TypeScript. The Rust host owns only window lifecycle, native dialogs, exact Vault Core sidecar startup, and connection bootstrap.

The webview receives no generic shell, process launcher, environment reader, network client, local-endpoint selector, or unrestricted filesystem API. It works with opaque folder, session, attachment, job, and artifact identifiers through narrow typed commands.

The sidebar's Chats section begins with New chat and then recent global sessions. Its Folders section begins with Add folder and then folder groups. Each folder group exposes its newest five sessions and cursor-based expansion. The main pane restores conversation and observable agent activity. Its header exposes the approved model's human-readable identity, residency state, and manual unload control. The composer remains anchored at the bottom.

## Vault Core

Vault Core is a separate Node.js/TypeScript process and the sole product authority. It owns:

- Current-user-only local RPC and version negotiation.
- Folder grants and explicit attachments.
- Session, turn, draft, job, and artifact state.
- Scoped file access and immutable input staging.
- Policy, audit, cancellation, timeouts, and recovery.
- Model selection, memory scheduling, and inference mediation.
- Agent-loop orchestration and worker teardown.
- Validation of guest messages and results.

Unit tests may use the programmatic facade, but every desktop capability also crosses the daemon protocol. macOS uses a Unix domain socket; Windows uses the protected current-user named pipe. Desktop mode has no TCP listener.

## Agent MicroVM

Every executable agent turn starts a fresh microVM under ADR 0012. The VM configuration contains no virtual network adapter, DNS, route, NAT, bridge, or generic host proxy.

The guest receives:

- An immutable verified root image.
- A read-only staged folder snapshot or explicit attachments.
- Bounded writable scratch that is destroyed with the VM.
- One fixed typed host/guest socket.
- A typed task and bounded completion mediation.
- Fixed Python, Node.js, and reviewed offline libraries.

The guest does not receive credentials, user home, writable host mounts, arbitrary host paths, a host shell, package installation, an external broker, a generic Vault Core API, approval authority, export authority, or a generic model endpoint.

Vault Core may accept declared scratch artifacts as session-owned proposals after type, size, and protocol validation. It never lets the guest commit authoritative state or write the selected host folder.

## Agent Loop

Vault Core owns the loop; the guest owns execution.

1. Core resolves the session and immutable authorized inputs.
2. Core starts the guest with one bounded task.
3. The guest proposes or runs Python/Node.js and returns an observation.
4. A schema-bounded completion request may cross to Core.
5. Core calls the constrained inference worker and returns only the allowed completion payload.
6. The guest continues until it returns a structured result or reaches a turn/resource boundary.
7. Core records observable activity, validates the result, and destroys the guest.

OpenCode informs interaction and loop design but is not a runtime dependency. A dependency may be adopted later only after a separate review proves that it reduces maintained code without weakening these boundaries.

## Inference Worker

The first runtime is node-llama-cpp with an approved hash-pinned local model. It remains host-native for Metal, CUDA, HIP, or Vulkan acceleration, but runs under an operating-system capability boundary with no external networking, credentials, shell, tools, arbitrary workspace access, or approval authority.

The agent guest never connects directly to inference. Vault Core mediates each request, enforces model identity, schema, token and output limits, cancellation, memory budget, and audit. After a successful request, the worker process and approved model remain resident for the next turn. An idle-only typed unload command, a model switch, a contained failure, or Core shutdown terminates the complete worker; the operating system then reclaims the model and cached contexts as one process-scoped unit.

Gemma 4 reasoning is enabled through its supported chat wrapper. Only explicitly typed `thought` segments may cross the worker stream into bounded, transient active-run memory for live display. Those segments never enter the workspace database, conversation, agent event, or audit log. Token counts and timing measurements cross in the terminal typed response and are aggregated into persisted numeric run metrics.

## State And Recovery

Authoritative data uses the schema-versioned SQLite workspace catalog, immutable content-addressed artifacts, a single-writer lock, and the redaction-aware hash-chained audit log established in M1.

M3 adds folder grants, sessions, turns, drafts, attachments, agent runs, observable events, and artifact metadata. An interrupted transaction cannot leave a partial conversation. After daemon restart, the last committed state remains readable and in-flight jobs become an explicit interrupted state before retry or cancellation.

Raw hidden model reasoning is never persisted. Supported typed thought segments exist only while their run is active.

## Security Boundaries

- The user grants a folder or explicit files; the model never chooses host paths.
- Vault Core stages inputs and rechecks path identity at use time.
- Host inputs are read-only to the guest; scratch is guest-only and ephemeral.
- The VM has no NIC and no general host proxy.
- Agent code cannot install dependencies or access credentials.
- The model proposes; Vault Core authorizes and mediates; the guest executes only within its job.
- The webview has no direct product authority.
- Generated artifacts are proposals and cannot silently mutate the host.
- Application telemetry, analytics, automatic crash reporting, and background metrics export do not exist.

## Packaging

V1 packages the Tauri host, exact Vault Core sidecar, native helpers, approved model assets, and verified guest image. First launch performs zero downloads.

Platform packages verify identities, hashes, signatures, notices, SBOMs, current-user endpoint permissions, no-NIC VM configuration, model confinement, and restart behavior on physical macOS and Windows systems.

## Post-V1 Document Intelligence

Canonical parsing, OCR/layout, retrieval, evidence packs, citations, and deterministic verification are one post-V1 follow-up. They may add product-owned fast paths for measured common tasks while retaining the generic agent as the long-tail capability. They cannot weaken the V1 authority boundaries.

## Later Deployment Shapes

The same control-plane boundaries may later support supported personal computers and multi-user office appliances. Identity, shared storage, network brokers, backup, governance, and organization policy require separate decisions and are not part of V1.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Created the original multi-plane architecture. |
| 2026-07-12 | Adopted the certified no-NIC hostile-work boundary. |
| 2026-07-13 | Selected Tauri v2 and a separate Vault Core daemon. |
| 2026-07-20 | Made the generic offline dev-agent desktop the V1 architecture and moved document intelligence after launch. |
| 2026-07-22 | Grouped sidebar creation actions under their Chats and Folders sections. |
