#!/usr/bin/env node
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { request } from "./client.js";
import { writeError, writeResult } from "./output.js";

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function main(args: string[]): Promise<number> {
  const command = args[0];
  const workspace = option(args, "--workspace");
  if (command !== "status" || workspace === undefined) {
    writeError("Usage: vault status --workspace <directory> [--json]");
    return 2;
  }
  const endpoint =
    process.platform === "win32"
      ? `\\\\.\\pipe\\vault-cored-${createHash("sha256").update(resolve(workspace)).digest("hex").slice(0, 32)}`
      : join(resolve(workspace), ".vault", "vault-cored.sock");
  const response = await request(endpoint, {
    id: crypto.randomUUID(),
    method: "status",
    params: {},
  });
  if ("error" in response) {
    writeError(`${response.error.code}: ${response.error.message}`);
    return 1;
  }
  writeResult(response.result, args.includes("--json"));
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    writeError(error instanceof Error ? error.message : "Unknown CLI failure.");
    process.exitCode = 1;
  },
);
