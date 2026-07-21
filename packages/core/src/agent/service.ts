import { randomUUID } from "node:crypto";
import type {
  AgentArtifactSummary,
  AgentRunSnapshot,
  AgentRunSummary,
  AttachmentSummary,
  SessionDraft,
  WorkerLimits,
} from "@vault/shared";
import type { CodeAgentLauncher } from "@vault/workers";
import type { AuditLog } from "../audit/log.js";
import type { ConversationStore } from "../conversations/store.js";
import type { JobStore } from "../jobs/jobs.js";
import type { InferenceService } from "../runtime/inference.js";
import type { ArtifactStore } from "../workspace/artifacts.js";
import type { DatabasePort } from "../workspace/database.js";
import { AgentInputResolver } from "./inputs.js";
import { AgentLoop } from "./loop.js";
import type { AgentStore } from "./store.js";

const MODEL_ID = "gemma-4-12b-it-qat-q4_0";
const LIMITS: WorkerLimits = {
  wallTimeMs: 120_000,
  inputCount: 32,
  inputBytes: 8 * 1024 * 1024 * 1024,
  memoryBytes: 4 * 1024 * 1024 * 1024,
  scratchBytes: 128 * 1024 * 1024,
  outputBytes: 16 * 1024 * 1024,
  cpuCount: 4,
};

interface ActiveRun {
  controller: AbortController;
  finished: Promise<void>;
}

function failureText(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message.slice(0, 1_000);
  return "agent_run_failed";
}

export class AgentService {
  private readonly active = new Map<string, ActiveRun>();
  private closed = false;
  private readonly inputs: AgentInputResolver;

  // biome-ignore lint/complexity/useMaxParams: explicit ports keep security authorities visible at construction.
  constructor(
    private readonly database: DatabasePort,
    private readonly store: AgentStore,
    private readonly conversations: ConversationStore,
    private readonly jobs: JobStore,
    private readonly artifacts: ArtifactStore,
    private readonly inference: Pick<InferenceService, "generate">,
    private readonly launcher: CodeAgentLauncher,
    private readonly audit: AuditLog,
  ) {
    this.inputs = new AgentInputResolver(database, store);
    store.recoverInterrupted();
  }

  saveDraft(sessionId: string, content: string): SessionDraft {
    return this.store.saveDraft(sessionId, content);
  }

  loadDraft(sessionId: string): SessionDraft | undefined {
    return this.store.loadDraft(sessionId);
  }

  async addAttachment(sessionId: string, path: string): Promise<AttachmentSummary> {
    const item = await this.store.addAttachment(sessionId, path);
    this.audit.append({
      type: "attachment.added",
      outcome: "succeeded",
      metadata: { sessionId, attachmentId: item.id, byteLength: item.byteLength },
    });
    return item;
  }

  listAttachments(sessionId: string): AttachmentSummary[] {
    return this.store.listAttachments(sessionId);
  }

  removeAttachment(sessionId: string, attachmentId: string): boolean {
    const removed = this.store.removeAttachment(sessionId, attachmentId);
    this.audit.append({
      type: "attachment.removed",
      outcome: removed ? "succeeded" : "failed",
      metadata: { sessionId, attachmentId },
    });
    return removed;
  }

  start(sessionId: string, task: string): AgentRunSummary {
    if (this.closed) throw new Error("agent_service_closed");
    const run = this.database.transaction(() => {
      this.conversations.appendMessage(sessionId, "user", task);
      this.store.saveDraft(sessionId, "");
      const job = this.jobs.create("agent", randomUUID());
      return this.store.createRun(sessionId, job.id);
    })();
    const controller = new AbortController();
    const finished = this.execute(run, task, controller.signal).finally(() => {
      this.active.delete(run.jobId);
    });
    this.active.set(run.jobId, { controller, finished });
    return run;
  }

  snapshot(runId: string): AgentRunSnapshot {
    return this.store.snapshot(runId);
  }

  cancel(jobId: string): boolean {
    const active = this.active.get(jobId);
    const cancelled = this.jobs.cancel(jobId) !== undefined;
    active?.controller.abort(new DOMException("Agent run cancelled.", "AbortError"));
    return cancelled;
  }

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: the run lifecycle stays linear so cleanup and terminal persistence remain paired.
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: success, cancellation, failure, and cleanup are kept in one lifecycle boundary so terminal persistence cannot diverge.
  private async execute(run: AgentRunSummary, task: string, signal: AbortSignal): Promise<void> {
    let resolved: Awaited<ReturnType<AgentInputResolver["resolve"]>> | undefined;
    try {
      this.database.transaction(() => {
        this.jobs.transition(run.jobId, "running");
        this.store.transitionRun(run.id, "running");
        this.store.appendEvent(
          run.id,
          "run.started",
          "Offline limits: 6 executions, 120 seconds each, 4 CPUs, 4 GiB memory, 128 MiB scratch.",
        );
      })();
      resolved = await this.inputs.resolve(run.sessionId);
      const loop = new AgentLoop(this.inference, {
        execute: async (input, executionSignal) =>
          await this.launcher.executeAgent({
            jobId: run.jobId,
            language: input.language,
            code: input.code,
            readonlyInputs: resolved?.files ?? [],
            limits: LIMITS,
            ...(executionSignal === undefined ? {} : { signal: executionSignal }),
          }),
      });
      const result = await loop.run({
        task,
        modelId: MODEL_ID,
        inputNames: resolved.files.map((item) => item.name),
        signal,
        onEvent: (type, summary, detail) => this.store.appendEvent(run.id, type, summary, detail),
      });
      const outputs: Array<Omit<AgentArtifactSummary, "id" | "runId" | "createdAt">> = [];
      for (const execution of result.executions) {
        for (const output of execution.artifacts) {
          const bytes = Buffer.from(output.bytesBase64, "base64");
          if (bytes.toString("base64") !== output.bytesBase64) {
            throw new Error("agent_artifact_invalid");
          }
          outputs.push({
            name: output.name,
            mediaType: output.mediaType,
            byteLength: bytes.byteLength,
            contentHash: await this.artifacts.put(bytes),
          });
        }
      }
      this.database.transaction(() => {
        for (const output of outputs) this.store.addArtifact(run.id, output);
        this.conversations.appendMessage(run.sessionId, "assistant", result.response, run.id);
        this.store.transitionRun(run.id, "succeeded", result.response);
        this.jobs.transition(run.jobId, "succeeded");
      })();
      this.audit.append({
        type: "agent.completed",
        outcome: "succeeded",
        metadata: { runId: run.id, jobId: run.jobId, executions: result.executions.length },
      });
    } catch (error) {
      const cancelled = signal.aborted || this.jobs.isCancellationRequested(run.jobId);
      const state = cancelled ? "cancelled" : "failed";
      const detail = cancelled ? "cancelled" : failureText(error);
      this.database.transaction(() => {
        this.store.transitionRun(run.id, state, undefined, detail);
        if (!cancelled) this.jobs.transition(run.jobId, "failed");
        this.store.appendEvent(
          run.id,
          cancelled ? "run.cancelled" : "run.failed",
          cancelled ? "Task cancelled." : "Task failed safely.",
        );
      })();
      this.audit.append({
        type: "agent.completed",
        outcome: "failed",
        metadata: { runId: run.id, jobId: run.jobId, code: detail },
      });
    } finally {
      await resolved?.dispose();
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    const active = [...this.active.values()];
    for (const run of active) run.controller.abort(new DOMException("Core closed.", "AbortError"));
    await Promise.all(active.map((run) => run.finished));
  }
}
