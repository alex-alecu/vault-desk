import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface ImageManifest {
  contents: Array<{ name: string; version: string }>;
}

const HEADER_BYTES = 110;
const EXECUTABLE_ROOT = /^(?:bin|sbin|usr\/bin|usr\/sbin)\//u;

function hexadecimal(bytes: Buffer, start: number): number {
  return Number.parseInt(bytes.subarray(start, start + 8).toString("ascii"), 16);
}

function aligned(value: number): number {
  return (value + 3) & ~3;
}

export function executablePaths(archive: Buffer): string[] {
  const output: string[] = [];
  let offset = 0;
  while (offset + HEADER_BYTES <= archive.length) {
    const header = archive.subarray(offset, offset + HEADER_BYTES);
    if (header.subarray(0, 6).toString("ascii") !== "070701") {
      throw new Error("agent_initramfs_invalid");
    }
    const mode = hexadecimal(header, 14);
    const fileBytes = hexadecimal(header, 54);
    const nameBytes = hexadecimal(header, 94);
    const nameStart = offset + HEADER_BYTES;
    const name = archive.subarray(nameStart, nameStart + nameBytes - 1).toString("utf8");
    if (name === "TRAILER!!!") break;
    const fileType = mode & 0o170000;
    if (
      EXECUTABLE_ROOT.test(name) &&
      (fileType === 0o120000 || (fileType === 0o100000 && (mode & 0o111) !== 0))
    ) {
      output.push(`/${name}`);
    }
    offset = aligned(nameStart + nameBytes) + aligned(fileBytes);
  }
  return output.sort();
}

export async function generateGuestCapabilities(
  initramfsPath: string,
  manifestPath: string,
  outputPath: string,
): Promise<void> {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ImageManifest;
  const capabilities = {
    schemaVersion: 1,
    sourceMount: { path: "/source", mode: "read-only", live: true },
    workspaceMount: { path: "/workspace", mode: "read-write", maximumBytes: 128 * 1024 * 1024 },
    runtimeMount: {
      path: "/run/user",
      mode: "read-write",
      maximumBytes: 16 * 1024 * 1024,
      ephemeral: true,
    },
    shell: "/bin/sh",
    executables: executablePaths(await readFile(initramfsPath)),
    runtimes: Object.fromEntries(manifest.contents.map((item) => [item.name, item.version])),
  };
  await writeFile(outputPath, `${JSON.stringify(capabilities, null, 2)}\n`);
}

if (process.argv.includes("--write")) {
  const root = join(process.cwd(), "packages/workers/images");
  await generateGuestCapabilities(
    join(root, ".generated/agent/artifacts/aarch64/rootfs.cpio"),
    join(root, "agent/manifest.json"),
    join(root, "agent/capabilities.json"),
  );
}
