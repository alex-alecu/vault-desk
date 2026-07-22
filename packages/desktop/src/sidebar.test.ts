import { FolderSummarySchema, SessionSummarySchema } from "@vault/shared";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./components/sidebar.js";

const timestamp = "2026-07-22T10:00:00.000Z";

describe("sidebar rows", () => {
  it("uses the same row controls for chats and folders, with an icon only on folders", () => {
    const folder = FolderSummarySchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Project",
      createdAt: timestamp,
      revokedAt: null,
    });
    const globalSession = SessionSummarySchema.parse({
      id: "00000000-0000-4000-8000-000000000002",
      folderId: null,
      title: "Global chat",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const folderSession = SessionSummarySchema.parse({
      id: "00000000-0000-4000-8000-000000000003",
      folderId: folder.id,
      title: "Folder chat",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const markup = renderToStaticMarkup(
      createElement(Sidebar, {
        activeSessionId: globalSession.id,
        disabled: false,
        dispatch: () => undefined,
        folders: [{ ...folder, expanded: true, nextCursor: null, sessions: [folderSession] }],
        globalSessions: [globalSession],
        onAddFolder: () => undefined,
        onNewSession: () => undefined,
        onDeleteSession: () => undefined,
        onRevokeFolder: () => undefined,
        onSelectSession: () => undefined,
        onShowMore: () => undefined,
      }),
    );

    expect(markup.match(/class="sidebar-item-row"/gu)).toHaveLength(3);
    expect(markup.match(/class="sidebar-item-delete"/gu)).toHaveLength(3);
    expect(markup.match(/icon-folder/gu)).toHaveLength(1);
    expect(markup.match(/icon-message/gu)).toHaveLength(2);
    expect(markup).toContain("Add folder");
    expect(markup).not.toContain("icon-chevron");
  });
});
