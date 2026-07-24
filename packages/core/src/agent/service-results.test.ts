import { describe, expect, it } from "vitest";
import { agentFailureText } from "./service-results.js";

describe("agent failure privacy", () => {
  it("retains safe codes and removes host paths", () => {
    expect(agentFailureText(new Error("agent_helper_exited_1"))).toBe("agent_helper_exited_1");
    expect(agentFailureText(new Error("ENOENT: /private/tmp/customer/model.gguf"))).toBe(
      "agent_model_failed",
    );
    expect(agentFailureText(new Error("failed at /private/tmp/customer/source"))).toBe(
      "agent_run_failed",
    );
    expect(agentFailureText(new Error("missing_model"))).toBe("agent_model_failed");
    expect(agentFailureText(new Error("model_integrity_failed"))).toBe("agent_model_failed");
    expect(agentFailureText(new Error("combined_memory_budget_exceeded"))).toBe(
      "agent_memory_unavailable",
    );
  });
});
