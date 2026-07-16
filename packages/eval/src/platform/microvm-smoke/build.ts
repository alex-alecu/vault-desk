import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

type GuestArchitecture = "aarch64" | "x86_64";

interface ImageOutput {
  kernelFile: string;
  kernelSha256: string | null;
  initramfsFile: string;
  initramfsSha256: string | null;
}

interface ImageManifest {
  builder: {
    containerImage: string;
    sourceInputs: Array<{ file: string; sha256: string }>;
    sourceSha256: string;
    sourceDateEpoch: number;
    version: string;
  };
  outputs: Record<GuestArchitecture, ImageOutput>;
}

const repositoryRoot = process.cwd();
const imageRoot = join(repositoryRoot, "packages/workers/images");
const manifestPath = join(imageRoot, "manifest.json");
const generatedRoot = join(imageRoot, ".generated");
const downloadRoot = join(generatedRoot, "downloads");
const externalRoot = join(imageRoot, "buildroot-external");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ImageManifest;

function selectedArchitecture(): GuestArchitecture {
  const index = process.argv.indexOf("--arch");
  const value =
    index === -1 ? (process.arch === "arm64" ? "aarch64" : "x86_64") : process.argv[index + 1];
  if (value !== "aarch64" && value !== "x86_64") {
    throw new Error("--arch must be aarch64 or x86_64.");
  }
  return value;
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

function dockerRun(input: {
  archivePath?: string;
  artifactRoot?: string;
  networkDisabled: boolean;
  volume: string;
}): string[] {
  const args = [
    "run",
    "--rm",
    "--user",
    "0:0",
    "--env",
    `SOURCE_DATE_EPOCH=${manifest.builder.sourceDateEpoch}`,
    "--mount",
    `type=volume,src=${input.volume},dst=/workspace`,
    "--mount",
    `type=bind,src=${downloadRoot},dst=/downloads`,
    "--mount",
    `type=bind,src=${externalRoot},dst=/external,readonly`,
  ];
  if (input.archivePath !== undefined)
    args.push("--mount", `type=bind,src=${input.archivePath},dst=/input/buildroot.tar.xz,readonly`);
  if (input.artifactRoot !== undefined)
    args.push("--mount", `type=bind,src=${input.artifactRoot},dst=/artifacts`);
  if (input.networkDisabled) args.push("--network", "none");
  args.push(manifest.builder.containerImage);
  return args;
}

function buildOutput(input: {
  architecture: GuestArchitecture;
  archivePath: string;
  networkDisabled: boolean;
  volume: string;
}): void {
  const base = dockerRun({
    archivePath: input.archivePath,
    networkDisabled: input.networkDisabled,
    volume: input.volume,
  });
  run("docker", [...base, "tar", "-xJf", "/input/buildroot.tar.xz", "-C", "/workspace"]);
  const source = `/workspace/buildroot-${manifest.builder.version}`;
  const variables = ["BR2_EXTERNAL=/external", "O=/workspace/output", "BR2_DL_DIR=/downloads"];
  run("docker", [
    ...base,
    "make",
    "-C",
    source,
    ...variables,
    `vault_probe_${input.architecture}_defconfig`,
  ]);
  run("docker", [...base, "make", "-s", "-C", source, ...variables]);
}

async function verifyDownloadedInputs(): Promise<void> {
  for (const input of manifest.builder.sourceInputs) {
    if ((await sha256(join(downloadRoot, input.file))) !== input.sha256) {
      throw new Error(`Downloaded build input SHA-256 mismatch: ${input.file}`);
    }
  }
}

async function copyOutput(volume: string, destination: string, output: ImageOutput): Promise<void> {
  await mkdir(destination, { recursive: true });
  const base = dockerRun({ artifactRoot: destination, networkDisabled: true, volume });
  run("docker", [
    ...base,
    "cp",
    `/workspace/output/images/${output.kernelFile}`,
    `/workspace/output/images/${output.initramfsFile}`,
    "/artifacts/",
  ]);
}

async function verifyPair(architecture: GuestArchitecture, roots: string[]): Promise<ImageOutput> {
  const expected = manifest.outputs[architecture];
  const [firstRoot, secondRoot] = roots;
  if (firstRoot === undefined || secondRoot === undefined)
    throw new Error("Missing build comparison root.");
  const first = {
    kernel: await sha256(join(firstRoot, expected.kernelFile)),
    initramfs: await sha256(join(firstRoot, expected.initramfsFile)),
  };
  const second = {
    kernel: await sha256(join(secondRoot, expected.kernelFile)),
    initramfs: await sha256(join(secondRoot, expected.initramfsFile)),
  };
  if (first.kernel !== second.kernel || first.initramfs !== second.initramfs) {
    throw new Error("Independent guest builds were not byte-for-byte reproducible.");
  }
  if (expected.kernelSha256 !== null && expected.kernelSha256 !== first.kernel) {
    throw new Error("Recorded guest kernel SHA-256 does not match the reproducible build.");
  }
  if (expected.initramfsSha256 !== null && expected.initramfsSha256 !== first.initramfs) {
    throw new Error("Recorded guest initramfs SHA-256 does not match the reproducible build.");
  }
  return { ...expected, kernelSha256: first.kernel, initramfsSha256: first.initramfs };
}

async function installArtifacts(
  architecture: GuestArchitecture,
  output: ImageOutput,
  source: string,
) {
  const artifactRoot = join(generatedRoot, "artifacts", architecture);
  await mkdir(artifactRoot, { recursive: true });
  await copyFile(join(source, output.kernelFile), join(artifactRoot, output.kernelFile));
  await copyFile(join(source, output.initramfsFile), join(artifactRoot, output.initramfsFile));
}

const archivePath = process.env.VAULT_BUILDROOT_ARCHIVE;
if (archivePath === undefined)
  throw new Error("Set VAULT_BUILDROOT_ARCHIVE to the pinned Buildroot source archive.");
const resolvedArchive = resolve(archivePath);
if ((await sha256(resolvedArchive)) !== manifest.builder.sourceSha256) {
  throw new Error("Buildroot source SHA-256 mismatch.");
}

const architecture = selectedArchitecture();
const volumePrefix = `vault-desk-m0-${architecture}-${process.pid}`;
const volumes: [string, string] = [`${volumePrefix}-first`, `${volumePrefix}-second`];
const comparisonRoots: [string, string] = [
  join(generatedRoot, "comparison", "first"),
  join(generatedRoot, "comparison", "second"),
];
await rm(join(generatedRoot, "comparison"), { recursive: true, force: true });
await mkdir(downloadRoot, { recursive: true });
try {
  for (const volume of volumes) run("docker", ["volume", "create", volume]);
  buildOutput({
    architecture,
    archivePath: resolvedArchive,
    networkDisabled: false,
    volume: volumes[0],
  });
  await verifyDownloadedInputs();
  buildOutput({
    architecture,
    archivePath: resolvedArchive,
    networkDisabled: true,
    volume: volumes[1],
  });
  await copyOutput(volumes[0], comparisonRoots[0], manifest.outputs[architecture]);
  await copyOutput(volumes[1], comparisonRoots[1], manifest.outputs[architecture]);
  const output = await verifyPair(architecture, comparisonRoots);
  await installArtifacts(architecture, output, comparisonRoots[0]);
  console.log(JSON.stringify({ architecture, ...output }));
} finally {
  for (const volume of volumes) run("docker", ["volume", "rm", "--force", volume]);
}
