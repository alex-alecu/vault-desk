# Security Boundaries Diagram

Updated: 2026-07-20

```mermaid
sequenceDiagram
    participant UI as Tauri webview
    participant Core as Vault Core
    participant Model as Native inference worker
    participant VM as No-NIC agent microVM
    participant Audit as Local audit

    UI->>Core: Session request with opaque folder or attachment IDs
    Core->>Core: Validate grant, stage immutable read-only inputs
    Core->>VM: Typed task, read-only inputs, bounded scratch
    VM-->>Core: Observable activity or bounded completion request
    Core->>Model: Schema and token-bounded completion
    Model-->>Core: Typed completion
    Core-->>VM: Typed completion result
    VM-->>Core: Code, bounded logs, artifacts, structured result
    Core->>Core: Validate schema, size, scope, and terminal state
    Core->>Audit: Record observable activity and outcome
    Core-->>UI: Streamed result, activity, artifacts, or failure
    Core->>VM: Forced teardown
```

## Notes

- The model proposes and Vault Core mediates; neither receives direct host execution authority.
- The guest has zero virtual NICs, no credentials, no package installation, no generic host service, and no writable host mount.
- The webview never supplies arbitrary executable names, endpoints, or filesystem paths.
- Generated artifacts remain session-owned proposals and cannot silently mutate the host.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Created the initial security boundaries diagram. |
| 2026-07-12 | Adopted the no-NIC microVM boundary. |
| 2026-07-20 | Made the generic offline agent the V1 execution path. |
