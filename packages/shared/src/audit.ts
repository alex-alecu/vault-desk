import { z } from "zod";
import { ContentHashSchema } from "./ids.js";

export const AuditValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const AuditEventInputSchema = z.object({
  type: z.string().min(1),
  outcome: z.enum(["allowed", "denied", "succeeded", "failed"]),
  metadata: z.record(z.string(), AuditValueSchema).default({}),
});

export const AuditEventSchema = AuditEventInputSchema.extend({
  schemaVersion: z.literal(1),
  sequence: z.number().int().nonnegative(),
  timestamp: z.iso.datetime(),
  previousHash: ContentHashSchema.nullable(),
  hash: ContentHashSchema,
});

export type AuditEventInput = z.input<typeof AuditEventInputSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
