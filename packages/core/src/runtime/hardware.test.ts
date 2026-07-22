import { describe, expect, it } from "vitest";
import { resolveInferenceHardwarePolicy } from "./hardware.js";

const GiB = 1024 * 1024 * 1024;

describe("automatic inference hardware policy", () => {
  it.each([
    [48, 16],
    [32, 16],
    [24, 12],
    [18, 12],
    [16, 10],
  ])("uses a %d GiB Mac with a %d GiB model and context budget", (memory, budget) => {
    expect(resolveInferenceHardwarePolicy("auto", "darwin", memory * GiB)).toEqual({
      supported: true,
      memoryBudgetBytes: budget * GiB,
    });
  });

  it("rejects an 8 GiB Mac before inference starts", () => {
    expect(resolveInferenceHardwarePolicy("auto", "darwin", 8 * GiB)).toEqual({
      supported: false,
      message: "This Mac has 8 GB of memory. Vault Desk requires more memory to run locally.",
    });
  });

  it("uses system memory only as the Windows worker process bound", () => {
    expect(resolveInferenceHardwarePolicy("auto", "win32", 64 * GiB)).toEqual({
      supported: true,
      memoryBudgetBytes: 64 * GiB,
    });
  });

  it("preserves explicit certification budgets", () => {
    expect(resolveInferenceHardwarePolicy("local12", "darwin", 48 * GiB)).toEqual({
      supported: true,
      memoryBudgetBytes: 12 * GiB,
    });
    expect(resolveInferenceHardwarePolicy("local16", "win32", 64 * GiB)).toEqual({
      supported: true,
      memoryBudgetBytes: 16 * GiB,
    });
  });
});
