import { createHash } from "node:crypto";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AuditEventInput } from "@vault/shared";
import { FakeInferenceWorker } from "@vault/workers";
import { afterEach, describe, expect, it } from "vitest";
import type { InferencePort } from "./inference.js";
import { ModelResolver } from "./models.js";
import { ResourceScheduler } from "./scheduler.js";
import { InferenceSupervisor } from "./supervisor.js";

const roots: string[] = [];

async function modelResolver(): Promise<ModelResolver> {
  const root = await mkdtemp(join(tmpdir(), "vault-m2-models-"));
  roots.push(root);
  const bytes = Buffer.from("model");
  await writeFile(join(root, "model.gguf"), bytes);
  await writeFile(
    join(root, "installed-models.json"),
    JSON.stringify({
      schemaVersion: 1,
      models: [
        {
          modelId: "test-model",
          sha256: createHash("sha256").update(bytes).digest("hex"),
          byteLength: bytes.length,
          runtimeBuild: "fake",
          storeKey: "model.gguf",
          installedAt: new Date().toISOString(),
        },
      ],
    }),
  );
  return ModelResolver.open(root);
}

const generationInput = {
  modelId: "test-model",
  prompt: "ready",
  jsonSchema: { type: "object" },
  contextSize: 512,
  maxTokens: 8,
};

async function supervisor(port: InferencePort, events: AuditEventInput[]) {
  return new InferenceSupervisor(
    port,
    await modelResolver(),
    new ResourceScheduler("local12"),
    (event) => events.push(event),
  );
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("M2 inference orchestration", () => {
  it("resolves approved models, enforces profile memory, and audits generation", async () => {
    const events: AuditEventInput[] = [];
    const supervisor = new InferenceSupervisor(
      new FakeInferenceWorker(),
      await modelResolver(),
      new ResourceScheduler("local12"),
      (event) => events.push(event),
    );
    const result = await supervisor.generate({
      modelId: "test-model",
      prompt: "ready",
      jsonSchema: { type: "object" },
      contextSize: 512,
      maxTokens: 8,
    });
    expect(result.value).toEqual({ result: "ready" });
    expect(result.memory.budgetBytes).toBe(12 * 1024 * 1024 * 1024);
    expect(events).toMatchObject([{ type: "inference.generate", outcome: "succeeded" }]);
  });

  it("rejects missing and modified models", async () => {
    const resolver = await modelResolver();
    await expect(resolver.resolve("missing")).rejects.toThrow("missing_model");
    const root = roots.at(-1);
    if (root === undefined) throw new Error("Missing test root.");
    await writeFile(join(root, "model.gguf"), "changed");
    await expect(resolver.resolve("test-model")).rejects.toThrow("model_integrity_failed");
  });

  it("keeps verified staged bytes stable when the store entry is replaced", async () => {
    const resolver = await modelResolver();
    const root = roots.at(-1);
    if (root === undefined) throw new Error("Missing test root.");
    const staged = await resolver.resolve("test-model");
    try {
      await rename(join(root, "model.gguf"), join(root, "original.gguf"));
      await writeFile(join(root, "model.gguf"), "replacement");
      expect(await readFile(staged.path)).toEqual(Buffer.from("model"));
    } finally {
      await staged.dispose();
    }
  });

  it("prevents overlapping generation and embedding reservations", () => {
    const scheduler = new ResourceScheduler("local16");
    const lease = scheduler.reserve("generate");
    expect(() => scheduler.reserve("embed")).toThrow("inference_memory_budget_exceeded");
    lease.release();
    expect(() => scheduler.reserve("embed")).not.toThrow();
  });
});

describe("M2 inference failure audit", () => {
  it.each(["cancelled", "timeout", "malformed_worker_message", "worker_crash"] as const)(
    "audits typed %s worker failures",
    async (code) => {
      const events: AuditEventInput[] = [];
      const port: InferencePort = {
        async execute() {
          throw Object.assign(new Error(code), { code });
        },
      };
      const inference = await supervisor(port, events);
      await expect(inference.generate(generationInput)).rejects.toMatchObject({ code });
      expect(events).toMatchObject([
        { type: "inference.generate", outcome: "failed", metadata: { code } },
      ]);
    },
  );
});

describe("M2 inference response validation", () => {
  it("audits out-of-memory responses and rejects operation mismatches before success", async () => {
    const events: AuditEventInput[] = [];
    const responses = [
      {
        protocolVersion: 1 as const,
        requestId: "first",
        status: "error" as const,
        error: { code: "out_of_memory" as const, message: "allocation failed" },
      },
      {
        protocolVersion: 1 as const,
        requestId: "second",
        status: "ok" as const,
        operation: "embed" as const,
        vector: [1],
        memory: { cpuRamBytes: 1, gpuVramBytes: 1, budgetBytes: 1 },
      },
    ];
    const port: InferencePort = {
      async execute(execution) {
        const response = responses.shift();
        if (response === undefined) throw new Error("Missing test response.");
        return { ...response, requestId: execution.request.requestId };
      },
    };
    const inference = await supervisor(port, events);
    await expect(inference.generate(generationInput)).rejects.toMatchObject({
      code: "out_of_memory",
    });
    await expect(inference.generate(generationInput)).rejects.toMatchObject({
      code: "malformed_worker_message",
    });
    expect(events).toMatchObject([
      { outcome: "failed", metadata: { code: "out_of_memory" } },
      { outcome: "failed", metadata: { code: "malformed_worker_message" } },
    ]);
  });
});
