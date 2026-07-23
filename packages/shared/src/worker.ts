import { z } from "zod";
import { AgentExecutionResultSchema, AgentWorkspacePathSchema } from "./agent.js";
import { VaultErrorSchema } from "./errors.js";
import { JobIdSchema, RequestIdSchema } from "./ids.js";

export const WorkerLimitsSchema = z.object({
  wallTimeMs: z.number().int().positive().max(300_000),
  inputCount: z.number().int().nonnegative().max(64),
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
  deviceIndex: z.number().int().nonnegative().max(7),
  byteOffset: z
    .number()
    .int()
    .nonnegative()
    .max(8 * 1024 * 1024 * 1024),
});

const AgentWorkspaceEntrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("directory"), path: AgentWorkspacePathSchema }),
  z.object({
    kind: z.literal("file"),
    path: AgentWorkspacePathSchema,
    contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
    bytesBase64: z.string().max(180 * 1024 * 1024),
  }),
]);

const AgentWorkspaceDeltaSchema = z
  .object({
    entries: z.array(AgentWorkspaceEntrySchema).max(10_000),
    removedPaths: z.array(AgentWorkspacePathSchema).max(10_000),
  })
  .superRefine((delta, context) => {
    const paths = new Set<string>();
    for (const path of [...delta.entries.map((entry) => entry.path), ...delta.removedPaths]) {
      if (paths.has(path))
        context.addIssue({ code: "custom", message: "duplicate_workspace_path" });
      paths.add(path);
    }
  });

const AgentGuestLimitsSchema = z.object({
  wallTimeMs: z.number().int().positive().max(300_000),
  memoryBytes: z
    .number()
    .int()
    .positive()
    .max(64 * 1024 * 1024 * 1024),
  scratchBytes: z
    .number()
    .int()
    .positive()
    .max(128 * 1024 * 1024),
  outputBytes: z
    .number()
    .int()
    .positive()
    .max(64 * 1024 * 1024),
});

export const AgentGuestHelloRequestSchema = z.object({
  protocolVersion: z.literal(2),
  requestId: RequestIdSchema,
  jobId: JobIdSchema,
  operation: z.literal("hello"),
  inputs: z.array(AgentGuestInputSchema).max(64),
  limits: AgentGuestLimitsSchema,
});

export const AgentGuestHydrateRequestSchema = z.object({
  protocolVersion: z.literal(2),
  requestId: RequestIdSchema,
  operation: z.literal("hydrate"),
  workspace: z.array(AgentWorkspaceEntrySchema).max(10_000),
});

export const AgentGuestExecuteRequestSchema = z.discriminatedUnion("language", [
  z.object({
    protocolVersion: z.literal(2),
    requestId: RequestIdSchema,
    operation: z.literal("execute"),
    language: z.enum(["python", "node"]),
    path: AgentWorkspacePathSchema,
    source: z.string().min(1).max(128_000),
    limits: AgentGuestLimitsSchema,
  }),
  z.object({
    protocolVersion: z.literal(2),
    requestId: RequestIdSchema,
    operation: z.literal("execute"),
    language: z.literal("shell"),
    command: z.string().min(1).max(128_000),
    limits: AgentGuestLimitsSchema,
  }),
]);

export const AgentGuestControlRequestSchema = z.object({
  protocolVersion: z.literal(2),
  requestId: RequestIdSchema,
  operation: z.enum(["cancel", "shutdown"]),
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

export const AgentGuestHelloResultSchema = z.object({
  protocolVersion: z.literal(2),
  requestId: RequestIdSchema,
  status: z.literal("ok"),
  operation: z.literal("hello"),
  nonLoopbackNetworkDeviceCount: z.number().int().nonnegative(),
  transport: z.literal("vsock"),
  capabilities: z.object({
    sourceMount: z.literal("/source"),
    workspaceMount: z.literal("/workspace"),
    shell: z.literal("/bin/sh"),
    executables: z.array(z.string().min(1)).max(512),
  }),
});

export const AgentGuestHydrateResultSchema = z.object({
  protocolVersion: z.literal(2),
  requestId: RequestIdSchema,
  status: z.literal("ok"),
  operation: z.literal("hydrate"),
});

export const AgentGuestResultSchema = z.object({
  protocolVersion: z.literal(2),
  requestId: RequestIdSchema,
  status: z.literal("ok"),
  operation: z.literal("execute"),
  nonLoopbackNetworkDeviceCount: z.number().int().nonnegative(),
  scratchBytes: z.number().int().nonnegative(),
  transport: z.literal("vsock"),
  execution: AgentExecutionResultSchema,
  workspaceDelta: AgentWorkspaceDeltaSchema,
});

export const WorkerFrameSchema = z.union([
  WorkerRequestSchema,
  AgentGuestHelloRequestSchema,
  AgentGuestHydrateRequestSchema,
  AgentGuestExecuteRequestSchema,
  AgentGuestControlRequestSchema,
  WorkerResultSchema,
  AgentGuestHelloResultSchema,
  AgentGuestHydrateResultSchema,
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
export type AgentWorkspaceEntry = z.infer<typeof AgentWorkspaceEntrySchema>;
export type AgentWorkspaceDelta = z.infer<typeof AgentWorkspaceDeltaSchema>;
export type AgentGuestHelloRequest = z.infer<typeof AgentGuestHelloRequestSchema>;
export type AgentGuestExecuteRequest = z.infer<typeof AgentGuestExecuteRequestSchema>;
export type AgentGuestResult = z.infer<typeof AgentGuestResultSchema>;
export type MicroVmAgentReport = z.infer<typeof MicroVmAgentReportSchema>;
