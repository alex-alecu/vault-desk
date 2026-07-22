import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentDecision } from "@vault/shared";
import type { CodeAgentLauncher } from "@vault/workers";
import { afterEach, describe, expect, it } from "vitest";
import { AuditLog } from "../audit/log.js";
import { ConversationStore } from "../conversations/store.js";
import { JobStore } from "../jobs/jobs.js";
import type { InferenceService } from "../runtime/inference.js";
import { ArtifactStore } from "../workspace/artifacts.js";
import { openWorkspaceCatalog } from "../workspace/catalog.js";
import { WorkspaceScope } from "../workspace/scope.js";
import { AgentService } from "./service.js";
import { AgentStore } from "./store.js";

const roots: string[] = [];

async function waitForTerminal(service: AgentService, runId: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const snapshot = service.snapshot(runId);
    if (snapshot.run.state !== "queued" && snapshot.run.state !== "running") return snapshot;
    await new Promise((accept) => setTimeout(accept, 2));
  }
  throw new Error("agent_test_timeout");
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: one complete lifecycle is the behavior under test.
describe("M3 persisted agent lifecycle", () => {
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: setup and assertions deliberately show the complete persisted boundary.
  it("commits a multi-step response, events, and immutable generated artifact", async () => {
    const root = await mkdtemp(join(tmpdir(), "vault-agent-service-"));
    roots.push(root);
    const scope = await WorkspaceScope.create(root);
    const catalog = openWorkspaceCatalog(scope.root);
    const artifacts = await ArtifactStore.create(scope);
    const conversations = new ConversationStore(catalog.database);
    const store = new AgentStore(catalog.database, artifacts);
    const decisions: AgentDecision[] = [
      { action: "execute", language: "python", code: "print('ok')", summary: "Run Python" },
      { action: "respond", response: "Finished safely." },
    ];
    const inference: Pick<InferenceService, "generate"> = {
      async generate() {
        const value = decisions.shift();
        if (value === undefined) throw new Error("missing_decision");
        return {
          protocolVersion: 1,
          requestId: "agent-test",
          status: "ok",
          operation: "generate",
          value,
          memory: {
            cpuRamBytes: 1,
            gpuVramBytes: 1,
            budgetBytes: 1,
            detectedGpuVramBytes: 1,
          },
          performance: {
            promptTokens: 10,
            outputTokens: 5,
            promptDurationMs: 100,
            generationDurationMs: 500,
            totalDurationMs: 600,
          },
        };
      },
    };
    const launcher: CodeAgentLauncher = {
      async executeAgent(request) {
        return {
          language: request.language,
          code: request.code,
          exitCode: 0,
          stdout: "ok\n",
          stderr: "",
          durationMs: 2,
          termination: "completed",
          artifacts: [
            {
              name: "result.txt",
              mediaType: "text/plain",
              bytesBase64: Buffer.from("result").toString("base64"),
            },
          ],
        };
      },
    };
    const service = new AgentService(
      catalog.database,
      store,
      conversations,
      new JobStore(catalog.database),
      artifacts,
      inference,
      launcher,
      new AuditLog(catalog.database),
    );
    const session = conversations.createSession(null);
    const run = service.start(session.id, "Build a result");
    const snapshot = await waitForTerminal(service, run.id);

    expect(service.listRuns(session.id).map((item) => item.id)).toEqual([run.id]);
    expect(snapshot.run).toMatchObject({ state: "succeeded", response: "Finished safely." });
    expect(snapshot.run.performance).toMatchObject({
      promptTokens: 20,
      outputTokens: 10,
      tokensPerSecond: 10,
      promptTokensPerSecond: 100,
    });
    expect(snapshot.thinking).toBeNull();
    expect(snapshot.events.map((item) => item.type)).toEqual([
      "run.started",
      "inference.started",
      "execution.started",
      "execution.completed",
      "inference.started",
      "assistant.completed",
    ]);
    expect(snapshot.artifacts).toHaveLength(1);
    expect(conversations.listMessages(session.id).map((item) => item.role)).toEqual([
      "user",
      "assistant",
    ]);
    await service.close();
    catalog.close();
  });

  it("persists an explicit cancelled outcome", async () => {
    const root = await mkdtemp(join(tmpdir(), "vault-agent-cancel-"));
    roots.push(root);
    const scope = await WorkspaceScope.create(root);
    const catalog = openWorkspaceCatalog(scope.root);
    const artifacts = await ArtifactStore.create(scope);
    const conversations = new ConversationStore(catalog.database);
    const store = new AgentStore(catalog.database, artifacts);
    const inference: Pick<InferenceService, "generate"> = {
      async generate(_input, signal) {
        signal?.throwIfAborted();
        return await new Promise((_accept, reject) => {
          signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
      },
    };
    const launcher: CodeAgentLauncher = {
      async executeAgent() {
        throw new Error("execution_should_not_start");
      },
    };
    const service = new AgentService(
      catalog.database,
      store,
      conversations,
      new JobStore(catalog.database),
      artifacts,
      inference,
      launcher,
      new AuditLog(catalog.database),
    );
    const session = conversations.createSession(null);
    const run = service.start(session.id, "Cancel this task");
    expect(service.cancel(run.jobId)).toBe(true);
    const snapshot = await waitForTerminal(service, run.id);
    expect(snapshot.run.state).toBe("cancelled");
    expect(snapshot.events.at(-1)?.type).toBe("run.cancelled");
    await service.close();
    catalog.close();
  });

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: setup and assertions keep the cancellation race at the persisted boundary.
  it("preserves a cancellation accepted before success commits", async () => {
    const root = await mkdtemp(join(tmpdir(), "vault-agent-late-cancel-"));
    roots.push(root);
    const scope = await WorkspaceScope.create(root);
    const catalog = openWorkspaceCatalog(scope.root);
    const artifacts = await ArtifactStore.create(scope);
    const conversations = new ConversationStore(catalog.database);
    const store = new AgentStore(catalog.database, artifacts);
    let service: AgentService;
    let jobId = "";
    const inference: Pick<InferenceService, "generate"> = {
      async generate() {
        expect(service.cancel(jobId)).toBe(true);
        return {
          protocolVersion: 1,
          requestId: "agent-late-cancel-test",
          status: "ok",
          operation: "generate",
          value: { action: "respond", response: "This must not commit." },
          memory: {
            cpuRamBytes: 1,
            gpuVramBytes: 1,
            budgetBytes: 1,
            detectedGpuVramBytes: 1,
          },
          performance: {
            promptTokens: 1,
            outputTokens: 1,
            promptDurationMs: 1,
            generationDurationMs: 1,
            totalDurationMs: 2,
          },
        };
      },
    };
    const launcher: CodeAgentLauncher = {
      async executeAgent() {
        throw new Error("execution_should_not_start");
      },
    };
    service = new AgentService(
      catalog.database,
      store,
      conversations,
      new JobStore(catalog.database),
      artifacts,
      inference,
      launcher,
      new AuditLog(catalog.database),
    );
    const session = conversations.createSession(null);
    const run = service.start(session.id, "Cancel at completion");
    jobId = run.jobId;
    const snapshot = await waitForTerminal(service, run.id);
    const job = catalog.database
      .prepare("SELECT state, cancellation_requested FROM jobs WHERE id = ?")
      .get(run.jobId);

    expect(snapshot.run).toMatchObject({ state: "cancelled", response: null });
    expect(snapshot.events.at(-1)?.type).toBe("run.cancelled");
    expect(conversations.listMessages(session.id).map((item) => item.role)).toEqual(["user"]);
    expect(job).toEqual({ state: "cancelled", cancellation_requested: 1 });
    await service.close();
    catalog.close();
  });
});
