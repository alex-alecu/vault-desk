#!/usr/bin/env node
import { createVaultCore } from "../compose.js";
import { startDaemon } from "./server.js";

function argument(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  if (value === undefined) {
    throw new Error(
      "Usage: vault-cored --workspace <directory> --model-store <directory> --profile <local12|local16>",
    );
  }
  return value;
}

const args = process.argv.slice(2);
const workspaceDir = argument(args, "--workspace");
const modelStoreDir = argument(args, "--model-store");
const profile = argument(args, "--profile");
if (profile !== "local12" && profile !== "local16") throw new Error("Invalid profile.");
const core = await createVaultCore({ workspaceDir, modelStoreDir, profile });
const daemon = await startDaemon(core, workspaceDir);
console.error(`Vault Core listening at ${daemon.endpoint}`);

async function shutdown(): Promise<void> {
  await daemon.close();
  await core.close();
}

process.once("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown().then(() => process.exit(0)));
