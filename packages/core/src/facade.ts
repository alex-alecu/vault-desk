import type { WorkspaceStatus } from "@vault/shared";
import type { EmbeddingInput, GenerationInput, InferenceService } from "./runtime/inference.js";

export interface VaultCorePorts extends InferenceService {
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
    generate: (input: GenerationInput, signal?: AbortSignal) => ports.generate(input, signal),
    embed: (input: EmbeddingInput, signal?: AbortSignal) => ports.embed(input, signal),
    close: () => ports.close(),
  };
}
