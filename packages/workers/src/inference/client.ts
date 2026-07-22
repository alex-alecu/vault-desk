import type {
  InferenceWorkerMessage,
  InferenceWorkerRequest,
  InferenceWorkerResponse,
} from "@vault/shared";
import type { NativeWorkerHandle, NativeWorkerLauncher } from "../native/launcher.js";
import { encodeInferenceRequest, InferenceResponseDecoder } from "./frames.js";

export interface InferenceExecution {
  request: InferenceWorkerRequest;
  modelPath?: string;
  memoryBudgetBytes: number;
  timeoutMs: number;
  signal?: AbortSignal;
  onThinkingDelta?(text: string): void;
}

export class InferenceWorkerError extends Error {
  constructor(
    readonly code: "cancelled" | "timeout" | "malformed_worker_message" | "worker_crash",
    message: string,
  ) {
    super(message);
  }
}

function abortCode(signal?: AbortSignal): "cancelled" | "timeout" {
  if (signal?.reason instanceof DOMException && signal.reason.name === "TimeoutError") {
    return "timeout";
  }
  if (
    signal?.reason instanceof Error &&
    "code" in signal.reason &&
    signal.reason.code === "timeout"
  ) {
    return "timeout";
  }
  return "cancelled";
}

interface PendingExchange {
  execution: InferenceExecution;
  accept(response: InferenceWorkerResponse): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
  cancelled(): void;
}

class ResidentWorker {
  private readonly decoder = new InferenceResponseDecoder();
  private pending: PendingExchange | undefined;
  private stderr = "";
  private stopped = false;

  constructor(
    private readonly handle: NativeWorkerHandle,
    readonly modelPath: string | undefined,
    readonly memoryBudgetBytes: number,
    private readonly onStopped: () => void,
  ) {
    handle.process.stderr.on("data", this.errorOutput);
    handle.process.stdout.on("data", this.responseOutput);
    handle.process.stdin.on("error", this.inputError);
    handle.process.once("error", this.workerError);
    handle.process.once("close", this.closed);
  }

  get busy(): boolean {
    return this.pending !== undefined;
  }

  execute(execution: InferenceExecution): Promise<InferenceWorkerResponse> {
    if (this.pending !== undefined) {
      return Promise.reject(new InferenceWorkerError("worker_crash", "Inference worker is busy."));
    }
    let frame: Buffer;
    try {
      frame = encodeInferenceRequest(execution.request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Malformed inference request.";
      return Promise.reject(new InferenceWorkerError("malformed_worker_message", message));
    }
    return new Promise((accept, reject) => {
      const cancelled = () => {
        const code = abortCode(execution.signal);
        this.fail(code, code === "timeout" ? "Inference timed out." : "Inference cancelled.");
      };
      this.pending = {
        execution,
        accept,
        reject,
        cancelled,
        timer: setTimeout(() => this.fail("timeout", "Inference timed out."), execution.timeoutMs),
      };
      execution.signal?.addEventListener("abort", cancelled, { once: true });
      this.handle.process.stdin.write(frame, (error) => {
        if (error != null) this.fail("worker_crash", error.message);
      });
    });
  }

  async dispose(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.handle.dispose();
    this.onStopped();
  }

  private readonly errorOutput = (chunk: Buffer): void => {
    if (this.stderr.length < 65_536) this.stderr += String(chunk);
  };

  private readonly inputError = (error: Error): void => this.fail("worker_crash", error.message);
  private readonly workerError = (error: Error): void => this.fail("worker_crash", error.message);

  private readonly responseOutput = (chunk: Buffer): void => {
    try {
      for (const message of this.decoder.push(chunk)) this.message(message);
    } catch (error) {
      this.fail(
        "malformed_worker_message",
        error instanceof Error ? error.message : "Malformed worker message.",
      );
    }
  };

  private message(message: InferenceWorkerMessage): void {
    const pending = this.pending;
    if (pending === undefined || message.requestId !== pending.execution.request.requestId) {
      this.fail("malformed_worker_message", "Inference response request ID mismatch.");
      return;
    }
    if (message.status === "stream") {
      pending.execution.onThinkingDelta?.(message.text);
      return;
    }
    this.finish(() => pending.accept(message));
  }

  private readonly closed = (code: number | null): void => {
    if (this.stopped) return;
    this.stopped = true;
    try {
      this.decoder.finish();
    } catch (error) {
      this.fail(
        "malformed_worker_message",
        error instanceof Error ? error.message : "Malformed worker message.",
      );
      return;
    }
    const exit = `worker exit=${String(code)} signal=${String(this.handle.process.signalCode)}`;
    if (this.pending !== undefined) {
      this.fail(
        "worker_crash",
        this.stderr.trim() === "" ? exit : `${this.stderr.trim()}\n${exit}`,
      );
    }
    this.onStopped();
  };

  private fail(code: InferenceWorkerError["code"], message: string): void {
    if (!this.stopped) this.handle.process.kill("SIGKILL");
    const pending = this.pending;
    if (pending !== undefined)
      this.finish(() => pending.reject(new InferenceWorkerError(code, message)));
  }

  private finish(callback: () => void): void {
    const pending = this.pending;
    if (pending === undefined) return;
    this.pending = undefined;
    clearTimeout(pending.timer);
    pending.execution.signal?.removeEventListener("abort", pending.cancelled);
    callback();
  }
}

export class InferenceWorkerClient {
  private resident: ResidentWorker | undefined;

  constructor(
    private readonly launcher: NativeWorkerLauncher,
    private readonly workerEntryPath: string,
  ) {}

  async execute(execution: InferenceExecution): Promise<InferenceWorkerResponse> {
    if (execution.signal?.aborted) {
      const code = abortCode(execution.signal);
      throw new InferenceWorkerError(
        code,
        code === "timeout" ? "Inference timed out." : "Inference cancelled.",
      );
    }
    const worker = await this.worker(execution);
    if (execution.signal?.aborted) {
      const code = abortCode(execution.signal);
      await worker.dispose();
      throw new InferenceWorkerError(
        code,
        code === "timeout" ? "Inference timed out." : "Inference cancelled.",
      );
    }
    try {
      return await worker.execute(execution);
    } finally {
      if (execution.request.operation === "probe") await worker.dispose();
    }
  }

  async unload(): Promise<boolean> {
    const worker = this.resident;
    if (worker === undefined) return false;
    if (worker.busy) return false;
    this.resident = undefined;
    await worker.dispose();
    return true;
  }

  private async worker(execution: InferenceExecution): Promise<ResidentWorker> {
    const resident = this.resident;
    const reusable =
      execution.request.operation !== "probe" &&
      resident?.modelPath === execution.modelPath &&
      resident?.memoryBudgetBytes === execution.memoryBudgetBytes;
    if (reusable && resident !== undefined) return resident;
    if (this.resident !== undefined) {
      if (this.resident.busy)
        throw new InferenceWorkerError("worker_crash", "Inference worker is busy.");
      await this.resident.dispose();
      this.resident = undefined;
    }
    const handle = await this.launcher.launch({
      workerEntryPath: this.workerEntryPath,
      ...(execution.modelPath === undefined ? {} : { modelPath: execution.modelPath }),
      memoryBudgetBytes: execution.memoryBudgetBytes,
    });
    const worker = new ResidentWorker(
      handle,
      execution.modelPath,
      execution.memoryBudgetBytes,
      () => {
        if (this.resident === worker) this.resident = undefined;
      },
    );
    if (execution.request.operation !== "probe") this.resident = worker;
    return worker;
  }
}
