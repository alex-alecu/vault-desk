import { randomUUID } from "node:crypto";
import { type JobRecord, JobRecordSchema } from "@vault/shared";
import type Database from "better-sqlite3";

interface JobRow {
  id: string;
  kind: string;
  idempotency_key: string;
  state: string;
  cancellation_requested: number;
  resume_cursor: string | null;
  created_at: string;
  updated_at: string;
}

function record(row: JobRow): JobRecord {
  return JobRecordSchema.parse({
    id: row.id,
    kind: row.kind,
    idempotencyKey: row.idempotency_key,
    state: row.state,
    cancellationRequested: row.cancellation_requested === 1,
    resumeCursor: row.resume_cursor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class JobStore {
  constructor(private readonly database: Database.Database) {}

  create(kind: string, idempotencyKey: string): JobRecord {
    const existing = this.database
      .prepare("SELECT * FROM jobs WHERE idempotency_key = ?")
      .get(idempotencyKey) as JobRow | undefined;
    if (existing !== undefined) return record(existing);
    const now = new Date().toISOString();
    const job = JobRecordSchema.parse({
      id: randomUUID(),
      kind,
      idempotencyKey,
      state: "queued",
      cancellationRequested: false,
      resumeCursor: null,
      createdAt: now,
      updatedAt: now,
    });
    this.database
      .prepare("INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(job.id, job.kind, job.idempotencyKey, job.state, 0, null, now, now);
    return job;
  }

  cancel(id: string): JobRecord | undefined {
    const now = new Date().toISOString();
    const update = this.database
      .prepare(
        "UPDATE jobs SET cancellation_requested = 1, state = 'cancelled', updated_at = ? WHERE id = ? AND state IN ('queued', 'running')",
      )
      .run(now, id);
    if (update.changes === 0) return undefined;
    const row = this.database.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as
      | JobRow
      | undefined;
    return row === undefined ? undefined : record(row);
  }
}
