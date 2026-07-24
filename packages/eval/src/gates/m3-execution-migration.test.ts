import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultCore } from "@vault/core";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];

async function openCore(root: string) {
  const models = join(root, "models");
  await mkdir(models, { recursive: true });
  await writeFile(
    join(models, "installed-models.json"),
    JSON.stringify({ schemaVersion: 1, models: [] }),
  );
  return createVaultCore({ workspaceDir: root, modelStoreDir: models, profile: "local12" });
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const historical = {
  timestamp: "2026-07-23T12:00:00.000Z",
  sessionId: "11111111-1111-4111-8111-111111111111",
  jobId: "22222222-2222-4222-8222-222222222222",
  runId: "33333333-3333-4333-8333-333333333333",
};

function insertHistoricalRows(database: Database.Database): void {
  database.exec("DROP TABLE agent_executions");
  database
    .prepare("INSERT INTO sessions VALUES (?, NULL, ?, ?, ?)")
    .run(historical.sessionId, "Historical run", historical.timestamp, historical.timestamp);
  database
    .prepare("INSERT INTO jobs VALUES (?, ?, ?, ?, 0, NULL, ?, ?)")
    .run(
      historical.jobId,
      "agent",
      "historical-run",
      "succeeded",
      historical.timestamp,
      historical.timestamp,
    );
  database
    .prepare("INSERT INTO agent_runs VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, NULL)")
    .run(
      historical.runId,
      historical.sessionId,
      historical.jobId,
      "succeeded",
      historical.timestamp,
      historical.timestamp,
    );
  database
    .prepare(
      "INSERT INTO agent_events VALUES (?, ?, 0, 'execution.completed', ?, 'python', ?, ?, ?, 'completed', ?, ?, NULL, NULL, 5)",
    )
    .run(
      "44444444-4444-4444-8444-444444444444",
      historical.runId,
      "Python completed.",
      "print('old')",
      "old output\n",
      "",
      historical.timestamp,
      "steps/old.py",
    );
  database.pragma("user_version = 6");
}

async function seedVersionSixCatalog(root: string): Promise<string> {
  const first = await openCore(root);
  await first.close();
  const databasePath = join(root, ".vault", "catalog.sqlite");
  const database = new Database(databasePath);
  try {
    insertHistoricalRows(database);
  } finally {
    database.close();
  }
  return databasePath;
}

function readHistoricalExecution(databasePath: string) {
  const database = new Database(databasePath, { readonly: true });
  try {
    return database
      .prepare(
        "SELECT language, CAST(stdout AS TEXT) AS stdout, state, workspace_path, exit_code FROM agent_executions WHERE run_id = ?",
      )
      .get(historical.runId);
  } finally {
    database.close();
  }
}

describe("M3 execution catalog migration", () => {
  it("backfills historical output into normalized execution records", async () => {
    const root = await mkdtemp(join(tmpdir(), "vault-execution-migration-"));
    roots.push(root);
    const databasePath = await seedVersionSixCatalog(root);
    const migrated = await openCore(root);
    await migrated.close();
    expect(readHistoricalExecution(databasePath)).toEqual({
      language: "python",
      stdout: "old output\n",
      state: "completed",
      workspace_path: "steps/old.py",
      exit_code: 0,
    });
  });
});
