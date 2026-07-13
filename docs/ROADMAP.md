# Roadmap

Created: 2026-07-10

This roadmap reflects the supplied concept material and should be treated as a planning baseline, not a committed release plan.

## Phase 0: Documentation And Validation

Current phase.

Goals:

- Capture product thesis.
- Capture architecture.
- Define open-source and business boundaries.
- Identify first vertical workflows.
- Define future TypeScript/Node harness direction.
- Define Local 12 and Local 16 Gemma 4 12B QAT performance targets.
- Define long-session context compaction requirements.
- Preserve dated concept history.
- Define the offline Knowledge Bundle boundary, trust model, rights records, and domain-composition rules.
- Select Tauri v2 as the desktop shell and validate its sidecar, capability, packaging, and platform-webview boundaries.
- Define deterministic document operations and the isolated code-interpreter fallback.
- List open validation questions.

No application code should be written in this phase.

## Phase 1: Community Desktop MVP

Goals:

- Open-source desktop application.
- One supported model/runtime stack.
- Hardware compatibility test.
- Strong local document reading.
- Deterministic folder-wide spreadsheet search, including exact cell anchors.
- Safe folder access.
- Single-user offline workflow.
- Evidence-linked answers.
- Reliable context compaction during long document sessions.
- Export action with approval.
- Private pilot users.
- Cross-platform packaged-build, crash-recovery, and offline first-launch validation.
- Tauri desktop layout with a full-window session/model header, chats and folders in the sidebar below it, and a bottom composer in the conversation pane.
- Bounded no-NIC code interpreter for approved long-tail transformations after deterministic tools are proven.
- One small, signed accounting Knowledge Bundle prototype with local index rebuild, exact-version citations, offline-media import, and rollback validation.

Recommended first workflow:

- Offline document QA, extraction, comparison, and export for accounting-style document sets.
- The first product acceptance slice is invoice review against a reference spreadsheet, producing a cited exception queue and approval-gated structured export.

## Phase 2: Office Appliance Pilot

Goals:

- One Vault Desk Office appliance.
- Business control layer.
- Three-to-five-user deployment.
- Accounting workflow pack.
- Backup.
- Audit.
- Permissions.
- Certified hardware list.
- Paid support.

## Phase 3: Personal System Offering

Goals:

- Personal mini-PC or workstation.
- OEM or system-builder partnership.
- Additional accounting integrations.
- Legal workflow pack.
- Reseller deployment model.

## Phase 4: Broader Certified Hardware

Goals:

- Certified laptops.
- Larger office appliances.
- Multi-node operation.
- Enterprise identity.
- Fleet management.
- Additional country-specific workflow packs.

## Open Decisions

- Open-source license.
- Exact community and business module boundary.
- Whether business software is purchased separately or bundled with hardware.
- Support pricing and SLA levels.
- First runtime adapter to certify for Local 12 and Local 16.
- Final certified active context for Local 12 and Local 16.
- AMD versus NVIDIA flagship configuration.
- Office-box user and concurrency targets.
- NAS storage versus appliance storage.
- Backup and encryption design.
- Remote-support mechanism.
- Initial accounting integrations.
- EU and country-specific compliance requirements.
- Reseller margin and warranty structure.
- Initial launch geography.
- First Knowledge Bundle jurisdiction, source-rights strategy, publisher trust roots, and update cadence.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial roadmap created from supplied launch sequence and open decisions. |
| 2026-07-10 | Added Local 12 and Local 16 performance targets and long-session compaction to validation and MVP goals. |
| 2026-07-11 | Clarified the accounting product slice and added cross-platform package, recovery, and offline validation to the desktop MVP. |
| 2026-07-12 | Added the Knowledge Bundle design work and a narrow signed accounting-library prototype to the roadmap. |
| 2026-07-13 | Selected Tauri v2 and added deterministic document operations plus an isolated code-interpreter fallback to the MVP path. |
