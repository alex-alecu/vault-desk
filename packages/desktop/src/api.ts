import { invoke } from "@tauri-apps/api/core";
import {
  type ConversationMessage,
  ConversationMessageSchema,
  type FolderSummary,
  FolderSummarySchema,
  type SessionPage,
  SessionPageSchema,
  type SessionSummary,
  SessionSummarySchema,
} from "@vault/shared";

export interface FolderSessionPage {
  folderId: string;
  page: SessionPage;
}

export interface DesktopBootstrap {
  folders: FolderSummary[];
  globalSessions: SessionPage;
  folderSessions: FolderSessionPage[];
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The desktop bridge returned an invalid response.");
  }
  return value as Record<string, unknown>;
}

function hasTauriHost(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

function parseBootstrap(value: unknown): DesktopBootstrap {
  const input = record(value);
  const folderSessions = Array.isArray(input.folderSessions)
    ? input.folderSessions.map((entry) => {
        const item = record(entry);
        if (typeof item.folderId !== "string") throw new Error("Invalid folder session page.");
        return { folderId: item.folderId, page: SessionPageSchema.parse(item.page) };
      })
    : [];
  return {
    folders: FolderSummarySchema.array().parse(input.folders),
    globalSessions: SessionPageSchema.parse(input.globalSessions),
    folderSessions,
  };
}

export async function bootstrapDesktop(): Promise<DesktopBootstrap> {
  if (!hasTauriHost()) {
    return {
      folders: [],
      globalSessions: { items: [], nextCursor: null },
      folderSessions: [],
    };
  }
  return parseBootstrap(await invoke<unknown>("desktop_bootstrap"));
}

export async function chooseFolder(): Promise<FolderSummary | undefined> {
  if (!hasTauriHost()) return undefined;
  const value = await invoke<unknown | null>("choose_folder");
  return value === null ? undefined : FolderSummarySchema.parse(value);
}

export async function createSession(folderId: string | null): Promise<SessionSummary> {
  return SessionSummarySchema.parse(await invoke("create_session", { folderId }));
}

export async function listSessions(folderId: string | null, cursor: string): Promise<SessionPage> {
  return SessionPageSchema.parse(await invoke("list_sessions", { folderId, cursor }));
}

export async function listMessages(sessionId: string): Promise<ConversationMessage[]> {
  return ConversationMessageSchema.array().parse(await invoke("list_messages", { sessionId }));
}

export async function appendUserMessage(
  sessionId: string,
  content: string,
): Promise<ConversationMessage> {
  return ConversationMessageSchema.parse(
    await invoke("append_user_message", { sessionId, content }),
  );
}
