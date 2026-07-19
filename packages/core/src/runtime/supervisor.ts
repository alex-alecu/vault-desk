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
  if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
  if (!(error instanceof Error)) return "internal";
  const typedCode = ErrorCodeSchema.safeParse("code" in error ? error.code : undefined);
  if (typedCode.success) return typedCode.data;
  if (error.message === "missing_model") return "not_found";
  if (error.message.includes("memory")) return "out_of_memory";
  return "internal";
}

export class InferenceSupervisor implements InferenceService {
  constructor(
    private readonly port: InferencePort,
    private readonly models: ModelResolver,
    private readonly scheduler: ResourceScheduler,
    private readonly audit: AuditAppender,
  ) {}

  private async run(request: InferenceWorkerRequest, signal?: AbortSignal) {
    const lease = this.scheduler.reserve(request.operation);
    let stagedModel: Awaited<ReturnType<ModelResolver["resolve"]>> | undefined;
    try {
      stagedModel =
        request.operation === "probe" ? undefined : await this.models.resolve(request.modelId);
      const response = await this.port.execute({
        request,
        ...(stagedModel === undefined ? {} : { modelPath: stagedModel.path }),
        memoryBudgetBytes: lease.memoryBudgetBytes,
        timeoutMs: 300_000,
        ...(signal === undefined ? {} : { signal }),
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
    } catch (error) {
      this.record({
        operation: request.operation,
        requestId: request.requestId,
        jobId: request.jobId,
        outcome: "failed",
        code: failureCode(error),
      });
      throw error;
    } finally {
      try {
        await stagedModel?.dispose();
      } finally {
        lease.release();
      }
    }
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
