---
name: vault-verify-change
description: Verify a Vault Desk documentation or implementation change with risk-relevant evidence before claiming completion. Use after edits, before a pull request, when checking milestone readiness, or when a contributor needs an exact pass, fail, and not-run report.
---

# Verify A Vault Desk Change

Follow [the development workflow](../../../docs/DEVELOPMENT_WORKFLOW.md) and the test tiers in [the implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).

1. Read the request or issue and the change brief.
2. Inspect the complete diff and changed-file list, including unrelated pre-existing changes.
3. Map changed surfaces to the failure or invariant they can affect.
4. Run the smallest targeted checks that prove the named behavior.
5. Run `pnpm verify` after M0 creates it.
6. Run `pnpm test:gate --milestone <n>` only when the change claims milestone completion.
7. Record exact commands, outcomes, and missing prerequisites. Never convert a skipped or unavailable check into a pass.
8. Use the documentation-only rules themselves as the gate before M0.

Produce:

```markdown
## Verification Report

- Changed surfaces:
- Commands passed:
- Commands failed:
- Required checks not run and why:
- Manual checks:
- Remaining risks:
- Conclusion: ready | not ready | blocked
```

Do not impose a blanket coverage percentage or add tests that only exercise framework wiring. Do not fix failures unless the user requested implementation or a fix.
