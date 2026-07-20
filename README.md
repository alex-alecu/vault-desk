# Vault Desk

**Private work should stay private.**

Vault Desk is building a local-first AI coworker for private folders and files. The M3 product target lets you select a folder or attach files to a chat; its local agent will inspect them and write Python or Node.js to complete the task without sending the work to a cloud service.

> The community software is free. Vault Desk sells certainty.

> [!IMPORTANT]
> Vault Desk completed M0 and cross-platform M1, then implemented the macOS supervised-inference foundation. M3 Offline Dev-Agent Desktop V1 is active: it targets a macOS and Windows app whose generic agent runs code only inside a disposable offline microVM over user-selected read-only inputs. The shell exists, but the real agent bridge and product installers do not. [The M3 status](docs/M3_STATUS.md) records current evidence.

## Why

People should not have to upload private work—or learn models, runtimes, sandboxes, and context windows—to get useful help from an AI agent.

Vault Desk hides that machinery. Folder sessions keep related conversations together. New chat accepts explicit attachments without granting a whole folder. The agent may create scripts and temporary artifacts inside its disposable workspace, but it cannot write to the selected host folder.

The same platform is planned as a free community desktop app, a supported personal computer, and a governed office appliance. [The product brief](docs/PRODUCT.md) explains that shape without the implementation detail.

## How we are building it

- Product logic lives in [TypeScript](https://www.typescriptlang.org/) on [Node.js](https://nodejs.org/). [Tauri v2](https://tauri.app/) and [React](https://react.dev/) provide the desktop experience; [Rust](https://www.rust-lang.org/) and Swift remain limited to operating-system capabilities that TypeScript cannot safely provide.

- [node-llama-cpp](https://node-llama-cpp.withcat.ai/) runs the local generation model in a separately constrained host-native worker. Contracts remain model-agnostic even though the first certified model is deliberate.

- Agent-authored Python and Node.js run in a disposable [no-network microVM](docs/adr/0012-worker-isolation-and-untrusted-documents.md) with an immutable image, fixed offline libraries, read-only selected inputs, bounded scratch, typed host/guest IPC, and no package installation or host write authority.

- Vault Core owns folder grants, sessions, policy, audit, model mediation, resource limits, cancellation, and worker teardown. The model proposes code; it never receives direct shell, filesystem, network, approval, or VM authority.

- Vault Desk sends no application telemetry. Local customer-owned audit records stay on the device unless the user explicitly exports them.

Document-specific parsing, OCR, retrieval, citations, and deterministic optimizations are one post-V1 follow-up. They are not prerequisites for the generic desktop agent.

## Open source and acknowledgements

Current pinned dependencies, development tools, native components, versions, licenses, and uses are recorded in the [machine-readable compliance inventory](compliance/inventory.json); transitive JavaScript, Rust, and Swift package resolutions are owned by repository lockfiles. Planned components are not installed dependencies until reviewed and consumed.

The development workflow was informed by [Everything Claude Code](https://github.com/affaan-m/ECC), especially its research, verification, reusable-skill, review, and handoff practices. Vault Desk expresses those ideas in original project-specific instructions and does not include the ECC package or runtime.

Before packaged distribution, Vault Desk will generate required notices, dependency and model SBOMs, hashes, signatures, and artifact manifests as required by the [implementation plan](docs/IMPLEMENTATION_PLAN.md#model-and-asset-distribution).

## Go deeper

Start with [the product](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), and [security](docs/SECURITY.md). The [implementation plan](docs/IMPLEMENTATION_PLAN.md), [offline dev-agent decision](docs/adr/0018-offline-dev-agent-first.md), [desktop design](docs/DESKTOP_DESIGN.md), and [M3 status](docs/M3_STATUS.md) define the active product path. [CONTRIBUTING.md](CONTRIBUTING.md) explains the current contribution rules.
