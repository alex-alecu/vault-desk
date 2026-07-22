import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./app.js";

describe("desktop window layout", () => {
  it("keeps both header spans draggable", () => {
    const markup = renderToStaticMarkup(createElement(App));

    expect(markup).toMatch(/<aside[^>]*class="sidebar"[^>]*>\s*<div[^>]*data-tauri-drag-region/);
    expect(markup).toMatch(/<main[^>]*class="workspace"[^>]*>\s*<div[^>]*data-tauri-drag-region/);
  });

  it("places creation actions first in their sidebar sections", () => {
    const markup = renderToStaticMarkup(createElement(App));

    expect(markup).toMatch(/>Chats<\/h2>.*>New chat<\/button>.*global-session-list/s);
    expect(markup).toMatch(/>Folders<\/h2>.*>New folder<\/button>.*folder-scroll/s);
  });
});
