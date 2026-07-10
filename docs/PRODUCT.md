# Product

Created: 2026-06-29

Vault Desk is a private AI coworker for document-heavy professional work. It should help individuals and small offices complete useful work while keeping sensitive documents local by default.

## Core Thesis

The community software is free. Vault Desk sells certainty.

Certainty includes:

- Correctly selected hardware.
- Installed and validated software.
- Curated local models.
- Predictable performance.
- Secure local operation.
- Safe document processing.
- Business controls for several employees.
- Backup, recovery, and accountable support.

Vault Desk is not primarily a model launcher, a RAG configuration surface, or a technical agent playground.

## Problem

Local AI software exists, but deploying it still forces users to decide:

- Which computer or GPU to buy.
- Which model fits available memory.
- Which runtime to use.
- How much context to configure.
- Whether a task needs OCR, retrieval, full-document reading, summarization, spreadsheet processing, or image understanding.
- How to expose the system safely to employees.
- How to manage backups, updates, permissions, and failures.

These decisions are acceptable for developers and enthusiasts. They are not acceptable for accountants, lawyers, doctors, consultants, or small-business employees who need work completed.

## Product Formats

### Vault Desk Community

A free and open-source desktop application for people using their own hardware.

Expected characteristics:

- Free for personal and commercial use.
- Local and offline by default.
- Windows and macOS initially.
- Supported Apple, AMD, and NVIDIA hardware paths.
- Core document reading and agent functionality.
- No artificial document, message, or usage limits.
- Community documentation and support.
- Optional paid professional support.
- Hardware compatibility test before installation.
- Clear hardware classifications: Certified, Compatible, and Experimental.

The community version must be genuinely useful. It should not be a restricted demo.

### Vault Desk Personal Computer

A normal desktop, mini-PC, or later laptop that can replace a customer's existing computer while running Vault Desk well.

It should:

- Run ordinary Windows applications.
- Include Vault Desk and validated models.
- Arrive encrypted, configured, tested, and recoverable.
- Provide defined performance guarantees.
- Require no model or runtime selection.
- Include onboarding and support.

Initial hardware should focus on desktops and mini-PCs. Laptops add warranty, keyboard layout, battery, thermal, and component variation complexity.

### Vault Desk Office

A dedicated local appliance for small companies. Employees keep using existing Windows or Mac computers and access Vault Desk through a browser or lightweight client.

Expected capabilities:

- Employee accounts.
- Shared and private workspaces.
- Central local inference.
- Role-based document access.
- Permission-aware retrieval.
- Shared organizational knowledge.
- Approval rules for agent actions.
- Audit history.
- Central backup and recovery.
- NAS and shared-folder connections.
- Controlled model and workflow updates.
- No mandatory outbound internet connection.
- Explicitly authorized temporary remote support.
- Defined concurrent-user and workload guarantees.

This is likely the strongest commercial product because it solves a shared office problem without forcing every employee to replace their computer.

## Product Principles

### No AI Infrastructure Vocabulary

Ordinary users should not need to encounter:

- RAG.
- Embeddings.
- Vector databases.
- Quantization.
- Context windows.
- Model providers.
- Tool calling.
- Similarity thresholds.

The system should automatically decide which strategy a task needs.

### Outcome-First Interaction

Users should ask for outcomes:

- Review these contracts and prepare a risk report.
- Compare these invoices with this spreadsheet.
- Find all unsigned documents.
- Prepare a cited summary of this folder.
- Extract all invoice items and create an Excel file.

### Safe Actions

Every destructive or consequential action should support:

- Preview.
- Diff.
- Explicit approval.
- Version history.
- Rollback.
- Source traceability.

### Verifiable Privacy

Vault Desk should provide stronger guarantees than "local by default":

- No mandatory cloud dependency.
- No silent cloud fallback.
- Network-isolated inference and agent workers where practical.
- No customer-document telemetry.
- Clear network activity controls.
- Auditable external connections.
- Offline update packages for controlled environments.

## Initial Customer Segments

Accounting firms are the strongest first vertical because they have high document volume, sensitive financial data, repeated workflows, measurable ROI, and lower regulatory risk than medical decision support.

Legal practices are a strong second vertical because document comparison, citation, redaction, and formatting-sensitive edits are high-value workflows.

Medical administration is a later target. Initial medical scope should avoid autonomous diagnosis, treatment recommendations, and triage.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial product document created from supplied concept material. |
