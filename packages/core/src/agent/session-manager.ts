import type { WorkerLimits } from "@vault/shared";
import type {
  AgentExecutionObserver,
  AgentExecutionUpdate,
  AgentSessionExecution,
  CodeAgentLauncher,
  CodeAgentSession,
} from "@vault/workers";
import type { AgentInputResolver, ResolvedAgentInputs } from "./inputs.js";

interface WarmSession {
  id: string;
  handle: CodeAgentSession;
  inputs: ResolvedAgentInputs;
}

export class AgentSessionManager {
  private lifecycleSessionId: string | undefined;
  private lifecycleTarget: AgentExecutionObserver | undefined;
  private readonly pendingLifecycle: AgentExecutionUpdate[] = [];
  private warm: WarmSession | undefined;
  private serial: Promise<void> = Promise.resolve();
  private readonly lifecycleObserver: AgentExecutionObserver = {
    executionId: "00000000-0000-4000-8000-000000000000",
    onUpdate: async (update) => {
      if (this.lifecycleTarget !== undefined) {
        await this.lifecycleTarget.onUpdate(update);
      } else if (update.kind === "diagnostic") {
        this.pendingLifecycle.push(update);
      }
    },
  };

  constructor(
    private readonly launcher: CodeAgentLauncher,
    private readonly resolver: Pick<AgentInputResolver, "resolve">,
    private readonly limits: WorkerLimits,
  ) {}

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.serial;
    let release = (): void => undefined;
    this.serial = new Promise<void>((accept) => {
      release = accept;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async ensure(
    sessionId: string,
    signal?: AbortSignal,
    observer?: AgentExecutionObserver,
  ): Promise<WarmSession> {
    signal?.throwIfAborted();
    if (this.warm?.id === sessionId) {
      await this.activateLifecycle(observer);
      return this.warm;
    }
    await this.closeWarm();
    this.lifecycleTarget = undefined;
    if (this.lifecycleSessionId !== sessionId) this.pendingLifecycle.length = 0;
    this.lifecycleSessionId = sessionId;
    await this.activateLifecycle(observer);
    const inputs = await this.resolver.resolve(sessionId);
    try {
      const handle = await this.launcher.openAgentSession({
        sessionId,
        sourceFolder: inputs.sourceFolder,
        readonlyInputs: inputs.attachments,
        limits: this.limits,
        observer: this.lifecycleObserver,
        ...(signal === undefined ? {} : { signal }),
      });
      this.warm = { id: sessionId, handle, inputs };
      return this.warm;
    } catch (error) {
      await inputs.dispose();
      throw error;
    }
  }

  private async activateLifecycle(observer: AgentExecutionObserver | undefined): Promise<void> {
    if (observer === undefined) return;
    this.lifecycleTarget = observer;
    for (const update of this.pendingLifecycle.splice(0)) await observer.onUpdate(update);
  }

  warmSession(sessionId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.ensure(sessionId);
    });
  }

  execute(
    sessionId: string,
    request: AgentSessionExecution,
    signal?: AbortSignal,
    observer?: AgentExecutionObserver,
  ) {
    return this.exclusive(async () => {
      signal?.throwIfAborted();
      const session = await this.ensure(sessionId, signal, observer);
      try {
        return await session.handle.execute(request, signal, observer);
      } catch (error) {
        if (this.warm === session) await this.closeWarm().catch(() => undefined);
        throw error;
      }
    });
  }

  closeSession(sessionId: string, deleteWorkspace = false): Promise<void> {
    return this.exclusive(async () => {
      if (this.warm?.id === sessionId) await this.closeWarm();
      if (deleteWorkspace) await this.launcher.deleteWorkspace(sessionId);
    });
  }

  close(): Promise<void> {
    return this.exclusive(async () => await this.closeWarm());
  }

  private async closeWarm(): Promise<void> {
    const session = this.warm;
    this.warm = undefined;
    if (session === undefined) return;
    try {
      await session.handle.close();
    } finally {
      try {
        await session.inputs.dispose();
      } finally {
        this.lifecycleTarget = undefined;
        this.lifecycleSessionId = undefined;
        this.pendingLifecycle.length = 0;
      }
    }
  }
}
