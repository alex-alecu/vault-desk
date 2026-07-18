# Milestone M1 Status

Updated: 2026-07-18

M1 is complete and certified on macOS 26 Apple silicon and Windows x64 with Hyper-V. M2 is not authorized.

## Change Brief

- Goal: implement the smallest cross-platform workspace, security, daemon, CLI health, worker-protocol, and certified no-NIC microVM foundations.
- Active milestone and issue: M1, activated by the repository owner's explicit 2026-07-17 request and completed by the owner's Windows continuation request on 2026-07-18; no separate issue was supplied.
- Allowed scope: M1 shared contracts; transactional workspace catalog and single-writer lock; scoped filesystem and atomic artifacts; redacted hash-chained audit; durable job cancellation primitive; JSON-RPC daemon and CLI status; bounded worker frames; reproducible guests; signed macOS Virtualization.framework and Windows HCS helpers; platform launchers and gates.
- Product contracts and boundaries: Vault Core alone owns authoritative workspace mutation; local RPC is current-user-only and has no TCP mode; workers receive already-authorized staged inputs and bounded scratch; certified guests have no virtual NIC and accept only the fixed typed socket protocol.
- Dependencies affected: the M0-selected `better-sqlite3` binding is consumed by `@vault/core`; the Swift helper uses only Apple system frameworks; the Rust helper uses only the Rust standard library and Windows system APIs. No third-party runtime dependency was added.
- Explicitly not doing: M2 inference, parsers, product UI, external networking, model acquisition, production packaging, or later-milestone behavior.

## Gate State

- Shared M1 implementation: complete.
- macOS implementation and certification: pass.
- Windows implementation and certification: pass.
- Full M1 milestone: complete on 2026-07-18.
- M2 authorization: not granted.

## Shared Evidence

- Workspace gates cover traversal, symlink or junction escape, captured-file replacement, single-writer refusal, stable identity, immutable atomic artifact writes, killed SQLite transaction rollback, audit redaction, and hash-chain tamper detection.
- Daemon gates cover start, health, `vault status --json`, exact single-document stdout, protocol incompatibility, current-user endpoint restriction, restart, abrupt kill, stale-lock recovery, and catalog reopening.
- Worker gates reject non-schema forwarding frames and bound frame sizes.
- `pnpm verify` passes source limits, Biome, TypeScript, 28 unit assertions, two native assertions, Rust formatting and Clippy, signed test-sidecar construction, both native helper builds, and platform-appropriate skips.
- `pnpm test:gate --milestone 1` passes the cumulative M1 verification and certified current-platform gate.

## macOS Evidence

- The production arm64 guest was built twice from Buildroot 2026.05 in disposable volumes. The second build had Docker networking disabled and matched the first byte-for-byte.
  - kernel SHA-256: `211d283fafe9e094e614629ef21f8616cdce24c5e4b43b936c4c73a3e447e7bd`.
  - initramfs SHA-256: `b63fd1a7677b7f6b3e3b7cd9c95eeba9c313f0f8a34f85457491f82a3334ed4e`.
- The ad-hoc signed Swift helper booted the recorded guest with zero configured network devices, one VSOCK device, one read-only staged input, 8 MiB bounded scratch, zero guest non-loopback interfaces, and successful DNS, IPv4, IPv6, LAN, multicast, and host-reachability denial results.
- The helper source configures no generic proxy or virtual network adapter. Schema-invalid worker frames and arbitrary forwarding operations are rejected.

## Windows Evidence

- The signed Rust helper uses the pinned Rust 1.97.0 toolchain, raw `computecore.dll`, Winsock, and Windows ACL APIs, with a zero-third-party `Cargo.lock`. It grants only the ephemeral Hyper-V VM identity access to already-authorized staged attachments.
- The production x86_64 guest was built twice from Buildroot 2026.05. The second build had Docker networking disabled and matched the first byte-for-byte.
  - kernel SHA-256: `ec0364eab93e9a12e4f5ef3008207331b03ef32a23dd9b0fc0f8c197fb126e45`.
  - initramfs SHA-256: `cdf5a631ee8cc7aabb5def990de9beb922221acf5a46dc51ce2492498b225986`.
- An elevated physical Windows x64 HCS boot of those exact artifacts returned `certified`: zero configured network devices, one fixed Hyper-V socket service, one read-only staged input, 8 MiB bounded scratch, zero guest non-loopback interfaces, and successful DNS, IPv4, IPv6, LAN, multicast, and host-reachability denial results.
- The configuration gate parses the HCS document before boot and proves there is no `NetworkAdapters` property, inputs are read-only, scratch is writable, and the only host/guest transport is the fixed Hyper-V socket service.
- The launcher uses a 60-second cold-boot budget on Windows and retries teardown only while HCS releases attachment handles; the authoritative milestone gate completed the platform project in about 31 seconds.
- The Windows dependency decision and primary sources are recorded in [research/m1-windows-dependency-review.md](research/m1-windows-dependency-review.md).

## Remaining Risks And Deferrals

- Generated guests, signed helpers, packaged sidecars, build output, coverage, and dependency directories remain local ignored artifacts and are not committed.
- M1 development signing proves intact helper identity; release certificate management, notarization, installer ACLs, notices, and packaged artifact verification remain M10 work.
- Hosted CI classifies each available platform backend but does not substitute for elevated physical-host HCS certification or macOS hardware certification.
- Node does not expose a durable Windows directory-handle flush equivalent; M1 still fsyncs file contents and verifies atomic replacement, SQLite recovery, and abrupt-termination behavior on Windows.
- M2 and all later product behavior require a new explicit owner request.
