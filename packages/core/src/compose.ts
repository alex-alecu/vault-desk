import { resolve } from "node:path";
import type { WorkspaceStatus } from "@vault/shared";
import { AuditLog } from "./audit/log.js";
import { createFacade, type VaultCore } from "./facade.js";
import { JobStore } from "./jobs/jobs.js";
import { openWorkspaceCatalog } from "./workspace/catalog.js";
import { WorkspaceScope } from "./workspace/scope.js";
import { getOrCreateWorkspace } from "./workspace/workspaces.js";

export interface VaultCoreOptions {
  workspaceDir: string;
}

export async function createVaultCore(options: VaultCoreOptions): Promise<VaultCore> {
  const scope = await WorkspaceScope.create(resolve(options.workspaceDir));
  const workspaceRoot = scope.root;
  const catalog = openWorkspaceCatalog(workspaceRoot);
  const workspace = getOrCreateWorkspace(catalog.database, workspaceRoot);
  const audit = new AuditLog(catalog.database);
  const jobs = new JobStore(catalog.database);
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
    async close() {
      audit.append({ type: "core.closed", outcome: "succeeded", metadata: {} });
      catalog.close();
    },
  });
}
