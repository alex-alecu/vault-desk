# MicroVM Probe Image

M0 selects Buildroot 2026.05 to produce the minimal Linux kernel and initramfs used by the provisional no-NIC platform probes. Buildroot is build tooling, not a runtime or shipped package manager. Its source archive is pinned by URL and SHA-256 in `manifest.json`.

The image contains only the kernel, BusyBox userspace, the virtio/Hyper-V socket drivers required by the selected platforms, and the fixed probe entrypoint. It contains no package manager, network client, DNS configuration, shell authority exposed to the host, customer data, model, parser, or persistent state. The guest entrypoint accepts one length-prefixed JSON probe frame, returns one bounded JSON result, and powers off.

The build runs in Buildroot's release-pinned CI image locked by registry digest, sets a fixed source date epoch, disables IP and wireless kernel features, and emits architecture-specific kernel and initramfs artifacts. The first build may fetch Buildroot-verified inputs; the independent second build has Docker networking disabled and must be byte-identical. Transient build trees use disposable Linux-native Docker volumes. Artifacts are ignored and are not committed.

Buildroot was selected over a general distribution image because it emits a smaller immutable root filesystem with an explicit package set. The GPL build system is not shipped, but the repository must retain its license/source-offer obligations for the GPL kernel and BusyBox contents when guest images are distributed.

The manifest records reproducible arm64 and x86_64 kernel and initramfs hashes. The Windows checkpoint produced matching x86_64 outputs from two independent builds, including one build with Docker networking disabled. Recording a digest does not by itself certify the platform: the current host must still boot that exact guest and pass the Hyper-V socket no-NIC probe.
