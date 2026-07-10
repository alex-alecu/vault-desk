# Workflows

Created: 2026-06-29

Vault Desk should sell professional outcomes, not AI configuration.

The workflow layer is where the product becomes more than local chat with files.

## Workflow Principles

- Users ask for work outcomes.
- The system chooses the document strategy.
- Evidence is visible.
- Actions are previewable.
- File changes are reversible.
- Exported outputs are structured and auditable.
- Human approval is required for consequential actions.

## Strategy Selection

The user should not choose between OCR, retrieval, summarization, full-context reading, spreadsheet processing, or image understanding.

The workflow engine should decide based on:

- File type.
- Text extraction confidence.
- Layout complexity.
- Table density.
- Spreadsheet formulas.
- Document count.
- Workspace policy.
- Hardware capability.
- Required output.

## First Workflow Family

The first MVP workflow family should be single-user offline document QA, extraction, comparison, and export.

This is narrower than arbitrary agent autonomy and better aligned with local model constraints.

The architecture must also support folder-scale jobs:

- Tens of huge mixed documents.
- Incremental processing and resumability.
- Page, section, table, sheet, and folder summary trees.
- Evidence packs for each answer or export.
- Verification before user-facing conclusions.
- Human review queues for uncertain extraction or unsupported claims.

## Accounting

Accounting is the strongest first vertical.

Candidate workflows:

- Process folders or inboxes containing invoices.
- Extract supplier, tax, dates, totals, and line items.
- Identify duplicates and inconsistencies.
- Compare invoices against spreadsheets.
- Reconcile invoices, bank exports, and accounting records.
- Generate exception queues.
- Export structured data.
- Search historical files with source citations.

See [workflows/accounting.md](workflows/accounting.md).

## Legal

Legal workflows can follow after the document engine and citations are reliable.

Candidate workflows:

- Compare contracts clause by clause.
- Identify missing dates, signatures, and annexes.
- Generate cited risk summaries.
- Search previous matters with access controls.
- Redact confidential information.
- Draft amendments for approval.
- Preserve Word formatting and tracked changes.

See [workflows/legal.md](workflows/legal.md).

## Medical Administration

Medical administration is a later target and should avoid diagnosis, treatment recommendations, and triage.

Candidate workflows:

- Structure consultation notes.
- Draft letters and summaries for clinician approval.
- Organize incoming records.
- Extract data from forms.
- Search patient documents subject to strict permissions.

See [workflows/medical-admin.md](workflows/medical-admin.md).

## Workflow Evaluation

Every workflow pack should have an evaluation suite:

- Golden input documents.
- Expected extracted fields.
- Expected citations.
- Expected refusal or approval points.
- Expected summary coverage.
- Expected unsupported-claim detection.
- Expected spreadsheet calculation results.
- Latency targets.
- Memory targets.
- Large-folder soak tests.
- Export validation.
- Human review checklist.

## Folder Report Workflow

A core cross-vertical workflow should be:

1. User selects a folder with PDFs, Office files, spreadsheets, CSVs, and images.
2. Vault Desk creates a file manifest and identifies duplicates, unsupported files, password-protected files, and extraction warnings.
3. Vault Desk builds document, table, sheet, and folder summaries.
4. User asks for a report, extraction, comparison, or exception queue.
5. Vault Desk retrieves evidence packs, generates the result, and verifies claims.
6. Vault Desk shows citations, warnings, and unsupported claims before export.
7. User approves export or sends uncertain items to review.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial workflow document created from supplied product and market material. |
| 2026-06-29 | Added folder-scale workflow, summary tree, verification, and evaluation requirements. |
