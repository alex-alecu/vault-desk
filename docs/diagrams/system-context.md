# System Context Diagram

Created: 2026-07-10

```mermaid
flowchart LR
    User["Professional user"] --> Desktop["Vault Desk Desktop"]
    Admin["Office administrator"] --> OfficeAdmin["Vault Desk Office Admin"]

    Desktop --> Control["Local Control Plane"]
    OfficeAdmin --> Control

    Control --> Documents["Approved local documents"]
    Control --> Inference["Local inference runtimes"]
    Control --> Tools["Typed tool sandbox"]
    Control --> Audit["Local audit log"]
    Control --> Backup["Backup and recovery"]

    Control -. "explicitly enabled only" .-> RemoteSupport["Remote support"]
    Control -. "explicitly enabled only" .-> HostedEscalation["Hosted model escalation"]
```

## Notes

- Hosted escalation is not a default dependency.
- Remote support is not a default access path.
- Documents remain local unless the user or administrator explicitly authorizes otherwise.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial system context diagram created. |
