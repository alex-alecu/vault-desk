# Accounting Workflow

Created: 2026-07-10

Accounting is the recommended first vertical for Vault Desk.

## Why Accounting First

Accounting firms and bookkeeping teams have:

- High document volume.
- Repetitive workflows.
- Sensitive financial information.
- Structured expected outputs.
- Clear time-saving potential.
- Measurable ROI.
- Lower regulatory exposure than medical decision support.

## Candidate MVP Workflow

Invoice folder review:

1. User selects a folder of invoices and a reference spreadsheet.
2. Vault Desk ingests documents and extracts supplier, invoice number, dates, totals, tax, and line items.
3. Vault Desk identifies duplicates, missing fields, and inconsistent totals.
4. Vault Desk compares extracted values to spreadsheet rows.
5. Vault Desk creates an exception queue with citations.
6. User reviews and approves an export.
7. Vault Desk produces a structured output file.

## Required Capabilities

- PDF and image ingestion.
- OCR fallback.
- Table extraction.
- Spreadsheet reading.
- Duplicate detection.
- Cross-document comparison.
- Citation to page, table, and line item.
- Approval-gated export.
- Audit record.

## Evaluation Targets

- Field extraction accuracy.
- Duplicate detection precision.
- Citation precision.
- Export correctness.
- False-positive and false-negative exception rate.
- Time saved compared with manual review.

## Non-Goals For MVP

- Direct posting into accounting systems without approval.
- Autonomous bank reconciliation.
- Tax advice.
- Compliance filings.
- Unreviewed file modification.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial accounting workflow document created. |
