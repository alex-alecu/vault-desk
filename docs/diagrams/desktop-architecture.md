# Desktop Architecture Diagram

Created: 2026-07-10

```mermaid
flowchart TD
    UI["Desktop shell"] --> API["Local API"]
    API --> Session["Session manager"]
    API --> Workspace["Workspace manager"]
    API --> Jobs["Job queue"]
    API --> Policy["Policy engine"]
    API --> Audit["Audit log"]

    Jobs --> Docs["Document pipeline"]
    Jobs --> Router["Model router"]
    Jobs --> Tools["Tool registry"]

    Docs --> MicroVM["No-NIC microVM"]
    MicroVM --> Extract["Native extraction"]
    MicroVM --> Layout["Layout parser"]
    MicroVM --> OCR["OCR fallback"]
    Docs --> Index["Hybrid index"]

    Index --> Retrieval["Retriever and reranker"]
    Retrieval --> Router

    Router --> Runtime["Local model runtime adapter"]
    Runtime --> Stream["Streaming answer"]
    Stream --> UI

    Tools --> Approval["Approval flow"]
    Approval --> Sandbox["Typed tool boundary"]
    Sandbox --> MicroVM
    Sandbox --> Export["Scoped exports and file operations"]
    Sandbox --> NetworkBroker["Typed external-connection broker"]
    Sandbox --> Audit
```

## Notes

- This is a logical architecture, not an implementation folder map.
- The future orchestration harness should be TypeScript under Node.
- The microVM has no virtual NIC; authorized external access cannot pass through it.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial desktop architecture diagram created. |
| 2026-07-12 | Added the no-NIC microVM and separate external-connection broker boundaries. |
