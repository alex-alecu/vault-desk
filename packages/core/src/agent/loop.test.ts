import type { AgentDecision, AgentExecutionResult } from "@vault/shared";
import { describe, expect, it } from "vitest";
import type { InferenceService } from "../runtime/inference.js";
import { type AgentExecutor, AgentLoop } from "./loop.js";

const performance = {
  promptTokens: 10,
  outputTokens: 5,
  promptDurationMs: 100,
  generationDurationMs: 500,
  totalDurationMs: 600,
};

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
        memory: {
          cpuRamBytes: 1,
          gpuVramBytes: 1,
          budgetBytes: 1,
          detectedGpuVramBytes: 1,
        },
        performance,
      };
    },
  };
}

function capturingInference(
  decisions: AgentDecision[],
  prompts: string[],
): Pick<InferenceService, "generate"> {
  return {
    async generate(input) {
      prompts.push(input.prompt);
      return await inference(decisions).generate(input);
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
  artifacts: [],
};

describe("AgentLoop schema", () => {
  it("uses object alternatives supported by the inference grammar", async () => {
    let schema: Record<string, unknown> | undefined;
    let contextSize: number | "auto" | undefined;
    const model: Pick<InferenceService, "generate"> = {
      async generate(input) {
        schema = input.jsonSchema;
        contextSize = input.contextSize;
        return {
          protocolVersion: 1,
          requestId: "test",
          status: "ok",
          operation: "generate",
          value: { action: "respond", response: "Done." },
          memory: {
            cpuRamBytes: 1,
            gpuVramBytes: 1,
            budgetBytes: 1,
            detectedGpuVramBytes: 1,
          },
          performance,
        };
      },
    };
    const loop = new AgentLoop(model, executor([], []));

    await loop.run({ task: "Reply", modelId: "test-model" });

    expect(schema).not.toHaveProperty("type");
    expect(schema?.oneOf).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "object" })]),
    );
    expect(schema?.oneOf).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({
            code: expect.objectContaining({
              type: "array",
              items: expect.objectContaining({ maxLength: 512 }),
            }),
          }),
        }),
      ]),
    );
    expect(contextSize).toBe("auto");
  });
});

describe("AgentLoop thinking", () => {
  it("forwards transient thinking without adding it to the result", async () => {
    const updates: Array<string | null> = [];
    const model: Pick<InferenceService, "generate"> = {
      async generate(_input, _signal, onThinkingDelta) {
        onThinkingDelta?.("First ");
        onThinkingDelta?.("thought.");
        return {
          protocolVersion: 1,
          requestId: "test",
          status: "ok",
          operation: "generate",
          value: { action: "respond", response: "Done." },
          memory: {
            cpuRamBytes: 1,
            gpuVramBytes: 1,
            budgetBytes: 1,
            detectedGpuVramBytes: 1,
          },
          performance,
        };
      },
    };

    const result = await new AgentLoop(model, executor([], [])).run({
      task: "Reply",
      modelId: "test-model",
      onThinking: (text) => updates.push(text),
    });

    expect(updates).toEqual([null, "First ", "First thought.", null]);
    expect(JSON.stringify(result)).not.toContain("thought");
  });
});

describe("AgentLoop source", () => {
  it("joins complete generated source lines before execution", async () => {
    const calls: string[] = [];
    const model: Pick<InferenceService, "generate"> = {
      async generate() {
        return {
          protocolVersion: 1,
          requestId: "test",
          status: "ok",
          operation: "generate",
          value: {
            action: "execute",
            language: "python",
            code: ["value = 2 + 2", "print(value)"],
            summary: "Calculate",
          },
          memory: {
            cpuRamBytes: 1,
            gpuVramBytes: 1,
            budgetBytes: 1,
            detectedGpuVramBytes: 1,
          },
          performance,
        };
      },
    };
    const loop = new AgentLoop(model, executor([{ ...completed }], calls));

    await expect(loop.run({ task: "Calculate", modelId: "test-model" })).rejects.toThrow(
      "Missing fake execution result.",
    );
    expect(calls[0]).toBe("value = 2 + 2\nprint(value)");
  });
});

describe("AgentLoop observations", () => {
  it("feeds bounded execution observations back to the model", async () => {
    const decisions: AgentDecision[] = [
      { action: "execute", language: "python", code: completed.code, summary: "Calculate" },
      { action: "respond", response: "The answer is 4." },
    ];
    const calls: string[] = [];
    const prompts: string[] = [];
    const loop = new AgentLoop(
      capturingInference(decisions, prompts),
      executor([{ ...completed }], calls),
    );

    const result = await loop.run({ task: "Calculate two plus two", modelId: "test-model" });

    expect(calls).toEqual([completed.code]);
    expect(result).toEqual({
      response: "The answer is 4.",
      executions: [completed],
      inference: {
        promptTokens: 20,
        outputTokens: 10,
        promptDurationMs: 200,
        generationDurationMs: 1_000,
        totalDurationMs: 1_200,
      },
    });
    expect(prompts[1]).not.toContain(`"code":"${completed.code}"`);
    expect(prompts[1]).toContain("Successful execution count: 1.");
    expect(prompts[1]).toContain("Never import pandas");
    expect(prompts[1]).toContain("Never guess column positions");
    expect(prompts[1]).toContain("sheet.iter_rows(values_only=True)");
    expect(prompts[1]).toContain("CommonMark Markdown when formatting improves readability");
  });
});

describe("AgentLoop limits", () => {
  it("uses a response-only inference after six executable steps", async () => {
    const decision: AgentDecision = {
      action: "execute",
      language: "python",
      code: completed.code,
      summary: "Continue",
    };
    const calls: string[] = [];
    const results = Array.from({ length: 6 }, () => ({ ...completed }));
    const schemas: Array<Record<string, unknown>> = [];
    let generation = 0;
    const loop = new AgentLoop(
      {
        async generate(input) {
          schemas.push(input.jsonSchema);
          generation += 1;
          return await inference([
            generation <= 6
              ? decision
              : { action: "respond", response: "Execution limit reached." },
          ]).generate(input);
        },
      },
      executor(results, calls),
    );

    const result = await loop.run({ task: "Keep going", modelId: "test-model" });

    expect(calls).toHaveLength(6);
    expect(result.response).toBe("Execution limit reached.");
    expect(schemas[6]).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({ action: { const: "respond" } }),
      }),
    );
    expect(schemas[6]).not.toHaveProperty("oneOf");
  });
});
