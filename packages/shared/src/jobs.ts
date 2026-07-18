import { z } from "zod";
import { JobIdSchema } from "./ids.js";

export const JobStateSchema = z.enum(["queued", "running", "succeeded", "failed", "cancelled"]);

export const JobRecordSchema = z.object({
  id: JobIdSchema,
  kind: z.string().min(1),
  idempotencyKey: z.string().min(1),
  state: JobStateSchema,
  cancellationRequested: z.boolean(),
  resumeCursor: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type JobRecord = z.infer<typeof JobRecordSchema>;
export type JobState = z.infer<typeof JobStateSchema>;
