import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatHeader } from "./components/chat-header.js";

describe("model hardware status", () => {
  it("explains why inference is disabled on an 8 GB Mac", () => {
    const markup = renderToStaticMarkup(
      <ChatHeader
        activityOpen={false}
        model={{
          modelId: "gemma-4-12b-it-qat-q4_0",
          name: "Gemma 4 12B QAT",
          state: "unsupported",
          thinkingSupported: true,
          message: "This Mac has 8 GB of memory. Vault Desk requires more memory to run locally.",
        }}
        onActivityOpen={() => undefined}
        onUnload={() => undefined}
      />,
    );

    expect(markup).toContain("This Mac has 8 GB of memory");
    expect(markup).toContain("disabled");
  });
});
