import type { WorkerLimits } from "@vault/shared";
import type { AgentSessionExecution, CodeAgentLauncher, CodeAgentSession } from "@vault/workers";
import type { AgentInputResolver, ResolvedAgentInputs } from "./inputs.js";

interface WarmSession {
  id: string;
  handle: CodeAgentSession;
  inputs: ResolvedAgentInputs;
}

export class AgentSessionManager {
  private warm: WarmSession | undefined;
  private serial: Promise<void> = Promise.resolve();

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

  private async ensure(sessionId: string, signal?: AbortSignal): Promise<WarmSession> {
    signal?.throwIfAborted();
    if (this.warm?.id === sessionId) return this.warm;
    await this.closeWarm();
    const inputs = await this.resolver.resolve(sessionId);
    try {
      const handle = await this.launcher.openAgentSession({
        sessionId,
        sourceFolder: inputs.sourceFolder,
        readonlyInputs: inputs.attachments,
        limits: this.limits,
        ...(signal === undefined ? {} : { signal }),
      });
      this.warm = { id: sessionId, handle, inputs };
      return this.warm;
    } catch (error) {
      await inputs.dispose();
      throw error;
    }
  }

  warmSession(sessionId: string): Promise<void> {
    return this.exclusive(async () => {
      await this.ensure(sessionId);
    });
  }

  execute(sessionId: string, request: AgentSessionExecution, signal?: AbortSignal) {
    return this.exclusive(async () => {
      signal?.throwIfAborted();
      const session = await this.ensure(sessionId, signal);
      try {
        return await session.handle.execute(request, signal);
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
      await session.inputs.dispose();
    }
  }
}
