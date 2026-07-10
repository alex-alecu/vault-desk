# Document Tools Research 2026

Created: 2026-06-29

This document captures the current document tooling baseline for Vault Desk. These tools should be benchmarked on actual accounting, legal, spreadsheet, and scanned document corpora before implementation.

## Sources Reviewed

- [Microsoft MarkItDown](https://github.com/microsoft/markitdown)
- [Docling](https://github.com/docling-project/docling)
- [Unstructured partitioning docs](https://docs.unstructured.io/open-source/core-functionality/partitioning)
- [turbovec](https://github.com/RyanCodrai/turbovec)

## Recommended Tool Roles

The Local 12 and Local 16 performance constraint makes parser routing more important than adding model context. Vault Desk should preserve source structure, cache deterministic extraction, and send only selected evidence to Gemma 4 12B QAT.

### MarkItDown

Use MarkItDown as a broad first-pass converter for common user files into LLM-friendly Markdown-oriented content.

It is attractive for Vault Desk because professional users will drag mixed folders into the product, and the first pass must support many formats without manual setup.

Do not rely on it as the sole parser for tables, spreadsheets, legal formatting, or high-value citations.

Security note: MarkItDown runs with the privileges of its process. Vault Desk should run it inside the document worker sandbox and call the narrowest conversion path possible for the current file.

### Docling

Use Docling for layout-aware conversion and high-value PDF processing, especially when table structure, reading order, figures, and page anchors matter.

Docling should be part of the certified path for legal and accounting documents with complex layouts.

The current Docling README highlights multi-format parsing, advanced PDF understanding, table structure, a unified document representation, local execution, OCR support, and Windows/macOS/Linux support. That makes it a stronger high-fidelity path than Markdown-only conversion for complex PDFs.

### Unstructured

Use Unstructured as a fallback and comparison parser for mixed document sets and difficult partitioning cases.

It is useful for evaluating parser disagreement and routing documents that fail the primary path.

Its partitioning docs expose file-type routing and strategies such as fast, hi_res, and ocr_only for PDFs and images. Vault Desk should use those strategy differences to create warnings when a document requires slow or low-confidence extraction.

### Native Spreadsheet Parsing

Use structured spreadsheet parsing for XLSX, XLS, and CSV. Markdown conversion is not enough.

Vault Desk needs formulas, sheets, cell coordinates, row windows, typed values, display values, CSV dialects, and deterministic calculations.

### turbovec

Evaluate turbovec as a memory-efficient vector search acceleration layer for local document corpora.

It should be tested as an acceleration layer around EmbeddingGemma vectors, not as the only evidence store.

The turbovec README describes a Rust vector index with Python bindings, online ingest, local operation, search-time filters, and compressed vector memory savings. That is a good match for permission-scoped local RAG, but Vault Desk still needs recall benchmarks before choosing it as the default index.

## Parser Agreement Strategy

For high-value documents, Vault Desk should compare parser outputs:

- Native text extraction versus layout parser.
- Layout parser versus OCR.
- Spreadsheet structured parse versus Markdown conversion.
- Dense retrieval versus lexical search.

Disagreement should create warnings and review queues rather than being hidden.

## Minimal First Benchmark

The first benchmark should compare the smallest useful parser set:

- MarkItDown first-pass conversion.
- Docling high-fidelity PDF and layout conversion.
- Native spreadsheet and CSV parsing.
- OCR only for pages that need it.
- Unstructured only as fallback or parser-disagreement comparison.

Do not benchmark a custom parser or custom OCR path unless the maintained tools fail a required workflow.

## Benchmark Corpus Needed

Create private benchmark folders containing:

- 100-page PDFs.
- Scanned invoices.
- Mixed digital and scanned PDFs.
- Multi-sheet XLSX files with formulas.
- Large CSV exports.
- DOCX contracts.
- DOCX files with tables.
- Files with images and low-quality scans.
- Romanian and EU accounting documents.
- Duplicate and near-duplicate invoices.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial document tooling research note created. |
| 2026-06-29 | Added concrete MarkItDown security, Docling, Unstructured, and turbovec research implications. |
| 2026-06-30 | Added Local 12 and Local 16 parser-routing and minimal benchmark guidance. |
