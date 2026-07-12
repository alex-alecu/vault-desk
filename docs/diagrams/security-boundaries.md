# Security Boundaries Diagram

Created: 2026-07-10

```mermaid
sequenceDiagram
    participant UI as User interface
    participant CP as Control plane
    participant Model as Model runtime
    participant Policy as Policy engine
    participant Approval as Approval flow
    participant Sandbox as No-NIC microVM
    participant Broker as External-connection broker
    participant Audit as Audit log

    UI->>CP: Request with selected workspace
    CP->>Model: Evidence and task context
    Model-->>CP: Answer or proposed tool call
    CP->>Policy: Validate schema, scope, and permissions
    Policy-->>CP: Allow, ask, or deny
    alt approval required
        CP->>Approval: Show preview or diff
        Approval-->>CP: Approved or rejected
    end
    alt approved action
        CP->>Sandbox: Execute hostile scoped work over typed IPC
        Sandbox-->>CP: Tool result
        CP->>Audit: Record request, decision, and result
        CP->>Model: Continue with tool result
        Model-->>UI: Final cited answer
    else denied or rejected
        CP->>Audit: Record denial or rejection
        CP-->>UI: Explain blocked action
    end
    opt approved external integration
        CP->>Broker: Execute typed policy-approved request
        Broker-->>CP: Audited bounded result
    end
```

## Notes

- The model never executes tools directly.
- Policy and approval are separate from model reasoning.
- Audit records are created for both successful and blocked actions.
- The microVM has no virtual network device; only the separate broker can perform an approved external request.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial security boundaries diagram created. |
| 2026-07-12 | Replaced the generic sandbox with a no-NIC microVM and separate external-connection broker. |
