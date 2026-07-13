# Workflows

Created: 2026-07-10

Vault Desk should sell professional outcomes, not AI configuration.

The workflow layer is where the product becomes more than local chat with files.

## Workflow Principles

- Users ask for work outcomes.
- The system chooses the document strategy.
- Supported operations use deterministic typed tools before model reasoning or generated code.
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
- Availability of a verified deterministic operation.

Generated code is selected only when no supported typed operation can express the requested transformation. It runs in a disposable no-NIC microVM and its result remains subject to verification and approval.

## First Workflow Family

The first MVP workflow family should be single-user offline document QA, extraction, comparison, and export.

The first product acceptance slice is invoice review against a reference spreadsheet. Cited folder Q&A is an earlier technical slice, not sufficient by itself to claim the workflow family or Community Desktop MVP.

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
- Search every sheet and cell across a folder of workbooks for names or transaction text without model-generated code.

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
- A development corpus and a separate held-out acceptance corpus.
- False-positive and false-negative rates for exception workflows.
- Prompt-injection and malformed-document cases.
- Assertions that supported operations do not invoke the code interpreter.
- Adversarial and incorrect generated-code cases for workflows that legitimately use the fallback.
- Confidence intervals and corpus-size reporting for measured rates.

## Folder Report Workflow

A core cross-vertical workflow should be:

1. User selects a folder with PDFs, Office files, spreadsheets, CSVs, and images.
2. Vault Desk creates a file manifest and identifies duplicates, unsupported files, password-protected files, and extraction warnings.
3. Vault Desk builds canonical document views, deterministic query indexes, and document, table, sheet, and folder summaries.
4. User asks for a report, search, extraction, comparison, or exception queue.
5. Vault Desk uses typed deterministic tools for supported operations and retrieval plus model reasoning where synthesis is required.
6. Only an unsupported transformation may be routed to the bounded code interpreter.
7. Vault Desk verifies the result and shows citations, warnings, generated-code provenance when applicable, and unsupported claims before export.
8. User approves export or sends uncertain items to review.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial workflow document created from supplied product and market material. |
| 2026-07-10 | Added folder-scale workflow, summary tree, verification, and evaluation requirements. |
| 2026-07-11 | Distinguished the cited-Q&A technical slice from the invoice-review product slice and strengthened held-out evaluation requirements. |
| 2026-07-13 | Added deterministic-operation-first workflow routing and the bounded generated-code fallback. |
