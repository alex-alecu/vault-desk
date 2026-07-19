import { z } from "zod";
import { VaultErrorSchema } from "./errors.js";
import { JobIdSchema, RequestIdSchema } from "./ids.js";

export const InferenceProfileSchema = z.enum(["local12", "local16"]);
export const InferenceOperationSchema = z.enum(["generate", "embed", "probe"]);

const JsonSchemaSchema = z.record(z.string(), z.unknown());
const RequestBaseSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
  jobId: JobIdSchema,
});

export const StructuredGenerationRequestSchema = RequestBaseSchema.extend({
  operation: z.literal("generate"),
  modelId: z.string().min(1),
  prompt: z.string().min(1).max(256_000),
  jsonSchema: JsonSchemaSchema,
  contextSize: z.number().int().min(512).max(131_072),
  maxTokens: z.number().int().positive().max(4_096),
});

export const EmbeddingRequestSchema = RequestBaseSchema.extend({
  operation: z.literal("embed"),
  modelId: z.string().min(1),
  input: z.string().min(1).max(256_000),
  contextSize: z.number().int().min(128).max(32_768),
});

export const NativeWorkerProbeRequestSchema = RequestBaseSchema.extend({
  operation: z.literal("probe"),
  authorityProbePath: z.string().min(1),
  outOfScopeWritePath: z.string().min(1),
});

export const InferenceWorkerRequestSchema = z.discriminatedUnion("operation", [
  StructuredGenerationRequestSchema,
  EmbeddingRequestSchema,
  NativeWorkerProbeRequestSchema,
]);

export const InferenceMemoryReportSchema = z.object({
  cpuRamBytes: z.number().int().nonnegative(),
  gpuVramBytes: z.number().int().nonnegative(),
  budgetBytes: z.number().int().positive(),
});

const ResponseBaseSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
  status: z.literal("ok"),
});

export const StructuredGenerationResultSchema = ResponseBaseSchema.extend({
  operation: z.literal("generate"),
  value: z.unknown(),
  memory: InferenceMemoryReportSchema,
});

export const EmbeddingResultSchema = ResponseBaseSchema.extend({
  operation: z.literal("embed"),
  vector: z.array(z.number().finite()).min(1),
  memory: InferenceMemoryReportSchema,
});

export const NativeWorkerProbeResultSchema = ResponseBaseSchema.extend({
  operation: z.literal("probe"),
  networkDenied: z.literal(true),
  credentialEnvironmentAbsent: z.literal(true),
  shellEnvironmentAbsent: z.literal(true),
  workspaceDenied: z.literal(true),
  outOfScopeWriteDenied: z.literal(true),
  executableToolsDenied: z.literal(true),
  nodeReexecDenied: z.literal(true),
});

export const InferenceWorkerFailureSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
  status: z.literal("error"),
  error: VaultErrorSchema,
});

export const InferenceWorkerResponseSchema = z.union([
  StructuredGenerationResultSchema,
  EmbeddingResultSchema,
  NativeWorkerProbeResultSchema,
  InferenceWorkerFailureSchema,
]);

export type InferenceProfile = z.infer<typeof InferenceProfileSchema>;
export type InferenceOperation = z.infer<typeof InferenceOperationSchema>;
export type StructuredGenerationRequest = z.infer<typeof StructuredGenerationRequestSchema>;
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;
export type InferenceWorkerRequest = z.infer<typeof InferenceWorkerRequestSchema>;
export type InferenceWorkerResponse = z.infer<typeof InferenceWorkerResponseSchema>;
export type StructuredGenerationResult = z.infer<typeof StructuredGenerationResultSchema>;
export type EmbeddingResult = z.infer<typeof EmbeddingResultSchema>;
