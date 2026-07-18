import { z } from "zod";
import { VaultErrorSchema } from "./errors.js";
import { JobIdSchema, RequestIdSchema } from "./ids.js";

export const WorkerLimitsSchema = z.object({
  wallTimeMs: z.number().int().positive().max(300_000),
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

export const WorkerFrameSchema = z.union([
  WorkerRequestSchema,
  WorkerResultSchema,
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

export type WorkerLimits = z.infer<typeof WorkerLimitsSchema>;
export type WorkerFrame = z.infer<typeof WorkerFrameSchema>;
export type MicroVmProbeReport = z.infer<typeof MicroVmProbeReportSchema>;
