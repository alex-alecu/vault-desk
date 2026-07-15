# Vault Desk

**Private work should stay private.**

Vault Desk is a local-first AI coworker for people who work with sensitive documents. It is meant to read the folder on your own computer, show the evidence behind its answers, and ask before it changes or exports anything.

> The community software is free. Vault Desk sells certainty.

> [!IMPORTANT]
> Vault Desk is still in its documentation-only phase. There is no application or installer yet; [the implementation plan](docs/IMPLEMENTATION_PLAN.md) defines the path to one.

## Why

Accountants, lawyers, consultants, and small offices should not have to upload private files—or learn models, vector databases, and context windows—just to get reliable help.

Vault Desk hides that machinery. You point it at a folder, ask in ordinary language, inspect the cited answer, then approve the result. Parsing, search, calculation, AI reasoning, verification, and audit stay separate so the model never becomes the authority.

The same platform is planned as a free community desktop app, a supported personal computer, and a governed office appliance. [The product brief](docs/PRODUCT.md) explains that shape without the implementation detail.

## How we plan to build it

- The product logic lives in [TypeScript](https://www.typescriptlang.org/) on [Node.js](https://nodejs.org/) so it remains portable and easy to test. [Tauri v2](https://tauri.app/) and [React](https://react.dev/) provide the desktop experience; [Rust](https://www.rust-lang.org/) is kept at the small native boundary where the operating system requires it.

- [node-llama-cpp](https://node-llama-cpp.withcat.ai/) runs local models. [Gemma 4 12B QAT](https://ai.google.dev/gemma/docs/core/model_card_4) is the first generation model to certify, while [Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF) finds relevant passages and [LanceDB](https://lancedb.com/) combines semantic and exact search. The contracts remain model-agnostic, even though the defaults are deliberate.

- [PDF.js](https://mozilla.github.io/pdf.js/), [Mammoth](https://github.com/mwilliamson/mammoth.js), [ExcelJS](https://github.com/exceljs/exceljs), [SheetJS](https://sheetjs.com/), [officeParser](https://github.com/harshankur/officeParser), and [MailParser](https://nodemailer.com/extras/mailparser) cover ordinary files directly. [Granite Docling](https://huggingface.co/ibm-granite/granite-docling-258M), [PaddleOCR-VL](https://github.com/PaddlePaddle/PaddleOCR), [Docling](https://docling-project.github.io/docling/), [MarkItDown](https://github.com/microsoft/markitdown), and [Unstructured](https://github.com/Unstructured-IO/unstructured) are escalation paths for scans, difficult layouts, and less common formats.

- Untrusted documents and generated code run in a disposable [no-network microVM](docs/adr/0012-worker-isolation-and-untrusted-documents.md). The [AI SDK](https://ai-sdk.dev/) supplies a typed tool loop, [OpenTelemetry](https://opentelemetry.io/docs/specs/semconv/gen-ai/) gives audits a standard shape, and [pnpm](https://pnpm.io/), [Biome](https://biomejs.dev/), and [Vitest](https://vitest.dev/) keep the future workspace small and verifiable.

These are planned defaults behind replaceable adapters, not permanent coupling. [The implementation quality bar](docs/IMPLEMENTATION_QUALITY_BAR.md) records the full rationale.

[PrismML Bonsai](https://prismml.com/news/bonsai-8b) is a promising later candidate because low-bit local models fit the hardware thesis. It is not a selected dependency or model: after M11, and only when its formats and upstream runtime support are stable, it can face the same offline, licensing, quality, memory, citation, verification, and cross-platform gates as every other model. This remains research-derived until Vault Desk measures it.

## Go deeper

Start with [the product](docs/PRODUCT.md), then follow the boundaries through [architecture](docs/ARCHITECTURE.md) and [security](docs/SECURITY.md). [The implementation plan](docs/IMPLEMENTATION_PLAN.md) turns those promises into measured milestones, while [the roadmap](docs/ROADMAP.md) shows what comes later.

For the details, see [document processing](docs/DOCUMENT_ENGINE.md), [retrieval and verification](docs/RETRIEVAL_AND_VERIFICATION.md), [model strategy](docs/MODEL_STRATEGY.md), [desktop design](docs/DESKTOP_DESIGN.md), and [the first accounting workflow](docs/workflows/accounting.md). [CONTRIBUTING.md](CONTRIBUTING.md) explains the current contribution rules.
