import { z } from "zod";

export const ContentHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
export const WorkspaceIdSchema = z.uuid().brand<"WorkspaceId">();
export const JobIdSchema = z.uuid().brand<"JobId">();
export const RequestIdSchema = z.union([z.string().min(1).max(128), z.number().int()]);

export type ContentHash = z.infer<typeof ContentHashSchema>;
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;
export type JobId = z.infer<typeof JobIdSchema>;
export type RequestId = z.infer<typeof RequestIdSchema>;
