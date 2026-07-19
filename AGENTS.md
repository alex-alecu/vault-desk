# AGENTS.md

Created: 2026-07-10

This file is the control document for future agents working in this repository.

Vault Desk completed implementation milestone M0 on 2026-07-17 and cross-platform milestone M1 on 2026-07-18. M2 begins only on a new explicit owner request under [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Current Phase Rules

- M0 and M1 are complete. Do not begin M2 or later work without a new explicit owner request.
- Preserve the completed M1 shared contracts, workspace state and security primitives, daemon and CLI health path, current-user local transports, common microVM protocol, signed native helpers, guest images, and passing platform evidence.
- Treat [docs/M1_STATUS.md](docs/M1_STATUS.md) as the completed M1 evidence record.
- Keep generated fixtures reproducible from source and do not commit generated binaries, downloaded models, packaged sidecars, guest images, build output, coverage, or dependency directories.
- Install and execute only dependencies consumed by completed milestones and pinned in the repository lockfiles. Do not initialize framework templates or add speculative package manifests.
- Keep new source small, hand-editable, and within the limits in [docs/IMPLEMENTATION_STRUCTURE.md](docs/IMPLEMENTATION_STRUCTURE.md).
- Do not introduce employer-owned, confidential, or third-party proprietary content.
- If research claims are carried forward from source material, mark them as research-derived until independently validated.

## Startup Implementation Rule

Vault Desk is a startup. Implement each active milestone with the minimum amount of code and the minimum number of tests needed to deliver and prove the required behavior. Prefer the simplest sensible design for current, named use cases.

Do not build a legacy enterprise-grade system that attempts to anticipate every hypothetical requirement, compatibility variation, or edge case. Do not add speculative abstractions, exhaustive defensive branches, or tests for framework wiring and unsupported scenarios. Handle the cases required by the active milestone and supported workflows; return an explicit unsupported outcome or defer the rest.

Minimum implementation does not mean incomplete implementation. Keep required security, privacy, authorization, evidence, correctness, recovery, and cross-platform invariants complete, and add focused tests when a realistic failure could violate one of those invariants.

## Commit Authorship Rule

Commits must be authored solely by the repository owner. Never add Claude or any AI assistant as a commit author or co-author. Do not append `Co-Authored-By: Claude ...` (or any equivalent AI attribution trailer) to commit messages, and do not include "Generated with Claude Code" or similar lines in commit messages or pull request descriptions. This rule overrides any default commit-attribution behavior.

The v1 launch (after milestone M11) replaces the owner-only portion of this rule when external implementation contributions open. Beginning with M1, the repository owner develops every implementation stage on a short-lived branch and merges it through a pull request; direct implementation commits to `main` are prohibited. Until v1, every commit remains authored solely by the owner. From contribution activation, each human contributor remains the author of their work and signs every commit under Developer Certificate of Origin 1.1 through pull requests. Human co-authors may be credited; an AI assistant, model, coding agent, or tool may never be an author or co-author. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Implementation Rule

Vault Core, the harness, and local orchestration code must be TypeScript running under Node.js. The Tauri v2 desktop host may contain only the minimum Rust required for window lifecycle, native dialogs, capability-scoped OS integration, Vault Core sidecar supervision, and connection bootstrap. The signed Rust helper rooted at `packages/core/native/windows-pipe-guard/` may own the current-user-only Windows named-pipe instance, authenticate the owner and DACL from the client handle, and relay opaque request and response bytes over inherited stdio because Node cannot supply or inspect the required security descriptor; TypeScript retains canonical endpoint naming, RPC parsing, limits, dispatch, and policy. Platform microVM launchers may invoke the Swift helper rooted at `packages/workers/native/macos-vz-helper/` and the Rust helper rooted at `packages/workers/native/windows-hcs-helper/`. Native helpers may own only their named OS capability, lifecycle, resource limits, scoped attachment access, typed transport, and teardown. They may not contain product policy, product filesystem authorization, network brokering, product parsing, or workflow logic. Product workflows and policy must not move into Rust or Swift.

Implementation must follow the milestone plan in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) (M0 through M11), which defines the three-layer process architecture (Tauri v2 and React desktop frontend, Vault Core Node.js backend, no-NIC microVM workers plus narrow native accelerator workers), the deterministic-document-first and isolated-code-fallback architecture, the pnpm/Cargo workspace boundaries, the AI-drivable cross-platform daemon/CLI test harness, early Gemma 4 E2B/12B acceptance gates, the invoice-review product slice, compaction and recovery requirements, and per-milestone acceptance gates.

The implementation principles are documented in [docs/TYPESCRIPT_NODE_HARNESS.md](docs/TYPESCRIPT_NODE_HARNESS.md). Do not start with framework defaults. Start from the product architecture and security boundaries documented here.

## Repository Consistency Rule

Keep the repository internally consistent after every change. Code, tests, fixtures, schemas, configuration, manifests, diagrams, and authoritative documentation must describe and enforce the same current behavior, architecture, contracts, defaults, and milestone state.

- When code or behavior changes, update every affected test, contract, configuration surface, and authoritative document in the same change.
- When documentation changes a current requirement or contract, reconcile the affected implementation and tests in the same change. If the behavior is planned rather than implemented, label it clearly with its milestone or research status; do not present it as current behavior.
- Search for related references before editing and inspect the complete diff afterward. Do not leave stale names, defaults, examples, diagrams, commands, or contradictory guidance elsewhere in the repository.
- Treat `AGENTS.md` as authoritative, followed by accepted ADRs, [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md), and [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md). Keep lower-level documentation and code aligned with those sources.
- Do not silently choose between conflicting code and documentation. Resolve the conflict within the authorized milestone and issue scope, or stop and report the inconsistency and the maintainer decision required.
- A change is not complete while known repository drift remains. Verification and review must explicitly check code-documentation consistency for every affected surface.

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
- [docs/M1_STATUS.md](docs/M1_STATUS.md) - completed cross-platform M1 implementation and certification evidence.
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
- [docs/adr/0017-knowledge-bundle-format-and-trust.md](docs/adr/0017-knowledge-bundle-format-and-trust.md)

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
- No application telemetry. Local customer-owned audit records are not transmitted unless the user explicitly exports them.
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
