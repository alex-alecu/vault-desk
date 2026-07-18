#!/usr/bin/env node
import { createVaultCore } from "../compose.js";
import { startDaemon } from "./server.js";

function workspaceArgument(args: string[]): string {
  const index = args.indexOf("--workspace");
  const value = index === -1 ? undefined : args[index + 1];
  if (value === undefined) throw new Error("Usage: vault-cored --workspace <directory>");
  return value;
}

const workspaceDir = workspaceArgument(process.argv.slice(2));
const core = await createVaultCore({ workspaceDir });
const daemon = await startDaemon(core, workspaceDir);
console.error(`Vault Core listening at ${daemon.endpoint}`);

async function shutdown(): Promise<void> {
  await daemon.close();
  await core.close();
}

process.once("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown().then(() => process.exit(0)));
