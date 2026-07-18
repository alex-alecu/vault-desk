# M0 MicroVM Platform Smoke (Provisional Windows Path)

The provisional probe records compatibility separately from certification. It never treats a process sandbox, container namespace, firewall, or command filter as equivalent to a no-NIC microVM.

On macOS 26 Apple silicon, M1 replaced this provisional Swift probe with the signed SwiftPM helper and typed launcher under `@vault/workers`. `pnpm test:platform` now classifies that production path, and the M1 platform gate boots it. The old macOS probe source remains temporarily because this tree still owns the provisional Windows path; it no longer provides current macOS certification evidence.

On Windows Pro, Enterprise, or Server with Hyper-V, the committed C# probe calls the Host Compute Service directly for the provisional M0 lifecycle test. It boots the recorded x86_64 kernel/initramfs with no network adapter configuration and one Hyper-V socket service, completes one bounded request/response, checks the guest's non-loopback device count, and terminates the compute system. HCS compute-system creation requires an elevated administrator or membership in the local Hyper-V Administrators group. M1 replaces this test helper with the signed Rust HCS helper because the Win32 surface is not a TypeScript product boundary.

The direct Windows M0 probe remains available in this folder for the owner's separate Windows M1 work. It does not satisfy the M1 gate and cannot report the production backend as certified. Hosted CI compatibility reports are useful evidence but do not replace certification on physical or correctly nested target hardware.
