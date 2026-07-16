# M0 MicroVM Platform Smoke

The provisional probe records compatibility separately from certification. It never treats a process sandbox, container namespace, firewall, or command filter as equivalent to a no-NIC microVM.

On macOS 26 Apple silicon, the committed, narrowly entitled Swift probe boots the recorded arm64 kernel/initramfs through Virtualization.framework with an empty `networkDevices` array and one virtio-socket device. The guest reports zero non-loopback devices, completes one bounded request/response, and powers off. M1 uses a signed Swift lifecycle helper because Node cannot call this native API directly.

On Windows Pro, Enterprise, or Server with Hyper-V, the compatibility probe checks the edition and active hypervisor. M1 uses a signed Rust HCS helper for VM lifecycle and Hyper-V sockets because that Win32 surface is not a TypeScript boundary.

`pnpm test:platform` emits one JSON report. `--require-certified` fails until the current platform's pinned Buildroot guest boots, completes a typed socket round-trip, and proves zero virtual network adapters. macOS arm64 is certified; Windows x86_64 remains compatible-unverified until its separate host run. Hosted CI compatibility reports are useful evidence but do not replace certification on physical or correctly nested target hardware.
