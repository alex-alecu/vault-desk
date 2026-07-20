import { z } from "zod";

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
});

export const AgentRunResultSchema = z.object({
  response: z.string().min(1),
  executions: z.array(AgentExecutionResultSchema).max(6),
});

export type AgentLanguage = z.infer<typeof AgentLanguageSchema>;
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;
export type AgentExecutionResult = z.infer<typeof AgentExecutionResultSchema>;
export type AgentRunResult = z.infer<typeof AgentRunResultSchema>;
