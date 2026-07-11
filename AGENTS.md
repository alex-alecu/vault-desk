# AGENTS.md

Created: 2026-06-29

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

## Future Implementation Rule

When implementation begins, the harness and local orchestration code must be TypeScript running under Node.js.

The implementation should be planned from [docs/TYPESCRIPT_NODE_HARNESS.md](docs/TYPESCRIPT_NODE_HARNESS.md) before any source files are created. Do not start with framework defaults. Start from the product architecture and security boundaries documented here.

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
- [docs/PRODUCT.md](docs/PRODUCT.md) - product thesis, formats, and boundaries.
- [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) - commercial structure.
- [docs/ROADMAP.md](docs/ROADMAP.md) - launch sequence.
- [docs/GLOSSARY.md](docs/GLOSSARY.md) - product language and internal terms.

Architecture:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - four-plane system architecture.
- [docs/MODEL_STRATEGY.md](docs/MODEL_STRATEGY.md) - single-family Gemma model strategy and VRAM profiles.
- [docs/PERFORMANCE_AND_CONTEXT.md](docs/PERFORMANCE_AND_CONTEXT.md) - Local 12 and Local 16 performance, context, compaction, and benchmark specification.
- [docs/DOCUMENT_ENGINE.md](docs/DOCUMENT_ENGINE.md) - huge document and folder-scale document processing architecture.
- [docs/RETRIEVAL_AND_VERIFICATION.md](docs/RETRIEVAL_AND_VERIFICATION.md) - EmbeddingGemma, turbovec, retrieval, citations, and verification.
- [docs/TYPESCRIPT_NODE_HARNESS.md](docs/TYPESCRIPT_NODE_HARNESS.md) - future TypeScript/Node implementation direction.
- [docs/IMPLEMENTATION_QUALITY_BAR.md](docs/IMPLEMENTATION_QUALITY_BAR.md) - future minimal-code, minimal-test, and clean-code constraints.
- [docs/HARDWARE.md](docs/HARDWARE.md) - supported hardware and runtime strategy.
- [docs/SECURITY.md](docs/SECURITY.md) - privacy, policy, audit, and sandboxing model.
- [docs/OPEN_SOURCE_BOUNDARY.md](docs/OPEN_SOURCE_BOUNDARY.md) - community and proprietary boundary.

Workflows:

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

Strategy:

- [docs/strategy/PARTNERSHIPS.md](docs/strategy/PARTNERSHIPS.md)

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
- One primary model family for generation and retrieval profiles unless a future ADR explicitly changes that boundary.
- Customer ownership rather than mandatory rental.

## Architecture Principles To Preserve

- Treat model, document reader, tool loop, and UI as separate subsystems.
- Prefer parsing, OCR, layout extraction, retrieval, and citations before model-only reasoning.
- Keep destructive or consequential actions approval-gated.
- Keep filesystem and network access scoped by policy.
- Make audit records and replayable traces first-class product features.
- Keep the community platform hardware-agnostic.
- Keep business controls modular so the same platform can support desktop and office appliance modes.

## Security Defaults

Future code must assume the model is untrusted for execution decisions.

Models may propose actions. The application validates, authorizes, previews, executes, logs, and rolls back actions through typed tool boundaries. The model must never receive direct shell or unrestricted filesystem access.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial agent instructions created for a documentation-only Vault Desk repository. |
| 2026-06-29 | Added Gemma-family, huge-document, retrieval, and verification docs to the required architecture map. |
| 2026-06-30 | Added Local 12 and Local 16 performance, compaction, edge-AI review, and implementation quality docs to the map. |
| 2026-06-30 | Added explicit Clean Code-derived implementation principles to the agent instructions. |
