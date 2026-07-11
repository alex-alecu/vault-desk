# Security

Created: 2026-07-10

Vault Desk must treat privacy, permissions, auditability, and reversibility as product features, not implementation details.

## Security Goals

- Keep customer documents local by default.
- Avoid mandatory cloud dependencies.
- Prevent silent cloud fallback.
- Restrict model-initiated actions through typed tools.
- Require approvals for consequential actions.
- Preserve source traceability.
- Support rollback for file-changing actions.
- Provide auditable external connections.
- Make office appliance permissions enforceable and inspectable.

## Threat Model Assumptions

- Model output is untrusted.
- User documents may contain sensitive financial, legal, medical, or business data.
- Plugins and integrations may be faulty or malicious.
- Users may accidentally approve the wrong action.
- Shared offices require workspace and role isolation.
- Remote support must never become unrestricted access.
- Local malware risk exists and should be reduced through process and filesystem boundaries where practical.

## Agent Security Model

The model may propose an action. It must not execute one directly.

The application is responsible for:

- Validating the proposed action schema.
- Checking workspace permissions.
- Checking file path scope.
- Checking network permissions.
- Showing previews and diffs.
- Requesting explicit approval when required.
- Executing through a restricted tool boundary.
- Recording an audit event.
- Supporting rollback where possible.

## Tool Sandbox Requirements

Future tools should be:

- Typed.
- Narrow.
- Versioned.
- Policy-aware.
- Workspace-scoped.
- Resource-limited.
- Logged.
- Previewable when they change files or external systems.

Examples of acceptable tool categories:

- Search approved documents.
- Open a specific page or region.
- Extract structured data.
- Compare document versions.
- Create an export.
- Produce a redacted copy.
- Create a case or client folder inside an approved workspace.

Examples of unsafe default capabilities:

- Direct shell access.
- Arbitrary filesystem traversal.
- Arbitrary network calls.
- Unbounded file writes.
- Hidden background uploads.
- Unreviewed destructive edits.

## Filesystem Controls

Vault Desk should enforce:

- Folder-scoped access.
- Path traversal prevention.
- File extension and MIME validation.
- Safe temporary storage.
- Reversible file operations.
- Immutable originals where practical.
- Explicit user or administrator grants for watched folders.

## Network Controls

Network access should be explicit and inspectable.

Defaults:

- Local inference should work without internet.
- Document processing should not require outbound connections.
- No customer-document telemetry.
- No silent hosted reasoning fallback.
- Updates should be user-controlled.
- Office appliances should support offline update packages.
- Remote support should require time-limited, explicit authorization.

## Audit Log

Audit records should capture:

- User.
- Workspace.
- Request.
- Documents accessed.
- Retrieval evidence.
- Model profile.
- Tool proposal.
- Policy decision.
- Approval decision.
- Tool result.
- Export destination.
- Error state.
- Timing and resource metrics.

Audit logs should avoid storing unnecessary sensitive content. Where possible, store hashes, references, redacted previews, and structured metadata.

## Business Control Layer

The business layer should add:

- Organization management.
- Identity and roles.
- Permission-aware retrieval.
- Approval policies.
- Immutable audit history.
- Backup orchestration.
- Appliance administration.
- Diagnostics.
- Supported release channels.

These controls are part of the paid certainty proposition.

## Remote Support

Remote support must be:

- Disabled by default.
- Explicitly authorized.
- Time-limited.
- Audited.
- Revocable.
- Scoped to diagnostics or approved maintenance actions.
- Designed to avoid exposing customer documents unless explicitly permitted.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial security document created from supplied architecture and product material. |
