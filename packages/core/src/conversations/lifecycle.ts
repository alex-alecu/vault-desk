import type { AgentService } from "../agent/service.js";
import type { AuditLog } from "../audit/log.js";
import type { DatabasePort } from "../workspace/database.js";
import type { ConversationStore } from "./store.js";

export function addFolderGrant(
  conversations: ConversationStore,
  audit: AuditLog,
  database: DatabasePort,
  rootPath: string,
) {
  return database.transaction(() => {
    const folder = conversations.addFolder(rootPath);
    audit.append({
      type: "folder.granted",
      outcome: "succeeded",
      metadata: { folderId: folder.id },
    });
    return folder;
  })();
}

export function deleteConversationSession(
  conversations: ConversationStore,
  audit: AuditLog,
  database: DatabasePort,
  sessionId: string,
): boolean {
  return database.transaction(() => {
    const deleted = conversations.deleteSession(sessionId);
    audit.append({
      type: "session.deleted",
      outcome: deleted ? "succeeded" : "failed",
      metadata: { sessionId },
    });
    return deleted;
  })();
}

export function warmConversationSession(
  agent: AgentService | undefined,
  audit: AuditLog,
  sessionId: string,
): void {
  void agent?.warmSession(sessionId).catch((error: unknown) => {
    audit.append({
      type: "agent.warm_failed",
      outcome: "failed",
      metadata: {
        sessionId,
        code: error instanceof Error ? error.message.slice(0, 200) : "warm_failed",
      },
    });
  });
}
