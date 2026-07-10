# ADR 0001: Local-First Product Direction

Created: 2026-06-29

Status: Accepted as product direction

## Context

Vault Desk targets individuals and small professional offices that handle sensitive documents. The market already contains local model launchers and generic RAG tools. Vault Desk needs a stronger promise: useful document work without mandatory cloud dependency.

## Decision

Vault Desk will be local and offline-first.

The product must not require cloud inference, cloud document upload, cloud identity, or customer-document telemetry for basic operation.

Hosted or hybrid escalation may exist later, but only as an explicit, auditable, user-authorized option.

## Consequences

Positive:

- Strong privacy position.
- Better fit for accounting, legal, and professional offices.
- Clear differentiation from hosted SaaS products.
- Enables appliance and ownership model.

Negative:

- Local model quality and hardware constraints are real limits.
- Updates, support, and diagnostics become more complex.
- Hardware compatibility and performance testing become core product work.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial ADR created. |
