import { afterEach, describe, expect, it, vi } from "vitest";
import { selectAdjacentTab } from "./components/tab-keyboard.js";

afterEach(() => vi.unstubAllGlobals());

describe("tab keyboard navigation", () => {
  it("focuses the selected tab after React releases the event", () => {
    let scheduled: FrameRequestCallback | undefined;
    let focused = false;
    let selected = "overview";
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      scheduled = callback;
      return 1;
    });
    const tabList = {
      querySelector: () => ({ focus: () => (focused = true) }),
    };
    const event: {
      currentTarget: { parentElement: typeof tabList } | null;
      key: string;
      preventDefault: () => void;
    } = {
      currentTarget: { parentElement: tabList },
      key: "ArrowRight",
      preventDefault: vi.fn(),
    };

    selectAdjacentTab(
      event as unknown as React.KeyboardEvent<HTMLButtonElement>,
      selected,
      ["overview", "logs"],
      (tab) => (selected = tab),
    );
    event.currentTarget = null;
    scheduled?.(0);

    expect(selected).toBe("logs");
    expect(focused).toBe(true);
  });
});
