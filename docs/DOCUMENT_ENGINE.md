# Document Engine

Created: 2026-06-29

Vault Desk must work on folders containing tens of huge documents, including PDFs, Word documents, Excel workbooks, CSVs, images, emails, and mixed client folders.

The document engine should be deterministic, resumable, evidence-preserving, and independent from the model runtime.

## Core Principle

Do not ask the model to read the folder.

The system should build a durable document corpus first, then ask Gemma-family models to reason over selected, cited evidence.

This is especially important for Local 12 and Local 16. Gemma 4 12B QAT should receive evidence packs, not raw folders.

## Folder Job Lifecycle

1. Inventory files.
2. Hash files and detect duplicates.
3. Create a document-set manifest.
4. Detect file types and container structure.
5. Route files through the best extraction path.
6. Normalize outputs into canonical document objects.
7. Record parser, confidence, page, table, sheet, row, cell, and region metadata.
8. Build summaries and indexes.
9. Run task-specific retrieval.
10. Generate structured outputs.
11. Verify claims, calculations, and citations.
12. Export only after approval.

Every job should be resumable after crash, restart, or low-memory failure.

## Canonical Document Object

Every ingested document should normalize into a representation with:

- Stable document ID.
- Original file path.
- Content hash.
- File version.
- Parser name and version.
- Extraction timestamp.
- Pages.
- Sections.
- Paragraphs.
- Tables.
- Cells.
- Figures.
- Images.
- OCR regions.
- Spreadsheet sheets.
- Spreadsheet formulas.
- CSV row and column coordinates.
- Source anchors.
- Confidence scores.
- Warnings.

The canonical object is the source for summaries, embeddings, citations, exports, and verification.

## Tooling Strategy

Use a layered parser strategy rather than one universal converter.

| Tool | Recommended role | Notes |
|---|---|---|
| Microsoft MarkItDown | Fast conversion of common Office, PDF, HTML, image, audio, and archive inputs into Markdown-oriented text | Good first-pass and LLM-friendly conversion layer |
| Docling | Layout-aware PDF and document conversion, especially tables, reading order, and complex page structure | Preferred for high-value or complex PDFs |
| Unstructured | Partition fallback and strategy-based extraction for mixed document sets | Useful as a fallback and evaluation comparison path |
| Native spreadsheet parsers | Excel formulas, sheets, cell coordinates, CSV dialects, typed rows | Required because Markdown conversion alone loses spreadsheet semantics |
| OCR engine | Scanned pages, image-only PDFs, low-confidence text extraction | Use only when native extraction is missing or low-confidence |
| Gemma 4 multimodal inspection | Ambiguous page regions, charts, forms, handwriting, or extraction conflicts | Escalation path, not primary parsing |

The first implementation should treat MarkItDown as a broad ingestion adapter, not the entire document engine.

## Minimal First Implementation

The first implementation should include the smallest parser surface that can prove the accounting-style document workflow:

- File inventory, hashing, and manifest creation.
- Native text and metadata extraction for common text-like files.
- MarkItDown adapter for broad first-pass conversion.
- Docling adapter for high-value PDFs and layout-sensitive files.
- Native spreadsheet and CSV adapter for formulas, sheets, cells, typed values, and row windows.
- OCR adapter only when native or layout extraction is missing or low-confidence.
- Gemma 4 multimodal inspection only for unresolved page regions.

Do not add a custom parser, custom OCR engine, or custom document database in the first implementation.

## Format-Specific Strategy

### PDF

PDF processing should classify pages:

- Digital text page.
- Scanned page.
- Mixed text and image page.
- Table-heavy page.
- Form page.
- Low-confidence extraction page.

Use native extraction first, layout-aware parsing second, OCR fallback third, and Gemma 4 multimodal inspection only for unresolved page regions.

### DOCX And Office Documents

Preserve:

- Headings.
- Paragraph order.
- Tables.
- Footnotes.
- Comments where accessible.
- Tracked-change state where accessible.
- Embedded images.
- Source anchors.

Generated outputs should never overwrite the source document without preview, approval, and rollback.

### XLSX And CSV

Spreadsheets require structured parsing.

Preserve:

- Workbook.
- Sheet.
- Cell coordinate.
- Formula.
- Display value.
- Typed value.
- Row and column headers.
- Merged cells.
- Tables and named ranges where available.
- CSV dialect.

Model summaries can describe spreadsheet content, but calculations and reconciliation must be done by deterministic tools.

### Huge Documents

Huge documents should be processed as streams or shards:

- Page groups.
- Section groups.
- Sheet chunks.
- Row windows.
- Table regions.
- Attachment groups.

The system should build page and section summaries first, then document summaries, then folder summaries. Large tasks should use the summary tree and targeted retrieval instead of repeatedly rereading raw documents.

The document engine should be able to continue work after model context compaction because canonical document objects, summaries, evidence chunks, warnings, and source anchors live outside the prompt.

See [PERFORMANCE_AND_CONTEXT.md](PERFORMANCE_AND_CONTEXT.md).

## Summary Tree

The summary tree should contain:

- Page summaries.
- Section summaries.
- Table summaries.
- Sheet summaries.
- Document summaries.
- Folder summaries.
- Task-specific summaries.

Every summary node must store:

- Source anchors.
- Generation model profile.
- Prompt version.
- Evidence chunk IDs.
- Confidence or warning flags.
- Verification result.

Summaries are cacheable but must be invalidated when source files change.

## Error Handling

Document processing should surface:

- Unsupported file type.
- Corrupt file.
- Password-protected file.
- OCR failure.
- Spreadsheet formula parse failure.
- Low-confidence table extraction.
- Conflicting parser outputs.
- Missing pages.
- Excessive size.
- Permission denial.

Errors should not silently disappear from final reports.

## Performance Records

Every folder job should record enough timing and memory data to support profile certification:

- Inventory time.
- Parser route per file.
- Parser runtime per file.
- OCR runtime per page where used.
- Embedding runtime per chunk batch.
- Summary runtime per node.
- Peak CPU RAM during document work.
- Peak VRAM if any parser, OCR, embedding, or multimodal step uses GPU.
- Cache hits and misses.
- Resume point after cancellation or failure.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial huge-document and folder-scale document engine architecture created. |
| 2026-06-30 | Added Local 12 and Local 16 performance implications, minimal parser surface, and folder-job performance records. |
