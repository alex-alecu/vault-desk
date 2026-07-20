# System Context Diagram

Created: 2026-07-10

```mermaid
flowchart LR
    User["Professional user"] --> Desktop["Vault Desk Desktop: Tauri"]
    Admin["Office administrator"] --> OfficeAdmin["Vault Desk Office Admin"]

    Desktop --> Control["Local Control Plane"]
    OfficeAdmin --> Control

    Control --> Documents["User-selected read-only folders and attachments"]
    Control --> Inference["Local inference runtimes"]
    Control --> Sandbox["Disposable no-NIC dev-agent microVMs"]
    Control --> NetworkBroker["Typed external-connection broker"]
    Control --> Audit["Local audit log"]
    Control --> Backup["Backup and recovery"]

    Control -. "explicitly enabled only" .-> RemoteSupport["Remote support"]
    Control -. "explicitly enabled only" .-> HostedEscalation["Hosted model escalation"]
```

## Notes

- Hosted escalation is not a default dependency.
- Remote support is not a default access path.
- Selected inputs remain local and read-only to the guest.
- Agent-authored code has no virtual network device; approved future external connections use the separate broker.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial system context diagram created. |
| 2026-07-12 | Added the no-NIC microVM and separate typed external-connection broker. |
| 2026-07-13 | Identified the Tauri desktop shell and bounded code-interpreter microVM role. |
| 2026-07-20 | Made read-only folder sessions and the generic offline dev agent the V1 system context. |
