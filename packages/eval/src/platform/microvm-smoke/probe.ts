import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runNativeWindowsProbe } from "./probe.windows.js";

type Classification = "unsupported" | "compatible_unverified" | "certified";

interface ProbeReport {
  schemaVersion: 1;
  platform: NodeJS.Platform;
  architecture: string;
  classification: Classification;
  reason: string;
  noNetworkDeviceConfigured: boolean;
  typedSocketConfigured: boolean;
  guestBooted: boolean;
  socketRoundTrip: boolean;
  guestReportedNonLoopbackNetworkDeviceCount: number | null;
}

interface NativeProbe {
  networkDeviceCount: number;
  socketDeviceCount: number;
  guest: {
    nonLoopbackNetworkDeviceCount: number;
    protocolVersion: number;
    status: string;
    transport: string;
  };
}

const probeRoot = fileURLToPath(new URL(".", import.meta.url));
const generatedRoot = join(probeRoot, ".generated");

function command(commandName: string, args: string[]): string {
  const result = spawnSync(commandName, args, {
    encoding: "utf8",
    env: { ...process.env, CLANG_MODULE_CACHE_PATH: join(generatedRoot, "module-cache") },
    timeout: 60_000,
  });
  if (result.status !== 0)
    throw new Error(result.error?.message ?? result.stderr ?? `${commandName} failed`);
  return result.stdout.trim();
}

function report(
  input: Omit<ProbeReport, "schemaVersion" | "platform" | "architecture">,
): ProbeReport {
  return { schemaVersion: 1, platform: process.platform, architecture: process.arch, ...input };
}

function unbooted(
  classification: Classification,
  reason: string,
  configured = { network: false, socket: false },
): ProbeReport {
  return report({
    classification,
    reason,
    noNetworkDeviceConfigured: configured.network,
    typedSocketConfigured: configured.socket,
    guestBooted: false,
    socketRoundTrip: false,
    guestReportedNonLoopbackNetworkDeviceCount: null,
  });
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function macArtifacts(): Promise<{ kernel: string; initramfs: string } | undefined> {
  const manifest = JSON.parse(
    await readFile(join(process.cwd(), "packages/workers/images/manifest.json"), "utf8"),
  ) as {
    outputs: {
      aarch64: {
        kernelFile: string;
        kernelSha256: string | null;
        initramfsFile: string;
        initramfsSha256: string | null;
      };
    };
  };
  const output = manifest.outputs.aarch64;
  const root = join(process.cwd(), "packages/workers/images/.generated/artifacts/aarch64");
  const paths = {
    kernel: join(root, output.kernelFile),
    initramfs: join(root, output.initramfsFile),
  };
  if (
    output.kernelSha256 === null ||
    output.initramfsSha256 === null ||
    !existsSync(paths.kernel) ||
    !existsSync(paths.initramfs)
  )
    return undefined;
  if ((await sha256(paths.kernel)) !== output.kernelSha256)
    throw new Error("Pinned arm64 kernel SHA-256 mismatch.");
  if ((await sha256(paths.initramfs)) !== output.initramfsSha256)
    throw new Error("Pinned arm64 initramfs SHA-256 mismatch.");
  return paths;
}

async function windowsArtifacts(): Promise<{ kernel: string; initramfs: string } | undefined> {
  const manifest = JSON.parse(
    await readFile(join(process.cwd(), "packages/workers/images/manifest.json"), "utf8"),
  ) as {
    outputs: {
      x86_64: {
        kernelFile: string;
        kernelSha256: string | null;
        initramfsFile: string;
        initramfsSha256: string | null;
      };
    };
  };
  const output = manifest.outputs.x86_64;
  const root = join(process.cwd(), "packages/workers/images/.generated/artifacts/x86_64");
  const paths = {
    kernel: join(root, output.kernelFile),
    initramfs: join(root, output.initramfsFile),
  };
  if (
    output.kernelSha256 === null ||
    output.initramfsSha256 === null ||
    !existsSync(paths.kernel) ||
    !existsSync(paths.initramfs)
  )
    return undefined;
  if ((await sha256(paths.kernel)) !== output.kernelSha256)
    throw new Error("Pinned x86_64 kernel SHA-256 mismatch.");
  if ((await sha256(paths.initramfs)) !== output.initramfsSha256)
    throw new Error("Pinned x86_64 initramfs SHA-256 mismatch.");
  return paths;
}

async function runNativeMacProbe(kernel: string, initramfs: string): Promise<NativeProbe> {
  await mkdir(generatedRoot, { recursive: true });
  const executable = join(generatedRoot, "virtualization-config-probe");
  command("swiftc", [
    join(probeRoot, "probe.swift"),
    "-parse-as-library",
    "-framework",
    "Virtualization",
    "-o",
    executable,
  ]);
  command("codesign", [
    "--force",
    "--sign",
    "-",
    "--entitlements",
    join(probeRoot, "probe.entitlements.plist"),
    executable,
  ]);
  return JSON.parse(command(executable, [kernel, initramfs])) as NativeProbe;
}

async function probeMac(): Promise<ProbeReport> {
  const version = command("sw_vers", ["-productVersion"]);
  const supported = process.arch === "arm64" && Number.parseInt(version, 10) >= 26;
  if (!supported) return unbooted("unsupported", "Requires macOS 26 on Apple silicon.");
  const artifacts = await macArtifacts();
  if (artifacts === undefined)
    return unbooted(
      "compatible_unverified",
      "The pinned arm64 guest artifacts must be built before macOS certification.",
    );
  const native = await runNativeMacProbe(artifacts.kernel, artifacts.initramfs);
  const socketRoundTrip =
    native.guest.protocolVersion === 1 &&
    native.guest.status === "ok" &&
    native.guest.transport === "vsock";
  const noNetworkDeviceConfigured =
    native.networkDeviceCount === 0 && native.guest.nonLoopbackNetworkDeviceCount === 0;
  const certified = noNetworkDeviceConfigured && native.socketDeviceCount === 1 && socketRoundTrip;
  return report({
    classification: certified ? "certified" : "compatible_unverified",
    reason: certified
      ? "Booted the pinned guest and completed its bounded VSOCK no-NIC probe."
      : "The guest booted, but its evidence did not meet the no-NIC VSOCK certification gate.",
    noNetworkDeviceConfigured,
    typedSocketConfigured: native.socketDeviceCount === 1,
    guestBooted: true,
    socketRoundTrip,
    guestReportedNonLoopbackNetworkDeviceCount: native.guest.nonLoopbackNetworkDeviceCount,
  });
}

function windowsHostDetails(): { edition: string; hypervisor: boolean } {
  const script =
    "$e=(Get-ComputerInfo).WindowsProductName;$h=(Get-CimInstance Win32_ComputerSystem).HypervisorPresent;[pscustomobject]@{edition=$e;hypervisor=$h}|ConvertTo-Json -Compress";
  return JSON.parse(
    command("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]),
  ) as { edition: string; hypervisor: boolean };
}

function windowsProbeReport(native: NativeProbe): ProbeReport {
  const socketRoundTrip =
    native.guest.protocolVersion === 1 &&
    native.guest.status === "ok" &&
    native.guest.transport === "vsock";
  const noNetworkDeviceConfigured =
    native.networkDeviceCount === 0 && native.guest.nonLoopbackNetworkDeviceCount === 0;
  const certified = noNetworkDeviceConfigured && native.socketDeviceCount === 1 && socketRoundTrip;
  return report({
    classification: certified ? "certified" : "compatible_unverified",
    reason: certified
      ? "Booted the pinned guest and completed its bounded Hyper-V socket no-NIC probe."
      : "The guest booted, but its evidence did not meet the no-NIC Hyper-V socket gate.",
    noNetworkDeviceConfigured,
    typedSocketConfigured: native.socketDeviceCount === 1,
    guestBooted: true,
    socketRoundTrip,
    guestReportedNonLoopbackNetworkDeviceCount: native.guest.nonLoopbackNetworkDeviceCount,
  });
}

async function probeWindows(): Promise<ProbeReport> {
  const details = windowsHostDetails();
  const supportedEdition = /Pro|Enterprise|Server/u.test(details.edition);
  if (!supportedEdition || !details.hypervisor)
    return report({
      classification: "unsupported",
      reason: "Requires a supported Windows edition with Hyper-V active.",
      noNetworkDeviceConfigured: false,
      typedSocketConfigured: false,
      guestBooted: false,
      socketRoundTrip: false,
      guestReportedNonLoopbackNetworkDeviceCount: null,
    });
  const artifacts = await windowsArtifacts();
  if (artifacts === undefined)
    return unbooted(
      "compatible_unverified",
      "The pinned x86_64 guest artifacts must be built before Windows certification.",
    );
  const native = await runNativeWindowsProbe(artifacts.kernel, artifacts.initramfs);
  return windowsProbeReport(native);
}

async function runProbe(): Promise<ProbeReport> {
  try {
    if (process.platform === "darwin") return await probeMac();
    if (process.platform === "win32") return await probeWindows();
    return report({
      classification: "unsupported",
      reason: "M0 desktop certification targets only macOS and Windows.",
      noNetworkDeviceConfigured: false,
      typedSocketConfigured: false,
      guestBooted: false,
      socketRoundTrip: false,
      guestReportedNonLoopbackNetworkDeviceCount: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n", 1)[0] : "unknown error";
    return report({
      classification: "compatible_unverified",
      reason: `Platform probe failed: ${message}`,
      noNetworkDeviceConfigured: false,
      typedSocketConfigured: false,
      guestBooted: false,
      socketRoundTrip: false,
      guestReportedNonLoopbackNetworkDeviceCount: null,
    });
  }
}

if (!existsSync(join(process.cwd(), "packages/workers/images/manifest.json"))) {
  throw new Error("Missing pinned probe-image manifest.");
}

const result = await runProbe();
console.log(JSON.stringify(result));
if (process.argv.includes("--require-certified") && result.classification !== "certified") {
  process.exitCode = 1;
}
