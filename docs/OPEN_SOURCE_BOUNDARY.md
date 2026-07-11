# Open Source Boundary

Created: 2026-06-29

Vault Desk should use a useful open-source community application to create trust, distribution, product feedback, and demand for supported deployments.

The community product must be real software, not a crippled demo.

## Community Candidate Modules

Likely open-source:

- Desktop application shell.
- Local single-user workspace.
- Local document ingestion.
- Local search and retrieval.
- Local model/runtime adapter interface.
- Safe folder access.
- Basic tool registry.
- Approval UI for local actions.
- Export workflows.
- Hardware compatibility check.
- Community documentation.

## Business Candidate Modules

Likely proprietary:

- Organization management.
- Multi-user administration.
- Identity integration.
- Role and policy engine.
- Permission-aware retrieval across shared workspaces.
- Approval workflows for teams.
- Immutable audit trail.
- Backup orchestration.
- Appliance and fleet management.
- Long-term supported release channels.
- Business integrations.
- Administration dashboard.
- Diagnostics and support tooling.
- Support SLA enforcement.

## Boundary Principles

- The community product must remain independently useful.
- Business controls should not contaminate the community core with hard-coded limitations.
- Shared abstractions should be designed once and used by both desktop and office editions.
- Proprietary modules should add governance, scale, supportability, and integrations.
- The user should not need to understand which module handles a task.

## Licensing Questions

Open decisions:

- Open-source license.
- Contributor agreement strategy.
- Trademark policy.
- Model license notice strategy.
- Third-party component notice strategy.
- Whether business plugins can depend on community extension points.

Known model-license facts (verified 2026-07-11):

- Gemma 4 (including 12B QAT) is Apache 2.0. It can be redistributed inside community packaging with standard notices.
- EmbeddingGemma remains under the Gemma Terms of Use, not Apache 2.0. Redistribution and bundling terms need explicit review before it ships inside the community installer.
- Candidate third-party components are permissively licensed: turbovec (MIT), Docling (MIT), MarkItDown (MIT), llama.cpp and node-llama-cpp (MIT).

## Intellectual Property Hygiene

This repository should contain:

- Original Vault Desk concepts.
- Public market knowledge.
- Public prior-art summaries.
- Architecture hypotheses.
- Future product decisions.

This repository should not contain:

- Employer code.
- Employer confidential information.
- Employer internal architecture.
- Employer-owned generated assets.
- Third-party proprietary source.
- Unlicensed copied documentation.

Before signing employment or investment agreements, review the repository and concept timeline with an employment/IP lawyer.

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial open-source boundary document created from supplied concept material. |
| 2026-07-11 | Added verified model and component license facts: Gemma 4 Apache 2.0, EmbeddingGemma Gemma Terms of Use caveat, and permissive licenses for candidate components. |
