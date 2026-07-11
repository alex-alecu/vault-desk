# Vault Desk

Created: 2026-06-29

Vault Desk is a private, local-first AI coworker for individuals and small professional offices that need reliable document work without sending sensitive information to cloud services.

The core thesis is simple:

> The community software is free. Vault Desk sells certainty.

Certainty means validated hardware, installed models, predictable performance, safe local operation, business controls, backups, recovery, and one accountable support provider.

## Repository Status

This repository is documentation-only. It intentionally contains no application code, no package manifest, no generated assets, and no implementation scaffolding.

When implementation begins, the harness and orchestration code should be written in TypeScript running on Node.js. The planned TypeScript/Node direction is documented in [docs/TYPESCRIPT_NODE_HARNESS.md](docs/TYPESCRIPT_NODE_HARNESS.md).

## Product Shape

Vault Desk is one platform delivered in three formats:

1. Vault Desk Community - a free, open-source, local desktop application.
2. Vault Desk Personal Computer - a validated personal desktop, mini-PC, or later laptop with Vault Desk installed and supported.
3. Vault Desk Office - a local network appliance for small professional teams, with user accounts, shared workspaces, policy controls, audit history, backup, and central inference.

The first likely vertical is accounting, followed by legal and medical administration workflows with stricter safety boundaries.

## Architecture Direction

Vault Desk should be built as a modular offline-first system with four planes:

1. Desktop shell
2. Local control plane
3. Inference plane
4. Document plane

The model should not be treated as the document reader. The product should parse and structure documents first, retrieve evidence second, and use local models for reasoning over selected evidence and approved tool calls.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture outline.

## Start Here

- [AGENTS.md](AGENTS.md) - instructions for future coding agents and documentation maintainers.
- [docs/PRODUCT.md](docs/PRODUCT.md) - product goals, boundaries, and principles.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - planned system architecture.
- [docs/MODEL_STRATEGY.md](docs/MODEL_STRATEGY.md) - Gemma 4 12B QAT model strategy for 12 GB and 16 GB local profiles.
- [docs/PERFORMANCE_AND_CONTEXT.md](docs/PERFORMANCE_AND_CONTEXT.md) - performance, active-context, compaction, and benchmark specification.
- [docs/IMPLEMENTATION_QUALITY_BAR.md](docs/IMPLEMENTATION_QUALITY_BAR.md) - future minimal-code, minimal-test, and clean-code constraints.
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - milestone-by-milestone implementation plan with AI-runnable test gates.
- [docs/DOCUMENT_ENGINE.md](docs/DOCUMENT_ENGINE.md) - huge-document, folder, Office, PDF, CSV, and spreadsheet processing architecture.
- [docs/RETRIEVAL_AND_VERIFICATION.md](docs/RETRIEVAL_AND_VERIFICATION.md) - embedding, indexing, citations, verification, and summary architecture.
- [docs/SECURITY.md](docs/SECURITY.md) - privacy, sandboxing, approvals, audit, and remote support principles.
- [docs/HARDWARE.md](docs/HARDWARE.md) - hardware strategy and runtime implications.
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md) - target professional workflows.
- [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) - commercial structure and ownership model.
- [docs/ROADMAP.md](docs/ROADMAP.md) - phased launch plan.
- [docs/OPEN_SOURCE_BOUNDARY.md](docs/OPEN_SOURCE_BOUNDARY.md) - community and business module boundary.
- [docs/strategy/PARTNERSHIPS.md](docs/strategy/PARTNERSHIPS.md) - AMD, NVIDIA, OEM, and reseller partnership thesis.
- [docs/RESEARCH_SOURCES.md](docs/RESEARCH_SOURCES.md) - source material and validation notes.

## How Vault Desk Compares To Existing Solutions

Verified against live sources on 2026-07-11. Full research with source links: [docs/research/competitive-landscape.md](docs/research/competitive-landscape.md).

| Capability | AnythingLLM | Open WebUI + Ollama | LM Studio | Jan | GPT4All | Msty | Openwork | Vault Desk (planned) |
|---|---|---|---|---|---|---|---|---|
| Local and offline document chat | Yes | Yes (Docker) | Limited (5 files / 30 MB) | Yes (~200 docs) | Yes (dormant since early 2025) | Yes | No (agent app, not documents) | Yes, folder scale |
| OCR for scanned documents | Basic, buggy | Extra containers required | No | No | No | No | No | Built in, VLM-based |
| Citations | Page-numbered chunks | Reference links | Minimal | No page numbers | Snippets | Weak | No | Page/region anchors plus claim verification |
| Answer verification beyond citations | No | No | No | No | No | No | No | Yes: claim checks, recalculation, contradiction search |
| Approval-gated, previewable, reversible actions | No | No | No | Inline tool approval only | No | Sandboxed execution only | Allow/deny prompts only | Yes: preview, approval, rollback as one loop |
| Audit trail and replayable traces | Undocumented | Enterprise logging only | No | No | No | No | Basic action logs | Yes, first-class |
| Hardware-aware defaults, no model configuration | No (user picks everything) | No | Fit checks, user still picks | No | Curated list | No | No | Yes: certified Local 12 / Local 16 profiles, zero model choices |
| Telemetry | On by default | Self-hosted | None claimed (closed) | Zero, verifiable | Opt-in | Zero claimed (closed) | Unstated | None for customer documents, ever |
| Vertical workflows (accounting, legal, medical admin) | No | No | No | No | No | No | No | Yes, workflow packs |
| Small-office appliance with governance | No | No | No | No | No | No | No | Yes, Vault Desk Office |

What this table means: local chat-with-documents with citations is now a commodity, and Vault Desk does not compete on it. The unclaimed space Vault Desk targets is the combination of verification beyond citations, approval-gated reversible actions, first-class audit, folder-scale OCR that works out of the box, invisible hardware-aware defaults, and professional vertical workflows — none of which any incumbent ships today, individually or together.

## Non-Goals

Vault Desk should not begin as:

- A generic local model launcher.
- A configurable RAG sandbox for technical users.
- A hosted AI SaaS product.
- A document upload product that silently falls back to cloud processing.
- A hardware manufacturing company.
- A product that exposes model, embedding, vector database, context window, or quantization decisions to ordinary office users.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial documentation-only repository created from supplied concept and research material. |
| 2026-06-29 | Added current Gemma-family, huge-document, retrieval, and verification architecture pointers. |
| 2026-06-30 | Added Local 12 and Local 16 Gemma 4 12B QAT performance, context, and implementation quality specs. |
| 2026-07-11 | Added verified competitor comparison table (AnythingLLM, Open WebUI, LM Studio, Jan, GPT4All, Msty, Openwork) after live-web revalidation of the documentation set. |
| 2026-07-11 | Added the M0-M11 implementation plan pointer (docs/IMPLEMENTATION_PLAN.md). |
