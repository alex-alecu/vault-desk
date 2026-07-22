import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import {
  type AgentArtifactSummary,
  AgentArtifactSummarySchema,
  type AgentEvent,
  type AgentEventDetail,
  AgentEventSchema,
  type AgentEventType,
  type AgentRunPerformance,
  type AgentRunSnapshot,
  AgentRunSnapshotSchema,
  type AgentRunState,
  type AgentRunSummary,
  AgentRunSummarySchema,
  type AttachmentSummary,
  AttachmentSummarySchema,
  type SessionDraft,
  SessionDraftSchema,
} from "@vault/shared";
import type { ArtifactStore } from "../workspace/artifacts.js";
import type { DatabasePort } from "../workspace/database.js";
import {
  type ArtifactRow,
  type AttachmentRow,
  artifactFromRow,
  attachmentFromRow,
  attachmentMediaType,
  type EventRow,
  eventFromRow,
  type RunRow,
  readSelectedFile,
  runFromRow,
} from "./records.js";

interface RunTransition {
  state: AgentRunState;
  response?: string;
  error?: string;
  performance?: AgentRunPerformance;
}

export class AgentStore {
  constructor(
    private readonly database: DatabasePort,
    private readonly artifacts: ArtifactStore,
  ) {}

  saveDraft(sessionId: string, content: string): SessionDraft {
    const updatedAt = new Date().toISOString();
    const draft = SessionDraftSchema.parse({ sessionId, content, updatedAt });
    const session = this.database.prepare("SELECT 1 FROM sessions WHERE id = ?").get(sessionId);
    if (session === undefined) throw new Error("session_not_found");
    this.database
      .prepare(
        "INSERT INTO session_drafts (session_id, content, updated_at) VALUES (?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at",
      )
      .run(draft.sessionId, draft.content, draft.updatedAt);
    return draft;
  }

  loadDraft(sessionId: string): SessionDraft | undefined {
    const row = this.database
      .prepare("SELECT session_id, content, updated_at FROM session_drafts WHERE session_id = ?")
      .get(sessionId) as { session_id: string; content: string; updated_at: string } | undefined;
    return row === undefined
      ? undefined
      : SessionDraftSchema.parse({
          sessionId: row.session_id,
          content: row.content,
          updatedAt: row.updated_at,
        });
  }

  async addAttachment(sessionId: string, path: string): Promise<AttachmentSummary> {
    if (this.database.prepare("SELECT 1 FROM sessions WHERE id = ?").get(sessionId) === undefined) {
      throw new Error("session_not_found");
    }
    const bytes = await readSelectedFile(path);
    const createdAt = new Date().toISOString();
    const item = AttachmentSummarySchema.parse({
      id: randomUUID(),
      sessionId,
      name: basename(path),
      mediaType: attachmentMediaType(path),
      byteLength: bytes.byteLength,
      contentHash: await this.artifacts.put(bytes),
      createdAt,
    });
    this.database
      .prepare("INSERT INTO session_attachments VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(
        item.id,
        item.sessionId,
        item.name,
        item.mediaType,
        item.byteLength,
        item.contentHash,
        item.createdAt,
      );
    return item;
  }

  listAttachments(sessionId: string): AttachmentSummary[] {
    return (
      this.database
        .prepare("SELECT * FROM session_attachments WHERE session_id = ? ORDER BY created_at, id")
        .all(sessionId) as AttachmentRow[]
    ).map(attachmentFromRow);
  }

  removeAttachment(sessionId: string, attachmentId: string): boolean {
    return (
      this.database
        .prepare("DELETE FROM session_attachments WHERE id = ? AND session_id = ?")
        .run(attachmentId, sessionId).changes === 1
    );
  }

  async attachmentBytes(item: AttachmentSummary): Promise<Buffer> {
    return await this.artifacts.read(item.contentHash);
  }

  createRun(sessionId: string, jobId: string): AgentRunSummary {
    const now = new Date().toISOString();
    const result = AgentRunSummarySchema.parse({
      id: randomUUID(),
      sessionId,
      jobId,
      state: "queued",
      response: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
    this.database
      .prepare(
        "INSERT INTO agent_runs (id, session_id, job_id, state, response, error, created_at, updated_at, performance_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        result.id,
        result.sessionId,
        result.jobId,
        result.state,
        null,
        null,
        result.createdAt,
        result.updatedAt,
        null,
      );
    return result;
  }

  transitionRun(id: string, transition: RunTransition): void {
    const updatedAt = new Date().toISOString();
    const update = this.database
      .prepare(
        "UPDATE agent_runs SET state = ?, response = ?, error = ?, updated_at = ?, performance_json = ? WHERE id = ?",
      )
      .run(
        transition.state,
        transition.response ?? null,
        transition.error ?? null,
        updatedAt,
        transition.performance === undefined ? null : JSON.stringify(transition.performance),
        id,
      );
    if (update.changes !== 1) throw new Error("run_not_found");
  }

  appendEvent(
    runId: string,
    type: AgentEventType,
    summary: string,
    detail: Partial<AgentEventDetail> = {},
  ): AgentEvent {
    const row = this.database
      .prepare(
        "SELECT COALESCE(MAX(sequence), -1) + 1 AS sequence FROM agent_events WHERE run_id = ?",
      )
      .get(runId) as { sequence: number };
    const item = AgentEventSchema.parse({
      id: randomUUID(),
      runId,
      sequence: row.sequence,
      type,
      summary,
      language: detail.language ?? null,
      code: detail.code ?? null,
      stdout: detail.stdout ?? null,
      stderr: detail.stderr ?? null,
      termination: detail.termination ?? null,
      createdAt: new Date().toISOString(),
    });
    this.database
      .prepare("INSERT INTO agent_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        item.id,
        item.runId,
        item.sequence,
        item.type,
        item.summary,
        item.language,
        item.code,
        item.stdout,
        item.stderr,
        item.termination,
        item.createdAt,
      );
    return item;
  }

  addArtifact(
    runId: string,
    input: Omit<AgentArtifactSummary, "id" | "runId" | "createdAt">,
  ): AgentArtifactSummary {
    const item = AgentArtifactSummarySchema.parse({
      id: randomUUID(),
      runId,
      ...input,
      createdAt: new Date().toISOString(),
    });
    this.database
      .prepare("INSERT INTO agent_artifacts VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(
        item.id,
        item.runId,
        item.name,
        item.mediaType,
        item.byteLength,
        item.contentHash,
        item.createdAt,
      );
    return item;
  }

  snapshot(runId: string): AgentRunSnapshot {
    const runRow = this.database.prepare("SELECT * FROM agent_runs WHERE id = ?").get(runId) as
      | RunRow
      | undefined;
    if (runRow === undefined) throw new Error("run_not_found");
    const events = (
      this.database
        .prepare("SELECT * FROM agent_events WHERE run_id = ? ORDER BY sequence")
        .all(runId) as EventRow[]
    ).map(eventFromRow);
    const artifacts = (
      this.database
        .prepare("SELECT * FROM agent_artifacts WHERE run_id = ? ORDER BY created_at, id")
        .all(runId) as ArtifactRow[]
    ).map(artifactFromRow);
    return AgentRunSnapshotSchema.parse({ run: runFromRow(runRow), events, artifacts });
  }

  listRuns(sessionId: string): AgentRunSummary[] {
    const rows = this.database
      .prepare(
        "SELECT * FROM (SELECT * FROM agent_runs WHERE session_id = ? ORDER BY created_at DESC, id DESC LIMIT 100) ORDER BY created_at, id",
      )
      .all(sessionId) as RunRow[];
    return rows.map(runFromRow);
  }

  recoverInterrupted(): number {
    const now = new Date().toISOString();
    return this.database.transaction(() => {
      const rows = this.database
        .prepare("SELECT id, job_id FROM agent_runs WHERE state IN ('queued', 'running')")
        .all() as Array<{ id: string; job_id: string }>;
      for (const row of rows) {
        this.database
          .prepare(
            "UPDATE agent_runs SET state = 'failed', error = 'core_restarted', updated_at = ? WHERE id = ?",
          )
          .run(now, row.id);
        this.database
          .prepare("UPDATE jobs SET state = 'failed', updated_at = ? WHERE id = ?")
          .run(now, row.job_id);
        this.appendEvent(row.id, "run.failed", "Interrupted when Vault Desk restarted.");
      }
      return rows.length;
    })();
  }
}
