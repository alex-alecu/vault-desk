---
name: vault-review-dependency
description: Evaluate a proposed Vault Desk library, framework, tool, model-adjacent package, native component, or GitHub integration before adoption. Use when adding or replacing a dependency, validating a default-stack candidate, or comparing build-versus-adopt options for implementation tooling.
---

# Review A Vault Desk Dependency

Treat [AGENTS.md](../../../AGENTS.md), [the development workflow](../../../docs/DEVELOPMENT_WORKFLOW.md), and the current adapter boundary as constraints.

1. Define the exact capability needed and the active milestone that consumes it.
2. Search the repository for an existing solution or reusable standard-library capability.
3. Use primary sources: official documentation, registry metadata, source repository, releases, advisories, and license files.
4. Compare adopt, thin-wrap, benchmark, and minimal-owned implementation options.
5. Evaluate maintenance, license and redistribution, notices, transitive dependencies, offline behavior, telemetry, network and credential access, package footprint, native code, supported platforms, security posture, and adapter fit.
6. Mark untested platform, performance, packaging, or compatibility claims as research-derived.
7. Recommend `adopt`, `benchmark`, `defer`, or `reject` with a bounded rationale.

Produce:

```markdown
## Dependency Review

- Capability and milestone:
- Existing repository alternative:
- Candidate and pinned version or revision:
- Primary sources:
- License and redistribution:
- Offline, telemetry, network, and credential behavior:
- Footprint, native code, and platforms:
- Security and maintenance:
- Adapter fit:
- Research-derived claims to validate:
- Decision: adopt | benchmark | defer | reject
```

Do not install the candidate or change external systems unless the user has requested implementation and the active milestone authorizes it.
