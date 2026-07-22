import { z } from "zod";
import {
  AgentArtifactIdSchema,
  AgentEventIdSchema,
  AgentRunIdSchema,
  ContentHashSchema,
  JobIdSchema,
  SessionIdSchema,
} from "./ids.js";
import { InferencePerformanceSchema } from "./inference.js";

export const AgentLanguageSchema = z.enum(["python", "node"]);

export const AgentDecisionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("execute"),
    language: AgentLanguageSchema,
    code: z.string().min(1).max(128_000),
    summary: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("respond"),
    response: z.string().min(1).max(64_000),
  }),
]);

export const AgentExecutionResultSchema = z.object({
  language: AgentLanguageSchema,
  code: z.string().min(1).max(128_000),
  exitCode: z.number().int().min(0).max(255),
  stdout: z.string().max(1_000_000),
  stderr: z.string().max(1_000_000),
  durationMs: z.number().int().nonnegative(),
  termination: z.enum(["completed", "timeout", "cancelled", "resource_limit", "crash"]),
  artifacts: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        mediaType: z.string().min(1).max(255),
        bytesBase64: z.string().max(16 * 1024 * 1024),
      }),
    )
    .max(16)
    .default([]),
});

export const AgentRunResultSchema = z.object({
  response: z.string().min(1),
  executions: z.array(AgentExecutionResultSchema).max(6),
  inference: InferencePerformanceSchema,
});

export const AgentRunPerformanceSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  tokensPerSecond: z.number().finite().nonnegative(),
  promptTokensPerSecond: z.number().finite().nonnegative(),
  totalDurationMs: z.number().int().nonnegative(),
});

export const AgentRunStateSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const AgentRunSummarySchema = z.object({
  id: AgentRunIdSchema,
  sessionId: SessionIdSchema,
  jobId: JobIdSchema,
  state: AgentRunStateSchema,
  response: z.string().max(256_000).nullable(),
  error: z.string().max(1_000).nullable(),
  performance: AgentRunPerformanceSchema.nullable().default(null),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const AgentEventTypeSchema = z.enum([
  "run.started",
  "inference.started",
  "execution.started",
  "execution.completed",
  "assistant.completed",
  "run.failed",
  "run.cancelled",
]);

export const AgentEventSchema = z.object({
  id: AgentEventIdSchema,
  runId: AgentRunIdSchema,
  sequence: z.number().int().nonnegative(),
  type: AgentEventTypeSchema,
  summary: z.string().min(1).max(1_000),
  language: AgentLanguageSchema.nullable().default(null),
  code: z.string().max(128_000).nullable().default(null),
  stdout: z.string().max(1_000_000).nullable().default(null),
  stderr: z.string().max(1_000_000).nullable().default(null),
  termination: z
    .enum(["completed", "timeout", "cancelled", "resource_limit", "crash"])
    .nullable()
    .default(null),
  createdAt: z.iso.datetime(),
});

export const AgentArtifactSummarySchema = z.object({
  id: AgentArtifactIdSchema,
  runId: AgentRunIdSchema,
  name: z.string().min(1).max(255),
  mediaType: z.string().min(1).max(255),
  byteLength: z
    .number()
    .int()
    .nonnegative()
    .max(64 * 1024 * 1024),
  contentHash: ContentHashSchema,
  createdAt: z.iso.datetime(),
});

export const AgentRunSnapshotSchema = z.object({
  run: AgentRunSummarySchema,
  events: z.array(AgentEventSchema).max(1_000),
  artifacts: z.array(AgentArtifactSummarySchema).max(100),
  thinking: z.string().max(64_000).nullable().default(null),
});

export type AgentLanguage = z.infer<typeof AgentLanguageSchema>;
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;
export type AgentExecutionResult = z.infer<typeof AgentExecutionResultSchema>;
export type AgentRunResult = z.infer<typeof AgentRunResultSchema>;
export type AgentRunPerformance = z.infer<typeof AgentRunPerformanceSchema>;
export type AgentRunState = z.infer<typeof AgentRunStateSchema>;
export type AgentRunSummary = z.infer<typeof AgentRunSummarySchema>;
export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type AgentEventDetail = Pick<
  AgentEvent,
  "language" | "code" | "stdout" | "stderr" | "termination"
>;
export type AgentArtifactSummary = z.infer<typeof AgentArtifactSummarySchema>;
export type AgentRunSnapshot = z.infer<typeof AgentRunSnapshotSchema>;
