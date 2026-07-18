import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdtemp, open, readFile, rm, stat, truncate } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { JobIdSchema, MicroVmProbeReportSchema, WorkerLimitsSchema } from "@vault/shared";
import type { MicroVmLauncher, MicroVmLaunchRequest, MicroVmLaunchResult } from "./launcher.js";

interface ImageManifest {
  outputs: {
    aarch64: {
      kernelFile: string;
      kernelSha256: string;
      initramfsFile: string;
      initramfsSha256: string;
    };
  };
}

async function verifiedArtifacts(): Promise<{ kernel: string; initramfs: string }> {
  const root = join(process.cwd(), "packages/workers/images");
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as ImageManifest;
  const output = manifest.outputs.aarch64;
  const artifacts = join(root, ".generated", "artifacts", "aarch64");
  const kernel = join(artifacts, output.kernelFile);
  const initramfs = join(artifacts, output.initramfsFile);
  if ((await digest(kernel)) !== output.kernelSha256)
    throw new Error("Guest kernel hash mismatch.");
  if ((await digest(initramfs)) !== output.initramfsSha256)
    throw new Error("Guest initramfs hash mismatch.");
  return { kernel, initramfs };
}

async function digest(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function stageInputs(paths: string[], root: string): Promise<string[]> {
  const staged: string[] = [];
  for (const [index, source] of paths.entries()) {
    const destination = join(root, `input-${index}-${basename(source)}.img`);
    await copyFile(source, destination);
    const size = (await stat(destination)).size;
    await truncate(destination, Math.max(4096, Math.ceil(size / 4096) * 4096));
    staged.push(destination);
  }
  return staged;
}

function helperArguments(input: {
  artifacts: { kernel: string; initramfs: string };
  inputs: string[];
  request: MicroVmLaunchRequest;
  scratch: string;
}): string[] {
  const args = [
    "--kernel",
    input.artifacts.kernel,
    "--initramfs",
    input.artifacts.initramfs,
    "--cpus",
    String(input.request.limits.cpuCount),
    "--memory",
    String(input.request.limits.memoryBytes),
    "--scratch",
    input.scratch,
  ];
  for (const path of input.inputs) args.push("--input", path);
  return args;
}

function runHelper(helper: string, args: string[], request: MicroVmLaunchRequest): Promise<string> {
  return new Promise((accept, reject) => {
    const child = spawn(helper, args, {
      signal: request.signal,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timeout = setTimeout(() => child.kill("SIGKILL"), request.limits.wallTimeMs);
    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
      if (Buffer.byteLength(output) > request.limits.outputBytes) child.kill("SIGKILL");
    });
    child.stderr.on("data", (chunk) => {
      errorOutput += String(chunk);
      if (Buffer.byteLength(errorOutput) > request.limits.outputBytes) child.kill("SIGKILL");
    });
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) accept(output);
      else reject(new Error(errorOutput.trim() || `macOS helper exited with ${code}.`));
    });
  });
}

export class MacOsMicroVmLauncher implements MicroVmLauncher {
  constructor(private readonly helperPath: string) {}

  async launchProbe(request: MicroVmLaunchRequest): Promise<MicroVmLaunchResult> {
    if (process.platform !== "darwin" || process.arch !== "arm64") {
      throw new Error("The certified macOS backend requires Apple silicon.");
    }
    JobIdSchema.parse(request.jobId);
    WorkerLimitsSchema.parse(request.limits);
    const temporaryRoot = await mkdtemp(join(tmpdir(), `vault-worker-${request.jobId}-`));
    try {
      const inputs = await stageInputs(request.readonlyInputs, temporaryRoot);
      const scratch = join(temporaryRoot, "scratch.img");
      const scratchHandle = await open(scratch, "wx", 0o600);
      await scratchHandle.close();
      await truncate(scratch, request.limits.scratchBytes);
      const artifacts = await verifiedArtifacts();
      const args = helperArguments({
        artifacts,
        inputs,
        request,
        scratch,
      });
      const result = MicroVmProbeReportSchema.parse(
        JSON.parse(await runHelper(this.helperPath, args, request)),
      );
      const certified =
        result.networkDeviceCount === 0 &&
        result.socketDeviceCount === 1 &&
        result.readOnlyInputCount === request.readonlyInputs.length &&
        result.scratchBytes === request.limits.scratchBytes &&
        result.guest.nonLoopbackNetworkDeviceCount === 0;
      if (!certified) {
        return { ...result, classification: "compatible_unverified" };
      }
      return result;
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}
