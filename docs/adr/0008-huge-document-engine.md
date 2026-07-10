# ADR 0008: Huge Document Engine

Created: 2026-06-29

Status: Proposed

## Context

Vault Desk must work on folders with tens of large PDFs, spreadsheets, CSVs, Word documents, scanned files, and mixed professional records.

Model-only reading is not reliable or efficient enough for this workload, especially on 16 GB systems.

## Decision

Vault Desk will use a deterministic document engine before model reasoning.

The engine will:

- Inventory folders.
- Hash files.
- Create resumable manifests.
- Route files through layered parsers.
- Normalize to canonical document objects.
- Preserve source anchors.
- Build summary trees.
- Build lexical and dense indexes.
- Assemble evidence packs.
- Verify claims, citations, and calculations before export.

MarkItDown, Docling, Unstructured, native spreadsheet parsing, OCR, EmbeddingGemma, and optional turbovec acceleration are candidate tools for the first validated architecture.

## Consequences

Positive:

- Huge documents become manageable on constrained local hardware.
- Citations and audit trails become first-class.
- Summary and retrieval caches reduce repeated work.
- Parser disagreement can be surfaced instead of hidden.

Negative:

- More architecture and implementation complexity.
- Requires document-specific evaluation corpora.
- Parser packaging and cross-platform behavior must be validated.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial ADR created. |
