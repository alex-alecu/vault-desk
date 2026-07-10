# Desktop Architecture Diagram

Created: 2026-06-29

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

    Docs --> Extract["Native extraction"]
    Docs --> Layout["Layout parser"]
    Docs --> OCR["OCR fallback"]
    Docs --> Index["Hybrid index"]

    Index --> Retrieval["Retriever and reranker"]
    Retrieval --> Router

    Router --> Runtime["Local model runtime adapter"]
    Runtime --> Stream["Streaming answer"]
    Stream --> UI

    Tools --> Approval["Approval flow"]
    Approval --> Sandbox["Tool sandbox"]
    Sandbox --> Export["Exports and file operations"]
    Sandbox --> Audit
```

## Notes

- This is a logical architecture, not an implementation folder map.
- The future orchestration harness should be TypeScript under Node.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial desktop architecture diagram created. |
