import { describe, expect, it } from "vitest";
import { generationInput } from "../agent/prompt.js";
import { effectiveGenerationInput } from "./inference.js";

describe("M3 effective inference prompts", () => {
  it("constructs the exact Gemma function-call prompt before worker dispatch", () => {
    const input = effectiveGenerationInput({
      modelId: "gemma-4-test",
      prompt: "Respond.",
      jsonSchema: { type: "object" },
      contextSize: 512,
      maxTokens: 8,
    });
    expect(input.prompt).toBe("Respond.\nCall exactly one available function with your answer.");
    expect(effectiveGenerationInput(input)).toBe(input);
  });

  it("includes the suffix in the agent context-budget calculation", () => {
    const input = generationInput(
      { task: "Reply", modelId: "gemma-4-test" },
      {
        executions: [],
        rejectedDuplicates: 0,
        inference: {
          promptTokens: 0,
          outputTokens: 0,
          promptDurationMs: 0,
          generationDurationMs: 0,
          totalDurationMs: 0,
        },
      },
    );
    expect(input.prompt).toMatch(/Call exactly one available function with your answer\.$/u);
    expect(Math.ceil(JSON.stringify(input).length / 4)).toBeLessThanOrEqual(4_096);
  });
});
