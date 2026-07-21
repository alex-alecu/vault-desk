import { z } from "zod";
import { AgentExecutionResultSchema, AgentLanguageSchema } from "./agent.js";
import { VaultErrorSchema } from "./errors.js";
import { JobIdSchema, RequestIdSchema } from "./ids.js";

export const WorkerLimitsSchema = z.object({
  wallTimeMs: z.number().int().positive().max(300_000),
  inputCount: z.number().int().nonnegative().max(32),
  inputBytes: z
    .number()
    .int()
    .nonnegative()
    .max(8 * 1024 * 1024 * 1024),
  memoryBytes: z
    .number()
    .int()
    .min(256 * 1024 * 1024)
    .max(64 * 1024 * 1024 * 1024),
  scratchBytes: z
    .number()
    .int()
    .nonnegative()
    .max(8 * 1024 * 1024 * 1024),
  outputBytes: z
    .number()
    .int()
    .positive()
    .max(64 * 1024 * 1024),
  cpuCount: z.number().int().positive().max(8),
});

export const WorkerRequestSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
  jobId: JobIdSchema,
  operation: z.literal("probe"),
});

export const AgentGuestInputSchema = z.object({
  name: z.string().min(1).max(255),
  byteLength: z
    .number()
    .int()
    .nonnegative()
    .max(512 * 1024 * 1024),
});

export const AgentGuestRequestSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
  jobId: JobIdSchema,
  operation: z.literal("execute"),
  language: AgentLanguageSchema,
  code: z.string().min(1).max(128_000),
  inputs: z.array(AgentGuestInputSchema).max(32),
  limits: z.object({
    wallTimeMs: z.number().int().positive().max(300_000),
    memoryBytes: z
      .number()
      .int()
      .positive()
      .max(64 * 1024 * 1024 * 1024),
    scratchBytes: z
      .number()
      .int()
      .nonnegative()
      .max(8 * 1024 * 1024 * 1024),
    outputBytes: z
      .number()
      .int()
      .positive()
      .max(64 * 1024 * 1024),
  }),
});

export const NetworkDenialProbeSchema = z.object({
  dnsBlocked: z.literal(true),
  hostBlocked: z.literal(true),
  ipv4Blocked: z.literal(true),
  ipv6Blocked: z.literal(true),
  lanBlocked: z.literal(true),
  multicastBlocked: z.literal(true),
});

export const WorkerResultSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
  status: z.literal("ok"),
  nonLoopbackNetworkDeviceCount: z.number().int().nonnegative(),
  transport: z.literal("vsock"),
  probes: NetworkDenialProbeSchema,
});

export const WorkerFailureSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
  status: z.literal("error"),
  error: VaultErrorSchema,
});

export const AgentGuestResultSchema = z.object({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
  status: z.literal("ok"),
  nonLoopbackNetworkDeviceCount: z.number().int().nonnegative(),
  transport: z.literal("vsock"),
  execution: AgentExecutionResultSchema,
});

export const WorkerFrameSchema = z.union([
  WorkerRequestSchema,
  AgentGuestRequestSchema,
  WorkerResultSchema,
  AgentGuestResultSchema,
  WorkerFailureSchema,
]);

export const MicroVmProbeReportSchema = z.object({
  classification: z.enum(["certified", "compatible_unverified"]),
  networkDeviceCount: z.number().int().nonnegative(),
  socketDeviceCount: z.number().int().nonnegative(),
  readOnlyInputCount: z.number().int().nonnegative(),
  scratchBytes: z.number().int().nonnegative(),
  guest: WorkerResultSchema,
});

export const MicroVmAgentReportSchema = z.object({
  classification: z.enum(["certified", "compatible_unverified"]),
  networkDeviceCount: z.number().int().nonnegative(),
  socketDeviceCount: z.number().int().nonnegative(),
  readOnlyInputCount: z.number().int().nonnegative(),
  scratchBytes: z.number().int().nonnegative(),
  guest: AgentGuestResultSchema,
});

export type WorkerLimits = z.infer<typeof WorkerLimitsSchema>;
export type WorkerFrame = z.infer<typeof WorkerFrameSchema>;
export type MicroVmProbeReport = z.infer<typeof MicroVmProbeReportSchema>;
export type AgentGuestInput = z.infer<typeof AgentGuestInputSchema>;
export type AgentGuestRequest = z.infer<typeof AgentGuestRequestSchema>;
export type AgentGuestResult = z.infer<typeof AgentGuestResultSchema>;
export type MicroVmAgentReport = z.infer<typeof MicroVmAgentReportSchema>;
