# Office Appliance Diagram

Created: 2026-07-10

```mermaid
flowchart LR
    EmployeeA["Employee device"] --> WebClient["Browser or lightweight client"]
    EmployeeB["Employee device"] --> WebClient
    Admin["Administrator"] --> AdminUI["Admin UI"]

    WebClient --> ApplianceAPI["Appliance API"]
    AdminUI --> ApplianceAPI

    ApplianceAPI --> Identity["Identity and roles"]
    ApplianceAPI --> Workspaces["Shared and private workspaces"]
    ApplianceAPI --> Policy["Policy and approvals"]
    ApplianceAPI --> Audit["Immutable audit history"]
    ApplianceAPI --> Backup["Backup and restore"]
    ApplianceAPI --> Scheduler["Workflow scheduler"]

    Scheduler --> DocumentWorkers["No-NIC microVM document workers"]
    Scheduler --> Inference["Central local inference"]
    Scheduler --> ToolSandbox["No-NIC microVM tool and code sandbox"]
    Scheduler --> NetworkBroker["Typed external-connection broker"]

    Storage["Appliance or NAS storage"] --> Staging["Job-scoped read-only staging"]
    Staging --> DocumentWorkers
    DocumentWorkers --> Scheduler
    ToolSandbox --> Scheduler
    Scheduler --> ScopedWrites["Scoped approved writes"]
    ScopedWrites --> Storage
```

## Notes

- Employees keep their existing computers.
- Central local inference and policy controls are the commercial core.
- Storage strategy remains an open decision: documents may remain on NAS or be copied into appliance-managed storage.
- MicroVM workers have no virtual NIC; approved network activity is isolated in the broker.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial office appliance diagram created. |
| 2026-07-12 | Added no-NIC microVM workers and a separate external-connection broker. |
| 2026-07-13 | Included bounded generated-code execution in the no-NIC tool sandbox. |
