import { z } from "zod";
import { WorkspaceIdSchema } from "./ids.js";

export const WorkspaceRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: WorkspaceIdSchema,
  rootPath: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const WorkspaceStatusSchema = z.object({
  workspace: WorkspaceRecordSchema,
  catalogSchemaVersion: z.number().int().positive(),
  protocolVersion: z.literal(1),
  status: z.literal("ok"),
});

export type WorkspaceRecord = z.infer<typeof WorkspaceRecordSchema>;
export type WorkspaceStatus = z.infer<typeof WorkspaceStatusSchema>;
