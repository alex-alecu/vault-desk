import type { ModelRuntimeStatus } from "@vault/shared";

export const DEFAULT_MODEL_ID = "gemma-4-12b-it-qat-q4_0";

interface ModelRuntimeMeasurements {
  memoryBudgetBytes?: number;
  contextSizeTokens?: number;
  cpuRamBytes?: number;
  gpuVramBytes?: number;
}

export function modelRuntimeStatus(
  busy: boolean,
  resident: boolean,
  measurements: ModelRuntimeMeasurements,
): ModelRuntimeStatus {
  return {
    modelId: DEFAULT_MODEL_ID,
    name: "Gemma 4 12B QAT",
    state: busy ? "busy" : resident ? "ready" : "unloaded",
    thinkingSupported: true,
    ...measurements,
  };
}
