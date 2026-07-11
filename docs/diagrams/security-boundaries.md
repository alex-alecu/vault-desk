# Security Boundaries Diagram

Created: 2026-07-10

```mermaid
sequenceDiagram
    participant UI as User interface
    participant CP as Control plane
    participant Model as Model runtime
    participant Policy as Policy engine
    participant Approval as Approval flow
    participant Sandbox as Tool sandbox
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
        CP->>Sandbox: Execute scoped tool
        Sandbox-->>CP: Tool result
        CP->>Audit: Record request, decision, and result
        CP->>Model: Continue with tool result
        Model-->>UI: Final cited answer
    else denied or rejected
        CP->>Audit: Record denial or rejection
        CP-->>UI: Explain blocked action
    end
```

## Notes

- The model never executes tools directly.
- Policy and approval are separate from model reasoning.
- Audit records are created for both successful and blocked actions.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial security boundaries diagram created. |
