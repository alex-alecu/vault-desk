import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./app.js";

describe("desktop window layout", () => {
  it("keeps the title-bar spans and visible chat header draggable", () => {
    const markup = renderToStaticMarkup(createElement(App));

    expect(markup).toMatch(/<aside[^>]*class="sidebar"[^>]*>\s*<div[^>]*data-tauri-drag-region/);
    expect(markup).toMatch(/<main[^>]*class="workspace"[^>]*>\s*<div[^>]*data-tauri-drag-region/);
    expect(markup).toMatch(/<header[^>]*class="chat-header"[^>]*data-tauri-drag-region/);
  });

  it("places creation actions first in their sidebar sections", () => {
    const markup = renderToStaticMarkup(createElement(App));

    expect(markup).toMatch(/>Chats<\/h2>.*>New chat<\/button>.*global-session-list/s);
    expect(markup).toMatch(/>Folders<\/h2>.*>New folder<\/button>.*folder-scroll/s);
  });

  it("keeps model identity and memory controls in the chat header", () => {
    const markup = renderToStaticMarkup(createElement(App));

    expect(markup).toContain("Gemma 4 12B");
    expect(markup).toContain("Thinking on");
    expect(markup).toMatch(/<button[^>]*class="header-action unload-action"[^>]*>.*Unload/s);
  });
});
