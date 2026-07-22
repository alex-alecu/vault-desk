import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Conversation } from "./components/conversation.js";

describe("conversation performance presentation", () => {
  it("shows live thinking and metrics only beneath the latest assistant response", () => {
    const markup = renderToStaticMarkup(
      createElement(Conversation, {
        artifacts: [],
        ready: true,
        timeline: [
          { id: "user", kind: "user", text: "Hello" },
          { id: "assistant", kind: "assistant", text: "Hi", runId: "run" },
        ],
        onSuggestion: () => undefined,
        performance: {
          promptTokens: 200,
          outputTokens: 50,
          tokensPerSecond: 12.34,
          promptTokensPerSecond: 98.76,
          totalDurationMs: 4_250,
        },
        runId: "run",
        thinking: "I am checking the local context.",
      }),
    );

    expect(markup).toContain("12.3</strong> tok/s");
    expect(markup).toContain("98.8</strong> prompt tok/s");
    expect(markup).toContain("4.3s</strong> total");
    expect(markup).toContain("Thinking locally");
    expect(markup).toContain("I am checking the local context.");
  });
});
