import { mkdir, mkdtemp, realpath, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConversationStore } from "../conversations/store.js";
import { JobStore } from "../jobs/jobs.js";
import { ArtifactStore } from "../workspace/artifacts.js";
import { openWorkspaceCatalog } from "../workspace/catalog.js";
import { WorkspaceScope } from "../workspace/scope.js";
import { AgentInputResolver } from "./inputs.js";
import { AgentStore } from "./store.js";

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "vault-agent-store-"));
  roots.push(root);
  const scope = await WorkspaceScope.create(root);
  const catalog = openWorkspaceCatalog(scope.root);
  const store = new AgentStore(catalog.database, await ArtifactStore.create(scope));
  const conversations = new ConversationStore(catalog.database);
  return { root, catalog, store, conversations, jobs: new JobStore(catalog.database) };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("M3 session-owned inputs", () => {
  it("persists drafts and immutable selected-file copies", async () => {
    const { root, catalog, store, conversations } = await fixture();
    const session = conversations.createSession(null);
    expect(store.saveDraft(session.id, "continue here").content).toBe("continue here");
    expect(store.loadDraft(session.id)?.content).toBe("continue here");

    const selected = join(root, "selected");
    await mkdir(selected);
    const source = join(selected, "notes.txt");
    await writeFile(source, "first version");
    const attached = await store.addAttachment(session.id, source);
    await writeFile(source, "changed version");

    expect(store.listAttachments(session.id)).toEqual([attached]);
    expect((await store.attachmentBytes(attached)).toString()).toBe("first version");
    catalog.close();
  });

  it("passes the canonical folder live and snapshots only explicit attachments", async () => {
    const { root, catalog, store, conversations } = await fixture();
    const selected = join(root, "selected-folder");
    await mkdir(selected);
    await mkdir(join(selected, "nested"));
    await writeFile(join(selected, "nested", "inside.txt"), "allowed");
    const folder = conversations.addFolder(selected);
    const session = conversations.createSession(folder.id);
    const duplicateRoot = join(root, "duplicate");
    await mkdir(duplicateRoot);
    const duplicate = join(duplicateRoot, "inside.txt");
    await writeFile(duplicate, "attached");
    await store.addAttachment(session.id, duplicate);

    const snapshot = await new AgentInputResolver(catalog.database, store).resolve(session.id);
    expect(snapshot.sourceFolder).toBe(await realpath(selected));
    expect(snapshot.attachments.map((item) => item.name)).toEqual(["01-inside.txt"]);
    await snapshot.dispose();
    catalog.close();
  });
});

describe("M3 live folder capacity", () => {
  it("does not enumerate or size-limit the selected folder", async () => {
    const { root, catalog, store, conversations } = await fixture();
    const selected = join(root, "selected-folder");
    await mkdir(selected);
    await Promise.all(
      Array.from({ length: 65 }, async (_, index) => {
        await writeFile(join(selected, `${index.toString().padStart(2, "0")}.txt`), `${index}`);
      }),
    );
    const sparse = join(selected, "sparse.bin");
    await writeFile(sparse, "");
    await truncate(sparse, 513 * 1024 * 1024);
    const folder = conversations.addFolder(selected);
    const session = conversations.createSession(folder.id);

    const snapshot = await new AgentInputResolver(catalog.database, store).resolve(session.id);
    expect(snapshot.sourceFolder).toBe(await realpath(selected));
    expect(snapshot.attachments).toEqual([]);
    await snapshot.dispose();
    catalog.close();
  });
});

describe("M3 interrupted run recovery", () => {
  it("makes an interrupted run explicitly failed and observable", async () => {
    const { catalog, store, conversations, jobs } = await fixture();
    const session = conversations.createSession(null);
    const job = jobs.create("agent", "recovery-test");
    const run = store.createRun(session.id, job.id);
    jobs.transition(job.id, "running");
    store.transitionRun(run.id, { state: "running" });

    expect(store.listRuns(session.id).map((item) => item.id)).toEqual([run.id]);
    expect(store.recoverInterrupted()).toBe(1);
    const recovered = store.snapshot(run.id);
    expect(recovered.run).toMatchObject({ state: "failed", error: "core_restarted" });
    expect(recovered.events.at(-1)).toMatchObject({ type: "run.failed" });
    catalog.close();
  });
});
