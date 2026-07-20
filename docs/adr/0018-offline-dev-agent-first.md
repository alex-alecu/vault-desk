# ADR 0018: Offline Dev Agent First

Date: 2026-07-20

## Status

Accepted; supersedes ADR 0015 for V1 product sequencing

## Context

The original implementation plan postponed the desktop application and generic code interpreter until after several document-specific milestones. That sequence produced strong foundations but delayed the first product users could operate. It also assumed that supported document operations should be implemented before a general agent could attempt the same work.

The repository owner instead requires the shortest path to a useful cross-platform desktop product: a generic local agent that can inspect a user-selected folder or explicit attachments, write Python and Node.js scripts, execute them offline inside the already selected microVM boundary, and return results without gaining write access to the host.

## Decision

Vault Desk V1 is an offline dev-agent desktop application.

Vault Core owns the agent loop, inference mediation, session state, policy, audit, cancellation, limits, and result validation. The model proposes code and follow-up observations as typed data. It never receives direct process, filesystem, VM-control, approval, export, or network authority.

Every executable agent task runs in a fresh disposable microVM under ADR 0012:

- Zero virtual network devices and no general host-network proxy.
- A verified immutable root image.
- A job-scoped read-only snapshot of the selected folder or explicit attachments.
- Bounded ephemeral scratch writable only inside the guest.
- A fixed typed host/guest socket for task, observation, completion-request, result, and cancellation messages.
- Python and Node.js plus a reviewed, pinned set of offline document and image libraries.
- No dependency installation, package downloads, credentials, user home, arbitrary host paths, host shell, generic Vault Core API, or generic model endpoint.
- Forced teardown after success, failure, cancellation, or timeout.

The host-native inference worker remains separately sandboxed so local acceleration is available. A guest completion request is schema-bounded and mediated by Vault Core; the guest cannot choose a model path or connect to the inference worker directly.

The V1 desktop uses Tauri v2 and React under ADR 0014. Its sidebar contains a global New chat action and folder groups. A folder group shows its five most recent sessions and expands older sessions through Show more. New chat sessions accept explicit file attachments without granting a full folder. The webview receives opaque identifiers and display metadata, never unrestricted host paths or filesystem handles.

Canonical parsing, OCR, retrieval, citations, and deterministic document tools move to one post-V1 document-intelligence follow-up. They may optimize common tasks when measurements justify maintained product code, but they are no longer prerequisites for the generic agent.

OpenCode is an interaction and agent-loop reference, not an adopted runtime. Vault Desk starts with the smallest owned loop that satisfies the offline microVM, typed mediation, cancellation, audit, packaging, and resource gates. A future dependency decision requires a separate review.

## Consequences

Positive:

- Produces a usable desktop product earlier.
- Supports broad file work before format-specific product features exist.
- Reuses the already certified cross-platform no-NIC microVM boundary.
- Keeps host source folders immutable while allowing arbitrary work in disposable scratch.
- Allows real usage to identify which deterministic document features deserve post-V1 maintenance.

Negative:

- A generic local agent can be slower and less reliable than purpose-built operations.
- Generated code can produce incorrect results even when securely isolated.
- The guest image becomes larger because it contains interpreters and fixed libraries.
- Model mediation, multi-step execution, and desktop streaming must work before V1.
- Source citations and format-specific verification are not promised in the first release.

## Required Validation

- Real multi-step Python and Node.js tasks over read-only folder inputs on macOS and Windows.
- Zero-NIC configuration inspection plus runtime denial probes for external, LAN, multicast, and host reachability.
- Attempts to modify the host folder, traverse outside staged inputs, follow escaping links, access credentials, install packages, or reach arbitrary host services fail.
- Infinite loops, process storms, memory and disk exhaustion, oversized output, malformed IPC, guest crash, cancellation, and daemon restart are contained.
- Guest completion requests cannot become a generic inference endpoint or escape their turn, token, schema, and output limits.
- Session grouping, five-item pagination, New chat attachments, restart restoration, draft preservation, and folder removal behave as specified.
- Packaged macOS and Windows applications launch with zero downloads and verify the exact sidecar, helpers, model assets, and guest image.

## Revision History

| Date | Change |
|---|---|
| 2026-07-20 | Made the generic offline dev agent and full desktop application the V1 product path. |
