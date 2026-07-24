#!/usr/bin/env node
import { request } from "./client.js";
import { createSessionDebugSnapshot } from "./debug-session.js";
import { daemonEndpoint } from "./endpoint.js";
import { writeError, writeResult } from "./output.js";

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function main(args: string[]): Promise<number> {
  const command = args[0];
  if (command === "debug-session") {
    const database = option(args, "--database");
    const session = option(args, "--session");
    if (database === undefined || session === undefined) {
      writeError("Usage: vault debug-session --database <catalog path> --session <session ID>");
      return 2;
    }
    process.stdout.write(`${await createSessionDebugSnapshot(database, session)}\n`);
    return 0;
  }
  const workspace = option(args, "--workspace");
  if (command !== "status" || workspace === undefined) {
    writeError("Usage: vault status --workspace <directory> [--json]");
    return 2;
  }
  const response = await request(daemonEndpoint(workspace), {
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
