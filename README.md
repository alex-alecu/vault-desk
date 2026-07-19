# Vault Desk

**Private work should stay private.**

Vault Desk is a local-first AI coworker for people who work with sensitive documents. It is meant to read the folder on your own computer, show the evidence behind its answers, and ask before it changes or exports anything.

> The community software is free. Vault Desk sells certainty.

> [!IMPORTANT]
> Vault Desk completed milestone M0 on 2026-07-17 and cross-platform milestone M1 on 2026-07-18. M2 supervised inference is active: the macOS stage is implemented while Windows completion remains pending. There is no product application or installer yet. [The M2 status](docs/M2_STATUS.md) records the evidence and handoff.

## Why

Accountants, lawyers, consultants, and small offices should not have to upload private files—or learn models, vector databases, and context windows—just to get reliable help.

Vault Desk hides that machinery. You point it at a folder, ask in ordinary language, inspect the cited answer, then approve the result. Parsing, search, calculation, AI reasoning, verification, and audit stay separate so the model never becomes the authority.

The same platform is planned as a free community desktop app, a supported personal computer, and a governed office appliance. [The product brief](docs/PRODUCT.md) explains that shape without the implementation detail.

## How we plan to build it

- The product logic lives in [TypeScript](https://www.typescriptlang.org/) on [Node.js](https://nodejs.org/) so it remains portable and easy to test. [Tauri v2](https://tauri.app/) and [React](https://react.dev/) provide the desktop experience; [Rust](https://www.rust-lang.org/) is kept at the small native boundary where the operating system requires it.

- [node-llama-cpp](https://node-llama-cpp.withcat.ai/) runs local models. [Gemma 4 12B QAT](https://ai.google.dev/gemma/docs/core/model_card_4) is the first generation model to certify, while [Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF) finds relevant passages. [LanceDB](https://lancedb.com/) is the planned embedded local index for rebuildable semantic and exact-search data; it is not a hosted service and has no telemetry role. The contracts remain model-agnostic, even though the defaults are deliberate.

- [PDF.js](https://mozilla.github.io/pdf.js/), [Mammoth](https://github.com/mwilliamson/mammoth.js), [ExcelJS](https://github.com/exceljs/exceljs), [SheetJS](https://sheetjs.com/), [officeParser](https://github.com/harshankur/officeParser), and [MailParser](https://nodemailer.com/extras/mailparser) cover ordinary files directly. [Granite Docling](https://huggingface.co/ibm-granite/granite-docling-258M), [PaddleOCR-VL](https://github.com/PaddlePaddle/PaddleOCR), [Docling](https://docling-project.github.io/docling/), [MarkItDown](https://github.com/microsoft/markitdown), and [Unstructured](https://github.com/Unstructured-IO/unstructured) are escalation paths for scans, difficult layouts, and less common formats.

- Untrusted documents and generated code run in a disposable [no-network microVM](docs/adr/0012-worker-isolation-and-untrusted-documents.md). The [AI SDK](https://ai-sdk.dev/) is the planned candidate for a typed tool loop, while local, customer-owned audit records make activity reviewable. Vault Desk sends no application telemetry. [pnpm](https://pnpm.io/), [Biome](https://biomejs.dev/), and [Vitest](https://vitest.dev/) keep the workspace small and verifiable.

These are planned defaults behind replaceable adapters, not permanent coupling. [The implementation quality bar](docs/IMPLEMENTATION_QUALITY_BAR.md) records the full rationale.

[PrismML Bonsai](https://prismml.com/news/bonsai-8b) is a promising later candidate because low-bit local models fit the hardware thesis. It is not a selected dependency or model: after M11, and only when its formats and upstream runtime support are stable, it can face the same offline, licensing, quality, memory, citation, verification, and cross-platform gates as every other model. This remains research-derived until Vault Desk measures it.

## Open source and acknowledgements

Vault Desk builds on open-source software. The current pinned dependencies, development tools, native components, versions, licenses, and uses are recorded in the [machine-readable compliance inventory](compliance/inventory.json); transitive JavaScript, Rust, and Swift package resolutions are owned by the repository lockfiles. The [M0 dependency review](docs/research/m0-dependency-review.md) explains the selected M1 foundations. Planned or evaluated components named above are not necessarily installed dependencies.

The development workflow was informed by [Everything Claude Code](https://github.com/affaan-m/ECC), especially its research, verification, reusable-skill, review, and handoff practices. Vault Desk expresses those ideas in original project-specific instructions and does not include the ECC package or runtime. The exact adoption boundary and other reviewed projects are documented in [development workflow](docs/DEVELOPMENT_WORKFLOW.md#ecc-derived-workflow-review) and [research sources](docs/RESEARCH_SOURCES.md).

Before any packaged distribution, Vault Desk will generate the required third-party notices and dependency and model software bills of materials, as required by the [implementation plan](docs/IMPLEMENTATION_PLAN.md#model-and-asset-distribution).

## Go deeper

Start with [the product](docs/PRODUCT.md), then follow the boundaries through [architecture](docs/ARCHITECTURE.md) and [security](docs/SECURITY.md). [The implementation plan](docs/IMPLEMENTATION_PLAN.md) turns those promises into measured milestones, while [the roadmap](docs/ROADMAP.md) shows what comes later.

For the details, see [document processing](docs/DOCUMENT_ENGINE.md), [retrieval and verification](docs/RETRIEVAL_AND_VERIFICATION.md), [model strategy](docs/MODEL_STRATEGY.md), [desktop design](docs/DESKTOP_DESIGN.md), and [the first accounting workflow](docs/workflows/accounting.md). [CONTRIBUTING.md](CONTRIBUTING.md) explains the current contribution rules.
