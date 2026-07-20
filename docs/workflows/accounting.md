# Accounting Workflow

Created: 2026-07-10

Accounting is a possible post-V1 workflow pack. It is not part of the desktop V1 gate.

## Why Accounting Is A Candidate

Accounting firms and bookkeeping teams have:

- High document volume.
- Repetitive workflows.
- Sensitive financial information.
- Structured expected outputs.
- Clear time-saving potential.
- Measurable ROI.
- Lower regulatory exposure than medical decision support.

## Candidate Follow-up Workflow

Records reconciliation:

1. User selects a folder of transaction records and a reference spreadsheet.
2. Vault Desk extracts counterparties, record identifiers, dates, totals, tax, and line items.
3. Vault Desk identifies duplicate records, missing fields, and inconsistent totals.
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
- Held-out accuracy across currencies, locales, date formats, layouts, scanned pages, revisions, contradictions, and missing fields.
- Blinded human review of exception severity and source traceability before pilot readiness.

Development fixtures and held-out acceptance documents must use different templates and values. Prompt, retrieval, and threshold tuning must not use the held-out results as development fixtures.

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
| 2026-07-11 | Added held-out variation and blinded human-review requirements for pilot readiness. |
| 2026-07-20 | Removed the pre-V1 review slice and retained generic reconciliation only as a post-V1 candidate. |
