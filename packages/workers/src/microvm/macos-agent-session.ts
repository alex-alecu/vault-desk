import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import {
  AgentGuestExecuteRequestSchema,
  AgentGuestHelloRequestSchema,
  AgentGuestHelloResultSchema,
  AgentGuestHydrateRequestSchema,
  AgentGuestHydrateResultSchema,
  type AgentGuestInput,
  AgentGuestResultSchema,
  type WorkerFrame,
} from "@vault/shared";
import { encodeFrame, FrameDecoder } from "../ipc.js";
import type { AgentSessionExecution, CodeAgentSession } from "./launcher.js";
import type { AgentWorkspaceStore } from "./workspace-store.js";

interface GuestInitialization {
  sessionId: string;
  inputs: AgentGuestInput[];
  limits: {
    wallTimeMs: number;
    memoryBytes: number;
    scratchBytes: number;
    outputBytes: number;
  };
  transport: AgentHelperTransport;
  store: AgentWorkspaceStore;
  signal: AbortSignal;
}

export class AgentHelperTransport {
  private readonly decoder = new FrameDecoder();
  private readonly pending = new Map<
    string,
    { accept(value: WorkerFrame): void; reject(error: Error): void }
  >();
  private readonly started: Promise<void>;
  private errorOutput = "";

  constructor(private readonly child: ChildProcessWithoutNullStreams) {
    this.started = new Promise((accept, reject) => {
      child.once("spawn", accept);
      child.once("error", reject);
    });
    child.stdout.on("data", (chunk: Buffer) => this.received(chunk));
    child.stdin.on("error", (error) => this.fail(error));
    child.stderr.on("data", (chunk: Buffer) => {
      this.errorOutput = `${this.errorOutput}${chunk.toString("utf8")}`.slice(-64_000);
    });
    child.once("close", (code) =>
      this.fail(new Error(this.errorOutput.trim() || `agent_helper_exited_${code}`)),
    );
  }

  private received(chunk: Buffer): void {
    try {
      for (const frame of this.decoder.push(chunk)) {
        const key = String(frame.requestId);
        const waiter = this.pending.get(key);
        if (waiter !== undefined) {
          this.pending.delete(key);
          waiter.accept(frame);
        }
      }
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error("agent_helper_protocol_error"));
    }
  }

  ready(signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    return this.started;
  }

  write(frame: WorkerFrame): void {
    if (
      this.child.exitCode !== null ||
      this.child.signalCode !== null ||
      this.child.stdin.destroyed
    ) {
      throw new Error("agent_helper_closed");
    }
    this.child.stdin.write(encodeFrame(frame));
  }

  exchange(frame: WorkerFrame, signal?: AbortSignal): Promise<WorkerFrame> {
    signal?.throwIfAborted();
    const key = String(frame.requestId);
    return new Promise((accept, reject) => {
      const abort = () => {
        this.pending.delete(key);
        this.child.kill("SIGKILL");
        reject(signal?.reason ?? new DOMException("Cancelled.", "AbortError"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      this.pending.set(key, {
        accept: (value) => {
          signal?.removeEventListener("abort", abort);
          accept(value);
        },
        reject: (error) => {
          signal?.removeEventListener("abort", abort);
          reject(error);
        },
      });
      try {
        this.write(frame);
      } catch (error) {
        this.pending.delete(key);
        signal?.removeEventListener("abort", abort);
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    try {
      this.write({ protocolVersion: 2, requestId: randomUUID(), operation: "shutdown" });
    } catch {
      this.child.kill("SIGKILL");
    }
    await new Promise<void>((accept) => {
      let finished = false;
      const closed = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        accept();
      };
      const timeout = setTimeout(() => {
        this.child.kill("SIGKILL");
        closed();
      }, 5_000);
      this.child.once("close", closed);
      if (this.child.exitCode !== null || this.child.signalCode !== null) closed();
    });
  }

  private fail(error: Error): void {
    for (const waiter of this.pending.values()) waiter.reject(error);
    this.pending.clear();
  }
}

export async function initializeAgentGuest(options: GuestInitialization): Promise<void> {
  const hello = AgentGuestHelloResultSchema.parse(
    await options.transport.exchange(
      AgentGuestHelloRequestSchema.parse({
        protocolVersion: 2,
        requestId: randomUUID(),
        jobId: options.sessionId,
        operation: "hello",
        inputs: options.inputs,
        limits: options.limits,
      }),
      options.signal,
    ),
  );
  if (hello.nonLoopbackNetworkDeviceCount !== 0) throw new Error("agent_guest_not_certified");
  AgentGuestHydrateResultSchema.parse(
    await options.transport.exchange(
      AgentGuestHydrateRequestSchema.parse({
        protocolVersion: 2,
        requestId: randomUUID(),
        operation: "hydrate",
        workspace: await options.store.load(options.sessionId),
      }),
      options.signal,
    ),
  );
}

export class MacOsAgentSession implements CodeAgentSession {
  private activeRequestId: string | undefined;
  private closed = false;

  constructor(
    private readonly options: {
      sessionId: string;
      limits: {
        wallTimeMs: number;
        memoryBytes: number;
        scratchBytes: number;
        outputBytes: number;
      };
      transport: AgentHelperTransport;
      store: AgentWorkspaceStore;
      temporaryRoot: string;
    },
  ) {}

  async execute(request: AgentSessionExecution, signal?: AbortSignal) {
    signal?.throwIfAborted();
    if (this.closed) throw new Error("agent_session_closed");
    if (this.activeRequestId !== undefined) throw new Error("agent_session_busy");
    const requestId = randomUUID();
    this.activeRequestId = requestId;
    const abort = () => {
      try {
        this.options.transport.write({ protocolVersion: 2, requestId, operation: "cancel" });
      } catch {
        // The pending exchange reports a helper failure.
      }
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const frame = AgentGuestExecuteRequestSchema.parse({
        protocolVersion: 2,
        requestId,
        operation: "execute",
        ...request,
        limits: this.options.limits,
      });
      const result = AgentGuestResultSchema.parse(await this.options.transport.exchange(frame));
      if (result.nonLoopbackNetworkDeviceCount !== 0) throw new Error("agent_guest_not_certified");
      await this.options.store.applyDelta(this.options.sessionId, result.workspaceDelta);
      return result.execution;
    } finally {
      signal?.removeEventListener("abort", abort);
      this.activeRequestId = undefined;
    }
  }

  async cancel(): Promise<void> {
    if (this.activeRequestId !== undefined) {
      try {
        this.options.transport.write({
          protocolVersion: 2,
          requestId: this.activeRequestId,
          operation: "cancel",
        });
      } catch {
        // The active exchange reports a helper failure.
      }
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.options.transport.close();
    } finally {
      await rm(this.options.temporaryRoot, { recursive: true, force: true });
    }
  }
}
