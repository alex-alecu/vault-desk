# Desktop Architecture Diagram

Updated: 2026-07-20

```mermaid
flowchart TD
    UI["Tauri webview: React and TypeScript"] --> Host["Minimal Tauri Rust host"]
    Host --> Core["Vault Core local daemon"]
    Host --> Dialogs["Native folder and file dialogs"]
    Dialogs --> Grants["Opaque folder grants and attachments"]
    Grants --> Core

    Core --> Sessions["Folder-grouped sessions and New chat"]
    Core --> Jobs["Jobs, cancellation, and recovery"]
    Core --> Policy["Policy and audit"]
    Core --> Agent["Core-owned agent loop"]

    Agent --> Inference["Constrained host-native inference"]
    Agent --> VM["Disposable no-NIC microVM"]
    VM --> Inputs["Read-only selected inputs"]
    VM --> Scratch["Bounded ephemeral scratch"]
    VM --> Python["Fixed Python and libraries"]
    VM --> Node["Fixed Node.js runtime"]
    VM --> Agent

    Sessions --> UI
    Jobs --> UI
    Policy --> UI
```

## Notes

- The webview has no unrestricted filesystem, shell, process, environment, endpoint, or network capability.
- Vault Core owns grants, sessions, model mediation, limits, cancellation, audit, and result validation.
- The microVM has zero virtual NICs and cannot write to the selected host folder.
- Post-V1 document intelligence may add deterministic fast paths without changing these boundaries.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Created the initial desktop architecture diagram. |
| 2026-07-20 | Reframed the desktop around folder sessions and the generic offline dev-agent microVM. |
