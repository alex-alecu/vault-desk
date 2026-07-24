import { totalmem } from "node:os";
import type { InferenceProfile } from "@vault/shared";

const GiB = 1024 * 1024 * 1024;
const PROFILE_BUDGETS = { local12: 12 * GiB, local16: 16 * GiB } as const;

export type InferenceHardwarePolicy =
  | { supported: true; memoryBudgetBytes: number }
  | { supported: false; message: string };

export function resolveInferenceHardwarePolicy(
  profile: InferenceProfile,
  platform: NodeJS.Platform = process.platform,
  totalMemoryBytes: number = totalmem(),
): InferenceHardwarePolicy {
  if (profile !== "auto") {
    return { supported: true, memoryBudgetBytes: PROFILE_BUDGETS[profile] };
  }
  if (platform === "win32") {
    return { supported: true, memoryBudgetBytes: totalMemoryBytes };
  }
  if (platform !== "darwin") {
    return { supported: false, message: "This operating system is not supported." };
  }
  if (totalMemoryBytes <= 8 * GiB) {
    return {
      supported: false,
      message: "This Mac has 8 GB of memory. Vault Desk requires more memory to run locally.",
    };
  }
  if (totalMemoryBytes <= 16 * GiB) {
    return { supported: true, memoryBudgetBytes: 10 * GiB };
  }
  if (totalMemoryBytes <= 24 * GiB) {
    return { supported: true, memoryBudgetBytes: 12 * GiB };
  }
  return { supported: true, memoryBudgetBytes: 16 * GiB };
}
