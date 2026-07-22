import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatHeader } from "./components/chat-header.js";

describe("model hardware status", () => {
  it("shows live VRAM with context beneath it beside a loaded model", () => {
    const markup = renderToStaticMarkup(
      <ChatHeader
        technicalDetailsOpen={false}
        model={{
          modelId: "gemma-4-12b-it-qat-q4_0",
          name: "Gemma 4 12B QAT",
          state: "ready",
          thinkingSupported: true,
          cpuRamBytes: 1024 ** 3,
          gpuVramBytes: 11.5 * 1024 ** 3,
          contextSizeTokens: 262_144,
        }}
        onTechnicalDetailsOpen={() => undefined}
        onUnload={() => undefined}
      />,
    );

    expect(markup).toContain(
      '<span class="model-usage"><span>11.5 GiB VRAM</span><span>256K context</span></span>',
    );
    expect(markup).not.toContain("1.0 GiB RAM");
  });

  it("explains why inference is disabled on an 8 GB Mac", () => {
    const markup = renderToStaticMarkup(
      <ChatHeader
        technicalDetailsOpen={false}
        model={{
          modelId: "gemma-4-12b-it-qat-q4_0",
          name: "Gemma 4 12B QAT",
          state: "unsupported",
          thinkingSupported: true,
          message: "This Mac has 8 GB of memory. Vault Desk requires more memory to run locally.",
        }}
        onTechnicalDetailsOpen={() => undefined}
        onUnload={() => undefined}
      />,
    );

    expect(markup).toContain("This Mac has 8 GB of memory");
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-label="Open technical details"');
    expect(markup).not.toContain("model-usage");
  });
});
