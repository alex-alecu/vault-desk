# Implementation Quality Bar

Created: 2026-06-30

This document defines the future implementation quality constraints for Vault Desk. It is planning material only and does not authorize code creation during the documentation-only phase.

The goal is the least amount of new code and the least amount of tests that still protects the product's privacy, correctness, auditability, and local performance promises.

## Minimal Code Rule

Future implementation should start from product contracts, not framework defaults.

Add code only when it is required to express one of these product responsibilities:

- Document-set manifests.
- Typed tool boundaries.
- Policy and approval decisions.
- Runtime adapter contracts.
- Parser adapter contracts.
- Retrieval adapter contracts.
- Evidence-pack assembly.
- Claim and citation verification.
- Compaction state management.
- Audit events.
- Export approval and rollback.

Do not write custom infrastructure when a maintained local dependency can satisfy a narrow adapter contract.

Avoid:

- Custom OCR engines.
- Custom document parsers.
- Custom vector databases.
- Custom model runtimes.
- Broad plugin systems before one workflow is proven.
- Generic agent frameworks that obscure policy and audit boundaries.
- Generated boilerplate that is not exercised by a workflow.

## Minimal Test Rule

Tests should protect invariants and user-visible behavior. They should not exist to document framework wiring.

Required first tests:

- Path scope and permission decisions.
- Tool schema validation.
- Approval gates for consequential actions.
- Audit event creation.
- Manifest resumability.
- Parser routing decisions.
- Evidence-pack citation requirements.
- Claim verification outcomes.
- Spreadsheet calculation checks.
- Compaction state preservation.
- Runtime adapter failure handling.
- Offline/no-cloud behavior.

Do not add broad snapshot tests, brittle UI tests, or duplicated mock-heavy tests before the underlying behavior is stable.

## Clean Code Principles To Enforce

The following principles are based on the major themes of Clean Code by Robert C. Martin, summarized here as project guidance rather than quoted source text.

1. Use intention-revealing names for modules, functions, types, and events.
2. Keep functions small enough to explain one decision or transformation.
3. Keep one level of abstraction per function.
4. Give each module one reason to change.
5. Remove duplication before adding options.
6. Prefer explicit typed boundaries over implicit shared state.
7. Make command functions and query functions distinct.
8. Avoid boolean flag arguments that hide multiple behaviors.
9. Represent errors deliberately and handle them close to the boundary that can recover.
10. Keep comments rare and useful; prefer clearer names and smaller functions.
11. Keep formatting conventional and boring.
12. Keep tests readable as behavior specifications.
13. Test behavior and invariants, not private implementation details.
14. Keep adapters thin around third-party tools.
15. Keep policy decisions separate from model output.
16. Keep data structures stable at persistence and audit boundaries.
17. Avoid speculative generality and unused extension points.
18. Refactor only to reduce current complexity or protect a proven boundary.
19. Make dependencies point inward toward product contracts.
20. Leave the codebase easier to reason about after every change.

## Architecture Consequences

The future TypeScript/Node harness should be small because it coordinates work rather than doing all work itself.

Preferred shape:

- Thin local API.
- Thin runtime adapters.
- Thin parser adapters.
- Small policy engine.
- Small manifest store.
- Small evidence-pack builder.
- Small verifier orchestration layer.
- Small compaction state manager.

Avoid a central "agent brain" module. Vault Desk should be a set of explicit workflows and typed tools with model calls as one step inside those workflows.

## Test Selection Policy

When deciding whether to add a test, ask:

- Can this failure leak private data?
- Can this failure perform an action without approval?
- Can this failure lose source anchors, citations, or audit data?
- Can this failure make a verified answer unsupported?
- Can this failure corrupt an export?
- Can this failure make a long folder job non-resumable?
- Can this failure make Local 12 and Local 16 behave differently beyond context size?

If the answer is yes, add a focused test. If the answer is no, prefer a simpler implementation and defer the test.

## Future Implementation Gate

Before application code is added, the implementation plan must name:

- The first workflow being implemented.
- The product contract it exercises.
- The minimal adapter interfaces required.
- The invariants that must be tested.
- The dependencies being used instead of custom code.
- The code that will intentionally not be written.

No package manifest or source tree should be created until that plan exists.

## Revision History

| Date | Change |
|---|---|
| 2026-06-30 | Added future minimal-code, minimal-test, and Clean Code quality constraints. |
