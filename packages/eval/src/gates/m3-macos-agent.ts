import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createVaultCore } from "@vault/core";
import type { AgentExecutionResult, AgentRunSnapshot, WorkerLimits } from "@vault/shared";
import { MacOsMicroVmLauncher } from "@vault/workers";
import { readCanonicalModelManifest, verifyModelFile } from "../models.js";

const repositoryRoot = process.cwd();
const helper = join(
  repositoryRoot,
  "packages/workers/native/macos-vz-helper/.generated/vault-vz-helper",
);
const images = join(repositoryRoot, "packages/workers/images");
const modelRoot = join(repositoryRoot, "packages/eval/.generated/models");
const modelPath = join(modelRoot, "gemma-4-12b-it-qat-q4_0.gguf");
const limits: WorkerLimits = {
  wallTimeMs: 30_000,
  inputCount: 4,
  inputBytes: 8 * 1024 * 1024,
  memoryBytes: 2 * 1024 * 1024 * 1024,
  scratchBytes: 64 * 1024 * 1024,
  outputBytes: 8 * 1024 * 1024,
  cpuCount: 2,
};

function requireSuccess(result: AgentExecutionResult): void {
  if (result.exitCode !== 0 || result.termination !== "completed") {
    throw new Error(`Guest execution failed: ${result.stderr}`);
  }
}

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

async function runRealAgent(root: string, language: "python" | "node") {
  const workspace = join(root, `${language}-workspace`);
  await mkdir(workspace);
  await writeFile(join(root, `${language}-input.txt`), "M3 passed");
  const core = await createVaultCore({
    workspaceDir: workspace,
    modelStoreDir: modelRoot,
    profile: "local16",
    agentHelperPath: helper,
    agentImageRoot: images,
  });
  try {
    const folder = await core.addFolder(root);
    const session = await core.createSession(folder.id);
    const run = await core.startAgent(
      session.id,
      `Use exactly two separate ${language} executions. Execution 1: read ${language}-input.txt and print its exact contents. Execution 2: read it and write the exact contents to an artifact named ${language}-result.txt. After one successful observation, do not repeat execution 1. Do not respond before both executions succeed.`,
    );
    const snapshot = await awaitRun(() => core.getAgentRun(run.id), 10 * 60_000);
    const attempts = snapshot.events.filter((event) => event.type === "execution.completed");
    const executions = attempts.filter(
      (event) => event.language === language && event.termination === "completed",
    );
    if (
      snapshot.run.state !== "succeeded" ||
      executions.length < 2 ||
      !snapshot.artifacts.some((artifact) => artifact.name === `${language}-result.txt`)
    ) {
      throw new Error(
        `Real ${language} multi-step agent proof failed: ${JSON.stringify(snapshot)}`,
      );
    }
    return {
      executions: executions.length,
      attempts: attempts.length,
      artifacts: snapshot.artifacts.length,
    };
  } finally {
    await core.close();
  }
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: keeping both certified guest probes together makes the physical-VM evidence atomic and readable.
async function main(): Promise<void> {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    throw new Error("The certified M3 macOS gate requires Apple silicon.");
  }
  const root = await mkdtemp(join(tmpdir(), "vault-m3-agent-gate-"));
  try {
    const input = join(root, "input.txt");
    await writeFile(input, "read-only evidence");
    const launcher = new MacOsMicroVmLauncher(helper, images);
    const python = await launcher.executeAgent({
      jobId: "00000000-0000-4000-8000-000000000031",
      language: "python",
      code: [
        "import json, os, pathlib, shutil, socket, sqlite3",
        "import PIL, pypdf, openpyxl, docx",
        "inputs = list(pathlib.Path(os.environ['VAULT_INPUT_DIR']).iterdir())",
        "write_blocked = False",
        "try:",
        "    inputs[0].write_text('changed')",
        "except OSError:",
        "    write_blocked = True",
        "network_blocked = False",
        "ipv6_blocked = False",
        "dns_blocked = False",
        "try:",
        "    socket.socket(socket.AF_INET, socket.SOCK_STREAM)",
        "except OSError:",
        "    network_blocked = True",
        "try:",
        "    socket.socket(socket.AF_INET6, socket.SOCK_STREAM)",
        "except OSError:",
        "    ipv6_blocked = True",
        "try:",
        "    socket.getaddrinfo('vault-network-probe.invalid', 443)",
        "except OSError:",
        "    dns_blocked = True",
        "artifact = pathlib.Path(os.environ['VAULT_ARTIFACT_DIR']) / 'python-result.json'",
        "result = {'input': inputs[0].read_text(), 'writeBlocked': write_blocked, 'networkBlocked': network_blocked, 'ipv6Blocked': ipv6_blocked, 'dnsBlocked': dns_blocked, 'pipAbsent': shutil.which('pip') is None, 'shellAbsent': shutil.which('sh') is None, 'credentialsAbsent': all(key not in os.environ for key in ['AWS_ACCESS_KEY_ID', 'GITHUB_TOKEN', 'SSH_AUTH_SOCK']), 'hostPathsAbsent': not pathlib.Path('/Users').exists(), 'versions': [PIL.__version__, pypdf.__version__, openpyxl.__version__, docx.__version__]} ",
        "artifact.write_text(json.dumps(result))",
        "print(json.dumps(result))",
      ].join("\n"),
      readonlyInputs: [{ path: input, name: "input.txt" }],
      limits,
    });
    requireSuccess(python);
    const proof = JSON.parse(python.stdout) as Record<string, unknown>;
    if (
      proof.input !== "read-only evidence" ||
      proof.writeBlocked !== true ||
      proof.networkBlocked !== true ||
      proof.ipv6Blocked !== true ||
      proof.dnsBlocked !== true ||
      proof.pipAbsent !== true ||
      proof.shellAbsent !== true ||
      proof.credentialsAbsent !== true ||
      proof.hostPathsAbsent !== true ||
      python.artifacts[0]?.name !== "python-result.json"
    ) {
      throw new Error("Python guest isolation or runtime proof failed.");
    }

    const node = await launcher.executeAgent({
      jobId: "00000000-0000-4000-8000-000000000032",
      language: "node",
      code: [
        "import fs from 'node:fs';",
        "import path from 'node:path';",
        "const major = Number(process.versions.node.split('.')[0]);",
        "const npmAbsent = !fs.existsSync('/usr/bin/npm');",
        "fs.writeFileSync(path.join(process.env.VAULT_ARTIFACT_DIR, 'node-result.json'), JSON.stringify({major, npmAbsent}));",
        "console.log(JSON.stringify({major, npmAbsent}));",
      ].join("\n"),
      readonlyInputs: [],
      limits,
    });
    requireSuccess(node);
    const nodeProof = JSON.parse(node.stdout) as { major: number; npmAbsent: boolean };
    if (nodeProof.major !== 24 || !nodeProof.npmAbsent) {
      throw new Error("Node runtime or package-install denial proof failed.");
    }
    const timeout = await launcher.executeAgent({
      jobId: "00000000-0000-4000-8000-000000000033",
      language: "python",
      code: "import time\ntime.sleep(60)",
      readonlyInputs: [],
      limits: { ...limits, wallTimeMs: 250 },
    });
    if (timeout.termination !== "timeout") throw new Error("Guest timeout proof failed.");
    const outputLimit = await launcher.executeAgent({
      jobId: "00000000-0000-4000-8000-000000000034",
      language: "python",
      code: "print('x' * 10000)",
      readonlyInputs: [],
      limits: { ...limits, outputBytes: 4096 },
    });
    if (outputLimit.termination !== "resource_limit") {
      throw new Error("Guest output-limit proof failed.");
    }
    await prepareModelStore();
    const realPython = await runRealAgent(root, "python");
    const realNode = await runRealAgent(root, "node");
    console.log(
      JSON.stringify({
        classification: "certified",
        python: proof,
        node: nodeProof,
        timeout: timeout.termination,
        outputLimit: outputLimit.termination,
        realPython,
        realNode,
        artifactCount: python.artifacts.length + node.artifacts.length,
      }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await main();
