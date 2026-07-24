import { AgentTraceSchema } from "@vault/shared";
import { describe, expect, it, vi } from "vitest";
import type { VaultCore } from "../facade.js";
import { dispatchRpc } from "./methods.js";

describe("agent trace RPC", () => {
  it("returns a run trace through the read-only agent.trace method", async () => {
    const runId = "11111111-1111-4111-8111-111111111111";
    const trace = AgentTraceSchema.parse({
      runId,
      captureVersion: 1,
      status: "recorded",
      turns: [],
    });
    const getAgentTrace = vi.fn(async () => trace);
    const core = { getAgentTrace } as unknown as VaultCore;

    const response = await dispatchRpc(core, {
      jsonrpc: "2.0",
      id: "trace-request",
      method: "agent.trace",
      params: { runId },
      protocolVersion: 1,
    });

    expect(response).toMatchObject({ id: "trace-request", result: trace });
    expect(getAgentTrace).toHaveBeenCalledExactlyOnceWith(runId);
  });
});
