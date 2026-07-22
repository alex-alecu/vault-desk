# Desktop Design

Updated: 2026-07-22

Vault Desk V1 is a calm, conversation-centered desktop agent inspired by the structural clarity of the Codex app without copying its branding or visual assets. The interface exposes work and context, not model infrastructure.

## Window Structure

```text
┌──────────────────────┬─────────────────────────────────────────────────────┐
│ Vault Desk           │                                                     │
│ Chats                │                                                     │
│ ＋ New chat          │               Conversation or welcome               │
│ Recent task          │                                                     │
│ Folders              │        messages, code activity, artifacts,          │
│ ＋ New folder        │                                                     │
│ ▾ Client A           │             warnings, and progress                  │
│   Recent task        │                                                     │
│   Earlier task       │                                                     │
│   …3 more sessions   │                                                     │
│   Show more          │                                                     │
│ ▸ Contracts          │                                                     │
│ ▸ Research           │                                                     │
│                      ├─────────────────────────────────────────────────────┤
│                      │ context chips                                       │
│ Settings             │ Ask Vault Desk…                         Stop/Send    │
└──────────────────────┴─────────────────────────────────────────────────────┘
```

The two stable regions are a compact, horizontally resizable white sidebar and a white conversation workspace, separated with the shared low-contrast border color. On macOS the sidebar background extends beneath the native traffic-light controls, which align with the sidebar content inset, and the native title text is hidden. The otherwise empty header area remains draggable across the full width of both regions. The composer stays anchored to the bottom of the workspace. A lightweight conversation header may show the editable session name and static active-model label without displacing folder navigation.

## Sidebar

The sidebar has separate **Chats** and **Folders** sections. **New chat** is the first option under Chats, followed by global sessions. **New folder** is the first option under Folders, followed by folder groups.

Each folder group:

- Uses the selected folder's display name.
- Can collapse or expand without losing the active session.
- Shows its five most recently active sessions, newest first.
- Shows **Show more** only when older sessions exist; activation appends the next bounded page.
- Highlights the active session and may show concise running, failed, or unread status.
- Reveals a delete control on session hover or keyboard focus; deletion always requires explicit confirmation and is unavailable while that conversation is running.
- Provides a narrow menu for starting a session, removing the grant, or revealing non-sensitive folder metadata.

Every remove action requires confirmation. Removing a folder removes its active grant but never deletes or changes host files. Existing session records remain visible with a clear unavailable-context state unless the user explicitly deletes them.

## New Chat

New chat prepares a blank composer with no folder grant; pressing it repeatedly does not persist placeholder conversations. The session is created when the user submits its first message or selects attachments. Users can attach one or more files through a native file dialog or drag and drop. Vault Core copies and verifies those files into session-owned read-only inputs before the agent can access them.

New chat must never silently inherit the previously selected folder. Attachments are visible as removable chips before sending and as immutable input records after the turn begins. Removing a pending attachment requires confirmation and never changes the original host file.

## Folder Sessions

Adding a folder uses a native Tauri dialog and creates a scoped Vault Core grant. The webview receives an opaque folder identifier and display name, not an unrestricted filesystem handle.

Starting a session under that folder gives each agent run a verified read-only snapshot of the selected folder. The agent can recursively inspect the snapshot inside the microVM. It cannot write, rename, delete, or create files in the host folder.

Switching sessions restores conversation turns, agent activity summaries, artifacts, warnings, cancellation state, and unsent draft text.

## Conversation

The conversation timeline supports:

- User and assistant messages.
- Streaming assistant text.
- A top-right activity control that opens scripts, commands, observations, resource limits, generated files, and other technical details in a right-side drawer rather than the main conversation.
- Expandable Python or Node.js source and bounded stdout/stderr.
- Generated scratch artifacts with type, size, and preview/download eligibility.
- Plain-language running, cancelling, cancelled, timed-out, failed, and completed states.
- Security or unsupported-operation warnings.

Hidden model reasoning is never shown or persisted. Activity describes observable actions and results only.

The empty state uses one short prompt and a few task suggestions relevant to the current context, such as exploring a folder, building a small artifact, reviewing files, or diagnosing a failure.

## Composer

The composer is multiline and anchored to the bottom of the conversation pane.

- The add button opens attachment actions; folder selection remains a separate grant action.
- Context chips show the active folder or explicit attachments.
- Send becomes Stop while a run is active.
- Drafts survive session and folder switching, daemon reconnect, and application restart.
- Submitting without a folder or attachment remains valid for conversational tasks.

## Model Presentation

A build with one runnable generation model shows its human-readable name as static text. It does not show a chevron or configuration affordance. A future multi-model build may show only installed, signed, hardware-compatible choices.

Runtime, quantization, context-window, endpoint, and model-file vocabulary stays out of the ordinary interface.

## Security Rules

- The webview has no generic shell, process, environment, network, local-endpoint, or unrestricted filesystem capability.
- Tauri commands are narrow, typed, capability-scoped, and delegated to Vault Core where product policy applies.
- Native dialogs return selections to the Rust host, which passes them through the typed grant or attachment command; arbitrary path strings from the webview are rejected.
- The model and guest never receive a writable host folder.
- Agent code executes only in the disposable no-NIC microVM with fixed interpreters and libraries.
- UI state never substitutes for Vault Core grants, policy, audit, resource limits, cancellation, or result validation.

## Accessibility And Platform Behavior

- Full keyboard navigation and visible focus.
- Screen-reader labels for folders, sessions, status, attachments, activity, and composer actions.
- Focus restoration after dialogs, session switches, cancellation, and reconnect.
- Reduced-motion support.
- Usable at 200 percent scaling and narrow supported window widths.
- Native title-bar and window controls appropriate to macOS and Windows.

## Revision History

| Date | Change |
|---|---|
| 2026-07-13 | Defined the initial Tauri desktop layout and security boundary. |
| 2026-07-20 | Reframed V1 around folder-grouped sessions, New chat attachments, and the generic offline dev agent. |
| 2026-07-22 | Grouped creation actions under Chats and Folders and standardized the white, low-contrast bordered shell. |
