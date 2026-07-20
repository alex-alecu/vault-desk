import type { AgentDecision, AgentExecutionResult } from "@vault/shared";
import { describe, expect, it } from "vitest";
import type { InferenceService } from "../runtime/inference.js";
import { type AgentExecutor, AgentLoop } from "./loop.js";

function inference(decisions: AgentDecision[]): Pick<InferenceService, "generate"> {
  return {
    async generate() {
      const value = decisions.shift();
      if (value === undefined) throw new Error("Missing fake agent decision.");
      return {
        protocolVersion: 1,
        requestId: "test",
        status: "ok",
        operation: "generate",
        value,
        memory: { cpuRamBytes: 1, gpuVramBytes: 1, budgetBytes: 1 },
      };
    },
  };
}

function executor(results: AgentExecutionResult[], calls: string[]): AgentExecutor {
  return {
    async execute(input) {
      calls.push(input.code);
      const result = results.shift();
      if (result === undefined) throw new Error("Missing fake execution result.");
      return result;
    },
  };
}

const completed: AgentExecutionResult = {
  language: "python",
  code: "print(2 + 2)",
  exitCode: 0,
  stdout: "4\n",
  stderr: "",
  durationMs: 10,
  termination: "completed",
};

describe("AgentLoop execution", () => {
  it("feeds bounded execution observations back to the model", async () => {
    const decisions: AgentDecision[] = [
      { action: "execute", language: "python", code: completed.code, summary: "Calculate" },
      { action: "respond", response: "The answer is 4." },
    ];
    const calls: string[] = [];
    const loop = new AgentLoop(inference(decisions), executor([{ ...completed }], calls));

    const result = await loop.run({ task: "Calculate two plus two", modelId: "test-model" });

    expect(calls).toEqual([completed.code]);
    expect(result).toEqual({ response: "The answer is 4.", executions: [completed] });
  });
});

describe("AgentLoop limits", () => {
  it("stops after six executable steps", async () => {
    const decision: AgentDecision = {
      action: "execute",
      language: "python",
      code: completed.code,
      summary: "Continue",
    };
    const calls: string[] = [];
    const results = Array.from({ length: 6 }, () => ({ ...completed }));
    const loop = new AgentLoop(
      inference(Array.from({ length: 7 }, () => decision)),
      executor(results, calls),
    );

    await expect(loop.run({ task: "Keep going", modelId: "test-model" })).rejects.toThrow(
      "agent_execution_limit_exceeded",
    );
    expect(calls).toHaveLength(6);
  });
});
