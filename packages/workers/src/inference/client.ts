import type { InferenceWorkerRequest, InferenceWorkerResponse } from "@vault/shared";
import type { NativeWorkerHandle, NativeWorkerLauncher } from "../native/launcher.js";
import { encodeInferenceRequest, InferenceResponseDecoder } from "./frames.js";

export interface InferenceExecution {
  request: InferenceWorkerRequest;
  modelPath?: string;
  memoryBudgetBytes: number;
  timeoutMs: number;
  signal?: AbortSignal;
}

export class InferenceWorkerError extends Error {
  constructor(
    readonly code: "cancelled" | "timeout" | "malformed_worker_message" | "worker_crash",
    message: string,
  ) {
    super(message);
  }
}

function isCancelled(signal?: AbortSignal): boolean {
  return signal?.aborted ?? false;
}

class WorkerExchange {
  private readonly decoder = new InferenceResponseDecoder();
  private response?: InferenceWorkerResponse;
  private settled = false;
  private stderr = "";
  private timer?: NodeJS.Timeout;
  private accept?: (response: InferenceWorkerResponse) => void;
  private reject?: (error: Error) => void;

  constructor(
    private readonly child: NativeWorkerHandle["process"],
    private readonly execution: InferenceExecution,
  ) {}

  run(): Promise<InferenceWorkerResponse> {
    return new Promise((accept, reject) => {
      this.accept = accept;
      this.reject = reject;
      this.timer = setTimeout(
        () => this.fail("timeout", "Inference timed out."),
        this.execution.timeoutMs,
      );
      this.execution.signal?.addEventListener("abort", this.cancelled, { once: true });
      this.child.stderr.on("data", this.errorOutput);
      this.child.stdout.on("data", this.responseOutput);
      this.child.once("error", (error) => this.fail("worker_crash", error.message));
      this.child.once("close", (code) => this.closed(code));
      this.child.stdin.end(encodeInferenceRequest(this.execution.request));
    });
  }

  private readonly cancelled = (): void => this.fail("cancelled", "Inference cancelled.");

  private readonly errorOutput = (chunk: Buffer): void => {
    if (this.stderr.length < 65_536) this.stderr += String(chunk);
  };

  private readonly responseOutput = (chunk: Buffer): void => {
    try {
      const responses = this.decoder.push(chunk);
      if (responses.length === 0) return;
      if (responses.length !== 1 || this.response !== undefined) {
        throw new Error("Worker emitted multiple responses.");
      }
      const response = responses[0];
      if (response === undefined || response.requestId !== this.execution.request.requestId) {
        throw new Error("Inference response request ID mismatch.");
      }
      this.response = response;
    } catch (error) {
      this.fail(
        "malformed_worker_message",
        error instanceof Error ? error.message : "Malformed worker message.",
      );
    }
  };

  private closed(code: number | null): void {
    if (this.settled) return;
    try {
      this.decoder.finish();
    } catch (error) {
      this.fail(
        "malformed_worker_message",
        error instanceof Error ? error.message : "Malformed worker message.",
      );
      return;
    }
    const exit = `worker exit=${String(code)} signal=${String(this.child.signalCode)}`;
    if (code !== 0 || this.response === undefined) {
      this.fail(
        "worker_crash",
        this.stderr.trim() === "" ? exit : `${this.stderr.trim()}\n${exit}`,
      );
      return;
    }
    this.finish(() => this.accept?.(this.response as InferenceWorkerResponse));
  }

  private fail(code: InferenceWorkerError["code"], message: string): void {
    this.child.kill("SIGKILL");
    this.finish(() => this.reject?.(new InferenceWorkerError(code, message)));
  }

  private finish(callback: () => void): void {
    if (this.settled) return;
    this.settled = true;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.execution.signal?.removeEventListener("abort", this.cancelled);
    callback();
  }
}

export class InferenceWorkerClient {
  constructor(
    private readonly launcher: NativeWorkerLauncher,
    private readonly workerEntryPath: string,
  ) {}

  async execute(execution: InferenceExecution): Promise<InferenceWorkerResponse> {
    if (isCancelled(execution.signal)) {
      throw new InferenceWorkerError("cancelled", "Inference cancelled.");
    }
    const handle = await this.launcher.launch({
      workerEntryPath: this.workerEntryPath,
      ...(execution.modelPath === undefined ? {} : { modelPath: execution.modelPath }),
      memoryBudgetBytes: execution.memoryBudgetBytes,
    });
    try {
      if (isCancelled(execution.signal)) {
        throw new InferenceWorkerError("cancelled", "Inference cancelled.");
      }
      return await new WorkerExchange(handle.process, execution).run();
    } finally {
      await handle.dispose();
    }
  }
}
