import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { extname } from "node:path";
import {
  type AgentArtifactSummary,
  AgentArtifactSummarySchema,
  type AgentEvent,
  AgentEventSchema,
  AgentRunPerformanceSchema,
  type AgentRunSummary,
  AgentRunSummarySchema,
  type AttachmentSummary,
  AttachmentSummarySchema,
} from "@vault/shared";

const MAX_ATTACHMENT_BYTES = 512 * 1024 * 1024;

export interface RunRow {
  id: string;
  session_id: string;
  job_id: string;
  state: string;
  response: string | null;
  error: string | null;
  performance_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  run_id: string;
  sequence: number;
  event_type: string;
  summary: string;
  language: string | null;
  code: string | null;
  workspace_path: string | null;
  command: string | null;
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
  duration_ms: number | null;
  termination: string | null;
  created_at: string;
}

export interface ArtifactRow {
  id: string;
  run_id: string;
  display_name: string;
  media_type: string;
  byte_length: number;
  content_hash: string;
  created_at: string;
}

export interface AttachmentRow {
  id: string;
  session_id: string;
  display_name: string;
  media_type: string;
  byte_length: number;
  content_hash: string;
  created_at: string;
}

export function runFromRow(row: RunRow): AgentRunSummary {
  const performance =
    row.performance_json === null
      ? null
      : AgentRunPerformanceSchema.parse(JSON.parse(row.performance_json));
  return AgentRunSummarySchema.parse({
    id: row.id,
    sessionId: row.session_id,
    jobId: row.job_id,
    state: row.state,
    response: row.response,
    error: row.error,
    performance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function eventFromRow(row: EventRow): AgentEvent {
  return AgentEventSchema.parse({
    id: row.id,
    runId: row.run_id,
    sequence: row.sequence,
    type: row.event_type,
    summary: row.summary,
    language: row.language,
    path: row.workspace_path,
    source: row.code,
    command: row.command,
    exitCode: row.exit_code,
    stdout: row.stdout,
    stderr: row.stderr,
    durationMs: row.duration_ms,
    termination: row.termination,
    createdAt: row.created_at,
  });
}

export function artifactFromRow(row: ArtifactRow): AgentArtifactSummary {
  return AgentArtifactSummarySchema.parse({
    id: row.id,
    runId: row.run_id,
    name: row.display_name,
    mediaType: row.media_type,
    byteLength: row.byte_length,
    contentHash: row.content_hash,
    createdAt: row.created_at,
  });
}

export function attachmentFromRow(row: AttachmentRow): AttachmentSummary {
  return AttachmentSummarySchema.parse({
    id: row.id,
    sessionId: row.session_id,
    name: row.display_name,
    mediaType: row.media_type,
    byteLength: row.byte_length,
    contentHash: row.content_hash,
    createdAt: row.created_at,
  });
}

export function attachmentMediaType(path: string): string {
  const types: Record<string, string> = {
    ".csv": "text/csv",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".txt": "text/plain",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return types[extname(path).toLowerCase()] ?? "application/octet-stream";
}

export async function readSelectedFile(path: string): Promise<Buffer> {
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("attachment_invalid");
  }
  const canonical = await realpath(path);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      (await realpath(path)) !== canonical
    ) {
      throw new Error("attachment_changed");
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}
