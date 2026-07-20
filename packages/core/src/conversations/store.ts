import { randomUUID } from "node:crypto";
import {
  type ConversationMessage,
  ConversationMessageSchema,
  type FolderSummary,
  FolderSummarySchema,
  type MessageRole,
  type SessionPage,
  SessionPageSchema,
  type SessionSummary,
  SessionSummarySchema,
} from "@vault/shared";
import type Database from "better-sqlite3";
import { inspectFolderGrant } from "../workspace/folder-grants.js";

interface FolderRow {
  id: string;
  display_name: string;
  created_at: string;
}

interface SessionRow {
  id: string;
  folder_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

function folderSummary(row: FolderRow): FolderSummary {
  return FolderSummarySchema.parse({
    id: row.id,
    name: row.display_name,
    createdAt: row.created_at,
  });
}

function sessionSummary(row: SessionRow): SessionSummary {
  return SessionSummarySchema.parse({
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function message(row: MessageRow): ConversationMessage {
  return ConversationMessageSchema.parse({
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  });
}

function decodeCursor(cursor: string): { updatedAt: string; id: string } {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "updatedAt" in decoded &&
      typeof decoded.updatedAt === "string" &&
      "id" in decoded &&
      typeof decoded.id === "string"
    ) {
      return { updatedAt: decoded.updatedAt, id: decoded.id };
    }
  } catch {
    // The typed error below is the public boundary.
  }
  throw new Error("invalid_session_cursor");
}

function encodeCursor(session: SessionSummary): string {
  return Buffer.from(JSON.stringify({ updatedAt: session.updatedAt, id: session.id })).toString(
    "base64url",
  );
}

export class ConversationStore {
  constructor(private readonly database: Database.Database) {}

  addFolder(rootPath: string): FolderSummary {
    const { canonicalPath, displayName } = inspectFolderGrant(rootPath);
    const existing = this.database
      .prepare("SELECT id, display_name, created_at FROM folder_grants WHERE root_path = ?")
      .get(canonicalPath) as FolderRow | undefined;
    if (existing !== undefined) return folderSummary(existing);
    const createdAt = new Date().toISOString();
    const folder = FolderSummarySchema.parse({ id: randomUUID(), name: displayName, createdAt });
    this.database
      .prepare(
        "INSERT INTO folder_grants (id, root_path, display_name, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(folder.id, canonicalPath, folder.name, folder.createdAt);
    return folder;
  }

  listFolders(): FolderSummary[] {
    const rows = this.database
      .prepare("SELECT id, display_name, created_at FROM folder_grants ORDER BY created_at, id")
      .all() as FolderRow[];
    return rows.map(folderSummary);
  }

  createSession(folderId: string | null): SessionSummary {
    if (folderId !== null) {
      const folder = this.database
        .prepare("SELECT 1 FROM folder_grants WHERE id = ?")
        .get(folderId);
      if (folder === undefined) throw new Error("folder_not_found");
    }
    const now = new Date().toISOString();
    const session = SessionSummarySchema.parse({
      id: randomUUID(),
      folderId,
      title: "New chat",
      createdAt: now,
      updatedAt: now,
    });
    this.database
      .prepare(
        "INSERT INTO sessions (id, folder_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(session.id, session.folderId, session.title, session.createdAt, session.updatedAt);
    return session;
  }

  listSessions(folderId: string | null, cursor?: string, limit = 5): SessionPage {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("invalid_page_limit");
    const values: unknown[] = folderId === null ? [] : [folderId];
    let where = folderId === null ? "folder_id IS NULL" : "folder_id = ?";
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      where += " AND (updated_at < ? OR (updated_at = ? AND id < ?))";
      values.push(decoded.updatedAt, decoded.updatedAt, decoded.id);
    }
    values.push(limit + 1);
    const rows = this.database
      .prepare(
        `SELECT id, folder_id, title, created_at, updated_at FROM sessions WHERE ${where} ORDER BY updated_at DESC, id DESC LIMIT ?`,
      )
      .all(...values) as SessionRow[];
    const items = rows.slice(0, limit).map(sessionSummary);
    const last = items.at(-1);
    return SessionPageSchema.parse({
      items,
      nextCursor: rows.length > limit && last !== undefined ? encodeCursor(last) : null,
    });
  }

  appendMessage(sessionId: string, role: MessageRole, content: string): ConversationMessage {
    const createdAt = new Date().toISOString();
    const entry = ConversationMessageSchema.parse({
      id: randomUUID(),
      sessionId,
      role,
      content,
      createdAt,
    });
    this.database.transaction(() => {
      const session = this.database
        .prepare("SELECT title FROM sessions WHERE id = ?")
        .get(sessionId) as { title: string } | undefined;
      if (session === undefined) throw new Error("session_not_found");
      this.database
        .prepare(
          "INSERT INTO conversation_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run(entry.id, entry.sessionId, entry.role, entry.content, entry.createdAt);
      const title = entry.content.replaceAll(/\s+/gu, " ").trim().slice(0, 60);
      this.database
        .prepare(
          "UPDATE sessions SET title = CASE WHEN title = 'New chat' AND ? = 'user' THEN ? ELSE title END, updated_at = ? WHERE id = ?",
        )
        .run(entry.role, title, entry.createdAt, entry.sessionId);
    })();
    return entry;
  }

  listMessages(sessionId: string): ConversationMessage[] {
    const rows = this.database
      .prepare(
        "SELECT id, session_id, role, content, created_at FROM conversation_messages WHERE session_id = ? ORDER BY created_at, id",
      )
      .all(sessionId) as MessageRow[];
    return rows.map(message);
  }
}
