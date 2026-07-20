import type {
  EmbeddingRequest,
  EmbeddingResult,
  InferenceProfile,
  InferenceWorkerRequest,
  InferenceWorkerResponse,
  StructuredGenerationRequest,
  StructuredGenerationResult,
} from "@vault/shared";

export type GenerationInput = Omit<
  StructuredGenerationRequest,
  "protocolVersion" | "requestId" | "jobId" | "operation"
>;
export type EmbeddingInput = Omit<
  EmbeddingRequest,
  "protocolVersion" | "requestId" | "jobId" | "operation"
>;

export interface InferenceExecution {
  request: InferenceWorkerRequest;
  modelPath?: string;
  memoryBudgetBytes: number;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface InferencePort {
  execute(execution: InferenceExecution): Promise<InferenceWorkerResponse>;
}

export interface InferenceService {
  generate(input: GenerationInput, signal?: AbortSignal): Promise<StructuredGenerationResult>;
  embed(input: EmbeddingInput, signal?: AbortSignal): Promise<EmbeddingResult>;
}

export interface InferenceConfiguration {
  profile: InferenceProfile;
  modelStoreDir: string;
}
