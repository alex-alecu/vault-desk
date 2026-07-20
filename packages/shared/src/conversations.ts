import { z } from "zod";
import { FolderIdSchema, MessageIdSchema, SessionIdSchema } from "./ids.js";

export const FolderSummarySchema = z.object({
  id: FolderIdSchema,
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const SessionSummarySchema = z.object({
  id: SessionIdSchema,
  folderId: FolderIdSchema.nullable(),
  title: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const SessionPageSchema = z.object({
  items: z.array(SessionSummarySchema),
  nextCursor: z.string().min(1).nullable(),
});

export const MessageRoleSchema = z.enum(["user", "assistant"]);
export const ConversationMessageSchema = z.object({
  id: MessageIdSchema,
  sessionId: SessionIdSchema,
  role: MessageRoleSchema,
  content: z.string().trim().min(1).max(256_000),
  createdAt: z.iso.datetime(),
});

export type FolderSummary = z.infer<typeof FolderSummarySchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type SessionPage = z.infer<typeof SessionPageSchema>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
