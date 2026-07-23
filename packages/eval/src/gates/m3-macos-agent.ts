import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createVaultCore, resolveInferenceHardwarePolicy } from "@vault/core";
import type { AgentRunSnapshot } from "@vault/shared";
import { readCanonicalModelManifest, verifyModelFile } from "../models.js";
import { runMacOsGuestEvidence } from "./m3-macos-guest.js";

const repositoryRoot = process.cwd();
const helper = join(
  repositoryRoot,
  "packages/workers/native/macos-vz-helper/.generated/vault-vz-helper",
);
const images = join(repositoryRoot, "packages/workers/images");
const modelRoot = join(repositoryRoot, "packages/eval/.generated/models");
const modelPath = join(modelRoot, "gemma-4-12b-it-qat-q4_0.gguf");
async function prepareModelStore(): Promise<void> {
  const manifest = await readCanonicalModelManifest();
  const model = manifest.models.find((candidate) => candidate.id === "gemma-4-12b-it-qat-q4_0");
  if (model === undefined) throw new Error("Canonical M3 model is missing.");
  await verifyModelFile(model, modelPath);
  await writeFile(
    join(modelRoot, "installed-models.json"),
    JSON.stringify({
      schemaVersion: 1,
      models: [
        {
          modelId: model.id,
          sha256: model.sha256,
          byteLength: model.byteLength,
          runtimeBuild: "node-llama-cpp@3.19.0",
          storeKey: basename(modelPath),
          installedAt: new Date().toISOString(),
        },
      ],
    }),
  );
}

async function awaitRun(
  getSnapshot: () => Promise<AgentRunSnapshot>,
  deadlineMs: number,
): Promise<AgentRunSnapshot> {
  const deadline = performance.now() + deadlineMs;
  let snapshot: AgentRunSnapshot | undefined;
  while (performance.now() < deadline) {
    snapshot = await getSnapshot();
    if (snapshot.run.state !== "queued" && snapshot.run.state !== "running") return snapshot;
    await new Promise((accept) => setTimeout(accept, 500));
  }
  throw new Error(`Real agent run timed out: ${JSON.stringify(snapshot)}`);
}

async function automaticModelEvidence(core: Awaited<ReturnType<typeof createVaultCore>>) {
  const model = await core.modelStatus();
  const policy = resolveInferenceHardwarePolicy("auto");
  if (
    !policy.supported ||
    model.state !== "ready" ||
    model.memoryBudgetBytes !== policy.memoryBudgetBytes ||
    (model.cpuRamBytes ?? 0) + (model.gpuVramBytes ?? 0) > policy.memoryBudgetBytes ||
    (model.contextSizeTokens ?? 0) <= 8_192
  ) {
    throw new Error(`Automatic model memory or context proof failed: ${JSON.stringify(model)}`);
  }
  return model;
}

async function requireMissing(path: string): Promise<void> {
  try {
    await stat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error(`Deleted session retained its workspace manifest: ${path}`);
}

async function workspaceLifecycleEvidence(
  core: Awaited<ReturnType<typeof createVaultCore>>,
  workspace: string,
  sessionId: string,
  folderId: string,
) {
  const manifest = join(workspace, ".vault", "agent-workspaces", "manifests", `${sessionId}.json`);
  if (!(await stat(manifest)).isFile()) throw new Error("Agent workspace was not committed.");
  if (!(await core.revokeFolder(folderId))) throw new Error("Folder revocation proof failed.");
  if (!(await stat(manifest)).isFile()) throw new Error("Revocation deleted the workspace.");
  if (!(await core.deleteSession(sessionId))) throw new Error("Session deletion proof failed.");
  await requireMissing(manifest);
  return { folderRevocation: "workspace_retained", sessionDeletion: "workspace_removed" };
}

function requireRealAgentResult(snapshot: AgentRunSnapshot, language: "python" | "node") {
  const attempts = snapshot.events.filter((event) => event.type === "execution.completed");
  const executions = attempts.filter(
    (event) => event.language === language && event.termination === "completed",
  );
  if (
    snapshot.run.state !== "succeeded" ||
    executions.length < 2 ||
    !snapshot.artifacts.some((artifact) => artifact.name === `${language}-result.txt`)
  ) {
    throw new Error(`Real ${language} multi-step agent proof failed: ${JSON.stringify(snapshot)}`);
  }
  return { attempts, executions };
}

async function runRealAgent(root: string, language: "python" | "node") {
  const workspace = join(root, `${language}-workspace`);
  const source = join(root, `${language}-source`);
  await Promise.all([mkdir(workspace), mkdir(source)]);
  await writeFile(join(source, `${language}-input.txt`), "M3 passed");
  const core = await createVaultCore({
    workspaceDir: workspace,
    modelStoreDir: modelRoot,
    profile: "auto",
    agentHelperPath: helper,
    agentImageRoot: images,
  });
  try {
    const folder = await core.addFolder(source);
    const session = await core.createSession(folder.id);
    const run = await core.startAgent(
      session.id,
      `Use exactly two separate source executions. Every execution must set language to ${language} and provide source and path; never choose shell or command. Execution 1: read /source/${language}-input.txt and print its exact contents. Execution 2: read it and write the exact contents to /workspace/${language}-result.txt. After one successful observation, do not repeat execution 1. Do not respond before both executions succeed.`,
    );
    const snapshot = await awaitRun(() => core.getAgentRun(run.id), 10 * 60_000);
    const { attempts, executions } = requireRealAgentResult(snapshot, language);
    const model = await automaticModelEvidence(core);
    const lifecycle = await workspaceLifecycleEvidence(core, workspace, session.id, folder.id);
    return {
      executions: executions.length,
      attempts: attempts.length,
      artifacts: snapshot.artifacts.length,
      memoryBudgetBytes: model.memoryBudgetBytes,
      cpuRamBytes: model.cpuRamBytes,
      gpuVramBytes: model.gpuVramBytes,
      contextSizeTokens: model.contextSizeTokens,
      ...lifecycle,
    };
  } finally {
    await core.close();
  }
}

async function main(): Promise<void> {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    throw new Error("The certified M3 macOS gate requires Apple silicon.");
  }
  const root = await mkdtemp(join(tmpdir(), "vault-m3-agent-gate-"));
  try {
    const guest = await runMacOsGuestEvidence(root, helper, images);
    await prepareModelStore();
    const realPython = await runRealAgent(root, "python");
    const realNode = await runRealAgent(root, "node");
    console.log(
      JSON.stringify({
        classification: "certified",
        guest,
        realPython,
        realNode,
      }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await main();
