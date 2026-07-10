# Document Pipeline Diagram

Created: 2026-06-29

```mermaid
flowchart TD
    Input["File, folder, inbox, or sync source"] --> Detect["Format detection"]
    Detect --> Native["Native text extraction"]
    Detect --> Layout["Layout-aware parsing"]
    Detect --> OCR["OCR fallback"]

    Native --> Canonical["Canonical document object"]
    Layout --> Canonical
    OCR --> Canonical

    Canonical --> Chunk["Structure-aware chunking"]
    Chunk --> Dense["Dense embeddings"]
    Chunk --> Lexical["Lexical index"]
    Dense --> Retrieve["Hybrid retrieval"]
    Lexical --> Retrieve
    Retrieve --> Rerank["Optional reranking"]
    Rerank --> Prompt["Prompt builder with citations"]
    Prompt --> Model["Local model"]
    Model --> Output["Evidence-linked answer or proposed tool call"]
```

## Notes

- Chunk metadata should preserve page, section, table, region, parser, and confidence information.
- Multimodal inspection should be reserved for difficult pages, not used as the default reader.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial document pipeline diagram created. |
