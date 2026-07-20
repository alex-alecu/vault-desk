import { randomUUID } from "node:crypto";
import type {
  AuditEventInput,
  EmbeddingResult,
  ErrorCode,
  InferenceOperation,
  InferenceWorkerRequest,
  RequestId,
  StructuredGenerationResult,
} from "@vault/shared";
import { ErrorCodeSchema, JobIdSchema } from "@vault/shared";
import type {
  EmbeddingInput,
  GenerationInput,
  InferencePort,
  InferenceService,
} from "./inference.js";
import type { ModelResolver } from "./models.js";
import type { ResourceScheduler } from "./scheduler.js";

type AuditAppender = (event: AuditEventInput) => void;
type ResourceLease = ReturnType<ResourceScheduler["reserve"]>;
type StagedModel = Awaited<ReturnType<ModelResolver["resolve"]>>;
const INFERENCE_TIMEOUT_MS = 300_000;

interface ActiveExecution {
  lifecycle: AbortController;
  signal: AbortSignal;
  startedAt: number;
  finish(): void;
}

class InferenceFailure extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function failureCode(error: unknown): string {
  if (error instanceof InferenceFailure) return error.code;
  if (error instanceof DOMException && error.name === "TimeoutError") return "timeout";
  if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
  if (!(error instanceof Error)) return "internal";
  const typedCode = ErrorCodeSchema.safeParse("code" in error ? error.code : undefined);
  if (typedCode.success) return typedCode.data;
  if (error.message === "missing_model") return "not_found";
  if (error.message.includes("memory")) return "out_of_memory";
  return "internal";
}

function abortFailure(signal: AbortSignal): InferenceFailure {
  const code =
    signal.reason instanceof DOMException && signal.reason.name === "TimeoutError"
      ? "timeout"
      : "cancelled";
  return new InferenceFailure(
    code,
    code === "timeout" ? "Inference timed out." : "Inference cancelled.",
  );
}

export class InferenceSupervisor implements InferenceService {
  private readonly active = new Map<AbortController, Promise<void>>();
  private closed = false;

  constructor(
    private readonly port: InferencePort,
    private readonly models: ModelResolver,
    private readonly scheduler: ResourceScheduler,
    private readonly audit: AuditAppender,
  ) {}

  private startExecution(signal?: AbortSignal): ActiveExecution {
    if (this.closed) throw new InferenceFailure("cancelled", "Inference supervisor closed.");
    const lifecycle = new AbortController();
    const operationSignal = AbortSignal.any([
      lifecycle.signal,
      AbortSignal.timeout(INFERENCE_TIMEOUT_MS),
      ...(signal === undefined ? [] : [signal]),
    ]);
    let finishExecution!: () => void;
    const finished = new Promise<void>((accept) => {
      finishExecution = () => accept();
    });
    this.active.set(lifecycle, finished);
    return { lifecycle, signal: operationSignal, startedAt: Date.now(), finish: finishExecution };
  }

  private async execute(
    request: InferenceWorkerRequest,
    execution: ActiveExecution,
    lease: ResourceLease,
    stagedModel?: StagedModel,
  ) {
    const response = await this.port.execute({
      request,
      ...(stagedModel === undefined ? {} : { modelPath: stagedModel.path }),
      memoryBudgetBytes: lease.memoryBudgetBytes,
      timeoutMs: Math.max(1, INFERENCE_TIMEOUT_MS - (Date.now() - execution.startedAt)),
      signal: execution.signal,
    });
    if (response.status === "error") {
      throw new InferenceFailure(response.error.code, response.error.message);
    }
    if (response.operation !== request.operation) {
      throw new InferenceFailure(
        "malformed_worker_message",
        "Inference response operation mismatch.",
      );
    }
    this.record({
      operation: request.operation,
      requestId: request.requestId,
      jobId: request.jobId,
      outcome: "succeeded",
    });
    return response;
  }

  private async finishExecution(
    execution: ActiveExecution,
    stagedModel?: StagedModel,
    lease?: ResourceLease,
  ): Promise<void> {
    try {
      await stagedModel?.dispose();
    } finally {
      lease?.release();
      this.active.delete(execution.lifecycle);
      execution.finish();
    }
  }

  private async run(request: InferenceWorkerRequest, signal?: AbortSignal) {
    const execution = this.startExecution(signal);
    let lease: ResourceLease | undefined;
    let stagedModel: StagedModel | undefined;
    try {
      execution.signal.throwIfAborted();
      lease = this.scheduler.reserve(request.operation);
      stagedModel =
        request.operation === "probe"
          ? undefined
          : await this.models.resolve(request.modelId, execution.signal);
      execution.signal.throwIfAborted();
      return await this.execute(request, execution, lease, stagedModel);
    } catch (error) {
      const failure = execution.signal.aborted ? abortFailure(execution.signal) : error;
      this.record({
        operation: request.operation,
        requestId: request.requestId,
        jobId: request.jobId,
        outcome: "failed",
        code: failureCode(failure),
      });
      throw failure;
    } finally {
      await this.finishExecution(execution, stagedModel, lease);
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const active = [...this.active.entries()];
    for (const [controller] of active) {
      controller.abort(new InferenceFailure("cancelled", "Inference supervisor closed."));
    }
    await Promise.all(active.map(([, finished]) => finished));
  }

  private record(input: {
    operation: InferenceOperation;
    requestId: RequestId;
    jobId: string;
    outcome: "succeeded" | "failed";
    code?: string;
  }): void {
    this.audit({
      type: `inference.${input.operation}`,
      outcome: input.outcome,
      metadata: {
        requestId: input.requestId,
        jobId: input.jobId,
        ...(input.code === undefined ? {} : { code: input.code }),
      },
    });
  }

  async generate(
    input: GenerationInput,
    signal?: AbortSignal,
  ): Promise<StructuredGenerationResult> {
    const response = await this.run(
      {
        protocolVersion: 1,
        requestId: randomUUID(),
        jobId: JobIdSchema.parse(randomUUID()),
        operation: "generate",
        ...input,
      },
      signal,
    );
    if (response.status !== "ok" || response.operation !== "generate") {
      throw new Error("unexpected_inference_response");
    }
    return response;
  }

  async embed(input: EmbeddingInput, signal?: AbortSignal): Promise<EmbeddingResult> {
    const response = await this.run(
      {
        protocolVersion: 1,
        requestId: randomUUID(),
        jobId: JobIdSchema.parse(randomUUID()),
        operation: "embed",
        ...input,
      },
      signal,
    );
    if (response.status !== "ok" || response.operation !== "embed") {
      throw new Error("unexpected_inference_response");
    }
    return response;
  }
}
