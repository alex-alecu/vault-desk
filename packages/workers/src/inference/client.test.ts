import { spawn } from "node:child_process";
import { InferenceWorkerRequestSchema } from "@vault/shared";
import { describe, expect, it } from "vitest";
import type {
  NativeWorkerHandle,
  NativeWorkerLauncher,
  NativeWorkerLaunchRequest,
} from "../native/launcher.js";
import { WindowsNativeWorkerLauncher } from "../native/windows.js";
import { InferenceWorkerClient, InferenceWorkerError } from "./client.js";

class ScriptLauncher implements NativeWorkerLauncher {
  constructor(private readonly script: string) {}

  async launch(_request: NativeWorkerLaunchRequest): Promise<NativeWorkerHandle> {
    const child = spawn(process.execPath, ["-e", this.script], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      process: child,
      async dispose() {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      },
    };
  }
}

const probe = InferenceWorkerRequestSchema.parse({
  protocolVersion: 1,
  requestId: "test",
  jobId: "00000000-0000-4000-8000-000000000001",
  operation: "probe",
  authorityProbePath: "/private/var/empty/denied",
  outOfScopeReadPath: "/private/var/empty/read-denied",
  outOfScopeWritePath: "/private/var/empty/write-denied",
});

const largeGeneration = InferenceWorkerRequestSchema.parse({
  protocolVersion: 1,
  requestId: "large-request",
  jobId: "00000000-0000-4000-8000-000000000003",
  operation: "generate",
  modelId: "test-model",
  prompt: "x".repeat(200_000),
  jsonSchema: { type: "object" },
  contextSize: 512,
  maxTokens: 8,
});

function execute(script: string, timeoutMs = 500, signal?: AbortSignal, request = probe) {
  return new InferenceWorkerClient(new ScriptLauncher(script), "unused").execute({
    request,
    memoryBudgetBytes: 1024,
    timeoutMs,
    ...(signal === undefined ? {} : { signal }),
  });
}

describe("M2 inference worker containment", () => {
  it("contains worker crashes", async () => {
    await expect(execute("process.exit(7)")).rejects.toMatchObject({ code: "worker_crash" });
  });

  it("contains stdin errors when a worker exits before reading a large request", async () => {
    await expect(execute("process.exit(7)", 500, undefined, largeGeneration)).rejects.toMatchObject(
      { code: "worker_crash" },
    );
  });

  it("contains malformed IPC", async () => {
    const script = "process.stdout.write(Buffer.from([0,0,0,1,123]))";
    await expect(execute(script)).rejects.toMatchObject({ code: "malformed_worker_message" });
  });

  it("kills timed-out workers", async () => {
    await expect(execute("setInterval(() => {}, 1000)", 25)).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("kills cancelled workers", async () => {
    const controller = new AbortController();
    const pending = execute("setInterval(() => {}, 1000)", 500, controller.signal);
    controller.abort();
    await expect(pending).rejects.toSatisfy(
      (error) => error instanceof InferenceWorkerError && error.code === "cancelled",
    );
  });

  it("reports the pending Windows launcher as typed unsupported", async () => {
    await expect(
      new WindowsNativeWorkerLauncher().launch({
        workerEntryPath: "unused",
        memoryBudgetBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "unsupported" });
  });
});
