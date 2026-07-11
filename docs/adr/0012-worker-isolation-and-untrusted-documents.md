# ADR 0012: Worker Isolation And Untrusted Documents

Date: 2026-07-11

## Status

Accepted as security direction

## Context

Vault Desk treats model output as untrusted, but document parsers, OCR models, inference runtimes, and document contents are also attack and failure surfaces. The earlier plan described sandboxed workers while leaving native parsers and node-llama-cpp process placement ambiguous and introducing supervision only with later vision workers.

A package boundary is not a security or crash-containment boundary. Malformed documents, decompression bombs, parser hangs, runaway generation, prompt injection inside source text, or worker crashes must not gain Vault Core permissions or corrupt authoritative workspace state.

## Decision

Inference, native-document parsing, OCR, and layout processing run in separate supervised worker processes from Vault Core.

Workers follow a capability-scoped job protocol:

- Vault Core inventories and authorizes inputs before dispatch.
- Workers receive job-scoped bytes, staged read-only files, or explicit brokered handles rather than arbitrary user paths.
- Workers cannot approve actions, mutate workspace policy, write exports, or access the general workspace filesystem.
- Outbound network access is denied by default and verified at the worker boundary.
- Each job has limits for wall time, CPU, memory, temporary storage, input expansion, output size, and concurrency.
- Cancellation is cooperative first and process termination is the fallback.
- Worker output is schema-validated and size-checked before Vault Core commits it.
- Worker crashes and malformed messages become typed job failures with durable resume points.
- Temporary files live in job-scoped directories and are cleaned after success, cancellation, crash, and startup recovery.

Source documents and retrieved chunks are always data. Text inside them cannot redefine system policy, grant permissions, request approval, or become a tool call. Prompts and tool-loop adapters preserve an explicit separation between trusted workflow instructions and untrusted evidence.

Process isolation is mandatory. Stronger platform sandbox controls are added and certified where the operating system and packaged runtime permit them. Product documentation must distinguish isolated worker processes from stronger OS sandbox guarantees until those guarantees are measured.

## Consequences

Positive:

- Contains native crashes and parser failures.
- Narrows filesystem and network authority around untrusted processing.
- Makes memory arbitration, cancellation, and recovery testable.
- Prevents document instructions from becoming execution authority.

Negative:

- Adds typed IPC and supervision code.
- Requires copying or staging some inputs and outputs.
- Platform sandbox enforcement differs between Windows and macOS and needs separate certification evidence.

## Required Validation

- Traversal, symlink, MIME confusion, time-of-check/time-of-use replacement, and staged-input mutation tests.
- Prompt-injection documents that attempt tool calls or policy override.
- Zip/decompression bombs, oversized files, parser hangs, worker crashes, malformed IPC, cancellation, timeout, and low-disk tests.
- Network-denial tests for every worker class.
- Proof that workers cannot write exports or authoritative workspace state directly.

## Revision History

| Date | Change |
|---|---|
| 2026-07-11 | Accepted supervised, capability-scoped worker isolation and untrusted-document handling requirements. |
