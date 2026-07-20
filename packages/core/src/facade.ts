import type {
  ConversationMessage,
  FolderSummary,
  MessageRole,
  SessionPage,
  SessionSummary,
  WorkspaceStatus,
} from "@vault/shared";
import type { EmbeddingInput, GenerationInput, InferenceService } from "./runtime/inference.js";

export interface VaultCorePorts extends InferenceService {
  status(): Promise<WorkspaceStatus>;
  addFolder(rootPath: string): Promise<FolderSummary>;
  listFolders(): Promise<FolderSummary[]>;
  createSession(folderId: string | null): Promise<SessionSummary>;
  listSessions(folderId: string | null, cursor?: string, limit?: number): Promise<SessionPage>;
  appendMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
  ): Promise<ConversationMessage>;
  listMessages(sessionId: string): Promise<ConversationMessage[]>;
  cancelJob(jobId: string): Promise<boolean>;
  verifyAudit(): Promise<boolean>;
  close(): Promise<void>;
}

export interface VaultCore extends VaultCorePorts {}

export function createFacade(ports: VaultCorePorts): VaultCore {
  return {
    status: () => ports.status(),
    addFolder: (rootPath) => ports.addFolder(rootPath),
    listFolders: () => ports.listFolders(),
    createSession: (folderId) => ports.createSession(folderId),
    listSessions: (folderId, cursor, limit) => ports.listSessions(folderId, cursor, limit),
    appendMessage: (sessionId, role, content) => ports.appendMessage(sessionId, role, content),
    listMessages: (sessionId) => ports.listMessages(sessionId),
    cancelJob: (jobId) => ports.cancelJob(jobId),
    verifyAudit: () => ports.verifyAudit(),
    generate: (input: GenerationInput, signal?: AbortSignal) => ports.generate(input, signal),
    embed: (input: EmbeddingInput, signal?: AbortSignal) => ports.embed(input, signal),
    close: () => ports.close(),
  };
}
