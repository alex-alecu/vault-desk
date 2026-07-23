import { JobIdSchema, type StructuredGenerationRequest } from "@vault/shared";
import type { ChatSessionModelFunctions, LlamaChatSession, Token } from "node-llama-cpp";
import { describe, expect, it } from "vitest";
import { structuredValue } from "./structured.js";

describe("structuredValue", () => {
  it("forwards generated function-call tokens to performance timing", async () => {
    let tokenChunks = 0;
    const session = {
      async prompt(
        _prompt: string,
        options: {
          functions: ChatSessionModelFunctions;
          onToken(tokens: Token[]): void;
        },
      ) {
        options.onToken([1 as Token]);
        const action = Object.values(options.functions)[0];
        if (action === undefined) throw new Error("Missing structured action.");
        return await action.handler({ response: ["Done."] } as never);
      },
    } as unknown as LlamaChatSession;
    const request = {
      protocolVersion: 1,
      requestId: "request",
      jobId: JobIdSchema.parse("00000000-0000-4000-8000-000000000001"),
      operation: "generate",
      modelId: "gemma-4-test",
      prompt: "Respond.",
      jsonSchema: {
        type: "object",
        properties: {
          action: { const: "respond" },
          response: { type: "array", items: { type: "string" } },
        },
        required: ["action", "response"],
      },
      contextSize: "auto",
      maxTokens: 16,
    } satisfies StructuredGenerationRequest;

    const value = await structuredValue(request, {} as never, session, {
      onResponseChunk: () => undefined,
      onToken: () => {
        tokenChunks += 1;
      },
    });

    expect(tokenChunks).toBe(1);
    expect(value).toEqual({ action: "respond", response: ["Done."] });
  });
});
