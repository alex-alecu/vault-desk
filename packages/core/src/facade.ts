import type { WorkspaceStatus } from "@vault/shared";

export interface VaultCorePorts {
  status(): Promise<WorkspaceStatus>;
  cancelJob(jobId: string): Promise<boolean>;
  verifyAudit(): Promise<boolean>;
  close(): Promise<void>;
}

export interface VaultCore extends VaultCorePorts {}

export function createFacade(ports: VaultCorePorts): VaultCore {
  return {
    status: () => ports.status(),
    cancelJob: (jobId) => ports.cancelJob(jobId),
    verifyAudit: () => ports.verifyAudit(),
    close: () => ports.close(),
  };
}
