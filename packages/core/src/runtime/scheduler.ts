import type { InferenceOperation, InferenceProfile } from "@vault/shared";

const GiB = 1024 * 1024 * 1024;
const PROFILE_BUDGETS: Record<InferenceProfile, number> = {
  local12: 12 * GiB,
  local16: 16 * GiB,
};

export class ResourceScheduler {
  private reservedBytes = 0;

  constructor(readonly profile: InferenceProfile) {}

  get budgetBytes(): number {
    return PROFILE_BUDGETS[this.profile];
  }

  reserve(operation: InferenceOperation): { memoryBudgetBytes: number; release(): void } {
    const requested = operation === "embed" ? 2 * GiB : this.budgetBytes;
    if (this.reservedBytes + requested > this.budgetBytes) {
      throw new Error("inference_memory_budget_exceeded");
    }
    this.reservedBytes += requested;
    let released = false;
    return {
      memoryBudgetBytes: requested,
      release: () => {
        if (released) return;
        released = true;
        this.reservedBytes -= requested;
      },
    };
  }
}
