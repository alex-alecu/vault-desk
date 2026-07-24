# ADR 0005: Agent Sandbox

Created: 2026-07-10

Status: Accepted as security direction

## Context

Vault Desk will perform document work and may eventually modify files, create exports, query folders, or integrate with business systems.

Model output cannot be trusted as an execution authority. The application must own validation, approval, execution, and audit.

## Decision

Vault Desk will use an approval-gated, typed tool sandbox.

Models may propose tool calls. The control plane validates schema, checks policy, scopes filesystem access, requests approval where required, executes through a sandboxed tool, records an audit event, and exposes results back to the user and model.

The model must never receive a host shell or unrestricted filesystem access. ADR 0018 permits schema-bounded guest-local `/bin/sh` commands inside the no-NIC microVM; that shell can write only the session workspace and ephemeral runtime directory.

Any future executable tool that processes untrusted input runs in the no-NIC microVM boundary defined by [ADR 0012](0012-worker-isolation-and-untrusted-documents.md). Network isolation is established by attaching no virtual network device, not by matching commands, URLs, domains, addresses, or protocols. A tool that needs an approved external integration submits a typed request to a separate Vault Core broker; it never receives a general network socket or proxy.

## Consequences

Positive:

- Safer local agents.
- Better business auditability.
- Clearer permission model.
- Stronger differentiation from generic agent tools.

Negative:

- More upfront engineering.
- Tool definitions and policy need careful design.
- Some workflows may feel slower because approval is required.

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial ADR created. |
| 2026-07-12 | Bound executable tools to the no-NIC microVM and separated approved external connections into a typed broker. |
| 2026-07-23 | Clarified the bounded guest-shell authority adopted for the M3 development agent. |
