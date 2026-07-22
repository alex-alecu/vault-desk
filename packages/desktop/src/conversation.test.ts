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

describe("conversation Markdown presentation", () => {
  it("renders assistant CommonMark without interpreting user Markdown or raw HTML", () => {
    const markup = renderToStaticMarkup(
      createElement(Conversation, {
        artifacts: [],
        ready: true,
        timeline: [
          { id: "user", kind: "user", text: "## Keep this literal" },
          {
            id: "assistant",
            kind: "assistant",
            text: "## Result\n\n- **Safe** output\n\n[Reference](https://example.test/page)\n\n![remote](https://example.test/image.png)\n\n<script>alert('no')</script>",
            runId: "run",
          },
        ],
        onSuggestion: () => undefined,
        performance: null,
        runId: "run",
        thinking: null,
      }),
    );

    expect(markup).toContain("<p>## Keep this literal</p>");
    expect(markup).toContain("<h2>Result</h2>");
    expect(markup).toContain("<li><strong>Safe</strong> output</li>");
    expect(markup).toContain("<p>Reference</p>");
    expect(markup).not.toContain("<a href");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("example.test");
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("alert");
  });
});
