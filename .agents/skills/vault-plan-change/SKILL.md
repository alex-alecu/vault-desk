---
name: vault-plan-change
description: Plan a Vault Desk implementation, fix, refactor, or documentation change against the active milestone before editing. Use when starting non-trivial repository work, defining acceptance evidence, checking whether a request is authorized in the current phase, or deciding what must remain out of scope.
---

# Plan A Vault Desk Change

Treat [AGENTS.md](../../../AGENTS.md) as authoritative and use [the development workflow](../../../docs/DEVELOPMENT_WORKFLOW.md) as the canonical procedure.

1. Read the current phase rules and active milestone.
2. Inspect the relevant contracts, ADRs, structure blueprint, source, and tests.
3. Stop implementation if the requested work belongs to an inactive milestone. Offer an issue, design note, or plan instead.
4. Search for an existing repository capability before proposing new code.
5. Identify the user-visible behavior or invariant the change must protect.
6. Name the smallest acceptance evidence that proves the change.
7. List explicit exclusions to prevent speculative work.

Produce:

```markdown
## Change Brief

- Goal:
- Active milestone and issue:
- Allowed scope:
- Product contracts and boundaries:
- Risks:
- Acceptance evidence:
- Dependencies affected:
- Explicitly not doing:
```

Do not install tools, create implementation scaffolding, delegate work automatically, or broaden permissions. Ask for a maintainer decision when the change would reopen an accepted architecture or security boundary.
