import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type {
  NativeWorkerHandle,
  NativeWorkerLauncher,
  NativeWorkerLaunchRequest,
} from "./launcher.js";

function literal(path: string): string {
  return JSON.stringify(resolve(path));
}

function credentialPaths(): string[] {
  return [
    ".aws",
    ".azure",
    ".config/gcloud",
    ".config/gh",
    ".docker",
    ".kube",
    ".netrc",
    ".npmrc",
    ".ssh",
    "Library/Keychains",
  ].map((path) => join(homedir(), path));
}

function runtimeReadPaths(workerEntryPath: string): string[] {
  const workerDirectory = dirname(workerEntryPath);
  return [
    resolve(workerDirectory, ".."),
    resolve(workerDirectory, "../..", "node_modules"),
    resolve(workerDirectory, "../../..", "shared"),
    resolve(workerDirectory, "../../../..", "node_modules"),
  ];
}

function homeDataDeny(readPaths: string[], modelPath?: string): string {
  const exceptions = [
    ...readPaths.map((path) => `(subpath ${literal(path)})`),
    ...(modelPath === undefined ? [] : [`(literal ${literal(modelPath)})`]),
  ];
  return `(deny file-read-data (require-all (subpath ${literal(homedir())}) ${exceptions
    .map((rule) => `(require-not ${rule})`)
    .join(" ")}))`;
}

function sandboxProfile(
  request: NativeWorkerLaunchRequest,
  temporaryRoot: string,
  deniedPaths: string[],
): string {
  const runtimeExecutables = [process.execPath];
  const protectedRules = [...deniedPaths, ...credentialPaths()]
    .map((path) => `(subpath ${literal(path)})`)
    .join(" ");
  const readPaths = runtimeReadPaths(request.workerEntryPath);
  return [
    "(version 1)",
    "(allow default)",
    "(deny network*)",
    '(deny mach-lookup (global-name "com.apple.securityd"))',
    homeDataDeny(readPaths, request.modelPath),
    ...(protectedRules === "" ? [] : [`(deny file-read* ${protectedRules})`]),
    `(deny file-write* (require-not (subpath ${literal(temporaryRoot)})))`,
    "(deny process-fork)",
    "(deny process-exec)",
    `(allow process-exec ${runtimeExecutables.map((path) => `(literal ${literal(path)})`).join(" ")})`,
    ...readPaths.map((path) => `(allow file-read* (subpath ${literal(path)}))`),
    ...(request.modelPath === undefined
      ? []
      : [`(allow file-read* (literal ${literal(request.modelPath)}))`]),
    `(allow file-read* (subpath ${literal(temporaryRoot)}))`,
    `(allow file-write* (subpath ${literal(temporaryRoot)}))`,
  ].join("\n");
}

export class MacOsNativeWorkerLauncher implements NativeWorkerLauncher {
  constructor(private readonly deniedPaths: string[] = []) {}

  async launch(request: NativeWorkerLaunchRequest): Promise<NativeWorkerHandle> {
    if (process.platform !== "darwin" || process.arch !== "arm64") {
      throw new Error("unsupported_native_worker_platform");
    }
    const temporaryRoot = await mkdtemp(join(tmpdir(), "vault-inference-"));
    const args = [
      "-p",
      sandboxProfile(request, temporaryRoot, this.deniedPaths),
      process.execPath,
      "--conditions=vault-runtime",
      request.workerEntryPath,
      "--memory-budget",
      String(request.memoryBudgetBytes),
    ];
    if (request.modelPath !== undefined) args.push("--model", request.modelPath);
    const child = spawn("/usr/bin/sandbox-exec", args, {
      cwd: temporaryRoot,
      env: {
        HOME: temporaryRoot,
        TMPDIR: temporaryRoot,
        PATH: "/usr/bin:/bin",
        NODE_NO_WARNINGS: "1",
        NODE_LLAMA_CPP_GPU: "metal",
        NODE_LLAMA_CPP_SKIP_DOWNLOAD: "true",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let disposed = false;
    return {
      process: child,
      async dispose() {
        if (disposed) return;
        disposed = true;
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        await new Promise<void>((accept) => {
          if (child.exitCode !== null || child.signalCode !== null) accept();
          else child.once("close", () => accept());
        });
        await rm(temporaryRoot, { recursive: true, force: true });
      },
    };
  }
}
