# Milestone M1 Status

Updated: 2026-07-18

M1 is implemented and certified for macOS 26 on Apple silicon. The full cross-platform milestone remains open until the repository owner completes the Windows HCS/Hyper-V helper and records Windows evidence on a Windows machine. M2 is not authorized.

## Change Brief

- Goal: implement the smallest M1 workspace, security, daemon, CLI health, worker-protocol, and macOS microVM foundations.
- Active milestone and issue: M1, activated by the repository owner's explicit 2026-07-17 request; no separate issue was supplied.
- Allowed scope: M1 shared contracts; transactional workspace catalog and single-writer lock; scoped filesystem and atomic artifacts; redacted hash-chained audit; durable job cancellation primitive; JSON-RPC daemon and CLI status; bounded worker frames; reproducible guest build; signed macOS Virtualization.framework helper and launcher; macOS gates.
- Product contracts and boundaries: Vault Core alone owns authoritative workspace mutation; local RPC is current-user-only and has no TCP mode; workers receive staged inputs and bounded scratch; the certified guest has no virtual NIC and accepts only the fixed typed VSOCK protocol.
- Risks: Windows remains incomplete; generated guest artifacts and the signed helper are local build outputs; packaging and notarization remain M10 work.
- Acceptance evidence: focused M1 unit and platform gates, complete `pnpm verify`, deterministic double guest build, exact manifest hashes, daemon/CLI lifecycle tests, and macOS guest boot evidence.
- Dependencies affected: the M0-selected `better-sqlite3` binding is now consumed by `@vault/core`; the native helper uses only Apple Swift, Foundation, and Virtualization.framework; no new third-party runtime dependency was added.
- Explicitly not doing: Windows M1 implementation, M2 inference, parsers, product UI, external networking, model acquisition, packaging, or later-milestone behavior.

## Current Gate State

- macOS implementation: complete.
- macOS certification: pass.
- Windows implementation and certification: pending owner work on Windows.
- Full M1 milestone: open.
- M2 authorization: not granted.

## macOS Evidence

- Workspace gates cover traversal, symlink escape, captured-file replacement, single-writer refusal, stable identity, immutable atomic artifact writes, killed SQLite transaction rollback, audit redaction, and hash-chain tamper detection.
- Daemon gates cover start, health, `vault status --json`, exact single-document stdout, protocol incompatibility, endpoint mode `0600`, restart, abrupt kill, stale-lock recovery, and catalog reopening.
- Worker gates reject non-schema forwarding frames and bound frame sizes.
- The production guest was built twice from Buildroot 2026.05 in disposable volumes. The second build had Docker networking disabled and matched the first byte-for-byte.
  - arm64 kernel SHA-256: `211d283fafe9e094e614629ef21f8616cdce24c5e4b43b936c4c73a3e447e7bd`.
  - arm64 initramfs SHA-256: `b63fd1a7677b7f6b3e3b7cd9c95eeba9c313f0f8a34f85457491f82a3334ed4e`.
- The ad-hoc signed helper booted the exact recorded guest with zero configured network devices, one VSOCK device, one read-only staged input, 8 MiB bounded scratch, zero guest non-loopback interfaces, and successful DNS, IPv4, IPv6, LAN, multicast, and host-reachability denial results.
- The helper source configures no generic proxy or virtual network adapter. Schema-invalid worker frames and arbitrary forwarding operations are rejected.

## Windows Handoff

- Implement `packages/workers/native/windows-hcs-helper/` and `packages/workers/src/microvm/windows.ts` against the already-committed shared launcher and frame contracts.
- Rebuild the x86_64 guest after reconciling the M1 worker frame and update only reproducible manifest hashes.
- Replace the provisional M0 HCS probe with the production helper, prove zero adapters and typed Hyper-V socket confinement, and add the Windows M1 gate.
- Run `pnpm verify` and `pnpm test:gate --milestone 1` on Windows without treating macOS-only evidence or a process fallback as a pass.
