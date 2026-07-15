# AGENTS.md

Created: 2026-07-10

This file is the control document for future agents working in this repository.

Vault Desk is currently in a documentation-only phase. Do not create application code, package manifests, build configuration, generated assets, or implementation scaffolding unless a future user request explicitly changes that phase.

## Current Phase Rules

- Write Markdown documentation only.
- Keep every new file source-readable and hand-editable.
- Do not add TypeScript, JavaScript, Rust, Python, shell scripts, JSON manifests, lockfiles, generated diagrams, or binary assets.
- Do not initialize package managers or framework templates.
- Do not run installers or dependency managers.
- Do not introduce employer-owned, confidential, or third-party proprietary content.
- If research claims are carried forward from source material, mark them as research-derived until independently validated.

## Commit Authorship Rule

Commits must be authored solely by the repository owner. Never add Claude or any AI assistant as a commit author or co-author. Do not append `Co-Authored-By: Claude ...` (or any equivalent AI attribution trailer) to commit messages, and do not include "Generated with Claude Code" or similar lines in commit messages or pull request descriptions. This rule overrides any default commit-attribution behavior.

M0 replaces the owner-only portion of this rule when implementation contributions open. From that point, each human contributor remains the author of their work and signs every commit under Developer Certificate of Origin 1.1. Human co-authors may be credited; an AI assistant, model, coding agent, or tool may never be an author or co-author. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Future Implementation Rule

When implementation begins, Vault Core, the harness, and local orchestration code must be TypeScript running under Node.js. The Tauri v2 desktop host may contain only the minimum Rust required for window lifecycle, native dialogs, capability-scoped OS integration, Vault Core sidecar supervision, and connection bootstrap. Product workflows and policy must not move into Rust.

Implementation must follow the milestone plan in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) (M0 through M11), which defines the three-layer process architecture (Tauri v2 and React desktop frontend, Vault Core Node.js backend, no-NIC microVM workers plus narrow native accelerator workers), the deterministic-document-first and isolated-code-fallback architecture, the pnpm/Cargo workspace boundaries, the AI-drivable cross-platform daemon/CLI test harness, early Gemma 4 E2B/12B acceptance gates, the invoice-review product slice, compaction and recovery requirements, and per-milestone acceptance gates. Milestone M0 of that plan is the step that formally ends the documentation-only phase and rewrites this file's phase rules.

The implementation principles are documented in [docs/TYPESCRIPT_NODE_HARNESS.md](docs/TYPESCRIPT_NODE_HARNESS.md). Do not start with framework defaults. Start from the product architecture and security boundaries documented here.

## Clean Code Rule

Implementation code follows these Clean Code-derived principles. They are based on the major themes of Clean Code by Robert C. Martin and are project guidance rather than quoted source text.

1. Use intention-revealing names for modules, functions, types, and events.
2. Keep functions small enough to explain one decision or transformation.
3. Keep one level of abstraction per function.
4. Give each module one reason to change.
5. Remove duplication before adding options.
6. Prefer explicit typed boundaries over implicit shared state.
7. Make command functions and query functions distinct.
8. Avoid boolean flag arguments that hide multiple behaviors.
9. Represent errors deliberately and handle them close to the boundary that can recover.
10. Keep comments rare and useful; prefer clearer names and smaller functions.
11. Keep formatting conventional and boring.
12. Keep tests readable as behavior specifications.
13. Test behavior and invariants, not private implementation details.
14. Keep adapters thin around third-party tools.
15. Keep policy decisions separate from model output.
16. Keep data structures stable at persistence and audit boundaries.
17. Avoid speculative generality and unused extension points.
18. Refactor only to reduce current complexity or protect a proven boundary.
19. Make dependencies point inward toward product contracts.
20. Leave the codebase easier to reason about after every change.

## Documentation Map

Primary orientation:

- [README.md](README.md) - top-level project overview.
- [CONTRIBUTING.md](CONTRIBUTING.md) - contribution status, human authorship, DCO, and pull request requirements.
- [docs/PRODUCT.md](docs/PRODUCT.md) - product thesis, formats, and boundaries.
- [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) - commercial structure.
- [docs/ROADMAP.md](docs/ROADMAP.md) - launch sequence.
- [docs/GLOSSARY.md](docs/GLOSSARY.md) - product language and internal terms.

Architecture:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - four-plane system architecture.
- [docs/MODEL_STRATEGY.md](docs/MODEL_STRATEGY.md) - model-agnostic strategy with certified defaults and VRAM profiles.
- [docs/PERFORMANCE_AND_CONTEXT.md](docs/PERFORMANCE_AND_CONTEXT.md) - Local 12 and Local 16 performance, context, compaction, and benchmark specification.
- [docs/DOCUMENT_ENGINE.md](docs/DOCUMENT_ENGINE.md) - huge document and folder-scale document processing architecture.
- [docs/RETRIEVAL_AND_VERIFICATION.md](docs/RETRIEVAL_AND_VERIFICATION.md) - Qwen3-Embedding-0.6B encoding, hybrid indexing, TurboQuant acceleration, retrieval, citations, and verification.
- [docs/KNOWLEDGE_BUNDLES.md](docs/KNOWLEDGE_BUNDLES.md) - passive, signed, domain-scoped offline reference libraries, provenance, storage, retrieval, and updates.
- [docs/DESKTOP_DESIGN.md](docs/DESKTOP_DESIGN.md) - first Tauri desktop layout, folder/session navigation, model presentation, and UI security rules.
- [docs/TYPESCRIPT_NODE_HARNESS.md](docs/TYPESCRIPT_NODE_HARNESS.md) - future TypeScript/Node implementation direction.
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - milestone-by-milestone implementation plan (M0-M11) with AI-runnable test gates.
- [docs/IMPLEMENTATION_STRUCTURE.md](docs/IMPLEMENTATION_STRUCTURE.md) - concrete folder/module blueprint, startup minimal-code working agreement, and milestone-to-folder map.
- [docs/IMPLEMENTATION_QUALITY_BAR.md](docs/IMPLEMENTATION_QUALITY_BAR.md) - future minimal-code, minimal-test, and clean-code constraints.
- [docs/HARDWARE.md](docs/HARDWARE.md) - supported hardware and runtime strategy.
- [docs/SECURITY.md](docs/SECURITY.md) - privacy, policy, audit, and sandboxing model.
- [docs/OPEN_SOURCE_BOUNDARY.md](docs/OPEN_SOURCE_BOUNDARY.md) - community and proprietary boundary.

Workflows:

- [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) - milestone-scoped planning, research, verification, review, and handoff process.
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md) - workflow architecture and priorities.
- [docs/workflows/accounting.md](docs/workflows/accounting.md) - first vertical workflow target.
- [docs/workflows/legal.md](docs/workflows/legal.md) - legal workflow target.
- [docs/workflows/medical-admin.md](docs/workflows/medical-admin.md) - later medical administration target.

Diagrams:

- [docs/diagrams/system-context.md](docs/diagrams/system-context.md)
- [docs/diagrams/desktop-architecture.md](docs/diagrams/desktop-architecture.md)
- [docs/diagrams/office-appliance.md](docs/diagrams/office-appliance.md)
- [docs/diagrams/document-pipeline.md](docs/diagrams/document-pipeline.md)
- [docs/diagrams/security-boundaries.md](docs/diagrams/security-boundaries.md)

Architecture decision records:

- [docs/adr/0001-local-first.md](docs/adr/0001-local-first.md)
- [docs/adr/0002-community-and-business-boundary.md](docs/adr/0002-community-and-business-boundary.md)
- [docs/adr/0003-desktop-and-appliance-architecture.md](docs/adr/0003-desktop-and-appliance-architecture.md)
- [docs/adr/0004-hardware-abstraction.md](docs/adr/0004-hardware-abstraction.md)
- [docs/adr/0005-agent-sandbox.md](docs/adr/0005-agent-sandbox.md)
- [docs/adr/0006-typescript-node-harness.md](docs/adr/0006-typescript-node-harness.md)
- [docs/adr/0007-gemma-family-standard.md](docs/adr/0007-gemma-family-standard.md)
- [docs/adr/0008-huge-document-engine.md](docs/adr/0008-huge-document-engine.md)
- [docs/adr/0009-12-16gb-gemma-context-standard.md](docs/adr/0009-12-16gb-gemma-context-standard.md)
- [docs/adr/0010-electron-and-local-transport.md](docs/adr/0010-electron-and-local-transport.md)
- [docs/adr/0011-workspace-state-and-recovery.md](docs/adr/0011-workspace-state-and-recovery.md)
- [docs/adr/0012-worker-isolation-and-untrusted-documents.md](docs/adr/0012-worker-isolation-and-untrusted-documents.md)
- [docs/adr/0013-first-desktop-runtime.md](docs/adr/0013-first-desktop-runtime.md)
- [docs/adr/0014-tauri-desktop-shell.md](docs/adr/0014-tauri-desktop-shell.md)
- [docs/adr/0015-deterministic-document-tools-and-code-fallback.md](docs/adr/0015-deterministic-document-tools-and-code-fallback.md)
- [docs/adr/0016-model-agnostic-defaults-and-managed-downloads.md](docs/adr/0016-model-agnostic-defaults-and-managed-downloads.md)

Research:

- [docs/RESEARCH_SOURCES.md](docs/RESEARCH_SOURCES.md)
- [docs/research/market-position.md](docs/research/market-position.md)
- [docs/research/competitive-landscape.md](docs/research/competitive-landscape.md)
- [docs/research/local-ai-runtimes.md](docs/research/local-ai-runtimes.md)
- [docs/research/gemma-2026.md](docs/research/gemma-2026.md)
- [docs/research/document-tools-2026.md](docs/research/document-tools-2026.md)
- [docs/research/edge-ai-2026.md](docs/research/edge-ai-2026.md)
- [docs/research/hardware-platforms.md](docs/research/hardware-platforms.md)
- [docs/research/vertical-workflows.md](docs/research/vertical-workflows.md)
- [docs/research/offline-knowledge-bundles-2026.md](docs/research/offline-knowledge-bundles-2026.md)

Strategy:

- [docs/strategy/PARTNERSHIPS.md](docs/strategy/PARTNERSHIPS.md)

## Repository-Local Agent Skills

The optional Markdown skills under [.agents/skills](.agents/skills) package the development workflow for compatible coding agents. They are on-demand helpers for change planning, dependency review, verification, review, and handoff.

These skills do not override this file, accepted ADRs, the active milestone, or user instructions. They cannot broaden permissions, require delegation, install tools, mutate external systems, or move agent workflow behavior into Vault Core or the shipped product.

## Product Principles To Preserve

- Local and offline-first.
- No mandatory cloud dependency.
- No silent cloud fallback.
- No customer-document telemetry.
- No AI infrastructure vocabulary in the ordinary user experience.
- Outcome-first workflows.
- Safe, previewable, reversible actions.
- Evidence-linked answers with citations.
- Hardware-aware defaults, not user-managed model configuration.
- Model-agnostic product contracts with per-model certification: Gemma 4 12B QAT is the default and first certified generation model and Qwen3-Embedding-0.6B the product-managed encoder, per [ADR 0016](docs/adr/0016-model-agnostic-defaults-and-managed-downloads.md). Model installation, when offered, is a managed, catalog-driven, broker-mediated experience — never arbitrary paths, endpoints, or unsigned manifests.
- Customer ownership rather than mandatory rental.

## Architecture Principles To Preserve

- Treat model, document reader, tool loop, and UI as separate subsystems.
- Prefer parsing, OCR, layout extraction, retrieval, and citations before model-only reasoning.
- Implement common document operations as typed deterministic tools; use generated code only as a policy-selected fallback in a disposable no-NIC microVM.
- Keep destructive or consequential actions approval-gated.
- Keep filesystem access scoped through typed, policy-controlled adapters.
- Run hostile document processing and executable tools in a certified no-NIC microVM; do not treat command, URL, domain, address, or protocol matching as network isolation.
- Route approved external connections through a separate typed, policy-controlled, audited broker.
- Make audit records and replayable traces first-class product features.
- Keep the community platform hardware-agnostic.
- Keep business controls modular so the same platform can support desktop and office appliance modes.

## Security Defaults

Future code must assume the model is untrusted for execution decisions.

Models may propose actions. The application validates, authorizes, previews, executes, logs, and rolls back actions through typed tool boundaries. The model must never receive direct shell or unrestricted filesystem access.

The certified hostile-work sandbox is a disposable microVM with no virtual network device and only typed host/guest socket IPC. GPU-backed inference may remain host-native only under the narrower OS-enforced capability boundary in [ADR 0012](docs/adr/0012-worker-isolation-and-untrusted-documents.md).

For revision history and additional detail when needed, see [README.md](README.md#revision-history).
