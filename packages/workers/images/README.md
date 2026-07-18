# MicroVM Guest Image

Buildroot 2026.05 produces the minimal Linux kernel and initramfs used by the no-NIC worker protocol probe. M0 selected the tool and image inputs; M1 owns the production build entrypoint and macOS launcher. Buildroot is build tooling, not a runtime or shipped package manager. Its source archive is pinned by URL and SHA-256 in `manifest.json`.

The image contains only the kernel, BusyBox userspace, virtio block and socket drivers required by the selected platforms, and the fixed probe entrypoint. It contains no package manager, DNS configuration, shell authority exposed to the host, customer data, model, parser, or persistent state. Its kernel has no IPv4, IPv6, wireless, or virtual NIC path, so any generic BusyBox networking applets are inert. The guest entrypoint accepts one versioned length-prefixed probe frame, runs the named network-denial checks, returns one bounded typed result, and powers off. Any other frame is rejected rather than interpreted or forwarded.

The build runs in Buildroot's release-pinned CI image locked by registry digest, sets a fixed source date epoch, disables IP and wireless kernel features, and emits architecture-specific kernel and initramfs artifacts. The first build may fetch Buildroot-verified inputs; the independent second build has Docker networking disabled and must be byte-identical. Transient build trees use disposable Linux-native Docker volumes. Artifacts are ignored and are not committed.

Run `VAULT_BUILDROOT_ARCHIVE=/absolute/path/buildroot-2026.05.tar.xz pnpm guest:build`. The archive must match the manifest hash; use `-- --arch x86_64` for the Windows handoff build.

Buildroot was selected over a general distribution image because it emits a smaller immutable root filesystem with an explicit package set. The GPL build system is not shipped, but the repository must retain its license/source-offer obligations for the GPL kernel and BusyBox contents when guest images are distributed.

The manifest records reproducible arm64 and x86_64 kernel and initramfs hashes. The M1 arm64 initramfs was rebuilt twice after the production frame and denial probes were added; the second build had Docker networking disabled and matched byte-for-byte. The x86_64 values remain the M0 Windows checkpoint until the separate Windows M1 stage replaces its launcher and protocol. Recording a digest does not by itself certify a platform: the current host must boot that exact guest and pass its no-NIC socket gate.
