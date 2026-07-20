import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openWorkspaceCatalog } from "../workspace/catalog.js";
import { ConversationStore } from "./store.js";

const roots: string[] = [];

function temporaryRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `vault-${name}-`));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("ConversationStore folder grants", () => {
  it("persists safe folder summaries without exposing host paths", () => {
    const stateRoot = temporaryRoot("state");
    const selectedRoot = join(temporaryRoot("selected"), "client-work");
    mkdirSync(selectedRoot);
    const catalog = openWorkspaceCatalog(stateRoot);
    const store = new ConversationStore(catalog.database);

    const folder = store.addFolder(selectedRoot);
    expect(folder.name).toBe("client-work");
    expect(folder).not.toHaveProperty("rootPath");
    catalog.close();

    const reopened = openWorkspaceCatalog(stateRoot);
    expect(new ConversationStore(reopened.database).listFolders()).toEqual([folder]);
    reopened.close();
  });

  it("rejects a symlink as a folder grant", () => {
    const stateRoot = temporaryRoot("symlink-state");
    const selectedRoot = temporaryRoot("symlink-target");
    const link = join(temporaryRoot("symlink-parent"), "linked");
    symlinkSync(selectedRoot, link, "dir");
    const catalog = openWorkspaceCatalog(stateRoot);
    const store = new ConversationStore(catalog.database);

    expect(() => store.addFolder(link)).toThrow("folder_grant_invalid");
    catalog.close();
  });
});

describe("ConversationStore sessions", () => {
  it("keeps global chats separate and paginates folder sessions", () => {
    const stateRoot = temporaryRoot("sessions");
    const selectedRoot = join(temporaryRoot("selected"), "project");
    mkdirSync(selectedRoot);
    const catalog = openWorkspaceCatalog(stateRoot);
    const store = new ConversationStore(catalog.database);
    const folder = store.addFolder(selectedRoot);
    const sessionIds = new Set<string>();

    for (let index = 0; index < 6; index += 1) {
      const session = store.createSession(folder.id);
      sessionIds.add(session.id);
      store.appendMessage(session.id, "user", `Work item ${index + 1}`);
    }
    const global = store.createSession(null);
    const first = store.listSessions(folder.id);
    expect(first.items).toHaveLength(5);
    expect(first.nextCursor).not.toBeNull();
    const second = store.listSessions(folder.id, first.nextCursor ?? undefined);
    expect(second.items).toHaveLength(1);
    expect(new Set([...first.items, ...second.items].map((item) => item.id))).toEqual(sessionIds);
    expect(store.listSessions(null).items.map((item) => item.id)).toEqual([global.id]);
    catalog.close();
  });
});

describe("ConversationStore message validation", () => {
  it("rejects whitespace without corrupting the session title", () => {
    const catalog = openWorkspaceCatalog(temporaryRoot("message"));
    const store = new ConversationStore(catalog.database);
    const session = store.createSession(null);

    expect(() => store.appendMessage(session.id, "user", "   ")).toThrow();
    expect(store.listSessions(null).items[0]?.title).toBe("New chat");
    expect(store.listMessages(session.id)).toEqual([]);
    catalog.close();
  });
});
