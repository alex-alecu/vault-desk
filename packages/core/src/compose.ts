import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { InferenceProfileSchema, type WorkspaceStatus } from "@vault/shared";
import {
  InferenceWorkerClient,
  MacOsMicroVmLauncher,
  MacOsNativeWorkerLauncher,
  WindowsNativeWorkerLauncher,
  windowsNativeWorkerEntryPath,
} from "@vault/workers";
import { AgentService } from "./agent/service.js";
import { AgentStore } from "./agent/store.js";
import { AuditLog } from "./audit/log.js";
import { ConversationStore } from "./conversations/store.js";
import { createFacade, type VaultCore, type VaultCorePorts } from "./facade.js";
import { JobStore } from "./jobs/jobs.js";
import { ModelResolver } from "./runtime/models.js";
import { ResourceScheduler } from "./runtime/scheduler.js";
import { InferenceSupervisor } from "./runtime/supervisor.js";
import { ArtifactStore } from "./workspace/artifacts.js";
import { openWorkspaceCatalog } from "./workspace/catalog.js";
import { WorkspaceScope } from "./workspace/scope.js";
import { getOrCreateWorkspace } from "./workspace/workspaces.js";

export interface VaultCoreOptions {
  workspaceDir: string;
  modelStoreDir: string;
  profile: "local12" | "local16";
  migrationDirectory?: string;
  sessionsOnly?: boolean;
  workerEntryPath?: string;
  inferenceRuntimePath?: string;
  agentHelperPath?: string;
  agentImageRoot?: string;
}

async function createInference(options: VaultCoreOptions, workspaceRoot: string, audit: AuditLog) {
  const profile = InferenceProfileSchema.parse(options.profile);
  const modelResolver = await ModelResolver.open(options.modelStoreDir);
  const launcher =
    process.platform === "win32"
      ? new WindowsNativeWorkerLauncher()
      : new MacOsNativeWorkerLauncher([workspaceRoot], options.inferenceRuntimePath);
  const workerEntryPath =
    options.workerEntryPath ??
    (process.platform === "win32"
      ? windowsNativeWorkerEntryPath()
      : fileURLToPath(new URL("../../workers/dist/inference/worker.js", import.meta.url)));
  return new InferenceSupervisor(
    new InferenceWorkerClient(launcher, workerEntryPath),
    modelResolver,
    new ResourceScheduler(profile),
    (event) => {
      audit.append(event);
    },
  );
}

function unavailableInference() {
  const unsupported = async (): Promise<never> => {
    throw Object.assign(new Error("inference_not_packaged"), { code: "unsupported" });
  };
  return {
    generate: unsupported,
    embed: unsupported,
    async modelStatus() {
      return {
        modelId: "gemma-4-12b-it-qat-q4_0",
        name: "Gemma 4 12B QAT",
        state: "unloaded" as const,
        thinkingSupported: true,
      };
    },
    async unloadModel() {
      return false;
    },
    async close() {},
  };
}

function deleteConversationSession(
  conversations: ConversationStore,
  audit: AuditLog,
  database: ReturnType<typeof openWorkspaceCatalog>["database"],
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

function createConversationPorts(
  conversations: ConversationStore,
  audit: AuditLog,
  database: ReturnType<typeof openWorkspaceCatalog>["database"],
): Pick<
  VaultCorePorts,
  | "addFolder"
  | "listFolders"
  | "resolveFolderPath"
  | "revokeFolder"
  | "createSession"
  | "deleteSession"
  | "listSessions"
  | "appendMessage"
  | "listMessages"
> {
  return {
    async addFolder(rootPath) {
      return database.transaction(() => {
        const folder = conversations.addFolder(rootPath);
        audit.append({
          type: "folder.granted",
          outcome: "succeeded",
          metadata: { folderId: folder.id },
        });
        return folder;
      })();
    },
    listFolders: async () => conversations.listFolders(),
    resolveFolderPath: async (folderId) => conversations.resolveFolderPath(folderId),
    async revokeFolder(folderId) {
      const revoked = conversations.revokeFolder(folderId);
      audit.append({
        type: "folder.revoked",
        outcome: revoked ? "succeeded" : "failed",
        metadata: { folderId },
      });
      return revoked;
    },
    async createSession(folderId) {
      return database.transaction(() => {
        const session = conversations.createSession(folderId);
        audit.append({
          type: "session.created",
          outcome: "succeeded",
          metadata: { sessionId: session.id, folderId: session.folderId },
        });
        return session;
      })();
    },
    async deleteSession(sessionId) {
      return deleteConversationSession(conversations, audit, database, sessionId);
    },
    async listSessions(folderId, cursor, limit) {
      return conversations.listSessions(folderId, cursor, limit);
    },
    async appendMessage(sessionId, role, content) {
      return database.transaction(() => {
        const entry = conversations.appendMessage(sessionId, role, content);
        audit.append({
          type: "message.appended",
          outcome: "succeeded",
          metadata: { sessionId, role },
        });
        return entry;
      })();
    },
    async listMessages(sessionId) {
      return conversations.listMessages(sessionId);
    },
  };
}

interface CoreServices {
  catalog: ReturnType<typeof openWorkspaceCatalog>;
  workspace: WorkspaceStatus["workspace"];
  audit: AuditLog;
  jobs: JobStore;
  conversations: ConversationStore;
  inference: Awaited<ReturnType<typeof createInference>> | ReturnType<typeof unavailableInference>;
  agent?: AgentService;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: facade assembly intentionally lists every public capability.
function assembleVaultCore(services: CoreServices): VaultCore {
  const { catalog, workspace, audit, jobs, conversations, inference, agent } = services;
  const unavailableAgent = (): never => {
    throw Object.assign(new Error("agent_not_packaged"), { code: "unsupported" });
  };
  audit.append({ type: "core.opened", outcome: "succeeded", metadata: {} });
  return createFacade({
    status: async () => ({
      workspace,
      catalogSchemaVersion: catalog.schemaVersion,
      protocolVersion: 1,
      status: "ok",
    }),
    ...createConversationPorts(conversations, audit, catalog.database),
    async saveDraft(sessionId, content) {
      return agent?.saveDraft(sessionId, content) ?? unavailableAgent();
    },
    async loadDraft(sessionId) {
      return agent?.loadDraft(sessionId) ?? unavailableAgent();
    },
    async addAttachment(sessionId, path) {
      return (await agent?.addAttachment(sessionId, path)) ?? unavailableAgent();
    },
    async listAttachments(sessionId) {
      return agent?.listAttachments(sessionId) ?? unavailableAgent();
    },
    async removeAttachment(sessionId, attachmentId) {
      return agent?.removeAttachment(sessionId, attachmentId) ?? unavailableAgent();
    },
    async startAgent(sessionId, task) {
      return agent?.start(sessionId, task) ?? unavailableAgent();
    },
    async listAgentRuns(sessionId) {
      return agent?.listRuns(sessionId) ?? unavailableAgent();
    },
    async getAgentRun(runId) {
      return agent?.snapshot(runId) ?? unavailableAgent();
    },
    async cancelAgent(jobId) {
      return agent?.cancel(jobId) ?? false;
    },
    async cancelJob(jobId) {
      const cancelled = agent?.cancel(jobId) ?? jobs.cancel(jobId) !== undefined;
      audit.append({
        type: "job.cancellation_requested",
        outcome: cancelled ? "succeeded" : "failed",
        metadata: { jobId },
      });
      return cancelled;
    },
    verifyAudit: async () => audit.verify(),
    generate: (input, signal) => inference.generate(input, signal),
    embed: (input, signal) => inference.embed(input, signal),
    modelStatus: () => inference.modelStatus(),
    unloadModel: () => inference.unloadModel(),
    async close() {
      await agent?.close();
      await inference.close();
      audit.append({ type: "core.closed", outcome: "succeeded", metadata: {} });
      catalog.close();
    },
  });
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: composition remains one explicit authority wiring boundary.
export async function createVaultCore(options: VaultCoreOptions): Promise<VaultCore> {
  const scope = await WorkspaceScope.create(resolve(options.workspaceDir));
  const workspaceRoot = scope.root;
  const catalog = openWorkspaceCatalog(workspaceRoot, {
    ...(options.migrationDirectory === undefined
      ? {}
      : { migrationDirectory: options.migrationDirectory }),
  });
  const workspace = getOrCreateWorkspace(catalog.database, workspaceRoot);
  const audit = new AuditLog(catalog.database);
  const jobs = new JobStore(catalog.database);
  const conversations = new ConversationStore(catalog.database);
  const artifacts = await ArtifactStore.create(scope);
  let inference:
    | Awaited<ReturnType<typeof createInference>>
    | ReturnType<typeof unavailableInference>;
  try {
    inference =
      options.sessionsOnly === true
        ? unavailableInference()
        : await createInference(options, workspaceRoot, audit);
  } catch (error) {
    catalog.close();
    throw error;
  }
  const agent =
    options.sessionsOnly === true || options.agentHelperPath === undefined
      ? undefined
      : new AgentService(
          catalog.database,
          new AgentStore(catalog.database, artifacts),
          conversations,
          jobs,
          artifacts,
          inference,
          new MacOsMicroVmLauncher(options.agentHelperPath, options.agentImageRoot),
          audit,
        );
  return assembleVaultCore({
    catalog,
    workspace,
    audit,
    jobs,
    conversations,
    inference,
    ...(agent === undefined ? {} : { agent }),
  });
}
