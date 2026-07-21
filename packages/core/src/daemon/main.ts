#!/usr/bin/env node
import { rename, unlink, writeFile } from "node:fs/promises";
import { createVaultCore } from "../compose.js";
import { initializeEmptyModelStore } from "../runtime/models.js";
import { startDaemon } from "./server.js";

function argument(args: string[], name: string, required = true): string | undefined {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  if (required && value === undefined) {
    throw new Error(
      "Usage: vault-cored --workspace <directory> --model-store <directory> --profile <local12|local16>",
    );
  }
  return value;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: optional fixed resource flags are validated in one CLI boundary.
async function main(args: string[]): Promise<void> {
  const workspaceDir = argument(args, "--workspace");
  const modelStoreDir = argument(args, "--model-store");
  const profile = argument(args, "--profile");
  if (workspaceDir === undefined || modelStoreDir === undefined) throw new Error("Missing paths.");
  if (profile !== "local12" && profile !== "local16") throw new Error("Invalid profile.");
  if (!args.includes("--packaged-model-store")) await initializeEmptyModelStore(modelStoreDir);
  const migrationDirectory = argument(args, "--migration-directory", false);
  const workerEntryPath = argument(args, "--worker-entry", false);
  const inferenceRuntimePath = argument(args, "--inference-runtime", false);
  const agentHelperPath = argument(args, "--agent-helper", false);
  const agentImageRoot = argument(args, "--agent-image-root", false);
  const readyFile = argument(args, "--ready-file", false);
  const windowsPipeGuardPath = argument(args, "--windows-pipe-guard", false);
  const core = await createVaultCore({
    workspaceDir,
    modelStoreDir,
    profile,
    ...(migrationDirectory === undefined ? {} : { migrationDirectory }),
    sessionsOnly: args.includes("--sessions-only"),
    ...(workerEntryPath === undefined ? {} : { workerEntryPath }),
    ...(inferenceRuntimePath === undefined ? {} : { inferenceRuntimePath }),
    ...(agentHelperPath === undefined ? {} : { agentHelperPath }),
    ...(agentImageRoot === undefined ? {} : { agentImageRoot }),
  });
  const daemon = await startDaemon(core, workspaceDir, {
    ...(windowsPipeGuardPath === undefined ? {} : { windowsPipeGuardPath }),
  });
  if (readyFile !== undefined) {
    const temporary = `${readyFile}.${process.pid}.tmp`;
    await writeFile(temporary, `${daemon.endpoint}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, readyFile);
  }
  console.error(`Vault Core listening at ${daemon.endpoint}`);
  async function shutdown(): Promise<void> {
    await daemon.close();
    await core.close();
    if (readyFile !== undefined) await unlink(readyFile).catch(() => undefined);
  }
  process.once("SIGINT", () => void shutdown().then(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().then(() => process.exit(0)));
}

void main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Vault Core failed to start.");
  process.exitCode = 1;
});
