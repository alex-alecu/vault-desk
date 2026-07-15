---
name: vault-review-change
description: Review a Vault Desk diff or pull request for actionable defects using project-specific priorities. Use for self-review, maintainer review, architecture review, or security-sensitive changes where findings must be ordered by severity and grounded in exact evidence.
---

# Review A Vault Desk Change

Use [AGENTS.md](../../../AGENTS.md), accepted ADRs, the active milestone, and [the development workflow](../../../docs/DEVELOPMENT_WORKFLOW.md) as the review baseline.

Review in this order:

1. Security, privacy, authority, filesystem, network, and process boundaries.
2. Active milestone contract and issue scope.
3. Correctness, evidence, citations, recovery, audit, and user-visible behavior.
4. Minimum-code, dependency, and test discipline.
5. Maintainability and documentation.

Classify findings:

- **P0**: immediate data exposure, authority bypass, destructive behavior, or release-blocking security failure.
- **P1**: broken milestone contract, correctness, evidence, recovery, approval, or audit invariant.
- **P2**: material scope, test, dependency, or maintainability gap that should be fixed before merge.
- **P3**: low-risk clarity or documentation improvement.

For each finding, provide a concise title, severity, exact path and line when available, the failure scenario, and the smallest valid remedy. Do not report style preferences as defects.

Lead with findings. If there are none, say so and state the remaining verification limits. Review only; do not edit, resolve threads, approve, merge, or publish unless the user separately requests that action.
