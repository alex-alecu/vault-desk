import { afterEach, describe, expect, it, vi } from "vitest";
import { monitorParent, openWithWorkspaceRetry } from "./lifecycle.js";

afterEach(() => vi.useRealTimers());

describe("desktop sidecar lifecycle", () => {
  it("waits for a restarting desktop to release the workspace", async () => {
    let attempts = 0;
    const result = await openWithWorkspaceRetry(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("workspace_busy");
      return "ready";
    }, 100);

    expect(result).toBe("ready");
    expect(attempts).toBe(2);
  });

  it("stops when its desktop parent exits", async () => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    monitorParent({ parentPid: 42, onExit, processIsLive: () => false });

    await vi.advanceTimersByTimeAsync(50);

    expect(onExit).toHaveBeenCalledOnce();
  });
});
