import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { InferenceProfileSchema, type WorkspaceStatus } from "@vault/shared";
import {
  InferenceWorkerClient,
  MacOsNativeWorkerLauncher,
  WindowsNativeWorkerLauncher,
} from "@vault/workers";
import { AuditLog } from "./audit/log.js";
import { createFacade, type VaultCore } from "./facade.js";
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
}

async function createInference(options: VaultCoreOptions, workspaceRoot: string, audit: AuditLog) {
  const profile = InferenceProfileSchema.parse(options.profile);
  const modelResolver = await ModelResolver.open(options.modelStoreDir);
  const launcher =
    process.platform === "win32"
      ? new WindowsNativeWorkerLauncher()
      : new MacOsNativeWorkerLauncher([workspaceRoot]);
  const workerEntryPath = fileURLToPath(
    new URL("../../workers/dist/inference/worker.js", import.meta.url),
  );
  return new InferenceSupervisor(
    new InferenceWorkerClient(launcher, workerEntryPath),
    modelResolver,
    new ResourceScheduler(profile),
    (event) => {
      audit.append(event);
    },
  );
}

export async function createVaultCore(options: VaultCoreOptions): Promise<VaultCore> {
  const scope = await WorkspaceScope.create(resolve(options.workspaceDir));
  const workspaceRoot = scope.root;
  const catalog = openWorkspaceCatalog(workspaceRoot);
  const workspace = getOrCreateWorkspace(catalog.database, workspaceRoot);
  const audit = new AuditLog(catalog.database);
  const jobs = new JobStore(catalog.database);
  let inference: Awaited<ReturnType<typeof createInference>>;
  try {
    inference = await createInference(options, workspaceRoot, audit);
  } catch (error) {
    catalog.close();
    throw error;
  }
  const status = async (): Promise<WorkspaceStatus> => ({
    workspace,
    catalogSchemaVersion: catalog.schemaVersion,
    protocolVersion: 1,
    status: "ok",
  });
  audit.append({ type: "core.opened", outcome: "succeeded", metadata: {} });
  return createFacade({
    status,
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
