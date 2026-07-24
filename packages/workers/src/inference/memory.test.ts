import { describe, expect, it } from "vitest";
import {
  combinedAllocationBytes,
  fitCombinedGenerationContext,
  resolveGenerationContextSize,
  resolveRuntimeMemoryBudget,
} from "./memory.js";

const GiB = 1024 * 1024 * 1024;

describe("inference memory selection", () => {
  it("uses the full detected Windows GPU VRAM for generation", () => {
    expect(resolveRuntimeMemoryBudget(64 * GiB, 16 * GiB, "win32", "generate")).toBe(16 * GiB);
  });

  it("rejects Windows generation without detected GPU VRAM", () => {
    expect(() => resolveRuntimeMemoryBudget(16 * GiB, 0, "win32", "generate")).toThrow(
      "supported_gpu_required",
    );
  });

  it("preserves Mac budgets and bounded embedding reservations", () => {
    expect(resolveRuntimeMemoryBudget(12 * GiB, 48 * GiB, "darwin", "generate")).toBe(12 * GiB);
    expect(resolveRuntimeMemoryBudget(2 * GiB, 16 * GiB, "win32", "embed")).toBe(2 * GiB);
  });

  it("fits automatic generation context up to the model maximum", () => {
    expect(resolveGenerationContextSize("auto")).toEqual({ min: 8_192, max: 262_144 });
    expect(resolveGenerationContextSize(32_768)).toBe(32_768);
  });

  it("selects the largest aligned context inside a combined memory budget", async () => {
    const selected = await fitCombinedGenerationContext(
      100,
      { cpuRamBytes: 20, gpuVramBytes: 30 },
      async (contextSize) => ({ cpuRamBytes: 0, gpuVramBytes: contextSize / 819.2 }),
    );
    expect(selected).toBe(40_960);
  });

  it("rejects a Mac budget that cannot fit the minimum context", async () => {
    await expect(
      fitCombinedGenerationContext(50, { cpuRamBytes: 20, gpuVramBytes: 30 }, async () => ({
        cpuRamBytes: 1,
        gpuVramBytes: 0,
      })),
    ).rejects.toThrow("combined_memory_budget_exceeded");
  });

  it("reports the combined CPU and GPU allocation", () => {
    expect(combinedAllocationBytes({ cpuRamBytes: 3, gpuVramBytes: 5 })).toBe(8);
  });
});
