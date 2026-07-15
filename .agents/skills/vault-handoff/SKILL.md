---
name: vault-handoff
description: Create a privacy-safe Vault Desk work handoff for another session, contributor, issue, or pull request. Use when work is incomplete, blocked, crossing sessions, changing owners, or needs a concise record of decisions, verification, failures, risks, and the next action.
---

# Hand Off Vault Desk Work

Read the issue or request, current diff, relevant decisions, and available verification output. Follow [the development workflow](../../../docs/DEVELOPMENT_WORKFLOW.md).

Produce:

```markdown
## Handoff

- Objective and current state:
- Active milestone and issue:
- Changed paths:
- Decisions and source links:
- Commands run and results:
- Failures and attempted fixes:
- Open risks or questions:
- Next concrete action:
```

State whether the work is ready, not ready, or blocked. Distinguish verified facts from assumptions and research-derived claims. Preserve commands and failure messages only to the degree needed to reproduce the next step.

Do not include secrets, customer documents, raw sensitive outputs, private credentials, personal data, hidden model reasoning, or unrelated repository state. Record conclusions, evidence, and decisions rather than internal thought processes.

Do not commit, push, open issues, or contact people as part of the handoff unless the user explicitly requests that external action.
