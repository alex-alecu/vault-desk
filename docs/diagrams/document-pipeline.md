# Document Pipeline Diagram

Created: 2026-06-29

```mermaid
flowchart TD
    Input["File, folder, inbox, or sync source"] --> Manifest["File manifest, hashes, versions, permissions"]
    Manifest --> Detect["Format detection"]
    Detect --> MarkItDown["MarkItDown broad conversion"]
    Detect --> Docling["Docling layout-aware parsing"]
    Detect --> Native["Native Office, spreadsheet, CSV parsers"]
    Detect --> OCR["OCR fallback"]
    Detect --> Multimodal["Gemma 4 page-region inspection"]

    MarkItDown --> Canonical["Canonical document object"]
    Docling --> Canonical
    Native --> Canonical
    OCR --> Canonical
    Multimodal --> Canonical

    Canonical --> Chunk["Structure-aware chunking"]
    Chunk --> Summary["Page, section, table, sheet, document, folder summaries"]
    Chunk --> Dense["EmbeddingGemma vectors"]
    Chunk --> Lexical["Lexical index"]
    Dense --> Turbo["Optional turbovec acceleration"]
    Turbo --> Retrieve["Hybrid retrieval"]
    Lexical --> Retrieve
    Summary --> Retrieve
    Retrieve --> Evidence["Evidence pack"]
    Evidence --> Model["Gemma 4 model profile"]
    Model --> Claims["Answer, extraction, summary, or tool proposal"]
    Claims --> Verify["Claim, citation, calculation, and contradiction verification"]
    Verify --> Output["Evidence-linked output, warnings, or review queue"]
```

## Notes

- Chunk metadata should preserve document, page, section, table, sheet, cell, row, region, parser, and confidence information.
- Multimodal inspection should be reserved for difficult pages, not used as the default reader.
- Final outputs should pass verification before export.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial document pipeline diagram created. |
| 2026-06-29 | Updated pipeline for folder manifests, MarkItDown, Docling, native spreadsheet parsing, EmbeddingGemma, turbovec, summary trees, and verification. |
