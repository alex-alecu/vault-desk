import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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

  it("snapshots regular folder files and excludes a symlink escape", async () => {
    const { root, catalog, store, conversations } = await fixture();
    const selected = join(root, "selected-folder");
    const outside = join(root, "outside.txt");
    await mkdir(selected);
    await writeFile(join(selected, "inside.txt"), "allowed");
    await writeFile(outside, "denied");
    await symlink(outside, join(selected, "escape.txt"));
    const folder = conversations.addFolder(selected);
    const session = conversations.createSession(folder.id);
    const duplicateRoot = join(root, "duplicate");
    await mkdir(duplicateRoot);
    const duplicate = join(duplicateRoot, "inside.txt");
    await writeFile(duplicate, "attached");
    await store.addAttachment(session.id, duplicate);

    const snapshot = await new AgentInputResolver(catalog.database, store).resolve(session.id);
    expect(snapshot.files.map((item) => item.name)).toEqual(["inside.txt", "01-inside.txt"]);
    expect(await readFile(snapshot.files[0]?.path ?? "", "utf8")).toBe("allowed");
    expect(await readFile(snapshot.files[1]?.path ?? "", "utf8")).toBe("attached");
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
    store.transitionRun(run.id, "running");

    expect(store.recoverInterrupted()).toBe(1);
    const recovered = store.snapshot(run.id);
    expect(recovered.run).toMatchObject({ state: "failed", error: "core_restarted" });
    expect(recovered.events.at(-1)).toMatchObject({ type: "run.failed" });
    catalog.close();
  });
});
