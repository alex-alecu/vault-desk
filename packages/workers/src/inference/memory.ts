const MINIMUM_GENERATION_CONTEXT = 8_192;
const MAXIMUM_GENERATION_CONTEXT = 262_144;
const CONTEXT_ALIGNMENT = 256;

export interface InferenceAllocation {
  cpuRamBytes: number;
  gpuVramBytes: number;
}

export function resolveRuntimeMemoryBudget(
  requestedBudgetBytes: number,
  gpuVramBytes: number,
  platform: NodeJS.Platform,
  operation: "generate" | "embed",
): number {
  if (platform !== "win32" || operation !== "generate") return requestedBudgetBytes;
  if (!Number.isSafeInteger(gpuVramBytes) || gpuVramBytes <= 0) {
    throw new Error("supported_gpu_required");
  }
  return gpuVramBytes;
}

export function resolveGenerationContextSize(requested: "auto" | number) {
  return requested === "auto"
    ? { min: MINIMUM_GENERATION_CONTEXT, max: MAXIMUM_GENERATION_CONTEXT }
    : requested;
}

export function combinedAllocationBytes(allocation: InferenceAllocation): number {
  return allocation.cpuRamBytes + allocation.gpuVramBytes;
}

export async function fitCombinedGenerationContext(
  budgetBytes: number,
  modelAllocation: InferenceAllocation,
  estimateContext: (contextSize: number) => Promise<InferenceAllocation>,
): Promise<number> {
  let low = MINIMUM_GENERATION_CONTEXT / CONTEXT_ALIGNMENT;
  let high = MAXIMUM_GENERATION_CONTEXT / CONTEXT_ALIGNMENT;
  let selected = 0;
  while (low <= high) {
    const candidate = Math.floor((low + high) / 2);
    const context = await estimateContext(candidate * CONTEXT_ALIGNMENT);
    if (
      combinedAllocationBytes(modelAllocation) + combinedAllocationBytes(context) <=
      budgetBytes
    ) {
      selected = candidate;
      low = candidate + 1;
    } else {
      high = candidate - 1;
    }
  }
  if (selected === 0) throw new Error("combined_memory_budget_exceeded");
  return selected * CONTEXT_ALIGNMENT;
}
