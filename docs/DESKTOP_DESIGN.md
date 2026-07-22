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
│ ＋ Add folder        │                                                     │
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

The two stable regions are a compact, horizontally resizable white sidebar and a white conversation workspace, separated with the shared low-contrast border color. On macOS the sidebar background extends beneath the native traffic-light controls, which use equal top and left insets and align vertically with the model title, and the native title text is hidden. The header remains draggable around its controls. The composer stays anchored to the bottom of the workspace. A lightweight conversation header shows the approved model name, on-device state, manual unload action, and activity control without displacing folder navigation.

## Sidebar

The sidebar has separate **Chats** and **Folders** sections. **New chat** is the first option under Chats, followed by global sessions. **Add folder** is the first option under Folders, followed by folder groups.

Each folder group:

- Uses the selected folder's display name.
- Can collapse or expand without losing the active session.
- Shows its five most recently active sessions, newest first.
- Shows **Show more** only when older sessions exist; activation appends the next bounded page.
- Highlights the active session and may show concise running, failed, or unread status.
- Opens the granted folder in Finder on macOS or Explorer on Windows when its folder icon is activated, without a confirmation step.
- Reveals a delete control on session hover or keyboard focus; deletion always requires explicit confirmation and is unavailable while that conversation is running.

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
- CommonMark rendering for assistant responses, while user messages remain literal text. Raw HTML and images are not rendered, and links remain non-navigating text.
- Streaming assistant text.
- A top-right activity control that opens scripts, commands, observations, resource limits, generated files, and other technical details in a right-side drawer rather than the main conversation.
- Expandable Python or Node.js source and bounded stdout/stderr.
- Generated scratch artifacts with type, size, and preview/download eligibility.
- Plain-language running, cancelling, cancelled, timed-out, failed, and completed states.
- Security or unsupported-operation warnings.
- A compact performance row beneath the newest assistant response with generation tokens per second, prompt-processing tokens per second, and total run time.

When the approved model and runtime expose a typed thought segment, the current segment may stream into a clearly labeled transient card while generation is active. It is held only in memory and disappears at the terminal result. Hidden or unsegmented internal reasoning is never inferred, exposed, or persisted. Activity describes observable actions and results only.

The empty state uses one short prompt and a few task suggestions relevant to the current context, such as exploring files, reviewing and suggesting improvements, comparing documents or data, or diagnosing a failure. Folder conversations include the folder name directly in the prompt; global chats use the prompt without folder context.

## Composer

The composer is multiline and anchored to the bottom of the conversation pane.

- The add button opens attachment actions; folder selection remains a separate grant action.
- Context chips show the active folder or explicit attachments.
- Send becomes Stop while a run is active.
- Drafts survive session and folder switching, daemon reconnect, and application restart.
- Submitting without a folder or attachment remains valid for conversational tasks.

## Model Presentation

A build with one runnable generation model shows its human-readable name and current state in the conversation header. The model loads on first use, remains resident and ready between turns, and can be unloaded manually only while idle. After unload, the next message loads the same approved model again. There is no picker or arbitrary configuration affordance. A future multi-model build may show only installed, signed, hardware-compatible choices.

Runtime, quantization, context-window, endpoint, and model-file vocabulary stays out of the ordinary interface.

## Security Rules

- The webview has no generic shell, process, environment, network, local-endpoint, or unrestricted filesystem capability.
- Tauri commands are narrow, typed, capability-scoped, and delegated to Vault Core where product policy applies.
- Opening a granted folder passes only its opaque identifier; Vault Core resolves and revalidates the active grant before the Rust host asks the operating system to open it.
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
| 2026-07-22 | Added resident-model controls, transient supported thinking, and response performance presentation. |
| 2026-07-22 | Added safe CommonMark presentation for assistant responses. |
