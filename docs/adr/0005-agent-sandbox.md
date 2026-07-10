# ADR 0005: Agent Sandbox

Created: 2026-06-29

Status: Accepted as security direction

## Context

Vault Desk will perform document work and may eventually modify files, create exports, query folders, or integrate with business systems.

Model output cannot be trusted as an execution authority. The application must own validation, approval, execution, and audit.

## Decision

Vault Desk will use an approval-gated, typed tool sandbox.

Models may propose tool calls. The control plane validates schema, checks policy, scopes filesystem access, requests approval where required, executes through a sandboxed tool, records an audit event, and exposes results back to the user and model.

The model must never receive direct shell access or unrestricted filesystem access.

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
| 2026-06-29 | Initial ADR created. |
