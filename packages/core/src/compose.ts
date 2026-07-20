import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { InferenceProfileSchema, type WorkspaceStatus } from "@vault/shared";
import {
  InferenceWorkerClient,
  MacOsNativeWorkerLauncher,
  WindowsNativeWorkerLauncher,
} from "@vault/workers";
import { AuditLog } from "./audit/log.js";
import { ConversationStore } from "./conversations/store.js";
import { createFacade, type VaultCore, type VaultCorePorts } from "./facade.js";
import { JobStore } from "./jobs/jobs.js";
import { ModelResolver } from "./runtime/models.js";
import { ResourceScheduler } from "./runtime/scheduler.js";
import { InferenceSupervisor } from "./runtime/supervisor.js";
import { openWorkspaceCatalog } from "./workspace/catalog.js";
import { WorkspaceScope } from "./workspace/scope.js";
import { getOrCreateWorkspace } from "./workspace/workspaces.js";

export interface VaultCoreOptions {
  workspaceDir: string;
  modelStoreDir: string;
  profile: "local12" | "local16";
  migrationDirectory?: string;
  nativeBinding?: string;
  sessionsOnly?: boolean;
  workerEntryPath?: string;
}

async function createInference(options: VaultCoreOptions, workspaceRoot: string, audit: AuditLog) {
  const profile = InferenceProfileSchema.parse(options.profile);
  const modelResolver = await ModelResolver.open(options.modelStoreDir);
  const launcher =
    process.platform === "win32"
      ? new WindowsNativeWorkerLauncher()
      : new MacOsNativeWorkerLauncher([workspaceRoot]);
  const workerEntryPath =
    options.workerEntryPath ??
    fileURLToPath(new URL("../../workers/dist/inference/worker.js", import.meta.url));
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
  return { generate: unsupported, embed: unsupported, async close() {} };
}

function createConversationPorts(
  conversations: ConversationStore,
  audit: AuditLog,
  database: ReturnType<typeof openWorkspaceCatalog>["database"],
): Pick<
  VaultCorePorts,
  "addFolder" | "listFolders" | "createSession" | "listSessions" | "appendMessage" | "listMessages"
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
    async listFolders() {
      return conversations.listFolders();
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
}

function assembleVaultCore(services: CoreServices): VaultCore {
  const { catalog, workspace, audit, jobs, conversations, inference } = services;
  audit.append({ type: "core.opened", outcome: "succeeded", metadata: {} });
  return createFacade({
    status: async () => ({
      workspace,
      catalogSchemaVersion: catalog.schemaVersion,
      protocolVersion: 1,
      status: "ok",
    }),
    ...createConversationPorts(conversations, audit, catalog.database),
    async cancelJob(jobId) {
      const cancelled = jobs.cancel(jobId) !== undefined;
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
    async close() {
      await inference.close();
      audit.append({ type: "core.closed", outcome: "succeeded", metadata: {} });
      catalog.close();
    },
  });
}

export async function createVaultCore(options: VaultCoreOptions): Promise<VaultCore> {
  const scope = await WorkspaceScope.create(resolve(options.workspaceDir));
  const workspaceRoot = scope.root;
  const catalog = openWorkspaceCatalog(workspaceRoot, {
    ...(options.migrationDirectory === undefined
      ? {}
      : { migrationDirectory: options.migrationDirectory }),
    ...(options.nativeBinding === undefined ? {} : { nativeBinding: options.nativeBinding }),
  });
  const workspace = getOrCreateWorkspace(catalog.database, workspaceRoot);
  const audit = new AuditLog(catalog.database);
  const jobs = new JobStore(catalog.database);
  const conversations = new ConversationStore(catalog.database);
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
  return assembleVaultCore({ catalog, workspace, audit, jobs, conversations, inference });
}
