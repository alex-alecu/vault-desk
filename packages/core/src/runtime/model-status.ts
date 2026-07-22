import type { ModelRuntimeStatus } from "@vault/shared";

export const DEFAULT_MODEL_ID = "gemma-4-12b-it-qat-q4_0";

export function modelRuntimeStatus(busy: boolean, resident: boolean): ModelRuntimeStatus {
  return {
    modelId: DEFAULT_MODEL_ID,
    name: "Gemma 4 12B",
    state: busy ? "busy" : resident ? "ready" : "unloaded",
    thinkingSupported: true,
  };
}
