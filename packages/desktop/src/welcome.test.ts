import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Conversation } from "./components/conversation.js";

const emptyConversation = {
  artifacts: [],
  onSuggestion: () => undefined,
  performance: null,
  ready: true,
  runId: undefined,
  thinking: null,
  timeline: [],
};

describe("empty conversation context", () => {
  it("shows the folder name for a folder conversation", () => {
    const markup = renderToStaticMarkup(
      createElement(Conversation, { ...emptyConversation, folderName: "Project files" }),
    );

    expect(markup).toContain('<div class="welcome-context">Project files</div>');
    expect(markup).not.toContain("welcome-mark");
  });

  it("shows no context label for a global chat", () => {
    const markup = renderToStaticMarkup(createElement(Conversation, emptyConversation));

    expect(markup).not.toContain("welcome-context");
    expect(markup).not.toContain(">V<");
  });
});
