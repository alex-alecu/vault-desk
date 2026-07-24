import type {
  EmbeddingRequest,
  EmbeddingResult,
  InferenceProfile,
  InferenceWorkerRequest,
  InferenceWorkerResponse,
  ModelRuntimeStatus,
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
  onThinkingDelta?(text: string): void;
}

export interface InferencePort {
  execute(execution: InferenceExecution): Promise<InferenceWorkerResponse>;
  unload(): Promise<boolean>;
}

export interface InferenceService {
  generate(
    input: GenerationInput,
    signal?: AbortSignal,
    onThinkingDelta?: (text: string) => void,
  ): Promise<StructuredGenerationResult>;
  embed(input: EmbeddingInput, signal?: AbortSignal): Promise<EmbeddingResult>;
  modelStatus(): Promise<ModelRuntimeStatus>;
  unloadModel(): Promise<boolean>;
}

export interface InferenceConfiguration {
  profile: InferenceProfile;
  modelStoreDir: string;
}
