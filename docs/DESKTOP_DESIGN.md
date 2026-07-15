# Desktop Design

Created: 2026-07-13

Vault Desk should feel like a calm work surface, not a model-control dashboard. The first interface uses Tauri v2 with a React/TypeScript frontend and follows the structural simplicity of the Codex desktop application without copying its branding or visual assets.

## Window Structure

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Session name                                              Model name ▾     │
├──────────────────────┬─────────────────────────────────────────────────────┤
│ Chats                │                                                     │
│  Current chat        │                                                     │
│  Earlier chat        │                                                     │
│                      │ Conversation, progress, citations, warnings,        │
│ Folders              │ previews, tool activity, and approval cards         │
│  Client A            │                                                     │
│  Invoices July       │                                                     │
│  Contracts           │                                                     │
│                      ├─────────────────────────────────────────────────────┤
│                      │ Ask Vault Desk…                              Send   │
└──────────────────────┴─────────────────────────────────────────────────────┘
```

The left sidebar is persistent and contains two visually distinct sections:

1. **Chats** — recent and pinned sessions, with the current session clearly selected.
2. **Folders** — authorized working folders and their availability or indexing state.

The window has four stable regions:

1. **Header** — spans the full window above both sidebar and conversation and shows the editable session name plus active model.
2. **Sidebar** — contains chats followed by working folders.
3. **Conversation** — scrollable work history with answers, citations, warnings, progress, previews, approvals, and compact tool activity.
4. **Composer** — anchored to the bottom of the conversation pane with multiline input, attachment/folder context, stop/send state, and clear disabled states.

## Model Presentation

Model choice is controlled by the installed, signed model manifest rather than arbitrary provider configuration.

- A build containing exactly one runnable generation model shows its human-readable name as static header text. It must not show a chevron, disabled dropdown, or settings link implying another choice.
- A build containing multiple approved models shows a dropdown containing only installed models compatible with the current hardware and selected workflow.
- The current hardware-aware default is preselected.
- Changing the model applies to subsequent turns, is recorded in the session timeline, and never silently invalidates previous citations or verification results.
- Runtime, quantization, context-window, embedding, and backend vocabulary stays out of the ordinary selector. Advanced diagnostic details belong in a separate support view.

## Model Download Experience (model-download build only)

The model-download build flavor defined in [ADR 0016](adr/0016-model-agnostic-defaults-and-managed-downloads.md) adds a managed installation experience for generation models. It is designed for non-technical users and never exposes repositories, files, quantization, tokens, or endpoints.

- On first launch without an installed generation model, the main pane shows a short recommendation list instead of the composer: two or three models from the signed catalog ranked by detected hardware fit, each with a plain-language line about what it is good at, its download size, and a Certified, Compatible, or Experimental fit label. The top recommendation is preselected; one primary action starts the download.
- A search field accepts a model name and resolves it only within the signed catalog's allowlisted official publishers. Results show the same plain-language cards as recommendations. A model that does not fit the detected hardware appears with an honest explanation, not a hidden entry.
- The user never chooses an embedding model. The encoder is bundled; if a signed catalog entry pairs a downloaded model with a different encoder, the product handles installation and explicit re-indexing itself and explains the re-index in plain language.
- Download progress is visible, cancellable, and resumable, with plain-language failure states (no space, connection lost, file failed verification). A failed or cancelled download leaves no partially installed model.
- After installation the model appears in the standard model presentation above; nothing about the header, selector, or session rules changes.
- The bundled build shows none of this surface: no download entry point, no catalog, no network affordance.

Model downloads are the only network affordance in the ordinary interface, are labeled as downloads from Hugging Face, and run through the typed Vault Core broker with signed-catalog and hash verification; the webview itself never fetches.

## Folder Behavior

- Adding a folder uses a native Tauri dialog and creates a scoped Vault Core workspace grant; the React webview never receives unrestricted filesystem authority.
- A folder row indicates ready, indexing, needs attention, offline/missing, or access-revoked state.
- Selecting a folder changes the visible working context only after pending composer text is preserved.
- Chats may reference one primary folder and explicitly attached evidence from other authorized folders.
- Removing a folder from the sidebar does not silently delete source files or authoritative workspace records.

## Interaction Rules

- Optimize the default view for asking questions and reviewing evidence, not configuring infrastructure.
- Show useful progress in plain language, including the current file or phase when safe.
- Keep citations adjacent to supported claims and open previews at the exact page, region, table, sheet, or cell.
- Present generated code as compact audited activity by default; expose code and logs on demand.
- Show approval cards inline at the point where work pauses.
- Preserve input while switching chats or folders, recovering from a backend restart, or cancelling a job.
- Keyboard navigation, visible focus, screen-reader names, reduced motion, and 200 percent scaling are release requirements.

## Security Rules

- The webview cannot receive a generic shell, process launcher, environment reader, network client, or unrestricted filesystem API.
- Tauri commands are narrow, typed, capability-scoped, and delegated to Vault Core where product policy applies.
- Model selection cannot load an uninstalled model, arbitrary path, remote endpoint, or unsigned manifest entry.
- Model download cannot fetch from an arbitrary URL, unsigned catalog entry, or non-allowlisted repository, and cannot activate an artifact that fails hash verification.
- UI state never substitutes for Vault Core authorization, approval, audit, or workspace scope checks.

## Revision History

| Date | Change |
|---|---|
| 2026-07-13 | Defined the first Tauri desktop layout, sidebar, session header, model presentation, composer, folder behavior, and UI security boundary. |
| 2026-07-15 | Added the managed model-download experience for the ADR 0016 model-download build: recommendations-first onboarding, catalog-scoped search, automatic encoder pairing, and download security rules. |
